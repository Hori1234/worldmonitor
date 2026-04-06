import type {
  ServerContext,
  GetYahooHistoryRequest,
  GetYahooHistoryResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import { UPSTREAM_TIMEOUT_MS } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';

const REDIS_KEY = 'market:yahoo-history:v1';

const VALID_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y', 'max']);
const VALID_INTERVALS = new Set(['1d', '1wk', '1mo']);

const RANGE_TO_TTL: Record<string, number> = {
  '1d': 300, '5d': 600, '1mo': 1800, '3mo': 3600,
  '6mo': 3600, '1y': 7200, '5y': 86400, 'max': 86400,
};

export async function getYahooHistory(
  _ctx: ServerContext,
  req: GetYahooHistoryRequest,
): Promise<GetYahooHistoryResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  const range = VALID_RANGES.has(req.range) ? req.range : '3mo';
  const interval = VALID_INTERVALS.has(req.interval) ? req.interval : '1d';
  const ttl = RANGE_TO_TTL[range] ?? 1800;

  if (!symbol) return { symbol: '', candles: [] };

  const redisKey = `${REDIS_KEY}:${symbol}:${range}:${interval}`;

  try {
    const result = await cachedFetchJson<GetYahooHistoryResponse>(redisKey, ttl, async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!resp.ok) return null;

      const data = await resp.json() as any;
      const r = data?.chart?.result?.[0];
      if (!r) return null;

      const timestamps: number[] = r.timestamp ?? [];
      const quote = r.indicators?.quote?.[0] ?? {};
      const adjClose = r.indicators?.adjclose?.[0]?.adjclose ?? [];

      const candles = timestamps.map((ts: number, i: number) => ({
        date: ts * 1000,
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0,
        adjClose: adjClose[i] ?? quote.close?.[i] ?? 0,
      })).filter(c => c.close !== 0);

      return candles.length > 0 ? { symbol, candles } : null;
    });

    return result ?? { symbol, candles: [] };
  } catch (err) {
    console.warn(`[YahooHistory] ${symbol} error:`, (err as Error).message);
    return { symbol, candles: [] };
  }
}