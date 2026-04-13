import { NewsSidebar } from './NewsSidebar';
import { WebBrowser } from './WebBrowser';

export class BrowserView {
  private newsSidebar: NewsSidebar;
  private webBrowser: WebBrowser;
  public readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.cssText = 'display:flex;flex-direction:row;width:100%;height:100%;overflow:hidden;background:var(--bg,#111);';

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

    this.element.append(sidebarEl, handle, browserEl);
  }

  public getElement(): HTMLElement { return this.element; }

  public destroy(): void {
    this.newsSidebar.destroy();
    this.webBrowser.destroy();
    this.element.remove();
  }
}