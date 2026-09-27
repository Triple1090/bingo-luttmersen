import type { GameVariant, VariantConfig } from '@/types/game';

export const VARIANTS: Record<GameVariant, VariantConfig> = {
  '90-ball': { name: '90-ball', label: '90 Kugeln', maxNumber: 90, cardsPerGame: 50 },
  '75-ball': { name: '75-ball', label: '75 Kugeln', maxNumber: 75, cardsPerGame: 50 },
  speedy: { name: 'speedy', label: 'Speedy', maxNumber: 30, cardsPerGame: 50, drawIntervalMs: 8000 },
};

export function getVariantLabel(variant: GameVariant): string {
  return VARIANTS[variant]?.label ?? variant;
}

export function getVariant(name: GameVariant): VariantConfig | undefined {
  return VARIANTS[name];
}
