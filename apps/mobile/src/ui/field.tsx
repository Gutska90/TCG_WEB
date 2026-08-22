import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, space } from "./theme";

export function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
  autoCapitalize = "none",
  placeholder,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  placeholder?: string;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        editable={editable}
        style={[styles.input, multiline ? styles.multi : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 14, color: colors.text },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  multi: { minHeight: 96, textAlignVertical: "top", paddingTop: 10 },
});
