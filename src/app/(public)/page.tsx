"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LoginButton } from "@/components/public/LoginButton";
import { WinnerList } from "@/components/public/WinnerList";

export default function HomePage() {
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    photoUrl?: string;
  } | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      // This would check the session cookie in a real implementation
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (userData: {
    id: string;
    firstName: string;
    photoUrl?: string;
  }) => {
    setUser(userData);
  };

  const prizes = [
    { name: "$5 Cash", color: "#22c55e", emoji: "💰" },
    { name: "$2 Cash", color: "#3b82f6", emoji: "💵" },
    { name: "$1 Cash", color: "#eab308", emoji: "💰" },
    { name: "Free Spin", color: "#a855f7", emoji: "🔄" },
    { name: "50% Off", color: "#ec4899", emoji: "🎟️" },
    { name: "Mystery", color: "#f97316", emoji: "🎁" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 text-6xl animate-bounce">🎰</div>
          <div className="absolute top-40 right-20 text-4xl animate-pulse">⭐</div>
          <div className="absolute bottom-20 left-1/4 text-5xl animate-ping">✨</div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-yellow-400 mb-6 drop-shadow-lg"
          >
            Lucky Spin
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto"
          >
            Spin the wheel and win amazing prizes! Cash, coupons, free spins, and more!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {user ? (
              <Link href="/spin">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold px-10 py-8 text-xl shadow-xl hover:scale-105 transition-all"
                >
                  🎰 Start Spinning!
                </Button>
              </Link>
            ) : (
              <LoginButton onSuccess={handleLoginSuccess} />
            )}
          </motion.div>

          {/* Animated wheel preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 relative"
          >
            <div className="w-64 h-64 mx-auto rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 p-2 shadow-2xl animate-spin" style={{ animationDuration: "10s" }}>
              <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <span className="text-6xl">🎯</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Prizes Section */}
      <section className="py-20 px-4 bg-black/20">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            <span className="text-yellow-400">🏆</span> Amazing Prizes Await!
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {prizes.map((prize, index) => (
              <motion.div
                key={prize.name}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/20 transition-all hover:scale-105 cursor-pointer"
              >
                <div
                  className="w-16 h-16 mx-auto rounded-full mb-4 flex items-center justify-center text-3xl"
                  style={{ backgroundColor: prize.color }}
                >
                  {prize.emoji}
                </div>
                <p className="font-bold text-white">{prize.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-4xl mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Login with Telegram</h3>
              <p className="text-white/70">Use your Telegram account to login securely</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-4xl mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Spin the Wheel</h3>
              <p className="text-white/70">Click the spin button and watch the magic!</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-4xl mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Win Prizes!</h3>
              <p className="text-white/70">Instantly receive your amazing rewards</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Recent Winners */}
      <section className="py-20 px-4 bg-black/20">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            <span className="text-yellow-400">🎉</span> Recent Winners
          </h2>

          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm rounded-2xl p-6">
            <WinnerList />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Try Your Luck?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of players winning amazing prizes every day!
          </p>

          {!user && (
            <LoginButton />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-black/30 border-t border-white/10">
        <div className="container mx-auto text-center text-white/50">
          <p>© 2024 Lucky Spin. All rights reserved.</p>
          <p className="mt-2 text-sm">Powered by Telegram</p>
        </div>
      </footer>
    </div>
  );
}