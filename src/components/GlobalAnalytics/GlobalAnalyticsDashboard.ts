import { PopUpPanel } from '../PopUpPanel';
import overview from './fragments/overview.html?raw';
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
    this.content.innerHTML = overview;


    // 3. Attach custom event listeners for THIS specific panel
    const refreshBtn = this.content.querySelector('#refresh-data-btn') as HTMLElement | null;
    
    // Check if the button exists before modifying it
    if (refreshBtn) {
        refreshBtn.style.padding = '8px 16px';
        refreshBtn.style.backgroundColor = 'var(--accent-color)';
        refreshBtn.style.color = '#fff';
        refreshBtn.style.border = 'var(--accent-color)  1px solid ';
        refreshBtn.style.borderRadius = '4px';
        refreshBtn.style.cursor = 'pointer';    
      
      refreshBtn.addEventListener('click', () => {
        console.log('Refreshing custom analytics data...');
        refreshBtn.textContent = 'Loading...';
        
        // Simulate an API call
        setTimeout(() => {
          refreshBtn.textContent = 'Refresh Analytics';
        }, 1000);
      });
    } else {
      console.warn("Could not find '#refresh-data-btn' in overview.html");
    }
  }
}