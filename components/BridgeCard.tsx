"use client";

import Image from "next/image";

const UI = {
  primaryCta: "SEND IT! 🚀",
} as const;

type Props = {
  directionLabel: string;
  directionHint: string;
  isUnsupported: boolean;
  onLinea: boolean;
  onBase: boolean;

  amount: string;
  onAmountChange: (v: string) => void;
  onMax: () => void;

  recipient: string;
  onRecipientChange: (v: string) => void;

  balanceLabel: string;
  capLabel?: string;

  showBalanceError: boolean;
  showCapError: boolean;

  estimatedFeeLabel: string;

  canSend: boolean;
  sendLabel?: string;
  onSend: () => void;
};

export default function BridgeCard({
  directionLabel,
  directionHint,
  isUnsupported,
  onLinea,
  onBase,

  amount,
  onAmountChange,
  onMax,

  recipient,
  onRecipientChange,

  balanceLabel,
  capLabel,

  showBalanceError,
  showCapError,

  estimatedFeeLabel,

  canSend,
  sendLabel = UI.primaryCta,
  onSend,
}: Props) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-black/60 dark:text-white/70">Bridge</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{directionLabel}</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">{directionHint}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {/* Direction display (no toggle; derived from chain) */}
        <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs text-black/60 dark:text-white/60">Direction (auto)</div>

          <div className="mt-2 flex items-center gap-1 rounded-2xl border border-black/10 bg-white/60 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            {/* Linea -> Base */}
            <button
              disabled
              className={[
                "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                onLinea
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white/50 text-black/35 dark:bg-white/5 dark:text-white/30",
              ].join(" ")}
              title="Direction is determined by your current network"
            >
              <Image src="/brands/linea/icon.png" alt="Linea" width={18} height={18} />
              <span>Linea → Base</span>
            </button>

            {/* Base -> Linea */}
            <button
              disabled
              className={[
                "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                onBase
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white/50 text-black/35 dark:bg-white/5 dark:text-white/30",
              ].join(" ")}
              title="Direction is determined by your current network"
            >
              <Image src="/brands/base/icon.jpeg" alt="Base" width={18} height={18} />
              <span>Base → Linea</span>
            </button>
          </div>

          {isUnsupported ? (
            <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
              Unsupported network. Please switch to <b>Linea</b> or <b>Base</b>.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs text-black/60 dark:text-white/60">Amount</div>

          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-black/40 focus:ring-2 focus:ring-cyan-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
              placeholder="0.0"
              disabled={isUnsupported}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
            />
            <button
              className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              disabled={isUnsupported}
              onClick={onMax}
              type="button"
            >
              Max
            </button>
          </div>

          <div className="mt-2 text-xs text-black/60 dark:text-white/60">
            Balance: <span className="font-semibold text-black/70 dark:text-white/70">{balanceLabel}</span>
            {capLabel ? (
              <>
                {" "}
                • Cap/tx: <span className="font-semibold text-black/70 dark:text-white/70">{capLabel}</span>
              </>
            ) : null}
          </div>

          {showBalanceError ? (
            <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">
              Amount exceeds your balance.
            </div>
          ) : null}

          {showCapError ? (
            <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">
              Amount exceeds Base cap per tx.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs text-black/60 dark:text-white/60">Recipient</div>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-black/40 focus:ring-2 focus:ring-cyan-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
            placeholder="0x… (default = your wallet)"
            disabled={isUnsupported}
            value={recipient}
            onChange={(e) => onRecipientChange(e.target.value)}
          />
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs text-black/60 dark:text-white/60">Estimated fee</div>
          <div className="mt-1 text-sm text-black/80 dark:text-white/80">{estimatedFeeLabel}</div>
        </div>

        <button
          className="rounded-3xl bg-black px-5 py-3 text-base font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
          disabled={!canSend}
          onClick={onSend}
          type="button"
        >
          {sendLabel}
        </button>
      </div>
    </section>
  );
}
