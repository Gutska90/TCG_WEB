import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchCart } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { TabIcon } from "../../src/ui/icons";
import { useColors } from "../../src/ui/theme-provider";

function CartHeaderButton() {
  const router = useRouter();
  const { me } = useAuth();
  const colors = useColors();
  const cart = useQuery({ queryKey: ["cart"], queryFn: fetchCart, enabled: Boolean(me) });
  const count = cart.data?.itemCount ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Carrito"
      onPress={() => router.push("/cart")}
      style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingRight: 12 }}
    >
      <View>
        <TabIcon name="cart-outline" color={colors.text} />
        {count > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -6,
              right: -10,
              backgroundColor: colors.primary,
              borderRadius: 8,
              minWidth: 16,
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: colors.inverse, fontSize: 10, fontWeight: "600", textAlign: "center" }}>{count}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontWeight: "600", color: colors.text },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => <CartHeaderButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: { minHeight: 52, backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color, size }) => <TabIcon name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Buscar",
          tabBarLabel: "Buscar",
          tabBarIcon: ({ color, size }) => <TabIcon name="search-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Colección",
          tabBarLabel: "Colección",
          tabBarIcon: ({ color, size }) => <TabIcon name="albums-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarLabel: "Wishlist",
          tabBarIcon: ({ color, size }) => <TabIcon name="heart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="cart" options={{ href: null, title: "Carrito" }} />
      <Tabs.Screen name="favorites" options={{ href: null, title: "Favoritos" }} />
    </Tabs>
  );
}
