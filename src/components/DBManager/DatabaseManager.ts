// import { db } from '../../db/index';
// import { users, endpoints, publications, feedItems, openskyPlanes, openskyPlanePositions } from '../../db/schema';
// import { eq } from 'drizzle-orm';
// import { html, TemplateResult } from 'lit-html';

// type SidebarSection = 'users' | 'news' | 'flightRadar';
// type TableName = 'users' | 'endpoints' | 'publications' | 'feedItems' | 'openskyPlanes' | 'openskyPlanePositions';

// export class DatabaseManager {
//   private activeSection: SidebarSection = 'users';
//   // Default table per section dynamically switches logic later
//   private activeTable: TableName = 'users';
  
//   private currentData: any[] = [];
//   private isLoading: boolean = false;
//   private container: HTMLElement | null = null;

//   constructor() {}

//   public render(): TemplateResult {
//     return html`
//       <div class="db-manager">
//         <style>
//           .db-manager { display: flex; height: 100%; color: var(--text-color, #e2e8f0); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color, #334155); }
          
//           /* Sidebar Layout */
//           .db-sidebar { width: 220px; background: var(--panel-bg, #0f172a); border-right: 1px solid var(--border-color, #334155); display: flex; flex-direction: column; }
//           .db-sidebar-header { padding: 1rem; font-weight: bold; border-bottom: 1px solid var(--border-color, #334155); background: var(--header-bg, #1e293b); color: var(--text-color, #f8fafc); }
//           .db-sidebar-btn { background: transparent; color: var(--text-dim, #94a3b8); border: none; padding: 1rem; text-align: left; cursor: pointer; border-bottom: 1px solid var(--border-color, #1e293b); font-size: 0.95rem; transition: background 0.2s; }
//           .db-sidebar-btn:hover:not(.active) { background: var(--hover-bg, #334155); color: var(--text-color); }
//           .db-sidebar-btn.active { background: var(--accent-color, #3b82f6); color: white; border-left: 4px solid var(--accent-light, #60a5fa); padding-left: calc(1rem - 4px); }
          
//           /* Main Content Layout */
//           .db-main { flex: 1; display: flex; flex-direction: column; background: var(--bg-color, #0b0f19); overflow: hidden; }
          
//           /* Top Header Toolbar inside Main Content */
//           .db-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color, #334155); background: var(--panel-bg, #1e293b); min-height: 54px; }
//           .db-tabs { display: flex; gap: 0.5rem; }
//           .db-tab { background: transparent; border: 1px solid var(--border-color, #475569); color: var(--text-dim, #94a3b8); padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
//           .db-tab.active { background: var(--accent-color, #3b82f6); color: white; border-color: var(--accent-color, #3b82f6); }
//           .db-tab:hover:not(.active) { background: var(--hover-bg, #334155); color: var(--text-color); }
          
//           /* Action Buttons */
//           .db-actions button { background: var(--success-color, #10b981); color: white; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; }
//           .db-actions button:hover { opacity: 0.9; }
          
//           /* Table Grid */
//           .db-table-container { flex: 1; overflow: auto; position: relative; }
//           .db-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
//           .db-table th { background: var(--panel-bg, #0f172a); padding: 0.75rem 1rem; position: sticky; top: 0; box-shadow: 0 1px 0 var(--border-color, #334155); text-transform: capitalize; color: var(--text-dim, #cbd5e1); z-index: 2; }
//           .db-table td { padding: 0.5rem 1rem; border-bottom: 1px solid var(--border-color, #334155); white-space: nowrap; max-width: 250px; overflow: hidden; text-overflow: ellipsis; color: var(--text-color); }
//           .db-table tr:hover td { background: var(--hover-bg, #1e293b); }
//           .db-btn-edit { background: var(--warning-color, #f59e0b); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; margin-right: 0.25rem; }
//           .db-btn-delete { background: var(--danger-color, #ef4444); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; }
//           .db-loading { padding: 3rem; text-align: center; color: var(--text-dim, #94a3b8); font-size: 0.95rem; }
//         </style>
        
//         <div class="db-sidebar" id="dbSidebar">
//           <div class="db-sidebar-header">Database Manager</div>
//           <button class="db-sidebar-btn ${this.activeSection === 'users' ? 'active' : ''}" data-section="users">Profiles & Users</button>
//           <button class="db-sidebar-btn ${this.activeSection === 'news' ? 'active' : ''}" data-section="news">News Endpoints</button>
//           <button class="db-sidebar-btn ${this.activeSection === 'flightRadar' ? 'active' : ''}" data-section="flightRadar">Flight Radar</button>
//         </div>

//         <div class="db-main">
//           <div class="db-header">
//             <div class="db-tabs" id="dbTabs">
//               ${this.renderSubTabs()}
//             </div>
//             <div class="db-actions">
//               <button id="dbBtnAdd">+ Add Record</button>
//               <button id="dbBtnRefresh" style="background: #3b82f6; margin-left: 0.5rem;">↻ Refresh</button>
//             </div>
//           </div>

//           <div class="db-table-container" id="dbDataGrid">
//             <div class="db-loading">Initializing DB Connection...</div>
//           </div>
//         </div>
//       </div>
//     `;
//   }

//   // Dynamically render the top tabs based on the active sidebar section
//   private renderSubTabs() {
//     if (this.activeSection === 'users') {
//       return html`
//         <button class="db-tab ${this.activeTable === 'users' ? 'active' : ''}" data-table="users">Users</button>
//       `;
//     } else if (this.activeSection === 'news') {
//       return html`
//         <button class="db-tab ${this.activeTable === 'endpoints' ? 'active' : ''}" data-table="endpoints">Endpoints</button>
//         <button class="db-tab ${this.activeTable === 'publications' ? 'active' : ''}" data-table="publications">Publications</button>
//         <button class="db-tab ${this.activeTable === 'feedItems' ? 'active' : ''}" data-table="feedItems">Feed Items</button>
//       `;
//     } else if (this.activeSection === 'flightRadar') {
//       return html`
//         <button class="db-tab ${this.activeTable === 'openskyPlanes' ? 'active' : ''}" data-table="openskyPlanes">Planes (Indexed)</button>
//         <button class="db-tab ${this.activeTable === 'openskyPlanePositions' ? 'active' : ''}" data-table="openskyPlanePositions">Temporal Telemetry</button>
//       `;
//     }
//     return html``;
//   }

//   public bindEvents(container: HTMLElement | null): void {
//     if (!container) return;
//     this.container = container;

//     // Sidebar Section Switching
//     const sidebar = container.querySelector('#dbSidebar');
//     sidebar?.addEventListener('click', (e) => {
//       const target = e.target as HTMLElement;
//       if (target.classList.contains('db-sidebar-btn')) {
//         const section = target.dataset.section as SidebarSection;
//         if (section !== this.activeSection) {
//           this.activeSection = section;
//           // Set default default table based on section change
//           if (section === 'users') this.activeTable = 'users';
//           if (section === 'news') this.activeTable = 'endpoints';
//           if (section === 'flightRadar') this.activeTable = 'openskyPlanes';
          
//           this.reRenderApp();
//         }
//       }
//     });

//     // Sub-Tab Switching
//     const tabsContainer = container.querySelector('#dbTabs');
//     tabsContainer?.addEventListener('click', (e) => {
//       const target = e.target as HTMLElement;
//       if (target.classList.contains('db-tab')) {
//         this.activeTable = target.dataset.table as TableName;
//         this.reRenderApp();
//       }
//     });

//     // Refresh Btn
//     container.querySelector('#dbBtnRefresh')?.addEventListener('click', () => this.fetchData());

//     // Add Record Btn
//     container.querySelector('#dbBtnAdd')?.addEventListener('click', () => this.handleCreatePrompt());

//     // Table Actions (Edit / Delete) via event delegation
//     const grid = container.querySelector('#dbDataGrid');
//     grid?.addEventListener('click', (e) => {
//       const target = e.target as HTMLElement;
//       if (target.classList.contains('db-btn-delete')) {
//         const id = target.dataset.id;
//         if (id && confirm(`Are you sure you want to delete record ${id}?`)) {
//           this.handleDelete(id);
//         }
//       }
//       if (target.classList.contains('db-btn-edit')) {
//         const id = target.dataset.id;
//         if (id) this.handleEditPrompt(id);
//       }
//     });

//     // Initial Fetch
//     this.fetchData();
//   }

//   // Helpers to re-render the HTML template dynamically and re-bind clicks
//   private reRenderApp() {
//     if (!this.container) return;
//     import('lit-html').then(({ render: litRender }) => {
//       // Re-run the main lit-html render engine into the container
//       litRender(this.render(), this.container!);
//       // Ensure we fetch data for the new activeTable immediately
//       this.fetchData();
//     });
//   }

//   // --- DATABASE OPERATIONS ---

//   private async fetchData() {
//     this.setLoading(true);
//     try {
//       switch (this.activeTable) {
//         case 'users':
//           this.currentData = await db.select().from(users);
//           break;
//         case 'endpoints':
//           this.currentData = await db.select().from(endpoints);
//           break;
//         case 'publications':
//           this.currentData = await db.select().from(publications);
//           break;
//         case 'feedItems':
//           this.currentData = await db.select().from(feedItems);
//           break;
//         case 'openskyPlanes':
//           this.currentData = await db.select().from(openskyPlanes);
//           break;
//         case 'openskyPlanePositions':
//           this.currentData = await db.select().from(openskyPlanePositions);
//           break;
//       }
//       this.renderGrid();
//     } catch (err: unknown) {
//       console.error('Failed to fetch data', err);
//       const msg = err instanceof Error ? err.message : String(err);
//       this.showError(`DB Error: ${msg}`);
//     } finally {
//       this.setLoading(false);
//     }
//   }

//   private async handleDelete(id: string) {
//     try {
//       this.setLoading(true);
//       const numericId = parseInt(id, 10);
//       switch (this.activeTable) {
//         case 'users':
//           await db.delete(users).where(eq(users.id, id));
//           break;
//         case 'endpoints':
//           await db.delete(endpoints).where(eq(endpoints.id, numericId));
//           break;
//         case 'publications':
//           await db.delete(publications).where(eq(publications.id, numericId));
//           break;
//         case 'feedItems':
//           await db.delete(feedItems).where(eq(feedItems.id, id));
//           break;
//         case 'openskyPlanes':
//           await db.delete(openskyPlanes).where(eq(openskyPlanes.icao24, id));
//           break;
//         case 'openskyPlanePositions':
//           await db.delete(openskyPlanePositions).where(eq(openskyPlanePositions.id, numericId));
//           break;
//       }
//       await this.fetchData();
//     } catch (err) {
//       console.error('Delete error', err);
//       alert('Failed to delete record.');
//     }
//   }

//   private async handleCreatePrompt() {
//     let newRecord: any = {};
//     try {
//       if (this.activeTable === 'users') {
//         newRecord.id = prompt('Enter unique ID:');
//         newRecord.username = prompt('Enter Username:');
//         newRecord.email = prompt('Enter Email:');
//         newRecord.passwordHash = prompt('Enter Password Hash:');
//         newRecord.createdAt = Math.floor(Date.now() / 1000);
//         if(!newRecord.id || !newRecord.username) return;
//         await db.insert(users).values(newRecord);

//       } else if (this.activeTable === 'endpoints') {
//         newRecord.userId = prompt('Enter User ID:');
//         newRecord.link = prompt('Enter Endpoint Link:');
//         newRecord.type = prompt('Enter Type (RSS, ATOM, NEWS_API, GNEWS, HTML):', 'RSS');
//         if(!newRecord.userId || !newRecord.link) return;
//         await db.insert(endpoints).values(newRecord);
//       } else if (this.activeTable === 'openskyPlanes') {
//          newRecord.icao24 = prompt('Enter icao24 Hex (e.g. aba86c):');
//          newRecord.originCountry = prompt('Enter Origin Country:');
//          newRecord.userId = prompt('Enter owner User ID:');
//          if(!newRecord.icao24 || !newRecord.userId) return;
//          await db.insert(openskyPlanes).values(newRecord);
//       } else {
//          alert(`Add not yet supported via UI prompt for table: ${this.activeTable}`);
//          return;
//       }
//       // Re-fetch to see new row
//       await this.fetchData();
//     } catch (error) {
//       alert('Failed to insert record. Ensure foreign keys exist first.');
//       console.error(error);
//     }
//   }

//   private async handleEditPrompt(id: string) {
//     const record = this.currentData.find(r => (r.id || r.icao24 || '').toString() === id);
//     if (!record) return;

//     try {
//         if (this.activeTable === 'users') {
//             const newUsername = prompt('Update Username:', record.username);
//             if (newUsername !== null) {
//                 await db.update(users).set({ username: newUsername }).where(eq(users.id, record.id));
//             }
//         } else if (this.activeTable === 'endpoints') {
//             const newLink = prompt('Update Link:', record.link);
//             if (newLink !== null) {
//                 await db.update(endpoints).set({ link: newLink }).where(eq(endpoints.id, parseInt(id, 10)));
//             }
//         } else if (this.activeTable === 'openskyPlanes') {
//             const newCallsign = prompt('Update Callsign:', record.callsign || '');
//             if (newCallsign !== null) {
//                 await db.update(openskyPlanes).set({ callsign: newCallsign }).where(eq(openskyPlanes.icao24, id));
//             }
//         } else {
//             alert(`Edit not yet supported via UI prompt for table: ${this.activeTable}`);
//             return;
//         }
//         await this.fetchData();
//     } catch(err) {
//         alert('Update failed.');
//         console.error(err);
//     }
//   }

//   // --- UI RENDERING ---

//   private renderGrid() {
//     if (!this.container) return;
//     const grid = this.container.querySelector('#dbDataGrid');
//     if (!grid) return;

//     if (this.currentData.length === 0) {
//       grid.innerHTML = `<div class="db-loading">No records found in <b>${this.activeTable}</b>.</div>`;
//       return;
//     }

//     const columns = Object.keys(this.currentData[0]);

//     let html = `<table class="db-table"><thead><tr>`;
//     columns.forEach(col => { html += `<th>${col}</th>`; });
//     html += `<th>Actions</th></tr></thead><tbody>`;

//     this.currentData.forEach(row => {
//       // Find the ID to pass to the Edit/Del buttons (Some tables use 'id', OpenSkyPlanes uses 'icao24')
//       const rowId = row.id || row.icao24 || '';
      
//       html += `<tr>`;
//       columns.forEach(col => {
//         let val = row[col];
//         if (val === null) val = 'NULL';
//         if (typeof val === 'boolean') val = val ? 'True' : 'False';
//         html += `<td title="${val}">${val}</td>`;
//       });
//       html += `
//         <td>
//           <button class="db-btn-edit" data-id="${rowId}">Edit</button>
//           <button class="db-btn-delete" data-id="${rowId}">Del</button>
//         </td>
//       </tr>`;
//     });

//     html += `</tbody></table>`;
//     grid.innerHTML = html;
//   }

//   private setLoading(isLoading: boolean) {
//     this.isLoading = isLoading;
//     if (this.container && isLoading) {
//       const grid = this.container.querySelector('#dbDataGrid');
//       if (grid) grid.innerHTML = `<div class="db-loading"><br/>Loading data from ${this.activeTable}...</div>`;
//     }
//   }

//   private showError(msg: string) {
//     if (this.container) {
//       const grid = this.container.querySelector('#dbDataGrid');
//       if (grid) grid.innerHTML = `<div class="db-loading" style="color: #ef4444;">${msg}</div>`;
//     }
//   }
// }

import { db } from '../../db/index';
import { users, endpoints, publications, feedItems, openskyPlanes, openskyPlanePositions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { html, TemplateResult } from 'lit-html';

type SidebarSection = 'users' | 'news' | 'flightRadar';
type TableName = 'users' | 'endpoints' | 'publications' | 'feedItems' | 'openskyPlanes' | 'openskyPlanePositions';

export class DatabaseManager {
  private activeSection: SidebarSection = 'users';
  private activeTable: TableName = 'users'; 
  private currentData: any[] = [];
  private isLoading: boolean = false;
  private container: HTMLElement | null = null;

  // New state for custom modal
  private modalState: { isOpen: boolean; mode: 'add' | 'edit'; recordId?: string } = { isOpen: false, mode: 'add' };

  constructor() {}

  public render(): TemplateResult {
    return html`
      <div class="db-manager relative">
        <style>
          .db-manager { display: flex; height: 100%; color: var(--text-color, #e2e8f0); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color, #334155); position: relative; }
          
          /* Sidebar Layout */
          .db-sidebar { width: 220px; background: var(--panel-bg, #0f172a); border-right: 1px solid var(--border-color, #334155); display: flex; flex-direction: column; }
          .db-sidebar-header { padding: 1rem; font-weight: bold; border-bottom: 1px solid var(--border-color, #334155); background: var(--header-bg, #1e293b); color: var(--text-color, #f8fafc); }
          .db-sidebar-btn { background: transparent; color: var(--text-dim, #94a3b8); border: none; padding: 1rem; text-align: left; cursor: pointer; border-bottom: 1px solid var(--border-color, #1e293b); font-size: 0.95rem; transition: background 0.2s; }
          .db-sidebar-btn:hover:not(.active) { background: var(--hover-bg, #334155); color: var(--text-color); }
          .db-sidebar-btn.active { background: var(--accent-color, #3b82f6); color: white; border-left: 4px solid var(--accent-light, #60a5fa); padding-left: calc(1rem - 4px); }
          
          /* Main Content */
          .db-main { flex: 1; display: flex; flex-direction: column; background: var(--bg-color, #0b0f19); overflow: hidden; }
          .db-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color, #334155); background: var(--panel-bg, #1e293b); min-height: 54px; }
          .db-tabs { display: flex; gap: 0.5rem; }
          .db-tab { background: transparent; border: 1px solid var(--border-color, #475569); color: var(--text-dim, #94a3b8); padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
          .db-tab.active { background: var(--accent-color, #3b82f6); color: white; border-color: var(--accent-color, #3b82f6); }
          .db-tab:hover:not(.active) { background: var(--hover-bg, #334155); color: var(--text-color); }
          
          .db-actions button { background: var(--success-color, #10b981); color: white; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; }
          .db-actions button:hover { opacity: 0.9; }
          
          /* Table Grid */
          .db-table-container { flex: 1; overflow: auto; position: relative; }
          .db-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
          .db-table th { background: var(--panel-bg, #0f172a); padding: 0.75rem 1rem; position: sticky; top: 0; box-shadow: 0 1px 0 var(--border-color, #334155); text-transform: capitalize; color: var(--text-dim, #cbd5e1); z-index: 2; }
          .db-table td { padding: 0.5rem 1rem; border-bottom: 1px solid var(--border-color, #334155); white-space: nowrap; max-width: 250px; overflow: hidden; text-overflow: ellipsis; color: var(--text-color); }
          .db-table tr:hover td { background: var(--hover-bg, #1e293b); }
          .db-btn-edit { background: var(--warning-color, #f59e0b); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; margin-right: 0.25rem; }
          .db-btn-delete { background: var(--danger-color, #ef4444); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; }
          .db-loading { padding: 3rem; text-align: center; color: var(--text-dim, #94a3b8); font-size: 0.95rem; }

          /* Modal Overlay Styles */
          .db-modal-overlay {
            position: fixed; /* Changed from absolute to fixed */
    inset: 0; 
    background: rgba(0,0,0,0.6); 
    backdrop-filter: blur(2px); 
    z-index: 10000; /* Increased z-index to ensure it sits above all other app layout elements */
    display: flex; 
    justify-content: center; 
    align-items: center; 
            }
          .db-modal { background: var(--panel-bg, #1e293b); width: 400px; max-width: 90%; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid var(--border-color, #334155); display: flex; flex-direction: column; overflow: hidden; }
          .db-modal-header { padding: 1rem; font-weight: bold; font-size: 1.1rem; border-bottom: 1px solid var(--border-color, #334155); display: flex; justify-content: space-between; align-items: center; background: var(--header-bg, #0f172a); }
          .db-modal-close { background: none; border: none; color: var(--text-dim); font-size: 1.2rem; cursor: pointer; padding: 0; }
          .db-modal-close:hover { color: white; }
          .db-modal-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; }
          .db-form-group { display: flex; flex-direction: column; gap: 0.25rem; }
          .db-form-label { font-size: 0.8rem; color: var(--text-dim, #94a3b8); text-transform: capitalize; }
          .db-form-input { padding: 0.5rem; background: var(--bg-color, #0b0f19); border: 1px solid var(--border-color, #475569); color: var(--text-color); border-radius: 4px; font-size: 0.9rem; }
          .db-form-input:focus { outline: navajowhite; border-color: var(--accent-light, #60a5fa); }
          .db-modal-footer { padding: 1rem; border-top: 1px solid var(--border-color, #334155); display: flex; justify-content: flex-end; gap: 0.5rem; }
          .db-btn-cancel { background: transparent; border: 1px solid var(--border-color, #475569); color: var(--text-color); padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
          .db-btn-cancel:hover { background: var(--hover-bg, #334155); }
          .db-btn-save { background: var(--accent-color, #3b82f6); color: white; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; font-weight: bold; }
          .db-btn-save:hover { opacity: 0.9; }
        </style>
        
        <div class="db-sidebar" id="dbSidebar">
          <div class="db-sidebar-header">Database Manager</div>
          <button class="db-sidebar-btn ${this.activeSection === 'users' ? 'active' : ''}" data-section="users">Profiles & Users</button>
          <button class="db-sidebar-btn ${this.activeSection === 'news' ? 'active' : ''}" data-section="news">News Endpoints</button>
          <button class="db-sidebar-btn ${this.activeSection === 'flightRadar' ? 'active' : ''}" data-section="flightRadar">Flight Radar</button>
        </div>

        <div class="db-main">
          <div class="db-header">
            <div class="db-tabs" id="dbTabs"> ${this.renderSubTabs()} </div>
            <div class="db-actions">
              <button id="dbBtnAdd">+ Add Record</button>
              <button id="dbBtnRefresh" style="background: #3b82f6; margin-left: 0.5rem;">↻ Refresh</button>
            </div>
          </div>

          <div class="db-table-container" id="dbDataGrid">
            <div class="db-loading">Initializing DB Connection...</div>
          </div>
        </div>

        ${this.modalState.isOpen ? this.renderModal() : ''}
      </div>
    `;
  }

  private renderSubTabs() {
    if (this.activeSection === 'users') {
      return html`<button class="db-tab ${this.activeTable === 'users' ? 'active' : ''}" data-table="users">Users</button>`;
    } else if (this.activeSection === 'news') {
      return html`
        <button class="db-tab ${this.activeTable === 'endpoints' ? 'active' : ''}" data-table="endpoints">Endpoints</button>
        <button class="db-tab ${this.activeTable === 'publications' ? 'active' : ''}" data-table="publications">Publications</button>
        <button class="db-tab ${this.activeTable === 'feedItems' ? 'active' : ''}" data-table="feedItems">Feed Items</button>
      `;
    } else if (this.activeSection === 'flightRadar') {
      return html`
        <button class="db-tab ${this.activeTable === 'openskyPlanes' ? 'active' : ''}" data-table="openskyPlanes">Planes (Indexed)</button>
        <button class="db-tab ${this.activeTable === 'openskyPlanePositions' ? 'active' : ''}" data-table="openskyPlanePositions">Temporal Telemetry</button>
      `;
    }
    return html``;
  }

  /* --- MODAL RENDERING LOGIC --- */
  private renderModal() {
    const isEdit = this.modalState.mode === 'edit';
    const record = isEdit ? this.currentData.find(r => (r.id || r.icao24 || '').toString() === this.modalState.recordId) : {};

    let fieldsHtml = '';

    // Generate fields based on the active table
    if (this.activeTable === 'users') {
      fieldsHtml = `
        ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">User ID</label><input type="text" name="id" class="db-form-input" required></div>` : ''}
        <div class="db-form-group"><label class="db-form-label">Username</label><input type="text" name="username" class="db-form-input" value="${record?.username || ''}" required></div>
        <div class="db-form-group"><label class="db-form-label">Email</label><input type="email" name="email" class="db-form-input" value="${record?.email || ''}" required></div>
        <div class="db-form-group"><label class="db-form-label">Password Hash</label><input type="text" name="passwordHash" class="db-form-input" value="${record?.password_hash || record?.passwordHash || ''}"></div>
      `;
    } else if (this.activeTable === 'endpoints') {
      fieldsHtml = `
        ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">User ID (Owner)</label><input type="text" name="userId" class="db-form-input" required></div>` : ''}
        <div class="db-form-group"><label class="db-form-label">Link</label><input type="text" name="link" class="db-form-input" value="${record?.link || ''}" required></div>
        <div class="db-form-group"><label class="db-form-label">Type</label>
          <select name="type" class="db-form-input">
            <option value="RSS">RSS</option><option value="ATOM">ATOM</option>
            <option value="NEWS_API">NEWS_API</option><option value="HTML">HTML</option>
          </select>
        </div>
      `;
    } else if (this.activeTable === 'openskyPlanes') {
      fieldsHtml = `
        ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">ICAO24 (Hex)</label><input type="text" name="icao24" class="db-form-input" required></div>` : ''}
        <div class="db-form-group"><label class="db-form-label">Callsign</label><input type="text" name="callsign" class="db-form-input" value="${record?.callsign || ''}"></div>
        <div class="db-form-group"><label class="db-form-label">Origin Country</label><input type="text" name="originCountry" class="db-form-input" value="${record?.origin_country || record?.originCountry || ''}"></div>
        ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">User ID (Owner)</label><input type="text" name="userId" class="db-form-input" required></div>` : ''}
      `;
    } else {
      fieldsHtml = `<div class="db-form-group" style="padding: 2rem; color: var(--danger-color, #ef4444); text-align: center;">Direct UI edits for <b>${this.activeTable}</b> are not fully mapped yet. Please manage via API.</div>`;
    }

    // Modal Frame wrapper (Uses native HTML template variable substitution so Lit-html renders it purely natively)
    const title = isEdit ? `Edit ${this.activeTable} Record` : `Add specific ${this.activeTable} Record`;

    return html`
      <div class="db-modal-overlay" id="dbModalOverlay">
        <form class="db-modal" id="dbModalForm">
          <div class="db-modal-header">
            ${title}
            <button type="button" class="db-modal-close" id="dbModalClose">×</button>
          </div>
          <div class="db-modal-body">
            <!-- Injecting RAW HTML fields since LitHtml doesn't natively parse string literals inside standard templates safely without unsafeHTML -->
            <div id="dbModalDynamicFields" style="display:flex; flex-direction: column; gap: 0.75rem;"></div>
          </div>
          <div class="db-modal-footer">
            <button type="button" class="db-btn-cancel" id="dbModalCancel">Cancel</button>
            <button type="submit" class="db-btn-save">${isEdit ? 'Save Changes' : 'Create Record'}</button>
          </div>
        </form>
      </div>
    `;
  }

  public bindEvents(container: HTMLElement | null): void {
    if (!container) return;
    this.container = container;

    // Sidebar & Tabs Navigation
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Sidebar handling
      if (target.classList.contains('db-sidebar-btn')) {
        const section = target.dataset.section as SidebarSection;
         if (section !== this.activeSection) {
          this.activeSection = section;
          if (section === 'users') this.activeTable = 'users';
          if (section === 'news') this.activeTable = 'endpoints';
          if (section === 'flightRadar') this.activeTable = 'openskyPlanes';
          this.reRenderApp(); 
        }
      }

      // Tabs handling
      if (target.classList.contains('db-tab')) {
        this.activeTable = target.dataset.table as TableName;
        this.reRenderApp();
      }

      // Add Button
      if (target.id === 'dbBtnAdd') this.openModal('add');

      // Edit / Delete Row Buttons
      if (target.classList.contains('db-btn-delete')) {
        const id = target.dataset.id;
        if (id && confirm(`Are you sure you want to delete record ${id}?`)) this.handleDelete(id);
      }
      if (target.classList.contains('db-btn-edit')) {
        const id = target.dataset.id;
        if (id) this.openModal('edit', id);
      }

      // Refresh Button
      if (target.id === 'dbBtnRefresh') this.fetchData();

      // Modal Triggers mapped dynamically
      if (target.id === 'dbModalClose' || target.id === 'dbModalCancel' || target.id === 'dbModalOverlay') {
        if (target.id === 'dbModalOverlay' && e.target !== e.currentTarget) return; // Prevent overlay closing on form click
        this.closeModal();
      }
    });

    // We must manually attach the form submission handler (Since dom nodes replace)
    container.addEventListener('submit', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'dbModalForm') {
        e.preventDefault();
        this.handleModalSubmit(new FormData(target as HTMLFormElement));
      }
    });

    // Populate actual HTML fields dynamically post-render so LitHtml doesn't complain
    this.injectDynamicModalFields();

    // Initial Fetch
    this.fetchData();
  }

  private openModal(mode: 'add' | 'edit', recordId?: string) {
    this.modalState = { isOpen: true, mode, recordId };
    this.reRenderApp();
  }

  private closeModal() {
    this.modalState = { isOpen: false, mode: 'add' };
    this.reRenderApp();
  }

  // Inject raw HTML payload dynamically since we generated it as a string
  private injectDynamicModalFields() {
    if(!this.container || !this.modalState.isOpen) return;
    const dynamicContainer = this.container.querySelector('#dbModalDynamicFields');
    if(dynamicContainer) {
        // Redundant generation purely to supply raw DOM injection cleanly
        const isEdit = this.modalState.mode === 'edit';
        const record = isEdit ? this.currentData.find(r => (r.id || r.icao24 || '').toString() === this.modalState.recordId) : {};
        if (this.activeTable === 'users') {
            dynamicContainer.innerHTML = `
              ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">Unique ID</label><input type="text" name="id" class="db-form-input" required></div>` : ''}
              <div class="db-form-group"><label class="db-form-label">Username</label><input type="text" name="username" class="db-form-input" value="${record?.username || ''}" required></div>
              <div class="db-form-group"><label class="db-form-label">Email</label><input type="email" name="email" class="db-form-input" value="${record?.email || ''}" required></div>
              <div class="db-form-group"><label class="db-form-label">Password Hash / Token</label><input type="text" name="passwordHash" class="db-form-input" value="${record?.password_hash || record?.passwordHash || ''}"></div>
            `;
        } else if (this.activeTable === 'endpoints') {
            dynamicContainer.innerHTML = `
              ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">User ID (Owner)</label><input type="text" name="userId" class="db-form-input" required></div>` : ''}
              <div class="db-form-group"><label class="db-form-label">Feed Root Link / API target</label><input type="text" name="link" class="db-form-input" value="${record?.link || ''}" required></div>
              <div class="db-form-group"><label class="db-form-label">Type Protocol</label>
                <select name="type" class="db-form-input">
                  <option value="RSS">RSS</option><option value="ATOM">ATOM</option>
                  <option value="NEWS_API">NEWS_API</option><option value="HTML">HTML</option>
                </select>
              </div>
            `;
        } else if (this.activeTable === 'openskyPlanes') {
            dynamicContainer.innerHTML = `
              ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">ICAO24 (Hex)</label><input type="text" name="icao24" class="db-form-input" required></div>` : ''}
              <div class="db-form-group"><label class="db-form-label">Callsign</label><input type="text" name="callsign" class="db-form-input" value="${record?.callsign || ''}"></div>
              <div class="db-form-group"><label class="db-form-label">Origin Country</label><input type="text" name="originCountry" class="db-form-input" value="${record?.origin_country || record?.originCountry || ''}"></div>
              ${!isEdit ? `<div class="db-form-group"><label class="db-form-label">User ID (Owner)</label><input type="text" name="userId" class="db-form-input" required></div>` : ''}
            `;
        } else {
             dynamicContainer.innerHTML = `<div class="db-form-group" style="padding: 2rem; color: var(--danger-color, #ef4444); text-align: center;">Direct UI edits for <b>${this.activeTable}</b> are not fully mapped yet into modals.</div>`;
        }
    }
  }


  private reRenderApp() {
    if (!this.container) return;
    import('lit-html').then(({ render: litRender }) => {
      litRender(this.render(), this.container!);
      this.injectDynamicModalFields();
      if(!this.modalState.isOpen) this.fetchData(); // Refetch underneath when tabs change
    });
  }

  // --- DATABASE OPERATIONS ---

  private async handleModalSubmit(formData: FormData) {
      try {
        const isEdit = this.modalState.mode === 'edit';
        
        if (this.activeTable === 'users') {
            const username = formData.get('username') as string;
            if(!isEdit) {
               await db.insert(users).values({ id: formData.get('id') as string, username, email: formData.get('email') as string, passwordHash: formData.get('passwordHash') as string || '', createdAt: Math.floor(Date.now() / 1000) });
            } else {
               await db.update(users).set({ username, email: formData.get('email') as string }).where(eq(users.id, this.modalState.recordId as string));
            }
        } 
        else if (this.activeTable === 'endpoints') {
             const link = formData.get('link') as string;
             const type = formData.get('type') as any;
             if(!isEdit) {
                 await db.insert(endpoints).values({ userId: formData.get('userId') as string, link, type });
             } else {
                 await db.update(endpoints).set({ link, type }).where(eq(endpoints.id, parseInt(this.modalState.recordId as string, 10)));
             }
        }
        else if (this.activeTable === 'openskyPlanes') {
            const callsign = formData.get('callsign') as string;
            const originCountry = formData.get('originCountry') as string;
             if(!isEdit) {
                 await db.insert(openskyPlanes).values({ icao24: formData.get('icao24') as string, callsign, originCountry, userId: formData.get('userId') as string });
             } else {
                 await db.update(openskyPlanes).set({ callsign, originCountry }).where(eq(openskyPlanes.icao24, this.modalState.recordId as string));
             }
        }

        this.closeModal();
      } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          alert(`Query Failed: ${msg}. Check required constraints (e.g., if User ID exists)`);
          console.error(err);
      }
  }

  private async fetchData() {
    this.setLoading(true);
    try {
      this.currentData = []; // Clear old cache fast visually
      switch (this.activeTable) {
        case 'users': this.currentData = await db.select().from(users); break;
        case 'endpoints': this.currentData = await db.select().from(endpoints); break;
        case 'publications': this.currentData = await db.select().from(publications); break;
        case 'feedItems': this.currentData = await db.select().from(feedItems); break;
        case 'openskyPlanes': this.currentData = await db.select().from(openskyPlanes); break;
        case 'openskyPlanePositions': this.currentData = await db.select().from(openskyPlanePositions); break;
      }
      this.renderGrid();
    } catch (err: unknown) {
      console.error('Failed to fetch data', err);
      const msg = err instanceof Error ? err.message : String(err);
      this.showError(`DB Error: ${msg}`);
    } finally {
      this.setLoading(false);
    }
  }

  private async handleDelete(id: string) {
    try {
      this.setLoading(true);
      const numericId = parseInt(id, 10);
      switch (this.activeTable) {
        case 'users': await db.delete(users).where(eq(users.id, id)); break;
        case 'endpoints': await db.delete(endpoints).where(eq(endpoints.id, numericId)); break;
        case 'publications': await db.delete(publications).where(eq(publications.id, numericId)); break;
        case 'feedItems': await db.delete(feedItems).where(eq(feedItems.id, id)); break;
        case 'openskyPlanes': await db.delete(openskyPlanes).where(eq(openskyPlanes.icao24, id)); break;
        case 'openskyPlanePositions': await db.delete(openskyPlanePositions).where(eq(openskyPlanePositions.id, numericId)); break;
      }
      await this.fetchData();
    } catch (err) {
      console.error('Delete error', err);
      alert('Failed to delete record.');
    }
  }

  private renderGrid() {
    if (!this.container) return;
    const grid = this.container.querySelector('#dbDataGrid');
    if (!grid) return;

    if (this.currentData.length === 0) {
      grid.innerHTML = `<div class="db-loading">No records found in <b>${this.activeTable}</b>.</div>`;
      return;
    }

    const columns = Object.keys(this.currentData[0]);

    let html = `<table class="db-table"><thead><tr>`;
    columns.forEach(col => { html += `<th>${col}</th>`; });
    html += `<th>Actions</th></tr></thead><tbody>`;

    this.currentData.forEach(row => {
      const rowId = row.id || row.icao24 || ''; 
      html += `<tr>`;
      columns.forEach(col => {
        let val = row[col];
        if (val === null) val = '--';
        if (typeof val === 'boolean') val = val ? 'True' : 'False';
        html += `<td title="${val}">${val}</td>`;
      });
      html += `
        <td>
          <button type="button" class="db-btn-edit" data-id="${rowId}">Edit</button>
          <button type="button" class="db-btn-delete" data-id="${rowId}">Del</button>
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
      if (grid) grid.innerHTML = `<div class="db-loading">Loading data from ${this.activeTable}...</div>`;
    }
  }

  private showError(msg: string) {
    if (this.container) {
      const grid = this.container.querySelector('#dbDataGrid');
      if (grid) grid.innerHTML = `<div class="db-loading" style="color: var(--danger-color, #ef4444);">${msg}</div>`;
    }
  }
}