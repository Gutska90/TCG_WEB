import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, space } from "./theme";

export function Screen({
  children,
  scroll = true,
  title,
}: {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
}) {
  const body = (
    <View style={styles.inner}>
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.text} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {message}
    </Text>
  );
}

export function SuccessText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.success} accessibilityRole="text">
      {message}
    </Text>
  );
}

export function SandboxBanner() {
  return (
    <View style={styles.sandbox} accessibilityLabel="Pago de prueba sandbox">
      <Text style={styles.sandboxText}>Pago de prueba / sandbox. Esta beta no cobra dinero real.</Text>
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
  variant?: "primary" | "secondary" | "danger";
}) {
  const bg = variant === "primary" ? colors.inverseBg : variant === "danger" ? colors.danger : colors.bg;
  const fg = variant === "secondary" ? colors.text : colors.inverse;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || pending}
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: variant === "secondary" ? colors.border : bg, opacity: disabled || pending ? 0.5 : 1 },
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{pending ? "…" : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  inner: { padding: space.md, gap: space.sm, flex: 1 },
  title: { fontSize: 24, fontWeight: "600", color: colors.text, marginBottom: 4 },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  center: { padding: space.lg, alignItems: "center", gap: space.sm },
  sandbox: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
    borderWidth: 1,
    padding: space.sm,
    borderRadius: 8,
  },
  sandboxText: { color: colors.text, fontSize: 14 },
  btn: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  btnText: { fontSize: 16, fontWeight: "600" },
});
