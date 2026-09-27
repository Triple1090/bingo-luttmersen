'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameSession } from '@/lib/useGameSession';
import { RecentCalls } from '@/components/RecentCalls';
import { VariantSelector } from '@/components/VariantSelector';
import { VARIANTS, getVariantLabel } from '@/lib/variants';
import { verifyBingoClaim, type BingoClaimResult } from '@/lib/bingoClaim';
import { normalizeRoomId } from '@/lib/gameRoom';
import type { GameState, GameVariant, RoomSummary } from '@/types/game';
import { getWebSocketUrl } from '@/lib/websocketUrl';

const WS_URL = getWebSocketUrl();

function AdminPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = normalizeRoomId(searchParams.get('room'));
  const [variant, setVariant] = useState<GameVariant>('90-ball');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [claimNumbers, setClaimNumbers] = useState(['', '', '', '', '']);
  const [claimResult, setClaimResult] = useState<BingoClaimResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const { drawNumber, callNumber, resetGame, changeVariant, state } = useGameSession(WS_URL, roomId);
  const maxNumber = VARIANTS[state?.variant ?? variant].maxNumber;

  useEffect(() => {
    setVariant('90-ball');
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/game?rooms=true');
        if (!response.ok) return;
        const result = (await response.json()) as { sessions?: RoomSummary[] };
        if (Array.isArray(result.sessions)) setRooms(result.sessions);
      } catch {
        // The active room remains available while the directory is unavailable.
      }
    };
    void loadRooms();
  }, [roomId]);

  useEffect(() => {
    if (state) setVariant(state.variant);
  }, [state]);

  const handleCreateRoom = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-session', roomName: newRoomName }),
      });
      if (!response.ok) throw new Error('Der Raum konnte nicht erstellt werden');
      const result = (await response.json()) as { gameState: GameState };
      setRooms((currentRooms) => [
        ...currentRooms.filter((room) => room.sessionId !== result.gameState.sessionId),
        {
          sessionId: result.gameState.sessionId,
          roomName: result.gameState.roomName,
          variant: result.gameState.variant,
          drawnCount: result.gameState.drawnNumbers.length,
          status: result.gameState.status,
        },
      ].sort((first, second) => first.roomName.localeCompare(second.roomName)));
      setNewRoomName('');
      router.push(`/admin-panel?room=${encodeURIComponent(result.gameState.sessionId)}`);
    } catch (createError) {
      setServiceError(createError instanceof Error ? createError.message : 'Der Raum konnte nicht erstellt werden');
    }
  };

  const handleVariantChange = async (newVariant: GameVariant) => {
    setServiceError(null);
    try {
      await changeVariant(newVariant);
      setVariant(newVariant);
    } catch (variantError) {
      setServiceError(variantError instanceof Error ? variantError.message : 'Die Spielvariante konnte nicht geändert werden');
    }
  };

  const handleDrawNumber = async () => {
    setServiceError(null);
    try {
      await drawNumber();
    } catch (drawError) {
      setServiceError(drawError instanceof Error ? drawError.message : 'Es konnte keine Zahl gezogen werden');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Spiel wirklich zurücksetzen? Alle gezogenen Zahlen dieses Raums gehen dabei verloren.')) {
      return;
    }
    setServiceError(null);
    try {
      await resetGame();
    } catch (resetError) {
      setServiceError(resetError instanceof Error ? resetError.message : 'Das Spiel konnte nicht zurückgesetzt werden');
    }
  };

  const handleManualCall = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await callNumber(Number(manualNumber));
      setManualNumber('');
    } catch (callError) {
      const message = callError instanceof Error ? callError.message : 'Diese Zahl konnte nicht aufgerufen werden';
      setError(message);
      setServiceError(message);
    }
  };

  const handleClaimVerification = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClaimError(null);
    const verification = verifyBingoClaim(claimNumbers.join(','), state?.drawnNumbers ?? [], state?.variant ?? variant);
    if (!verification.isVerified) {
      setClaimResult(verification);
      return;
    }

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-bingo', sessionId: roomId, claimedNumbers: verification.claimedNumbers }),
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? 'Der Bingo-Ruf konnte nicht geprüft werden');
      }
      setClaimResult(verification);
    } catch (verificationError) {
      const message = verificationError instanceof Error ? verificationError.message : 'Der Bingo-Ruf konnte nicht geprüft werden';
      setClaimResult(null);
      setClaimError(message);
      setServiceError(message);
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isVerifyDialogOpen) {
      setIsVerifyDialogOpen(false);
      return;
    }

    // Ignore if user is typing in an input/select
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

    if (e.code === 'Space') {
      e.preventDefault(); // Prevent page scroll
      void handleDrawNumber();
    } else if (e.key === 'r' || e.key === 'R') {
      void handleReset();
    }
  }, [handleDrawNumber, handleReset, isVerifyDialogOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-bingo-bg p-8 text-2xl">
      {serviceError && (
        <div role="alert" className="fixed right-4 top-4 z-50 flex max-w-md items-start gap-3 rounded-lg border-2 border-bingo-danger bg-bingo-surface p-4 text-lg text-bingo-text shadow-2xl">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-bingo-danger" aria-hidden="true" />
          <p className="font-bold">{serviceError}</p>
          <button
            type="button"
            onClick={() => setServiceError(null)}
            title="Hinweis schließen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-bingo-muted text-bingo-text hover:border-bingo-accent hover:text-bingo-accent"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Hinweis schließen</span>
          </button>
        </div>
      )}
      <h1 className="mb-8 heading-lg font-bold text-bingo-text">Admin-Panel</h1>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <label htmlFor="room-id" className="font-bold text-bingo-text">Aktiver Raum</label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              id="room-id"
              value={roomId}
              onChange={(event) => router.push(`/admin-panel?room=${encodeURIComponent(event.target.value)}`)}
              className="w-56 rounded border-2 border-bingo-muted bg-bingo-surface px-4 py-3 text-xl font-bold text-bingo-text"
            >
              {(rooms.some((room) => room.sessionId === roomId) ? rooms : [{ sessionId: roomId, roomName: roomId, variant, drawnCount: 0, status: 'waiting' as const }, ...rooms]).map((room) => (
                <option key={room.sessionId} value={room.sessionId}>{room.roomName} – {getVariantLabel(room.variant)}, {room.drawnCount} gezogen</option>
              ))}
            </select>
            <a
              href={`/game-room?room=${encodeURIComponent(roomId)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border-2 border-bingo-muted px-5 py-3 text-lg font-bold text-bingo-text hover:border-bingo-accent hover:text-bingo-accent"
            >
              Spielraum öffnen
            </a>
          </div>
          <form onSubmit={handleCreateRoom} className="flex flex-wrap items-center gap-3">
            <label htmlFor="new-room-name" className="font-bold text-bingo-text">Neuer Raum</label>
            <input id="new-room-name" type="text" value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} maxLength={40} className="w-56 rounded border-2 border-bingo-muted bg-bingo-surface px-4 py-3 text-xl font-bold text-bingo-text" required />
            <button type="submit" className="rounded-lg bg-bingo-accent px-5 py-3 text-lg font-bold text-bingo-bg hover:opacity-90">Raum erstellen</button>
          </form>
        </section>
        <RecentCalls drawnNumbers={state?.drawnNumbers ?? []} />
        <VariantSelector current={variant} onChange={handleVariantChange} />
        <form onSubmit={handleManualCall} className="flex flex-col gap-3">
          <label htmlFor="manual-number" className="font-bold text-bingo-text">
            Bestimmte Zahl aufrufen (1–{maxNumber})
          </label>
          <div className="flex gap-3">
            <input
              id="manual-number"
              type="number"
              min="1"
              max={maxNumber}
              step="1"
              value={manualNumber}
              onChange={(event) => setManualNumber(event.target.value)}
              className="w-40 rounded border-2 border-bingo-muted bg-bingo-surface px-4 py-3 text-3xl font-bold text-bingo-text"
              required
            />
            <button
              type="submit"
              className="rounded-xl border-2 border-bingo-accent px-6 py-3 text-xl font-bold text-bingo-accent hover:bg-bingo-accent hover:text-bingo-bg"
            >
              Zahl aufrufen
            </button>
          </div>
          {error && <p role="alert" className="text-lg font-bold text-bingo-danger">{error}</p>}
        </form>
        <button
          type="button"
          onClick={handleDrawNumber}
          className="rounded-xl bg-bingo-accent px-8 py-4 text-3xl font-bold text-bingo-bg hover:opacity-90"
        >
          Zahl ziehen
        </button>
        <button
          type="button"
          onClick={() => setIsVerifyDialogOpen(true)}
          className="rounded-lg border-2 border-bingo-success px-6 py-3 text-xl font-bold text-bingo-success hover:bg-bingo-success hover:text-bingo-bg"
        >
          Bingo prüfen
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border-2 border-bingo-muted px-6 py-2 text-lg text-bingo-text hover:border-bingo-accent hover:text-bingo-accent"
        >
          Spiel zurücksetzen
        </button>
        <p className="text-sm text-bingo-muted">
          Tastatur: <kbd className="rounded bg-bingo-surface px-1.5 py-0.5 font-mono text-base">Leertaste</kbd> = Ziehen,{' '}
          <kbd className="rounded bg-bingo-surface px-1.5 py-0.5 font-mono text-base">R</kbd> = Zurücksetzen
        </p>
      </div>
      {isVerifyDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-bingo-title"
            aria-describedby="verify-bingo-description"
            className="w-full max-w-2xl rounded-lg border-2 border-bingo-muted bg-bingo-surface p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="verify-bingo-title" className="text-3xl font-bold text-bingo-text">Bingo-Gewinn prüfen</h2>
                <p id="verify-bingo-description" className="mt-1 text-lg text-bingo-muted">Gib die fünf Zahlen der gemeldeten Gewinnreihe ein.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyDialogOpen(false)}
                title="Prüfdialog schließen"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-bingo-muted text-bingo-text hover:border-bingo-accent hover:text-bingo-accent"
              >
                <X className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Schließen</span>
              </button>
            </div>
            <form onSubmit={handleClaimVerification} className="flex flex-col gap-4">
              <fieldset>
                <legend className="mb-2 font-bold text-bingo-text">Zahlen der Gewinnreihe</legend>
                <div className="grid grid-cols-5 gap-3">
                  {claimNumbers.map((number, index) => (
                    <input
                      key={index}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={maxNumber}
                      step="1"
                      autoFocus={index === 0}
                      value={number}
                      onChange={(event) => {
                        setClaimNumbers((numbers) => numbers.map((value, numberIndex) => (
                          numberIndex === index ? event.target.value : value
                        )));
                        setClaimResult(null);
                        setClaimError(null);
                      }}
                      aria-label={`Zahl ${index + 1} der Gewinnreihe`}
                      className="min-w-0 rounded-lg border-2 border-bingo-muted bg-bingo-bg px-2 py-3 text-center text-xl font-bold text-bingo-text"
                      required
                    />
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVerifyDialogOpen(false)}
                  className="rounded-lg border-2 border-bingo-muted px-6 py-3 text-xl font-bold text-bingo-text hover:border-bingo-accent hover:text-bingo-accent"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-bingo-success px-6 py-3 text-xl font-bold text-bingo-bg hover:opacity-90"
                >
                  Bingo prüfen
                </button>
              </div>
              {claimResult && (
                <div
                  role="status"
                  className={claimResult.isVerified ? 'border-l-4 border-bingo-success bg-bingo-success/15 p-3 text-bingo-text' : 'border-l-4 border-bingo-danger bg-bingo-danger/10 p-3 text-bingo-text'}
                >
                  {claimResult.isVerified ? (
                    <p className="font-bold text-bingo-success">Bingo bestätigt. Alle Zahlen dieser Reihe wurden aufgerufen.</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-bold text-bingo-danger">Dieser Bingo-Ruf kann noch nicht bestätigt werden.</p>
                      {claimResult.claimedNumbers.length !== 5 && <p>Gib genau fünf Zahlen einer Gewinnreihe ein.</p>}
                      {claimResult.invalidNumbers.length > 0 && <p>Ungültige oder doppelte Zahlen: {claimResult.invalidNumbers.join(', ')}.</p>}
                      {claimResult.missingNumbers.length > 0 && <p>Nicht aufgerufen: {claimResult.missingNumbers.join(', ')}.</p>}
                    </div>
                  )}
                </div>
              )}
              {claimError && <p role="alert" className="font-bold text-bingo-danger">{claimError}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanelPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-bingo-bg" />}>
      <AdminPanel />
    </Suspense>
  );
}
