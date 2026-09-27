import { ThemeToggle } from '@/components/ThemeToggle';
import { getStatusLabel } from '@/lib/labels';
import type { RoomSummary } from '@/types/game';

interface GameSessionBarProps {
  readonly roomId: string;
  readonly rooms: readonly RoomSummary[];
  readonly onRoomChange: (roomId: string) => void;
  readonly variant: string;
  readonly drawnCount: number;
  readonly status: 'waiting' | 'in-play' | 'complete';
}

export function GameSessionBar({ roomId, rooms, onRoomChange, variant, drawnCount, status }: GameSessionBarProps) {
  return (
    <header className="game-session-bar">
      <label className="game-session-room">
        <span>Raum</span>
        <select value={roomId} onChange={(event) => onRoomChange(event.target.value)}>
          {rooms.map((room) => <option key={room.sessionId} value={room.sessionId}>{room.roomName}</option>)}
        </select>
      </label>
      <span>Variante: {variant}</span>
      <span>Gezogen: {drawnCount}</span>
      <span className="text-bingo-accent">{getStatusLabel(status)}</span>
      <ThemeToggle />
    </header>
  );
}
