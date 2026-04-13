/**
 * Market service handler -- thin composition of per-RPC modules.
 *
 * RPCs:
 *   - ListMarketQuotes      (Finnhub + Yahoo Finance for stocks/indices)
 *   - ListCryptoQuotes      (CoinGecko markets API)
 *   - ListCommodityQuotes   (Yahoo Finance for commodity futures)
 *   - GetSectorSummary      (Finnhub for sector ETFs)
 *   - ListStablecoinMarkets (CoinGecko stablecoin peg health)
 *   - ListEtfFlows          (Yahoo Finance BTC spot ETF flow estimates)
 *   - GetCountryStockIndex  (Yahoo Finance national stock indices)
 *   - ListGulfQuotes        (Yahoo Finance GCC indices, currencies, oil)
 */

import type { MarketServiceHandler } from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { listMarketQuotes } from './list-market-quotes';
import { listCryptoQuotes } from './list-crypto-quotes';
import { listCommodityQuotes } from './list-commodity-quotes';
import { getSectorSummary } from './get-sector-summary';
import { listStablecoinMarkets } from './list-stablecoin-markets';
import { listEtfFlows } from './list-etf-flows';
import { getCountryStockIndex } from './get-country-stock-index';
import { listGulfQuotes } from './list-gulf-quotes';

// The Yahoo Finance RPCs are in separate modules since they share caching logic and dependencies:
import { getYahooQuote } from './get-yahoo-quote';
import { getYahooHistory } from './get-yahoo-history';
import { searchYahooSymbols } from './search-yahoo-symbols';
import { listYahooTrending } from './list-yahoo-trending';
import { getYahooOptions } from './get-yahoo-options';
import { getYahooProfile } from './get-yahoo-profile';

export const marketHandler: MarketServiceHandler = {
  listMarketQuotes,
  listCryptoQuotes,
  listCommodityQuotes,
  getSectorSummary,
  listStablecoinMarkets,
  listEtfFlows,
  getCountryStockIndex,
  listGulfQuotes,


  // Yahoo Finance RPCs:
  getYahooQuote,
  getYahooHistory,
  searchYahooSymbols,
  listYahooTrending,
  getYahooOptions,
  getYahooProfile,
};
