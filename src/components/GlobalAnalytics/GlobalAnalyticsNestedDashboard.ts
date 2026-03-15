// src/components/GlobalNestedDashboard.ts
import { NestedPanelLayout } from '../NestedPanelLayout';
import { Panel } from '../Panel';
import { GlobalAnalyticsDashboard } from './GlobalAnalyticsDashboard';
import { ETFFlowsPanel } from '../ETFFlowsPanel';
import { InvestmentsPanel } from '../InvestmentsPanel';

export class GlobalAnalyticsNestedDashboard extends NestedPanelLayout {
  constructor() {
    // 1. Initialize the layout container
    super({
      id: 'global-analytics-nested-dashboard',
      title: 'Global Analytics Dashboard'
    });

    this.initializePanels();
  }

  private initializePanels(): void {
    // 2. Instantiate the Global Analytics panel                                                                                            
    const analyticsPanel = new GlobalAnalyticsDashboard();

    // 3. Instantiate a dummy panel
    const dummyPanel = new Panel({ 
      id: 'dummy-panel', 
      title: 'Dummy Status Panel' 
    });

    const etfFlowsPanel = new ETFFlowsPanel();                    
    const investmentsPanel = new InvestmentsPanel();
    // // 4. Instantiate the News panel                     
    // const newsPanel = new NewsPanel( );

    // Add some simple inline styling or content to the dummy panel
    dummyPanel.setContent(`
      <div style="padding: 16px; color: var(--text-muted); font-size: 14px;">
        <h3>System Status: All Good</h3>
        <p>This is a dummy panel sitting next to the Global Analytics view.</p>
        <p>You can drag its header to swap positions with the Analytics panel.</p>
      </div>
    `);

    // 4. Add them to the layout
    // The base class handles appending them to the DOM and making them draggable
    this.addSubPanel(analyticsPanel);
    this.addSubPanel(dummyPanel);
      this.addSubPanel(etfFlowsPanel);
        this.addSubPanel(investmentsPanel);                                           
  }
}