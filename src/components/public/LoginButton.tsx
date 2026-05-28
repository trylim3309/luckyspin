"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoginButtonProps {
  botUsername?: string;
  onSuccess?: (user: {
    id: string;
    telegramId: string;
    username?: string;
    firstName: string;
    lastName?: string;
    photoUrl?: string;
    balance: number;
  }) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          params: { bot_id: number; request_access?: string },
          callback: (user: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
            auth_date: number;
            hash: string;
          }) => void
        ) => void;
      };
    };
  }
}

export function LoginButton({ onSuccess, onError }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleTelegramLogin = async () => {
    setIsLoading(true);

    try {
      // For widget login, we need to use the Telegram Login widget
      // This is a simplified version - in production, you'd use the actual widget
      const botUsername = "YourBotUsername"; // Replace with actual bot username

      // Simulate Telegram widget callback
      // In production, this would use window.Telegram.Login.auth()
      const mockUserData = {
        id: Date.now(),
        first_name: "Demo",
        last_name: "User",
        username: "demo_user",
        photo_url: "",
        auth_date: Math.floor(Date.now() / 1000),
        hash: "mock_hash",
      };

      // Send to backend for verification
      const formData = new FormData();
      formData.append("id", mockUserData.id.toString());
      formData.append("first_name", mockUserData.first_name);
      formData.append("last_name", mockUserData.last_name || "");
      formData.append("username", mockUserData.username || "");
      formData.append("photo_url", mockUserData.photo_url || "");
      formData.append("auth_date", mockUserData.auth_date.toString());
      formData.append("hash", mockUserData.hash);

      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onSuccess?.(data.user);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTelegramLogin}
      disabled={isLoading}
      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-8 py-6 text-lg shadow-lg hover:scale-105 transition-all"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Logging in...
        </>
      ) : (
        <>
          <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.455-4.917c.24-.213-.054-.334-.373-.121l-6.871 4.326-2.962-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z" />
          </svg>
          Login with Telegram
        </>
      )}
    </Button>
  );
}