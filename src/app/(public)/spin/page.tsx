"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wheel3D } from "@/components/spin/Wheel3D";
import { PrizePopup } from "@/components/spin/PrizePopup";
import { Confetti } from "@/components/spin/Confetti";

interface Prize {
  id: string;
  name: string;
  color: string;
  type: string;
  value?: number;
  icon?: string;
  imageUrl?: string | null;
}

export default function SpinPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [remainingSpins, setRemainingSpins] = useState<number | null>(null);
  const [targetSegment, setTargetSegment] = useState<number | undefined>(undefined);
  const [targetPrizeId, setTargetPrizeId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<{ username?: string; firstName?: string } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastResult, setLastResult] = useState<{
    prize: Prize | null;
    isWin: boolean;
    message: string;
  } | null>(null);
  const lastResultRef = useRef(lastResult);

  // Keep ref in sync with state
  useEffect(() => {
    lastResultRef.current = lastResult;
  }, [lastResult]);

  useEffect(() => {
    fetch("/api/prizes")
      .then((res) => res.json())
      .then((data) => {
        if (data.prizes && data.prizes.length > 0) {
          // Only take active prizes (allow all types for demo)
          const activePrizes = data.prizes.filter((p: any) => p.isActive);
          setPrizes(activePrizes.length > 0 ? activePrizes : data.prizes.slice(0, 7));
        } else {
          // Fallback prizes if API returns empty
          setPrizes([
            { id: "1", name: "$5 Cash", color: "#22c55e", type: "MONEY", value: 5 },
            { id: "2", name: "$1 Cash", color: "#eab308", type: "MONEY", value: 1 },
            { id: "3", name: "$2 Cash", color: "#3b82f6", type: "MONEY", value: 2 },
            { id: "4", name: "50% Off", color: "#ec4899", type: "COUPON", value: 0 },
            { id: "5", name: "Free Spin", color: "#a855f7", type: "FREE_SPIN", value: 0 },
            { id: "6", name: "Better Luck", color: "#6b7280", type: "EMPTY", value: 0 },
            { id: "7", name: "Mystery Box", color: "#f97316", type: "PRODUCT", value: 0 },
          ]);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    // Fetch user data
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          // Fetch remaining spins from database
          fetch("/api/spin/remaining")
            .then((res) => res.json())
            .then((spinData) => {
              if (spinData.remaining !== undefined) {
                setRemainingSpins(spinData.remaining);
              } else {
                setRemainingSpins(0);
              }
            })
            .catch(() => {
              setRemainingSpins(0);
            });
        } else {
          window.location.href = "/login";
        }
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  const handleSpin = useCallback(async () => {
    if (isSpinning || remainingSpins === 0 || prizes.length === 0) return;

    setLastResult(null);

    try {
      const res = await fetch("/api/spin", { method: "POST", credentials: "include" });
      const data = await res.json();

      if (data.error) {
        setIsSpinning(false);
        alert(data.error);
        return;
      }

      if (!data.success) {
        setIsSpinning(false);
        alert(data.error || "Spin failed. Please try again.");
        return;
      }

      // Update remaining spins from database response
      if (data.remainingSpins !== undefined) {
        setRemainingSpins(data.remainingSpins);
      }

      // Store the result for display after animation
      const result = {
        prize: data.result ? {
          id: data.result.prizeId,
          name: data.result.prizeName,
          color: data.result.prizeColor,
          type: data.result.prizeType,
          value: data.result.prizeValue,
          imageUrl: data.result.prizeImageUrl,
        } : null,
        isWin: data.result?.isWin || false,
        message: data.result?.message || "",
      };
      setLastResult(result);
      lastResultRef.current = result;

      // Set target BEFORE starting wheel - so Wheel3D reads correct target on first effect run
      setTargetSegment(data.result?.segmentIndex ?? 0);
      setTargetPrizeId(data.result?.prizeId);
      setIsSpinning(true);
    } catch (error) {
      setIsSpinning(false);
      console.error("Spin error:", error);
    }
  }, [isSpinning, remainingSpins, prizes]);

  const handleSpinEnd = useCallback((prize: Prize, segmentIndex: number) => {
    console.log("handleSpinEnd called", { segmentIndex, lastResult: lastResultRef.current });
    setIsSpinning(false);
    // Use ref to get the latest result
    const result = lastResultRef.current;
    if (result) {
      console.log("Showing result:", result);
      if (result.isWin) {
        setShowConfetti(true);
      }
      setShowPopup(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-yellow-400 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 relative overflow-hidden flex flex-col">
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px 5px rgba(251,191,36,0.4); }
          50% { box-shadow: 0 0 40px 10px rgba(251,191,36,0.6); }
        }
      `}</style>

      {/* Header */}
      <header className="relative z-50 py-2 px-3 sm:py-4 sm:px-4">
        <div className="flex items-center justify-between">
          {/* Left - User info or Logo */}
          <div className="flex-1">
            {user ? (
              <div className="flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {user.username?.[0]?.toUpperCase() || user.firstName?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-yellow-400 font-medium">Welcome back</span>
                    <span className="text-sm sm:text-base font-bold text-white">{user.username || user.firstName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-black/20">
                  <span className="text-[10px] sm:text-xs text-white/60">ការបង្វិលនៅសល់</span>
                  <span className="text-base sm:text-lg font-bold text-yellow-400">{remainingSpins === null ? "..." : remainingSpins}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xl sm:text-3xl">🎰</span>
                  <h1 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500">
                    LUCKY SPIN
                  </h1>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-black/20">
                  <span className="text-[10px] sm:text-xs text-white/60">ការបង្វិលនៅសល់</span>
                  <span className="text-base sm:text-lg font-bold text-yellow-400">{remainingSpins === null ? "..." : remainingSpins}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Wheel Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {/* The Wheel */}
        <div className="relative">
          <Wheel3D
            prizes={prizes}
            isSpinning={isSpinning}
            onSpinStart={() => console.log("Spin started")}
            onSpinEnd={handleSpinEnd}
            onSpinTrigger={handleSpin}
            targetSegment={targetSegment}
            targetPrizeId={targetPrizeId}
          />
        </div>

        {/* SPIN NOW Button */}
        <button
          className="mt-4 sm:mt-8 px-10 sm:px-20 py-3 sm:py-5 text-white text-lg sm:text-2xl font-bold rounded-full border-2 border-emerald-400/50 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
            boxShadow: `
              0 4px 0 #065f46,
              0 8px 25px rgba(16,185,129,0.35),
              inset 0 -3px 10px rgba(0,0,0,0.2),
              inset 0 3px 10px rgba(255,255,255,0.15)
            `,
          }}
          onClick={handleSpin}
          disabled={isSpinning || remainingSpins === 0}
        >
          {isSpinning ? (
            <span className="flex items-center gap-3">
              <span className="animate-spin text-2xl">🎰</span>
              SPINNING...
            </span>
          ) : (
            "បង្វិល"
          )}
        </button>

        {/* Result Display - only show after spinning ends */}
        {lastResult && !showPopup && !isSpinning && (
          <div
            className="mt-6 px-8 py-4 rounded-2xl border-2"
            style={{
              background: lastResult.isWin
                ? "rgba(34, 197, 94, 0.3)"
                : "rgba(255, 255, 255, 0.1)",
              borderColor: lastResult.isWin ? "rgba(34, 197, 94, 0.6)" : "rgba(255, 255, 255, 0.2)",
            }}
          >
            <p className={`text-xl font-bold text-center ${lastResult.isWin ? "text-green-400" : "text-white"}`}>
              {lastResult.message}
            </p>
          </div>
        )}
      </main>

      <PrizePopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        prize={lastResult?.prize || null}
        isWin={lastResult?.isWin || false}
      />

      <Confetti isActive={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
}