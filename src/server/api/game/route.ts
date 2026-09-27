import { NextRequest, NextResponse } from 'next/server';
import WebSocket, { type RawData } from 'ws';
import { VARIANTS } from '@/lib/variants';
import { verifyBingoNumbers } from '@/lib/bingoClaim';
import { normalizeRoomId } from '@/lib/gameRoom';
import type { GameState, GameVariant, RoomSummary } from '@/types/game';

const WS_URL = process.env.GAME_SERVER_WS_URL || 'ws://localhost:3001';

function parseGameState(data: RawData): GameState {
  return JSON.parse(parseResponseText(data)) as GameState;
}

function parseResponseText(data: RawData): string {
  let text: string;
  if (Array.isArray(data)) {
    text = Buffer.concat(data).toString();
  } else if (data instanceof ArrayBuffer) {
    text = Buffer.from(data).toString();
  } else {
    text = data.toString();
  }
  return text;
}

function requestGameState(
  message: {
    action: 'create-session' | 'draw' | 'call-number' | 'reset' | 'change-variant' | 'verify-bingo' | 'ping';
    sessionId?: string;
    roomName?: string;
    variant?: GameVariant;
    number?: number;
    claimedNumbers?: number[];
  },
): Promise<GameState> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(WS_URL);

    socket.once('open', () => socket.send(JSON.stringify(message)));
    socket.on('message', (data) => {
      const gameState = parseGameState(data);
      socket.close();
      resolve(gameState);
    });
    socket.once('error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

function requestSessions(): Promise<RoomSummary[]> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(WS_URL);

    socket.once('open', () => socket.send(JSON.stringify({ action: 'list-sessions' })));
    socket.on('message', (data) => {
      const response = JSON.parse(parseResponseText(data)) as { sessions?: unknown };
      socket.close();
      if (Array.isArray(response.sessions)) {
        resolve(response.sessions as RoomSummary[]);
        return;
      }
      reject(new Error('Invalid game service session list'));
    });
    socket.once('error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

// POST /api/game — Handles draw and reset actions
export async function POST(req: NextRequest) {
  let body: {
    action: 'create-session' | 'draw' | 'call-number' | 'reset' | 'change-variant' | 'verify-bingo';
    sessionId?: string;
    roomName?: string;
    variant?: GameVariant;
    number?: number;
    claimedNumbers?: number[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Anfrage-Body (kein gültiges JSON)' }, { status: 400 });
  }

  const { action, roomName, variant, number, claimedNumbers } = body;
  const sessionId = normalizeRoomId(body.sessionId);

  if (!['create-session', 'draw', 'call-number', 'reset', 'change-variant', 'verify-bingo'].includes(action)) {
    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  }
  if (action === 'change-variant' && (!variant || !VARIANTS[variant])) {
    return NextResponse.json({ error: 'Unbekannte Spielvariante' }, { status: 400 });
  }

  try {
    if (action === 'call-number') {
      const currentState = await requestGameState({ action: 'ping', sessionId });
      const maxNumber = VARIANTS[currentState.variant].maxNumber;
      if (
        typeof number !== 'number'
        || !Number.isInteger(number)
        || number < 1
        || number > maxNumber
      ) {
        return NextResponse.json(
          { error: `Gib eine ganze Zahl von 1 bis ${maxNumber} ein` },
          { status: 400 },
        );
      }
      if (currentState.drawnNumbers.includes(number)) {
        return NextResponse.json({ error: 'Diese Zahl wurde bereits aufgerufen' }, { status: 400 });
      }
    }

    if (action === 'verify-bingo') {
      const currentState = await requestGameState({ action: 'ping', sessionId });
      const verification = verifyBingoNumbers(
        Array.isArray(claimedNumbers) ? claimedNumbers : [],
        currentState.drawnNumbers,
        currentState.variant,
      );
      if (!verification.isVerified) {
        return NextResponse.json({ error: 'Die gemeldete Reihe kann nicht bestätigt werden' }, { status: 400 });
      }
    }

    const gameState = await requestGameState({ action, sessionId, roomName, variant, number, claimedNumbers });
    return NextResponse.json({ gameState });
  } catch {
    return NextResponse.json({ error: 'Der Spieldienst ist gerade nicht erreichbar' }, { status: 503 });
  }
}

// GET /api/game — Get current game state
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('rooms') === 'true') {
    try {
      const sessions = await requestSessions();
      return NextResponse.json({ sessions });
    } catch {
      return NextResponse.json({ error: 'Der Spieldienst ist gerade nicht erreichbar' }, { status: 503 });
    }
  }

  const sessionId = normalizeRoomId(req.nextUrl.searchParams.get('sessionId'));
  try {
    const gameState = await requestGameState({ action: 'ping', sessionId });
    return NextResponse.json({ gameState });
  } catch {
    return NextResponse.json({ error: 'Der Spieldienst ist gerade nicht erreichbar' }, { status: 503 });
  }
}
