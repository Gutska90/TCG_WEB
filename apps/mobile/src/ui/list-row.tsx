import { Image, Pressable, Text, View } from "react-native";
import { space } from "./theme";
import { useColors } from "./theme-provider";

export function ListRow({
  title,
  subtitle,
  onPress,
  right,
  imageUrl,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: string;
  imageUrl?: string | null;
}) {
  const colors = useColors();
  const inner = (
    <View style={{ flexDirection: "row", gap: space.sm, padding: space.sm, alignItems: "center" }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 48, height: 68, borderRadius: 8, backgroundColor: colors.fill }}
          resizeMode="contain"
          accessibilityLabel={title}
        />
      ) : (
        <View
          style={{ width: 48, height: 68, borderRadius: 8, backgroundColor: colors.fill }}
          accessibilityLabel={`${title}, sin imagen`}
        />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: colors.muted }}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{right}</Text> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginBottom: space.sm, backgroundColor: colors.surface }}
    >
      {inner}
    </Pressable>
  );
}
