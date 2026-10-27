"use client";

/** Absende-Button mit Rückfrage – nur für seltene, nicht umkehrbare Aktionen (HIG Alerts). */
export function ConfirmButton({ message, children, className }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
