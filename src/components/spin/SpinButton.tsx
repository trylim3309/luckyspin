"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SpinButtonProps {
  onSpin: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  remainingSpins?: number;
}

export function SpinButton({ onSpin, disabled, isLoading, remainingSpins }: SpinButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={onSpin}
        disabled={disabled || isLoading}
        className="h-14 w-14 rounded-full text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          "SPIN"
        )}
      </Button>

      {remainingSpins !== undefined && remainingSpins !== -1 && (
        <p className="text-xs text-white/60">
          {remainingSpins} left
        </p>
      )}
    </div>
  );
}