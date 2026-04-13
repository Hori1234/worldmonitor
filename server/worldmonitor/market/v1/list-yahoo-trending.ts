import type {
  ServerContext,
  ListYahooTrendingRequest,
  ListYahooTrendingResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import { UPSTREAM_TIMEOUT_MS } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';

const REDIS_KEY = 'market:yahoo-trending:v1';
const REDIS_TTL = 300;

export async function listYahooTrending(
  _ctx: ServerContext,
  req: ListYahooTrendingRequest,
): Promise<ListYahooTrendingResponse> {
  const count = Math.min(Math.max(req.count || 10, 1), 50);
  const redisKey = `${REDIS_KEY}:${count}`;

  try {
    const result = await cachedFetchJson<ListYahooTrendingResponse>(redisKey, REDIS_TTL, async () => {
      const url = `https://query2.finance.yahoo.com/v1/finance/trending/US?count=${count}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!resp.ok) return null;

      const data = await resp.json() as any;
      const tickers: any[] = data?.finance?.result?.[0]?.quotes ?? [];
      const trendingSymbols = tickers.map((t: any) => t.symbol).filter(Boolean).slice(0, count);

      if (!trendingSymbols.length) return null;

      // Fetch quotes for each trending symbol via chart API
      const symbols = await Promise.all(
        trendingSymbols.map(async (sym: string) => {
          try {
            const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1m`;
            const chartResp = await fetch(chartUrl, {
              headers: { 'User-Agent': CHROME_UA },
              signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
            });
            if (!chartResp.ok) return { symbol: sym, name: '', price: 0, changePercent: 0, volume: 0 };

            const chartData = await chartResp.json() as any;
            const meta = chartData?.chart?.result?.[0]?.meta ?? {};
            const price = meta.regularMarketPrice ?? 0;
            const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
            const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

            return {
              symbol: sym,
              name: meta.shortName ?? meta.longName ?? '',
              price,
              changePercent: +changePercent.toFixed(2),
              volume: meta.regularMarketVolume ?? 0,
            };
          } catch {
            return { symbol: sym, name: '', price: 0, changePercent: 0, volume: 0 };
          }
        }),
      );

      return symbols.length > 0 ? { symbols } : null;
    });

    return result ?? { symbols: [] };
  } catch (err) {
    console.warn(`[YahooTrending] error:`, (err as Error).message);
    return { symbols: [] };
  }
}