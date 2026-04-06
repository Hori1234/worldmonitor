import type {
  ServerContext,
  SearchYahooSymbolsRequest,
  SearchYahooSymbolsResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import { UPSTREAM_TIMEOUT_MS } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';

const REDIS_KEY = 'market:yahoo-search:v1';
const REDIS_TTL = 3600;

export async function searchYahooSymbols(
  _ctx: ServerContext,
  req: SearchYahooSymbolsRequest,
): Promise<SearchYahooSymbolsResponse> {
  const query = req.query.trim();
  if (!query) return { results: [] };

  const redisKey = `${REDIS_KEY}:${query.toLowerCase()}`;

  try {
    const result = await cachedFetchJson<SearchYahooSymbolsResponse>(redisKey, REDIS_TTL, async () => {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&listsCount=0`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!resp.ok) return null;

      const data = await resp.json() as any;
      const quotes: any[] = data?.quotes ?? [];

      const results = quotes
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