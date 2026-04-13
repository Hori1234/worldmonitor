import { isDesktopRuntime } from '@/services/runtime';
import { invokeTauri } from '@/services/tauri-bridge';

interface TabState {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
}

const HOME_URL = 'https://lite.duckduckgo.com/lite/';

export class WebBrowser {
  private tabs: TabState[] = [];
  private activeTabId = '';
  private tauriWindowOpen = false;

  public readonly element: HTMLElement;
  private tabBar: HTMLElement;
  private navBar: HTMLElement;
  private viewportContainer: HTMLElement;
  private urlInput: HTMLInputElement;
  private backBtn: HTMLButtonElement;
  private forwardBtn: HTMLButtonElement;
  private refreshBtn: HTMLButtonElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = 'display:flex;flex-direction:column;height:100%;min-width:0;flex:1;';

    // Tab bar
    this.tabBar = document.createElement('div');
    this.tabBar.style.cssText = 'display:flex;align-items:center;background:var(--bg-secondary,#1a1c1e);border-bottom:1px solid var(--border,#333);min-height:32px;padding:0 4px;overflow-x:auto;flex-shrink:0;';

    // Nav bar
    this.navBar = document.createElement('div');
    this.navBar.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--bg-secondary,#1a1c1e);border-bottom:1px solid var(--border,#333);flex-shrink:0;';

    this.backBtn = this.makeBtn('\u25C0', 'Back');
    this.backBtn.disabled = true;
    this.backBtn.style.opacity = '0.35';
    this.backBtn.addEventListener('click', () => this.goBack());

    this.forwardBtn = this.makeBtn('\u25B6', 'Forward');
    this.forwardBtn.disabled = true;
    this.forwardBtn.style.opacity = '0.35';
    this.forwardBtn.addEventListener('click', () => this.goForward());

    this.refreshBtn = this.makeBtn('\u21BB', 'Refresh');
    this.refreshBtn.addEventListener('click', () => this.reload());

    this.urlInput = document.createElement('input');
    this.urlInput.type = 'text';
    this.urlInput.placeholder = 'Enter URL or search...';
    this.urlInput.style.cssText = 'flex:1;height:28px;padding:0 10px;border:1px solid var(--border,#444);border-radius:6px;background:var(--bg,#111);color:var(--text,#eee);font-size:13px;outline:none;';
    this.urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.navigateTo(this.urlInput.value.trim()); });
    this.urlInput.addEventListener('focus', () => this.urlInput.select());

    const newTabBtn = this.makeBtn('+', 'New Tab');
    newTabBtn.style.fontWeight = 'bold';
    newTabBtn.style.fontSize = '16px';
    newTabBtn.addEventListener('click', () => this.addTab());

    this.navBar.append(this.backBtn, this.forwardBtn, this.refreshBtn, this.urlInput, newTabBtn);

    // Viewport
    this.viewportContainer = document.createElement('div');
    this.viewportContainer.style.cssText = 'flex:1;position:relative;overflow:hidden;background:#0d0d0d;';

    this.element.append(this.tabBar, this.navBar, this.viewportContainer);
    this.addTab(HOME_URL);
  }

  public getElement(): HTMLElement { return this.element; }

  // ── Tabs ──

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
      const nextTab = this.tabs[Math.min(i, this.tabs.length - 1)];
      if (nextTab) this.switchToTab(nextTab.id);
    } else this.renderTabs();
  }

  private activeTab(): TabState | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  private renderTabs(): void {
    this.tabBar.innerHTML = '';
    for (const tab of this.tabs) {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 10px;font-size:12px;cursor:pointer;color:#ccc;border-right:1px solid var(--border,#333);max-width:180px;min-width:80px;white-space:nowrap;overflow:hidden;'
        + (tab.id === this.activeTabId ? 'background:var(--bg,#111);color:#fff;' : '');
      const lbl = document.createElement('span');
      lbl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;';
      lbl.textContent = tab.title || this.domain(tab.url);
      el.appendChild(lbl);
      if (this.tabs.length > 1) {
        const x = document.createElement('span');
        x.textContent = '\u00D7';
        x.style.cssText = 'cursor:pointer;font-size:14px;color:var(--text-muted,#888);padding:0 2px;';
        x.addEventListener('click', e => { e.stopPropagation(); this.closeTab(tab.id); });
        el.appendChild(x);
      }
      el.addEventListener('click', () => this.switchToTab(tab.id));
      this.tabBar.appendChild(el);
    }
  }

  // ── Navigation ──

  public navigateTo(raw: string, skipHistory = false): void {
    let url = raw;
    if (!url.includes('://') && !url.startsWith('//')) {
      url = (url.includes('.') && !url.includes(' '))
        ? 'https://' + url
        : 'https://duckduckgo.com/?q=' + encodeURIComponent(url);
    }
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
    this.backBtn.style.opacity = this.backBtn.disabled ? '0.35' : '1';
    this.forwardBtn.style.opacity = this.forwardBtn.disabled ? '0.35' : '1';
  }

  // ── Content loading ──

  private loadContent(url: string): void {
    if (isDesktopRuntime()) {
      this.loadViaTauri(url);
    } else {
      this.loadViaProxy(url);
    }
  }

  private loadViaTauri(url: string): void {
    this.viewportContainer.innerHTML = '';
    const status = document.createElement('div');
    status.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--text-muted,#888);';
    const line1 = document.createElement('div');
    line1.textContent = 'Opening in native webview...';
    const line2 = document.createElement('div');
    line2.style.cssText = 'font-size:12px;opacity:0.7;';
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
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads');
    iframe.addEventListener('load', () => {
      const tab = this.activeTab();
      if (!tab) return;
      try { const t = iframe.contentDocument?.title; if (t) tab.title = t; } catch { tab.title = this.domain(tab.url); }
      this.renderTabs();
    });
    iframe.addEventListener('error', () => this.showError(url));
    iframe.src = proxyUrl;
    this.viewportContainer.appendChild(iframe);
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
    d.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--text-muted,#888);padding:24px;text-align:center;';
    const icon = document.createElement('div');
    icon.style.fontSize = '24px';
    icon.textContent = '\u26A0\uFE0F';
    const msg = document.createElement('div');
    msg.textContent = 'Could not load this page.';
    const dom = document.createElement('div');
    dom.style.cssText = 'font-size:12px;opacity:0.7;';
    dom.textContent = this.domain(url);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Open in new browser tab \u2197';
    a.style.cssText = 'color:#60a5fa;font-size:13px;';
    d.append(icon, msg, dom, a);
    this.viewportContainer.appendChild(d);
  }

  // ── Helpers ──

  private makeBtn(label: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.title = title;
    btn.style.cssText = 'width:28px;height:28px;border:none;border-radius:4px;background:transparent;color:var(--text,#ccc);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;';
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
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