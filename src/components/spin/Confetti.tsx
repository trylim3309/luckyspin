"use client";

import { useEffect, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
}

const COLORS = [
  "#FFD700", // Gold
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#A855F7", // Purple
  "#F97316", // Orange
  "#EC4899", // Pink
  "#22C55E", // Green
  "#3B82F6", // Blue
];

export function Confetti({ isActive, onComplete }: ConfettiProps) {
  const createConfetti = useCallback(() => {
    const canvas = document.getElementById("confetti-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const particleCount = 150;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
        life: 1,
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allDead = true;

      particles.forEach((p) => {
        if (p.life <= 0) return;
        allDead = false;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.life -= 0.005;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      ctx.globalAlpha = 1;

      if (!allDead) {
        animationId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [onComplete]);

  useEffect(() => {
    if (isActive) {
      const cleanup = createConfetti();
      return cleanup;
    }
  }, [isActive, createConfetti]);

  if (!isActive) return null;

  return (
    <canvas
      id="confetti-canvas"
      className="fixed inset-0 pointer-events-none z-50"
      style={{ position: "fixed", top: 0, left: 0 }}
    />
  );
}