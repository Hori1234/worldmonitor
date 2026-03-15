// src/components/GlobalAnalytics/GlobalAnalyticsDashboard.ts
import { Panel } from '../Panel';
import overview from './fragments/overview.html?raw';
import { html, render } from 'lit-html';
// 1. Define the mock data structure
interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  overview: string;
  details: string;
}

const MOCK_STOCKS: StockData[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 173.50, change: 1.25, overview: 'Tech giant, steady growth.', details: 'Market Cap: 2.8T. P/E Ratio: 28.5. Expected earnings call next week.' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 214.20, change: -3.40, overview: 'EV market leader, volatile.', details: 'Market Cap: 680B. Recent price cuts affecting margins in Q3.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.90, change: 0.85, overview: 'Search monopoly, AI focus.', details: 'Market Cap: 1.7T. Strong ad revenue, pushing heavily into generative AI models.' },
  { symbol: 'AMZN', name: 'Amazon.com', price: 145.10, change: 2.15, overview: 'E-commerce and cloud dominance.', details: 'Market Cap: 1.5T. AWS showing re-accelerated growth this quarter.' }
];

export class GlobalAnalyticsDashboard extends Panel {
  
  constructor() {
    super({ 
      id: 'global-analytics-dashboard', 
      title: 'Trading View' 
    });
    this.render();
  }

  protected render(): void {
    // Setup container
    this.content.style.padding = '16px';
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';
    this.content.style.background = 'var(--panel-bg)';

    // Inject HTML template
    this.content.innerHTML = overview;

    // Render the mocked stock data
    this.renderStocks();

    // Setup Refresh Button
    const refreshBtn = this.content.querySelector('#refresh-data-btn') as HTMLButtonElement | null;
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.textContent = 'Loading...';
        setTimeout(() => {
          this.renderStocks(); // Re-render to simulate refresh
          refreshBtn.textContent = 'Refresh';
        }, 1000);
      });
    }

    // Setup Modal Close logic
    const modal = this.content.querySelector('#stock-modal') as HTMLElement;
    const closeBtn = this.content.querySelector('#modal-close-btn') as HTMLButtonElement;
    
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  }

  private renderStocks(): void {
    const container = this.content.querySelector('#stocks-container');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    MOCK_STOCKS.forEach(stock => {
      const isPositive = stock.change >= 0;
      const changeClass = isPositive ? 'positive' : 'negative';
      const changeSign = isPositive ? '+' : '';

      // Create card element
      const card = document.createElement('div');
      card.className = 'stock-card';
      
      // Define standard lit-html template with inline event handlers
      const cardTemplate = html`
        <div class="stock-header">
          <strong>${stock.symbol}</strong>
          <button 
            class="info-btn" 
            @click=${(e: Event) => {
              e.stopPropagation(); // Prevents the card click event below
              this.openModal(stock);
            }}
          >Info</button>
        </div>
        <div style="font-size: 0.8em; color: var(--text-muted);">${stock.name}</div>
        <div class="stock-price ${changeClass}"> 
          $${stock.price.toFixed(2)}
          <span style="font-size: 0.5em;">${changeSign}${stock.change.toFixed(2)}</span>
        </div>
        <div class="stock-overview">
          ${stock.overview}
        </div>
      `;

      // Use lit-html's render method to attach the template to the card 
      render(cardTemplate, card);

      // 1. Expand standard overview on card click
      card.addEventListener('click', (e) => {
        // Prevent expanding if the user clicked the "Info" button specifically
        if ((e.target as HTMLElement).classList.contains('info-btn')) return;
        card.classList.toggle('expanded');
      });

      // 2. Open detailed modal on "Info" button click
      const infoBtn = card.querySelector('.info-btn');
      infoBtn?.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents the card click event from firing
        this.openModal(stock);
      });

      container.appendChild(card);
    });
  }

  private openModal(stock: StockData): void {
    const modal = this.content.querySelector('#stock-modal') as HTMLElement;
    const title = this.content.querySelector('#modal-title') as HTMLElement;
    const body = this.content.querySelector('#modal-body') as HTMLElement;                                                                                                                                                                           

    if (modal && title && body) {
      title.textContent = `${stock.name} (${stock.symbol})`;

      const modalContent = html`
        <h3 style="margin-bottom: 8px;">Current Price: $${stock.price.toFixed(2)}</h3>
        <p style="color: var(--text-muted); line-height: 1.5;">${stock.details}</p>
        <div style="margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px;">
          <em>Detailed charts and trading metrics would go here.</em>
        </div>
      `;
      render(modalContent, body);
      modal.style.display = 'flex';
    }         
  }
}                                               