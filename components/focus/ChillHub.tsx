/* eslint-disable react-hooks/purity */
"use client";

import * as React from "react";
import { Volume2, VolumeX, Waves, CloudRain, Coffee, Trees, Wind, Music } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { nextActiveId } from "@/lib/chill";

// Minimal slider component if not exists, fallback to input range
function SimpleSlider({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      disabled={disabled}
      className="h-1 w-full accent-brand-royal"
    />
  );
}

type AmbientId = "brown" | "rain" | "cafe" | "forest" | "white" | "lofi";

interface Ambient {
  id: AmbientId;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const AMBIENTS: Ambient[] = [
  { id: "brown", name: "Brown Noise", description: "Deep focus — CC0 generated", icon: Waves, color: "text-amber-700 bg-amber-50" },
  { id: "rain", name: "Rain", description: "Gentle rain — procedural", icon: CloudRain, color: "text-sky-700 bg-sky-50" },
  { id: "cafe", name: "Café", description: "Soft chatter — generated", icon: Coffee, color: "text-orange-700 bg-orange-50" },
  { id: "forest", name: "Forest", description: "Birds & breeze — synthesis", icon: Trees, color: "text-emerald-700 bg-emerald-50" },
  { id: "white", name: "White Noise", description: "Clean hush — generated", icon: Wind, color: "text-gray-700 bg-gray-50" },
  { id: "lofi", name: "Lo-fi", description: "Warm crackle — procedural", icon: Music, color: "text-purple-700 bg-purple-50" },
];

const VOLUME_KEY = "studenthub.chillhub.volume";

export function ChillHub() {
  const audioRef = React.useRef<AudioContext | null>(null);
  const nodesRef = React.useRef<Map<AmbientId, { gain: GainNode; source?: AudioBufferSourceNode; oscillators: OscillatorNode[] }>>(new Map());
  // Single-track rule: at most one ambient is active. nodesRef is the audio truth,
  // activeId is the UI truth, activeRef avoids stale closures on rapid clicks.
  const [activeId, setActiveId] = React.useState<AmbientId | null>(null);
  const activeRef = React.useRef<AmbientId | null>(null);
  const genRef = React.useRef(0);
  const [volume, setVolume] = React.useState<Record<AmbientId, number>>({
    brown: 60,
    rain: 50,
    cafe: 40,
    forest: 45,
    white: 30,
    lofi: 40,
  });

  // Restore saved volumes after mount (reading localStorage during render would mismatch the SSR HTML).
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? "null") as Partial<Record<AmbientId, number>> | null;
      if (!saved) return;
      const valid = Object.fromEntries(
        Object.entries(saved).filter(([k, v]) => AMBIENTS.some((a) => a.id === k) && typeof v === "number" && v >= 0 && v <= 100)
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
      setVolume((prev) => ({ ...prev, ...valid }));
    } catch {
      // Storage blocked or corrupt: keep defaults.
    }
  }, []);

  const ensureContext = () => {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioRef.current.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  };

  const createBrownNoise = (ctx: AudioContext): AudioBufferSourceNode => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = lastOut * 0.99 + white * 0.01;
      data[i] = lastOut * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  };

  const setActive = (id: AmbientId | null) => {
    activeRef.current = id;
    setActiveId(id);
  };

  const stopAll = (ctx: AudioContext | null) => {
    // Bump generation so pending forest chirps / delayed disconnects become no-ops.
    genRef.current += 1;
    const nodes = Array.from(nodesRef.current.values());
    nodesRef.current.clear();
    for (const node of nodes) {
      try {
        if (ctx) {
          try {
            node.gain.gain.cancelScheduledValues(ctx.currentTime);
          } catch {}
          node.gain.gain.setValueAtTime(node.gain.gain.value, ctx.currentTime);
          node.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        }
      } catch {}
      const gen = genRef.current;
      setTimeout(() => {
        if (gen !== genRef.current) return;
        node.oscillators.forEach((o) => { try { o.stop(); } catch {} });
        try { node.source?.stop(); } catch {}
        try { node.source?.disconnect(); } catch {}
        try { node.gain.disconnect(); } catch {}
      }, 200);
    }
  };

  const toggle = (id: AmbientId) => {
    const ctx = ensureContext();
    const next = nextActiveId(activeRef.current, id);
    // Always stop everything first — single write, no stale-merge of booleans.
    stopAll(ctx);
    if (next === null) {
      setActive(null);
      return;
    }

    const gain = ctx.createGain();
    gain.gain.value = (volume[id] / 100) * 0.3;
    gain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    let source: AudioBufferSourceNode | undefined;

    if (id === "brown" || id === "white" || id === "rain") {
      source = createBrownNoise(ctx);
      if (id === "rain") {
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1200;
        filter.Q.value = 0.7;
        source.connect(filter);
        filter.connect(gain);
      } else if (id === "white") {
        source.connect(gain);
      } else {
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;
        source.connect(filter);
        filter.connect(gain);
      }
      source.start();
    } else if (id === "cafe") {
      source = createBrownNoise(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;
      source.connect(filter);
      filter.connect(gain);
      source.start();
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 180 + Math.random() * 40;
        const g = ctx.createGain();
        g.gain.value = 0.02;
        osc.connect(g);
        g.connect(gain);
        osc.start();
        oscillators.push(osc);
      }
    } else if (id === "forest") {
      source = createBrownNoise(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1500;
      source.connect(filter);
      filter.connect(gain);
      source.start();
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 2000 + Math.random() * 1000;
        const g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(g);
        g.connect(gain);
        osc.start();
        const gen = genRef.current;
        const chirp = () => {
          if (gen !== genRef.current || !nodesRef.current.has(id)) return;
          try {
            const now = ctx.currentTime;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.08, now + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.frequency.setValueAtTime(1800 + Math.random() * 1200, now);
          } catch {
            return;
          }
          setTimeout(chirp, 3000 + Math.random() * 5000);
        };
        setTimeout(chirp, 1000 + Math.random() * 2000);
        oscillators.push(osc);
      }
    } else if (id === "lofi") {
      source = createBrownNoise(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      source.connect(lp);
      lp.connect(gain);
      source.start();
      const crack = ctx.createOscillator();
      crack.type = "square";
      crack.frequency.value = 12;
      const cg = ctx.createGain();
      cg.gain.value = 0.015;
      crack.connect(cg);
      cg.connect(gain);
      crack.start();
      oscillators.push(crack);
    }

    nodesRef.current.set(id, { gain, source, oscillators });
    setActive(id);
  };

  const handleVolume = (id: AmbientId, v: number) => {
    setVolume((prev) => {
      const next = { ...prev, [id]: v };
      try {
        localStorage.setItem(VOLUME_KEY, JSON.stringify(next));
      } catch {
        // Storage blocked: volume still applies for this session.
      }
      return next;
    });
    const node = nodesRef.current.get(id);
    if (node && audioRef.current) {
      node.gain.gain.setValueAtTime((v / 100) * 0.3, audioRef.current.currentTime);
    }
  };

  React.useEffect(() => {
    const nodes = nodesRef.current;
    return () => {
      genRef.current += 1;
      activeRef.current = null;
      nodes.forEach((n) => {
        try { n.source?.stop(); } catch {}
        n.oscillators.forEach((o) => { try { o.stop(); } catch {} });
      });
      nodes.clear();
      try {
        audioRef.current?.close();
      } catch {}
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Music className="h-4 w-4 text-brand-royal" /> Chill Hub
          <span className="ml-auto text-xs font-normal text-gray-400">Legally generated • CC0 • No copyrighted music</span>
        </CardTitle>
        <p className="text-xs text-gray-500">Procedurally generated ambient audio — safe for study, no external tracks. Only one sound plays at a time.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AMBIENTS.map((a) => {
            const isOn = activeId === a.id;
            const Icon = a.icon;
            return (
              <div key={a.id} className={`rounded-lg border p-3 ${isOn ? "border-brand-royal bg-brand-royal/[0.03]" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${a.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-dark">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.description}</p>
                  </div>
                  <Button
                    variant={isOn ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggle(a.id)}
                    className="h-8 w-8 p-0"
                    aria-label={isOn ? `Stop ${a.name}` : `Play ${a.name}`}
                  >
                    {isOn ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400">Vol</span>
                  <div className="flex-1">
                    <SimpleSlider value={volume[a.id]} onChange={(v) => handleVolume(a.id, v)} disabled={!isOn} />
                  </div>
                  <span className="w-8 text-right text-xs text-gray-500">{volume[a.id]}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          All sounds are synthesized in-browser via Web Audio API — no copyrighted samples, 100% legal for focus.
        </p>
      </CardContent>
    </Card>
  );
}
