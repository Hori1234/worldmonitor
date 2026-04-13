// src/components/BrowserView/WebBrowser.ts
import { Panel } from '../Panel';
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
const TAURI_BROWSER_LABEL = 'browser-webview';

export class WebBrowser extends Panel {
  private tabs: TabState[] = [];
  private activeTabId: string = '';

  // DOM nodes
  private navBar: HTMLElement;
  private tabBar: HTMLElement;
  private viewportContainer: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private urlInput: HTMLInputElement;
  private backBtn: HTMLButtonElement;
  private forwardBtn: HTMLButtonElement;
  private refreshBtn: HTMLButtonElement;
  private newTabBtn: HTMLButtonElement;
  private tauriPopoutBtn: HTMLButtonElement | null = null;

  // Tauri external webview state
  private tauriWindowOpen = false;

  constructor() {
    super({ id: 'web-browser-panel', title: 'Browser' });

    const el = this.getElement();
    el.style.height = '100%';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.overflow = 'hidden';

    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';
    this.content.style.flex = '1';
    this.content.style.padding = '0';
    this.content.style.overflow = 'hidden';
    this.content.innerHTML = '';

    // ── Tab bar ──
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'browser-tab-bar';
    this.tabBar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:0',
      'background:var(--bg-secondary,#1e1e1e)', 'border-bottom:1px solid var(--border,#333)',
      'min-height:32px', 'padding:0 4px', 'overflow-x:auto', 'flex-shrink:0',
    ].join(';');

    // ── Nav bar ──
    this.navBar = document.createElement('div');
    this.navBar.className = 'browser-nav-bar';
    this.navBar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:6px', 'padding:6px 8px',
      'background:var(--bg-secondary,#1e1e1e)', 'border-bottom:1px solid var(--border,#333)',
      'flex-shrink:0',
    ].join(';');

    // Back
    this.backBtn = this.makeNavBtn('\u25C0', 'Back');
    this.backBtn.addEventListener('click', () => this.goBack());

    // Forward
    this.forwardBtn = this.makeNavBtn('\u25B6', 'Forward');
    this.forwardBtn.addEventListener('click', () => this.goForward());

    // Refresh
    this.refreshBtn = this.makeNavBtn('\u21BB', 'Refresh');
    this.refreshBtn.addEventListener('click', () => this.reload());

    // URL input
    this.urlInput = document.createElement('input');
    this.urlInput.type = 'text';
    this.urlInput.className = 'browser-url-input';
    this.urlInput.placeholder = 'Enter URL or search...';
    this.urlInput.style.cssText = [
      'flex:1', 'height:28px', 'padding:0 10px',
      'border:1px solid var(--border,#444)', 'border-radius:6px',
      'background:var(--bg,#111)', 'color:var(--text,#eee)',
      'font-size:13px', 'outline:none',
    ].join(';');
    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigateTo(this.urlInput.value.trim());
      }
    });
    this.urlInput.addEventListener('focus', () => {
      this.urlInput.select();
    });

    // New tab
    this.newTabBtn = this.makeNavBtn('+', 'New Tab');
    this.newTabBtn.style.fontWeight = 'bold';
    this.newTabBtn.style.fontSize = '16px';
    this.newTabBtn.addEventListener('click', () => this.addTab());

    this.navBar.appendChild(this.backBtn);
    this.navBar.appendChild(this.forwardBtn);
    this.navBar.appendChild(this.refreshBtn);
    this.navBar.appendChild(this.urlInput);
    this.navBar.appendChild(this.newTabBtn);

    // Desktop-only: Tauri pop-out button for X-Frame-Options bypass
    if (isDesktopRuntime()) {
      this.tauriPopoutBtn = this.makeNavBtn('\u2197', 'Open in Webview');
      this.tauriPopoutBtn.title = 'Open current URL in a native Tauri webview (bypasses iframe restrictions)';
      this.tauriPopoutBtn.addEventListener('click', () => this.openInTauriWebview());
      this.navBar.appendChild(this.tauriPopoutBtn);
    }

    // ── Viewport ──
    this.viewportContainer = document.createElement('div');
    this.viewportContainer.className = 'browser-viewport';
    this.viewportContainer.style.cssText = 'flex:1;position:relative;overflow:hidden;background:#0d0d0d;';

    this.content.appendChild(this.tabBar);
    this.content.appendChild(this.navBar);
    this.content.appendChild(this.viewportContainer);

    // Create first tab
    this.addTab(HOME_URL);
  }

  // ────────────── Tab management ──────────────

  public addTab(url: string = HOME_URL): void {
    const id = 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const tab: TabState = {
      id,
      url,
      title: 'New Tab',
      history: [url],
      historyIndex: 0,
    };
    this.tabs.push(tab);
    this.switchToTab(id);
    this.renderTabBar();
    this.navigateTo(url, true);
  }

  private switchToTab(tabId: string): void {
    this.activeTabId = tabId;
    const tab = this.getActiveTab();
    if (tab) {
      this.urlInput.value = tab.url;
      this.loadIframe(tab.url);
      this.updateNavState();
    }
    this.renderTabBar();
  }

  private closeTab(tabId: string): void {
    if (this.tabs.length <= 1) return; // keep at least one tab
    const idx = this.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    this.tabs.splice(idx, 1);

    if (this.activeTabId === tabId) {
      const newIdx = Math.min(idx, this.tabs.length - 1);
      this.switchToTab(this.tabs[newIdx]!.id);
    }
    this.renderTabBar();
  }

  private getActiveTab(): TabState | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  private renderTabBar(): void {
    this.tabBar.innerHTML = '';

    for (const tab of this.tabs) {
      const tabEl = document.createElement('div');
      tabEl.className = 'browser-tab' + (tab.id === this.activeTabId ? ' active' : '');
      tabEl.style.cssText = [
        'display:flex', 'align-items:center', 'gap:6px',
        'padding:4px 10px', 'font-size:12px', 'cursor:pointer',
        'color:var(--text,#ccc)', 'border-right:1px solid var(--border,#333)',
        'max-width:180px', 'min-width:80px', 'white-space:nowrap', 'overflow:hidden',
        tab.id === this.activeTabId
          ? 'background:var(--bg,#111);color:var(--text,#fff)'
          : 'background:transparent',
      ].join(';');

      const label = document.createElement('span');
      label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;';
      label.textContent = tab.title || this.extractDomain(tab.url);
      tabEl.appendChild(label);

      if (this.tabs.length > 1) {
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00D7';
        closeBtn.style.cssText = 'cursor:pointer;font-size:14px;color:var(--text-muted,#888);padding:0 2px;';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeTab(tab.id);
        });
        tabEl.appendChild(closeBtn);
      }

      tabEl.addEventListener('click', () => this.switchToTab(tab.id));
      this.tabBar.appendChild(tabEl);
    }
  }

  // ────────────── Navigation ──────────────

  public navigateTo(rawUrl: string, skipHistory = false): void {
    let url = rawUrl;

    // If it doesn't look like a URL, treat it as a search query
    if (!url.includes('://') && !url.startsWith('//')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(url);
      }
    }

    const tab = this.getActiveTab();
    if (tab) {
      tab.url = url;
      if (!skipHistory) {
        // Trim forward history when navigating from middle
        tab.history = tab.history.slice(0, tab.historyIndex + 1);
        tab.history.push(url);
        tab.historyIndex = tab.history.length - 1;
      }
      this.urlInput.value = url;
      this.loadIframe(url);
      this.updateNavState();
      this.renderTabBar();
    }
  }

  private goBack(): void {
    const tab = this.getActiveTab();
    if (!tab || tab.historyIndex <= 0) return;
    tab.historyIndex--;
    tab.url = tab.history[tab.historyIndex]!;
    this.urlInput.value = tab.url;
    this.loadIframe(tab.url);
    this.updateNavState();
  }

  private goForward(): void {
    const tab = this.getActiveTab();
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    tab.historyIndex++;
    tab.url = tab.history[tab.historyIndex]!;
    this.urlInput.value = tab.url;
    this.loadIframe(tab.url);
    this.updateNavState();
  }

  private reload(): void {
    const tab = this.getActiveTab();
    if (tab) {
      this.loadIframe(tab.url);
    }
  }

  private updateNavState(): void {
    const tab = this.getActiveTab();
    this.backBtn.disabled = !tab || tab.historyIndex <= 0;
    this.forwardBtn.disabled = !tab || tab.historyIndex >= tab.history.length - 1;
    this.backBtn.style.opacity = this.backBtn.disabled ? '0.35' : '1';
    this.forwardBtn.style.opacity = this.forwardBtn.disabled ? '0.35' : '1';
  }

  // ────────────── Iframe viewport ──────────────

  private loadIframe(url: string): void {
    // Remove old iframe
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }

    // Clear any error messages
    this.viewportContainer.innerHTML = '';

    this.iframe = document.createElement('iframe');
    this.iframe.className = 'browser-iframe';
      this.iframe.style.cssText = 'width:100%;height:100%;border:none;background:#fff;';
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads');
    this.iframe.setAttribute('referrerpolicy', 'no-referrer');

    // Handle load — try reading title, detect blocked content
    this.iframe.addEventListener('load', () => {
      const tab = this.getActiveTab();
      if (tab) {
        try {
          const doc = this.iframe?.contentDocument;
          // Detect blank/blocked page (CSP or X-Frame-Options rejection)
          if (doc && (doc.body?.innerText?.trim() === '' || doc.body?.childElementCount === 0) && doc.title === '') {
            this.showIframeError(tab.url);
            return;
          }
          if (doc?.title) tab.title = doc.title;
        } catch {
          // Cross-origin — can't read title, which means the site DID load
          tab.title = this.extractDomain(tab.url);
        }
        this.renderTabBar();
      }
    });

    this.iframe.addEventListener('error', () => {
      this.showIframeError(url);
    });

    this.iframe.src = url;
    this.viewportContainer.appendChild(this.iframe);
  }

  private showIframeError(url: string): void {
    this.viewportContainer.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.style.cssText = [
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
      'height:100%', 'gap:12px', 'color:var(--text-muted,#888)', 'padding:24px', 'text-align:center',
    ].join(';');

    const msg = document.createElement('div');
    msg.textContent = 'This site cannot be displayed in an embedded frame.';

    const domainSpan = document.createElement('div');
    domainSpan.style.cssText = 'font-size:12px;opacity:0.7;';
    domainSpan.textContent = this.extractDomain(url) + ' blocks iframe embedding.';

    errDiv.appendChild(msg);
    errDiv.appendChild(domainSpan);

    if (isDesktopRuntime()) {
      const tauriBtn = document.createElement('button');
      tauriBtn.textContent = 'Open in Native Webview';
      tauriBtn.style.cssText = [
        'padding:8px 16px', 'border-radius:6px', 'border:1px solid var(--border,#555)',
        'background:var(--accent,#2563eb)', 'color:#fff', 'cursor:pointer', 'font-size:13px',
      ].join(';');
      tauriBtn.addEventListener('click', () => this.openInTauriWebview());
      errDiv.appendChild(tauriBtn);
    } else {
      const extLink = document.createElement('a');
      extLink.href = url;
      extLink.target = '_blank';
      extLink.rel = 'noopener noreferrer';
      extLink.textContent = 'Open in new browser tab \u2197';
      extLink.style.cssText = 'color:var(--accent,#60a5fa);font-size:13px;';
      errDiv.appendChild(extLink);
    }

    this.viewportContainer.appendChild(errDiv);
  }

  // ────────────── Tauri native webview ──────────────

  private async openInTauriWebview(): Promise<void> {
    const tab = this.getActiveTab();
    if (!tab) return;

    try {
      if (this.tauriWindowOpen) {
        // Navigate existing window
        await invokeTauri('navigate_browser_webview', { url: tab.url });
      } else {
        // Spawn new Tauri browsing window
        await invokeTauri('open_browser_webview', { url: tab.url });
        this.tauriWindowOpen = true;
      }
    } catch (err) {
      console.warn('[WebBrowser] Tauri webview command failed:', err);
      // Fallback: open in default system browser
      window.open(tab.url, '_blank', 'noopener');
    }
  }

  // ────────────── Helpers ──────────────

  private makeNavBtn(label: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.title = title;
    btn.style.cssText = [
      'width:28px', 'height:28px', 'border:none', 'border-radius:4px',
      'background:transparent', 'color:var(--text,#ccc)', 'cursor:pointer',
      'font-size:14px', 'display:flex', 'align-items:center', 'justify-content:center',
      'transition:background 0.15s',
    ].join(';');
    btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--bg-hover,rgba(255,255,255,0.1))'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
    return btn;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url.slice(0, 30);
    }
  }

  public override destroy(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    super.destroy();
  }
}