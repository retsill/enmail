"use client";

export function ProgressDialog({ message }: { message: string }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center shadow-xl">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-accent">
          <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
        </svg>
        <p className="text-sm text-foreground">{message}</p>
      </div>
    </div>
  );
}
