import { forgotPasswordSchema, resetPasswordSchema } from "@tcg/validation";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { api } from "../src/lib/api";
import { userFacingError } from "../src/lib/errors";
import { Button, ErrorText, Screen, SuccessText } from "../src/ui/screen";
import { Field } from "../src/ui/field";
import { TextLink } from "../src/ui/nav";

export default function ForgotPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Screen title={token ? "Nueva contraseña" : "Recuperar contraseña"}>
      {token ? (
        <Field label="Contraseña nueva" value={password} onChangeText={setPassword} secure />
      ) : (
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      )}
      <ErrorText message={error} />
      <SuccessText message={ok} />
      <Button
        label="Enviar"
        pending={pending}
        onPress={() => {
          setError(null);
          setPending(true);
          const run = token
            ? (() => {
                const parsed = resetPasswordSchema.safeParse({ token, password });
                if (!parsed.success) throw new Error("invalid");
                return api("/v1/auth/reset-password", { method: "POST", body: JSON.stringify(parsed.data) });
              })()
            : (() => {
                const parsed = forgotPasswordSchema.safeParse({ email });
                if (!parsed.success) throw new Error("invalid");
                return api("/v1/auth/forgot-password", { method: "POST", body: JSON.stringify(parsed.data) });
              })();
          void Promise.resolve(run)
            .then(() => setOk(token ? "Contraseña actualizada." : "Si el email existe, te enviamos instrucciones."))
            .catch((err: unknown) => setError(err instanceof Error && err.message === "invalid" ? "Revisa los datos." : userFacingError(err)))
            .finally(() => setPending(false));
        }}
      />
      <TextLink href="/login" label="Ingresar" />
    </Screen>
  );
}
