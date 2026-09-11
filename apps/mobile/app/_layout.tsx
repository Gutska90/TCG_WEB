import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/lib/auth";
import { QueryProvider } from "../src/lib/query";
import { track } from "../src/lib/analytics";
import { ThemeProvider, useColors } from "../src/ui/theme-provider";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

function ThemedStatusBar() {
  const colors = useColors();
  return <StatusBar style={colors.bg === "#0B1020" ? "light" : "dark"} />;
}

export default function RootLayout() {
  useEffect(() => {
    track("app_open");
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <ThemedStatusBar />
              <Stack screenOptions={{ headerBackTitle: "Volver" }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: "Ingresar" }} />
              <Stack.Screen name="oauth" options={{ title: "Autenticando" }} />
              <Stack.Screen name="security" options={{ title: "Seguridad" }} />
              <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
              <Stack.Screen name="verify-email" options={{ title: "Verificar email" }} />
              <Stack.Screen name="forgot-password" options={{ title: "Recuperar contraseña" }} />
              <Stack.Screen name="card/[id]" options={{ title: "Carta" }} />
              <Stack.Screen name="listing/[id]" options={{ title: "Publicación" }} />
              <Stack.Screen name="checkout" options={{ title: "Pagar" }} />
              <Stack.Screen name="checkout-return" options={{ title: "Confirmando pago" }} />
              <Stack.Screen name="purchases/index" options={{ title: "Mis compras" }} />
              <Stack.Screen name="purchases/[id]" options={{ title: "Compra" }} />
              <Stack.Screen name="sales/index" options={{ title: "Mis ventas" }} />
              <Stack.Screen name="sales/[id]" options={{ title: "Venta" }} />
              <Stack.Screen name="inquiries/index" options={{ title: "Consultas" }} />
              <Stack.Screen name="inquiries/[id]" options={{ title: "Consulta" }} />
              <Stack.Screen name="disputes/index" options={{ title: "Reclamos" }} />
              <Stack.Screen name="disputes/[id]" options={{ title: "Reclamo" }} />
              <Stack.Screen name="sell/index" options={{ title: "Publicaciones" }} />
              <Stack.Screen name="sell/new" options={{ title: "Vender" }} />
              <Stack.Screen name="sell/[id]" options={{ title: "Editar publicación" }} />
              <Stack.Screen name="balance" options={{ title: "Saldo" }} />
              <Stack.Screen name="seller-plan" options={{ title: "Tu plan" }} />
              <Stack.Screen name="addresses" options={{ title: "Direcciones" }} />
              <Stack.Screen name="notifications" options={{ title: "Notificaciones" }} />
              <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
              <Stack.Screen name="legal/[slug]" options={{ title: "Legal" }} />
              <Stack.Screen name="seller-onboarding" options={{ title: "Onboarding vendedor" }} />
            </Stack>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
