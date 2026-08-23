import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function TabIcon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}
