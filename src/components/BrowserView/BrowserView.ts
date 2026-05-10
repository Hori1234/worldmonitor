import { NewsSidebar } from './NewsSidebar';
import { WebBrowser } from './WebBrowser';
import { hasTauriInvokeBridge, invokeTauri } from '@/services/tauri-bridge';

export class BrowserView {
  private newsSidebar: NewsSidebar;
  private webBrowser: WebBrowser;
  public readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;background:var(--bg,#111);';

    // ── Custom titlebar (window controls) ──
    const titlebar = document.createElement('div');
    titlebar.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;padding:0 8px;height:32px;' +
      'background:var(--bg-secondary,#0a0a0a);border-bottom:1px solid var(--border,#2a2a2a);' +
      'flex-shrink:0;user-select:none;-webkit-user-select:none;';
    titlebar.setAttribute('data-tauri-drag-region', '');

    const tbTitle = document.createElement('span');
    tbTitle.textContent = 'World Monitor Browser';
    tbTitle.style.cssText = 'font-size:11px;color:var(--text-muted,#666);letter-spacing:.04em;pointer-events:none;';

    const winControls = document.createElement('div');
    winControls.style.cssText = 'display:flex;align-items:center;gap:2px;';

    const btnBase =
      'width:28px;height:22px;border:none;border-radius:4px;background:transparent;' +
      'color:var(--text-dim,#888);cursor:pointer;font-size:14px;display:flex;align-items:center;' +
      'justify-content:center;transition:background .12s,color .12s;';

    const minBtn = document.createElement('button');
    minBtn.title = 'Minimize';
    minBtn.innerHTML = '&#x2212;';
    minBtn.style.cssText = btnBase;
    minBtn.addEventListener('mouseenter', () => { minBtn.style.background = 'rgba(255,255,255,0.08)'; minBtn.style.color = '#e8e8e8'; });
    minBtn.addEventListener('mouseleave', () => { minBtn.style.background = 'transparent'; minBtn.style.color = 'var(--text-dim,#888)'; });
    minBtn.addEventListener('click', () => {
      if (hasTauriInvokeBridge()) invokeTauri('minimize_browser_chrome').catch(() => {});
    });

    const maxBtn = document.createElement('button');
    maxBtn.title = 'Maximize / Restore';
    maxBtn.innerHTML = '&#x25A1;';
    maxBtn.style.cssText = btnBase;
    maxBtn.addEventListener('mouseenter', () => { maxBtn.style.background = 'rgba(255,255,255,0.08)'; maxBtn.style.color = '#e8e8e8'; });
    maxBtn.addEventListener('mouseleave', () => { maxBtn.style.background = 'transparent'; maxBtn.style.color = 'var(--text-dim,#888)'; });
    maxBtn.addEventListener('click', () => {
      if (hasTauriInvokeBridge()) {
        invokeTauri('toggle_maximize_browser_chrome').catch(() => {});
      } else {
        if (window.outerWidth < screen.availWidth || window.outerHeight < screen.availHeight) {
          window.moveTo(0, 0);
          window.resizeTo(screen.availWidth, screen.availHeight);
        }
      }
    });

    const closeBtn = document.createElement('button');
    closeBtn.title = 'Close';
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.style.cssText = btnBase;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(220,38,38,0.75)'; closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = 'var(--text-dim,#888)'; });
    closeBtn.addEventListener('click', () => {
      if (hasTauriInvokeBridge()) invokeTauri('close_browser_chrome').catch(() => {});
      else window.close();
    });

    winControls.append(minBtn, maxBtn, closeBtn);
    titlebar.append(tbTitle, winControls);

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;padding:10px 16px;' +
      'background:var(--bg-secondary,#0a0a0a);border-bottom:1px solid var(--border,#2a2a2a);flex-shrink:0;';

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
    const icon = document.createElement('span');
    icon.textContent = '\uD83C\uDF10';
    icon.style.fontSize = '16px';
    const title = document.createElement('span');
    title.textContent = 'News Search';
    title.style.cssText = 'font-size:14px;font-weight:600;color:var(--text,#e8e8e8);letter-spacing:.02em;';
    titleWrap.append(icon, title);
    header.appendChild(titleWrap);

    // ── Body (sidebar + browser) ──
    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:row;flex:1;overflow:hidden;';

    this.webBrowser = new WebBrowser();

    this.newsSidebar = new NewsSidebar((url: string) => {
      this.webBrowser.navigateTo(url);
    });

    const sidebarEl = this.newsSidebar.getElement();
    sidebarEl.style.width = '30%';
    sidebarEl.style.minWidth = '240px';
    sidebarEl.style.maxWidth = '400px';
    sidebarEl.style.height = '100%';
    sidebarEl.style.borderRight = '1px solid var(--border,#333)';
    sidebarEl.style.flexShrink = '0';
    sidebarEl.style.paddingRight = '4px';

    const browserEl = this.webBrowser.getElement();
    browserEl.style.flex = '1';
    browserEl.style.height = '100%';
    browserEl.style.minWidth = '0';

    // Resize handle
    const handle = document.createElement('div');
    handle.style.cssText = 'width:5px;cursor:col-resize;background:var(--border,#333);flex-shrink:0;transition:background 0.15s;';
    handle.addEventListener('mouseenter', () => { handle.style.background = 'var(--accent,#2563eb)'; });
    handle.addEventListener('mouseleave', () => { if (!resizing) handle.style.background = 'var(--border,#333)'; });

    let resizing = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      e.preventDefault();
      sidebarEl.style.width = Math.max(180, Math.min(600, startWidth + e.clientX - startX)) + 'px';
    };
    const onMouseUp = () => {
      resizing = false;
      handle.style.background = 'var(--border,#333)';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizing = true;
      startX = e.clientX;
      startWidth = sidebarEl.getBoundingClientRect().width;
      handle.style.background = 'var(--accent,#2563eb)';
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    body.append(sidebarEl, handle, browserEl);
    this.element.append(titlebar, header, body);
  }

  public getElement(): HTMLElement { return this.element; }

  public destroy(): void {
    this.newsSidebar.destroy();
    this.webBrowser.destroy();
    this.element.remove();
  }
}