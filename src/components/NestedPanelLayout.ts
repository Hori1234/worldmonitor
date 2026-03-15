// src/components/NestedPanelLayout.ts
import { PopUpPanel } from './PopUpPanel';
import { Panel, type PanelOptions } from './Panel';

export interface NestedPanelOptions extends Partial<PanelOptions> {
  subPanels?: Panel[];
}

export class NestedPanelLayout extends PopUpPanel {
  protected subPanels: Panel[] = [];

  constructor(options?: NestedPanelOptions) {
    super({ 
      id: options?.id || 'nested-dashboard', 
      title: options?.title || 'Nested Layout',
      ...options
    });
    
    this.setupGridLayout();

    // If sub-panels were passed in the options, add them immediately
    if (options?.subPanels) {
      options.subPanels.forEach(panel => this.addSubPanel(panel));
    }
  }

  /**
   * Configures the CSS Grid for this container panel.
   */
  private setupGridLayout(): void {
    // 1. FIX: Clear the default loading indicator inherited from Panel.ts
    this.content.innerHTML = ''; 

    this.content.style.display = 'grid';
    this.content.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
    this.content.style.gridAutoRows = 'min-content';
    this.content.style.gap = '16px';
    this.content.style.padding = '16px';
    this.content.style.overflowY = 'auto'; 
  }

  /**
   * Dynamically appends a new panel into this nested layout and makes it draggable.
   */
  public addSubPanel(panel: Panel): void {
    this.subPanels.push(panel);
    this.content.appendChild(panel.getElement());
    this.makeDraggable(panel);
  }

  /**
   * Transforms any Panel into a draggable item completely scoped to `this.content` 
   * and aware of its current window context (important for pop-outs).
   */
  private makeDraggable(panel: Panel): void {
    const el = panel.getElement();
    const header = el.querySelector('.panel-header') as HTMLElement;
    if (!header) return;

    header.style.cursor = 'grab';

    let isDragging = false;
    let placeholder: HTMLElement | null = null;
    let dragElem: HTMLElement | null = null;
    let activeDoc: Document | null = null; // Track the appropriate window document

    let startX = 0, startY = 0;
    let rect: DOMRect;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragElem || !placeholder || !activeDoc) return;
      e.preventDefault();

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      dragElem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      // 2. FIX: Use `activeDoc` instead of global `document` for accurate pop-out tracking
      const dropTarget = activeDoc.elementFromPoint(e.clientX, e.clientY);
      if (!dropTarget) return;

      const targetPanelEl = dropTarget.closest('.panel') as HTMLElement;
      if (
        targetPanelEl && 
        targetPanelEl !== dragElem && 
        targetPanelEl !== placeholder &&
        this.content.contains(targetPanelEl)
      ) {
        const targetRect = targetPanelEl.getBoundingClientRect();
        const insertAfter = e.clientY > targetRect.top + (targetRect.height / 2);
        
        if (insertAfter) {
          this.content.insertBefore(placeholder, targetPanelEl.nextSibling);
        } else {
          this.content.insertBefore(placeholder, targetPanelEl);
        }
      }
    };

    const onMouseUp = () => {
      if (!isDragging || !activeDoc) return;
      isDragging = false;

      // Unbind from correct document
      activeDoc.removeEventListener('mousemove', onMouseMove);
      activeDoc.removeEventListener('mouseup', onMouseUp);

      if (dragElem && placeholder && placeholder.parentNode) {
        dragElem.style.position = '';
        dragElem.style.top = '';
        dragElem.style.left = '';
        dragElem.style.width = '';
        dragElem.style.height = '';
        dragElem.style.zIndex = '';
        dragElem.style.transform = '';
        dragElem.style.pointerEvents = '';
        header.style.cursor = 'grab';

        placeholder.parentNode.replaceChild(dragElem, placeholder);
      }

      placeholder = null;
      dragElem = null;
      activeDoc = null; 
    };

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
        return;
      }
      
      e.preventDefault();
      isDragging = true;
      dragElem = el;
      
      // 3. FIX: Dynamically fetch the document context on mousedown 
      // Depending on whether it's popped out, this might be `window.document` or `popupWindow.document`.
      activeDoc = el.ownerDocument; 
      
      rect = dragElem.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;

      placeholder = activeDoc.createElement('div');
      placeholder.className = dragElem.className; 
      placeholder.style.minWidth = `${rect.width}px`;
      placeholder.style.minHeight = `${rect.height}px`;
      placeholder.style.border = '2px dashed var(--border, #444)';
      placeholder.style.background = 'transparent';
      // Use standard browser getComputedStyle through the view/window of this element
      placeholder.style.borderRadius = activeDoc.defaultView?.getComputedStyle(dragElem).borderRadius || '8px';

      dragElem.style.position = 'fixed';
      dragElem.style.top = `${rect.top}px`;
      dragElem.style.left = `${rect.left}px`;
      dragElem.style.width = `${rect.width}px`;
      dragElem.style.height = `${rect.height}px`;
      dragElem.style.zIndex = '999999';
      dragElem.style.margin = '0';
      dragElem.style.pointerEvents = 'none'; 
      
      header.style.cursor = 'grabbing';

      if (dragElem.parentNode) {
         dragElem.parentNode.insertBefore(placeholder, dragElem);
      }

      // 4. FIX: Bind to correct document so moving functions even outside the panel edges
      activeDoc.addEventListener('mousemove', onMouseMove);
      activeDoc.addEventListener('mouseup', onMouseUp);
    });
  }

  public override destroy(): void {
    // Destroy all child panels gracefully
    this.subPanels.forEach(panel => panel.destroy());
    super.destroy();
  }
}