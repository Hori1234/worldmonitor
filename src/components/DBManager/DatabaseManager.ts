import { db } from '../../db/index';
import { users, endpoints, publications, feedItems } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { html, TemplateResult } from 'lit-html';

type TableName = 'users' | 'endpoints' | 'publications' | 'feedItems';

export class DatabaseManager {
  private activeTable: TableName = 'users';
  private currentData: any[] = [];
  private isLoading: boolean = false;
  private container: HTMLElement | null = null;

  constructor() {}

  public render(): TemplateResult {


    return html`
      <div class="db-manager">
        <style>
          .db-manager { display: flex; flex-direction: column; height: 100%; gap: 1rem; color: #e2e8f0; }
          .db-header { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #334155; }
          .db-tabs { display: flex; gap: 0.5rem; }
          .db-tab { background: transparent; border: 1px solid #475569; color: #94a3b8; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
          .db-tab.active { background: #3b82f6; color: white; border-color: #3b82f6; }
          .db-tab:hover:not(.active) { background: #334155; color: white; }
          .db-actions button { background: #10b981; color: white; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-weight: bold; }
          .db-actions button:hover { background: #059669; }
          .db-table-container { flex: 1; overflow: auto; background: #0f172a; border-radius: 6px; border: 1px solid #334155; }
          .db-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
          .db-table th { background: #1e293b; padding: 0.75rem 1rem; position: sticky; top: 0; box-shadow: 0 1px 0 #334155; text-transform: capitalize; }
          .db-table td { padding: 0.5rem 1rem; border-bottom: 1px solid #334155; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
          .db-table tr:hover { background: #1e293b; }
          .db-btn-edit { background: #f59e0b; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; margin-right: 0.25rem; }
          .db-btn-delete { background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; }
          .db-loading { padding: 2rem; text-align: center; color: #94a3b8; }
        </style>
        
        <div class="db-header">
          <div class="db-tabs" id="dbTabs">
            <button class="db-tab active" data-table="users">Users</button>
            <button class="db-tab" data-table="endpoints">Endpoints</button>
            <button class="db-tab" data-table="publications">Publications</button>
            <button class="db-tab" data-table="feedItems">Feed Items</button>
          </div>
          <div class="db-actions">
            <button id="dbBtnAdd">+ Add Record</button>
            <button id="dbBtnRefresh" style="background: #3b82f6; margin-left: 0.5rem;">↻ Refresh</button>
          </div>
        </div>

        <div class="db-table-container" id="dbDataGrid">
          <div class="db-loading">Initializing DB Connection...</div>
        </div>
      </div>
    `;

   

  }

  public bindEvents(container: HTMLElement | null): void {
    if (!container) return;
    this.container = container;

    // Tab Switching
    const tabsContainer = container.querySelector('#dbTabs');
    tabsContainer?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('db-tab')) {
        // Update active class
        container.querySelectorAll('.db-tab').forEach(t => t.classList.remove('active'));
        target.classList.add('active');
        
        // Switch table & load data
        this.activeTable = target.dataset.table as TableName;
        this.fetchData();
      }
    });

    // Refresh Btn
    container.querySelector('#dbBtnRefresh')?.addEventListener('click', () => this.fetchData());

    // Add Record Btn
    container.querySelector('#dbBtnAdd')?.addEventListener('click', () => this.handleCreatePrompt());

    // Table Actions (Edit / Delete) via event delegation
    const grid = container.querySelector('#dbDataGrid');
    grid?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('db-btn-delete')) {
        const id = target.dataset.id;
        if (id && confirm(`Are you sure you want to delete record ${id}?`)) {
          this.handleDelete(id);
        }
      }
      if (target.classList.contains('db-btn-edit')) {
        const id = target.dataset.id;
        if (id) this.handleEditPrompt(id);
      }
    });

    // Initial Fetch
    this.fetchData();
  }

  // --- DATABASE OPERATIONS ---

  private async fetchData() {
    this.setLoading(true);
    try {
      switch (this.activeTable) {
        case 'users':
          this.currentData = await db.select().from(users);
          break;
        case 'endpoints':
          this.currentData = await db.select().from(endpoints);
          break;
        case 'publications':
          this.currentData = await db.select().from(publications);
          break;
        case 'feedItems':
          this.currentData = await db.select().from(feedItems);
          break;
      }
      this.renderGrid();
    } catch (err) {
      console.error('Failed to fetch data', err);
      // 👇 Print the EXACT error to the screen so we can read it:
      const msg = err instanceof Error ? err.message : String(err);
      this.showError(`DB Error: ${msg}`);
    } finally {
      this.setLoading(false);
    }
  }

  private async handleDelete(id: string) {
    try {
      this.setLoading(true);
      // Determine correct numeric or string typing for IDs based on schema
      const numericId = parseInt(id, 10);
      switch (this.activeTable) {
        case 'users':
          await db.delete(users).where(eq(users.id, id));
          break;
        case 'endpoints':
          await db.delete(endpoints).where(eq(endpoints.id, numericId));
          break;
        case 'publications':
          await db.delete(publications).where(eq(publications.id, numericId));
          break;
        case 'feedItems':
          await db.delete(feedItems).where(eq(feedItems.id, id));
          break;
      }
      await this.fetchData();
    } catch (err) {
      console.error('Delete error', err);
      alert('Failed to delete record.');
    }
  }

  private async handleCreatePrompt() {
    // Mimic Drizzle studio quick add via prompt forms 
    let newRecord: any = {};
    try {
      if (this.activeTable === 'users') {
        newRecord.id = prompt('Enter unique ID:');
        newRecord.username = prompt('Enter Username:');
        newRecord.email = prompt('Enter Email:');
        newRecord.passwordHash = prompt('Enter Password Hash:');
        newRecord.createdAt = Math.floor(Date.now() / 1000);
        if(!newRecord.id || !newRecord.username) return;
        await db.insert(users).values(newRecord);

      } else if (this.activeTable === 'endpoints') {
        newRecord.userId = prompt('Enter User ID:');
        newRecord.link = prompt('Enter Endpoint Link:');
        newRecord.type = prompt('Enter Type (RSS, ATOM, NEWS_API, GNEWS, HTML):', 'RSS');
        if(!newRecord.userId || !newRecord.link) return;
        await db.insert(endpoints).values(newRecord);
      }
      // Re-fetch to see new row
      await this.fetchData();
    } catch (error) {
      alert('Failed to insert record. Ensure foreign keys (like user_id) exist first.');
      console.error(error);
    }
  }

  private async handleEditPrompt(id: string) {
    const record = this.currentData.find(r => r.id.toString() === id);
    if (!record) return;

    try {
        if (this.activeTable === 'users') {
            const newUsername = prompt('Update Username:', record.username);
            if (newUsername !== null) {
                await db.update(users).set({ username: newUsername }).where(eq(users.id, record.id));
            }
        } else if (this.activeTable === 'endpoints') {
            const newLink = prompt('Update Link:', record.link);
            if (newLink !== null) {
                await db.update(endpoints).set({ link: newLink }).where(eq(endpoints.id, parseInt(id, 10)));
            }
        }
        await this.fetchData();
    } catch(err) {
        alert('Update failed.');
        console.error(err);
    }
  }

  // --- UI RENDERING ---

  private renderGrid() {
    if (!this.container) return;
    const grid = this.container.querySelector('#dbDataGrid');
    if (!grid) return;

    if (this.currentData.length === 0) {
      grid.innerHTML = `<div class="db-loading">No records found in <b>${this.activeTable}</b>.</div>`;
      return;
    }

    // Extract columns from the first object
    const columns = Object.keys(this.currentData[0]);

    let html = `<table class="db-table"><thead><tr>`;
    columns.forEach(col => { html += `<th>${col}</th>`; });
    html += `<th>Actions</th></tr></thead><tbody>`;

    this.currentData.forEach(row => {
      html += `<tr>`;
      columns.forEach(col => {
        let val = row[col];
        if (val === null) val = 'NULL';
        if (typeof val === 'boolean') val = val ? 'True' : 'False';
        html += `<td title="${val}">${val}</td>`;
      });
      html += `
        <td>
          <button class="db-btn-edit" data-id="${row.id}">Edit</button>
          <button class="db-btn-delete" data-id="${row.id}">Del</button>
        </td>
      </tr>`;
    });

    html += `</tbody></table>`;
    grid.innerHTML = html;
  }

  private setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
    if (this.container && isLoading) {
      const grid = this.container.querySelector('#dbDataGrid');
      if (grid) grid.innerHTML = `<div class="db-loading">Loading data...</div>`;
    }
  }

  private showError(msg: string) {
    if (this.container) {
      const grid = this.container.querySelector('#dbDataGrid');
      if (grid) grid.innerHTML = `<div class="db-loading" style="color: #ef4444;">${msg}</div>`;
    }
  }
}