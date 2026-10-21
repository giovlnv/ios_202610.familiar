import { Stack } from "expo-router";
import { c, F } from "../../../theme";

export const unstable_settings = { home: { anchor: "index" } };

const TITLES: Record<string, string> = {
  "(home)": "Home",
  "(library)": "Library",
  "(search)": "Search",
  "(journal)": "Journal",
  "(profile)": "Profile",
};

export default function TabStack({ segment }: { segment: string }) {
  const root = segment.slice(1, -1);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.gold,
        headerTitleStyle: { color: c.text, fontFamily: F.heading },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen
        name={root === "home" ? "index" : root}
        options={{ title: TITLES[segment] }}
      />
      <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
      <Stack.Screen name="stats" options={{ title: "Stats" }} />
      <Stack.Screen name="journal-stats" options={{ title: "Journal stats" }} />
      <Stack.Screen name="numerology" options={{ title: "Numerology" }} />
      <Stack.Screen name="astrology" options={{ title: "Birth chart" }} />
      <Stack.Screen name="settings/profile" options={{ title: "Edit profile" }} />
      <Stack.Screen name="settings/appearance" options={{ title: "App" }} />
      <Stack.Screen name="settings/account" options={{ title: "Keys" }} />
      <Stack.Screen name="settings/backups" options={{ title: "Backups" }} />
      <Stack.Screen name="settings/configuration" options={{ title: "Tarot decks" }} />
      <Stack.Screen name="settings/decks/[path]" options={{ title: "" }} />
      <Stack.Screen name="settings/storage" options={{ title: "Storage" }} />
      <Stack.Screen name="settings/languages" options={{ title: "Languages" }} />
      <Stack.Screen name="settings/cloud-voices" options={{ title: "Cloud voices" }} />
      <Stack.Screen name="settings/widget" options={{ title: "Widget" }} />
      <Stack.Screen name="settings/numerology" options={{ title: "Numerology" }} />
      <Stack.Screen name="settings/astrology" options={{ title: "Astrology" }} />
      <Stack.Screen name="settings/development" options={{ title: "Development" }} />
      <Stack.Screen name="book/[id]" options={{ title: "" }} />
      <Stack.Screen name="title/[id]" options={{ title: "" }} />
      <Stack.Screen name="review/[year]" options={{ title: "" }} />
      <Stack.Screen name="add" options={{ title: "Add a book" }} />
      <Stack.Screen name="jobs" options={{ title: "Books in progress" }} />
      <Stack.Screen name="job/[slug]" options={{ title: "" }} />
      <Stack.Screen name="familiars" options={{ title: "Your familiars" }} />
      <Stack.Screen name="familiar/[id]" options={{ title: "" }} />
      <Stack.Screen name="den/[id]" options={{ title: "" }} />
      <Stack.Screen
        name="find"
        options={{ title: "Find on Open Library", presentation: "modal" }}
      />
    </Stack>
  );
}
