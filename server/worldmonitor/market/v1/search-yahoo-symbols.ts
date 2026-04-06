import type {
  ServerContext,
  SearchYahooSymbolsRequest,
  SearchYahooSymbolsResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import yahooFinance from 'yahoo-finance2';

const REDIS_KEY = 'market:yahoo-search:v1';
const REDIS_TTL = 3600; // 1 hour — search results rarely change

export async function searchYahooSymbols(
  _ctx: ServerContext,
  req: SearchYahooSymbolsRequest,
): Promise<SearchYahooSymbolsResponse> {
  const query = req.query.trim();
  if (!query) return { results: [] };

  const redisKey = `${REDIS_KEY}:${query.toLowerCase()}`;

  try {
    const result = await cachedFetchJson<SearchYahooSymbolsResponse>(redisKey, REDIS_TTL, async () => {
      const resp = await yahooFinance.search(query);
      if (!resp?.quotes?.length) return null;

      const results = resp.quotes
        .filter((q: any) => q.symbol)
        .slice(0, 20)
        .map((q: any) => ({
          symbol: q.symbol ?? '',
          name: q.shortname ?? q.longname ?? '',
          exchange: q.exchDisp ?? q.exchange ?? '',
          type: q.quoteType ?? '',
        }));

      return results.length > 0 ? { results } : null;
    });

    return result ?? { results: [] };
  } catch (err) {
    console.warn(`[YahooSearch] "${query}" error:`, (err as Error).message);
    return { results: [] };
  }
}