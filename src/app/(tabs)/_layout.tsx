import { t as tr } from '../../i18n';
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { BottomTabBar } from "expo-router/build/react-navigation/bottom-tabs";
import MiniPlayer from "../../components/MiniPlayer";
import { useState } from "react";
import { View, type ColorValue } from "react-native";
import { c } from "../../theme";

type IconName = keyof typeof Ionicons.glyphMap;

// The current tab shows a filled icon and the others an outline, so "you are here" isn't told by colour alone.
function icon(name: IconName) {
  return function TabIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={size} color={color as string} />;
  };
}

export default function TabsLayout() {
  const [barH, setBarH] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Tabs
        tabBar={(props) => (
          <View onLayout={(e) => setBarH(e.nativeEvent.layout.height)}>
            <BottomTabBar {...props} />
          </View>
        )}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.gold,
          tabBarInactiveTintColor: c.dim,
          tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line },
          headerStyle: { backgroundColor: c.bg },
          headerTitleStyle: { color: c.text },
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: c.bg },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{ title: tr("Home"), tabBarIcon: icon("home") }}
        />
        <Tabs.Screen
          name="(library)"
          options={{ title: tr("Library"), tabBarIcon: icon("library") }}
        />
        <Tabs.Screen
          name="(search)"
          options={{ title: tr("Search"), tabBarIcon: icon("search") }}
        />
        <Tabs.Screen
          name="(journal)"
          options={{ title: tr("Journal"), tabBarIcon: icon("book") }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{ title: tr("Profile"), tabBarIcon: icon("person-circle") }}
        />
      </Tabs>
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: barH }}
      >
        <MiniPlayer />
      </View>
    </View>
  );
}
