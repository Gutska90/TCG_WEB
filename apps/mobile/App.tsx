import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Fase 0</Text>
      <Text style={styles.title}>TCG Platform</Text>
      <Text style={styles.body}>
        Placeholder mobile. Auth, catálogo y el tab Escanear se implementan en fases posteriores.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    gap: 8,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#737373",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
    color: "#404040",
    lineHeight: 22,
  },
});
