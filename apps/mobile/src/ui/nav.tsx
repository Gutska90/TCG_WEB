import { Link, Redirect, usePathname, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { useAuth } from "../lib/auth";
import { colors } from "./theme";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, me } = useAuth();
  const pathname = usePathname();
  if (!ready) return null;
  if (!me) return <Redirect href={`/login?next=${encodeURIComponent(pathname)}`} />;
  return <>{children}</>;
}

export function TextLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as Href} accessibilityRole="link" accessibilityLabel={label}>
      <Text style={{ color: colors.text, textDecorationLine: "underline", fontSize: 15 }}>{label}</Text>
    </Link>
  );
}

