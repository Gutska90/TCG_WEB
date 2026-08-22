import { loginSchema } from "@tcg/validation";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { OauthButtons } from "../components/oauth-buttons";
import { api, persistTokens } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { userFacingError } from "../src/lib/errors";
import type { AuthTokens } from "@tcg/types";
import { Button, ErrorText, Screen } from "../src/ui/screen";
import { Field } from "../src/ui/field";
import { TextLink } from "../src/ui/nav";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { next, reason } = useLocalSearchParams<{ next?: string; reason?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(reason === "expired" ? "Tu sesión expiró. Vuelve a ingresar." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Revisa email y contraseña.");
      return;
    }
    setPending(true);
    try {
      const tokens = await api<AuthTokens>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      await persistTokens(tokens);
      await signIn(tokens);
      const dest: Href =
        typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? (next as Href) : "/(tabs)";
      router.replace(dest);
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen title="Ingresar">
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} secure />
      <ErrorText message={error} />
      <Button label="Ingresar" pending={pending} onPress={() => void onSubmit()} />
      <OauthButtons
        onSuccess={async (tokens) => {
          await signIn(tokens);
          const dest: Href =
            typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? (next as Href) : "/(tabs)";
          router.replace(dest);
        }}
      />
      <TextLink href="/forgot-password" label="¿Olvidaste tu contraseña?" />
      <TextLink href="/register" label="Crear cuenta" />
      <TextLink href="/legal/terminos" label="Términos" />
    </Screen>
  );
}
