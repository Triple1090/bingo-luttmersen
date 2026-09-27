import type { GameState } from '@/types/game';

const STATUS_LABELS: Record<GameState['status'], string> = {
  waiting: 'Wartet',
  'in-play': 'Läuft',
  complete: 'Beendet',
};

export function getStatusLabel(status: GameState['status']): string {
  return STATUS_LABELS[status];
}
