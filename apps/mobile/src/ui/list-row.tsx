import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "./theme";

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
  const inner = (
    <View style={styles.row}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.img} accessibilityLabel={title} />
      ) : (
        <View style={styles.ph} accessibilityLabel={`${title}, sin imagen`} />
      )}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.press}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginBottom: space.sm },
  row: { flexDirection: "row", gap: space.sm, padding: space.sm, alignItems: "center" },
  img: { width: 48, height: 64, borderRadius: 4, backgroundColor: colors.fill },
  ph: { width: 48, height: 64, borderRadius: 4, backgroundColor: colors.fill },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  right: { fontSize: 14, fontWeight: "600", color: colors.text },
});
