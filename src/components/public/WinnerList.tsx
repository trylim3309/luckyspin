"use client";

import { useEffect, useState } from "react";

interface Winner {
  id: string;
  firstName: string;
  prizeName: string;
  createdAt: string;
}

export function WinnerList() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch recent winners (in production, this would be a real API call)
    // For demo, we'll use mock data
    setTimeout(() => {
      setWinners([
        { id: "1", firstName: "Alex", prizeName: "$5 Cash", createdAt: new Date().toISOString() },
        { id: "2", firstName: "Maria", prizeName: "Free Spin", createdAt: new Date().toISOString() },
        { id: "3", firstName: "John", prizeName: "$2 Cash", createdAt: new Date().toISOString() },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No winners yet. Be the first!</p>
    );
  }

  return (
    <div className="space-y-3">
      {winners.map((winner, index) => (
        <div
          key={winner.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-lg">
            🎉
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">{winner.firstName}</p>
            <p className="text-sm text-yellow-400">{winner.prizeName}</p>
          </div>
          <span className="text-xs text-white/50">
            {new Date(winner.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}