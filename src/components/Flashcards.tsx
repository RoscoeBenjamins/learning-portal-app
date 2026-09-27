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
      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[160px] w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/50"
        aria-label="Flip card"
      >
        <div>
          <div className="muted mb-2 text-xs uppercase tracking-wide">{flipped ? "Answer" : "Question"}</div>
          <div className="text-lg">{flipped ? card.back : card.front}</div>
          {!flipped && <div className="muted mt-3 text-xs">Tap to reveal</div>}
        </div>
      </button>
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
