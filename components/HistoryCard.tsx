export default function HistoryCard() {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
      <div className="text-sm font-semibold">History</div>
      <div className="mt-3 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm opacity-70 dark:border-white/10 dark:bg-white/10">
        No local history yet (we’ll store it in your browser).
      </div>
    </section>
  );
}
