import type {
  ServerContext,
  GetYahooProfileRequest,
  GetYahooProfileResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import { UPSTREAM_TIMEOUT_MS } from './_shared';
import { CHROME_UA } from '../../../_shared/constants';

const REDIS_KEY = 'market:yahoo-profile:v1';
const REDIS_TTL = 3600;

export async function getYahooProfile(
  _ctx: ServerContext,
  req: GetYahooProfileRequest,
): Promise<GetYahooProfileResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  if (!symbol) return { profile: undefined };

  const redisKey = `${REDIS_KEY}:${symbol}`;

  try {
    const result = await cachedFetchJson<GetYahooProfileResponse>(redisKey, REDIS_TTL, async () => {
      const modules = 'assetProfile,defaultKeyStatistics,financialData,price';
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': CHROME_UA },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!resp.ok) return null;

      const data = await resp.json() as any;
      const result = data?.quoteSummary?.result?.[0];
      if (!result) return null;

      const ap = result.assetProfile ?? {};
      const stats = result.defaultKeyStatistics ?? {};
      const fin = result.financialData ?? {};
      const price = result.price ?? {};

      return {
        profile: {
          symbol,
          name: price.shortName ?? price.longName ?? '',
          sector: ap.sector ?? '',
          industry: ap.industry ?? '',
          country: ap.country ?? '',
          website: ap.website ?? '',
          description: ap.longBusinessSummary ?? '',
          fullTimeEmployees: ap.fullTimeEmployees ?? 0,
          marketCap: price.marketCap?.raw ?? 0,
          peRatio: stats.trailingPE?.raw ?? 0,
          forwardPe: stats.forwardPE?.raw ?? 0,
          dividendYield: (stats.dividendYield?.raw ?? 0) * 100,
          fiftyTwoWeekHigh: stats.fiftyTwoWeekHigh?.raw ?? 0,
          fiftyTwoWeekLow: stats.fiftyTwoWeekLow?.raw ?? 0,
          beta: stats.beta?.raw ?? 0,
          revenue: fin.totalRevenue?.raw ?? 0,
          profitMargin: (fin.profitMargins?.raw ?? 0) * 100,
        },
      };
    });

    return result ?? { profile: undefined };
  } catch (err) {
    console.warn(`[YahooProfile] ${symbol} error:`, (err as Error).message);
    return { profile: undefined };
  }
}