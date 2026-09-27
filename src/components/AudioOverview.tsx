"use client";
import { useEffect, useRef, useState } from "react";

/** Reads a topic's overview script aloud with the browser's built-in voice (free, no API key). */
export function AudioOverview({ script, title }: { script: string; title: string }) {
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<string>("");
  const [current, setCurrent] = useState(-1);
  const paras = script.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const idx = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setSupported(false); return; }
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter((x) => x.lang.startsWith("en"));
      setVoices(v);
      setVoice((cur) => cur || v.find((x) => /en-GB|en-GH|en-NG/.test(x.lang))?.name || v[0]?.name || "");
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const speakFrom = (start: number) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    idx.current = start;
    const next = () => {
      if (idx.current >= paras.length) { setState("idle"); setCurrent(-1); return; }
      const u = new SpeechSynthesisUtterance(paras[idx.current]);
      u.rate = rate;
      const v = voices.find((x) => x.name === voice);
      if (v) u.voice = v;
      setCurrent(idx.current);
      u.onend = () => { idx.current += 1; next(); };
      synth.speak(u);
    };
    setState("playing");
    next();
  };

  if (!script.trim()) return <p className="muted text-sm">No audio overview for this topic yet.</p>;

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-medium">{title}</p>
        {!supported ? <span className="muted text-xs">Your browser can't read aloud. Use the transcript below.</span> : (
          <>
            {state === "idle" && <button className="btn" onClick={() => speakFrom(0)}>▶ Play</button>}
            {state === "playing" && <button className="btn" onClick={() => { window.speechSynthesis.pause(); setState("paused"); }}>❚❚ Pause</button>}
            {state === "paused" && <button className="btn" onClick={() => { window.speechSynthesis.resume(); setState("playing"); }}>▶ Resume</button>}
            {state !== "idle" && <button className="btn-ghost" onClick={() => { window.speechSynthesis.cancel(); setState("idle"); setCurrent(-1); }}>Stop</button>}
            <select className="input w-auto" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Speed">
              {[0.8, 1, 1.2, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
            {voices.length > 1 && (
              <select className="input w-auto max-w-[180px]" value={voice} onChange={(e) => setVoice(e.target.value)} aria-label="Voice">
                {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
            )}
          </>
        )}
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed">
        {paras.map((p, i) => (
          <p key={i}
            onClick={() => supported && speakFrom(i)}
            className={`cursor-pointer rounded-md p-2 transition ${current === i ? "bg-brand-50 dark:bg-brand-900/40" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
            {p}
          </p>
        ))}
      </div>
      <p className="muted mt-3 text-xs">Tap any paragraph to jump to it.</p>
    </div>
  );
}
