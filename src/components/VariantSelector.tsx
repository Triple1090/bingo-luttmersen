import { VARIANTS } from '@/lib/variants';
import type { GameVariant } from '@/types/game';

interface VariantSelectorProps {
  readonly current: GameVariant;
  readonly onChange: (v: GameVariant) => void;
  readonly locked?: boolean;
}

export function VariantSelector({ current, onChange, locked }: VariantSelectorProps) {
  return (
    <select
      aria-label="Spielvariante"
      className="rounded-xl border-2 border-bingo-border bg-bingo-bg px-4 py-3 text-lg font-bold text-bingo-text"
      value={current}
      disabled={locked}
      onChange={(e) => onChange(e.target.value as GameVariant)}
    >
      {Object.values(VARIANTS).map((v) => (
        <option key={v.name} value={v.name}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
