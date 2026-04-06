import type {
  ServerContext,
  GetYahooQuoteRequest,
  GetYahooQuoteResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import yahooFinance from 'yahoo-finance2';

const REDIS_KEY = 'market:yahoo-quote:v1';
const REDIS_TTL = 300; // 5 min

export async function getYahooQuote(
  _ctx: ServerContext,
  req: GetYahooQuoteRequest,
): Promise<GetYahooQuoteResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  if (!symbol) return { quote: undefined };

  const redisKey = `${REDIS_KEY}:${symbol}`;

  try {
    const result = await cachedFetchJson<GetYahooQuoteResponse>(redisKey, REDIS_TTL, async () => {
      const q = await yahooFinance.quote(symbol);
      if (!q) return null;

      return {
        quote: {
          symbol: q.symbol ?? symbol,
          name: q.shortName ?? q.longName ?? '',
          exchange: q.fullExchangeName ?? q.exchange ?? '',
          currency: q.currency ?? '',
          price: q.regularMarketPrice ?? 0,
          previousClose: q.regularMarketPreviousClose ?? 0,
          open: q.regularMarketOpen ?? 0,
          dayHigh: q.regularMarketDayHigh ?? 0,
          dayLow: q.regularMarketDayLow ?? 0,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
          volume: q.regularMarketVolume ?? 0,
          avgVolume: q.averageDailyVolume3Month ?? 0,
          marketCap: q.marketCap ?? 0,
          peRatio: q.trailingPE ?? 0,
          eps: q.epsTrailingTwelveMonths ?? 0,
          dividendYield: (q.dividendYield ?? 0) * 100,
          changePercent: q.regularMarketChangePercent ?? 0,
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