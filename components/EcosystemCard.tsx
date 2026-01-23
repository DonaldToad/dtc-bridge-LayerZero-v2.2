import Image from "next/image";

export default function EcosystemCard() {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-black/70">
        Ecosystem
      </div>

      <div className="space-y-3">
        {/* Donald Toad Coin */}
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
          <Image
            src="/brands/dtc/donald-toad.png"
            alt="Donald Toad Coin"
            width={32}
            height={32}
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Donald Toad Coin</div>
            <div className="text-xs text-black/60">donaldtoad.com</div>
          </div>
        </div>

        {/* Linea */}
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
          <Image
            src="/brands/linea/icon.png"
            alt="Linea"
            width={28}
            height={28}
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Linea</div>
            <div className="text-xs text-black/60">linea.build</div>
          </div>
        </div>

        {/* Base */}
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
          <Image
            src="/brands/base/icon.jpeg"
            alt="Base"
            width={28}
            height={28}
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Base</div>
            <div className="text-xs text-black/60">base.org</div>
          </div>
        </div>

        {/* LayerZero — UPDATED LOGO */}
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
          <Image
            src="/brands/layerzero/LayerZero_emblem.svg"
            alt="LayerZero"
            width={28}
            height={28}
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">LayerZero</div>
            <div className="text-xs text-black/60">layerzero.network</div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-black/50">
        Tip: the bridge direction is automatic. Switch network to change direction.
      </div>
    </div>
  );
}
