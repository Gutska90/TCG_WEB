import { LEGAL_CONSENT_CHECKBOX, MARKETING_CONSENT_CHECKBOX } from "@tcg/config";
import { registerSchema } from "@tcg/validation";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import type { AuthTokens } from "@tcg/types";
import { OauthButtons } from "../components/oauth-buttons";
import { api, persistTokens } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { userFacingError } from "../src/lib/errors";
import { Button, ErrorText, Screen } from "../src/ui/screen";
import { Field } from "../src/ui/field";
import { TextLink } from "../src/ui/nav";
import { useColors } from "../src/ui/theme-provider";

export default function RegisterScreen() {
  const colors = useColors();
  const { signIn } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = registerSchema.safeParse({
      displayName,
      email,
      password,
      acceptTerms: acceptTerms ? true : undefined,
      marketingOptIn: marketing,
    });
    if (!parsed.success) {
      setError("Completa los datos y acepta los términos (el checkbox no viene marcado).");
      return;
    }
    setPending(true);
    try {
      const tokens = await api<AuthTokens>("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      await persistTokens(tokens);
      await signIn(tokens);
      router.replace("/(tabs)/profile");
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen title="Crear cuenta">
      <Field label="Nombre" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Contraseña (mínimo 10)" value={password} onChangeText={setPassword} secure />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptTerms }}
        accessibilityLabel={LEGAL_CONSENT_CHECKBOX.label}
        onPress={() => setAcceptTerms((v) => !v)}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text>{acceptTerms ? "☑" : "☐"} {LEGAL_CONSENT_CHECKBOX.label}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marketing }}
        accessibilityLabel={MARKETING_CONSENT_CHECKBOX.label}
        onPress={() => setMarketing((v) => !v)}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={{ color: colors.muted }}>{marketing ? "☑" : "☐"} {MARKETING_CONSENT_CHECKBOX.label}</Text>
      </Pressable>
      <TextLink href="/legal/terminos" label="Leer términos" />
      <TextLink href="/legal/privacidad" label="Leer privacidad" />
      <ErrorText message={error} />
      <Button label="Crear cuenta" pending={pending} disabled={!acceptTerms} onPress={() => void onSubmit()} />
      <OauthButtons
        onSuccess={async (tokens) => {
          await signIn(tokens);
          router.replace("/(tabs)/profile");
        }}
      />
      <TextLink href="/login" label="Ya tengo cuenta" />
    </Screen>
  );
}
