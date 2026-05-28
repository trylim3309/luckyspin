import crypto from "crypto";

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

  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
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

    // Check if auth_date is too old (24 hours)
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

    // Check if initData is too old (24 hours)
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

export function parseTelegramWidgetData(formData: FormData): TelegramWidgetData | null {
  try {
    const id = formData.get("id")?.toString() || formData.get("user")?.toString() || "";
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

export function parseTelegramMiniAppData(initData: string): TelegramWidgetData | null {
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