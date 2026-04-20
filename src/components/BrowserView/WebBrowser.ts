import { isDesktopRuntime } from '@/services/runtime';
import { invokeTauri } from '@/services/tauri-bridge';
import { getAllNewsCategories, fetchNewsByCategory, type NewsFeedCategory } from '@/services/news_feeds_service/news-feeds';
import type { NewsItem } from '@/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
/* ── Injected styles ── */
const WB_STYLES = [
  '.wb-scroll{overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}',
  '.wb-scroll::-webkit-scrollbar{display:none}',
  '.wb-scroll-x{overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}',
  '.wb-scroll-x::-webkit-scrollbar{display:none}',
  '.wb-card{background:var(--surface,#141414);border:1px solid var(--border,#2a2a2a);border-radius:6px;padding:12px 14px;cursor:pointer;transition:border-color .15s,background .15s;display:flex;flex-direction:column;gap:8px}',
  '.wb-card:hover{border-color:var(--border-strong,#444);background:var(--surface-hover,#1e1e1e)}',
  '.wb-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}',
  '.wb-card-source{font-size:10px;color:var(--text-dim,#888);font-weight:500;letter-spacing:.03em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}',
  '.wb-card-time{font-size:10px;color:var(--text-ghost,#555);flex-shrink:0}',
  '.wb-card-title{font-size:12px;color:var(--text,#e8e8e8);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
  '.wb-card-loc{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-dim,#888)}',
  '.wb-card-tier{display:inline-flex;gap:2px;align-items:center;margin-left:6px}',
  '.wb-card-tier-dot{width:4px;height:4px;border-radius:50%}',
  '.wb-card-tags{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:auto;padding-top:2px}',
  '.wb-tag{display:inline-flex;align-items:center;font-size:9px;padding:2px 6px;border-radius:3px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:1.3}',
  '.wb-tag.critical{background:rgba(220,38,38,.15);color:#fca5a5;border:1px solid rgba(220,38,38,.3)}',
  '.wb-tag.high{background:rgba(217,119,6,.15);color:#fde68a;border:1px solid rgba(217,119,6,.3)}',
  '.wb-tag.medium{background:rgba(234,179,8,.12);color:#fde68a;border:1px solid rgba(234,179,8,.25)}',
  '.wb-tag.low{background:rgba(34,197,94,.12);color:#86efac;border:1px solid rgba(34,197,94,.25)}',
  '.wb-tag.info{background:rgba(59,130,246,.12);color:#93c5fd;border:1px solid rgba(59,130,246,.25)}',
  '.wb-tag.cat{background:rgba(139,92,246,.12);color:#c4b5fd;border:1px solid rgba(139,92,246,.25)}',
  '.wb-tag.lang-tag{background:rgba(255,255,255,.06);color:var(--text-dim,#888);border:1px solid rgba(255,255,255,.1)}',
  '.wb-mode-tab{padding:6px 16px;font-size:12px;cursor:pointer;white-space:nowrap;border-radius:4px 4px 0 0;user-select:none;letter-spacing:.02em;transition:background .12s,color .12s;color:var(--text-muted,#666);border:1px solid transparent;border-bottom:none;position:relative}',
  '.wb-mode-tab:hover{color:var(--text-secondary,#ccc)}',
  '.wb-mode-tab.active{color:var(--text,#e8e8e8);background:var(--bg,#0a0a0a);border-color:var(--border,#2a2a2a);font-weight:500}',
  ".wb-mode-tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;background:var(--bg,#0a0a0a)}",
  '.wb-browser-tab{display:flex;align-items:center;gap:6px;padding:4px 12px;font-size:11px;cursor:pointer;color:var(--text-dim,#888);white-space:nowrap;max-width:200px;min-width:80px;overflow:hidden;border-right:1px solid var(--border-subtle,#1a1a1a);transition:background .12s,color .12s}',
  '.wb-browser-tab:hover{background:var(--overlay-light,rgba(255,255,255,0.05))}',
  '.wb-browser-tab.active{background:var(--bg,#0a0a0a);color:var(--text,#e8e8e8)}',
  '.wb-browser-tab .close{font-size:13px;color:var(--text-ghost,#444);padding:0 2px;cursor:pointer;transition:color .1s;flex-shrink:0}',
  '.wb-browser-tab .close:hover{color:var(--text,#e8e8e8)}',
  '.wb-btn{width:28px;height:28px;border:none;border-radius:4px;background:transparent;color:var(--text-dim,#888);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:background .12s,color .12s}',
  '.wb-btn:hover{background:var(--overlay-medium,rgba(255,255,255,0.1));color:var(--text,#e8e8e8)}',
  '.wb-btn:disabled{opacity:.3;pointer-events:none}',
  '.wb-url{flex:1;height:28px;padding:0 10px;border:1px solid var(--border,#2a2a2a);border-radius:6px;background:var(--input-bg,#1a1a1a);color:var(--text,#e8e8e8);font-size:12px;font-family:inherit;outline:none;transition:border-color .15s}',
  '.wb-url:focus{border-color:var(--border-strong,#444)}',
  '.wb-badge{display:inline-block;font-size:9px;padding:1px 5px;border-radius:3px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}',
  '.wb-badge.critical{background:rgba(220,38,38,.2);color:#fca5a5}',
  '.wb-badge.high{background:rgba(217,119,6,.2);color:#fde68a}',
  '.wb-panel-header{font-size:16px;font-weight:600;color:var(--text,#e8e8e8);padding-bottom:12px;border-bottom:1px solid var(--border,#2a2a2a);margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}',
  '.wb-panel-header .wb-article-count{font-size:11px;font-weight:400;color:var(--text-muted,#666)}',
  '.wb-card-title{font-size:12px;color:var(--text,#e8e8e8);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer;width:100%}',
  '.wb-card-title:hover{text-decoration:underline}',
  '.wb-card-time{font-size:10px;color:var(--accent-muted,#60a5fa);flex-shrink:0;font-weight:500}',
].join('\n');

function injectStyles(): void {
  if (document.getElementById('wb-styles')) return;
  const s = document.createElement('style');
  s.id = 'wb-styles';
  s.textContent = WB_STYLES;
  document.head.appendChild(s);
}

/* ── Types ── */
interface TabState {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
}

const HOME_URL = 'https://html.duckduckgo.com/html/';

/* ══════════════════════════════════════════════════════════════
   WebBrowser — redesigned layout
   ══════════════════════════════════════════════════════════════ */
export class WebBrowser {
  private tabs: TabState[] = [];
  private activeTabId = '';
  private tauriWindowOpen = false;

  public readonly element: HTMLElement;

  /* Mode tabs */
  private modeTabBar: HTMLElement;
  private modeContentArea: HTMLElement;
  private activeMode = 'search';
  private newsCategories: NewsFeedCategory[] = [];

  /* Search/browser chrome */
  private searchContainer: HTMLElement;
  private tabBar: HTMLElement;
  private navBar: HTMLElement;
  private viewportContainer: HTMLElement;
  private urlInput: HTMLInputElement;
  private backBtn: HTMLButtonElement;
  private forwardBtn: HTMLButtonElement;
  private refreshBtn: HTMLButtonElement;

  constructor() {
    injectStyles();

    this.element = document.createElement('div');
    this.element.style.cssText = 'display:flex;flex-direction:column;height:100%;min-width:0;flex:1;';

    /* ── Mode tab bar ── */
    this.modeTabBar = document.createElement('div');
    this.modeTabBar.className = 'wb-scroll-x';
    this.modeTabBar.style.cssText =
      'display:flex;align-items:flex-end;background:var(--bg-secondary,#111);' +
      'border-bottom:1px solid var(--border,#2a2a2a);padding:0 8px;flex-shrink:0;gap:1px;';

    this.modeContentArea = document.createElement('div');
    this.modeContentArea.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

    /* ── Search container ── */
    this.searchContainer = document.createElement('div');
    this.searchContainer.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    this.tabBar = document.createElement('div');
    this.tabBar.className = 'wb-scroll-x';
    this.tabBar.style.cssText =
      'display:flex;align-items:center;background:var(--bg-secondary,#111);' +
      'min-height:30px;flex-shrink:0;';

    this.navBar = document.createElement('div');
    this.navBar.style.cssText =
      'display:flex;align-items:center;gap:4px;padding:4px 8px;' +
      'background:var(--bg-secondary,#111);border-bottom:1px solid var(--border,#2a2a2a);flex-shrink:0;';

    this.backBtn = this.makeBtn('\u25C0', 'Back');
    this.backBtn.disabled = true;
    this.backBtn.addEventListener('click', () => this.goBack());

    this.forwardBtn = this.makeBtn('\u25B6', 'Forward');
    this.forwardBtn.disabled = true;
    this.forwardBtn.addEventListener('click', () => this.goForward());

    this.refreshBtn = this.makeBtn('\u21BB', 'Refresh');
    this.refreshBtn.addEventListener('click', () => this.reload());

    this.urlInput = document.createElement('input');
    this.urlInput.type = 'text';
    this.urlInput.className = 'wb-url';
    this.urlInput.placeholder = 'Search or enter URL\u2026';
    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.navigateTo(this.urlInput.value.trim());
    });
    this.urlInput.addEventListener('focus', () => this.urlInput.select());

    const newTabBtn = this.makeBtn('+', 'New Tab');
    newTabBtn.style.fontSize = '15px';
    newTabBtn.addEventListener('click', () => this.addTab());

    this.navBar.append(this.backBtn, this.forwardBtn, this.refreshBtn, this.urlInput, newTabBtn);

    this.viewportContainer = document.createElement('div');
    this.viewportContainer.style.cssText = 'flex:1;position:relative;overflow:hidden;background:var(--bg,#0a0a0a);';

    this.searchContainer.append(this.tabBar, this.navBar, this.viewportContainer);

    /* ── Assemble ── */
    this.element.append(this.modeTabBar, this.modeContentArea);

    this.addTab(HOME_URL);
    this.newsCategories = getAllNewsCategories();
    this.renderModeTabBar();
    this.switchMode('search');
  }

  public getElement(): HTMLElement { return this.element; }

  /* ══════════════════════════════
     Mode tabs
     ══════════════════════════════ */

  private renderModeTabBar(): void {
    this.modeTabBar.innerHTML = '';
    this.modeTabBar.appendChild(this.makeModeTab('search', '\uD83D\uDD0D Search'));
    for (const cat of this.newsCategories) {
      this.modeTabBar.appendChild(this.makeModeTab(cat.key, cat.label));
    }
  }

  private makeModeTab(id: string, label: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'wb-mode-tab' + (id === this.activeMode ? ' active' : '');
    el.textContent = label;
    el.addEventListener('click', () => this.switchMode(id));
    return el;
  }

  private switchMode(mode: string): void {
    this.activeMode = mode;
    this.modeContentArea.innerHTML = '';
    this.renderModeTabBar();

    if (mode === 'search') {
      this.modeContentArea.appendChild(this.searchContainer);
    } else {
      this.showNewsCategoryPanel(mode);
    }
  }

  /* ══════════════════════════════
     News panels
     ══════════════════════════════ */

  private async showNewsCategoryPanel(categoryKey: string): Promise<void> {
    const wrapper = document.createElement('div');
    wrapper.className = 'wb-scroll';
    wrapper.style.cssText = 'flex:1;overflow-y:auto;padding:16px;background:var(--bg,#0a0a0a);';

    const loader = document.createElement('div');
    loader.style.cssText =
      'display:flex;align-items:center;justify-content:center;height:120px;' +
      'color:var(--text-muted,#666);font-size:12px;';
    loader.textContent = 'Loading\u2026';
    wrapper.appendChild(loader);
    this.modeContentArea.appendChild(wrapper);

    try {
      const items = await fetchNewsByCategory(categoryKey);
      wrapper.innerHTML = '';

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText =
          'display:flex;align-items:center;justify-content:center;height:120px;' +
          'color:var(--text-muted,#666);font-size:12px;';
        empty.textContent = 'No articles found.';
        wrapper.appendChild(empty);
        return;
      }

      // Category header
      const cat = this.newsCategories.find(c => c.key === categoryKey);
      const header = document.createElement('div');
      header.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
      const h = document.createElement('div');
      h.style.cssText = 'font-size:13px;font-weight:500;color:var(--text-secondary,#ccc);';
      h.textContent = (cat?.label ?? categoryKey) + ' \u2014 ' + items.length + ' articles';
      header.appendChild(h);
      wrapper.appendChild(header);

      const grid = document.createElement('div');
      grid.style.cssText =
        'display:grid;' +
        'grid-template-columns:repeat(auto-fill,minmax(clamp(200px,22vw,320px),1fr));' +
        'gap:10px;';

      for (const item of items) {
        grid.appendChild(this.renderNewsCard(item));
      }
      wrapper.appendChild(grid);
    } catch {
      wrapper.innerHTML = '';
      const err = document.createElement('div');
      err.style.cssText =
        'display:flex;align-items:center;justify-content:center;height:120px;' +
        'color:#f87171;font-size:12px;';
      err.textContent = 'Failed to load news.';
      wrapper.appendChild(err);
    }
  }

  private renderNewsCard(item: NewsItem): HTMLElement {
    const card = document.createElement('div');
    card.className = 'wb-card';

    // ── Header: source + tier + time ──
    const head = document.createElement('div');
    head.className = 'wb-card-head';

    const srcWrap = document.createElement('div');
    srcWrap.style.cssText = 'display:flex;align-items:center;min-width:0;';

    const src = document.createElement('span');
    src.className = 'wb-card-source';
    src.textContent = item.source;
    srcWrap.appendChild(src);

    // Tier indicator (filled dots)
    if (item.tier != null && item.tier >= 1 && item.tier <= 3) {
      const tierWrap = document.createElement('span');
      tierWrap.className = 'wb-card-tier';
      tierWrap.title = 'Source tier ' + item.tier;
      for (let i = 1; i <= 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'wb-card-tier-dot';
        dot.style.background = i <= item.tier
          ? 'var(--text-dim,#888)'
          : 'var(--border,#2a2a2a)';
        tierWrap.appendChild(dot);
      }
      srcWrap.appendChild(tierWrap);
    }

    const time = document.createElement('span');
    time.className = 'wb-card-time';
    time.textContent = this.formatRelativeTime(item.pubDate);

    head.append(srcWrap, time);
    card.appendChild(head);

    // ── Title ──
    const title = document.createElement('div');
    title.className = 'wb-card-title';
    title.textContent = item.title;
    card.appendChild(title);

    // ── Location ──
    if (item.locationName) {
      const loc = document.createElement('div');
      loc.className = 'wb-card-loc';
      loc.textContent = '\uD83D\uDCCD ' + item.locationName;
      card.appendChild(loc);
    }

    // ── Tags row (bottom-left): threat level + category + language ──
    const tags = document.createElement('div');
    tags.className = 'wb-card-tags';

    if (item.threat) {
      const levelTag = document.createElement('span');
      levelTag.className = 'wb-tag ' + item.threat.level;
      levelTag.textContent = item.threat.level;
      tags.appendChild(levelTag);

      const catTag = document.createElement('span');
      catTag.className = 'wb-tag cat';
      catTag.textContent = item.threat.category;
      tags.appendChild(catTag);
    }

    if (item.lang) {
      const langTag = document.createElement('span');
      langTag.className = 'wb-tag lang-tag';
      langTag.textContent = item.lang.toUpperCase();
      tags.appendChild(langTag);
    }

    if (tags.childElementCount > 0) {
      card.appendChild(tags);
    }

    // Click → open as new tab in Search mode
    card.addEventListener('click', () => {
      this.addTab(item.link);
      this.switchMode('search');
    });

    return card;
  }

  private formatRelativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.floor(hrs / 24) + 'd';
  }

  /* ══════════════════════════════
     Browser tabs (Search mode)
     ══════════════════════════════ */

  public addTab(url = HOME_URL): void {
    const id = 't' + Date.now() + Math.random().toString(36).slice(2, 6);
    this.tabs.push({ id, url, title: 'New Tab', history: [url], historyIndex: 0 });
    this.switchToTab(id);
  }

  private switchToTab(id: string): void {
    this.activeTabId = id;
    const tab = this.activeTab();
    if (tab) {
      this.urlInput.value = tab.url;
      this.loadContent(tab.url);
      this.updateNavState();
    }
    this.renderTabs();
  }

  private closeTab(id: string): void {
    if (this.tabs.length <= 1) return;
    const i = this.tabs.findIndex(t => t.id === id);
    if (i === -1) return;
    this.tabs.splice(i, 1);
    if (this.activeTabId === id) {
      const next = this.tabs[Math.min(i, this.tabs.length - 1)];
      if (next) this.switchToTab(next.id);
    } else this.renderTabs();
  }

  private activeTab(): TabState | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  private renderTabs(): void {
    this.tabBar.innerHTML = '';
    for (const tab of this.tabs) {
      const el = document.createElement('div');
      el.className = 'wb-browser-tab' + (tab.id === this.activeTabId ? ' active' : '');

      const lbl = document.createElement('span');
      lbl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;';
      lbl.textContent = tab.title || this.domain(tab.url);
      el.appendChild(lbl);

      if (this.tabs.length > 1) {
        const x = document.createElement('span');
        x.className = 'close';
        x.textContent = '\u00D7';
        x.addEventListener('click', e => { e.stopPropagation(); this.closeTab(tab.id); });
        el.appendChild(x);
      }
      el.addEventListener('click', () => this.switchToTab(tab.id));
      this.tabBar.appendChild(el);
    }
  }

  /* ── Navigation ── */

  public async navigateTo(raw: string, skipHistory = false): Promise<void> {
    let url = raw;
    if (!url.includes('://') && !url.startsWith('//')) {
      url = (url.includes('.') && !url.includes(' '))
        ? 'https://' + url
        : 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(url);
    }
    url = this.unwrapDdgRedirect(url);
    // url = await this.resolveGoogleNewsUrl(url) || url;
    console.log('Navigating to:', url);
    const tab = this.activeTab();
    if (!tab) return;
    tab.url = url;
    if (!skipHistory) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(url);
      tab.historyIndex = tab.history.length - 1;
    }
    this.urlInput.value = url;
    this.loadContent(url);
    this.updateNavState();
    this.renderTabs();
  }

  private goBack(): void {
    const t = this.activeTab();
    if (!t || t.historyIndex <= 0) return;
    t.historyIndex--;
    const url = t.history[t.historyIndex];
    if (!url) return;
    t.url = url;
    this.urlInput.value = t.url;
    this.loadContent(t.url);
    this.updateNavState();
  }

  private goForward(): void {
    const t = this.activeTab();
    if (!t || t.historyIndex >= t.history.length - 1) return;
    t.historyIndex++;
    const url = t.history[t.historyIndex];
    if (!url) return;
    t.url = url;
    this.urlInput.value = t.url;
    this.loadContent(t.url);
    this.updateNavState();
  }

  private reload(): void {
    const t = this.activeTab();
    if (t) this.loadContent(t.url);
  }

  private updateNavState(): void {
    const t = this.activeTab();
    this.backBtn.disabled = !t || t.historyIndex <= 0;
    this.forwardBtn.disabled = !t || t.historyIndex >= t.history.length - 1;
  }

  /* ── Content loading ── */

  private loadContent(url: string): void {
    if (isDesktopRuntime()) this.loadViaTauri(url);
    else this.loadViaProxy(url);
  }

  private loadViaTauri(url: string): void {
    this.viewportContainer.innerHTML = '';
    const status = document.createElement('div');
    status.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'height:100%;gap:8px;color:var(--text-muted,#666);font-size:12px;';
    const line1 = document.createElement('div');
    line1.textContent = 'Opening in native webview\u2026';
    const line2 = document.createElement('div');
    line2.style.cssText = 'opacity:.5;';
    line2.textContent = this.domain(url);
    status.append(line1, line2);
    this.viewportContainer.appendChild(status);

    const cmd = this.tauriWindowOpen ? 'navigate_browser_webview' : 'open_browser_webview';
    invokeTauri(cmd, { url }).then(() => {
      this.tauriWindowOpen = true;
      const tab = this.activeTab();
      if (tab) tab.title = this.domain(url);
      this.renderTabs();
    }).catch(err => {
      line1.textContent = 'Failed to open webview';
      line2.textContent = String(err);
    });
  }

  private loadViaProxy(url: string): void {
    this.viewportContainer.innerHTML = '';
    const proxyUrl = this.toProxyUrl(url);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:#fff;';
    iframe.referrerPolicy = 'no-referrer';
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads',
    );
    iframe.addEventListener('load', () => {
      const tab = this.activeTab();
      if (!tab) return;
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          if (doc.title) tab.title = doc.title;
          this.injectNavigationInterceptor(iframe);
        }
      } catch {
        tab.title = this.domain(tab.url);
      }
      this.renderTabs();
    });
    iframe.addEventListener('error', () => this.showError(url));
    iframe.src = proxyUrl;
    this.viewportContainer.appendChild(iframe);
  }

  private async resolveGoogleNewsUrl(rssUrl: string): Promise<string | null> {
    try {
        // 1. Fetch the initial RSS article page
        const { data: html } = await axios.get(rssUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
            }
        });

        // 2. Parse HTML to find the data-p attribute
        const $ = cheerio.load(html);
        const dataP = $('c-wiz[data-p]').attr('data-p');

        if (!dataP) {
            throw new Error("Could not find the required data-p attribute.");
        }

        // 3. Clean and parse the inner JSON object
        const cleanedData = dataP.replace('%.@.', '["garturlreq",');
        const obj = JSON.parse(cleanedData);

        // 4. Construct the BatchExecute payload
        // We slice the array similar to Python's obj[:-6] + obj[-2:]
        const processedObj = [...obj.slice(0, -6), ...obj.slice(-2)];
        
        const payload = new URLSearchParams();
        const innerReq = [['Fbv4je', JSON.stringify(processedObj), 'null', 'generic']];
        payload.append('f.req', JSON.stringify([innerReq]));

        // 5. POST to the BatchExecute endpoint
        const batchUrl = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
        const response = await axios.post(batchUrl, payload.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            }
        });

        // 6. Extract the final URL from the nested JSON response
        const rawText = response.data.replace(")]}'\n", "");
        const parsedBatch = JSON.parse(rawText);
        const arrayString = parsedBatch[0][2];
        const articleUrl = JSON.parse(arrayString)[1];

        return articleUrl;

    } catch (error) {
        console.error("Error decoding Google News URL:", error);
        return null;
    }
  }
  
  private unwrapDdgRedirect(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname === 'duckduckgo.com' && u.pathname === '/l/' && u.searchParams.has('uddg')) {
        return u.searchParams.get('uddg')!;
      }
    } catch { /* not a valid URL, return as-is */ }
    return url;
  }

  private injectNavigationInterceptor(iframe: HTMLIFrameElement): void {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.addEventListener('click', (e: MouseEvent) => {
        const anchor = (e.target as HTMLElement).closest?.('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        e.preventDefault();
        e.stopPropagation();
        let resolved = href;
        try { resolved = new URL(href, doc.baseURI || doc.location.href).href; } catch { /* keep raw */ }
        this.navigateTo(resolved);
      }, true);

      doc.addEventListener('submit', (e: Event) => {
        const form = e.target as HTMLFormElement;
        if (!form || form.method?.toLowerCase() === 'post') {
          const fd = new FormData(form);
          const q = fd.get('q');
          if (q) {
            e.preventDefault();
            this.navigateTo('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(String(q)));
            return;
          }
          return;
        }
        e.preventDefault();
        const fd = new FormData(form);
        const params = new URLSearchParams();
        fd.forEach((v, k) => params.set(k, String(v)));
        const action = form.action || doc.location.href;
        try {
          const base = new URL(action, doc.baseURI || doc.location.href);
          base.search = params.toString();
          this.navigateTo(base.href);
        } catch {
          this.navigateTo(action + '?' + params.toString());
        }
      }, true);
    } catch { /* cross-origin */ }
  }

  private toProxyUrl(url: string): string {
    try {
      const u = new URL(url);
      if (u.origin === location.origin) return url;
    } catch { return url; }
    return '/api/web-proxy?url=' + encodeURIComponent(url);
  }

  private showError(url: string): void {
    this.viewportContainer.innerHTML = '';
    const d = document.createElement('div');
    d.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'height:100%;gap:12px;color:var(--text-muted,#666);padding:24px;text-align:center;font-size:12px;';
    const icon = document.createElement('div');
    icon.style.fontSize = '20px';
    icon.textContent = '\u26A0\uFE0F';
    const msg = document.createElement('div');
    msg.textContent = 'Could not load this page.';
    const dom = document.createElement('div');
    dom.style.opacity = '.5';
    dom.textContent = this.domain(url);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Open externally \u2197';
    a.style.cssText = 'color:#60a5fa;font-size:12px;text-decoration:none;';
    d.append(icon, msg, dom, a);
    this.viewportContainer.appendChild(d);
  }

  /* ── Helpers ── */

  private makeBtn(label: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'wb-btn';
    btn.textContent = label;
    btn.title = title;
    return btn;
  }

  private domain(url: string): string {
    try { return new URL(url).hostname; } catch { return url.slice(0, 30); }
  }

  public destroy(): void {
    this.viewportContainer.innerHTML = '';
    this.element.remove();
  }
}