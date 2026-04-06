import type {
  ServerContext,
  ListYahooTrendingRequest,
  ListYahooTrendingResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import yahooFinance from 'yahoo-finance2';

const REDIS_KEY = 'market:yahoo-trending:v1';
const REDIS_TTL = 300; // 5 min

export async function listYahooTrending(
  _ctx: ServerContext,
  req: ListYahooTrendingRequest,
): Promise<ListYahooTrendingResponse> {
  const count = Math.min(Math.max(req.count || 10, 1), 50);
  const redisKey = `${REDIS_KEY}:${count}`;

  try {
    const result = await cachedFetchJson<ListYahooTrendingResponse>(redisKey, REDIS_TTL, async () => {
      const resp = await yahooFinance.trendingSymbols('US', { count });

      if (!resp?.quotes?.length) return null;

      // Fetch quotes for trending symbols to get price data
      const trendingSymbols = resp.quotes.map((q: any) => q.symbol).filter(Boolean);
      const quotes = await yahooFinance.quote(trendingSymbols);
      const quoteMap = new Map<string, any>();
      const quoteArr = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of quoteArr) {
        if (q?.symbol) quoteMap.set(q.symbol, q);
      }

      const symbols = trendingSymbols.slice(0, count).map((sym: string) => {
        const q = quoteMap.get(sym);
        return {
          symbol: sym,
          name: q?.shortName ?? q?.longName ?? '',
          price: q?.regularMarketPrice ?? 0,
          changePercent: q?.regularMarketChangePercent ?? 0,
          volume: q?.regularMarketVolume ?? 0,
        };
      });

      return symbols.length > 0 ? { symbols } : null;
    });

    return result ?? { symbols: [] };
  } catch (err) {
    console.warn(`[YahooTrending] error:`, (err as Error).message);
    return { symbols: [] };
  }
}