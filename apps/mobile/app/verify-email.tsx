import { verifyEmailSchema } from "@tcg/validation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { api } from "../src/lib/api";
import { userFacingError } from "../src/lib/errors";
import { Button, ErrorText, Screen, SuccessText } from "../src/ui/screen";
import { Field } from "../src/ui/field";
import { TextLink } from "../src/ui/nav";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token: preset } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(preset ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Screen title="Verificar email">
      <Field label="Token" value={token} onChangeText={setToken} />
      <ErrorText message={error} />
      <SuccessText message={ok} />
      <Button
        label="Verificar"
        pending={pending}
        onPress={() => {
          const parsed = verifyEmailSchema.safeParse({ token });
          if (!parsed.success) {
            setError("El token no es válido.");
            return;
          }
          setPending(true);
          setError(null);
          void api("/v1/auth/verify-email", { method: "POST", body: JSON.stringify(parsed.data) })
            .then(() => {
              setOk("Email verificado. Ya puedes comprar y vender.");
              router.replace("/login");
            })
            .catch((err: unknown) => setError(userFacingError(err)))
            .finally(() => setPending(false));
        }}
      />
      <TextLink href="/login" label="Ingresar" />
    </Screen>
  );
}
