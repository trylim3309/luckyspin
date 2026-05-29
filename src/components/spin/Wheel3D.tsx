"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";

interface Prize {
  id: string;
  name: string;
  color: string;
  type: string;
  value?: number;
  icon?: string;
  imageUrl?: string | null;
}

interface Wheel3DProps {
  prizes: Prize[];
  onSpinStart?: () => void;
  onSpinEnd?: (prize: Prize, segmentIndex: number) => void;
  isSpinning?: boolean;
  onSpinTrigger?: () => void;
  targetSegment?: number;
  targetPrizeId?: string;
  wheelLogoUrl?: string | null;
}

const PRIZE_ICONS: Record<string, string> = {
  MONEY: "💰",
  FREE_SPIN: "🔄",
  COUPON: "🎟️",
  PRODUCT: "🎁",
  EMPTY: "😢",
  NO_WIN: "😢",
};

export function Wheel3D({ prizes, onSpinStart, onSpinEnd, isSpinning = false, onSpinTrigger, targetSegment, targetPrizeId, wheelLogoUrl }: Wheel3DProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [wheelSize, setWheelSize] = useState(480);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetSegmentRef = useRef<number | undefined>(targetSegment);
  const targetPrizeIdRef = useRef<string | undefined>(targetPrizeId);
  const animRef = useRef<{ startTime: number; duration: number; totalRotation: number; startRotation: number; targetIdx: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxSize = Math.min(vw - 40, vh * 0.55, 480);
      setWheelSize(Math.max(280, maxSize));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    targetSegmentRef.current = targetSegment;
    targetPrizeIdRef.current = targetPrizeId;
  }, [targetSegment, targetPrizeId]);

  // Load logo image when URL changes
  useEffect(() => {
    if (!wheelLogoUrl) {
      setLogoImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLogoImage(img);
    img.onerror = () => setLogoImage(null);
    img.src = wheelLogoUrl;
  }, [wheelLogoUrl]);

  const displayPrizes = prizes.slice(0, 8);
  const segmentAngle = displayPrizes.length > 0 ? 360 / displayPrizes.length : 45;

  const SIZE = wheelSize;
  const CENTER = SIZE / 2;
  const OUTER_RADIUS = SIZE / 2 - 10;
  const CENTER_RADIUS = SIZE * 0.2;

  const getIcon = (prize: Prize) => prize.icon || PRIZE_ICONS[prize.type] || "🎰";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imagePromises = displayPrizes.map((prize) => {
      if (prize.imageUrl) {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            (prize as any)._image = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = prize.imageUrl!;
        });
      }
      return Promise.resolve();
    });

    Promise.all(imagePromises).then(() => {
      ctx.clearRect(0, 0, SIZE * 2, SIZE * 2);
      ctx.save();
      ctx.translate(CENTER * 2, CENTER * 2);
      ctx.rotate((rotation * Math.PI) / 180);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      displayPrizes.forEach((prize, i) => {
        const startAngle = ((i * segmentAngle) - 90) * (Math.PI / 180);
        const endAngle = (((i + 1) * segmentAngle) - 90) * (Math.PI / 180);
        const midAngle = (startAngle + endAngle) / 2;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, OUTER_RADIUS * 2, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = prize.color;
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 4;
        ctx.stroke();

        const textRadius = OUTER_RADIUS * 0.7 * 2;
        const textX = Math.cos(midAngle) * textRadius;
        const textY = Math.sin(midAngle) * textRadius;

        ctx.save();
        ctx.translate(textX, textY);

        const prizeWithImage = prize as any;
        if (prizeWithImage._image && prizeWithImage._image.complete) {
          const img = prizeWithImage._image;
          const imgSize = 160;

          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.beginPath();
          ctx.rect(-imgSize/2, -imgSize/2, imgSize, imgSize);
          ctx.clip();

          const scale = Math.max(imgSize / img.width, imgSize / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
        } else {
          ctx.font = `${SIZE * 0.13}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 8;
          ctx.fillText(getIcon(prize), 0, 0);
        }
        ctx.restore();
      });

      ctx.beginPath();
      ctx.arc(0, 0, OUTER_RADIUS * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = SIZE * 0.04;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, CENTER_RADIUS * 2, 0, Math.PI * 2);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = SIZE * 0.02;
      ctx.stroke();

      // Draw logo in center if provided, otherwise leave blank/dark
      const logoRadius = CENTER_RADIUS * 2 - 4;
      if (logoImage && logoImage.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, logoRadius, 0, Math.PI * 2);
        ctx.clip();
        const scale = Math.min((logoRadius * 2) / logoImage.width, (logoRadius * 2) / logoImage.height);
        ctx.drawImage(
          logoImage,
          -logoImage.width * scale / 2,
          -logoImage.height * scale / 2,
          logoImage.width * scale,
          logoImage.height * scale
        );
        ctx.restore();
      }

      ctx.restore();
    });
  }, [rotation, displayPrizes, segmentAngle, logoImage]);

  useEffect(() => {
    if (isSpinning && !isAnimating) {
      const duration = 4000;
      const startTime = Date.now();
      const startRotation = currentRotationRef.current;

      let currentTargetIdx: number;
      if (targetPrizeIdRef.current !== undefined) {
        const foundIndex = displayPrizes.findIndex(p => p.id === targetPrizeIdRef.current);
        currentTargetIdx = foundIndex !== -1 ? foundIndex : 0;
      } else if (targetSegmentRef.current !== undefined) {
        currentTargetIdx = targetSegmentRef.current;
      } else {
        currentTargetIdx = 0;
      }

      const segMid = currentTargetIdx * segmentAngle + segmentAngle / 2;
      const targetRot = 360 - segMid;

      let needed = targetRot - startRotation;
      needed = ((needed % 360) + 360) % 360;
      if (needed < 30 && needed > 0) needed += 360;

      const extra = (5 + Math.floor(Math.random() * 4)) * 360;
      const totalRotation = needed + extra;

      animRef.current = {
        startTime,
        duration,
        totalRotation,
        startRotation,
        targetIdx: currentTargetIdx,
      };

      setIsAnimating(true);
      onSpinStart?.();

      const animate = () => {
        if (!isSpinning) {
          setIsAnimating(false);
          return;
        }

        const anim = animRef.current;
        if (!anim) return;

        const elapsed = Date.now() - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const newRotation = anim.startRotation + anim.totalRotation * eased;

        setRotation(newRotation);
        currentRotationRef.current = newRotation;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          currentRotationRef.current = anim.startRotation + anim.totalRotation;
          const selectedPrize = displayPrizes[anim.targetIdx];
          onSpinEnd?.(selectedPrize, anim.targetIdx);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isSpinning, isAnimating, displayPrizes, segmentAngle, onSpinEnd, onSpinStart]);

  const BULB_COUNT = 28;
  const BULB_RADIUS = OUTER_RADIUS + 24;
  const BULB_COLORS = ["#fbbf24", "#f472b6", "#a78bfa", "#34d399", "#fb923c", "#60a5fa", "#f472b6", "#fbbf24"];

  const BULB_SIZE = Math.max(8, SIZE * 0.03);

  return (
    <div className="relative flex items-center justify-center" ref={containerRef} tabIndex={0} style={{ width: SIZE + 70, height: SIZE + 90 }}>
      <div
        className="absolute rounded-full"
        style={{
          width: SIZE + 50,
          height: SIZE + 50,
          background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 65%)",
          filter: "blur(12px)",
          zIndex: 0,
        }}
      />

      <div className="absolute inset-0" style={{ zIndex: 5 }}>
        {Array.from({ length: BULB_COUNT }).map((_, i) => {
          const angle = (i * (360 / BULB_COUNT) - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * BULB_RADIUS;
          const y = Math.sin(angle) * BULB_RADIUS;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: BULB_SIZE,
                height: BULB_SIZE,
                backgroundColor: BULB_COLORS[i % BULB_COLORS.length],
                boxShadow: `0 0 ${BULB_SIZE}px ${BULB_COLORS[i % BULB_COLORS.length]}`,
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: "translate(-50%, -50%)",
                animationName: "bulb-glow",
                animationDuration: "1.5s",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationDelay: `${i * 0.06}s`,
              }}
            />
          );
        })}
      </div>

      <div className="relative" style={{ zIndex: 1 }}>
        <canvas
          ref={canvasRef}
          width={SIZE * 2}
          height={SIZE * 2}
          onClick={onSpinTrigger}
          className="cursor-pointer"
          style={{
            width: SIZE,
            height: SIZE,
            filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.5))",
          }}
        />
      </div>

      <div
        className="absolute z-20"
        style={{
          top: -20,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "22px solid transparent",
            borderRight: "22px solid transparent",
            borderTop: "42px solid #fbbf24",
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.5))",
          }}
        />
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: 22,
            height: 22,
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(145deg, #fef3c7 0%, #fbbf24 100%)",
            boxShadow: "0 0 28px 8px rgba(251,191,36,0.8)",
          }}
        />
      </div>

      <style>{`
        @keyframes bulb-glow {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
        }
      `}</style>
    </div>
  );
}
