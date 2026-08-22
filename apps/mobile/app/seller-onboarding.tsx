import { LEGAL_CONSENT_CHECKBOX } from "@tcg/config";
import { sellerOnboardingSchema } from "@tcg/validation";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { api } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { userFacingError } from "../src/lib/errors";
import { Button, ErrorText, Screen } from "../src/ui/screen";
import { Field } from "../src/ui/field";
import { RequireAuth } from "../src/ui/nav";

function Inner() {
  const router = useRouter();
  const { reloadMe } = useAuth();
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [comuna, setComuna] = useState("");
  const [region, setRegion] = useState("Metropolitana");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Screen title="Ser vendedor">
      <Field label="Nombre de retiro" value={recipientName} onChangeText={setRecipientName} autoCapitalize="words" />
      <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Dirección" value={line1} onChangeText={setLine1} />
      <Field label="Comuna" value={comuna} onChangeText={setComuna} />
      <Field label="Región" value={region} onChangeText={setRegion} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptTerms }} onPress={() => setAcceptTerms((v) => !v)}>
        <Text>{acceptTerms ? "☑" : "☐"} {LEGAL_CONSENT_CHECKBOX.label}</Text>
      </Pressable>
      <ErrorText message={error} />
      <Button
        label="Activar vendedor"
        pending={pending}
        disabled={!acceptTerms}
        onPress={() => {
          const parsed = sellerOnboardingSchema.safeParse({
            recipientName,
            phone,
            line1,
            comuna,
            region,
            acceptTerms: acceptTerms ? true : undefined,
          });
          if (!parsed.success) {
            setError("Completa los datos y acepta los términos.");
            return;
          }
          setPending(true);
          void api("/v1/me/seller-onboarding", { method: "POST", body: JSON.stringify(parsed.data) })
            .then(async () => {
              await reloadMe();
              router.replace("/sell");
            })
            .catch((err: unknown) => setError(userFacingError(err)))
            .finally(() => setPending(false));
        }}
      />
    </Screen>
  );
}

export default function SellerOnboardingScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
