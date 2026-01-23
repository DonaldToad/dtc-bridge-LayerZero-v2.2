export default function ConsoleCard() {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
      <div className="text-sm font-semibold">Console Log</div>

      {/* Light: normal, Dark: black box + bold white text */}
      <div className="mt-3 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black dark:border-white/10 dark:bg-black dark:text-white">
        <ul className="list-disc space-y-2 pl-5 font-normal dark:font-bold">
          <li>App loaded</li>
          <li>Waiting for wallet connection</li>
          <li>Direction auto-selected from network</li>
        </ul>
      </div>
    </section>
  );
}
