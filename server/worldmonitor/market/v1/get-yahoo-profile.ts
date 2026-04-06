import type {
  ServerContext,
  GetYahooProfileRequest,
  GetYahooProfileResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import yahooFinance from 'yahoo-finance2';

const REDIS_KEY = 'market:yahoo-profile:v1';
const REDIS_TTL = 3600; // 1 hour — profiles don't change often

export async function getYahooProfile(
  _ctx: ServerContext,
  req: GetYahooProfileRequest,
): Promise<GetYahooProfileResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  if (!symbol) return { profile: undefined };

  const redisKey = `${REDIS_KEY}:${symbol}`;

  try {
    const result = await cachedFetchJson<GetYahooProfileResponse>(redisKey, REDIS_TTL, async () => {
      const summary = await yahooFinance.quoteSummary(symbol, {
        modules: ['assetProfile', 'defaultKeyStatistics', 'financialData', 'price'],
      });
      if (!summary) return null;

      const profile = summary.assetProfile;
      const stats = summary.defaultKeyStatistics;
      const fin = summary.financialData;
      const price = summary.price;

      return {
        profile: {
          symbol,
          name: price?.shortName ?? price?.longName ?? '',
          sector: profile?.sector ?? '',
          industry: profile?.industry ?? '',
          country: profile?.country ?? '',
          website: profile?.website ?? '',
          description: profile?.longBusinessSummary ?? '',
          fullTimeEmployees: profile?.fullTimeEmployees ?? 0,
          marketCap: price?.marketCap ?? 0,
          peRatio: stats?.trailingPE ?? 0,
          forwardPe: stats?.forwardPE ?? 0,
          dividendYield: (stats?.dividendYield ?? 0) * 100,
          fiftyTwoWeekHigh: stats?.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: stats?.fiftyTwoWeekLow ?? 0,
          beta: stats?.beta ?? 0,
          revenue: fin?.totalRevenue ?? 0,
          profitMargin: (fin?.profitMargins ?? 0) * 100,
        },
      };
    });

    return result ?? { profile: undefined };
  } catch (err) {
    console.warn(`[YahooProfile] ${symbol} error:`, (err as Error).message);
    return { profile: undefined };
  }
}