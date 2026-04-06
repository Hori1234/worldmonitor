/**
 * Radar Web Worker — fetches ALL radar states from the backend,
 * persists them to the local DB using the api.ts functions, then
 * signals the main thread with progress.
 *
 * DB writes use the existing Drizzle proxy which auto-selects:
 *   - sql.js (in-memory)  when running via `npm run dev`
 *   - Tauri SQLite plugin  when running as a desktop app
 *
 * Outbound messages (-> main thread):
 *   { type: 'worker-ready' }
 *   { type: 'radar-fetched',   id?, count, time }          — API call done
 *   { type: 'radar-persisted', id?, saved }                 — DB writes done
 *   { type: 'radar-error',     id?, phase, error }          — failure
 *
 * Inbound messages (<- main thread):
 *   { type: 'fetch-radar',   id, userId }
 *   { type: 'start-polling', id, userId, intervalMs }
 *   { type: 'stop-polling' }
 */

// Workers have no `window` — alias it so db/index.ts Tauri detection works
// (resolves isTauri = false -> falls through to sql.js in the browser)
if (typeof window === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).window = self;
}

import {
  AviationServiceClient,
  type RadarFlightState,
} from '@/generated/client/worldmonitor/aviation/v1/service_client';
import { upsertPlane, addPlanePosition } from '@/db/api';

// --- Worker-scoped gRPC-web client ---
const client = new AviationServiceClient('', {
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
});

// --- Inbound message types ---
interface FetchRadarMessage {
  type: 'fetch-radar';
  id: string;
  userId: string;
}

interface StartPollingMessage {
  type: 'start-polling';
  id: string;
  userId: string;
  intervalMs: number;
}

interface StopPollingMessage {
  type: 'stop-polling';
}

type WorkerInbound = FetchRadarMessage | StartPollingMessage | StopPollingMessage;

// --- State ---
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId = '';

// --- Core: fetch -> split across tables -> persist ---
async function fetchAndPersist(id?: string) {
  let states: RadarFlightState[] = [];

  // ── 1. FETCH from API (all states, no bounds) ──
  try {
    const response = await client.getOpenSkyRadar({});
    states = response.states ?? [];

    self.postMessage({
      type: 'radar-fetched',
      id,
      count: states.length,
      time: response.time,
    });
  } catch (error) {
    self.postMessage({ type: 'radar-error', id, phase: 'fetch', error: String(error) });
    return;
  }

  if (states.length === 0) {
    self.postMessage({ type: 'radar-persisted', id, saved: 0 });
    return;
  }

  // ── 2. PERSIST — split 17 proto fields across 2 tables via api.ts ──
  try {
    let saved = 0;

    for (const s of states) {
      if (!s.icao24) continue;

      // Table 1: openskyPlanes — aircraft metadata (icao24, callsign, originCountry)
      await upsertPlane(
        s.icao24,
        s.callsign?.trim() || null,
        s.originCountry,
        currentUserId,
      );

      // Table 2: openskyPlanePositions — telemetry (remaining 14 fields)
      await addPlanePosition({
        icao24:         s.icao24,
        timePosition:   s.timePosition   ?? null,
        lastContact:    s.lastContact,
        longitude:      s.longitude      ?? null,
        latitude:       s.latitude       ?? null,
        baroAltitude:   s.baroAltitude   ?? null,
        onGround:       s.onGround,
        velocity:       s.velocity       ?? null,
        trueTrack:      s.trueTrack      ?? null,
        verticalRate:   s.verticalRate   ?? null,
        sensors:        s.sensors        || null,
        geoAltitude:    s.geoAltitude    ?? null,
        squawk:         s.squawk         ?? null,
        spi:            s.spi,
        positionSource: s.positionSource,
        category:       s.category,
      });

      saved++;
    }

    self.postMessage({ type: 'radar-persisted', id, saved });
  } catch (error) {
    self.postMessage({ type: 'radar-error', id, phase: 'persist', error: String(error) });
  }
}

// --- Message handler ---
self.onmessage = async (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'fetch-radar':
      currentUserId = msg.userId;
      await fetchAndPersist(msg.id);
      break;

    case 'start-polling':
      currentUserId = msg.userId;
      if (pollingTimer) clearInterval(pollingTimer);
      await fetchAndPersist(msg.id);
      pollingTimer = setInterval(() => fetchAndPersist(), msg.intervalMs);
      break;

    case 'stop-polling':
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
      break;
  }
};

// Signal readiness
self.postMessage({ type: 'worker-ready' });