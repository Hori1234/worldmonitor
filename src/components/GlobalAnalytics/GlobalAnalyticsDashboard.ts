import { PopUpPanel } from '../PopUpPanel';

export class GlobalAnalyticsDashboard extends PopUpPanel {
  
  constructor() {
    // Pass the custom ID and Title up to the PopUpPanel
    super({ 
      id: 'global-analytics-dashboard', 
      title: 'Global Analytics Dashboard' 
    });
  }

  // Override the render method to show different content
  protected render(): void {
    // 1. Setup the container styling inherited from Panel
    this.content.style.padding = '16px';
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';
    this.content.style.gap = '12px';
    this.content.style.background = 'var(--panel-bg)';

    // 2. Inject completely different HTML content
    this.content.innerHTML = `
      <div style="color: var(--text); font-size: 1.1em; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
        Global Analytics Dashboard
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div style="background: var(--bg); padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: var(--text-muted);">Metric A</div>
          <div style="font-size: 24px; color: var(--accent);">34,291</div>
        </div>
        <div style="background: var(--bg); padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: var(--text-muted);">Status</div>
          <div style="font-size: 24px; color: #44ff88;">OK</div>
        </div>
      </div>
      <button id="refresh-data-btn" style="margin-top: auto; padding: 8px; cursor: pointer; background: var(--accent); color: white; border: none; border-radius: 4px;">
        Refresh Analytics
      </button>
    `;

    // 3. Attach custom event listeners for THIS specific panel
    const refreshBtn = this.content.querySelector('#refresh-data-btn');
    refreshBtn?.addEventListener('click', () => {
      console.log('Refreshing custom analytics data...');
      refreshBtn.textContent = 'Loading...';
      
      // Simulate an API call
      setTimeout(() => {
        refreshBtn.textContent = 'Refresh Analytics';
      }, 1000);
    });
  }
}