// src/components/BrowserView/NewsSidebar.ts
import { Panel } from '../Panel';

/** Country-code → Google News region mapping */
const COUNTRY_NEWS_MAP: Record<string, { region: string; lang: string; name: string }> = {
  US: { region: 'US', lang: 'en', name: 'United States' },
  GB: { region: 'GB', lang: 'en', name: 'United Kingdom' },
  DE: { region: 'DE', lang: 'de', name: 'Germany' },
  FR: { region: 'FR', lang: 'fr', name: 'France' },
  NL: { region: 'NL', lang: 'nl', name: 'Netherlands' },
  ES: { region: 'ES', lang: 'es', name: 'Spain' },
  IT: { region: 'IT', lang: 'it', name: 'Italy' },
  JP: { region: 'JP', lang: 'ja', name: 'Japan' },
  BR: { region: 'BR', lang: 'pt-BR', name: 'Brazil' },
  IN: { region: 'IN', lang: 'en', name: 'India' },
  AU: { region: 'AU', lang: 'en', name: 'Australia' },
  CA: { region: 'CA', lang: 'en', name: 'Canada' },
  IL: { region: 'IL', lang: 'he', name: 'Israel' },
  UA: { region: 'UA', lang: 'uk', name: 'Ukraine' },
  PL: { region: 'PL', lang: 'pl', name: 'Poland' },
  TR: { region: 'TR', lang: 'tr', name: 'Turkey' },
  KR: { region: 'KR', lang: 'ko', name: 'South Korea' },
  MX: { region: 'MX', lang: 'es', name: 'Mexico' },
  AR: { region: 'AR', lang: 'es', name: 'Argentina' },
  ZA: { region: 'ZA', lang: 'en', name: 'South Africa' },
};

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

export class NewsSidebar extends Panel {
  private newsItems: NewsItem[] = [];
  private countryCode = 'XX';
  private countryName = 'Unknown';
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private onNavigate: ((url: string) => void) | null = null;

  constructor(navigateCb?: (url: string) => void) {
    super({ id: 'browser-news-sidebar', title: 'Local News' });
    this.onNavigate = navigateCb ?? null;

    const el = this.getElement();
    el.style.height = '100%';
    el.style.overflow = 'hidden';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    this.content.style.overflowY = 'auto';
    this.content.style.flex = '1';
    this.content.style.padding = '0';

    this.detectCountryAndLoad();
    this.refreshInterval = setInterval(() => this.fetchNews(), 5 * 60 * 1000);
  }

  private async detectCountryAndLoad(): Promise<void> {
    try {
      const resp = await fetch('/api/geo');
      if (resp.ok) {
        const data = await resp.json();
        this.countryCode = data.country || 'XX';
      }
    } catch {
      this.countryCode = 'XX';
    }

    const mapping = COUNTRY_NEWS_MAP[this.countryCode];
    this.countryName = mapping?.name ?? this.countryCode;

    const titleEl = this.getElement().querySelector('.panel-title');
    if (titleEl) {
      titleEl.textContent = 'News \u2014 ' + this.countryName;
    }

    await this.fetchNews();
  }

  private async fetchNews(): Promise<void> {
    this.showLoading();

    const mapping = COUNTRY_NEWS_MAP[this.countryCode] ?? { region: 'US', lang: 'en', name: 'World' };
    const gnewsUrl = 'https://news.google.com/rss?hl=' + mapping.lang + '&gl=' + mapping.region + '&ceid=' + mapping.region + ':' + mapping.lang;

    try {
      const proxyUrl = '/api/rss-proxy?url=' + encodeURIComponent(gnewsUrl);
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error('RSS fetch failed: ' + resp.status);

      const text = await resp.text();
      this.newsItems = this.parseRss(text);
      this.renderNewsList();
    } catch (err) {
      console.warn('[NewsSidebar] Failed to fetch news:', err);
      this.showError('Failed to load news');
    }
  }

  private parseRss(xml: string): NewsItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('item');
    const results: NewsItem[] = [];

    items.forEach((item, i) => {
      if (i >= 50) return;
      const title = item.querySelector('title')?.textContent?.trim() ?? '';
      const link = item.querySelector('link')?.textContent?.trim() ?? '';
      const source = item.querySelector('source')?.textContent?.trim() ?? '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? '';
      if (title && link) {
        results.push({ title, link, source, pubDate });
      }
    });

    return results;
  }

  private renderNewsList(): void {
    this.content.innerHTML = '';

    if (this.newsItems.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:16px;color:var(--text-muted);text-align:center;';
      empty.textContent = 'No news available for ' + this.countryName;
      this.content.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'news-sidebar-list';
    list.style.cssText = 'display:flex;flex-direction:column;';

    for (const item of this.newsItems) {
      const row = document.createElement('div');
      row.className = 'news-sidebar-item';
      row.style.cssText = 'padding:10px 12px;border-bottom:1px solid var(--border,#333);cursor:pointer;transition:background 0.15s;';

      row.addEventListener('mouseenter', () => { row.style.background = 'var(--bg-hover,rgba(255,255,255,0.05))'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:13px;color:var(--text,#eee);line-height:1.35;margin-bottom:4px;';
      titleEl.textContent = item.title;

      const metaEl = document.createElement('div');
      metaEl.style.cssText = 'font-size:11px;color:var(--text-muted,#888);display:flex;justify-content:space-between;';

      const sourceSpan = document.createElement('span');
      sourceSpan.textContent = item.source;

      const timeSpan = document.createElement('span');
      timeSpan.textContent = this.formatTime(item.pubDate);

      metaEl.appendChild(sourceSpan);
      metaEl.appendChild(timeSpan);
      row.appendChild(titleEl);
      row.appendChild(metaEl);

      row.addEventListener('click', () => {
        if (this.onNavigate) {
          this.onNavigate(item.link);
        }
      });

      list.appendChild(row);
    }

    this.content.appendChild(list);
  }

  private formatTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return diffMin + 'm ago';
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return diffHrs + 'h ago';
      const diffDays = Math.floor(diffHrs / 24);
      return diffDays + 'd ago';
    } catch {
      return '';
    }
  }

  public override destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    super.destroy();
  }
}