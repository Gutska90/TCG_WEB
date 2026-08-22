import { Text } from "react-native";
import { Screen } from "../src/ui/screen";
import { TextLink } from "../src/ui/nav";

export default function NotFoundScreen() {
  return (
    <Screen title="No encontrado">
      <Text>Esa pantalla no existe en esta beta.</Text>
      <TextLink href="/(tabs)" label="Volver al inicio" />
    </Screen>
  );
}
