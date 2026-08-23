import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { space, type ThemeColors } from "./theme";
import { useColors, useThemePreference } from "./theme-provider";

export function Screen({
  children,
  scroll = true,
  title,
}: {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
}) {
  const colors = useColors();
  const body = (
    <View style={styles.inner}>
      {title ? (
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
    </SafeAreaView>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.text} />
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>{children}</Text>;
}

export function ErrorText({ message }: { message: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <Text style={{ color: colors.danger, fontSize: 14 }} accessibilityRole="alert">
      {message}
    </Text>
  );
}

export function SuccessText({ message }: { message: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <Text style={{ color: colors.success, fontSize: 14 }} accessibilityRole="text">
      {message}
    </Text>
  );
}

export function SandboxBanner() {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.amberBg,
        borderColor: colors.amberBorder,
        borderWidth: 1,
        padding: space.sm,
        borderRadius: 12,
      }}
      accessibilityLabel="Pago de prueba sandbox"
    >
      <Text style={{ color: colors.text, fontSize: 14 }}>Pago de prueba / sandbox. Esta beta no cobra dinero real.</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  pending,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const colors = useColors();
  const bg =
    variant === "primary"
      ? colors.inverseBg
      : variant === "danger"
        ? colors.danger
        : variant === "ghost"
          ? "transparent"
          : colors.surface;
  const fg = variant === "secondary" || variant === "ghost" ? colors.text : colors.inverse;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || pending}
      onPress={onPress}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: variant === "secondary" || variant === "ghost" ? colors.border : bg,
          opacity: disabled || pending ? 0.5 : 1,
        },
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{pending ? "…" : label}</Text>
    </Pressable>
  );
}

export function ThemeToggleRow() {
  const { preference, setPreference } = useThemePreference();
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {(["light", "dark", "system"] as const).map((value) => (
        <Button
          key={value}
          variant={preference === value ? "primary" : "secondary"}
          label={value === "light" ? "Claro" : value === "dark" ? "Oscuro" : "Sistema"}
          onPress={() => setPreference(value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },
  inner: { padding: space.md, gap: space.sm, flex: 1 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 4 },
  center: { padding: space.lg, alignItems: "center", gap: space.sm },
  btn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  btnText: { fontSize: 16, fontWeight: "600" },
});

export function useThemeColors(): ThemeColors {
  return useColors();
}
