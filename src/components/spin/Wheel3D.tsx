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
}

const PRIZE_ICONS: Record<string, string> = {
  MONEY: "💰",
  FREE_SPIN: "🔄",
  COUPON: "🎟️",
  PRODUCT: "🎁",
  EMPTY: "😢",
  NO_WIN: "😢",
};

export function Wheel3D({ prizes, onSpinStart, onSpinEnd, isSpinning = false, onSpinTrigger, targetSegment, targetPrizeId }: Wheel3DProps) {
  const [rotation, setRotation] = useState(0);
  const [wheelSize, setWheelSize] = useState(480);
  const currentRotationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetSegmentRef = useRef<number | undefined>(targetSegment);
  const targetPrizeIdRef = useRef<string | undefined>(targetPrizeId);
  const animRef = useRef<{
    rafId: number;
    startTime: number;
    duration: number;
    totalRotation: number;
    startRotation: number;
    targetIdx: number;
  } | null>(null);
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

  // Keep refs in sync with props
  useEffect(() => {
    targetSegmentRef.current = targetSegment;
    targetPrizeIdRef.current = targetPrizeId;
  }, [targetSegment, targetPrizeId]);

  const displayPrizes = prizes.slice(0, 8);
  const segmentAngle = displayPrizes.length > 0 ? 360 / displayPrizes.length : 45;

  const SIZE = wheelSize;
  const CENTER = SIZE / 2;
  const OUTER_RADIUS = SIZE / 2 - 10;
  const CENTER_RADIUS = SIZE * 0.2;

  const getIcon = (prize: Prize) => prize.icon || PRIZE_ICONS[prize.type] || "🎰";

  // Draw wheel on canvas
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

      ctx.restore();
    });
  }, [rotation, displayPrizes, segmentAngle]);

  // Spin animation — starts when isSpinning becomes true
  useEffect(() => {
    if (!isSpinning) {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current.rafId);
        animRef.current = null;
      }
      return;
    }

    onSpinStart?.();

    const duration = 4000;
    const startTime = Date.now();
    const startRotation = currentRotationRef.current;

    let targetIdx: number;
    if (targetPrizeIdRef.current !== undefined) {
      const foundIndex = displayPrizes.findIndex(p => p.id === targetPrizeIdRef.current);
      targetIdx = foundIndex !== -1 ? foundIndex : 0;
    } else if (targetSegmentRef.current !== undefined) {
      targetIdx = targetSegmentRef.current;
    } else {
      targetIdx = Math.floor(Math.random() * displayPrizes.length);
    }

    const segMid = targetIdx * segmentAngle + segmentAngle / 2;
    const targetRot = 360 - segMid;

    let needed = targetRot - startRotation;
    needed = ((needed % 360) + 360) % 360;
    if (needed < 30 && needed > 0) needed += 360;

    const extra = (5 + Math.floor(Math.random() * 4)) * 360;
    const totalRotation = needed + extra;

    animRef.current = { rafId: 0, startTime, duration, totalRotation, startRotation, targetIdx };

    const animate = () => {
      const anim = animRef.current;
      if (!anim) return;

      const elapsed = Date.now() - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const newRotation = anim.startRotation + anim.totalRotation * eased;

      setRotation(newRotation);
      currentRotationRef.current = newRotation;

      if (progress < 1 && isSpinning && animRef.current === anim) {
        anim.rafId = requestAnimationFrame(animate);
      } else {
        // Animation complete — save targetIdx before nulling the ref
        const finalTargetIdx = anim.targetIdx;
        const finalTargetRot = anim.startRotation + anim.totalRotation;
        currentRotationRef.current = finalTargetRot;
        animRef.current = null;
        const selectedPrize = displayPrizes[finalTargetIdx];
        onSpinEnd?.(selectedPrize, finalTargetIdx);
      }
    };

    animRef.current.rafId = requestAnimationFrame(animate);
  }, [isSpinning, displayPrizes, segmentAngle, onSpinEnd, onSpinStart]);

  // Mid-spin target correction
  useEffect(() => {
    const anim = animRef.current;
    if (!anim || !isSpinning) return;

    let newTargetIdx: number;
    if (targetPrizeIdRef.current !== undefined) {
      const foundIndex = displayPrizes.findIndex(p => p.id === targetPrizeIdRef.current);
      newTargetIdx = foundIndex !== -1 ? foundIndex : 0;
    } else if (targetSegmentRef.current !== undefined) {
      newTargetIdx = targetSegmentRef.current;
    } else {
      return;
    }

    if (newTargetIdx === anim.targetIdx) return;

    const currentPos = currentRotationRef.current;
    const segMid = newTargetIdx * segmentAngle + segmentAngle / 2;
    const targetRot = 360 - segMid;

    let needed = targetRot - currentPos;
    needed = ((needed % 360) + 360) % 360;
    if (needed < 30 && needed > 0) needed += 360;

    const extra = (5 + Math.floor(Math.random() * 4)) * 360;
    anim.startRotation = currentPos;
    anim.startTime = Date.now();
    anim.totalRotation = needed + extra;
    anim.targetIdx = newTargetIdx;
  }, [targetSegment, targetPrizeId, isSpinning, displayPrizes, segmentAngle]);

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
          style={{
            width: SIZE,
            height: SIZE,
            filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.5))",
          }}
        />

        <div
          className="absolute rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-150"
          style={{
            width: 90,
            height: 90,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "linear-gradient(145deg, #fef3c7 0%, #fbbf24 30%, #f59e0b 70%, #d97706 100%)",
            boxShadow: `
              0 6px 0 #b45309,
              0 8px 30px rgba(0,0,0,0.4),
              inset 0 3px 6px rgba(255,255,255,0.5),
              inset 0 -3px 6px rgba(0,0,0,0.15)
            `,
            border: "4px solid rgba(255,255,255,0.5)",
            zIndex: 10,
          }}
          onClick={onSpinTrigger}
        >
          <span className="text-lg font-black text-amber-900 tracking-wider">SPIN</span>
        </div>
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
