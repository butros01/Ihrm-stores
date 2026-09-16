/* ============================================================
   IHRM Stores Register — client-side demo application
   Data is kept in the browser (localStorage). Replace the
   loadState/saveState functions with real API calls when this
   is connected to a backend and database.
   ============================================================ */

const STORAGE_KEY = "ihrm_stores_data_v1";

const state = {
  items: [],
  ledger: [] // { id, date, type: 'IN'|'OUT', code, name, qty, balanceAfter, ref, dept, supplier, requester }
};

/* ---------- Seed data (first run only) ---------- */
function seedData() {
  state.items = [
    { code: "STA-001", name: "A4 Bond Paper Ream", category: "Stationery", unit: "Ream", stock: 42, reorder: 20, location: "Store A - Shelf 1" },
    { code: "STA-014", name: "Box Files", category: "Stationery", unit: "Piece", stock: 15, reorder: 25, location: "Store A - Shelf 2" },
    { code: "ICT-007", name: "Toner Cartridge HP26A", category: "ICT Consumables", unit: "Cartridge", stock: 4, reorder: 6, location: "Store B - Cage 1" },
    { code: "CRT-002", name: "Certificate Blank Sheets", category: "Certification Materials", unit: "Box", stock: 30, reorder: 10, location: "Store B - Cage 2" },
    { code: "TRN-005", name: "Training Notepads", category: "Training Materials", unit: "Pack", stock: 18, reorder: 15, location: "Store A - Shelf 4" },
    { code: "CLN-003", name: "Hand Sanitiser 500ml", category: "Cleaning & Maintenance", unit: "Bottle", stock: 9, reorder: 12, location: "Store C - Rack 1" }
  ];
  const today = new Date().toISOString().slice(0, 10);
  state.ledger = [
    { id: uid(), date: today, type: "IN", code: "STA-001", name: "A4 Bond Paper Ream", qty: 20, balanceAfter: 42, ref: "LPO-2026-0140", supplier: "Silverline Suppliers" },
    { id: uid(), date: today, type: "OUT", code: "ICT-007", name: "Toner Cartridge HP26A", qty: 2, balanceAfter: 4, dept: "ICT Department", requester: "J. Mwangi" }
  ];
  saveState();
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- Persistence ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { seedData(); return; }
    const parsed = JSON.parse(raw);
    state.items = parsed.items || [];
    state.ledger = parsed.ledger || [];
  } catch (e) {
    console.error("Could not load stored data, starting fresh.", e);
    seedData();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Could not save data to this browser.", e);
  }
}

/* ---------- Helpers ---------- */
function findItem(code) {
  return state.items.find(i => i.code === code);
}

function fmtDate(d) {
  if (!d) return "—";
  return d;
}

function statusTag(item) {
  return item.stock <= item.reorder
    ? `<span class="tag low">LOW</span>`
    : `<span class="tag ok">OK</span>`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ============================================================
   NAVIGATION
   ============================================================ */
const viewTitles = {
  dashboard: ["Dashboard", "Current position of the IHRM stores register"],
  items: ["Item Master", "Register and manage stores items"],
  receive: ["Receive Stock", "Log goods received into store"],
  issue: ["Issue Stock", "Log goods issued out of store"],
  ledger: ["Stock Ledger", "Full movement history for every item"],
  reports: ["Reports", "Generate and export stores reports"]
};

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  document.getElementById("viewTitle").textContent = viewTitles[name][0];
  document.getElementById("viewSub").textContent = viewTitles[name][1];

  // Close mobile sidebar after navigating
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("navToggle").setAttribute("aria-expanded", "false");

  if (name === "dashboard") renderDashboard();
  if (name === "items") renderItems();
  if (name === "receive") { renderItemSelect("receiveItem"); renderReceiveTable(); }
  if (name === "issue") { renderItemSelect("issueItem"); renderIssueTable(); }
  if (name === "ledger") { renderLedgerFilters(); renderLedgerTable(); }
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

document.getElementById("navToggle").addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  const open = sidebar.classList.toggle("open");
  document.getElementById("navToggle").setAttribute("aria-expanded", String(open));
});

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  document.getElementById("statItems").textContent = state.items.length;
  const lowItems = state.items.filter(i => i.stock <= i.reorder);
  document.getElementById("statLow").textContent = lowItems.length;

  const today = todayStr();
  const inToday = state.ledger.filter(l => l.type === "IN" && l.date === today).reduce((s, l) => s + l.qty, 0);
  const outToday = state.ledger.filter(l => l.type === "OUT" && l.date === today).reduce((s, l) => s + l.qty, 0);
  document.getElementById("statIn").textContent = inToday;
  document.getElementById("statOut").textContent = outToday;

  const lowBody = document.querySelector("#lowStockTable tbody");
  lowBody.innerHTML = lowItems.length ? lowItems.map(i => `
    <tr>
      <td class="mono">${i.code}</td>
      <td>${i.name}</td>
      <td>${i.unit}</td>
      <td>${i.stock}</td>
      <td>${i.reorder}</td>
      <td>${statusTag(i)}</td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">Nothing below reorder level right now.</td></tr>`;

  const recent = [...state.ledger].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const recentBody = document.querySelector("#recentLedgerTable tbody");
  recentBody.innerHTML = recent.length ? recent.map(l => `
    <tr>
      <td>${fmtDate(l.date)}</td>
      <td><span class="tag ${l.type === 'IN' ? 'in' : 'out'}">${l.type === 'IN' ? 'RECEIVED' : 'ISSUED'}</span></td>
      <td class="mono">${l.code}</td>
      <td>${l.name}</td>
      <td>${l.qty}</td>
      <td>${l.ref || l.dept || "—"}</td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">No movements recorded yet.</td></tr>`;
}

/* ============================================================
   ITEM MASTER
   ============================================================ */
function renderItems() {
  document.getElementById("itemCount").textContent = state.items.length + (state.items.length === 1 ? " item" : " items");
  const body = document.querySelector("#itemsTable tbody");
  body.innerHTML = state.items.length ? state.items.map(i => `
    <tr>
      <td class="mono">${i.code}</td>
      <td>${i.name}</td>
      <td>${i.category}</td>
      <td>${i.unit}</td>
      <td>${i.stock}</td>
      <td>${i.reorder}</td>
      <td>${i.location || "—"}</td>
      <td>${statusTag(i)}</td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="8">No items registered yet.</td></tr>`;
}

document.getElementById("itemForm").addEventListener("submit", e => {
  e.preventDefault();
  const code = document.getElementById("itemCode").value.trim();
  if (findItem(code)) {
    alert("An item with this code already exists. Use a unique item code.");
    return;
  }
  state.items.push({
    code,
    name: document.getElementById("itemName").value.trim(),
    category: document.getElementById("itemCategory").value,
    unit: document.getElementById("itemUnit").value.trim(),
    stock: 0,
    reorder: Number(document.getElementById("itemReorder").value) || 0,
    location: document.getElementById("itemLocation").value.trim()
  });
  saveState();
  e.target.reset();
  document.getElementById("itemReorder").value = 10;
  renderItems();
});

/* ============================================================
   RECEIVE STOCK
   ============================================================ */
function renderItemSelect(selectId) {
  const sel = document.getElementById(selectId);
  const current = sel.value;
  sel.innerHTML = state.items.map(i => `<option value="${i.code}">${i.code} — ${i.name}</option>`).join("");
  if (current) sel.value = current;
}

function renderReceiveTable() {
  const body = document.querySelector("#receiveTable tbody");
  const rows = [...state.ledger].filter(l => l.type === "IN").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  body.innerHTML = rows.length ? rows.map(l => `
    <tr>
      <td>${fmtDate(l.date)}</td>
      <td class="mono">${l.code}</td>
      <td>${l.name}</td>
      <td>${l.qty}</td>
      <td>${l.supplier || "—"}</td>
      <td>${l.ref || "—"}</td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">No receipts recorded yet.</td></tr>`;
}

document.getElementById("receiveForm").addEventListener("submit", e => {
  e.preventDefault();
  const code = document.getElementById("receiveItem").value;
  const item = findItem(code);
  if (!item) { alert("Register the item first under Item Master."); return; }
  const qty = Number(document.getElementById("receiveQty").value);
  item.stock += qty;
  state.ledger.push({
    id: uid(),
    date: document.getElementById("receiveDate").value,
    type: "IN",
    code: item.code,
    name: item.name,
    qty,
    balanceAfter: item.stock,
    supplier: document.getElementById("receiveSupplier").value.trim(),
    ref: document.getElementById("receiveRef").value.trim()
  });
  saveState();
  e.target.reset();
  renderReceiveTable();
});

/* ============================================================
   ISSUE STOCK
   ============================================================ */
function renderIssueTable() {
  const body = document.querySelector("#issueTable tbody");
  const rows = [...state.ledger].filter(l => l.type === "OUT").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  body.innerHTML = rows.length ? rows.map(l => `
    <tr>
      <td>${fmtDate(l.date)}</td>
      <td class="mono">${l.code}</td>
      <td>${l.name}</td>
      <td>${l.qty}</td>
      <td>${l.dept || "—"}</td>
      <td>${l.requester || "—"}</td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="6">No issues recorded yet.</td></tr>`;
}

document.getElementById("issueForm").addEventListener("submit", e => {
  e.preventDefault();
  const errorEl = document.getElementById("issueError");
  errorEl.textContent = "";
  const code = document.getElementById("issueItem").value;
  const item = findItem(code);
  if (!item) { errorEl.textContent = "Register the item first under Item Master."; return; }
  const qty = Number(document.getElementById("issueQty").value);
  if (qty > item.stock) {
    errorEl.textContent = `Only ${item.stock} ${item.unit}(s) of ${item.name} available. Cannot issue ${qty}.`;
    return;
  }
  item.stock -= qty;
  state.ledger.push({
    id: uid(),
    date: document.getElementById("issueDate").value,
    type: "OUT",
    code: item.code,
    name: item.name,
    qty,
    balanceAfter: item.stock,
    dept: document.getElementById("issueDept").value.trim(),
    requester: document.getElementById("issueRequester").value.trim()
  });
  saveState();
  e.target.reset();
  renderIssueTable();
});

/* ============================================================
   STOCK LEDGER
   ============================================================ */
function renderLedgerFilters() {
  const sel = document.getElementById("ledgerFilterItem");
  const current = sel.value;
  sel.innerHTML = `<option value="">All items</option>` + state.items.map(i => `<option value="${i.code}">${i.code} — ${i.name}</option>`).join("");
  sel.value = current;
}

function renderLedgerTable() {
  const codeFilter = document.getElementById("ledgerFilterItem").value;
  const typeFilter = document.getElementById("ledgerFilterType").value;
  const from = document.getElementById("ledgerFrom").value;
  const to = document.getElementById("ledgerTo").value;

  let rows = [...state.ledger];
  if (codeFilter) rows = rows.filter(l => l.code === codeFilter);
  if (typeFilter) rows = rows.filter(l => l.type === typeFilter);
  if (from) rows = rows.filter(l => l.date >= from);
  if (to) rows = rows.filter(l => l.date <= to);
  rows.sort((a, b) => b.date.localeCompare(a.date));

  const body = document.querySelector("#ledgerTable tbody");
  body.innerHTML = rows.length ? rows.map(l => `
    <tr>
      <td>${fmtDate(l.date)}</td>
      <td><span class="tag ${l.type === 'IN' ? 'in' : 'out'}">${l.type === 'IN' ? 'RECEIVED' : 'ISSUED'}</span></td>
      <td class="mono">${l.code}</td>
      <td>${l.name}</td>
      <td>${l.type === 'IN' ? '+' : '-'}${l.qty}</td>
      <td>${l.balanceAfter}</td>
      <td>${l.ref || l.dept || "—"}</td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="7">No movements match this filter.</td></tr>`;
}

document.getElementById("ledgerFilterBtn").addEventListener("click", renderLedgerTable);
document.getElementById("ledgerResetBtn").addEventListener("click", () => {
  document.getElementById("ledgerFilterItem").value = "";
  document.getElementById("ledgerFilterType").value = "";
  document.getElementById("ledgerFrom").value = "";
  document.getElementById("ledgerTo").value = "";
  renderLedgerTable();
});

/* ============================================================
   REPORTS
   ============================================================ */
let currentReport = { title: "", columns: [], rows: [] };

function buildReport(type, from, to) {
  if (type === "balance") {
    return {
      title: "Stock Balance Report",
      columns: ["Code", "Item", "Category", "Unit", "On hand", "Reorder level", "Status"],
      rows: state.items.map(i => [i.code, i.name, i.category, i.unit, i.stock, i.reorder, i.stock <= i.reorder ? "LOW" : "OK"])
    };
  }
  if (type === "lowstock") {
    const low = state.items.filter(i => i.stock <= i.reorder);
    return {
      title: "Low-Stock Report",
      columns: ["Code", "Item", "Category", "Unit", "On hand", "Reorder level"],
      rows: low.map(i => [i.code, i.name, i.category, i.unit, i.stock, i.reorder])
    };
  }
  // movement
  let rows = [...state.ledger];
  if (from) rows = rows.filter(l => l.date >= from);
  if (to) rows = rows.filter(l => l.date <= to);
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return {
    title: "Movement Report",
    columns: ["Date", "Type", "Code", "Item", "Qty", "Balance after", "Reference / Department"],
    rows: rows.map(l => [l.date, l.type === "IN" ? "Received" : "Issued", l.code, l.name, l.qty, l.balanceAfter, l.ref || l.dept || "—"])
  };
}

document.getElementById("generateReportBtn").addEventListener("click", () => {
  const type = document.getElementById("reportType").value;
  const from = document.getElementById("reportFrom").value;
  const to = document.getElementById("reportTo").value;

  currentReport = buildReport(type, from, to);

  document.getElementById("reportTitleText").textContent = currentReport.title;
  document.getElementById("reportGenDate").textContent = new Date().toLocaleString();
  document.getElementById("reportPeriod").textContent = (from || to) ? `${from || "start"} to ${to || "today"}` : "All dates";

  const thead = document.querySelector("#reportTable thead");
  const tbody = document.querySelector("#reportTable tbody");
  thead.innerHTML = "<tr>" + currentReport.columns.map(c => `<th>${c}</th>`).join("") + "</tr>";
  tbody.innerHTML = currentReport.rows.length
    ? currentReport.rows.map(r => "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>").join("")
    : `<tr class="empty-row"><td colspan="${currentReport.columns.length}">No data for this report.</td></tr>`;

  document.getElementById("reportOutput").hidden = false;
});

document.getElementById("exportExcelBtn").addEventListener("click", () => {
  if (!currentReport.rows.length && currentReport.columns.length === 0) return;
  const sheetData = [currentReport.columns, ...currentReport.rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, currentReport.title.slice(0, 31));
  XLSX.writeFile(wb, `IHRM_${currentReport.title.replace(/\s+/g, "_")}_${todayStr()}.xlsx`);
});

document.getElementById("exportPdfBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(13);
  doc.text("Institute of Human Resource Management", 14, 16);
  doc.setFontSize(10);
  doc.text(`Stores Register — ${currentReport.title}`, 14, 23);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29);
  doc.autoTable({
    startY: 35,
    head: [currentReport.columns],
    body: currentReport.rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 31, 28] }
  });
  const finalY = doc.lastAutoTable.finalY || 35;
  doc.setFontSize(9);
  doc.text("Prepared by: _______________________", 14, finalY + 20);
  doc.text("Approved by: _______________________", 120, finalY + 20);
  doc.save(`IHRM_${currentReport.title.replace(/\s+/g, "_")}_${todayStr()}.pdf`);
});

/* ============================================================
   CLOCK
   ============================================================ */
function tickClock() {
  document.getElementById("clock").textContent = new Date().toLocaleString();
}
setInterval(tickClock, 1000);

/* ============================================================
   INIT
   ============================================================ */
loadState();
tickClock();
renderDashboard();
["receiveDate", "issueDate"].forEach(id => document.getElementById(id).value = todayStr());
