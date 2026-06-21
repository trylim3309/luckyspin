import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ============================================================================
// EXISTING: Telegram Widget / Mini App Verification Utilities
// ============================================================================

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramWidgetData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

export interface TelegramMiniAppData {
  initData: string;
}

function secretKeyGenerator(botToken: string): Buffer {
  return crypto.createHash("sha256").update(botToken).digest();
}

function validateTelegramHash(
  data: Record<string, string>,
  hash: string,
  botToken: string
): boolean {
  const secretKey = secretKeyGenerator(botToken);
  const dataCheckString = Object.keys(data)
    .filter((key) => key !== "hash")
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  return hmac === hash;
}

export function verifyTelegramWidgetData(
  data: TelegramWidgetData,
  botToken: string
): { valid: boolean; user?: TelegramUser; error?: string } {
  try {
    if (!data.hash) {
      return { valid: false, error: "Missing hash" };
    }

    if (!data.auth_date) {
      return { valid: false, error: "Missing auth_date" };
    }

    const authDate = parseInt(data.auth_date, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return { valid: false, error: "Auth data expired" };
    }

    const dataToCheck: Record<string, string> = {
      auth_date: data.auth_date,
      first_name: data.first_name,
    };

    if (data.id) dataToCheck.id = data.id;
    if (data.last_name) dataToCheck.last_name = data.last_name;
    if (data.username) dataToCheck.username = data.username;
    if (data.photo_url) dataToCheck.photo_url = data.photo_url;

    const isValid = validateTelegramHash(dataToCheck, data.hash, botToken);

    if (!isValid) {
      return { valid: false, error: "Invalid hash" };
    }

    return {
      valid: true,
      user: {
        id: parseInt(data.id, 10),
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        photo_url: data.photo_url,
      },
    };
  } catch (error) {
    return { valid: false, error: "Verification failed" };
  }
}

export function verifyTelegramMiniAppInitData(
  initData: string,
  botToken: string
): { valid: boolean; user?: TelegramUser; error?: string } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) {
      return { valid: false, error: "Missing hash" };
    }

    const authDate = params.get("auth_date");
    if (!authDate) {
      return { valid: false, error: "Missing auth_date" };
    }

    const authDateTimestamp = parseInt(authDate, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDateTimestamp > 86400) {
      return { valid: false, error: "Init data expired" };
    }

    const dataToCheck: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key !== "hash") {
        dataToCheck[key] = value;
      }
    });

    const isValid = validateTelegramHash(dataToCheck, hash!, botToken);

    if (!isValid) {
      return { valid: false, error: "Invalid hash" };
    }

    const userJson = params.get("user");
    let user: TelegramUser | undefined;

    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch {
        return { valid: false, error: "Invalid user data" };
      }
    }

    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: "Verification failed" };
  }
}

export function parseTelegramWidgetData(
  formData: FormData
): TelegramWidgetData | null {
  try {
    const id =
      formData.get("id")?.toString() ||
      formData.get("user")?.toString() ||
      "";
    const first_name = formData.get("first_name")?.toString() || "";
    const last_name = formData.get("last_name")?.toString();
    const username = formData.get("username")?.toString();
    const photo_url = formData.get("photo_url")?.toString();
    const auth_date = formData.get("auth_date")?.toString() || "";
    const hash = formData.get("hash")?.toString() || "";

    return {
      id,
      first_name,
      last_name,
      username,
      photo_url,
      auth_date,
      hash,
    };
  } catch {
    return null;
  }
}

export function parseTelegramMiniAppData(
  initData: string
): TelegramWidgetData | null {
  try {
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");

    let userData: TelegramWidgetData = {
      id: "",
      first_name: "",
      last_name: undefined,
      username: undefined,
      photo_url: undefined,
      auth_date: "",
      hash: "",
    };

    if (userJson) {
      const user = JSON.parse(userJson);
      userData.id = user.id?.toString() || "";
      userData.first_name = user.first_name || "";
      userData.last_name = user.last_name;
      userData.username = user.username;
      userData.photo_url = user.photo_url;
    }

    userData.auth_date = params.get("auth_date") || "";
    userData.hash = params.get("hash") || "";

    return userData;
  } catch {
    return null;
  }
}

// ============================================================================
// NEW: Telegram Bot API Service (for sending/receiving messages via webhooks)
// ============================================================================

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    first_name: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
}

interface TelegramWebhookPayload {
  update_id: number;
  message?: TelegramMessage;
}

export class TelegramBotService {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  private async callMethod<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(
      `${TELEGRAM_API_BASE}${this.botToken}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: params ? JSON.stringify(params) : undefined,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }

    return result.result as T;
  }

  /**
   * Send a message to a specific chat
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    options?: {
      parseMode?: "HTML" | "Markdown";
      replyMarkup?: Record<string, unknown>;
    }
  ): Promise<{ message_id: number; chat: { id: number } }> {
    return this.callMethod("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode,
      reply_markup: options?.replyMarkup,
    });
  }

  /**
   * Send a message to a user by their Telegram chat ID
   */
  async sendMessageToUser(
    telegramChatId: string,
    text: string,
    options?: { parseMode?: "HTML" | "Markdown" }
  ): Promise<boolean> {
    try {
      await this.sendMessage(telegramChatId, text, options);
      return true;
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
      return false;
    }
  }

  /**
   * Send an inline keyboard with buttons
   */
  async sendInlineKeyboard(
    chatId: string | number,
    text: string,
    buttons: Array<Array<{ text: string; callback_data: string }>>
  ): Promise<{ message_id: number }> {
    return this.sendMessage(chatId, text, {
      replyMarkup: {
        inline_keyboard: buttons,
      },
    });
  }

  /**
   * Answer a callback query (required for inline buttons)
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    try {
      await this.callMethod("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get bot info
   */
  async getMe(): Promise<{
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  }> {
    return this.callMethod("getMe");
  }

  /**
   * Set webhook URL for the bot
   */
  async setWebhook(url: string, secretToken?: string): Promise<boolean> {
    try {
      await this.callMethod("setWebhook", {
        url,
        secret_token: secretToken,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      await this.callMethod("deleteWebhook");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<{
    url?: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
  }> {
    return this.callMethod("getWebhookInfo");
  }
}

/**
 * Process incoming webhook update
 */
export async function processTelegramWebhook(
  payload: TelegramWebhookPayload,
  botToken: string
): Promise<{ action: string; data?: Record<string, unknown> } | null> {
  const message = payload.message;

  if (!message) return null;

  const telegramService = new TelegramBotService(botToken);

  // Handle /start command
  if (message.text === "/start") {
    const chatId = String(message.chat.id);
    const username = message.chat.username;
    const firstName = message.chat.first_name;

    // Try to find user by telegram username and update their chat ID
    if (username) {
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: chatId,
            telegramUsername: username,
          },
        });

        await telegramService.sendMessage(
          chatId,
          `Welcome back, ${firstName}! You've been linked to your ${user.username} account.`
        );
      } else {
        await telegramService.sendMessage(
          chatId,
          `Hello ${firstName}! Your Telegram is not linked to any account yet. Please login to your account first to link it.`
        );
      }
    } else {
      await telegramService.sendMessage(
        chatId,
        `Hello ${firstName}! Please set a username in your Telegram settings to link your account.`
      );
    }

    return { action: "start", data: { chatId, username, firstName } };
  }

  // Handle /help command
  if (message.text === "/help") {
    await telegramService.sendMessage(
      message.chat.id,
      "Available commands:\n/start - Link your account\n/help - Show this help\n/balance - Check your balance"
    );
    return { action: "help" };
  }

  // Handle /balance command
  if (message.text === "/balance") {
    const chatId = String(message.chat.id);
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
    });

    if (user) {
      await telegramService.sendMessage(
        chatId,
        `Your balance: $${user.balance.toFixed(2)}\nTotal spins: ${user.totalSpins}\nTotal wins: ${user.totalWins}`
      );
    } else {
      await telegramService.sendMessage(
        chatId,
        "Your Telegram is not linked to any account."
      );
    }

    return { action: "balance" };
  }

  return null;
}

/**
 * Send a notification to a user via Telegram
 */
export async function sendTelegramNotification(
  userId: string,
  message: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.telegramChatId) {
    console.error(`User ${userId} has no Telegram chat ID`);
    return false;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return false;
  }

  const telegramService = new TelegramBotService(botToken);
  return telegramService.sendMessageToUser(user.telegramChatId, message);
}

/**
 * Send a broadcast message to all users with Telegram linked
 */
export async function sendTelegramBroadcast(
  message: string,
  options?: { parseMode?: "HTML" | "Markdown" }
): Promise<{ sent: number; failed: number }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  const telegramService = new TelegramBotService(botToken);

  const usersWithTelegram = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
    },
    select: { id: true, telegramChatId: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of usersWithTelegram) {
    if (user.telegramChatId) {
      const success = await telegramService.sendMessageToUser(
        user.telegramChatId,
        message,
        options
      );
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting - be nice to Telegram API
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return { sent, failed };
}

// Factory function to get Telegram service instance
export function getTelegramBotService(): TelegramBotService {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return new TelegramBotService(botToken);
}