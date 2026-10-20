import { useEffect, useRef, useState } from "react";
import { Appearance, AppState, View } from "react-native";
import { router, Stack, usePathname } from "expo-router";
import * as Updates from "expo-updates";
import { pushToGithub } from "../sync";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlaybackProvider } from "../playback";
import "../ready";
import ToastHost from "../components/Toast";
import { Splash } from "../components/Splash";
import { getOnboarding } from "../familiar";
import { applyTheme, c, F, mode, onThemeChange, scheme } from "../theme";
import { useFonts, PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic } from "@expo-google-fonts/playfair-display";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic });
  const [themeKey, setThemeKey] = useState(0);
  const pathname = usePathname();
  const here = useRef(pathname);
  const restore = useRef<string | null>(null);
  useEffect(() => {
    here.current = pathname;
  }, [pathname]);
  useEffect(
    () =>
      onThemeChange(() => {
        restore.current = here.current;
        setThemeKey((k) => k + 1);
      }),
    [],
  );
  useEffect(() => {
    const to = restore.current;
    restore.current = null;
    if (to && to !== "/") setTimeout(() => router.navigate(to as never), 0);
  }, [themeKey]);
  useEffect(() => {
    let pending = false;
    const fetchUpdate = async () => {
      if (!Updates.isEnabled) return;
      try {
        if ((await Updates.checkForUpdateAsync()).isAvailable)
          pending = !!(await Updates.fetchUpdateAsync()).isNew;
      } catch {}
    };
    fetchUpdate();
    if (!getOnboarding().done) setTimeout(() => router.push("/onboarding"), 0);
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        fetchUpdate();
        const now = Appearance.getColorScheme() === "light" ? "light" : "dark";
        if (mode === "system" && now !== scheme) applyTheme();
      }
      if (st === "background") {
        pushToGithub().finally(
          () => pending && Updates.reloadAsync().catch(() => {}),
        );
      }
    });
    return () => sub.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <PlaybackProvider>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          {fontsLoaded && <Stack
            key={themeKey}
            screenOptions={{
              headerStyle: { backgroundColor: c.bg },
              headerTintColor: c.gold,
              headerTitleStyle: { color: c.text, fontFamily: F.heading },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: c.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false }} />
          </Stack>}
          <ToastHost />
          <Splash />
        </View>
      </PlaybackProvider>
    </SafeAreaProvider>
  );
}
