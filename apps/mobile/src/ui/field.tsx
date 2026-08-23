import { Text, TextInput, View } from "react-native";
import { space } from "./theme";
import { useColors } from "./theme-provider";

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
  const colors = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 14, color: colors.text }}>{label}</Text>
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
        style={{
          minHeight: multiline ? 96 : 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: space.sm,
          fontSize: 16,
          color: colors.text,
          backgroundColor: colors.surface,
          textAlignVertical: multiline ? "top" : "center",
          paddingTop: multiline ? 10 : undefined,
        }}
      />
    </View>
  );
}
