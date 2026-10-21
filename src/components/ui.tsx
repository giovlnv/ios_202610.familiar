import { loc } from '../i18n';
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { coverUrl, TBook } from "../tracker";
import { c, themed } from "../theme";

export function Stars({
  value,
  size = 16,
  onChange,
}: {
  value?: number;
  size?: number;
  onChange?: (v: number | undefined) => void;
}) {
  const v = value ?? 0;
  return (
    <View style={{ flexDirection: "row", gap: size * 0.15 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name =
          v >= i ? "star" : v >= i - 0.5 ? "star-half" : "star-outline";
        const icon = (
          <Ionicons
            name={name}
            size={size}
            color={v >= i - 0.5 ? c.gold : c.line}
          />
        );
        if (!onChange) return <View key={i}>{icon}</View>;
        return (
          <View key={i} style={{ width: size, height: size }}>
            {icon}
            <View style={StyleSheet.absoluteFill}>
              <View style={{ flexDirection: "row", flex: 1 }}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => onChange(v === i - 0.5 ? undefined : i - 0.5)}
                />
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => onChange(v === i ? undefined : i)}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function Cover({
  book,
  width = 90,
}: {
  book: Pick<TBook, "coverId" | "isbn" | "title" | "audio">;
  width?: number;
}) {
  const h = width * 1.5;
  const url = coverUrl(book, width > 120 ? "L" : "M");
  const [failed, setFailed] = useState<string>();
  const uri = url !== failed ? url : undefined;
  return (
    <View
      style={{
        width,
        height: h,
        borderRadius: 6,
        overflow: "hidden",
        backgroundColor: c.raised,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width, height: h }}
          resizeMode="cover"
          onError={() => setFailed(url)}
        />
      ) : (
        <View style={s.placeholder}>
          <Text
            style={[s.phText, { fontSize: Math.max(10, width / 8) }]}
            numberOfLines={5}
          >
            {book.title}
          </Text>
        </View>
      )}
      {book.audio && (
        <View style={s.badge}>
          <Ionicons
            name="headset"
            size={Math.max(10, width / 9)}
            color={c.bg}
          />
        </View>
      )}
    </View>
  );
}

export function Chip({
  label,
  on,
  onPress,
  onLongPress,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[s.chip, on && s.chipOn]}
    >
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  primary,
  icon,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} style={[s.btn, primary && s.btnPrimary]}>
      {icon && (
        <Ionicons name={icon} size={16} color={primary ? c.bg : c.text} />
      )}
      <Text style={[s.btnText, primary && s.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export const fmtDate = (
  d: string,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) => new Date(`${d}T12:00:00`).toLocaleDateString(loc(), opts);

const s = themed(() => ({
  placeholder: {
    flex: 1,
    padding: 6,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
  },
  phText: { color: c.gold, fontWeight: "700", textAlign: "center" },
  badge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    backgroundColor: c.gold,
    borderRadius: 10,
    padding: 3,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: c.panel,
  },
  chipOn: { backgroundColor: c.gold },
  chipText: { color: c.dim, fontSize: 13 },
  chipTextOn: { color: c.bg, fontWeight: "700" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: c.raised,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  btnPrimary: { backgroundColor: c.gold },
  btnText: { color: c.text, fontSize: 15 },
  btnTextPrimary: { color: c.bg, fontWeight: "700" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  stepDate: { color: c.text, fontSize: 17, fontWeight: "600" },
}));

export function DateStepper({
  value,
  onChange,
  max,
}: {
  value: string;
  onChange: (d: string) => void;
  max?: string;
}) {
  const shift = (n: number) => {
    const d = new Date(`${value}T12:00:00`);
    d.setDate(d.getDate() + n);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!max || next <= max) onChange(next);
  };
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => shift(-30)} hitSlop={6}>
        <Ionicons name="play-back-outline" size={18} color={c.dim} />
      </Pressable>
      <Pressable onPress={() => shift(-1)} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={c.gold} />
      </Pressable>
      <Text style={s.stepDate}>{fmtDate(value)}</Text>
      <Pressable onPress={() => shift(1)} hitSlop={10}>
        <Ionicons
          name="chevron-forward"
          size={22}
          color={!max || value < max ? c.gold : c.line}
        />
      </Pressable>
      <Pressable onPress={() => shift(30)} hitSlop={6}>
        <Ionicons name="play-forward-outline" size={18} color={c.dim} />
      </Pressable>
    </View>
  );
}
