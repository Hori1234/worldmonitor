// src/components/BrowserView/BrowserView.ts
import { NestedPanelLayout } from '../NestedPanelLayout';
import { NewsSidebar } from './NewsSidebar';
import { WebBrowser } from './WebBrowser';

export class BrowserView extends NestedPanelLayout {
  private newsSidebar: NewsSidebar;
  private webBrowser: WebBrowser;

  constructor() {
    super({
      id: 'browser-view',
      title: 'Browser',
    });

    // Override the default grid layout with a 30/70 horizontal split
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'row';
    this.content.style.gridTemplateColumns = '';
    this.content.style.gap = '0';
    this.content.style.padding = '0';
    this.content.style.overflow = 'hidden';
    this.content.style.height = '100%';

    // Create the browser panel first so we can pass its navigate method to the sidebar
    this.webBrowser = new WebBrowser();

    // News sidebar: clicking a headline navigates the webview
    this.newsSidebar = new NewsSidebar((url: string) => {
      this.webBrowser.navigateTo(url);
    });

    // 30% sidebar
    const sidebarEl = this.newsSidebar.getElement();
    sidebarEl.style.width = '30%';
    sidebarEl.style.minWidth = '240px';
    sidebarEl.style.maxWidth = '400px';
    sidebarEl.style.height = '100%';
    sidebarEl.style.borderRight = '1px solid var(--border, #333)';
    sidebarEl.style.flexShrink = '0';

    // 70% browser
    const browserEl = this.webBrowser.getElement();
    browserEl.style.flex = '1';
    browserEl.style.height = '100%';
    browserEl.style.minWidth = '0';

    // Append directly (bypass addSubPanel to avoid drag setup on these)
    this.content.appendChild(sidebarEl);
    this.content.appendChild(browserEl);

    // Add a resize handle between the two panes
    this.setupSplitResizer(sidebarEl, browserEl);
  }

  private setupSplitResizer(leftEl: HTMLElement, rightEl: HTMLElement): void {
    const handle = document.createElement('div');
    handle.className = 'browser-split-handle';
    handle.style.cssText = [
      'width:5px', 'cursor:col-resize', 'background:var(--border,#333)',
      'flex-shrink:0', 'transition:background 0.15s', 'z-index:10',
    ].join(';');

    handle.addEventListener('mouseenter', () => { handle.style.background = 'var(--accent,#2563eb)'; });
    handle.addEventListener('mouseleave', () => {
      if (!isResizing) handle.style.background = 'var(--border,#333)';
    });

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(600, startWidth + delta));
      leftEl.style.width = newWidth + 'px';
    };

    const onMouseUp = () => {
      isResizing = false;
      handle.style.background = 'var(--border,#333)';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startWidth = leftEl.getBoundingClientRect().width;
      handle.style.background = 'var(--accent,#2563eb)';
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Insert handle between sidebar and browser
    this.content.insertBefore(handle, rightEl);
  }

public popOut(): void {
        // The pop-out button is the last .live-mute-btn in the panel header
        const buttons = this.getElement().querySelectorAll('.panel-header .live-mute-btn');
        const popBtn = buttons[buttons.length - 1] as HTMLElement | undefined;
        if (popBtn) {
        popBtn.click();
        }
}
  public override destroy(): void {
    this.newsSidebar.destroy();
    this.webBrowser.destroy();
    super.destroy();
  }
}