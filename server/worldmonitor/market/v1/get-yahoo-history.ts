import type {
  ServerContext,
  GetYahooHistoryRequest,
  GetYahooHistoryResponse,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { cachedFetchJson } from '../../../_shared/redis';
import yahooFinance from 'yahoo-finance2';

const REDIS_KEY = 'market:yahoo-history:v1';

const RANGE_TO_PERIOD: Record<string, string> = {
  '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo',
  '6mo': '6mo', '1y': '1y', '5y': '5y', 'max': 'max',
};

const RANGE_TO_TTL: Record<string, number> = {
  '1d': 300, '5d': 600, '1mo': 1800, '3mo': 3600,
  '6mo': 3600, '1y': 7200, '5y': 86400, 'max': 86400,
};

export async function getYahooHistory(
  _ctx: ServerContext,
  req: GetYahooHistoryRequest,
): Promise<GetYahooHistoryResponse> {
  const symbol = req.symbol.trim().toUpperCase();
  const range = RANGE_TO_PERIOD[req.range] ? req.range : '3mo';
  const interval = (['1d', '1wk', '1mo'].includes(req.interval) ? req.interval : '1d') as '1d' | '1wk' | '1mo';
  const ttl = RANGE_TO_TTL[range] ?? 1800;

  if (!symbol) return { symbol: '', candles: [] };

  const redisKey = `${REDIS_KEY}:${symbol}:${range}:${interval}`;

  try {
    const result = await cachedFetchJson<GetYahooHistoryResponse>(redisKey, ttl, async () => {
      const now = new Date();
      const periodMap: Record<string, number> = {
        '1d': 1, '5d': 5, '1mo': 30, '3mo': 90,
        '6mo': 180, '1y': 365, '5y': 1825, 'max': 36500,
      };
      const days = periodMap[range] ?? 90;
      const period1 = new Date(now.getTime() - days * 86400000);

      const rows = await yahooFinance.chart(symbol, {
        period1,
        period2: now,
        interval,
      });

      if (!rows?.quotes?.length) return null;

      const candles = rows.quotes.map((r: any) => ({
        date: new Date(r.date).getTime(),
        open: r.open ?? 0,
        high: r.high ?? 0,
        low: r.low ?? 0,
        close: r.close ?? 0,
        volume: r.volume ?? 0,
        adjClose: r.adjclose ?? r.close ?? 0,
      }));

      return { symbol, candles };
    });

    return result ?? { symbol, candles: [] };
  } catch (err) {
    console.warn(`[YahooHistory] ${symbol} error:`, (err as Error).message);
    return { symbol, candles: [] };
  }
}