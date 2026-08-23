import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { AuthMethodsView, SessionView } from "@tcg/types";
import { api } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { userFacingError } from "../src/lib/errors";
import { Button, ErrorText, Screen, SuccessText } from "../src/ui/screen";
import { Field } from "../src/ui/field";
import { useColors } from "../src/ui/theme-provider";

export default function SecurityScreen() {
  const colors = useColors();
  const { me, signOut } = useAuth();
  const router = useRouter();
  const [methods, setMethods] = useState<AuthMethodsView | null>(null);
  const [sessions, setSessions] = useState<SessionView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  function load() {
    Promise.all([api<AuthMethodsView>("/v1/me/auth-identities"), api<SessionView[]>("/v1/me/sessions")])
      .then(([nextMethods, nextSessions]) => {
        setMethods(nextMethods);
        setSessions(nextSessions);
      })
      .catch((err: unknown) => setError(userFacingError(err)));
  }

  useEffect(() => {
    if (me) load();
  }, [me]);

  if (!me) {
    router.replace("/login" as Href);
    return null;
  }

  const google = methods?.identities.some((row) => row.provider === "GOOGLE");
  const apple = methods?.identities.some((row) => row.provider === "APPLE");

  return (
    <Screen title="Seguridad">
      <ErrorText message={error} />
      <SuccessText message={notice} />
      <Text style={{ fontWeight: "600" }}>Métodos de inicio</Text>
      <Text style={{ color: colors.muted }}>Email/contraseña · {methods?.hasPassword ? "Conectado" : "No configurado"}</Text>
      <Text style={{ color: colors.muted }}>Google · {google ? "Conectado" : "No conectado"}</Text>
      <Text style={{ color: colors.muted }}>Apple · {apple ? "Conectado" : "No conectado"}</Text>
      {methods?.hasPassword ? (
        <Field label="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secure />
      ) : null}
      <Field
        label={methods?.hasPassword ? "Nueva contraseña" : "Agregar contraseña"}
        value={password}
        onChangeText={setPassword}
        secure
      />
      <Button
        variant="secondary"
        label="Guardar contraseña"
        onPress={() => {
          void api("/v1/me/password", {
            method: "POST",
            body: JSON.stringify({
              password,
              currentPassword: methods?.hasPassword ? currentPassword : undefined,
            }),
          })
            .then(() => {
              setNotice("Contraseña guardada.");
              setPassword("");
              setCurrentPassword("");
              load();
            })
            .catch((err: unknown) => setError(userFacingError(err)));
        }}
      />
      <Text style={{ fontWeight: "600", marginTop: 8 }}>Sesiones</Text>
      {(sessions ?? []).map((row) => (
        <Text key={row.id} style={{ color: colors.muted, fontSize: 13 }}>
          {row.current ? "Esta sesión" : row.userAgent ?? "Otro dispositivo"} ·{" "}
          {new Date(row.createdAt).toLocaleString("es-CL")}
        </Text>
      ))}
      <Button
        variant="secondary"
        label="Cerrar otras sesiones"
        onPress={() => {
          void api("/v1/me/sessions/revoke-all", { method: "POST" })
            .then(() => {
              setNotice("Cerramos las otras sesiones.");
              load();
            })
            .catch((err: unknown) => setError(userFacingError(err)));
        }}
      />
      <Button
        variant="danger"
        label="Cerrar sesión"
        onPress={() => {
          void signOut().then(() => router.replace("/login"));
        }}
      />
    </Screen>
  );
}
