import { t as tr } from '../../../i18n';
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
      <Stack.Screen name="settings/index" options={{ title: tr("Settings") }} />
      <Stack.Screen name="stats" options={{ title: tr("Stats") }} />
      <Stack.Screen name="journal-stats" options={{ title: tr("Journal stats") }} />
      <Stack.Screen name="numerology" options={{ title: tr("Numerology") }} />
      <Stack.Screen name="astrology" options={{ title: tr("Birth chart") }} />
      <Stack.Screen name="settings/profile" options={{ title: tr("Edit profile") }} />
      <Stack.Screen name="settings/appearance" options={{ title: tr("App") }} />
      <Stack.Screen name="settings/account" options={{ title: tr("Keys") }} />
      <Stack.Screen name="settings/backups" options={{ title: tr("Backups") }} />
      <Stack.Screen name="settings/configuration" options={{ title: tr("Tarot decks") }} />
      <Stack.Screen name="settings/decks/[path]" options={{ title: "" }} />
      <Stack.Screen name="settings/storage" options={{ title: tr("Storage") }} />
      <Stack.Screen name="settings/languages" options={{ title: tr("Languages") }} />
      <Stack.Screen name="settings/cloud-voices" options={{ title: tr("Cloud voices") }} />
      <Stack.Screen name="settings/widget" options={{ title: tr("Widget") }} />
      <Stack.Screen name="settings/numerology" options={{ title: tr("Numerology") }} />
      <Stack.Screen name="settings/astrology" options={{ title: tr("Astrology") }} />
      <Stack.Screen name="settings/development" options={{ title: tr("Development") }} />
      <Stack.Screen name="book/[id]" options={{ title: "" }} />
      <Stack.Screen name="title/[id]" options={{ title: "" }} />
      <Stack.Screen name="review/[year]" options={{ title: "" }} />
      <Stack.Screen name="add" options={{ title: tr("Add a book") }} />
      <Stack.Screen name="import" options={{ title: tr("Import a book") }} />
      <Stack.Screen name="jobs" options={{ title: tr("Books in progress") }} />
      <Stack.Screen name="job/[slug]" options={{ title: "" }} />
      <Stack.Screen name="familiars" options={{ title: tr("Your familiars") }} />
      <Stack.Screen name="familiar/[id]" options={{ title: "" }} />
      <Stack.Screen name="den/[id]" options={{ title: "" }} />
      <Stack.Screen
        name="find"
        options={{ title: tr("Find on Open Library"), presentation: "modal" }}
      />
    </Stack>
  );
}
