"use client";
import { useState } from "react";
import type { Flashcard } from "@/lib/types";
import { supabase } from "@/lib/supabase-browser";

export function Flashcards({ cards }: { cards: Flashcard[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Record<number, boolean>>({});
  if (!cards.length) return <p className="muted text-sm">No flashcards for this topic yet.</p>;
  const card = cards[i];
  const mark = async (k: boolean) => {
    setKnown((m) => ({ ...m, [card.id]: k }));
    supabase().from("flashcard_reviews").upsert({ flashcard_id: card.id, known: k, reviewed_at: new Date().toISOString() }).then(() => {});
    setFlipped(false);
    setI((n) => Math.min(n + 1, cards.length - 1));
  };
  const knownCount = Object.values(known).filter(Boolean).length;
  return (
    <div>
      <div className="muted mb-2 flex justify-between text-xs">
        <span>Card {i + 1} of {cards.length}</span>
        <span>{knownCount} marked as known</span>
      </div>
      <button onClick={() => setFlipped((f) => !f)} className="flip block w-full text-left" aria-label={flipped ? "Show question" : "Reveal answer"}>
        <div className={`flip-inner relative grid min-h-[220px] ${flipped ? "is-flipped" : ""}`}>
          <div className="flip-face card col-start-1 row-start-1 flex flex-col justify-center p-8 text-center">
            <div className="eyebrow mb-3">Question</div>
            <div className="text-[20px] font-semibold leading-snug tracking-tight">{card.front}</div>
            <div className="muted mt-4 text-[13px]">Tap to reveal</div>
          </div>
          <div className="flip-face flip-back card col-start-1 row-start-1 flex flex-col justify-center p-8 text-center">
            <div className="eyebrow mb-3">Answer</div>
            <div className="text-[17px] leading-relaxed">{card.back}</div>
          </div>
        </div>
      </button>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${((i + 1) / cards.length) * 100}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost" disabled={i === 0} onClick={() => { setI(i - 1); setFlipped(false); }}>Previous</button>
        {flipped ? (
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => mark(false)}>Still learning</button>
            <button className="btn" onClick={() => mark(true)}>I knew it</button>
          </div>
        ) : <span />}
        <button className="btn-ghost" disabled={i === cards.length - 1} onClick={() => { setI(i + 1); setFlipped(false); }}>Next</button>
      </div>
    </div>
  );
}
