import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontWeight: "600" },
        tabBarActiveTintColor: "#171717",
        tabBarInactiveTintColor: "#737373",
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: { minHeight: 52 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio", tabBarLabel: "Inicio" }} />
      <Tabs.Screen name="search" options={{ title: "Buscar", tabBarLabel: "Buscar" }} />
      <Tabs.Screen name="collection" options={{ title: "Colección", tabBarLabel: "Colección" }} />
      <Tabs.Screen name="favorites" options={{ title: "Favoritos", tabBarLabel: "Favoritos" }} />
      <Tabs.Screen name="cart" options={{ title: "Carrito", tabBarLabel: "Carrito" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarLabel: "Perfil" }} />
    </Tabs>
  );
}
