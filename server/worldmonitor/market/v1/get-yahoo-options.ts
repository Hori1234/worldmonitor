import type {
  ServerContext,
  GetYahooOptionsRequest,
  GetYahooOptionsResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import { UPSTREAM_TIMEOUT_MS } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';

const REDIS_KEY = 'market:yahoo-options:v1';
const REDIS_TTL = 600;

export async function getYahooOptions(
  _ctx: ServerContext,
  req: GetYahooOptionsRequest,
): Promise<GetYahooOptionsResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  if (!symbol) return { symbol: '', expirations: [], calls: [], puts: [] };

  const expParam = req.expiration?.trim() || '';
  const redisKey = `${REDIS_KEY}:${symbol}:${expParam || 'nearest'}`;

  try {
    const result = await cachedFetchJson<GetYahooOptionsResponse>(redisKey, REDIS_TTL, async () => {
      let url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
      if (expParam) {
        const d = new Date(expParam);
        if (!isNaN(d.getTime())) {
          url += `?date=${Math.floor(d.getTime() / 1000)}`;
        }
      }

      const resp = await fetch(url, {
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!resp.ok) return null;

      const data = await resp.json() as any;
      const chain = data?.optionChain?.result?.[0];
      if (!chain) return null;

      const expirations = (chain.expirationDates ?? []).map((epoch: number) =>
        new Date(epoch * 1000).toISOString(),
      );

      const mapContract = (c: any, type: string) => ({
        contractSymbol: c.contractSymbol ?? '',
        strike: c.strike ?? 0,
        lastPrice: c.lastPrice ?? 0,
        bid: c.bid ?? 0,
        ask: c.ask ?? 0,
        volume: c.volume ?? 0,
        openInterest: c.openInterest ?? 0,
        impliedVolatility: c.impliedVolatility ?? 0,
        expiration: (c.expiration ?? 0) * 1000,
        type,
      });

      const options = chain.options?.[0] ?? {};
      const calls = (options.calls ?? []).map((c: any) => mapContract(c, 'call'));
      const puts = (options.puts ?? []).map((c: any) => mapContract(c, 'put'));

      return { symbol, expirations, calls, puts };
    });

    return result ?? { symbol, expirations: [], calls: [], puts: [] };
  } catch (err) {
    console.warn(`[YahooOptions] ${symbol} error:`, (err as Error).message);
    return { symbol, expirations: [], calls: [], puts: [] };
  }
}