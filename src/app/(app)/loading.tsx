export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-[15px] text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
      Wird geladen …
    </div>
  );
}
