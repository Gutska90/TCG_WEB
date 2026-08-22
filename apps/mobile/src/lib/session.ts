import * as SecureStore from "expo-secure-store";

const REFRESH_KEY = "tcg.refreshToken";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setRefreshToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(REFRESH_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function clearSessionTokens(): Promise<void> {
  accessToken = null;
  await setRefreshToken(null);
}
