import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NOTIFICATION_TYPE_LABELS } from "@tcg/config";
import { Pressable, Text } from "react-native";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  markNotificationsRead,
  patchNotificationPreference,
} from "../src/lib/endpoints";
import { userFacingError } from "../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen } from "../src/ui/screen";
import { RequireAuth } from "../src/ui/nav";
import { colors } from "../src/ui/theme";

function Inner() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });
  const prefsQuery = useQuery({ queryKey: ["notification-prefs"], queryFn: fetchNotificationPreferences });
  const readAll = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const patchPref = useMutation({
    mutationFn: patchNotificationPreference,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });

  if (query.isLoading || prefsQuery.isLoading) return <Screen title="Notificaciones"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Notificaciones"><ErrorText message={userFacingError(query.error)} /></Screen>;
  if (prefsQuery.error) {
    return <Screen title="Notificaciones"><ErrorText message={userFacingError(prefsQuery.error)} /></Screen>;
  }
  const data = query.data;
  const prefs = prefsQuery.data ?? [];
  const priceDrop = prefs.find((row) => row.type === "PRICE_DROP");
  const wishlistHit = prefs.find((row) => row.type === "WISHLIST_HIT");

  return (
    <Screen title="Notificaciones">
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {data?.unreadCount ?? 0} sin leer. El push aún no está activo en esta beta.
      </Text>
      <Text style={{ marginTop: 16, fontWeight: "600" }}>Alertas</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: priceDrop?.inApp ?? false }}
        onPress={() => patchPref.mutate({ type: "PRICE_DROP", inApp: !(priceDrop?.inApp ?? false) })}
      >
        <Text>
          {priceDrop?.inApp ? "☑" : "☐"} Avisarme en la app si baja el precio 10% o más (
          {NOTIFICATION_TYPE_LABELS.PRICE_DROP})
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: wishlistHit?.email ?? false }}
        onPress={() => patchPref.mutate({ type: "WISHLIST_HIT", email: !(wishlistHit?.email ?? false) })}
      >
        <Text>{wishlistHit?.email ? "☑" : "☐"} Correo cuando aparece una carta de mi wishlist</Text>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: priceDrop?.email ?? false }}
        onPress={() => patchPref.mutate({ type: "PRICE_DROP", email: !(priceDrop?.email ?? false) })}
      >
        <Text>{priceDrop?.email ? "☑" : "☐"} Correo cuando baja el precio</Text>
      </Pressable>
      {(data?.unreadCount ?? 0) > 0 ? (
        <Button variant="secondary" label="Marcar todas como leídas" pending={readAll.isPending} onPress={() => readAll.mutate()} />
      ) : null}
      {data?.items.length === 0 ? <EmptyState>No hay notificaciones todavía.</EmptyState> : null}
      {data?.items.map((row) => (
        <Text key={row.id} style={{ marginTop: 12, color: row.readAt ? colors.muted : colors.text }}>
          {row.title}
          {"\n"}
          {row.body}
        </Text>
      ))}
    </Screen>
  );
}

export default function NotificationsScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
