import { LEGAL_CONSENT_CHECKBOX } from "@tcg/config";
import type { PublicPlatformConfig } from "@tcg/types";
import { fetchConfig } from "../src/lib/endpoints";
import { loginWithAppleIdentityToken, loginWithGoogleIdToken, loginWithTestOauth } from "../src/lib/oauth";
import { googleClientIds, isAllowedAuthRedirect } from "../src/lib/config";
import { userFacingError } from "../src/lib/errors";
import type { AuthTokens } from "@tcg/types";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import { Button, ErrorText } from "../src/ui/screen";
import { colors } from "../src/ui/theme";

type Props = {
  onSuccess: (tokens: AuthTokens) => Promise<void>;
};

export function OauthButtons({ onSuccess }: Props) {
  const [config, setConfig] = useState<PublicPlatformConfig | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ids = googleClientIds();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: ids.ios || undefined,
    androidClientId: ids.android || undefined,
    webClientId: ids.web || undefined,
    redirectUri: "tcgplatform://oauth",
  });

  useEffect(() => {
    void fetchConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (typeof idToken !== "string") return;
    setPending(true);
    void loginWithGoogleIdToken(idToken, acceptTerms)
      .then(onSuccess)
      .catch((err: unknown) => setError(userFacingError(err)))
      .finally(() => setPending(false));
  }, [acceptTerms, onSuccess, response]);

  if (!config) return null;

  async function run(fn: () => Promise<AuthTokens>) {
    setPending(true);
    setError(null);
    try {
      await onSuccess(await fn());
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Switch
          value={acceptTerms}
          onValueChange={setAcceptTerms}
          accessibilityLabel="Aceptar términos para Google o Apple"
        />
        <Text style={{ flex: 1, color: colors.muted, fontSize: 13 }}>{LEGAL_CONSENT_CHECKBOX.label}</Text>
      </View>
      {config.features.authStub && config.features.enableGoogleAuth ? (
        <Button
          variant="secondary"
          label="Continuar con Google (prueba)"
          pending={pending}
          onPress={() => {
            const suffix = String(Date.now());
            void run(() =>
              loginWithTestOauth({
                provider: "GOOGLE",
                subject: `mobile-google-${suffix}`,
                email: `mobile.google.${suffix}@example.test`,
                acceptTerms,
              }),
            );
          }}
        />
      ) : null}
      {config.features.authStub && config.features.enableAppleAuth ? (
        <Button
          variant="secondary"
          label="Continuar con Apple (prueba)"
          pending={pending}
          onPress={() => {
            const suffix = String(Date.now());
            void run(() =>
              loginWithTestOauth({
                provider: "APPLE",
                subject: `mobile-apple-${suffix}`,
                email: `${suffix}@privaterelay.appleid.com`,
                acceptTerms,
              }),
            );
          }}
        />
      ) : null}
      {!config.features.authStub && config.features.enableGoogleAuth && request ? (
        <Button
          variant="secondary"
          label="Continuar con Google"
          pending={pending}
          onPress={() => {
            if (!isAllowedAuthRedirect("tcgplatform://oauth")) return;
            void promptAsync();
          }}
        />
      ) : null}
      {!config.features.authStub && config.features.enableAppleAuth && Platform.OS === "ios" ? (
        <Button
          variant="secondary"
          label="Continuar con Apple"
          pending={pending}
          onPress={() => {
            void (async () => {
              const Apple = await import("expo-apple-authentication");
              if (!(await Apple.isAvailableAsync())) return;
              const cred = await Apple.signInAsync({
                requestedScopes: [
                  Apple.AppleAuthenticationScope.FULL_NAME,
                  Apple.AppleAuthenticationScope.EMAIL,
                ],
              });
              if (!cred.identityToken) return;
              const displayName = [cred.fullName?.givenName, cred.fullName?.familyName]
                .filter(Boolean)
                .join(" ");
              await run(() =>
                loginWithAppleIdentityToken(cred.identityToken as string, acceptTerms, {
                  email: cred.email ?? undefined,
                  displayName: displayName || undefined,
                }),
              );
            })();
          }}
        />
      ) : null}
      <ErrorText message={error} />
    </View>
  );
}
