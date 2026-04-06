import {
  MarketServiceClient,
  type YahooQuoteDetail,
  type YahooHistoryCandle,
  type YahooSearchResult,
  type YahooTrendingSymbol,
  type YahooOptionContract,
  type YahooProfile,
  type GetYahooQuoteResponse,
  type GetYahooHistoryResponse,
  type SearchYahooSymbolsResponse,
  type ListYahooTrendingResponse,
  type GetYahooOptionsResponse,
  type GetYahooProfileResponse,
} from '@/generated/client/worldmonitor/market/v1/service_client';
import { createCircuitBreaker } from '@/utils';

export type {
  YahooQuoteDetail,
  YahooHistoryCandle,
  YahooSearchResult,
  YahooTrendingSymbol,
  YahooOptionContract,
  YahooProfile,
};

const client = new MarketServiceClient('', { fetch: fetch.bind(globalThis) });

// ── Circuit breakers ──────────────────────────────────────────────────
const quoteBrk   = createCircuitBreaker<GetYahooQuoteResponse>({ name: 'YahooQuote' });
const historyBrk = createCircuitBreaker<GetYahooHistoryResponse>({ name: 'YahooHistory' });
const searchBrk  = createCircuitBreaker<SearchYahooSymbolsResponse>({ name: 'YahooSearch' });
const trendBrk   = createCircuitBreaker<ListYahooTrendingResponse>({ name: 'YahooTrending' });
const optionsBrk = createCircuitBreaker<GetYahooOptionsResponse>({ name: 'YahooOptions' });
const profileBrk = createCircuitBreaker<GetYahooProfileResponse>({ name: 'YahooProfile' });

// ── 1. Get Quote ──────────────────────────────────────────────────────
export async function fetchYahooQuote(symbol: string): Promise<YahooQuoteDetail | undefined> {
  const resp = await quoteBrk.execute(
    () => client.getYahooQuote({ symbol }),
    { quote: undefined },
  );
  return resp.quote;
}

// ── 2. Historical Prices ─────────────────────────────────────────────
export async function fetchYahooHistory(
  symbol: string,
  range = '3mo',
  interval = '1d',
): Promise<YahooHistoryCandle[]> {
  const resp = await historyBrk.execute(
    () => client.getYahooHistory({ symbol, range, interval }),
    { symbol: '', candles: [] },
  );
  return resp.candles;
}

// ── 3. Search ─────────────────────────────────────────────────────────
export async function searchYahooSymbols(query: string): Promise<YahooSearchResult[]> {
  const resp = await searchBrk.execute(
    () => client.searchYahooSymbols({ query }),
    { results: [] },
  );
  return resp.results;
}

// ── 4. Trending ───────────────────────────────────────────────────────
export async function fetchYahooTrending(count = 10): Promise<YahooTrendingSymbol[]> {
  const resp = await trendBrk.execute(
    () => client.listYahooTrending({ count }),
    { symbols: [] },
  );
  return resp.symbols;
}

// ── 5. Options Chain ──────────────────────────────────────────────────
export async function fetchYahooOptions(symbol: string, expiration?: string) {
  const resp = await optionsBrk.execute(
    () => client.getYahooOptions({ symbol, expiration: expiration ?? '' }),
    { symbol: '', expirations: [], calls: [], puts: [] },
  );
  return resp;
}

// ── 6. Company Profile ───────────────────────────────────────────────
export async function fetchYahooProfile(symbol: string): Promise<YahooProfile | undefined> {
  const resp = await profileBrk.execute(
    () => client.getYahooProfile({ symbol }),
    { profile: undefined },
  );
  return resp.profile;
}