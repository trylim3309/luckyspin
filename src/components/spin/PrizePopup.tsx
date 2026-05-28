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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900 to-indigo-900 border-yellow-500">
        <DialogHeader className="text-center">
          {prize.imageUrl ? (
            <div className="mx-auto mb-4 w-32 h-32 rounded-xl overflow-hidden bg-white/10">
              <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="mx-auto mb-4 text-6xl">🎉</div>
          )}
          <DialogTitle className="text-2xl font-bold text-white">
            {isWin ? "🎉 អបអរសាទរ! 🎉" : "😢 ល្អចាំ!"}
          </DialogTitle>
          <DialogDescription className="text-xl text-white/90 font-medium">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}