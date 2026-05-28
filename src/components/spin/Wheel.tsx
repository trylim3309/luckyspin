"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface Prize {
  id: string;
  name: string;
  color: string;
  type: string;
  value?: number;
}

interface WheelProps {
  prizes: Prize[];
  onSpinStart?: () => void;
  onSpinEnd?: (prize: Prize) => void;
  isSpinning?: boolean;
  children?: React.ReactNode;
}

export function Wheel({ prizes, onSpinStart, onSpinEnd, isSpinning = false, children }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, currentRotation: number) => {
    if (!ctx || prizes.length === 0) return;

    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const segmentAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw wheel segments
    prizes.forEach((prize, index) => {
      const startAngle = currentRotation + index * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw prize text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;

      const text = prize.name.length > 10 ? prize.name.substring(0, 10) + "..." : prize.name;
      ctx.fillText(text, radius - 20, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw center text
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", centerX, centerY);
  }, [prizes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const size = Math.min(400, canvas.offsetWidth);
    canvas.width = size;
    canvas.height = size;

    drawWheel(ctx, rotation);
  }, [rotation, drawWheel, prizes]);

  const spinToPrize = useCallback((segmentIndex: number) => {
    if (spinning) return;

    setSpinning(true);
    onSpinStart?.();

    const segmentAngle = (2 * Math.PI) / prizes.length;
    const targetAngle = segmentIndex * segmentAngle + segmentAngle / 2;

    // Calculate rotation needed to land on target (pointer is at top = -PI/2)
    const pointerAngle = -Math.PI / 2;
    const normalizedTarget = ((targetAngle - pointerAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    // Add several full rotations for effect
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const totalRotation = fullRotations * 2 * Math.PI + (2 * Math.PI - normalizedTarget);

    let currentRotationLocal = rotation;
    const startTime = Date.now();
    const duration = 4000 + Math.random() * 1000; // 4-5 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentRotationLocal = rotation + easeOut * totalRotation;

      setRotation(currentRotationLocal);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const selectedPrize = prizes[segmentIndex];
        onSpinEnd?.(selectedPrize);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [rotation, prizes, spinning, onSpinStart, onSpinEnd]);

  // Expose spinToPrize method via ref pattern or callback
  useEffect(() => {
    if (!isSpinning) return;

    // Find the empty/losing segment for demo
    const emptyIndex = prizes.findIndex(p => p.type === "EMPTY" || p.type === "NO_WIN");
    if (emptyIndex !== -1) {
      spinToPrize(emptyIndex);
    } else if (prizes.length > 0) {
      spinToPrize(prizes.length - 1);
    }
  }, [isSpinning]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Pointer arrow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderTop: "30px solid #FFD700",
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      {/* Wheel and center button wrapper */}
      <div className="relative">
        {/* Wheel canvas */}
        <canvas
          ref={canvasRef}
          className="w-full aspect-square drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.4))" }}
        />

        {/* Center spin button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Glow effect when spinning */}
      {spinning && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: "0 0 60px 20px rgba(255, 215, 0, 0.4)",
            animation: "pulse 0.5s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}

export function spinToPrizeHandler(segmentIndex: number) {
  // This will be connected via parent component
}