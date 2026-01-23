export default function StatusCard() {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
      <div className="text-sm font-semibold">Bridge Status</div>

      <div className="mt-3 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/10">
        <div className="font-semibold">READY — waiting for input.</div>
        <div className="mt-2 text-xs opacity-70">
          Direction is automatic based on your network.
        </div>
      </div>
    </section>
  );
}
