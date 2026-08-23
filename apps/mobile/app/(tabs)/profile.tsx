import { LEGAL } from "@tcg/config";
import { useRouter } from "expo-router";
import { Alert, Text } from "react-native";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { Button, EmptyState, Screen, SuccessText, ThemeToggleRow } from "../../src/ui/screen";
import { TextLink } from "../../src/ui/nav";
import { useColors } from "../../src/ui/theme-provider";
import { useState } from "react";
import { userFacingError } from "../../src/lib/errors";

export default function ProfileScreen() {
  const colors = useColors();
  const { me, signOut, reloadMe } = useAuth();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!me) {
    return (
      <Screen title="Perfil">
        <EmptyState>Ingresa para ver tu cuenta.</EmptyState>
        <TextLink href="/login" label="Ingresar" />
        <TextLink href="/register" label="Crear cuenta" />
      </Screen>
    );
  }

  const isSeller = me.roles.includes("SELLER");

  return (
    <Screen title={me.displayName}>
      <Text style={{ color: colors.muted }}>{me.email}</Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {me.emailVerified ? "Email verificado" : "Email pendiente de verificación"}
        {isSeller ? " · Vendedor" : ""}
      </Text>
      {me.legal.stale ? (
        <Text style={{ color: colors.muted }}>
          Hay una versión más nueva de términos o privacidad. No te pedimos reaceptar ahora.
        </Text>
      ) : null}
      {!me.emailVerified ? (
        <Button
          variant="secondary"
          label="Reenviar verificación"
          onPress={() => {
            void api("/v1/auth/resend-verification", { method: "POST" })
              .then(() => setNotice("Si el envío está activo, te llega un correo."))
              .catch((err: unknown) => setError(userFacingError(err)));
          }}
        />
      ) : null}
      <SuccessText message={notice} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <TextLink href="/collection" label="Mi colección" />
      <TextLink href="/wishlist" label="Wishlist" />
      <TextLink href="/purchases" label="Mis compras" />
      <TextLink href="/disputes" label="Mis reclamos" />
      {isSeller ? <TextLink href="/sales" label="Mis ventas" /> : null}
      {isSeller ? <TextLink href="/sell" label="Mis publicaciones" /> : null}
      {isSeller ? <TextLink href="/balance" label="Saldo vendedor" /> : null}
      {!isSeller ? <TextLink href="/seller-onboarding" label="Activar cuenta vendedor" /> : null}
      <TextLink href="/addresses" label="Direcciones" />
      <TextLink href="/security" label="Seguridad" />
      <TextLink href="/notifications" label="Notificaciones" />
      <TextLink href="/feedback" label="Enviar feedback" />
      <TextLink href="/legal/terminos" label="Términos" />
      <TextLink href="/legal/privacidad" label="Privacidad" />
      <TextLink href="/legal/marketplace" label="Reglas del marketplace" />
      <TextLink href="/legal/refunds" label="Reembolsos" />
      <TextLink href="/legal/ayuda" label="Ayuda" />
      <Text style={{ color: colors.muted, fontSize: 13 }}>{LEGAL.betaProductNotice}</Text>
      <ThemeToggleRow />
      <Button
        variant="secondary"
        label="Cerrar sesión"
        onPress={() => {
          void signOut().then(() => router.replace("/login"));
        }}
      />
      <Button
        variant="danger"
        label="Solicitar desactivación de cuenta"
        onPress={() => {
          Alert.alert("¿Desactivar tu cuenta?", "Los registros financieros se conservan.", [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Desactivar",
              style: "destructive",
              onPress: () => {
                void api("/v1/me/deletion-request", { method: "POST" })
                  .then(async () => {
                    await signOut();
                    router.replace("/login");
                  })
                  .catch((err: unknown) => setError(userFacingError(err)));
              },
            },
          ]);
        }}
      />
      <Button variant="secondary" label="Actualizar perfil" onPress={() => void reloadMe()} />
    </Screen>
  );
}
