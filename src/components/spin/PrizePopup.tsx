"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PrizePopupProps {
  isOpen: boolean;
  onClose: () => void;
  prize: {
    name: string;
    type: string;
    value?: number;
    color?: string;
    message?: string;
    imageUrl?: string | null;
  } | null;
  isWin: boolean;
}

export function PrizePopup({ isOpen, onClose, prize, isWin }: PrizePopupProps) {
  if (!prize) return null;

  const getMessage = () => {
    if (prize.message) return prize.message;

    if (isWin) {
      if (prize.type === "MONEY" && prize.value) {
        return `អ្នកទទួលបាន $${prize.value}!`;
      }
      return `អ្នកទទួលបាន ${prize.name}!`;
    }

    return "Better luck next time!";
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-md sm:max-w-md bg-gradient-to-br from-purple-900 to-indigo-900 border-yellow-500 p-4 sm:p-6">
        <div className="absolute top-3 left-4 text-xs text-white/50">
          {dateStr} · {timeStr}
        </div>
        <DialogHeader className="text-center">
          {prize.imageUrl ? (
            <div className="mx-auto mb-3 sm:mb-4 w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-white/10">
              <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="mx-auto mb-3 sm:mb-4 text-5xl sm:text-6xl">🎉</div>
          )}
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
            {isWin ? "🎉 អបអរសាទរ! 🎉" : "😢 ល្អចាំ!"}
          </DialogTitle>
          <DialogDescription className="text-lg sm:text-xl text-white/90 font-medium">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}