import type {
  ServerContext,
  GetYahooQuoteRequest,
  GetYahooQuoteResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import { UPSTREAM_TIMEOUT_MS } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';

const REDIS_KEY = 'market:yahoo-quote:v1';
const REDIS_TTL = 300;

export async function getYahooQuote(
  _ctx: ServerContext,
  req: GetYahooQuoteRequest,
): Promise<GetYahooQuoteResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  if (!symbol) return { quote: undefined };

  const redisKey = `${REDIS_KEY}:${symbol}`;

  try {
    const result = await cachedFetchJson<GetYahooQuoteResponse>(redisKey, REDIS_TTL, async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!resp.ok) return null;

      const data = await resp.json() as any;
      const r = data?.chart?.result?.[0];
      if (!r) return null;

      const meta = r.meta ?? {};
      const price = meta.regularMarketPrice ?? 0;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      const closes = r.indicators?.quote?.[0]?.close?.filter((v: any): v is number => v != null) ?? [];

      return {
        quote: {
          symbol: meta.symbol ?? symbol,
          name: meta.shortName ?? meta.longName ?? '',
          exchange: meta.exchangeName ?? meta.fullExchangeName ?? '',
          currency: meta.currency ?? '',
          price,
          previousClose: prevClose,
          open: meta.regularMarketOpen ?? 0,
          dayHigh: meta.regularMarketDayHigh ?? meta.dayHigh ?? 0,
          dayLow: meta.regularMarketDayLow ?? meta.dayLow ?? 0,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
          volume: meta.regularMarketVolume ?? 0,
          avgVolume: 0,
          marketCap: 0,
          peRatio: 0,
          eps: 0,
          dividendYield: 0,
          changePercent,
          fetchedAt: Date.now(),
        },
      };
    });

    return result ?? { quote: undefined };
  } catch (err) {
    console.warn(`[YahooQuote] ${symbol} error:`, (err as Error).message);
    return { quote: undefined };
  }
}