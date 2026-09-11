import { Pressable, Text, View } from "react-native";

export function QtyStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const qty = Math.min(Math.max(min, value), Math.max(min, max));
  const canMinus = !disabled && qty > min;
  const canPlus = !disabled && qty < max;
  const btn = {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0,0,0,0.75)",
        borderRadius: 24,
        padding: 4,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menos"
        disabled={!canMinus}
        onPress={() => canMinus && onChange(qty - 1)}
        style={[btn, { opacity: canMinus ? 1 : 0.4 }]}
      >
        <Text style={{ color: "#fff", fontSize: 20, lineHeight: 22 }}>−</Text>
      </Pressable>
      <Text style={{ color: "#fff", minWidth: 28, textAlign: "center", fontWeight: "600" }}>{qty}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Más"
        disabled={!canPlus}
        onPress={() => canPlus && onChange(qty + 1)}
        style={[btn, { opacity: canPlus ? 1 : 0.4 }]}
      >
        <Text style={{ color: "#fff", fontSize: 20, lineHeight: 22 }}>+</Text>
      </Pressable>
    </View>
  );
}
