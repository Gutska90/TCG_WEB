import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS } from "@tcg/config";
import type { FeedbackCategory } from "@tcg/config";
import { createFeedbackSchema } from "@tcg/validation";
import * as Device from "expo-device";
import { usePathname } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { api, getLastRequestId } from "../src/lib/api";
import { APP_VERSION } from "../src/lib/config";
import { userFacingError } from "../src/lib/errors";
import { Button, ErrorText, Screen, SuccessText } from "../src/ui/screen";
import { Field } from "../src/ui/field";

export default function FeedbackScreen() {
  const pathname = usePathname();
  const [category, setCategory] = useState<FeedbackCategory>("OTHER");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Screen title="Feedback beta">
      {FEEDBACK_CATEGORIES.map((value) => (
        <Button
          key={value}
          variant={category === value ? "primary" : "secondary"}
          label={FEEDBACK_CATEGORY_LABELS[value]}
          onPress={() => setCategory(value)}
        />
      ))}
      <Field label="Mensaje" value={message} onChangeText={setMessage} multiline />
      <ErrorText message={error} />
      <SuccessText message={ok} />
      <Button
        label="Enviar"
        pending={pending}
        onPress={() => {
          const os = `${Platform.OS} ${Device.osVersion ?? ""}`.trim();
          const parsed = createFeedbackSchema.safeParse({
            category,
            message: `[mobile] ${message}`,
            screen: `mobile:${pathname}`.slice(0, 120),
            appVersion: `${APP_VERSION} ${os}`.slice(0, 40),
            requestId: getLastRequestId() ?? undefined,
          });
          if (!parsed.success) {
            setError("El mensaje debe tener al menos 8 caracteres.");
            return;
          }
          setPending(true);
          setError(null);
          void api("/v1/feedback", { method: "POST", body: JSON.stringify(parsed.data) })
            .then(() => setOk("Gracias. Recibimos tu feedback."))
            .catch((err: unknown) => setError(userFacingError(err)))
            .finally(() => setPending(false));
        }}
      />
    </Screen>
  );
}
