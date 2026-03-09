import { Panel } from './Panel';

export class TestPanel extends Panel {
  private counter: number = 0;
  
  private originalParent: HTMLElement | null = null;
  private placeholderNode: HTMLElement | null = null;
  private externalWindow: Window | null = null;
  private isMaximized = false;
  constructor() {
    super({ id: 'test-panel', title: 'Test Panel' });

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.marginLeft = 'auto'; 

    // Create Pop-out Button
    const popBtn = document.createElement('button');
    popBtn.textContent = '⧉'; // Pop-out symbol
    popBtn.style.cursor = 'pointer';
    popBtn.style.fontSize = '14px';   
    popBtn.style.marginRight = '10px'; 
    popBtn.style.width = '25px';
    popBtn.style.height = '25px'; 

    popBtn.onclick = (e) => {
      e.stopPropagation();
      
      // If already popped out, close it (which brings it back via the unload event)
      if (this.externalWindow && !this.externalWindow.closed) {
        this.externalWindow.close();
        return;
      }
      
      // 1. Open a new external window
      this.externalWindow = window.open('', 'TestPanelWindow', 'width=450,height=400,left=200,top=200');
      
      if (!this.externalWindow) {
        alert('Popup blocked! Please allow popups for this site.');
        return;
      }

      // 2. Copy the main app's stylesheets over to the new window so it looks right
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('\n');

      this.externalWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Popped Out: Test Panel</title>
            ${styles}
            <style>
              body { background: var(--bg); margin: 0; padding: 0; display: flex; width: 100vw; height: 100vh; }
              #popout-root { flex: 1; display: flex; padding: 10px; }
              /* Force the panel to fill the popout window */
              #popout-root > .panel { width: 100%; height: 100%; border: none; margin: 0; }
            </style>
          </head>
          <body>
            <div id="popout-root"></div>
          </body>
        </html>
      `);
      this.externalWindow.document.close();

      // 3. Save current location and create a placeholder message in the main app
      this.originalParent = this.element.parentElement;
      this.placeholderNode = document.createElement('div');
      this.placeholderNode.style.width = this.element.offsetWidth + 'px';
      this.placeholderNode.style.height = this.element.offsetHeight + 'px';
      this.placeholderNode.style.display = 'flex';
      this.placeholderNode.style.alignItems = 'center';
      this.placeholderNode.style.justifyContent = 'center';
      this.placeholderNode.style.color = 'var(--text-muted, #888)';
      this.placeholderNode.style.border = '1px dashed var(--border, #444)';
      this.placeholderNode.textContent = 'Panel popped out to a new window...';
      
      if (this.originalParent) {
        this.originalParent.replaceChild(this.placeholderNode, this.element);
      }

      // 4. Move the actual live panel DOM node to the new window
      const targetRoot = this.externalWindow.document.getElementById('popout-root');
      if (targetRoot) {
        targetRoot.appendChild(this.element);
      }

      // 5. Setup a listener to pull it back when the new window is closed
      this.externalWindow.onbeforeunload = () => {
        if (this.originalParent && this.placeholderNode) {
          this.originalParent.replaceChild(this.element, this.placeholderNode);
          this.originalParent = null;
          this.placeholderNode = null;
        }
        this.externalWindow = null;
      };
    };

    // 2. Create Maximize Button
    const maxBtn = document.createElement('button');
    maxBtn.textContent = '□'; // square for maximize
    maxBtn.style.cursor = 'pointer';
    maxBtn.style.fontSize = '12px';   
    maxBtn.style.width = '25px';
    maxBtn.style.height = '25px'; 

    maxBtn.onclick = (e) => {
      e.stopPropagation();
      this.isMaximized = !this.isMaximized;
      
      if (this.isMaximized) {
        // --- EVADE STACKING CONTEXTS ---
        // 1. Save original parent and create an invisible placeholder
        this.originalParent = this.element.parentElement;
        this.placeholderNode = document.createElement('div');
        // Prevent layout shift in the background
        this.placeholderNode.style.width = this.element.offsetWidth + 'px';
        this.placeholderNode.style.height = this.element.offsetHeight + 'px';
        
        // 2. Swap placeholder in, and move panel to the very top (body)
        if (this.originalParent) {
          this.originalParent.insertBefore(this.placeholderNode, this.element);
          document.body.appendChild(this.element);
        }

        // 3. Apply fullscreen styling
        this.element.style.position = 'fixed';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100vw';
        this.element.style.height = '100vh';
        this.element.style.zIndex = '999999'; // Guaranteed to cover everything
        this.element.style.margin = '0';
        this.element.style.borderRadius = '0'; // Flatten edges
      } else {
        // --- RESTORE ORIGINAL STATE ---
        // 1. Revert fullscreen styling
        this.element.style.position = '';
        this.element.style.top = '';
        this.element.style.left = '';
        this.element.style.width = '';
        this.element.style.height = '';
        this.element.style.zIndex = '';
        this.element.style.margin = '';
        this.element.style.borderRadius = '';

        // 2. Return panel to its original column layout
        if (this.originalParent && this.placeholderNode) {
          this.originalParent.replaceChild(this.element, this.placeholderNode);
          this.originalParent = null;
          this.placeholderNode = null;
        }
      }
    };

    // Attach controls to header
    controls.appendChild(maxBtn);
    controls.appendChild(popBtn);
    this.header.appendChild(controls);

    this.render();
  }

  private render(): void {
    this.content.style.padding = '12px';
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';
    this.content.style.gap = '8px';

    this.content.innerHTML = `
      <div style="color: var(--text);">Hello from my brand new panel!</div>
      <div id="counter-display" style="font-size: 24px; font-weight: bold; color: var(--accent);">
        ${this.counter}
      </div>
      <button id="increment-btn" style="padding: 4px 8px; cursor: pointer; background: var(--header-bg); border: 1px solid var(--border); color: var(--text);">
        Click Me
      </button>
    `;

    const btn = this.content.querySelector('#increment-btn');
    const display = this.content.querySelector('#counter-display');

    btn?.addEventListener('click', () => {
      this.counter++;
      if (display) {
        display.textContent = this.counter.toString();
      }
      console.log(`Button clicked! Counter is now: ${this.counter}`);
    });
  }

  public destroy(): void {
    if (this.externalWindow && !this.externalWindow.closed) {
      this.externalWindow.close();
    }
    console.log('TestPanel destroyed!');
    super.destroy();
  }
}