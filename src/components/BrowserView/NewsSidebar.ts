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

/** Google News topic IDs for Hot Topics */
const HOT_TOPICS_SECTIONS = [
  { id: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB', label: 'World' },
  { id: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB', label: 'Science' },
  { id: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB', label: 'Technology' },
];

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

type SidebarTab = 'local' | 'hot';

export class NewsSidebar extends Panel {
  private localItems: NewsItem[] = [];
  private hotItems: NewsItem[] = [];
  private countryCode = 'XX';
  private countryName = 'Unknown';
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private onNavigate: ((url: string) => void) | null = null;
  private activeTab: SidebarTab = 'local';
  private tabBar: HTMLElement;
  private listContainer: HTMLElement;

  constructor(navigateCb?: (url: string) => void) {
    super({ id: 'browser-news-sidebar', title: 'News' });
    this.onNavigate = navigateCb ?? null;

    const el = this.getElement();
    el.style.height = '100%';
    el.style.overflow = 'hidden';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';

    this.content.style.overflowY = 'hidden';
    this.content.style.flex = '1';
    this.content.style.padding = '0';
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';

    // ── Tab bar ──
    this.tabBar = document.createElement('div');
    this.tabBar.style.cssText =
      'display:flex;border-bottom:1px solid var(--border,#2a2a2a);flex-shrink:0;background:var(--bg-secondary,#0a0a0a);';
    this.content.appendChild(this.tabBar);

    // ── Scrollable list area ──
    this.listContainer = document.createElement('div');
    this.listContainer.style.cssText = 'flex:1;overflow-y:auto;';
    this.content.appendChild(this.listContainer);

    this.detectCountryAndLoad();
    this.refreshInterval = setInterval(() => {
      this.fetchLocalNews();
      this.fetchHotTopics();
    }, 5 * 60 * 1000);
  }

  private renderTabBar(): void {
    this.tabBar.innerHTML = '';

    const localTab = this.makeTab(this.countryName, 'local');
    const hotTab = this.makeTab('Hot Topics', 'hot');

    this.tabBar.append(localTab, hotTab);
  }

  private makeTab(label: string, tab: SidebarTab): HTMLElement {
    const el = document.createElement('div');
    const isActive = tab === this.activeTab;
    el.style.cssText =
      'flex:1;text-align:center;padding:8px 12px;font-size:12px;cursor:pointer;' +
      'font-weight:' + (isActive ? '600' : '400') + ';' +
      'color:' + (isActive ? 'var(--text,#e8e8e8)' : 'var(--text-muted,#666)') + ';' +
      'border-bottom:2px solid ' + (isActive ? 'var(--accent,#60a5fa)' : 'transparent') + ';' +
      'transition:color .12s,border-color .12s;letter-spacing:.02em;user-select:none;';
    el.textContent = label;
    el.addEventListener('mouseenter', () => {
      if (tab !== this.activeTab) el.style.color = 'var(--text-secondary,#ccc)';
    });
    el.addEventListener('mouseleave', () => {
      if (tab !== this.activeTab) el.style.color = 'var(--text-muted,#666)';
    });
    el.addEventListener('click', () => {
      if (tab === this.activeTab) return;
      this.activeTab = tab;
      this.renderTabBar();
      this.renderActiveList();
    });
    return el;
  }

  private async detectCountryAndLoad(): Promise<void> {
    try {
      const resp = await fetch('https://ipapi.co/json/');
      if (resp.ok) {
        const data = await resp.json();
        this.countryCode = data.country_code || 'XX';
        this.countryName = data.country_name || this.countryCode;
      }
    } catch {
      this.countryCode = 'XX';
      this.countryName = 'Unknown';
    }

    // Fallback: if ipapi didn't return a name, use the map
    if (this.countryName === this.countryCode || this.countryName === 'Unknown') {
      const mapping = COUNTRY_NEWS_MAP[this.countryCode];
      this.countryName = mapping?.name ?? this.countryCode;
    }

    const titleEl = this.getElement().querySelector('.panel-title') as HTMLElement;
    if (titleEl) {
      titleEl.textContent = 'News';
    }

    this.renderTabBar();
    await Promise.all([this.fetchLocalNews(), this.fetchHotTopics()]);
  }

  private async fetchLocalNews(): Promise<void> {
    if (this.activeTab === 'local') this.showListLoading();

    const mapping = COUNTRY_NEWS_MAP[this.countryCode] ?? { region: 'US', lang: 'en', name: 'World' };
    const gnewsUrl = 'https://news.google.com/rss?hl=' + mapping.lang + '&gl=' + mapping.region + '&ceid=' + mapping.region + ':' + mapping.lang;

    try {
      const proxyUrl = '/api/rss-proxy?url=' + encodeURIComponent(gnewsUrl);
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error('RSS fetch failed: ' + resp.status);

      const text = await resp.text();
      this.localItems = this.parseRss(text);
    } catch (err) {
      console.warn('[NewsSidebar] Failed to fetch local news:', err);
      this.localItems = [];
    }

    if (this.activeTab === 'local') this.renderActiveList();
  }

  private async fetchHotTopics(): Promise<void> {
    if (this.activeTab === 'hot') this.showListLoading();

    const allItems: NewsItem[] = [];

    // Fetch world headlines as "hot topics"
    const hotUrl = 'https://news.google.com/rss?hl=en&gl=US&ceid=US:en&topic=h';

    try {
      const proxyUrl = '/api/rss-proxy?url=' + encodeURIComponent(hotUrl);
      const resp = await fetch(proxyUrl);
      if (resp.ok) {
        const text = await resp.text();
        allItems.push(...this.parseRss(text));
      }
    } catch (err) {
      console.warn('[NewsSidebar] Failed to fetch hot topics:', err);
    }

    this.hotItems = allItems.slice(0, 50);
    if (this.activeTab === 'hot') this.renderActiveList();
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

  private renderActiveList(): void {
    const items = this.activeTab === 'local' ? this.localItems : this.hotItems;
    this.listContainer.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:16px;color:var(--text-muted);text-align:center;font-size:12px;';
      empty.textContent = this.activeTab === 'local'
        ? 'No news available for ' + this.countryName
        : 'No hot topics available';
      this.listContainer.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;';

    for (const item of items) {
      const row = document.createElement('div');
      row.style.cssText =
        'padding:10px 12px;border-bottom:1px solid var(--border,#2a2a2a);cursor:pointer;transition:background 0.15s;';

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
      timeSpan.style.color = 'var(--accent-muted,#60a5fa)';
      timeSpan.textContent = this.formatTime(item.pubDate);

      metaEl.append(sourceSpan, timeSpan);
      row.append(titleEl, metaEl);

      row.addEventListener('click', () => {
        if (this.onNavigate) this.onNavigate(item.link);
      });

      list.appendChild(row);
    }

    this.listContainer.appendChild(list);
  }

  private showListLoading(): void {
    this.listContainer.innerHTML = '';
    const loader = document.createElement('div');
    loader.style.cssText =
      'display:flex;align-items:center;justify-content:center;height:80px;' +
      'color:var(--text-muted,#666);font-size:12px;';
    loader.textContent = 'Loading\u2026';
    this.listContainer.appendChild(loader);
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