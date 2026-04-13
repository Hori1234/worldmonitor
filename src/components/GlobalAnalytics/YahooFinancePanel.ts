import { Panel } from '../Panel';
import { html, render } from 'lit-html';
import {
  fetchYahooQuote,
  fetchYahooHistory,
  searchYahooSymbols,
  fetchYahooTrending,
  fetchYahooOptions,
  fetchYahooProfile,
  type YahooQuoteDetail,
  type YahooHistoryCandle,
  type YahooSearchResult,
  type YahooTrendingSymbol,
  type YahooProfile,
} from '@/services/yahoo-finance';

interface OptionsSnapshot {
  symbol: string;
  expirations: string[];
  callCount: number;
  putCount: number;
  topCalls: { strike: number; lastPrice: number; volume: number; impliedVolatility: number }[];
  topPuts: { strike: number; lastPrice: number; volume: number; impliedVolatility: number }[];
}

export class YahooFinancePanel extends Panel {
  private quote: YahooQuoteDetail | undefined;
  private candles: YahooHistoryCandle[] = [];
  private searchResults: YahooSearchResult[] = [];
  private trending: YahooTrendingSymbol[] = [];
  private optionsData: OptionsSnapshot | undefined;
  private profile: YahooProfile | undefined;
  private loading = true;
  private errors: string[] = [];

  constructor() {
    super({
      id: 'yahoo-finance-panel',
      title: 'Yahoo Finance',
    });
    this.content.style.padding = '12px';
    this.content.style.overflowY = 'auto';
    this.renderView();
    this.loadAll();
  }

  private async loadAll(): Promise<void> {
    this.loading = true;
    this.errors = [];
    this.renderView();

    const results = await Promise.allSettled([
      fetchYahooQuote('AAPL'),
      fetchYahooHistory('TSLA', '6mo', '1d'),
      searchYahooSymbols('Microsoft'),
      fetchYahooTrending(5),
      fetchYahooOptions('SPY'),
      fetchYahooProfile('NVDA'),
    ]);

    // 1. Quote
    if (results[0].status === 'fulfilled') {
      this.quote = results[0].value;
    } else {
      this.errors.push('Quote: ' + results[0].reason);
    }

    // 2. History
    if (results[1].status === 'fulfilled') {
      this.candles = results[1].value;
    } else {
      this.errors.push('History: ' + results[1].reason);
    }

    // 3. Search
    if (results[2].status === 'fulfilled') {
      this.searchResults = results[2].value;
    } else {
      this.errors.push('Search: ' + results[2].reason);
    }

    // 4. Trending
    if (results[3].status === 'fulfilled') {
      this.trending = results[3].value;
    } else {
      this.errors.push('Trending: ' + results[3].reason);
    }

    // 5. Options
    if (results[4].status === 'fulfilled') {
      const o = results[4].value;
      this.optionsData = {
        symbol: o.symbol,
        expirations: o.expirations,
        callCount: o.calls.length,
        putCount: o.puts.length,
        topCalls: o.calls.slice(0, 5).map(c => ({
          strike: c.strike, lastPrice: c.lastPrice,
          volume: c.volume, impliedVolatility: c.impliedVolatility,
        })),
        topPuts: o.puts.slice(0, 5).map(p => ({
          strike: p.strike, lastPrice: p.lastPrice,
          volume: p.volume, impliedVolatility: p.impliedVolatility,
        })),
      };
    } else {
      this.errors.push('Options: ' + results[4].reason);
    }

    // 6. Profile
    if (results[5].status === 'fulfilled') {
      this.profile = results[5].value;
    } else {
      this.errors.push('Profile: ' + results[5].reason);
    }

    this.loading = false;
    this.renderView();
  }

  private renderView(): void {
    const tpl = html`
      <style>
        .yf-section { margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
        .yf-section h3 { margin: 0 0 8px; font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .yf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 13px; }
        .yf-grid .label { color: var(--text-muted); }
        .yf-grid .value { font-weight: 500; text-align: right; }
        .yf-positive { color: #22c55e; }
        .yf-negative { color: #ef4444; }
        .yf-table { width: 100%; font-size: 12px; border-collapse: collapse; }
        .yf-table th, .yf-table td { padding: 4px 8px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .yf-table th { color: var(--text-muted); font-weight: 500; }
        .yf-refresh { padding: 6px 14px; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--text-primary); cursor: pointer; font-size: 12px; }
        .yf-refresh:hover { background: rgba(255,255,255,0.1); }
        .yf-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin: 2px; background: rgba(255,255,255,0.06); }
        .yf-spark { display: flex; align-items: flex-end; gap: 1px; height: 40px; }
        .yf-spark-bar { background: #3b82f6; border-radius: 1px 1px 0 0; min-width: 2px; }
        .yf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .yf-errors { padding: 8px; background: rgba(239,68,68,0.1); border-radius: 6px; font-size: 12px; color: #ef4444; margin-bottom: 12px; }
      </style>

      <div class="yf-header">
        <span style="font-size: 11px; color: var(--text-muted);">
          ${this.loading ? 'Loading...' : `Updated ${new Date().toLocaleTimeString()}`}
        </span>
        <button class="yf-refresh" @click=${() => this.loadAll()} ?disabled=${this.loading}>
          ${this.loading ? '⏳' : '↻'} Refresh
        </button>
      </div>

      ${this.errors.length > 0 ? html`
        <div class="yf-errors">
          ${this.errors.map(e => html`<div>⚠ ${e}</div>`)}
        </div>
      ` : ''}

      <!-- 1. QUOTE -->
      ${this.quote ? html`
        <div class="yf-section">
          <h3>📈 Quote — ${this.quote.symbol}</h3>
          <div style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">
            $${this.quote.price.toFixed(2)}
            <span class="${this.quote.changePercent >= 0 ? 'yf-positive' : 'yf-negative'}" style="font-size: 14px; margin-left: 8px;">
              ${this.quote.changePercent >= 0 ? '+' : ''}${this.quote.changePercent.toFixed(2)}%
            </span>
          </div>
          <div class="yf-grid">
            <span class="label">Name</span><span class="value">${this.quote.name}</span>
            <span class="label">Exchange</span><span class="value">${this.quote.exchange}</span>
            <span class="label">Open</span><span class="value">$${this.quote.open.toFixed(2)}</span>
            <span class="label">Prev Close</span><span class="value">$${this.quote.previousClose.toFixed(2)}</span>
            <span class="label">Day Range</span><span class="value">$${this.quote.dayLow.toFixed(2)} – $${this.quote.dayHigh.toFixed(2)}</span>
            <span class="label">52W Range</span><span class="value">$${this.quote.fiftyTwoWeekLow.toFixed(2)} – $${this.quote.fiftyTwoWeekHigh.toFixed(2)}</span>
            <span class="label">Volume</span><span class="value">${this.fmtNum(this.quote.volume)}</span>
            <span class="label">Market Cap</span><span class="value">${this.fmtNum(this.quote.marketCap)}</span>
          </div>
        </div>
      ` : ''}

      <!-- 2. HISTORY SPARKLINE -->
      ${this.candles.length > 0 ? html`
        <div class="yf-section">
          <h3>📊 History — TSLA (6mo, ${this.candles.length} bars)</h3>
          <div class="yf-spark">
            ${this.renderSparkline(this.candles.map(c => c.close))}
          </div>
          <div class="yf-grid" style="margin-top: 8px;">
            <span class="label">Latest Close</span><span class="value">$${this.candles[this.candles.length - 1]!.close.toFixed(2)}</span>
            <span class="label">Period High</span><span class="value">$${Math.max(...this.candles.map(c => c.high)).toFixed(2)}</span>
            <span class="label">Period Low</span><span class="value">$${Math.min(...this.candles.map(c => c.low)).toFixed(2)}</span>
            <span class="label">Avg Volume</span><span class="value">${this.fmtNum(Math.round(this.candles.reduce((s, c) => s + c.volume, 0) / this.candles.length))}</span>
          </div>
        </div>
      ` : ''}

      <!-- 3. SEARCH RESULTS -->
      ${this.searchResults.length > 0 ? html`
        <div class="yf-section">
          <h3>🔍 Search — "Microsoft"</h3>
          <table class="yf-table">
            <thead><tr><th>Symbol</th><th>Name</th><th>Exchange</th><th>Type</th></tr></thead>
            <tbody>
              ${this.searchResults.slice(0, 8).map(r => html`
                <tr>
                  <td style="font-weight:600;">${r.symbol}</td>
                  <td>${r.name}</td>
                  <td>${r.exchange}</td>
                  <td><span class="yf-tag">${r.type}</span></td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- 4. TRENDING -->
      ${this.trending.length > 0 ? html`
        <div class="yf-section">
          <h3>🔥 Trending</h3>
          <table class="yf-table">
            <thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Change</th><th>Volume</th></tr></thead>
            <tbody>
              ${this.trending.map(t => html`
                <tr>
                  <td style="font-weight:600;">${t.symbol}</td>
                  <td>${t.name}</td>
                  <td>$${t.price.toFixed(2)}</td>
                  <td class="${t.changePercent >= 0 ? 'yf-positive' : 'yf-negative'}">
                    ${t.changePercent >= 0 ? '+' : ''}${t.changePercent.toFixed(2)}%
                  </td>
                  <td>${this.fmtNum(t.volume)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- 5. OPTIONS -->
      ${this.optionsData ? html`
        <div class="yf-section">
          <h3>📋 Options — ${this.optionsData.symbol}</h3>
          <div class="yf-grid" style="margin-bottom: 8px;">
            <span class="label">Calls</span><span class="value">${this.optionsData.callCount}</span>
            <span class="label">Puts</span><span class="value">${this.optionsData.putCount}</span>
            <span class="label">Expirations</span><span class="value">${this.optionsData.expirations.length}</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Top 5 Calls</div>
          <table class="yf-table">
            <thead><tr><th>Strike</th><th>Last</th><th>Vol</th><th>IV</th></tr></thead>
            <tbody>
              ${this.optionsData.topCalls.map(c => html`
                <tr>
                  <td>$${c.strike.toFixed(2)}</td>
                  <td>$${c.lastPrice.toFixed(2)}</td>
                  <td>${this.fmtNum(c.volume)}</td>
                  <td>${(c.impliedVolatility * 100).toFixed(1)}%</td>
                </tr>
              `)}
            </tbody>
          </table>
          <div style="font-size:12px; color:var(--text-muted); margin: 8px 0 4px;">Top 5 Puts</div>
          <table class="yf-table">
            <thead><tr><th>Strike</th><th>Last</th><th>Vol</th><th>IV</th></tr></thead>
            <tbody>
              ${this.optionsData.topPuts.map(p => html`
                <tr>
                  <td>$${p.strike.toFixed(2)}</td>
                  <td>$${p.lastPrice.toFixed(2)}</td>
                  <td>${this.fmtNum(p.volume)}</td>
                  <td>${(p.impliedVolatility * 100).toFixed(1)}%</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- 6. PROFILE -->
      ${this.profile ? html`
        <div class="yf-section">
          <h3>🏢 Profile — ${this.profile.symbol}</h3>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">${this.profile.name}</div>
          <div class="yf-grid">
            <span class="label">Sector</span><span class="value">${this.profile.sector}</span>
            <span class="label">Industry</span><span class="value">${this.profile.industry}</span>
            <span class="label">Country</span><span class="value">${this.profile.country}</span>
            <span class="label">Employees</span><span class="value">${this.fmtNum(this.profile.fullTimeEmployees)}</span>
            <span class="label">Market Cap</span><span class="value">${this.fmtNum(this.profile.marketCap)}</span>
            <span class="label">P/E</span><span class="value">${this.profile.peRatio.toFixed(2)}</span>
            <span class="label">Fwd P/E</span><span class="value">${this.profile.forwardPe.toFixed(2)}</span>
            <span class="label">Beta</span><span class="value">${this.profile.beta.toFixed(2)}</span>
            <span class="label">Revenue</span><span class="value">${this.fmtNum(this.profile.revenue)}</span>
            <span class="label">Profit Margin</span><span class="value">${this.profile.profitMargin.toFixed(1)}%</span>
            <span class="label">Div Yield</span><span class="value">${this.profile.dividendYield.toFixed(2)}%</span>
            <span class="label">52W Range</span><span class="value">$${this.profile.fiftyTwoWeekLow.toFixed(2)} – $${this.profile.fiftyTwoWeekHigh.toFixed(2)}</span>
          </div>
          ${this.profile.website ? html`
            <div style="margin-top: 8px; font-size: 12px;">
              <a href="${this.profile.website}" target="_blank" rel="noopener" style="color: #3b82f6;">${this.profile.website}</a>
            </div>
          ` : ''}
          ${this.profile.description ? html`
            <p style="margin-top: 8px; font-size: 12px; color: var(--text-muted); line-height: 1.5; max-height: 80px; overflow: hidden;">
              ${this.profile.description.slice(0, 300)}${this.profile.description.length > 300 ? '…' : ''}
            </p>
          ` : ''}
        </div>
      ` : ''}
    `;

    render(tpl, this.content);
  }

  private renderSparkline(values: number[]) {
    if (!values.length) return '';
    // Sample down to max 60 bars for display
    const sampled = values.length > 60
      ? values.filter((_, i) => i % Math.ceil(values.length / 60) === 0)
      : values;
    const max = Math.max(...sampled);
    const min = Math.min(...sampled);
    const range = max - min || 1;
    return sampled.map(v => {
      const h = Math.max(2, ((v - min) / range) * 36);
      return html`<div class="yf-spark-bar" style="height:${h}px; flex:1;"></div>`;
    });
  }

  private fmtNum(n: number): string {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  }
}