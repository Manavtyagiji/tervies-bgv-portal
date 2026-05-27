import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
 
const BASE = "https://tervies.info";
 
/* ─────────────────────────────────────────
   EXCEL COLUMN MAP
───────────────────────────────────────── */
const COLUMN_MAP = {
  "name": "name", "full name": "name", "candidate name": "name", "applicant name": "name",
  "father name": "fatherName", "father's name": "fatherName", "fathername": "fatherName",
  "dob": "dob", "date of birth": "dob", "birth date": "dob",
  "gender": "gender", "sex": "gender",
  "email": "email", "email id": "email",
  "phone": "phone", "mobile": "phone", "contact": "phone", "phone number": "phone",
  "case id": "clientCaseId", "caseid": "clientCaseId", "client case id": "clientCaseId",
  "present address": "presentAddress", "address": "presentAddress", "current address": "presentAddress",
  "permanent address": "permanentAddress",
  "company": "company", "employer": "company", "organization": "company",
  "designation": "designation", "position": "designation",
  "duration": "duration", "tenure": "duration",
  "institution": "institution", "college": "institution", "school": "institution",
  "university": "university",
  "degree": "degree", "qualification": "degree",
  "year": "year", "passing year": "year", "year of passing": "year",
};
 
function normalizeHeader(h) { return String(h || "").toLowerCase().trim(); }
 
function parseExcelRows(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row, idx) => {
    const obj = { _rowNum: idx + 2 };
    headers.forEach((h, i) => {
      const field = COLUMN_MAP[h];
      if (field) obj[field] = String(row[i] ?? "").trim();
    });
    return obj;
  }).filter(r => r.name);
}
 
/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
 
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
  :root {
    --bg: #f0f2f5;
    --sidebar-bg: #0f172a;
    --sidebar-active: #1e3a5f;
    --sidebar-text: #94a3b8;
    --sidebar-text-active: #60a5fa;
    --white: #ffffff;
    --border: #e5e7eb;
    --text-primary: #0f172a;
    --text-secondary: #374151;
    --text-muted: #94a3b8;
    --blue: #3b82f6;
    --blue-dark: #1d4ed8;
    --green: #16a34a;
    --red: #dc2626;
    --orange: #ea580c;
    --amber: #d97706;
    --radius: 10px;
    --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.10);
    --shadow-lg: 0 16px 48px rgba(0,0,0,0.18);
  }
 
  .cd-root {
    display: flex;
    min-height: 100vh;
    background: var(--bg);
    font-family: 'DM Sans', sans-serif;
    color: var(--text-secondary);
  }
 
  /* ── Sidebar ── */
  .cd-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--sidebar-bg);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 100;
    overflow: hidden;
  }
  .cd-sidebar-logo {
    padding: 22px 20px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .cd-company-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .cd-company-logo {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    object-fit: contain;
    background: #ffffff;
    border: 1px solid rgba(255,255,255,0.14);
    padding: 4px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .cd-company-logo-placeholder {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1d4ed8, #06b6d4);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 15px;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.14);
    cursor: pointer;
  }
  .cd-company-brand-text {
    min-width: 0;
    flex: 1;
  }
  .cd-logo-upload-btn {
    padding: 7px 12px;
    border-radius: 7px;
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
    color: #15803d;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-logo-upload-btn:hover { background: #dcfce7; border-color: #86efac; }
  .cd-logo-remove-btn {
    padding: 7px 10px;
    border-radius: 7px;
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #e11d48;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-logo-remove-btn:hover { background: #ffe4e6; }
  .cd-topbar-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .cd-topbar-logo {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    object-fit: contain;
    background: #fff;
    border: 1px solid var(--border);
    padding: 3px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .cd-logo-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cd-sidebar-logo-name {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cd-sidebar-logo-sub {
    font-size: 10.5px;
    color: #475569;
    margin-top: 3px;
    font-family: 'DM Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cd-sidebar-nav { padding: 14px 10px; flex: 1; overflow-y: auto; }
  .cd-nav-section {
    font-size: 10px;
    color: #334155;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 10px 8px 5px;
  }
  .cd-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    color: var(--sidebar-text);
    font-size: 13.5px;
    font-weight: 500;
    transition: background 0.13s, color 0.13s;
    margin-bottom: 2px;
    user-select: none;
  }
  .cd-nav-item:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
  .cd-nav-item.active { background: var(--sidebar-active); color: var(--sidebar-text-active); }
  .cd-nav-item .icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }
  .cd-sidebar-footer {
    padding: 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .cd-logout-btn {
    width: 100%;
    padding: 9px;
    border-radius: 8px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.18);
    color: #f87171;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-logout-btn:hover { background: rgba(239,68,68,0.2); }
 
  /* ── Main ── */
  .cd-main {
    margin-left: 240px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .cd-topbar {
    background: var(--white);
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: var(--shadow);
  }
  .cd-topbar-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
  .cd-topbar-right { display: flex; align-items: center; gap: 10px; }
  .cd-refresh-btn {
    padding: 7px 14px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--white);
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-refresh-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
  .cd-refresh-btn.on { background: #fef9c3; border-color: #fde047; color: #713f12; }
  .cd-manual-refresh-btn {
    padding: 7px 14px;
    border-radius: 7px;
    border: 1px solid #dbeafe;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-manual-refresh-btn:hover { background: #dbeafe; }
  .cd-manual-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
 
  .cd-content { padding: 22px 28px; flex: 1; }
 
  /* ── Stats ── */
  .cd-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .cd-stat {
    background: var(--white);
    border-radius: var(--radius);
    padding: 16px 18px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }
  .cd-stat-label {
    font-size: 10.5px;
    color: var(--text-muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 8px;
  }
  .cd-stat-val { font-size: 30px; font-weight: 700; color: var(--text-primary); line-height: 1; }
  .cd-stat.verified .cd-stat-val { color: var(--green); }
  .cd-stat.review .cd-stat-val { color: var(--amber); }
  .cd-stat.disc .cd-stat-val { color: var(--red); }
  .cd-stat.insuf .cd-stat-val { color: var(--orange); }
 
  /* ── Filter bar ── */
  .cd-filter-bar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .cd-search {
    flex: 1;
    min-width: 220px;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
    font-family: 'DM Sans', sans-serif;
    background: var(--white);
    transition: border-color 0.13s, box-shadow 0.13s;
  }
  .cd-search:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .cd-select {
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
    background: var(--white);
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: border-color 0.13s;
  }
  .cd-select:focus { border-color: var(--blue); }
 
  /* ── Table ── */
  .cd-table-wrap {
    background: var(--white);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .cd-table { width: 100%; border-collapse: collapse; }
  .cd-table thead { background: #f8fafc; }
  .cd-table th {
    padding: 10px 14px;
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .cd-table td {
    padding: 11px 14px;
    font-size: 13px;
    color: var(--text-secondary);
    border-bottom: 1px solid #f1f5f9;
  }
  .cd-table tbody tr:last-child td { border-bottom: none; }
  .cd-table tbody tr { transition: background 0.1s; }
  .cd-table tbody tr:hover { background: #f8fafc; }
  .cd-mono { font-family: 'DM Mono', monospace; font-size: 11.5px; color: #64748b; }
 
  /* ── Badge ── */
  .cd-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .cd-badge.SUBMITTED    { background: #dbeafe; color: #1d4ed8; }
  .cd-badge.UNDER_REVIEW { background: #fef3c7; color: #92400e; }
  .cd-badge.VERIFIED     { background: #dcfce7; color: #166534; }
  .cd-badge.DISCREPANCY  { background: #fee2e2; color: #991b1b; }
  .cd-badge.INSUFFICIENT { background: #ffedd5; color: #9a3412; }
  .cd-badge.SENT         { background: #dcfce7; color: #166534; }
  .cd-badge.READY        { background: #dbeafe; color: #1d4ed8; }
  .cd-badge.ERROR        { background: #fee2e2; color: #991b1b; }
 
  /* ── Buttons ── */
  .cd-view-btn {
    padding: 5px 13px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--white);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-view-btn:hover { background: var(--text-primary); color: white; border-color: var(--text-primary); }
  .cd-dl-btn {
    padding: 5px 13px;
    border-radius: 7px;
    border: none;
    background: var(--text-primary);
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-dl-btn:hover { background: #1e3a5f; }
  .cd-dl-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .cd-primary-btn {
    padding: 9px 18px;
    border-radius: 8px;
    border: none;
    background: var(--text-primary);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.13s;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .cd-primary-btn:hover { background: #1e293b; }
  .cd-primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .cd-success-btn {
    padding: 9px 18px;
    border-radius: 8px;
    border: none;
    background: var(--green);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.13s;
  }
  .cd-success-btn:hover { background: #15803d; }
 
  /* ── Card ── */
  .cd-card {
    background: var(--white);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    padding: 20px 22px;
    margin-bottom: 16px;
    box-shadow: var(--shadow);
  }
  .cd-card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; }
 
  /* ── Billing ── */
  .cd-billing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
  .cd-billing-item {
    background: #f8fafc;
    border-radius: 9px;
    padding: 14px;
    border: 1px solid var(--border);
  }
  .cd-billing-label {
    font-size: 10.5px;
    color: var(--text-muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 5px;
  }
  .cd-billing-val { font-size: 20px; font-weight: 700; color: var(--text-primary); }
  .cd-billing-val.green { color: var(--green); }
 
  /* ── Agreement ── */
  .cd-agreement-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 15px;
    border: 1px solid var(--border);
    border-radius: 9px;
    margin-bottom: 10px;
    background: #f8fafc;
    gap: 12px;
  }
  .cd-agreement-info { display: flex; align-items: center; gap: 12px; }
  .cd-agreement-icon { font-size: 22px; }
  .cd-agreement-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .cd-agreement-date { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
 
  /* ── Upload tab ── */
  .cd-upload-info {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: var(--radius);
    padding: 16px 18px;
    margin-bottom: 16px;
  }
  .cd-upload-info h3 { font-size: 13.5px; font-weight: 700; color: #1d4ed8; margin-bottom: 10px; }
  .cd-upload-info ol { padding-left: 18px; color: #3730a3; font-size: 13px; line-height: 1.9; }
  .cd-drop-zone {
    background: var(--white);
    border: 2px dashed #cbd5e1;
    border-radius: var(--radius);
    padding: 44px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 16px;
    box-shadow: var(--shadow);
  }
  .cd-drop-zone:hover, .cd-drop-zone.drag-over {
    border-color: var(--blue);
    background: #f0f9ff;
  }
 
  /* ── Modal ── */
  .cd-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .cd-modal {
    background: var(--white);
    border-radius: 14px;
    width: 100%;
    max-width: 620px;
    max-height: 88vh;
    overflow-y: auto;
    padding: 26px 28px;
    box-shadow: var(--shadow-lg);
    animation: slideUp2 0.18s ease;
  }
  @keyframes slideUp2 { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .cd-modal-title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
  .cd-modal-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 18px; font-family: 'DM Mono', monospace; }
  .cd-modal-section {
    font-size: 10.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    margin: 14px 0 7px;
  }
  .cd-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
  .cd-info-item { background: #f8fafc; border-radius: 8px; padding: 9px 11px; }
  .cd-info-label { font-size: 9.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 3px; }
  .cd-info-val { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .cd-doc-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 9px 13px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--white);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    margin-bottom: 7px;
    transition: all 0.13s;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-doc-btn:hover { background: #f0f9ff; border-color: var(--blue); color: var(--blue-dark); }
  .cd-report-banner {
    background: #dcfce7;
    border: 1px solid #86efac;
    border-radius: 9px;
    padding: 12px 15px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
  }
  .cd-no-report {
    background: #f8fafc;
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 12px 15px;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
    margin-top: 10px;
  }
 
  /* ── Toast ── */
  .cd-toast {
    position: fixed;
    bottom: 22px;
    right: 22px;
    background: #0f172a;
    color: white;
    padding: 11px 18px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: var(--shadow-md);
    z-index: 9999;
    animation: toastIn 0.2s ease;
    max-width: 320px;
  }
  @keyframes toastIn { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
 
  .cd-empty {
    text-align: center;
    padding: 44px 20px;
    color: var(--text-muted);
    font-size: 14px;
  }
 
  /* ── Loading spinner ── */
  .cd-spinner {
    display: inline-block;
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
 
  /* ── Upload preview table scroll ── */
  .cd-preview-scroll { overflow-x: auto; max-height: 380px; overflow-y: auto; }
 
  /* ── Submit progress bar ── */
  .cd-progress-bar {
    height: 4px;
    background: #e5e7eb;
    border-radius: 99px;
    margin: 10px 0;
    overflow: hidden;
  }
  .cd-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #6366f1);
    border-radius: 99px;
    transition: width 0.3s ease;
  }

  /* ── Folder upload (client page) ── */
  .cd-folder-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px;
    margin-bottom: 16px;
  }
  .cd-folder-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .cd-folder-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  .cd-folder-sub {
    font-size: 12px;
    color: var(--text-muted);
  }
  .cd-folder-drop {
    border: 2px dashed #cbd5e1;
    border-radius: 10px;
    padding: 26px;
    text-align: center;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 14px;
  }
  .cd-folder-drop:hover,
  .cd-folder-drop.drag-over {
    border-color: var(--blue);
    background: #eff6ff;
  }
  .cd-folder-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 14px;
  }
  .cd-folder-list {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
  }
  .cd-folder-list-head {
    padding: 10px 12px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    justify-content: space-between;
  }
  .cd-folder-list-body {
    max-height: 380px;
    overflow-y: auto;
  }
  .cd-folder-file {
    width: 100%;
    text-align: left;
    border: 0;
    border-bottom: 1px solid #f1f5f9;
    background: #fff;
    padding: 10px 12px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }
  .cd-folder-file:hover { background: #f8fafc; }
  .cd-folder-file.active {
    background: #eff6ff;
    color: #1d4ed8;
  }
  .cd-folder-file-name {
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cd-folder-file-path {
    font-size: 10.5px;
    color: #94a3b8;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cd-folder-preview {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #f8fafc;
    min-height: 380px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .cd-folder-preview-head {
    padding: 10px 12px;
    background: #fff;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }
  .cd-folder-preview-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .cd-folder-preview-body {
    height: 430px;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
  }
  .cd-folder-preview-body img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  .cd-folder-preview-body iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: white;
    border-radius: 8px;
  }
  @media (max-width: 900px) {
    .cd-folder-grid { grid-template-columns: 1fr; }
  }
`;
 
/* Inject styles once */
if (typeof document !== "undefined" && !document.getElementById("cd-v2-style")) {
  const s = document.createElement("style");
  s.id = "cd-v2-style";
  s.textContent = STYLE;
  document.head.appendChild(s);
}
 
/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function CompanyDashboard() {
  const navigate = useNavigate();
 
  /* Auth guard */
  useEffect(() => {
    const id   = localStorage.getItem("companyId");
    const role = localStorage.getItem("role");
    if (!id || role !== "company") navigate("/company/login");
  }, []);
 
  const companyId   = localStorage.getItem("companyId")   || "";
  const companyName = localStorage.getItem("companyName") || "Company";
  const companyLogoKey = `company_logo_${companyId || companyName}`;

  const getCompanyInitials = useCallback((name = "") => {
    const words = String(name || "Company").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "CO";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }, []);
 
  /* ── Core state ── */
  const [activeTab,    setActiveTab]    = useState("dashboard");
  const [cases,        setCases]        = useState([]);
  const [agreements,   setAgreements]   = useState([]);
  const [billing,      setBilling]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [dailyDownloading, setDailyDownloading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(() => localStorage.getItem(companyLogoKey) || "");
  const [showLogoOptions, setShowLogoOptions] = useState(false);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("ALL");
  const [selectedCase, setSelectedCase] = useState(null);
  const [autoRefresh,  setAutoRefresh]  = useState(false);
  const [toast,        setToast]        = useState(null);
  const autoRefreshRef = useRef(null);
 
  /* ── Excel upload state ── */
  const [excelRows,     setExcelRows]     = useState([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelError,    setExcelError]    = useState("");
  const [selectedRows,  setSelectedRows]  = useState([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitResults, setSubmitResults] = useState([]);
  const [submitDone,    setSubmitDone]    = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [isDragOver,    setIsDragOver]    = useState(false);
  const fileInputRef = useRef(null);

  /* ── Folder upload state (images + PDFs only, no localStorage to avoid white page) ── */
  const [folderFiles, setFolderFiles] = useState([]);
  const [selectedFolderFile, setSelectedFolderFile] = useState(null);
  const [folderDragOver, setFolderDragOver] = useState(false);
  const [folderSending, setFolderSending] = useState(false);
  const folderInputRef = useRef(null);
  const logoInputRef = useRef(null);
 
  /* ── Helpers ── */
  const showToast = useCallback((msg, duration = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);
 
  useEffect(() => {
    setCompanyLogo(localStorage.getItem(companyLogoKey) || "");
  }, [companyLogoKey]);

  const resizeLogoToDataUrl = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 260;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));

          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL("image/png", 0.92));
        };
        img.onerror = () => reject(new Error("Logo image could not be read"));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Logo file could not be read"));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleCompanyLogoUpload = useCallback(async (file) => {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      showToast("⚠️ Please upload only image file for logo", 4000);
      return;
    }

    try {
      const dataUrl = await resizeLogoToDataUrl(file);
      localStorage.setItem(companyLogoKey, dataUrl);
      setCompanyLogo(dataUrl);
      setShowLogoOptions(false);
      showToast("✅ Company logo updated", 3000);
    } catch (err) {
      console.error("Logo upload error:", err);
      showToast("❌ Could not save logo. Try smaller image.", 5000);
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, [companyLogoKey, resizeLogoToDataUrl, showToast]);

  const removeCompanyLogo = useCallback(() => {
    localStorage.removeItem(companyLogoKey);
    setCompanyLogo("");
    setShowLogoOptions(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
    showToast("Logo removed", 2500);
  }, [companyLogoKey, showToast]);


  /* ── Fetch all data ── */
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
 
    try {
      const headers = { companyid: companyId };
 
      const [casesRes, agRes, bilRes] = await Promise.all([
        fetch(`${BASE}/api/company/cases`,      { headers }),
        fetch(`${BASE}/api/company/agreements`, { headers }),
        fetch(`${BASE}/api/company/billing`,    { headers }),
      ]);
 
      const [casesData, agData, bilData] = await Promise.all([
        casesRes.json(),
        agRes.json(),
        bilRes.json(),
      ]);
 
      if (casesData.success) {
        setCases(casesData.cases || []);
      }
      if (agData.success)  setAgreements(agData.agreements || []);
      if (bilData.success) setBilling(bilData);
 
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);
 
  /* Initial load */
  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Cleanup folder preview object URLs */
  useEffect(() => {
    return () => {
      folderFiles.forEach(f => {
        try { URL.revokeObjectURL(f.url); } catch {}
      });
    };
  }, [folderFiles]);
 
  /* Auto-refresh interval */
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => fetchAll(true), 10000);
    } else {
      clearInterval(autoRefreshRef.current);
    }
    return () => clearInterval(autoRefreshRef.current);
  }, [autoRefresh, fetchAll]);
 
  const logout = () => { localStorage.clear(); window.location.href = "/company/login"; };
 
  /* ── Filtered + sorted cases ── */
  const filteredCases = useMemo(() => {
    let temp = [...cases];
    if (filter !== "ALL") temp = temp.filter(c => c.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      temp = temp.filter(c =>
        (c.name       || "").toLowerCase().includes(q) ||
        (c.caseId     || "").toLowerCase().includes(q) ||
        (c.clientCaseId || "").toLowerCase().includes(q)
      );
    }
    return temp.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [cases, filter, search]);
 
  const stats = useMemo(() => ({
    total:        cases.length,
    verified:     cases.filter(c => c.status === "VERIFIED").length,
    underReview:  cases.filter(c => c.status === "UNDER_REVIEW").length,
    discrepancy:  cases.filter(c => c.status === "DISCREPANCY").length,
    insufficient: cases.filter(c => c.status === "INSUFFICIENT").length,
  }), [cases]);

  /* ── Daily Reports Download — one click download for today's ready reports ── */
  const isToday = useCallback((dateValue) => {
    if (!dateValue) return false;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }, []);

  const dailyReadyReports = useMemo(() => {
    return cases
      .filter(c => c.sentToTrack)
      .filter(c => isToday(c.reportGeneratedAt || c.sentToTrackAt || c.updatedAt || c.createdAt))
      .sort((a, b) => new Date(b.reportGeneratedAt || b.sentToTrackAt || b.updatedAt || b.createdAt || 0) - new Date(a.reportGeneratedAt || a.sentToTrackAt || a.updatedAt || a.createdAt || 0));
  }, [cases, isToday]);

  const downloadSingleReport = useCallback(async (caseObj) => {
    const caseId = caseObj?.caseId || caseObj?.name || "report";
    const res = await fetch(`${BASE}/api/track/report/${encodeURIComponent(caseId)}`);
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok || contentType.includes("application/json")) {
      throw new Error(`Report not available for ${caseId}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${String(caseObj?.name || "BGV-Report").replace(/[^a-z0-9]/gi, "_")}_${String(caseId).replace(/[^a-z0-9]/gi, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, []);

  const handleDownloadDailyReports = useCallback(async () => {
    if (dailyReadyReports.length === 0) {
      showToast("⚠️ No ready reports found for today", 4000);
      return;
    }

    setDailyDownloading(true);
    let downloaded = 0;
    let failed = 0;

    for (const reportCase of dailyReadyReports) {
      try {
        await downloadSingleReport(reportCase);
        downloaded += 1;
        // Small delay so browser can handle multiple downloads safely.
        await new Promise(resolve => setTimeout(resolve, 350));
      } catch (err) {
        console.error("Daily report download failed:", err);
        failed += 1;
      }
    }

    setDailyDownloading(false);
    showToast(
      `✅ ${downloaded} daily report${downloaded !== 1 ? "s" : ""} downloaded${failed ? ` · ❌ ${failed} failed` : ""}`,
      6000
    );
  }, [dailyReadyReports, downloadSingleReport, showToast]);
 
  /* ── Excel file handler ── */
  const handleExcelFile = useCallback((file) => {
    setExcelError("");
    setSubmitResults([]);
    setSubmitDone(false);
    setSubmitProgress(0);
 
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setExcelError("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }
 
    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb     = XLSX.read(e.target.result, { type: "binary" });
        const ws     = wb.Sheets[wb.SheetNames[0]];
        const rows   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const parsed = parseExcelRows(rows);
        if (parsed.length === 0) {
          setExcelError("No valid candidate rows found. Make sure the file has a 'Name' column.");
          return;
        }
        setExcelRows(parsed);
        setSelectedRows(parsed.map((_, i) => i));
      } catch (err) {
        setExcelError("Failed to read file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  }, []);
 
  /* ── Submit selected rows to admin ── */
  const submitCasesToAdmin = useCallback(async () => {
    if (!selectedRows.length) return showToast("⚠️ Select at least one candidate");
 
    setSubmitting(true);
    setSubmitResults([]);
    setSubmitProgress(0);
 
    const results       = [];
    const prefix        = (companyName || "CMP").slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const batchTs       = Date.now();
    const newLocalCases = [];   // ← we'll collect created cases here
 
    for (let i = 0; i < selectedRows.length; i++) {
      const idx = selectedRows[i];
      const row = excelRows[idx];
 
      /* Build a unique case ID: PREFIX-TIMESTAMP-ROWINDEX */
      const caseId = `${prefix}-${batchTs}-${idx}`;
 
      const payload = {
        caseId,
        name:             row.name             || "",
        fatherName:       row.fatherName        || "",
        dob:              row.dob               || "",
        gender:           row.gender            || "",
        email:            row.email             || "",
        phone:            row.phone             || "",
        clientCaseId:     row.clientCaseId      || "",
        clientName:       companyName           || "",
        companyId:        companyId             || "",
        presentAddress:   row.presentAddress    || "",
        permanentAddress: row.permanentAddress  || "",
        company:          row.company           || "",
        designation:      row.designation       || "",
        duration:         row.duration          || "",
        institution:      row.institution       || "",
        university:       row.university        || "",
        degree:           row.degree            || "",
        year:             row.year              || "",
        status:           "SUBMITTED",
        checks:           [],
      };
 
      try {
        const res  = await fetch(`${BASE}/api/admin/create-case-from-company`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", companyid: companyId },
          body:    JSON.stringify(payload),
        });
        const data = await res.json();
 
        if (data.success) {
          results.push({ idx, name: row.name, status: "success", caseId });
          /* Capture what the server returned (has proper timestamps) */
          if (data.case) newLocalCases.push(data.case);
          else newLocalCases.push({ ...payload, createdAt: new Date().toISOString() });
        } else {
          results.push({ idx, name: row.name, status: "error", error: data.message || "Unknown error" });
        }
      } catch (err) {
        results.push({ idx, name: row.name, status: "error", error: "Network error" });
      }
 
      /* Update progress */
      setSubmitProgress(Math.round(((i + 1) / selectedRows.length) * 100));
      setSubmitResults([...results]);
    }
 
    /* ── FIX: Immediately add successfully created cases to local state ──
       This ensures they appear in the dashboard without needing a refresh.
       A background fetchAll also runs to sync any server-side differences. */
    if (newLocalCases.length > 0) {
      setCases(prev => {
        const existingIds = new Set(prev.map(c => c.caseId));
        const fresh = newLocalCases.filter(c => !existingIds.has(c.caseId));
        return [...fresh, ...prev];
      });
    }
 
    const successCount = results.filter(r => r.status === "success").length;
    const failCount    = results.filter(r => r.status === "error").length;
 
    setSubmitting(false);
    setSubmitDone(true);
 
    showToast(
      `✅ ${successCount} case${successCount !== 1 ? "s" : ""} submitted${failCount > 0 ? ` · ❌ ${failCount} failed` : ""}`,
      5000
    );
 
    /* Background sync after a short delay to get server-side data */
    setTimeout(() => fetchAll(true), 1500);
  }, [selectedRows, excelRows, companyId, companyName, fetchAll, showToast]);
 
  const resetExcel = useCallback(() => {
    setExcelRows([]);
    setExcelFileName("");
    setExcelError("");
    setSelectedRows([]);
    setSubmitResults([]);
    setSubmitDone(false);
    setSubmitProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);
 
  const downloadSample = useCallback(() => {
    const data = [
      ["Name","Father's Name","DOB","Gender","Email","Phone","Client Case ID","Present Address","Permanent Address","Company","Designation","Duration","Institution","University","Degree","Year"],
      ["Rajesh Kumar","Suresh Kumar","1990-05-15","Male","rajesh@example.com","9876543210","REF-001","123 MG Road Delhi","123 MG Road Delhi","Infosys Ltd","Software Engineer","2 Years","IIT Delhi","Delhi University","B.Tech","2012"],
      ["Priya Sharma","Mohan Sharma","1995-08-20","Female","priya@example.com","9123456789","REF-002","45 Sector 18 Noida","45 Sector 18 Noida","Wipro Ltd","Business Analyst","1 Year","DU","Delhi University","MBA","2018"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    XLSX.writeFile(wb, "Sample_BGV_Upload.xlsx");
  }, []);
 
  /* ── Drag-and-drop ── */
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = ()  => setIsDragOver(false);
  const handleDrop      = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleExcelFile(e.dataTransfer.files[0]);
  };

  /* ── Folder upload handler: only previews files in browser.
     It does NOT save files in localStorage/server, so it will not cause white page. ── */
  const handleFolderFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    const allowed = incoming.filter(file =>
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
    if (!allowed.length) {
      showToast("⚠️ Please upload images or PDF files only");
      return;
    }

    setFolderFiles(prev => {
      prev.forEach(f => {
        try { URL.revokeObjectURL(f.url); } catch {}
      });

      const next = allowed.map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        path: file.webkitRelativePath || file.name,
        type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : ""),
        size: file.size,
        file,
        url: URL.createObjectURL(file),
      }));

      setSelectedFolderFile(next[0] || null);
      return next;
    });
  }, [showToast]);

  const handleFolderDrop = useCallback((e) => {
    e.preventDefault();
    setFolderDragOver(false);
    handleFolderFiles(e.dataTransfer.files);
  }, [handleFolderFiles]);

  const sendFolderToAdmin = useCallback(async () => {
    if (!folderFiles.length) {
      showToast("⚠️ Please upload folder/images/PDF first");
      return;
    }

    setFolderSending(true);
    const prefix = (companyName || "FDR").slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X") || "FDR";
    const batchTs = Date.now();
    const caseId = `FDR-${prefix}-${batchTs}`;

    const payload = {
      caseId,
      name: `Folder Upload - ${companyName}`,
      fatherName: "",
      dob: "",
      gender: "",
      email: "",
      phone: "",
      clientCaseId: `FOLDER-${batchTs}`,
      clientName: companyName || "",
      companyId,
      presentAddress: "",
      permanentAddress: "",
      company: "",
      designation: "",
      duration: "",
      institution: "",
      university: "",
      degree: "",
      year: "",
      status: "SUBMITTED",
      checks: [],
    };

    try {
      const createRes = await fetch(`${BASE}/api/admin/create-case-from-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json", companyid: companyId },
        body: JSON.stringify(payload),
      });

      const createData = await createRes.json();
      if (!createData.success) {
        throw new Error(createData.message || "Folder case could not be created");
      }

      for (const item of folderFiles) {
        if (!item.file) continue;
        const formData = new FormData();
        formData.append("file", item.file);

        const uploadRes = await fetch(`${BASE}/api/company/upload-verified/${encodeURIComponent(caseId)}`, {
          method: "POST",
          headers: { companyid: companyId },
          body: formData,
        });

        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || uploadData.success === false) {
          throw new Error(uploadData.message || `Failed to upload ${item.name}`);
        }
      }

      showToast(`✅ Folder sent to admin (${folderFiles.length} file${folderFiles.length !== 1 ? "s" : ""})`, 5000);
      setCases(prev => [{ ...(createData.case || payload), verifiedDocuments: folderFiles.map(f => ({ originalName: f.name, key: f.path, uploadedAt: new Date().toISOString() })) }, ...prev]);
      setTimeout(() => fetchAll(true), 1200);
    } catch (err) {
      console.error("sendFolderToAdmin error:", err);
      showToast(`❌ ${err.message || "Could not send folder to admin"}`, 6000);
    } finally {
      setFolderSending(false);
    }
  }, [folderFiles, companyName, companyId, fetchAll, showToast]);

  const clearFolderFiles = useCallback(() => {
    folderFiles.forEach(f => {
      try { URL.revokeObjectURL(f.url); } catch {}
    });
    setFolderFiles([]);
    setSelectedFolderFile(null);
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, [folderFiles]);
 
  /* ── Nav config ── */
  const NAV = [
    { tab: "dashboard",  icon: "📊", label: "Dashboard"         },
    { tab: "reports",    icon: "📄", label: "Reports"            },
    { tab: "agreements", icon: "📋", label: "Agreements"         },
    { tab: "billing",    icon: "💰", label: "Billing"            },
    { tab: "upload",     icon: "📤", label: "Upload Candidates"  },
  ];
 
  const tabTitle = {
    dashboard:  `${companyName} Dashboard`,
    reports:    "Reports",
    agreements: "Agreements",
    billing:    "Billing & Pricing",
    upload:     "Upload Candidates",
  };
 
  const allSelected = excelRows.length > 0 && selectedRows.length === excelRows.length;
  const toggleAll   = () => setSelectedRows(allSelected ? [] : excelRows.map((_, i) => i));
  const toggleRow   = (idx) => setSelectedRows(prev =>
    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
  );
 
  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="cd-root">
 
      {/* ── SIDEBAR ── */}
      <aside className="cd-sidebar">
        <div className="cd-sidebar-logo">
          <div className="cd-company-brand">
            {companyLogo ? (
              <img
                className="cd-company-logo"
                src={companyLogo}
                alt={`${companyName} logo`}
                title="Click to show logo options"
                onClick={() => setShowLogoOptions(prev => !prev)}
              />
            ) : (
              <div
                className="cd-company-logo-placeholder"
                title="Click to show logo options"
                onClick={() => setShowLogoOptions(prev => !prev)}
              >
                {getCompanyInitials(companyName)}
              </div>
            )}
            <div className="cd-company-brand-text">
              <div className="cd-sidebar-logo-name" title={companyName}>{companyName}</div>
              <div className="cd-sidebar-logo-sub">BGV Portal · {companyId}</div>
            </div>
          </div>
        </div>
 
        <nav className="cd-sidebar-nav">
          <div className="cd-nav-section">Menu</div>
          {NAV.map(n => (
            <div
              key={n.tab}
              className={`cd-nav-item ${activeTab === n.tab ? "active" : ""}`}
              onClick={() => setActiveTab(n.tab)}
            >
              <span className="icon">{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
 
        <div className="cd-sidebar-footer">
          <button className="cd-logout-btn" onClick={logout}>← Logout</button>
        </div>
      </aside>
 
      {/* ── MAIN CONTENT ── */}
      <div className="cd-main">
 
        {/* Topbar */}
        <div className="cd-topbar">
          <div className="cd-topbar-title-wrap">
            {companyLogo && (
              <img
                className="cd-topbar-logo"
                src={companyLogo}
                alt={`${companyName} logo`}
                title="Click to show logo options"
                onClick={() => setShowLogoOptions(prev => !prev)}
              />
            )}
            <div className="cd-topbar-title">{tabTitle[activeTab]}</div>
          </div>
          <div className="cd-topbar-right">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => handleCompanyLogoUpload(e.target.files?.[0])}
            />
            {showLogoOptions && (
              <div className="cd-logo-actions">
                <button
                  className="cd-logo-upload-btn"
                  onClick={() => logoInputRef.current?.click()}
                  title="Upload or change this company's logo"
                >
                  {companyLogo ? "🖼 Change Logo" : "🖼 Add Logo"}
                </button>
                {companyLogo && (
                  <button
                    className="cd-logo-remove-btn"
                    onClick={removeCompanyLogo}
                    title="Remove this company's logo"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            )}
            <button
              className="cd-manual-refresh-btn"
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              title="Refresh data"
            >
              {refreshing ? "Refreshing…" : "🔄 Refresh"}
            </button>
            <button
              className={`cd-refresh-btn ${autoRefresh ? "on" : ""}`}
              onClick={() => setAutoRefresh(p => !p)}
            >
              {autoRefresh ? "⚡ Auto ON" : "Auto Refresh"}
            </button>
          </div>
        </div>
 
        <div className="cd-content">
 
          {/* ═══════════════════════════════════
              DASHBOARD TAB
          ═══════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <>
           {/* Stats row */}
<div className="cd-stats">
  {[
    { label: "Total Cases",   val: stats.total,        cls: "",        filter: "ALL"          },
    { label: "Verified",      val: stats.verified,     cls: "verified", filter: "VERIFIED"    },
    { label: "Under Review",  val: stats.underReview,  cls: "review",  filter: "UNDER_REVIEW" },
    { label: "Discrepancy",   val: stats.discrepancy,  cls: "disc",    filter: "DISCREPANCY"  },
    { label: "Insufficient",  val: stats.insufficient, cls: "insuf",   filter: "INSUFFICIENT" },
  ].map(({ label, val, cls, filter: f }) => (
    <div
      key={label}
      className={`cd-stat ${cls}`}
      onClick={() => { setFilter(f); setActiveTab("dashboard"); }}
      style={{ cursor: "pointer", transition: "transform 0.15s", userSelect: "none" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      title={`Click to filter by ${label}`}
    >
      <div className="cd-stat-label">{label}</div>
      <div className="cd-stat-val">{val}</div>
    </div>
  ))}
</div>
 
           <div className="cd-filter-bar">
  <input
    className="cd-search"
    placeholder="Search name, case ID or client case ID…"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
  <select
    className="cd-select"
    value={filter}
    onChange={e => setFilter(e.target.value)}
  >
    <option value="ALL">All Status</option>
    <option value="SUBMITTED">Submitted</option>
    <option value="UNDER_REVIEW">Under Review</option>
    <option value="VERIFIED">Verified</option>
    <option value="DISCREPANCY">Discrepancy</option>
    <option value="INSUFFICIENT">Insufficient</option>
  </select>
  {filter !== "ALL" && (
    <button
      className="cd-refresh-btn"
      onClick={() => setFilter("ALL")}
      style={{ borderColor: "#3b82f6", color: "#1d4ed8", background: "#eff6ff" }}
    >
      ✕ Clear filter
    </button>
  )}
</div>
              {/* Cases table */}
              <div className="cd-table-wrap">
                <table className="cd-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Case ID</th>
                      <th>Client Case ID</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="cd-empty">Loading cases…</td>
                      </tr>
                    ) : filteredCases.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="cd-empty">
                          {cases.length === 0
                            ? "No cases yet. Upload candidates to get started."
                            : "No cases match your search."}
                        </td>
                      </tr>
                    ) : filteredCases.map(c => (
                      <tr key={c.caseId}>
                        <td style={{ fontWeight: 600 }}>{c.name || "—"}</td>
                        <td><span className="cd-mono">{c.caseId}</span></td>
                        <td><span className="cd-mono">{c.clientCaseId || "—"}</span></td>
                        <td>
                          <span className={`cd-badge ${c.status || "SUBMITTED"}`}>
                            {(c.status || "SUBMITTED").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: 12 }}>
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td>
                          <button className="cd-view-btn" onClick={() => setSelectedCase(c)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
 
          {/* ═══════════════════════════════════
              REPORTS TAB
          ═══════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="cd-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div className="cd-card-title" style={{ marginBottom: 3 }}>BGV Reports</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Today ready reports: <strong style={{ color: "#16a34a" }}>{dailyReadyReports.length}</strong>
                  </div>
                </div>
                <button
                  className="cd-success-btn"
                  onClick={handleDownloadDailyReports}
                  disabled={dailyDownloading || dailyReadyReports.length === 0}
                  title="Download all ready reports generated/sent today"
                >
                  {dailyDownloading ? "Downloading…" : `⬇ Download Today Reports (${dailyReadyReports.length})`}
                </button>
              </div>
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Case ID</th>
                    <th>Status</th>
                    <th>Report</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="cd-empty">Loading…</td></tr>
                  ) : cases.length === 0 ? (
                    <tr><td colSpan="5" className="cd-empty">No cases yet</td></tr>
                  ) : cases
                      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                      .map(c => (
                    <tr key={c.caseId}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td><span className="cd-mono">{c.caseId}</span></td>
                      <td>
                        <span className={`cd-badge ${c.status}`}>
                          {(c.status || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        {c.sentToTrack
                          ? <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✅ Ready</span>
                          : <span style={{ color: "#94a3b8", fontSize: 12 }}>⏳ Pending</span>
                        }
                      </td>
                      <td>
                        <button
                          className="cd-dl-btn"
                          disabled={!c.sentToTrack}
                          onClick={() => downloadSingleReport(c).catch(err => {
                            console.error("Report download error:", err);
                            showToast("❌ Report not available. Please contact admin.", 5000);
                          })}
                        >
                          ⬇ Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
 
          {/* ═══════════════════════════════════
              AGREEMENTS TAB
          ═══════════════════════════════════ */}
        {activeTab === "agreements" && (
  <div className="cd-card">
    <div className="cd-card-title">Service Agreements</div>

    {loading ? (
      <div className="cd-empty">Loading…</div>
    ) : agreements.length === 0 ? (
      <div className="cd-empty">
        <div style={{ fontSize: 38, marginBottom: 10 }}>📋</div>
        <div style={{ fontWeight: 600, color: "#374151", marginBottom: 5 }}>No agreements yet</div>
        <div>Your service agreements will appear here once issued by the admin.</div>
      </div>
    ) : agreements.map(ag => {
      // Support both string and object agreement formats
      const agData = typeof ag.agreement === "object" ? ag.agreement : {};
      const agText = typeof ag.agreement === "string" ? ag.agreement : JSON.stringify(ag.agreement, null, 2);
      const agName = agData.agreementName || `Service Agreement #${ag.id}`;
      const agStatus = agData.agreementStatus || "Active";
      const agStart = agData.startDate || "";
      const agEnd = agData.endDate || "";

      return (
        <div key={ag.id} className="cd-agreement-item">
          <div className="cd-agreement-info">
            <div className="cd-agreement-icon">📄</div>
            <div>
              <div className="cd-agreement-name">{agName}</div>
              <div className="cd-agreement-date" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>{new Date(ag.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
                {agStart && <span>Start: {agStart}</span>}
                {agEnd && <span>End: {agEnd}</span>}
                <span style={{
                  background: agStatus === "Active" ? "#dcfce7" : "#fee2e2",
                  color: agStatus === "Active" ? "#166534" : "#991b1b",
                  borderRadius: 99, padding: "1px 8px", fontSize: 10, fontWeight: 700,
                }}>{agStatus}</span>
              </div>
            </div>
          </div>
          <button
            className="cd-dl-btn"
            onClick={() => {
              const blob = new Blob([agText], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${agName.replace(/\s+/g, "-")}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            ⬇ Download
          </button>
        </div>
      );
    })}

    {/* Standard agreement PDF — always available */}
    <div className="cd-agreement-item" style={{ background: "#f0f9ff", borderColor: "#bae6fd", marginTop: 12 }}>
      <div className="cd-agreement-info">
        <div className="cd-agreement-icon">📑</div>
        <div>
          <div className="cd-agreement-name">Standard Service Agreement (PDF)</div>
          <div className="cd-agreement-date">TrueVerify × {companyName}</div>
        </div>
      </div>
      <button
        className="cd-dl-btn"
        style={{ background: "#0369a1" }}
        onClick={() => {
          // POST to generate PDF with companyId
          fetch(`https://tervies.info/api/admin/generate-agreement-pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ companyId }),
          })
          .then(r => r.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "agreement.pdf";
            a.click(); URL.revokeObjectURL(url);
          })
          .catch(() => alert("Could not download PDF. Please contact admin."));
        }}
      >
        ⬇ Download PDF
      </button>
    </div>
  </div>
)}
 
          {/* ═══════════════════════════════════
              BILLING TAB
          ═══════════════════════════════════ */}
          {activeTab === "billing" && (
            <>
              <div className="cd-card">
                <div className="cd-card-title">Pricing Structure</div>
                {billing ? (
                  <div className="cd-billing-grid">
                    {Object.entries(billing.pricing || {}).map(([key, val]) => (
                      <div key={key} className="cd-billing-item">
                        <div className="cd-billing-label">
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim()}
                        </div>
                        <div className="cd-billing-val">₹{val}</div>
                      </div>
                    ))}
                    <div className="cd-billing-item" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
                      <div className="cd-billing-label">Total Billed</div>
                      <div className="cd-billing-val green">₹{billing.totalBilled || 0}</div>
                    </div>
                  </div>
                ) : (
                  <div className="cd-empty">Loading billing info…</div>
                )}
              </div>
 
              {billing?.breakdown?.length > 0 && (
                <div className="cd-card">
                  <div className="cd-card-title">Case-wise Billing</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="cd-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Case ID</th>
                          <th>Status</th>
                          <th>Cost</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billing.breakdown.map(b => (
                          <tr key={b.caseId}>
                            <td style={{ fontWeight: 600 }}>{b.name}</td>
                            <td><span className="cd-mono">{b.caseId}</span></td>
                            <td>
                              <span className={`cd-badge ${b.status}`}>
                                {(b.status || "").replace(/_/g, " ")}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700 }}>₹{b.cost}</td>
                            <td style={{ color: "#94a3b8", fontSize: 12 }}>
                              {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
 
          {/* ═══════════════════════════════════
              UPLOAD TAB
          ═══════════════════════════════════ */}
          {activeTab === "upload" && (
            <>
              {/* Instructions */}
              <div className="cd-upload-info">
                <h3>📋 How to Upload Candidates</h3>
                <ol>
                  <li>Download the sample Excel template below</li>
                  <li>Fill in candidate details — <strong>Name</strong> is required</li>
                  <li>Upload the filled Excel file by dragging or clicking</li>
                  <li>Review the candidates list, then click "Send Cases"</li>
                </ol>
                <button className="cd-primary-btn" style={{ marginTop: 12 }} onClick={downloadSample}>
                  ⬇ Download Sample Template
                </button>
              </div>
 
              {/* Drop zone */}
              <div
                className={`cd-drop-zone ${isDragOver ? "drag-over" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !excelRows.length && fileInputRef.current?.click()}
              >
                <div style={{ fontSize: 38, marginBottom: 10 }}>📊</div>
                <div style={{ fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                  Drag & drop Excel file here, or click to browse
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Supports .xlsx and .xls files</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={e => handleExcelFile(e.target.files[0])}
                />
                {excelFileName && (
                  <div style={{ color: "#16a34a", fontSize: 13, marginTop: 10, fontWeight: 600 }}>
                    📁 {excelFileName}
                  </div>
                )}
                {excelError && (
                  <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>
                    ⚠️ {excelError}
                  </div>
                )}
              </div>
 
              {/* Folder upload for images + PDFs */}
              <div className="cd-folder-card">
                <div className="cd-folder-head">
                  <div>
                    <div className="cd-folder-title">📁 Upload Folder / Files</div>
                    <div className="cd-folder-sub">
                      Upload images and PDF files here, then click Send Folder to send them to the admin portal.
                    </div>
                  </div>
                  {folderFiles.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="cd-success-btn"
                        onClick={sendFolderToAdmin}
                        disabled={folderSending}
                        title="Send this uploaded folder to admin portal"
                      >
                        {folderSending ? "Sending Folder…" : `🚀 Send Folder (${folderFiles.length})`}
                      </button>
                      <button className="cd-view-btn" onClick={clearFolderFiles} disabled={folderSending}>
                        🗑 Clear Folder
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`cd-folder-drop ${folderDragOver ? "drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setFolderDragOver(true); }}
                  onDragLeave={() => setFolderDragOver(false)}
                  onDrop={handleFolderDrop}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <div style={{ fontSize: 34, marginBottom: 8 }}>🖼️</div>
                  <div style={{ fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                    Drag & drop folder/images/PDF here, or click to browse
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Supports images and PDF files
                  </div>
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,application/pdf"
                    webkitdirectory=""
                    directory=""
                    style={{ display: "none" }}
                    onChange={e => handleFolderFiles(e.target.files)}
                  />
                </div>

                {folderFiles.length > 0 && (
                  <div className="cd-folder-grid">
                    <div className="cd-folder-list">
                      <div className="cd-folder-list-head">
                        <span>Uploaded Files</span>
                        <span>{folderFiles.length}</span>
                      </div>
                      <div className="cd-folder-list-body">
                        {folderFiles.map(file => (
                          <button
                            key={file.id}
                            type="button"
                            className={`cd-folder-file ${selectedFolderFile?.id === file.id ? "active" : ""}`}
                            onClick={() => setSelectedFolderFile(file)}
                          >
                            <div className="cd-folder-file-name">
                              {file.type === "application/pdf" ? "📄" : "🖼️"} {file.name}
                            </div>
                            <div className="cd-folder-file-path">{file.path}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="cd-folder-preview">
                      <div className="cd-folder-preview-head">
                        <div className="cd-folder-preview-title">
                          {selectedFolderFile ? selectedFolderFile.name : "Preview"}
                        </div>
                        {selectedFolderFile && (
                          <a
                            className="cd-view-btn"
                            href={selectedFolderFile.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            Open
                          </a>
                        )}
                      </div>
                      <div className="cd-folder-preview-body">
                        {!selectedFolderFile ? (
                          <div style={{ color: "#94a3b8", fontSize: 13 }}>Select a file to preview</div>
                        ) : selectedFolderFile.type === "application/pdf" ? (
                          <iframe title={selectedFolderFile.name} src={selectedFolderFile.url} />
                        ) : selectedFolderFile.type.startsWith("image/") ? (
                          <img src={selectedFolderFile.url} alt={selectedFolderFile.name} />
                        ) : (
                          <div style={{ color: "#94a3b8", fontSize: 13 }}>Preview not supported</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview table */}
              {excelRows.length > 0 && (
                <div className="cd-card">
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div className="cd-card-title" style={{ marginBottom: 2 }}>
                        {excelRows.length} Candidate{excelRows.length !== 1 ? "s" : ""} Found
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {selectedRows.length} selected for submission
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                      <button className="cd-view-btn" onClick={resetExcel}>🗑 Clear</button>
                      <button
                        className="cd-view-btn"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ borderColor: "#bae6fd", color: "#0369a1" }}
                      >
                        📂 Change File
                      </button>
                      {!submitDone && (
                        <button
                          className="cd-primary-btn"
                          onClick={submitCasesToAdmin}
                          disabled={submitting || !selectedRows.length}
                          style={{ minWidth: 140 }}
                        >
                          {submitting ? (
                            <><span className="cd-spinner" />Submitting…</>
                          ) : (
                            `🚀 Send ${selectedRows.length} Case${selectedRows.length !== 1 ? "s" : ""}`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
 
                  {/* Progress bar while submitting */}
                  {submitting && (
                    <div className="cd-progress-bar">
                      <div className="cd-progress-fill" style={{ width: `${submitProgress}%` }} />
                    </div>
                  )}
 
                  {/* Table */}
                  <div className="cd-preview-scroll">
                    <table className="cd-table" style={{ minWidth: 900 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 38 }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAll}
                              disabled={submitting}
                            />
                          </th>
                          <th>#</th>
                          <th>Name</th>
                          <th>DOB</th>
                          <th>Gender</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Client Case ID</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelRows.map((row, idx) => {
                          const result   = submitResults.find(r => r.idx === idx);
                          const isSelected = selectedRows.includes(idx);
 
                          return (
                            <tr
                              key={idx}
                              style={{ opacity: isSelected ? 1 : 0.45 }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => !result && toggleRow(idx)}
                                  disabled={submitting || !!result}
                                />
                              </td>
                              <td style={{ color: "#94a3b8", fontSize: 12 }}>{row._rowNum}</td>
                              <td style={{ fontWeight: 600 }}>{row.name || "—"}</td>
                              <td>{row.dob    || "—"}</td>
                              <td>{row.gender || "—"}</td>
                              <td style={{ fontSize: 12 }}>{row.email || "—"}</td>
                              <td style={{ fontSize: 12 }}>{row.phone || "—"}</td>
                              <td><span className="cd-mono">{row.clientCaseId || "—"}</span></td>
                              <td>
                                {result?.status === "success" && (
                                  <span className="cd-badge SENT">✓ Sent</span>
                                )}
                                {result?.status === "error" && (
                                  <span className="cd-badge ERROR" title={result.error}>
                                    ✗ Failed
                                  </span>
                                )}
                                {!result && isSelected && (
                                  <span className="cd-badge READY">Ready</span>
                                )}
                                {!result && !isSelected && (
                                  <span style={{ color: "#94a3b8", fontSize: 12 }}>Skipped</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
 
                  {/* Submit done summary */}
                  {submitDone && (
                    <div style={{ paddingTop: 16, borderTop: "1px solid #e5e7eb", marginTop: 14 }}>
                      <div style={{ display: "flex", gap: 20, fontSize: 13, marginBottom: 12, flexWrap: "wrap" }}>
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>
                          ✅ Success: {submitResults.filter(r => r.status === "success").length}
                        </span>
                        {submitResults.filter(r => r.status === "error").length > 0 && (
                          <span style={{ color: "#dc2626", fontWeight: 700 }}>
                            ❌ Failed: {submitResults.filter(r => r.status === "error").length}
                          </span>
                        )}
                        <span style={{ color: "#64748b" }}>
                          Cases are now visible on your Dashboard.
                        </span>
                      </div>
 
                      {/* Show failed errors */}
                      {submitResults.filter(r => r.status === "error").length > 0 && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, color: "#991b1b", fontSize: 12, marginBottom: 6 }}>Failed rows:</div>
                          {submitResults.filter(r => r.status === "error").map(r => (
                            <div key={r.idx} style={{ fontSize: 12, color: "#dc2626", marginBottom: 3 }}>
                              Row {excelRows[r.idx]?._rowNum} ({r.name}): {r.error}
                            </div>
                          ))}
                        </div>
                      )}
 
                      <div style={{ display: "flex", gap: 10 }}>
                        <button className="cd-success-btn" onClick={resetExcel}>
                          📤 Upload Another File
                        </button>
                        <button
                          className="cd-view-btn"
                          onClick={() => { resetExcel(); setActiveTab("dashboard"); }}
                        >
                          📊 View Dashboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
 
        </div>
      </div>
 
      {/* ═══════════════════════════════════
          CASE DETAIL MODAL
      ═══════════════════════════════════ */}
      {selectedCase && (
        <div className="cd-modal-overlay" onClick={() => setSelectedCase(null)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
 
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <div className="cd-modal-title">{selectedCase.name}</div>
                <div className="cd-modal-sub">{selectedCase.caseId}</div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1, padding: "2px 6px" }}
                title="Close"
              >
                ✕
              </button>
            </div>
 
            {/* Case info grid */}
            <div className="cd-info-grid">
              <div className="cd-info-item">
                <div className="cd-info-label">Status</div>
                <div className="cd-info-val">
                  <span className={`cd-badge ${selectedCase.status}`}>
                    {(selectedCase.status || "").replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Client Case ID</div>
                <div className="cd-info-val">{selectedCase.clientCaseId || "—"}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Date of Birth</div>
                <div className="cd-info-val">{selectedCase.dob || "—"}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Gender</div>
                <div className="cd-info-val">{selectedCase.gender || "—"}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Email</div>
                <div className="cd-info-val" style={{ fontSize: 12 }}>{selectedCase.email || "—"}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Phone</div>
                <div className="cd-info-val">{selectedCase.phone || "—"}</div>
              </div>
            </div>
 
            {/* Checks */}
            {(selectedCase.checks || []).length > 0 && (
              <>
                <div className="cd-modal-section">Verification Checks</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedCase.checks.map(ch => (
                    <span key={ch} style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
                      {ch}
                    </span>
                  ))}
                </div>
              </>
            )}
 
            {/* Verified documents */}
            <div className="cd-modal-section">Verified Documents</div>
            {(selectedCase.verifiedDocuments || []).length > 0
              ? selectedCase.verifiedDocuments.map(doc => (
                <button key={doc.key} className="cd-doc-btn">
                  <span>📄</span> {doc.originalName}
                </button>
              ))
              : <div style={{ color: "#94a3b8", fontSize: 13, padding: "6px 0" }}>No verified documents yet</div>
            }
 
            {/* BGV report */}
            <div className="cd-modal-section">BGV Report</div>
            {selectedCase.sentToTrack ? (
              <div className="cd-report-banner">
                <span style={{ fontSize: 22 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#166534", fontSize: 13 }}>Report Ready</div>
                  <div style={{ color: "#15803d", fontSize: 12, marginTop: 2 }}>
                    Your BGV report has been approved and is available.
                  </div>
                </div>
                <button
                  className="cd-dl-btn"
                  style={{ background: "#16a34a", flexShrink: 0 }}
                  onClick={async () => {
                    const id = encodeURIComponent(selectedCase.caseId || selectedCase.name || "");
                    const url = `${BASE}/api/track/report/${id}`;
                    try {
                      const res = await fetch(url, { redirect: "manual" });
                      if (res.type === "opaqueredirect" || res.ok || res.status === 302) {
                        window.open(url, "_blank");
                      } else {
                        const data = await res.json().catch(() => ({}));
                        alert(data.message || "Report not available. Please contact admin.");
                      }
                    } catch {
                      window.open(url, "_blank");
                    }
                  }}
                >
                  ⬇ Download
                </button>
              </div>
            ) : (
              <div className="cd-no-report">
                ⏳ Report is being processed. You'll be notified when it's ready.
              </div>
            )}
 
            {/* Submitted date */}
            <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8" }}>
              Submitted: {selectedCase.createdAt
                ? new Date(selectedCase.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </div>
 
            <div style={{ textAlign: "right", marginTop: 18 }}>
              <button className="cd-view-btn" onClick={() => setSelectedCase(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
 
      {/* Toast */}
      {toast && <div className="cd-toast">{toast}</div>}
    </div>
  );
}
