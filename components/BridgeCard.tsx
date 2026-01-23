"use client";

import { UI } from "@/lib/constants";

type Props = {
  title: string;
  subtitle: string;
  directionLabel: string;
  directionLeftLabel: string;
  directionRightLabel: string;
  directionLeftActive: boolean;
  directionRightActive: boolean;
  amount: string;
  onAmountChange: (v: string) => void;
  onMax: () => void;
  recipient: string;
  onRecipientChange: (v: string) => void;
  estimatedFee: string;
  canSend: boolean;
  sendLabel?: string;
  onSend: () => void;
};

export default function BridgeCard({
  title,
  subtitle,
  directionLabel,
  directionLeftLabel,
  directionRightLabel,
  directionLeftActive,
  directionRightActive,
  amount,
  onAmountChange,
  onMax,
  recipient,
  onRecipientChange,
  estimatedFee,
  canSend,
  sendLabel = UI.sendCta,
  onSend,
}: Props) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-black/50 dark:text-white/50">{UI.bridgeLabel}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-black dark:text-white">{title}</div>
          <div className="mt-2 text-sm text-black/60 dark:text-white/60">{subtitle}</div>
        </div>
        {/* UI Skeleton badge removed intentionally */}
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-medium text-black/50 dark:text-white/50">{directionLabel}</div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              className={[
                "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition",
                directionLeftActive
                  ? "bg-black text-white"
                  : "bg-transparent text-black/40 dark:text-white/40",
              ].join(" ")}
              disabled
            >
              {directionLeftLabel}
            </button>

            <button
              type="button"
              className={[
                "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition",
                directionRightActive
                  ? "bg-black text-white"
                  : "bg-transparent text-black/40 dark:text-white/40",
              ].join(" ")}
              disabled
            >
              {directionRightLabel}
            </button>
          </div>

          <div className="mt-2 text-xs text-black/50 dark:text-white/50">{UI.directionTip}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-medium text-black/50 dark:text-white/50">{UI.amountLabel}</div>
          <div className="mt-3 flex items-center gap-3">
            <input
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.0"
              className="h-11 flex-1 rounded-2xl border border-black/10 bg-white px-4 text-sm text-black shadow-sm outline-none placeholder:text-black/30 focus:ring-2 focus:ring-cyan-300 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
            />
            <button
              type="button"
              onClick={onMax}
              className="h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-black shadow-sm transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              {UI.maxLabel}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-medium text-black/50 dark:text-white/50">{UI.recipientLabel}</div>
          <input
            value={recipient}
            onChange={(e) => onRecipientChange(e.target.value)}
            placeholder={UI.recipientPlaceholder}
            className="mt-3 h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black shadow-sm outline-none placeholder:text-black/30 focus:ring-2 focus:ring-cyan-300 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
          />
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-medium text-black/50 dark:text-white/50">{UI.estimatedFeeLabel}</div>
          <div className="mt-3 text-sm font-semibold text-black dark:text-white">{estimatedFee || "—"}</div>
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className={[
            "mt-2 w-full rounded-2xl px-5 py-4 text-sm font-extrabold tracking-wide shadow-sm transition",
            canSend
              ? "bg-black text-white hover:bg-black/90"
              : "bg-black/20 text-black/50 dark:bg-white/10 dark:text-white/40",
          ].join(" ")}
        >
          {sendLabel}
        </button>

        {/* Next: wallet connect + fee quote + state machine + tx history. removed intentionally */}
      </div>
    </section>
  );
}
