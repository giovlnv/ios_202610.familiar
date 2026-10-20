import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { KokoroTtsModel, models, useTextToSpeech } from "react-native-executorch";
import { c, themed } from "../../../theme";
import { wav } from "../../../kokoro";
import { usePad, usePlayback } from "../../../playback";
import { listBooks } from "../../../storage";

type Lang = "EN" | "PT";
type Backend = "COREML_FP32" | "XNNPACK_FP32";

const VOICES: Record<Lang, string[]> = {
  EN: ["af_heart", "af_river", "af_sarah"],
  PT: ["pf_dora", "pm_santa"],
};

const SAMPLES: Record<Lang, string> = {
  EN: "The Hermit walks alone on a mountain path at night, holding up a lantern with a six-pointed star inside. He is not lost. He has chosen to step away from the noise of the world so he can listen to his own inner voice. In a reading, this card asks you to slow down, to look inward, and to trust the small light you already carry. The answer you are looking for is rarely outside you. It is waiting in the quiet, where you finally have room to hear it.",
  PT: "O Eremita caminha sozinho por uma trilha na montanha, à noite, segurando uma lanterna com uma estrela de seis pontas. Ele não está perdido. Escolheu se afastar do barulho do mundo para ouvir a própria voz interior. Numa leitura, esta carta pede que você desacelere, olhe para dentro e confie na pequena luz que já carrega. A resposta que você procura raramente está fora de você. Ela espera no silêncio, onde finalmente há espaço para ouvi-la.",
};

const config = (lang: Lang, backend: Backend) =>
  (lang === "EN" ? models.textToSpeech.KOKORO.EN_US : models.textToSpeech.KOKORO.PT)[backend] as KokoroTtsModel<string>;

const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const min = (ms: number) => `${(ms / 60000).toFixed(1)} min`;

const CHAPTERS = ["The Fool", "Common Sense"];
const chapter = (title: string) => {
  for (const { book } of listBooks()) {
    const hit = book.sections.find((x) => x.title.toLowerCase().includes(title.toLowerCase()));
    if (hit) return hit.paras.filter((p) => p.kind === "book" || p.kind === "head" || p.kind === "title").map((p) => p.text).join("\n\n");
  }
  return "";
};

export default function VoiceLab() {
  const pad = usePad();
  const pb = usePlayback();
  const [lang, setLang] = useState<Lang>("EN");
  const [backend, setBackend] = useState<Backend>("COREML_FP32");
  const [voice, setVoice] = useState("af_heart");
  const [speed, setSpeed] = useState(1);
  const [text, setText] = useState(SAMPLES.EN);
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const loadStart = useRef(Date.now());
  const player = useRef<AudioPlayer | null>(null);

  const cfg = useMemo(() => config(lang, backend), [lang, backend]);
  const tts = useTextToSpeech(cfg);

  useEffect(() => {
    loadStart.current = Date.now();
    setLoadMs(null);
  }, [cfg]);
  useEffect(() => {
    if (tts.isReady) setLoadMs(Date.now() - loadStart.current);
  }, [tts.isReady]);
  useEffect(() => () => player.current?.remove(), []);

  const pickLang = (l: Lang) => {
    setLang(l);
    setVoice(VOICES[l][0]);
    setText(SAMPLES[l]);
  };

  const play = (uri: string) => {
    if (pb.status.playing) pb.toggle();
    player.current?.remove();
    player.current = createAudioPlayer({ uri });
    player.current.play();
  };

  const run = async (repeat: number, name?: string) => {
    if (!tts.synthesize || busy) return;
    const input = name ? chapter(name) : Array(repeat).fill(text.trim()).join(" ");
    if (!input) return setResults((r) => [`${name}: not found in your library`, ...r]);
    const quarters: number[] = [];
    let qAudio = 0;
    let qStart = Date.now();
    const parts: Float32Array[] = [];
    let audio = 0;
    let first = 0;
    let rate = 24000;
    const t0 = Date.now();
    setBusy("Starting…");
    try {
      for await (const ch of tts.synthesize(input, { voice: voice as never, speed })) {
        if (!first) first = Date.now() - t0;
        parts.push(ch.audio);
        audio += ch.duration;
        rate = ch.sampleRate;
        qAudio += ch.duration;
        if (name && quarters.length < 3 && (ch.chunkIndex + 1) / ch.totalChunks >= (quarters.length + 1) / 4) {
          quarters.push(qAudio / ((Date.now() - qStart) / 1000));
          qAudio = 0;
          qStart = Date.now();
        }
        setBusy(`Chunk ${ch.chunkIndex + 1} of ${ch.totalChunks} · ${min(Date.now() - t0)}`);
      }
      const ms = Date.now() - t0;
      const f = new File(Paths.cache, `voice-lab-${t0}.wav`);
      f.write(wav(parts, rate));
      if (name) quarters.push(qAudio / ((Date.now() - qStart) / 1000));
      const head = name ? `Chapter test: ${name} · total ${min(ms)} · audio ${(audio / 60).toFixed(1)} min · by quarter ${quarters.map((q) => `${q.toFixed(1)}×`).join(" / ")}\n` : "";
      const line = `${head}${lang} · ${voice} · ${backend === "COREML_FP32" ? "Core ML" : "XNNPACK"} · ${input.length} chars · first audio ${sec(first)} · total ${sec(ms)} · audio ${audio.toFixed(1)} s · ${(audio / (ms / 1000)).toFixed(1)}× real time`;
      setResults((r) => [line, ...r]);
      play(f.uri);
    } catch (e) {
      setResults((r) => [`Error: ${String((e as Error).message ?? e)}`, ...r]);
    } finally {
      setBusy("");
    }
  };

  const progress = Math.round(tts.downloadProgress <= 1 ? tts.downloadProgress * 100 : tts.downloadProgress);

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={s.wrap} contentContainerStyle={{ paddingBottom: 60 + pad }}>
      <Text style={s.p}>
        Tests the Kokoro voice running on this iPhone, with no internet once the voice is downloaded. Run each test, then tap
        “Copy results” and paste them in the chat.
      </Text>

      <Seg options={["EN", "PT"]} value={lang} onChange={(v) => pickLang(v as Lang)} />
      <Seg
        options={["COREML_FP32", "XNNPACK_FP32"]}
        labels={["Core ML", "XNNPACK"]}
        value={backend}
        onChange={(v) => setBackend(v as Backend)}
      />
      <View style={s.row}>
        {VOICES[lang].map((v) => (
          <Chip key={v} label={v} on={v === voice} onPress={() => setVoice(v)} />
        ))}
      </View>
      <View style={s.row}>
        {[0.8, 1, 1.2].map((v) => (
          <Chip key={v} label={`${v}×`} on={v === speed} onPress={() => setSpeed(v)} />
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.meta}>
          {tts.error
            ? `Error: ${tts.error.message}`
            : tts.isReady
              ? `Voice ready · loaded in ${loadMs !== null ? sec(loadMs) : "…"}`
              : progress < 100
                ? `Downloading voice · ${progress}%`
                : "Preparing voice (first Core ML load can take ~15 s)…"}
        </Text>
        <TextInput style={s.input} multiline value={text} onChangeText={setText} />
        <View style={s.row}>
          <Btn label="Test passage" primary onPress={() => run(1)} disabled={!tts.isReady || !!busy} />
          <Btn label="Long test (×8)" onPress={() => run(8)} disabled={!tts.isReady || !!busy} />
          {lang === "EN" &&
            CHAPTERS.map((ch) => (
              <Btn key={ch} label={`Chapter test: ${ch}`} onPress={() => run(1, ch)} disabled={!tts.isReady || !!busy} />
            ))}
          {!!busy && <Btn label="Stop" onPress={() => tts.synthesizeStop?.()} />}
        </View>
        {!!busy && <Text style={s.meta}>{busy}</Text>}
      </View>

      {results.length > 0 && (
        <View style={s.card}>
          {results.map((r, i) => (
            <Text key={i} style={s.result}>
              {r}
            </Text>
          ))}
          <View style={s.row}>
            <Btn label="Copy results" primary onPress={() => Clipboard.setStringAsync(results.join("\n"))} />
            <Btn label="Stop audio" onPress={() => player.current?.pause()} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const Seg = ({
  options,
  labels,
  value,
  onChange,
}: {
  options: string[];
  labels?: string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <View style={s.modes}>
    {options.map((o, i) => (
      <Pressable key={o} style={[s.mode, o === value && s.modeOn]} onPress={() => onChange(o)}>
        <Text style={[s.modeText, o === value && { color: c.bg }]}>{labels?.[i] ?? o}</Text>
      </Pressable>
    ))}
  </View>
);

const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable style={[s.chip, on && s.modeOn]} onPress={onPress}>
    <Text style={[s.modeText, on && { color: c.bg }]}>{label}</Text>
  </Pressable>
);

const Btn = ({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) => (
  <Pressable style={[s.btn, primary && s.btnPrimary, disabled && { opacity: 0.4 }]} onPress={onPress} disabled={disabled}>
    <Text style={[s.btnText, primary && { color: c.bg }]}>{label}</Text>
  </Pressable>
);

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, padding: 16 },
  p: { color: c.dim, lineHeight: 20, marginBottom: 12 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14, gap: 10, marginTop: 4, marginBottom: 12 },
  meta: { color: c.dim, fontSize: 14 },
  result: { color: c.text, fontSize: 13, lineHeight: 19 },
  input: { backgroundColor: c.bg, color: c.text, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 140 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  modes: { flexDirection: "row", backgroundColor: c.panel, borderRadius: 10, padding: 3, marginBottom: 10 },
  mode: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  modeOn: { backgroundColor: c.gold },
  modeText: { color: c.dim, fontWeight: "600", fontSize: 13 },
  chip: { backgroundColor: c.panel, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  btn: { backgroundColor: c.raised, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  btnPrimary: { backgroundColor: c.gold },
  btnText: { color: c.text, fontWeight: "600" },
}));
