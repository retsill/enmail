"use client";

import { useState } from "react";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉",
  "😊", "😇", "🥰", "😍", "😘", "😋", "😜", "🤗", "🤔", "😐",
  "😴", "😪", "🤤", "😷", "🤒", "😎", "🥳", "😢", "😭", "😡",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "👋", "🤙",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "🔥", "✨",
  "🎉", "🎂", "☕", "🍕", "🍺", "⚽", "📅", "✅", "❌", "⭐",
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
        title="Emoji"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
          <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="2.5" />
          <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="2.5" />
        </svg>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-9 left-0 z-50 w-64 rounded-xl border border-border bg-surface p-2 shadow-xl">
            <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    setOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-hover"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
