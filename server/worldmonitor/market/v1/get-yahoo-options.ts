import type {
  ServerContext,
  GetYahooOptionsRequest,
  GetYahooOptionsResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import yahooFinance from 'yahoo-finance2';

const REDIS_KEY = 'market:yahoo-options:v1';
const REDIS_TTL = 600; // 10 min

export async function getYahooOptions(
  _ctx: ServerContext,
  req: GetYahooOptionsRequest,
): Promise<GetYahooOptionsResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  if (!symbol) return { symbol: '', expirations: [], calls: [], puts: [] };

  const expParam = req.expiration?.trim() || undefined;
  const redisKey = `${REDIS_KEY}:${symbol}:${expParam || 'nearest'}`;

  try {
    const result = await cachedFetchJson<GetYahooOptionsResponse>(redisKey, REDIS_TTL, async () => {
      const opts: any = {};
      if (expParam) {
        // yahoo-finance2 expects a Date for date param
        const d = new Date(expParam);
        if (!isNaN(d.getTime())) opts.date = d;
      }

      const resp = await yahooFinance.options(symbol, opts);
      if (!resp) return null;

      const expirations = (resp.expirationDates ?? []).map((d: Date) => d.toISOString());

      const mapContract = (c: any, type: string) => ({
        contractSymbol: c.contractSymbol ?? '',
        strike: c.strike ?? 0,
        lastPrice: c.lastPrice ?? 0,
        bid: c.bid ?? 0,
        ask: c.ask ?? 0,
        volume: c.volume ?? 0,
        openInterest: c.openInterest ?? 0,
        impliedVolatility: c.impliedVolatility ?? 0,
        expiration: c.expiration ? new Date(c.expiration).getTime() : 0,
        type,
      });

      const calls = (resp.options?.[0]?.calls ?? []).map((c: any) => mapContract(c, 'call'));
      const puts = (resp.options?.[0]?.puts ?? []).map((c: any) => mapContract(c, 'put'));

      return { symbol, expirations, calls, puts };
    });

    return result ?? { symbol, expirations: [], calls: [], puts: [] };
  } catch (err) {
    console.warn(`[YahooOptions] ${symbol} error:`, (err as Error).message);
    return { symbol, expirations: [], calls: [], puts: [] };
  }
}