import { Redirect } from "expo-router";

/** Deep link de retorno OAuth. El token se procesa en OauthButtons; esta ruta evita open redirect. */
export default function OauthCallbackScreen() {
  return <Redirect href="/login" />;
}
