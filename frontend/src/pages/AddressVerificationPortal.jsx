import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
 
/* ═══════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
 
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
  :root {
    --brand: #1e3a8a; --accent: #2563eb; --light: #eff6ff; --border: #bfdbfe; --border2: #93c5fd;
    --success: #16a34a; --danger: #dc2626; --text: #0f172a; --muted: #64748b;
    --bg: #f1f5f9; --card: #fff; --r: 12px;
    --sh: 0 1px 4px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.05);
  }
 
  .av-root { font-family: 'DM Sans', system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; padding-bottom: 60px; display: flex; flex-direction: column; }
 
  /* ── TOP NAVBAR ── */
  .tv-navbar {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 24px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
  }
  .tv-navbar-left { display: flex; align-items: center; gap: 12px; }
  .tv-logo { width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg,#1e3a8a,#2563eb); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; font-weight: 800; }
  .tv-brand-name { font-size: 17px; font-weight: 800; color: #1e3a8a; letter-spacing: .3px; }
  .tv-brand-sub { font-size: 11px; color: var(--muted); }
  .tv-navbar-right { display: flex; align-items: center; gap: 10px; }
  .tv-badge-role { background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: flex; align-items: center; gap: 5px; }
  .tv-total-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px 16px; text-align: center; }
  .tv-total-lbl { font-size: 9px; font-weight: 700; color: var(--muted); letter-spacing: .8px; text-transform: uppercase; }
  .tv-total-val { font-size: 20px; font-weight: 800; color: #1e3a8a; line-height: 1.1; }
  .tv-nav-btn { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1.5px solid #e2e8f0; background: #fff; color: #334155; font-family: inherit; transition: .15s; }
  .tv-nav-btn:hover { background: #f8fafc; }
  .tv-nav-btn.danger { color: #dc2626; border-color: #fecaca; }
  .tv-nav-btn.danger:hover { background: #fef2f2; }
 
  /* ── LAYOUT ── */
  .tv-layout { display: flex; flex: 1; min-height: 0; }
 
  /* ── SIDEBAR ── */
  .tv-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid #e2e8f0;
    padding: 20px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tv-sidebar-section { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; padding: 12px 10px 6px; }
  .tv-sidebar-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; border-radius: 10px; cursor: pointer;
    font-size: 14px; font-weight: 500; color: #475569;
    transition: .15s;
  }
  .tv-sidebar-item:hover { background: #f8fafc; color: #1e3a8a; }
  .tv-sidebar-item.active { background: #eff6ff; color: #1e3a8a; font-weight: 700; }
  .tv-sidebar-item-left { display: flex; align-items: center; gap: 10px; }
  .tv-sidebar-icon { font-size: 18px; width: 22px; text-align: center; }
  .tv-sidebar-count { background: #1e3a8a; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; min-width: 24px; text-align: center; }
 
  /* ── MAIN ── */
  .tv-main { flex: 1; overflow-y: auto; padding: 24px; min-width: 0; }
  .tv-page-header { margin-bottom: 22px; }
  .tv-page-title { font-size: 22px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 10px; }
  .tv-page-sub { font-size: 13px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; }
  .tv-online-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; }
 
  /* ── STAT CARDS ── */
  .tv-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .tv-stat-card {
    background: #fff; border-radius: 16px; padding: 18px 16px 14px;
    border: 1px solid #e8eef6; cursor: pointer; transition: .2s;
    position: relative; overflow: hidden;
  }
  .tv-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,.1); }
  .tv-stat-card.active-filter { box-shadow: 0 0 0 2.5px var(--stat-color, #2563eb); }
  .tv-stat-icon-wrap {
    width: 42px; height: 42px; border-radius: 12px;
    background: var(--stat-bg, #eff6ff);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; margin-bottom: 12px;
  }
  .tv-stat-num { font-size: 30px; font-weight: 800; color: var(--stat-color, #2563eb); line-height: 1; margin-bottom: 4px; }
  .tv-stat-lbl { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
  .tv-stat-hint { font-size: 11px; color: #94a3b8; }
  .tv-stat-bar { position: absolute; bottom: 0; left: 0; height: 3px; background: var(--stat-color, #2563eb); width: var(--stat-pct, 0%); border-radius: 0 3px 3px 0; opacity: .5; }
 
  /* ── QUICK ACTIONS ── */
  .tv-quick-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .tv-quick-card {
    background: #fff; border-radius: 16px; padding: 20px 18px;
    border: 1px solid #e8eef6; cursor: pointer; transition: .2s;
    display: flex; flex-direction: column; gap: 6px;
  }
  .tv-quick-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,.1); border-color: #bfdbfe; }
  .tv-quick-icon { font-size: 28px; margin-bottom: 4px; }
  .tv-quick-title { font-size: 15px; font-weight: 700; color: #0f172a; }
  .tv-quick-desc { font-size: 12px; color: #94a3b8; }
 
  /* ── SECTION CARD ── */
  .tv-section { background: #fff; border-radius: 16px; border: 1px solid #e8eef6; margin-bottom: 20px; overflow: hidden; }
  .tv-section-head { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .tv-section-title { font-size: 15px; font-weight: 700; color: #0f172a; }
  .tv-section-body { padding: 0; }
 
  /* ── TOOLBAR ── */
  .db-toolbar { display: flex; gap: 10px; padding: 14px 20px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid #f1f5f9; }
  .db-search { flex: 1; min-width: 180px; padding: 9px 14px; font-size: 13px; border: 1.5px solid #e2e8f0; border-radius: 9px; background: #f8fafc; color: #0f172a; font-family: inherit; outline: none; }
  .db-search:focus { border-color: #2563eb; background: #fff; }
  .db-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; border-radius: 9px; font-family: inherit; transition: .15s; white-space: nowrap; }
  .db-btn-primary { background: #1e3a8a; color: #fff; border: none; }
  .db-btn-primary:hover { background: #1e40af; }
  .db-btn-outline { background: #fff; color: #334155; border: 1.5px solid #e2e8f0; }
  .db-btn-outline:hover { background: #f8fafc; }
  .db-btn-wa { background: #25d366; color: #fff; border: none; }
  .db-btn-wa:hover { background: #22c55e; }
  .db-btn-sm { padding: 6px 11px; font-size: 12px; }
  .db-filter-btn { padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer; border-radius: 20px; font-family: inherit; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; transition: .15s; }
  .db-filter-btn.active { background: #1e3a8a; color: #fff; border-color: #1e3a8a; }
 
  /* ── TABLE ── */
  .db-table-wrap { overflow-x: auto; }
  .db-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .db-table thead tr { background: #f8fafc; }
  .db-table th { padding: 10px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; letter-spacing: .5px; text-transform: uppercase; }
  .db-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .db-table tr:last-child td { border-bottom: none; }
  .db-table tbody tr:hover td { background: #f8fafc; }
 
  /* ── STATUS BADGES ── */
  .db-status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .db-status-pending { background: #fef3c7; color: #92400e; }
  .db-status-sent { background: #d1fae5; color: #065f46; }
  .db-status-submitted { background: #dbeafe; color: #1e40af; }
  .db-status-closed { background: #f1f5f9; color: #475569; }
  .db-status-insuff { background: #ede9fe; color: #5b21b6; }
  .db-status-hold { background: #fff7ed; color: #c2410c; }
  .db-status-stop { background: #fef2f2; color: #dc2626; }
 
  /* ── TAT BADGE ── */
  .tv-tat { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
  .tv-tat.ok { background: #d1fae5; color: #065f46; }
  .tv-tat.warn { background: #fef3c7; color: #92400e; }
  .tv-tat.over { background: #fef2f2; color: #dc2626; }
 
  /* ── UPLOAD ZONE ── */
  .db-upload-zone { border: 2px dashed #cbd5e1; border-radius: 14px; padding: 28px 20px; text-align: center; cursor: pointer; background: #fff; transition: .2s; margin-bottom: 14px; }
  .db-upload-zone:hover, .db-upload-zone.dragging { border-color: #2563eb; background: #eff6ff; }
  .db-upload-icon { font-size: 30px; margin-bottom: 8px; }
  .db-upload-title { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 4px; }
  .db-upload-hint { font-size: 12px; color: #94a3b8; }
  .db-upload-hint code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-family: 'DM Mono', monospace; }
 
  /* ── EMPTY STATE ── */
  .db-empty { text-align: center; padding: 50px 20px; color: #94a3b8; }
  .db-empty-icon { font-size: 36px; margin-bottom: 10px; }
  .db-empty-title { font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
  .db-empty-sub { font-size: 13px; }
 
  /* ── ACTIONS ── */
  .db-actions { display: flex; gap: 5px; flex-wrap: nowrap; }
 
  /* ── MODAL ── */
  .db-modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
  .db-modal { background: #fff; border-radius: 16px; width: min(540px, 96vw); max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.25); border: 1px solid #e2e8f0; }
  .db-modal-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: #fff; z-index: 1; }
  .db-modal-title { font-size: 16px; font-weight: 800; color: #0f172a; }
  .db-modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; line-height: 1; padding: 2px 6px; }
  .db-modal-body { padding: 20px; }
  .db-section-label { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: .6px; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin: 14px 0 10px; }
  .db-field { margin-bottom: 12px; }
  .db-field label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; }
  .db-field input, .db-field select, .db-field textarea { width: 100%; padding: 8px 11px; font-size: 13px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: #f8fafc; color: #0f172a; font-family: inherit; outline: none; transition: .15s; }
  .db-field input:focus, .db-field select:focus, .db-field textarea:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
  .db-field select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; }
  .db-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .db-link-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #1e40af; word-break: break-all; font-family: 'DM Mono', monospace; line-height: 1.6; margin: 10px 0 8px; }
  .db-link-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .db-wa-btn { display: inline-flex; align-items: center; gap: 6px; background: #25d366; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; text-decoration: none; }
  .db-wa-btn:hover { background: #22c55e; }
  .db-view-row { display: flex; border-bottom: 1px solid #f1f5f9; }
  .db-view-key { min-width: 130px; padding: 9px 12px; font-size: 12px; font-weight: 700; color: #64748b; background: #f8fafc; flex-shrink: 0; }
  .db-view-val { padding: 9px 12px; font-size: 13px; color: #0f172a; flex: 1; word-break: break-word; }
 
  /* ── CLIENT MANAGER ── */
  .cm-wrap { max-width: 860px; }
  .cm-add-row { display: flex; gap: 10px; margin-bottom: 20px; }
  .cm-add-input { flex: 1; padding: 10px 14px; font-size: 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #fff; color: #0f172a; font-family: inherit; outline: none; transition: .15s; }
  .cm-add-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
  .cm-add-btn { padding: 10px 22px; background: #1e3a8a; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: .15s; white-space: nowrap; }
  .cm-add-btn:hover { background: #1e40af; }
  .cm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 28px; }
  .cm-card {
    padding: 18px 16px; border: 1.5px solid #e2e8f0; border-radius: 14px;
    background: #fff; cursor: pointer; transition: .18s;
    display: flex; flex-direction: column; gap: 4px;
  }
  .cm-card:hover { border-color: #93c5fd; background: #f8fafc; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.07); }
  .cm-card.selected { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 2px #bfdbfe; }
  .cm-card-icon { font-size: 26px; margin-bottom: 6px; }
  .cm-card-name { font-size: 14px; font-weight: 700; color: #0f172a; }
  .cm-card-count { font-size: 12px; color: #64748b; }
  .cm-card-del { margin-top: 8px; align-self: flex-start; font-size: 11px; color: #dc2626; background: none; border: none; cursor: pointer; font-family: inherit; padding: 0; opacity: 0; transition: opacity .15s; }
  .cm-card:hover .cm-card-del { opacity: 1; }
  .cm-divider { height: 1px; background: #e2e8f0; margin-bottom: 24px; }
  .cm-cases-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
  .cm-cases-title { font-size: 17px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; }
  .cm-cases-tag { font-size: 12px; font-weight: 600; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 20px; padding: 3px 10px; }
  .cm-empty { text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 14px; border: 1.5px dashed #e2e8f0; }
  .cm-empty-icon { font-size: 32px; margin-bottom: 8px; }
  .cm-empty-title { font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
  .cm-empty-sub { font-size: 13px; color: #94a3b8; }
  .cm-hint { font-size: 13px; color: #94a3b8; text-align: center; padding: 32px 20px; }
 
  /* ── CANDIDATE / ADMIN FORM STYLES (existing) ── */
  .av-header { background: linear-gradient(135deg,#1e3a8a 0%,#1e40af 50%,#2563eb 100%); padding: 18px 20px 16px; color: #fff; }
  .av-hd-eye { font-size: 10px; letter-spacing: 2.5px; opacity: .6; text-transform: uppercase; font-weight: 600; }
  .av-hd-title { font-size: 18px; font-weight: 700; margin-top: 3px; display: flex; align-items: center; gap: 8px; }
  .av-hd-sub { font-size: 11px; opacity: .55; margin-top: 2px; }
  .av-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; letter-spacing: .5px; text-transform: uppercase; }
  .av-badge.admin { background: rgba(255,255,255,.2); color: #fff; }
  .av-badge.candidate { background: #fbbf24; color: #78350f; }
  .av-page { padding: 16px; max-width: 520px; margin: 0 auto; }
  .av-card { background: #fff; border-radius: var(--r); padding: 20px; margin-bottom: 14px; box-shadow: var(--sh); border: 1px solid rgba(0,0,0,.04); }
  .av-card-title { font-size: 15px; font-weight: 700; color: var(--brand); margin-bottom: 14px; }
  .av-sh { font-size: 11px; font-weight: 700; color: var(--brand); letter-spacing: .8px; text-transform: uppercase; border-bottom: 2px solid var(--light); padding-bottom: 7px; margin: 18px 0 13px; }
  .av-sh:first-child { margin-top: 0; }
  .av-note { background: var(--light); border-radius: 8px; padding: 9px 12px; font-size: 12px; color: var(--muted); line-height: 1.55; margin-bottom: 14px; }
  .av-pf-grid { border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 4px; }
  .av-pf-row { display: flex; border-bottom: 1px solid var(--border); }
  .av-pf-row:last-child { border-bottom: none; }
  .av-pf-key { background: var(--light); padding: 10px 12px; font-size: 12px; font-weight: 600; color: var(--brand); min-width: 130px; flex-shrink: 0; border-right: 1px solid var(--border); }
  .av-pf-val { padding: 10px 12px; font-size: 13px; color: var(--text); font-weight: 500; flex: 1; word-break: break-word; }
  .av-pf-val.empty { color: var(--muted); font-style: italic; }
  .av-field { margin-bottom: 13px; }
  .av-field label { display: block; font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 5px; }
  .av-req { color: var(--danger); }
  .av-field input, .av-field select, .av-field textarea { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 9px; font-size: 14px; color: var(--text); background: #fff; font-family: inherit; outline: none; appearance: none; transition: border-color .2s, box-shadow .2s; }
  .av-field input:focus, .av-field select:focus, .av-field textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,.11); }
  .av-field textarea { resize: vertical; }
  .av-field select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
  .av-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  .av-photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .av-photo-card { border: 1.5px solid var(--border); border-radius: 11px; padding: 14px 10px; background: #fff; text-align: center; cursor: pointer; transition: .2s; overflow: hidden; }
  .av-photo-card:hover { border-color: var(--accent); background: var(--light); }
  .av-photo-card.done { border-color: var(--success); background: #f0fdf4; }
  .av-pc-icon { font-size: 24px; margin-bottom: 5px; }
  .av-photo-card.done .av-pc-icon { display: none; }
  .av-pc-lbl { font-size: 11px; font-weight: 700; color: var(--text); line-height: 1.3; }
  .av-pc-note { font-size: 10px; color: var(--muted); margin-top: 3px; }
  .av-photo-card.done .av-pc-note { color: var(--success); font-weight: 600; }
  .av-thumb { width: 100%; height: 80px; object-fit: cover; border-radius: 7px; margin-bottom: 6px; }
  .av-gps-card { border: 1.5px solid var(--border); border-radius: 10px; padding: 14px; background: #fff; margin-bottom: 0; transition: .2s; }
  .av-gps-card.done { border-color: var(--success); background: #f0fdf4; }
  .av-gps-live { background: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1.5px solid #2d2d4e; margin-bottom: 0; }
  .av-gps-live-header { background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%); padding: 12px 14px 10px; border-bottom: 1px solid #2d2d4e; display: flex; align-items: center; gap: 8px; }
  .av-gps-live-dot { width: 9px; height: 9px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 0 rgba(34,197,94,.6); animation: gps-pulse 1.8s ease-in-out infinite; flex-shrink: 0; }
  @keyframes gps-pulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6); } 60% { box-shadow: 0 0 0 7px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
  .av-gps-live-title { font-size: 12px; font-weight: 700; color: #e2e8f0; letter-spacing: .5px; }
  .av-gps-live-status { margin-left: auto; font-size: 10px; font-weight: 700; color: #22c55e; letter-spacing: .5px; text-transform: uppercase; }
  .av-gps-live-body { display: flex; gap: 0; }
  .av-gps-live-info { flex: 1; padding: 14px; }
  .av-gps-city { font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; line-height: 1.25; }
  .av-gps-address { font-size: 11px; color: #94a3b8; line-height: 1.55; margin-bottom: 10px; }
  .av-gps-coords { font-family: 'DM Mono', monospace; font-size: 11px; color: #7dd3fc; margin-bottom: 6px; letter-spacing: .3px; }
  .av-gps-datetime { font-size: 10.5px; color: #64748b; margin-bottom: 10px; }
  .av-gps-accuracy-row { display: flex; align-items: center; gap: 6px; }
  .av-gps-acc-dot { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; border: 2px solid #fca5a5; box-shadow: 0 0 6px rgba(239,68,68,.5); flex-shrink: 0; }
  .av-gps-acc-dot.good { background: #22c55e; border-color: #86efac; box-shadow: 0 0 6px rgba(34,197,94,.5); }
  .av-gps-acc-text { font-size: 11.5px; color: #94a3b8; font-weight: 600; }
  .av-gps-map-thumb { width: 110px; flex-shrink: 0; background: #0f172a; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border-left: 1px solid #2d2d4e; }
  .av-gps-map-inner { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 4px; }
  .av-gps-map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(37,99,235,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.12) 1px, transparent 1px); background-size: 16px 16px; }
  .av-gps-map-pin { position: relative; z-index: 2; font-size: 28px; filter: drop-shadow(0 2px 8px rgba(239,68,68,.7)); animation: pin-bounce .6s ease-out; }
  @keyframes pin-bounce { 0% { transform: translateY(-10px); opacity: 0; } 60% { transform: translateY(3px); } 100% { transform: translateY(0); opacity: 1; } }
  .av-gps-map-label { position: relative; z-index: 2; font-size: 9px; color: #475569; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; background: rgba(15,23,42,.8); padding: 2px 6px; border-radius: 4px; }
  .av-gps-map-rings { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .av-gps-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(37,99,235,.25); animation: ring-expand 2.5s ease-out infinite; }
  .av-gps-ring:nth-child(1) { width: 40px; height: 40px; animation-delay: 0s; }
  .av-gps-ring:nth-child(2) { width: 65px; height: 65px; animation-delay: .5s; }
  .av-gps-ring:nth-child(3) { width: 90px; height: 90px; animation-delay: 1s; }
  @keyframes ring-expand { 0% { opacity: .7; transform: scale(.8); } 100% { opacity: 0; transform: scale(1.2); } }
  .av-gps-recapture { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-top: 1px solid #2d2d4e; background: rgba(15,23,42,.5); }
  .av-gps-recapture-btn { margin-left: auto; background: #1e3a8a; color: #93c5fd; border: 1px solid #2563eb; border-radius: 7px; font-size: 11px; font-weight: 700; padding: 5px 12px; cursor: pointer; font-family: inherit; transition: .2s; }
  .av-gps-recapture-btn:hover { background: #2563eb; color: #fff; }
  .av-gps-recapture-text { font-size: 11px; color: #22c55e; font-weight: 600; }
  .av-gps-locating { background: #1a1a2e; border-radius: 12px; border: 1.5px solid #2d2d4e; padding: 24px 16px; text-align: center; }
  .av-gps-spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid #1e3a8a; border-top-color: #3b82f6; animation: spin .8s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .av-gps-locating-text { color: #94a3b8; font-size: 13px; font-weight: 600; }
  .av-gps-locating-sub { color: #475569; font-size: 11px; margin-top: 4px; }
  .av-sig-wrap { border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden; }
  .av-sig-head { background: var(--light); padding: 7px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
  .av-sig-head span { font-size: 12px; font-weight: 700; }
  .av-sig-clear { font-size: 12px; color: var(--danger); background: none; border: none; cursor: pointer; font-family: inherit; }
  .av-sig-canvas { display: block; cursor: crosshair; touch-action: none; background: #fff; width: 100%; }
  .av-sig-confirm-btn { width: 100%; padding: 9px; background: var(--success); color: #fff; border: none; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .av-sig-ok { margin-top: 8px; padding: 7px 10px; background: #f0fdf4; border-radius: 7px; font-size: 12px; color: var(--success); font-weight: 600; }
  .av-btn { width: 100%; padding: 13px 0; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; border: none; font-family: inherit; transition: opacity .2s, transform .1s; }
  .av-btn:active { transform: scale(.98); }
  .av-btn-primary { background: var(--accent); color: #fff; }
  .av-btn-success { background: var(--success); color: #fff; }
  .av-btn:disabled { background: #94a3b8; cursor: not-allowed; }
  .av-btn-outline { background: transparent; color: var(--muted); border: 1.5px solid var(--border) !important; border-radius: 9px; padding: 10px 0; font-size: 13px; margin-top: 10px; }
  .av-share-box { background: var(--light); border: 1.5px dashed var(--border2); border-radius: 10px; padding: 16px; text-align: center; }
  .av-share-url { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--accent); word-break: break-all; margin: 8px 0; padding: 8px; background: #fff; border-radius: 7px; border: 1px solid var(--border); }
  .av-copy-btn { padding: 8px 18px; border-radius: 7px; background: var(--accent); color: #fff; border: none; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .av-err-bar { background: #fef2f2; border: 1px solid #fecaca; border-radius: 9px; padding: 10px 14px; margin-bottom: 14px; color: var(--danger); font-size: 13px; display: flex; align-items: center; gap: 8px; }
  .av-err-bar button { margin-left: auto; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 16px; }
  .av-decl { background: var(--light); border: 1px solid var(--border); border-radius: 10px; padding: 14px; font-size: 12px; color: var(--text); line-height: 1.8; margin-bottom: 14px; }
  .av-check-row { display: flex; gap: 11px; align-items: flex-start; cursor: pointer; }
  .av-check-row input[type=checkbox] { margin-top: 2px; width: 17px; height: 17px; flex-shrink: 0; accent-color: var(--accent); }
  .av-check-row span { font-size: 13px; line-height: 1.5; }
  .av-success-wrap { text-align: center; padding: 32px 16px; }
  .av-success-icon { font-size: 68px; margin-bottom: 14px; }
  .av-success-id-box { background: var(--light); border: 1.5px solid var(--border); border-radius: 12px; padding: 16px 20px; margin: 20px auto; max-width: 300px; }
  .av-sid-lbl { font-size: 10px; font-weight: 700; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; }
  .av-sid-val { font-size: 20px; font-weight: 700; color: var(--brand); letter-spacing: 2px; margin-top: 4px; font-family: 'DM Mono', monospace; }
  .av-footer { text-align: center; margin-top: 24px; font-size: 11px; color: var(--muted); line-height: 1.7; }
  .av-thumb-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
 
  /* ── TAT TRACKER ── */
  .tat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; padding: 20px; }
  .tat-card { background: #fff; border: 1px solid #e8eef6; border-radius: 14px; padding: 16px; }
  .tat-card-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .tat-card-ref { font-size: 11px; color: #94a3b8; margin-bottom: 10px; }
  .tat-bar-wrap { height: 6px; background: #f1f5f9; border-radius: 3px; margin-bottom: 6px; overflow: hidden; }
  .tat-bar-fill { height: 100%; border-radius: 3px; transition: width .4s; }
  .tat-bar-fill.ok { background: #22c55e; }
  .tat-bar-fill.warn { background: #f59e0b; }
  .tat-bar-fill.over { background: #ef4444; }
  .tat-days { font-size: 12px; font-weight: 700; }
  .tat-days.ok { color: #16a34a; }
  .tat-days.warn { color: #d97706; }
  .tat-days.over { color: #dc2626; }
 
  @media (max-width: 768px) {
    .tv-sidebar { display: none; }
    .tv-main { padding: 14px; }
    .tv-stats-grid { grid-template-columns: repeat(3, 1fr); }
    .tv-quick-grid { grid-template-columns: 1fr 1fr; }
  }
`;
 
/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const BASE_URL = "https://tervies.info/address-verify";
const ADDR_TYPES = ["Permanent", "Present / Current", "Both"];
const CASE_STATUSES = ["pending", "sent", "submitted", "closed", "insuff", "hold", "stop"];
const API = import.meta.env.VITE_API_URL || "http://localhost:5001";
const TAT_LIMIT_DAYS = 7;
 
/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const Note = ({ children }) => <div className="av-note">{children}</div>;
const SH = ({ children }) => <div className="av-sh">{children}</div>;
 
function buildLink(c) {
  const p = new URLSearchParams({
    mode: "candidate",
    name: c.name || "",
    mobile: c.phone || "",
    email: c.email || "",
    refid: c.refid || "NA",
    client: c.client || "",
    address: c.address || "",
    addrtype: c.addrtype || "Permanent",
    vdate: c.vdate || "",
  });
  return `${BASE_URL}?${p.toString()}`;
}
 
function buildWA(link, name, phone) {
  const msg = encodeURIComponent(
    `Dear ${name || "Candidate"},\n\nPlease complete your Residential Address Verification using the secure link below:\n\n${link}\n\nKindly:\n• Allow GPS/location access when prompted\n• Keep your address proof ready (Aadhaar / Voter ID)\n• Complete in one sitting from your residence\n\n— True Verification Services Pvt. Ltd.`
  );
  const cleaned = (phone || "").replace(/\D/g, "");
  const waPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  return waPhone ? `https://wa.me/${waPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
}
 
function getTATInfo(c) {
  if (!c.createdAt) return null;
  const created = new Date(c.createdAt);
  const now = new Date();
  const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  const pct = Math.min(100, (days / TAT_LIMIT_DAYS) * 100);
  const level = days <= TAT_LIMIT_DAYS * 0.5 ? "ok" : days <= TAT_LIMIT_DAYS ? "warn" : "over";
  return { days, pct, level };
}
 
/* ═══════════════════════════════════════════════════════════
   GPS HOOK
═══════════════════════════════════════════════════════════ */
function useGPS() {
  const [gpsData, setGpsData] = useState(null);
  const [gpsErr, setGpsErr] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [geoInfo, setGeoInfo] = useState(null);
 
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (!data?.address) return;
      const a = data.address;
      const city = a.city || a.town || a.village || a.county || a.state_district || a.state || "Unknown";
      const countryCode = (a.country_code || "").toUpperCase();
      const flag = countryCode ? countryCode.split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("") : "";
      setGeoInfo({ city: `${city}, ${a.state || a.country || ""}`, address: data.display_name || "", flag });
    } catch { setGeoInfo(null); }
  }, []);
 
  const capture = useCallback(() => {
    setCapturing(true); setGpsErr(false); setGeoInfo(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setGpsData(coords); setCapturing(false);
        reverseGeocode(coords.lat, coords.lng);
      },
      () => { setGpsErr(true); setCapturing(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [reverseGeocode]);
 
  return { gpsData, gpsErr, capturing, capture, geoInfo };
}
 
/* ═══════════════════════════════════════════════════════════
   LIVE GPS DISPLAY
═══════════════════════════════════════════════════════════ */
function LiveGPSDisplay({ gpsData, geoInfo, capturing, gpsErr, onCapture }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!gpsData) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [gpsData]);
 
  const fmtDateTime = d => {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    let h = d.getHours(), ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const oh = String(Math.floor(Math.abs(offset)/60)).padStart(2,"0");
    const om = String(Math.abs(offset)%60).padStart(2,"0");
    return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(h).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")} ${ampm} GMT${sign}${oh}:${om}`;
  };
 
  if (capturing) return (
    <div className="av-gps-locating">
      <div className="av-gps-spinner" />
      <div className="av-gps-locating-text">Locating your position…</div>
      <div className="av-gps-locating-sub">Please allow location access if prompted</div>
    </div>
  );
 
  if (gpsErr && !gpsData) return (
    <div className="av-gps-card">
      <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 10 }}>⚠️ Location access denied. Enable GPS and retry.</div>
      <button className="av-btn av-btn-outline" style={{ marginTop: 0 }} onClick={onCapture}>📍 Retry Location</button>
    </div>
  );
 
  if (!gpsData) return (
    <div className="av-gps-card">
      <button className="av-btn av-btn-outline" style={{ marginTop: 0 }} onClick={onCapture}>📍 Capture My Location</button>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>Allow location access when prompted</p>
    </div>
  );
 
  const isGood = gpsData.accuracy <= 30;
  return (
    <div className="av-gps-live">
      <div className="av-gps-live-header">
        <div className="av-gps-live-dot" />
        <div className="av-gps-live-title">Live GPS Location</div>
        <div className="av-gps-live-status">● Locked</div>
      </div>
      <div className="av-gps-live-body">
        <div className="av-gps-live-info">
          <div className="av-gps-city">{geoInfo ? `${geoInfo.city}${geoInfo.flag ? " "+geoInfo.flag : ""}` : `${gpsData.lat.toFixed(4)}°, ${gpsData.lng.toFixed(4)}°`}</div>
          {geoInfo?.address && <div className="av-gps-address">{geoInfo.address}</div>}
          <div className="av-gps-coords">Lat {gpsData.lat.toFixed(6)}° Long {gpsData.lng.toFixed(6)}°</div>
          <div className="av-gps-datetime">{fmtDateTime(now)}</div>
          <div className="av-gps-accuracy-row">
            <div className={`av-gps-acc-dot${isGood?" good":""}`} />
            <div className="av-gps-acc-text">{gpsData.accuracy.toFixed(2)} m</div>
          </div>
        </div>
        <div className="av-gps-map-thumb">
          <div className="av-gps-map-grid" />
          <div className="av-gps-map-rings">
            <div className="av-gps-ring" /><div className="av-gps-ring" /><div className="av-gps-ring" />
          </div>
          <div className="av-gps-map-inner">
            <div className="av-gps-map-pin">📍</div>
            <div className="av-gps-map-label">Google</div>
          </div>
        </div>
      </div>
      <div className="av-gps-recapture">
        <div className="av-gps-recapture-text">✓ Location verified</div>
        <button className="av-gps-recapture-btn" onClick={onCapture}>↻ Recapture</button>
      </div>
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════
   SIGNATURE CANVAS
═══════════════════════════════════════════════════════════ */
function SignatureCanvas({ onConfirm, onClear }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasContent, setHasContent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
 
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.min(window.innerWidth - 64, 480);
    const ctx = canvas.getContext("2d");
    const getPos = e => { const r = canvas.getBoundingClientRect(), s = e.touches?.[0] || e; return { x: s.clientX - r.left, y: s.clientY - r.top }; };
    const draw = e => { if (!drawing.current) return; const p = getPos(e); ctx.strokeStyle="#1e3a8a"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineTo(p.x,p.y); ctx.stroke(); setHasContent(true); };
    const start = e => { drawing.current=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
    const stop = () => { drawing.current=false; };
    canvas.addEventListener("mousedown",start); canvas.addEventListener("mousemove",draw); canvas.addEventListener("mouseup",stop);
    canvas.addEventListener("touchstart",e=>{e.preventDefault();start(e);},{passive:false});
    canvas.addEventListener("touchmove",e=>{e.preventDefault();draw(e);},{passive:false});
    canvas.addEventListener("touchend",stop);
    return () => { canvas.removeEventListener("mousedown",start); canvas.removeEventListener("mousemove",draw); canvas.removeEventListener("mouseup",stop); };
  }, []);
 
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0,0,canvasRef.current.width,canvasRef.current.height); setHasContent(false); setConfirmed(false); onClear(); };
  const confirm = () => { canvasRef.current.toBlob(blob => { setConfirmed(true); onConfirm(blob, URL.createObjectURL(blob)); }, "image/png"); };
 
  return (
    <div>
      <div className="av-sig-wrap">
        <div className="av-sig-head"><span>Sign here</span><button className="av-sig-clear" onClick={clear}>Clear</button></div>
        <canvas ref={canvasRef} className="av-sig-canvas" height={130} />
        {hasContent && !confirmed && <button className="av-sig-confirm-btn" onClick={confirm}>✓ Confirm Signature</button>}
      </div>
      {confirmed && <div className="av-sig-ok">✓ Signature confirmed</div>}
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════
   PHOTO CARD
═══════════════════════════════════════════════════════════ */
function PhotoCard({ id, icon, label, note, required, onCapture }) {
  const [preview, setPreview] = useState(null);
  const handleChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPreview(ev.target.result); onCapture(id, file, ev.target.result); };
    reader.readAsDataURL(file);
  };
  const isEnv = id === "housePic" || id === "landmark";
  return (
    <label className={`av-photo-card${preview ? " done" : ""}`}>
      {preview && <img className="av-thumb" src={preview} alt={label} />}
      <div className="av-pc-icon">{icon}</div>
      <div className="av-pc-lbl">{label} {required && <span className="av-req">*</span>}</div>
      <div className="av-pc-note">{preview ? "✓ Captured" : note}</div>
      <input type="file" accept="image/*" capture={isEnv ? "environment" : id === "selfie" ? "user" : undefined} style={{ display: "none" }} onChange={handleChange} />
    </label>
  );
}
 
/* ═══════════════════════════════════════════════════════════
   WA SVG ICON
═══════════════════════════════════════════════════════════ */
const WaIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
 
/* ═══════════════════════════════════════════════════════════
   CANDIDATE PANE
═══════════════════════════════════════════════════════════ */
function CandidatePane() {
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [prefill, setPrefill] = useState({});
  const [form, setForm] = useState({ father:"", dob:"", gender:"", vname:"", vrel:"", from:"", to:"", nature:"Owned", landmark:"" });
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [sigBlob, setSigBlob] = useState(null);
  const [sigConfirmed, setSigConfirmed] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verId, setVerId] = useState("");
  const { gpsData, gpsErr, capturing, capture, geoInfo } = useGPS();
 
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setPrefill({
      "Profile Name": p.get("name") || "",
      "Client Name":  p.get("client") || "",
      "Mobile":       p.get("mobile") || "",
      "Reference ID": p.get("refid") || "NA",
      "Address":      p.get("address") || "",
      "Verification Date": p.get("vdate") || "",
      "Address Type": p.get("addrtype") || "Permanent",
    });
  }, []);
 
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handlePhoto = (id, file, url) => { setPhotos(p=>({...p,[id]:file})); setPreviews(p=>({...p,[id]:url})); };
  const handleSigConfirm = (blob, url) => { setSigBlob(blob); setSigConfirmed(true); setPreviews(p=>({...p,signature:url})); };
  const handleSigClear = () => { setSigBlob(null); setSigConfirmed(false); setPreviews(p=>{const n={...p};delete n.signature;return n;}); };
  const goStep = n => { setErr(""); setStep(n); window.scrollTo({top:0,behavior:"smooth"}); };
 
  const validateStep1 = () => {
    const checks = [["father","Father's Name"],["dob","Date of Birth"],["gender","Gender"],["vname","Verifier Name"],["vrel","Relation with Verifier"],["from","Period of Stay (From)"],["to","Period of Stay (To)"]];
    for (const [k,lbl] of checks) if (!form[k]) return setErr(`${lbl} is required.`);
    goStep(2);
  };
 
  const validateStep2 = () => {
    if (!gpsData) return setErr("Please capture your GPS location.");
    if (!photos.selfie) return setErr("Selfie photo is required.");
    if (!photos.addressProof) return setErr("Address proof photo is required.");
    if (!photos.housePic) return setErr("House photo is required.");
    if (!sigConfirmed) return setErr("Please provide and confirm your signature.");
    setErr(""); goStep(3);
  };
 
  const submit = async () => {
    setSubmitting(true);
    try {
      const formPayload = {
        name: prefill["Profile Name"], phone: prefill["Mobile"], email: prefill["Email"]||"",
        caseId: prefill["Reference ID"]!=="NA" ? prefill["Reference ID"] : "",
        presentAddress: prefill["Address"], fatherName: form.father, dob: form.dob, gender: form.gender,
        verifierName: form.vname, relationWithVerifier: form.vrel,
        periodOfStayFrom: form.from, periodOfStayTo: form.to,
        natureOfResidence: form.nature, nearestLandmark: form.landmark,
        addressType: prefill["Address Type"],
        gps: gpsData ? { lat: gpsData.lat, lng: gpsData.lng, accuracy: gpsData.accuracy } : null,
        gpsCity: geoInfo?.city || "", gpsAddress: geoInfo?.address || "",
      };
      const fd = new FormData();
      fd.append("form", JSON.stringify(formPayload));
      if (photos.selfie) fd.append("selfie", photos.selfie);
      if (photos.addressProof) fd.append("addressProof", photos.addressProof);
      if (photos.housePic) fd.append("housePic", photos.housePic);
      if (photos.landmark) fd.append("landmarkPic", photos.landmark);
      if (sigBlob) fd.append("signature", sigBlob, "signature.png");
      const res = await fetch(`${API}/api/address-verify/submit`, { method:"POST", body:fd });
      const data = await res.json();
      if (!data.success) { setErr(data.message || "Submission failed."); setSubmitting(false); return; }
      setVerId(data.verificationId); setStep(4); window.scrollTo({top:0,behavior:"smooth"});
    } catch(e) {
      setErr("Network error. Please check your connection and try again.");
    } finally { setSubmitting(false); }
  };
 
  const summaryRows = [
    ["Profile Name",prefill["Profile Name"]],["Client",prefill["Client Name"]],
    ["Mobile",prefill["Mobile"]],["Reference ID",prefill["Reference ID"]||"NA"],
    ["Address",prefill["Address"]],["Father's Name",form.father],["Date of Birth",form.dob],["Gender",form.gender],
    ["Verifier",`${form.vname} (${form.vrel})`],["Period of Stay",`${form.from} – ${form.to}`],
    ["Nature of Residence",form.nature],["Nearest Landmark",form.landmark||"—"],
    ["GPS",gpsData?`${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}`:"Not captured"],
    ["Location",geoInfo?.city||"—"],
  ];
  const thumbItems = [["selfie","🤳"],["addressProof","🪪"],["housePic","🏠"],["landmark","🏛️"],["signature","✍️"]];
 
  return (
    <div>
      {err && <div className="av-err-bar">⚠️ {err}<button onClick={()=>setErr("")}>✕</button></div>}
      {step===1 && (<>
        <div className="av-card">
          <div className="av-card-title">📋 Case Details (Pre-filled)</div>
          <Note>Details below were filled by the verification team. Please review, then complete your personal information.</Note>
          <div className="av-pf-grid">
            {Object.entries(prefill).map(([k,val])=>(
              <div className="av-pf-row" key={k}>
                <div className="av-pf-key">{k}</div>
                <div className={`av-pf-val${!val?" empty":""}`}>{val||"—"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="av-card">
          <div className="av-card-title">👤 Your Details</div>
          <SH>Personal Information</SH>
          <div className="av-field"><label>Father's Name *</label><input value={form.father} onChange={set("father")} placeholder="Father's full name" /></div>
          <div className="av-grid2">
            <div className="av-field"><label>Date of Birth *</label><input type="date" value={form.dob} onChange={set("dob")} /></div>
            <div className="av-field"><label>Gender *</label>
              <select value={form.gender} onChange={set("gender")}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
            </div>
          </div>
          <SH>Verifier Details</SH>
          <Note>Person who will be present at the address during verification</Note>
          <div className="av-grid2">
            <div className="av-field"><label>Verifier Name *</label><input value={form.vname} onChange={set("vname")} placeholder="Name" /></div>
            <div className="av-field"><label>Relation with Verifier *</label>
              <select value={form.vrel} onChange={set("vrel")}><option value="">Select</option>{["Self","Father","Mother","Spouse","Brother","Sister","Son","Daughter","Relative","Neighbour","Other"].map(r=><option key={r}>{r}</option>)}</select>
            </div>
          </div>
          <SH>Residence Details</SH>
          <div className="av-grid2">
            <div className="av-field"><label>Stay From *</label><input type="date" value={form.from} onChange={set("from")} /></div>
            <div className="av-field"><label>Stay To *</label><input type="date" value={form.to} onChange={set("to")} /></div>
          </div>
          <div className="av-grid2">
            <div className="av-field"><label>Nature of Residence *</label>
              <select value={form.nature} onChange={set("nature")}>{["Owned","Rented","Company Provided","PG / Hostel","Parental"].map(n=><option key={n}>{n}</option>)}</select>
            </div>
            <div className="av-field"><label>Nearest Landmark</label><input value={form.landmark} onChange={set("landmark")} placeholder="Temple, school…" /></div>
          </div>
          <button className="av-btn av-btn-primary" onClick={validateStep1}>Continue →</button>
        </div>
      </>)}
 
      {step===2 && (<>
        <div className="av-card">
          <div className="av-card-title">📍 GPS Location <span className="av-req">*</span></div>
          <LiveGPSDisplay gpsData={gpsData} geoInfo={geoInfo} capturing={capturing} gpsErr={gpsErr} onCapture={capture} />
        </div>
        <div className="av-card">
          <div className="av-card-title">📸 Photos</div>
          <div className="av-photo-grid">
            <PhotoCard id="selfie" icon="🤳" label="Selfie" note="Front camera" required onCapture={handlePhoto} />
            <PhotoCard id="addressProof" icon="🪪" label="Address Proof" note="Aadhaar / Voter ID" required onCapture={handlePhoto} />
            <PhotoCard id="housePic" icon="🏠" label="House Photo" note="Outside of residence" required onCapture={handlePhoto} />
            <PhotoCard id="landmark" icon="🏛️" label="Landmark Photo" note="Optional" onCapture={handlePhoto} />
          </div>
        </div>
        <div className="av-card">
          <div className="av-card-title">✍️ Digital Signature <span className="av-req">*</span></div>
          <p style={{fontSize:12,color:"var(--muted)",marginBottom:11}}>Sign using your finger or stylus below</p>
          <SignatureCanvas onConfirm={handleSigConfirm} onClear={handleSigClear} />
        </div>
        <button className="av-btn av-btn-primary" onClick={validateStep2}>Continue →</button>
        <button className="av-btn av-btn-outline" onClick={()=>goStep(1)}>← Back</button>
      </>)}
 
      {step===3 && (<>
        <div className="av-card">
          <div className="av-card-title">📋 Review</div>
          <div className="av-pf-grid">
            {summaryRows.map(([k,val])=>(
              <div className="av-pf-row" key={k}><div className="av-pf-key">{k}</div><div className="av-pf-val">{val||"—"}</div></div>
            ))}
          </div>
          <div className="av-thumb-row">
            {thumbItems.filter(([k])=>previews[k]).map(([k,ic])=>(
              <div key={k} style={{textAlign:"center"}}>
                <img src={previews[k]} style={{width:54,height:54,objectFit:"cover",borderRadius:7,border:"2px solid var(--success)"}} alt={k} />
                <div style={{fontSize:9,color:"var(--muted)",marginTop:2}}>{ic} {k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="av-card">
          <div className="av-card-title">📜 Declaration</div>
          <div className="av-decl">
            I, <strong>{prefill["Profile Name"]||"___"}</strong>, hereby declare that all information provided is true and correct to the best of my knowledge. I consent to True Verification Services Pvt. Ltd. using this information for residential address verification on behalf of my employer / client company.<br/><br/>
            The photographs, GPS coordinates, and digital signature are genuine and captured at the time of this verification.
          </div>
          <label className="av-check-row">
            <input type="checkbox" checked={declared} onChange={e=>setDeclared(e.target.checked)} />
            <span>I have read and agree to the above declaration. <span className="av-req">*</span></span>
          </label>
        </div>
        <button className="av-btn av-btn-success" disabled={!declared||submitting} onClick={submit}>
          {submitting ? "⏳ Submitting…" : "🚀 Submit Verification"}
        </button>
        <button className="av-btn av-btn-outline" onClick={()=>goStep(2)}>← Back</button>
      </>)}
 
      {step===4 && (
        <div className="av-card av-success-wrap">
          <div className="av-success-icon">✅</div>
          <h2 style={{color:"var(--success)",fontSize:21,fontWeight:800,marginBottom:8}}>Submitted Successfully!</h2>
          <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>Your residential address verification has been submitted. Our team will review it shortly.</p>
          <div className="av-success-id-box">
            <div className="av-sid-lbl">Verification ID</div>
            <div className="av-sid-val">{verId}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Save this for your records</div>
          </div>
          <p style={{fontSize:12,color:"var(--muted)"}}>You may now close this page.</p>
        </div>
      )}
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════
   CLIENT MANAGER PANE
═══════════════════════════════════════════════════════════ */
const CLIENT_ICONS = ["🏢","🏬","🏭","🏦","🏪","🏨","🏫","🏗️"];
 
function ClientManagerPane({ clients, onAddClient, onDeleteClient, onSelectClient, selectedClientIdx, onAddCase, onImportExcelForClient }) {
  const [input, setInput] = useState("");
  const [importToast, setImportToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
 
  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    const exists = clients.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) { alert("A client with this name already exists."); return; }
    onAddClient(name);
    setInput("");
  };
 
  const selectedClient = selectedClientIdx !== null ? clients[selectedClientIdx] : null;
 
  const handleExcelFile = useCallback((file) => {
    if (!selectedClient) return;
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      let added = 0;
      const newCases = rows.map(row => {
        const name = String(row["Name"]||row["name"]||row["Full Name"]||row["full_name"]||"").trim();
        const phone = String(row["Phone"]||row["phone"]||row["Mobile"]||row["mobile"]||"").replace(/\D/g,"").slice(-10);
        if (!name && !phone) return null;
        added++;
        return {
          name, phone,
          email:   String(row["Email"]||row["email"]||"").trim(),
          refid:   String(row["Reference ID"]||row["refid"]||row["Case ID"]||row["CaseID"]||"").trim()||"NA",
          client:  selectedClient.name,          // ← always forced to selected client
          address: String(row["Address"]||row["address"]||"").trim(),
          addrtype: "Permanent", vdate: "", status: "pending",
          createdAt: new Date().toISOString(),
        };
      }).filter(Boolean);
      onImportExcelForClient(newCases);
      setImportToast(`✅ ${added} case${added!==1?"s":""} imported for ${selectedClient.name}`);
      setTimeout(() => setImportToast(""), 3500);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  }, [selectedClient, onImportExcelForClient]);
 
  const statusLabel = s => ({ pending:"Pending", sent:"Link Sent", submitted:"Submitted", closed:"Closed", insuff:"Insuff", hold:"Hold", stop:"Stop" }[s] || s);
  const statusBadgeClass = s => {
    const map = { pending:"db-status-pending", sent:"db-status-sent", submitted:"db-status-submitted", closed:"db-status-closed", insuff:"db-status-insuff", hold:"db-status-hold", stop:"db-status-stop" };
    return map[s] || "db-status-pending";
  };
 
  return (
    <div className="cm-wrap">
      {/* Toast */}
      {importToast && (
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 16px",marginBottom:16,fontSize:13,color:"#15803d",fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
          {importToast}
        </div>
      )}
 
      {/* Add Client Row */}
      <div className="cm-add-row">
        <input
          className="cm-add-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Type client name — e.g. TCS, Wipro, Infosys…"
        />
        <button className="cm-add-btn" onClick={handleAdd}>+ Add Client</button>
      </div>
 
      {/* Client Cards Grid */}
      {clients.length === 0 ? (
        <div className="cm-empty" style={{marginBottom:24}}>
          <div className="cm-empty-icon">🏢</div>
          <div className="cm-empty-title">No clients yet</div>
          <div className="cm-empty-sub">Type a client name above and click Add Client</div>
        </div>
      ) : (
        <div className="cm-grid">
          {clients.map((c, i) => (
            <div
              key={i}
              className={`cm-card${selectedClientIdx === i ? " selected" : ""}`}
              onClick={() => onSelectClient(selectedClientIdx === i ? null : i)}
            >
              <div className="cm-card-icon">{CLIENT_ICONS[i % CLIENT_ICONS.length]}</div>
              <div className="cm-card-name">{c.name}</div>
              <div className="cm-card-count">{c.caseCount} case{c.caseCount !== 1 ? "s" : ""}</div>
              <button
                className="cm-card-del"
                onClick={e => { e.stopPropagation(); if (confirm(`Delete client "${c.name}"? All its cases will remain in the records.`)) onDeleteClient(i); }}
              >
                🗑 Delete
              </button>
            </div>
          ))}
        </div>
      )}
 
      {/* Cases panel for selected client */}
      {clients.length > 0 && (
        <>
          <div className="cm-divider" />
          {selectedClient ? (
            <>
              {/* Cases header — Add Case + Import Excel */}
              <div className="cm-cases-header">
                <div className="cm-cases-title">
                  Cases for <span className="cm-cases-tag">{selectedClient.name}</span>
                  <span style={{fontSize:13,fontWeight:400,color:"#94a3b8"}}>({selectedClient.cases.length})</span>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {/* Hidden file input */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{display:"none"}}
                    onChange={e => { if (e.target.files[0]) handleExcelFile(e.target.files[0]); }}
                  />
                  <button
                    className="db-btn db-btn-outline"
                    style={{fontSize:13,padding:"8px 16px",borderRadius:9}}
                    onClick={() => fileRef.current.click()}
                  >
                    📊 Import Excel
                  </button>
                  <button className="cm-add-btn" style={{fontSize:13,padding:"8px 18px"}} onClick={() => onAddCase(selectedClient.name)}>
                    + Add Case
                  </button>
                </div>
              </div>
 
              {/* Drop zone — shown only when no cases yet */}
              {selectedClient.cases.length === 0 && (
                <div
                  className={`db-upload-zone${dragging ? " dragging" : ""}`}
                  style={{marginBottom:0}}
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleExcelFile(e.dataTransfer.files[0]); }}
                >
                  <div className="db-upload-icon">📊</div>
                  <div className="db-upload-title">
                    {dragging ? "Drop Excel file here" : `Import cases for ${selectedClient.name}`}
                  </div>
                  <div className="db-upload-hint">
                    Click or drag <code>.xlsx</code> / <code>.xls</code> — columns: <code>Name</code>, <code>Phone</code>, <code>Address</code>, <code>Reference ID</code>
                    <br/>The <strong>Client</strong> column will be auto-set to <strong>{selectedClient.name}</strong>
                  </div>
                </div>
              )}
 
              {selectedClient.cases.length > 0 && (
                <div className="tv-section">
                  <div className="db-table-wrap">
                    <table className="db-table">
                      <colgroup>
                        <col style={{width:"24%"}}/><col style={{width:"14%"}}/><col style={{width:"16%"}}/><col style={{width:"12%"}}/><col style={{width:"10%"}}/><col style={{width:"24%"}}/>
                      </colgroup>
                      <thead>
                        <tr>{["Name","Phone","Reference ID","Status","TAT","Actions"].map(h=><th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {selectedClient.cases.map((c, fi) => {
                          const tat = getTATInfo(c);
                          return (
                            <tr key={fi}>
                              <td style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||"—"}</td>
                              <td style={{fontFamily:"'DM Mono',monospace",fontSize:12}}>{c.phone||"—"}</td>
                              <td style={{fontSize:12,color:"#64748b"}}>{c.refid||"NA"}</td>
                              <td><span className={`db-status-badge ${statusBadgeClass(c.status)}`}>{statusLabel(c.status)}</span></td>
                              <td>
                                {tat ? (
                                  <span className={`tv-tat ${tat.level}`}>{tat.days}d</span>
                                ) : <span style={{fontSize:11,color:"#94a3b8"}}>—</span>}
                              </td>
                              <td>
                                <div className="db-actions">
                                  <a className="db-btn db-btn-outline db-btn-sm" href={buildLink(c)} target="_blank" rel="noreferrer">🔗 Open</a>
                                  <a className="db-wa-btn db-btn-sm" href={buildWA(buildLink(c),c.name,c.phone)} target="_blank" rel="noreferrer"><WaIcon /> WA</a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="cm-hint">👆 Select a client above to view their cases or add new ones</div>
          )}
        </>
      )}
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════
   DASHBOARD PANE
═══════════════════════════════════════════════════════════ */
const EMPTY_CASE = { name:"", phone:"", email:"", refid:"", client:"", address:"", vdate:"", addrtype:"Permanent" };
 
const STAT_CONFIG = [
  { key:"sent",      label:"Sent",      icon:"✅", color:"#22c55e", bg:"#f0fdf4", hint:"Click to view sent cases" },
  { key:"closed",    label:"Closed",    icon:"🔒", color:"#3b82f6", bg:"#eff6ff", hint:"Click to view closed cases" },
  { key:"pending",   label:"Pending",   icon:"⏳", color:"#f59e0b", bg:"#fffbeb", hint:"Click to view pending cases" },
  { key:"insuff",    label:"Insuff",    icon:"⚠️", color:"#8b5cf6", bg:"#f5f3ff", hint:"Click to view insuff cases" },
  { key:"hold",      label:"Hold",      icon:"✋", color:"#f97316", bg:"#fff7ed", hint:"Click to view on hold cases" },
  { key:"stop",      label:"Stop",      icon:"🛑", color:"#ef4444", bg:"#fef2f2", hint:"Click to view stopped cases" },
  { key:"total",     label:"Total",     icon:"📋", color:"#6366f1", bg:"#eef2ff", hint:"All records" },
];
 
function DashboardPane({ cases, setCases, prefillClient, onNav }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dragging, setDragging] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);
  const [formData, setFormData] = useState(EMPTY_CASE);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState("records");
  const fileRef = useRef();
 
  // When a prefillClient is passed in (from ClientManager → Add Case), open modal immediately
  useEffect(() => {
    if (prefillClient) {
      setFormData({ ...EMPTY_CASE, client: prefillClient });
      setLinkGenerated(false);
      setActiveIdx(null);
      setShowModal("add");
    }
  }, [prefillClient]);
 
  const stats = {
    sent:      cases.filter(c=>c.status==="sent").length,
    closed:    cases.filter(c=>c.status==="closed").length,
    pending:   cases.filter(c=>c.status==="pending").length,
    insuff:    cases.filter(c=>c.status==="insuff").length,
    hold:      cases.filter(c=>c.status==="hold").length,
    stop:      cases.filter(c=>c.status==="stop").length,
    submitted: cases.filter(c=>c.status==="submitted").length,
    total:     cases.length,
  };
 
  const filtered = cases.filter(c => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    if (!matchStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name||"").toLowerCase().includes(q)
      || (c.phone||"").includes(q)
      || (c.refid||"").toLowerCase().includes(q)
      || (c.client||"").toLowerCase().includes(q);
  });
 
  const parseExcel = useCallback(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type:"array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
      let added = 0;
      const newCases = rows.map(row => {
        const name = String(row["Name"]||row["name"]||row["Full Name"]||row["full_name"]||"").trim();
        const phone = String(row["Phone"]||row["phone"]||row["Mobile"]||row["mobile"]||"").replace(/\D/g,"").slice(-10);
        if (!name && !phone) return null;
        added++;
        return {
          name, phone,
          email: String(row["Email"]||row["email"]||"").trim(),
          refid: String(row["Reference ID"]||row["refid"]||row["Case ID"]||row["CaseID"]||"").trim()||"NA",
          client: String(row["Client"]||row["client"]||row["Client Name"]||row["client_name"]||"").trim(),
          address: String(row["Address"]||row["address"]||"").trim(),
          addrtype: "Permanent", vdate: "", status: "pending",
          createdAt: new Date().toISOString(),
        };
      }).filter(Boolean);
      setCases(prev => [...prev, ...newCases]);
      alert(`${added} case${added!==1?"s":""} imported successfully.`);
    };
    reader.readAsArrayBuffer(file);
  }, [setCases]);
 
  const setF = k => e => setFormData(f => ({ ...f, [k]: e.target.value }));
 
  const openAdd = () => { setFormData(EMPTY_CASE); setLinkGenerated(false); setActiveIdx(null); setShowModal("add"); };
  const openEdit = idx => { setFormData({ ...cases[idx] }); setLinkGenerated(true); setActiveIdx(idx); setShowModal("edit"); };
  const openView = idx => {
    setActiveIdx(idx);
    setShowModal("view");
    setCases(prev => prev.map((c,i) => i===idx && c.status==="pending" ? {...c,status:"sent"} : c));
  };
 
  const saveCase = () => {
    if (!formData.name.trim()) return alert("Name is required.");
    const phone = formData.phone.replace(/\D/g,"").slice(-10);
    if (phone.length !== 10) return alert("Enter a valid 10-digit phone number.");
    const c = { ...formData, phone };
    if (showModal === "add") {
      setCases(prev => [...prev, { ...c, status:"pending", createdAt: new Date().toISOString() }]);
    } else if (showModal === "edit" && activeIdx !== null) {
      setCases(prev => prev.map((x,i) => i===activeIdx ? { ...c, status:x.status, createdAt:x.createdAt } : x));
    }
    setLinkGenerated(true);
    setFormData(c);
  };
 
  const deleteCase = idx => {
    if (!confirm("Delete this case?")) return;
    setCases(prev => prev.filter((_,i) => i!==idx));
    setShowModal(null);
  };
 
  const updateStatus = (idx, newStatus) => {
    setCases(prev => prev.map((c,i) => i===idx ? {...c, status: newStatus} : c));
  };
 
  const openWA = idx => {
    const c = cases[idx];
    window.open(buildWA(buildLink(c), c.name, c.phone), "_blank");
    setCases(prev => prev.map((x,i) => i===idx && x.status==="pending" ? {...x,status:"sent"} : x));
  };
 
  const copyLink = link => {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };
 
  const handleStatClick = (key) => {
    setStatusFilter(prev => prev === key ? "all" : key);
    setActiveView("records");
  };
 
  const activeCase = activeIdx !== null ? cases[activeIdx] : null;
  const formLink = linkGenerated ? buildLink(formData) : null;
  const formWA = formLink ? buildWA(formLink, formData.name, formData.phone) : null;
 
  const statusBadgeClass = s => {
    const map = { pending:"db-status-pending", sent:"db-status-sent", submitted:"db-status-submitted", closed:"db-status-closed", insuff:"db-status-insuff", hold:"db-status-hold", stop:"db-status-stop" };
    return map[s] || "db-status-pending";
  };
  const statusLabel = s => ({ pending:"Pending", sent:"Link Sent", submitted:"Submitted", closed:"Closed", insuff:"Insuff", hold:"Hold", stop:"Stop" }[s] || s);
 
  return (
    <>
      {/* STAT CARDS */}
      <div className="tv-stats-grid">
        {STAT_CONFIG.map(sc => {
          const count = stats[sc.key] ?? 0;
          const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
          return (
            <div
              key={sc.key}
              className={`tv-stat-card${statusFilter === sc.key ? " active-filter" : ""}`}
              style={{"--stat-color": sc.color, "--stat-bg": sc.bg, "--stat-pct": `${pct}%`}}
              onClick={() => sc.key !== "total" ? handleStatClick(sc.key) : setStatusFilter("all")}
            >
              <div className="tv-stat-icon-wrap">{sc.icon}</div>
              <div className="tv-stat-num">{count}</div>
              <div className="tv-stat-lbl">{sc.label}</div>
              <div className="tv-stat-hint">{sc.hint}</div>
              <div className="tv-stat-bar" />
            </div>
          );
        })}
      </div>
 
      {/* QUICK ACTIONS */}
      <div className="tv-quick-grid">
        <div className="tv-quick-card" onClick={openAdd}>
          <div className="tv-quick-icon">➕</div>
          <div className="tv-quick-title">Add Case</div>
          <div className="tv-quick-desc">Manually add a new case</div>
        </div>
        <div className="tv-quick-card" onClick={() => fileRef.current.click()}>
          <div className="tv-quick-icon">📊</div>
          <div className="tv-quick-title">Import Excel</div>
          <div className="tv-quick-desc">Bulk import cases</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{if(e.target.files[0])parseExcel(e.target.files[0]);}} />
        </div>
        <div className="tv-quick-card" onClick={() => { setActiveView("records"); setStatusFilter("all"); }}>
          <div className="tv-quick-icon">📋</div>
          <div className="tv-quick-title">View Records</div>
          <div className="tv-quick-desc">Browse & manage BGV cases</div>
        </div>
        <div className="tv-quick-card" onClick={() => setActiveView("tat")}>
          <div className="tv-quick-icon">⏱️</div>
          <div className="tv-quick-title">TAT Tracker</div>
          <div className="tv-quick-desc">Turnaround time & penalties</div>
        </div>
      </div>
 
      {/* RECORDS TABLE */}
      {activeView === "records" && (
        <div className="tv-section">
          <div className="tv-section-head">
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div className="tv-section-title">
                {statusFilter === "all" ? "All Records" : `${statusLabel(statusFilter)} Cases`}
                <span style={{marginLeft:8,fontSize:13,fontWeight:400,color:"#94a3b8"}}>({filtered.length})</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["all","pending","sent","submitted","closed","insuff","hold","stop"].map(s => (
                  <button key={s} className={`db-filter-btn${statusFilter===s?" active":""}`} onClick={() => setStatusFilter(s)}>
                    {s === "all" ? "All" : statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="db-btn db-btn-primary" onClick={openAdd}>+ Add Case</button>
              {cases.length > 0 && <button className="db-btn db-btn-outline" onClick={()=>{if(confirm("Clear all?"))setCases([])}}>🗑 Clear</button>}
            </div>
          </div>
 
          {cases.length === 0 && (
            <div style={{padding:"0 20px 20px"}}>
              <div
                className={`db-upload-zone${dragging?" dragging":""}`}
                onClick={() => fileRef.current.click()}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files[0])parseExcel(e.dataTransfer.files[0]);}}
              >
                <div className="db-upload-icon">📊</div>
                <div className="db-upload-title">{dragging ? "Drop your Excel file here" : "Click or drag Excel file to import cases"}</div>
                <div className="db-upload-hint">
                  Supports <code>.xlsx</code> / <code>.xls</code> — columns: <code>Name</code>, <code>Phone</code>, <code>Client</code>, <code>Address</code>, <code>Reference ID</code>
                </div>
              </div>
            </div>
          )}
 
          {cases.length > 0 && (
            <div className="db-toolbar">
              <input className="db-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search by name, phone, reference ID, client..." />
            </div>
          )}
 
          <div className="db-table-wrap">
            <table className="db-table">
              <colgroup>
                <col style={{width:"20%"}}/><col style={{width:"12%"}}/><col style={{width:"12%"}}/><col style={{width:"13%"}}/><col style={{width:"9%"}}/><col style={{width:"10%"}}/><col style={{width:"24%"}}/>
              </colgroup>
              <thead>
                <tr>{["Name","Phone","Reference ID","Client","Status","TAT","Actions"].map(h=><th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="db-empty">
                      <div className="db-empty-icon">📂</div>
                      <div className="db-empty-title">{cases.length === 0 ? "No cases yet" : "No matching cases"}</div>
                      <div className="db-empty-sub">{cases.length === 0 ? "Import Excel or add cases manually" : "Try a different filter or search term"}</div>
                    </div>
                  </td></tr>
                ) : filtered.map((c, fi) => {
                  const realIdx = cases.indexOf(c);
                  const tat = getTATInfo(c);
                  return (
                    <tr key={fi}>
                      <td style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={c.name}>{c.name||"—"}</td>
                      <td style={{fontFamily:"'DM Mono',monospace",fontSize:12}}>{c.phone||"—"}</td>
                      <td style={{fontSize:12,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.refid||"NA"}</td>
                      <td style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={c.client}>{c.client||"—"}</td>
                      <td>
                        <select
                          value={c.status}
                          onChange={e => updateStatus(realIdx, e.target.value)}
                          style={{fontSize:11,padding:"3px 6px",borderRadius:6,border:"1px solid #e2e8f0",background:"#f8fafc",fontFamily:"inherit",cursor:"pointer",appearance:"none"}}
                        >
                          {CASE_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                        </select>
                      </td>
                      <td>
                        {tat ? (
                          <span className={`tv-tat ${tat.level}`}>
                            {tat.level === "ok" ? "✓" : tat.level === "warn" ? "⚡" : "🔴"} {tat.days}d
                          </span>
                        ) : <span style={{fontSize:11,color:"#94a3b8"}}>—</span>}
                      </td>
                      <td>
                        <div className="db-actions">
                          <button className="db-btn db-btn-outline db-btn-sm" onClick={()=>openView(realIdx)}>🔗 Link</button>
                          <button className="db-btn db-btn-wa db-btn-sm" onClick={()=>openWA(realIdx)}><WaIcon /> WA</button>
                          <button className="db-btn db-btn-outline db-btn-sm" onClick={()=>openEdit(realIdx)}>✏️</button>
                          <button className="db-btn db-btn-sm" style={{color:"#dc2626",border:"1.5px solid #fecaca",background:"#fff"}} onClick={()=>deleteCase(realIdx)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div style={{textAlign:"right",fontSize:12,color:"#94a3b8",padding:"10px 20px"}}>
              {filtered.length} of {cases.length} case{cases.length!==1?"s":""}
            </div>
          )}
        </div>
      )}
 
      {/* TAT TRACKER */}
      {activeView === "tat" && (
        <div className="tv-section">
          <div className="tv-section-head">
            <div className="tv-section-title">⏱️ TAT Tracker <span style={{fontSize:13,fontWeight:400,color:"#94a3b8"}}>(Turnaround Time — {TAT_LIMIT_DAYS} day limit)</span></div>
            <button className="db-btn db-btn-outline" onClick={() => setActiveView("records")}>← Back to Records</button>
          </div>
          {cases.length === 0 ? (
            <div className="db-empty" style={{padding:"40px 20px"}}>
              <div className="db-empty-icon">⏱️</div>
              <div className="db-empty-title">No cases to track</div>
              <div className="db-empty-sub">Add cases to see TAT status</div>
            </div>
          ) : (
            <div className="tat-grid">
              {cases.filter(c=>c.status!=="closed").map((c, i) => {
                const tat = getTATInfo(c);
                if (!tat) return null;
                return (
                  <div key={i} className="tat-card">
                    <div className="tat-card-name">{c.name || "—"}</div>
                    <div className="tat-card-ref">{c.refid || "NA"} · {c.client || "—"}</div>
                    <div className="tat-bar-wrap">
                      <div className={`tat-bar-fill ${tat.level}`} style={{width:`${tat.pct}%`}} />
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div className={`tat-days ${tat.level}`}>{tat.days} / {TAT_LIMIT_DAYS} days</div>
                      <span className={`tv-tat ${tat.level}`}>
                        {tat.level === "ok" ? "On Track" : tat.level === "warn" ? "Due Soon" : "Overdue"}
                      </span>
                    </div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>
                      Status: <span style={{fontWeight:700}}>{statusLabel(c.status)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
 
      {/* ADD / EDIT MODAL */}
      {(showModal==="add" || showModal==="edit") && (
        <div className="db-modal-bg" onClick={e=>e.target===e.currentTarget&&setShowModal(null)}>
          <div className="db-modal">
            <div className="db-modal-header">
              <div className="db-modal-title">{showModal==="add" ? "➕ Add Case" : "✏️ Edit Case"}</div>
              <button className="db-modal-close" onClick={()=>setShowModal(null)}>×</button>
            </div>
            <div className="db-modal-body">
              <div className="db-section-label">Candidate</div>
              <div className="db-field"><label>Full Name *</label><input value={formData.name} onChange={setF("name")} placeholder="e.g. Rahul Sharma" /></div>
              <div className="db-grid2">
                <div className="db-field"><label>Phone *</label><input value={formData.phone} onChange={e=>setFormData(f=>({...f,phone:e.target.value.replace(/\D/g,"")}))} placeholder="10-digit mobile" maxLength={10} /></div>
                <div className="db-field"><label>Email</label><input value={formData.email} onChange={setF("email")} placeholder="Optional" type="email" /></div>
              </div>
              <div className="db-section-label">Case Details</div>
              <div className="db-grid2">
                <div className="db-field"><label>Reference / Case ID</label><input value={formData.refid} onChange={setF("refid")} placeholder="NA" /></div>
                <div className="db-field">
                  <label>Client Name</label>
                  <input value={formData.client} onChange={setF("client")} placeholder="Company name" />
                </div>
              </div>
              <div className="db-field"><label>Address to Verify</label><textarea value={formData.address} onChange={setF("address")} placeholder="House No, Street, City, State, PIN" rows={2} style={{resize:"vertical"}} /></div>
              <div className="db-grid2">
                <div className="db-field"><label>Verification Date</label><input type="date" value={formData.vdate} onChange={setF("vdate")} /></div>
                <div className="db-field"><label>Address Type</label>
                  <select value={formData.addrtype} onChange={setF("addrtype")}>{ADDR_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                </div>
              </div>
              {showModal==="edit" && (
                <div className="db-field"><label>Status</label>
                  <select value={formData.status||"pending"} onChange={setF("status")}>
                    {CASE_STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
              )}
              <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
                <button className="db-btn db-btn-primary" onClick={saveCase}>💾 Save &amp; Generate Link</button>
                <button className="db-btn db-btn-outline" onClick={()=>setShowModal(null)}>Cancel</button>
              </div>
              {formLink && (
                <div style={{marginTop:16}}>
                  <div className="db-section-label">Verification Link</div>
                  <div className="db-link-box">{formLink}</div>
                  <div className="db-link-actions">
                    <button className="db-btn db-btn-outline db-btn-sm" onClick={()=>copyLink(formLink)}>{copied?"✓ Copied!":"📋 Copy"}</button>
                    <a className="db-wa-btn" href={formWA} target="_blank" rel="noreferrer"><WaIcon /> Send on WhatsApp</a>
                    <a className="db-btn db-btn-outline db-btn-sm" href={formLink} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>🔗 Open Form</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
 
      {/* VIEW MODAL */}
      {showModal==="view" && activeCase && (
        <div className="db-modal-bg" onClick={e=>e.target===e.currentTarget&&setShowModal(null)}>
          <div className="db-modal">
            <div className="db-modal-header">
              <div className="db-modal-title">{activeCase.name||"Case Details"}</div>
              <button className="db-modal-close" onClick={()=>setShowModal(null)}>×</button>
            </div>
            <div className="db-modal-body">
              <div style={{border:"1px solid #f1f5f9",borderRadius:10,overflow:"hidden",marginBottom:14}}>
                {[["Name",activeCase.name],["Phone",activeCase.phone],["Email",activeCase.email||"—"],["Reference ID",activeCase.refid||"NA"],["Client",activeCase.client||"—"],["Address",activeCase.address||"—"],["Address Type",activeCase.addrtype||"Permanent"],["Verification Date",activeCase.vdate||"—"],["Status",statusLabel(activeCase.status)]].map(([k,v],i,arr)=>(
                  <div key={k} className="db-view-row" style={i===arr.length-1?{borderBottom:"none"}:{}}>
                    <div className="db-view-key">{k}</div>
                    <div className="db-view-val">{k==="Status"?<span className={`db-status-badge ${statusBadgeClass(activeCase.status)}`}>{v}</span>:v}</div>
                  </div>
                ))}
                {getTATInfo(activeCase) && (() => {
                  const tat = getTATInfo(activeCase);
                  return (
                    <div className="db-view-row" style={{borderBottom:"none"}}>
                      <div className="db-view-key">TAT</div>
                      <div className="db-view-val"><span className={`tv-tat ${tat.level}`}>{tat.days} days elapsed</span></div>
                    </div>
                  );
                })()}
              </div>
              <div className="db-section-label">Verification Link</div>
              <div className="db-link-box">{buildLink(activeCase)}</div>
              <div className="db-link-actions">
                <button className="db-btn db-btn-outline db-btn-sm" onClick={()=>copyLink(buildLink(activeCase))}>{copied?"✓ Copied!":"📋 Copy link"}</button>
                <a className="db-wa-btn" href={buildWA(buildLink(activeCase),activeCase.name,activeCase.phone)} target="_blank" rel="noreferrer"><WaIcon /> Send on WhatsApp</a>
                <a className="db-btn db-btn-outline db-btn-sm" href={buildLink(activeCase)} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>🔗 Open Form</a>
              </div>
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button className="db-btn db-btn-outline db-btn-sm" onClick={()=>{setShowModal(null);setTimeout(()=>openEdit(activeIdx),50);}}>✏️ Edit</button>
                <button className="db-btn db-btn-sm" style={{color:"#dc2626",border:"1.5px solid #fecaca",background:"#fff"}} onClick={()=>deleteCase(activeIdx)}>🗑 Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
 
/* ═══════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════ */
export default function AddressVerification() {
  const [mode, setMode] = useState("dashboard");
  const [sidebarActive, setSidebarActive] = useState("dashboard");
 
  // Shared case list (across dashboard + client manager)
  const [cases, setCases] = useState([]);
 
  // Client list: [{ name: "TCS", ... }]
  const [clients, setClients] = useState([]);
  const [selectedClientIdx, setSelectedClientIdx] = useState(null);
 
  // When "Add Case" is clicked from ClientManager, this holds the client name to prefill
  const [pendingClientForCase, setPendingClientForCase] = useState(null);
 
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("mode") === "candidate") setMode("candidate");
  }, []);
 
  // Derive case count per client from the shared cases array
  const clientsWithCount = clients.map(c => ({
    ...c,
    caseCount: cases.filter(cs => cs.client === c.name).length,
    cases: cases.filter(cs => cs.client === c.name),
  }));
 
  const addClient = (name) => {
    setClients(prev => [...prev, { name }]);
  };
 
  const deleteClient = (idx) => {
    setClients(prev => prev.filter((_,i) => i !== idx));
    if (selectedClientIdx === idx) setSelectedClientIdx(null);
    else if (selectedClientIdx > idx) setSelectedClientIdx(prev => prev - 1);
  };
 
  // Called from ClientManagerPane when user clicks "+ Add Case" for a specific client
  const handleAddCaseForClient = (clientName) => {
    setPendingClientForCase(clientName);
    setSidebarActive("dashboard");
    setMode("dashboard");
  };
 
  const navTo = (key) => {
    setSidebarActive(key);
    setPendingClientForCase(null); // clear any pending prefill when navigating manually
    if (key === "dashboard" || key === "records" || key === "tat") setMode("dashboard");
    else if (key === "addClient") setMode("clients");
    else if (key === "candidate") setMode("candidate");
  };
 
  const navItems = [
    { key:"dashboard", icon:"📊", label:"Dashboard" },
    { key:"addClient", icon:"🏢", label:"Clients" },
    { key:"records",   icon:"📋", label:"Records" },
    { key:"tat",       icon:"⏱️", label:"TAT Tracker" },
  ];
 
  const pageTitle = {
    dashboard: { title: "Dashboard",    sub: "Overview of BGV records" },
    addClient: { title: "Clients",      sub: "Manage client companies" },
    records:   { title: "All Records",  sub: "Browse & manage BGV cases" },
    tat:       { title: "TAT Tracker",  sub: "Turnaround time & penalties" },
    candidate: { title: "Candidate Form", sub: "Complete address verification" },
  }[sidebarActive] || { title:"Dashboard", sub:"" };
 
  const isCandidateMode = mode === "candidate";
 
  return (
    <>
      <style>{css}</style>
      <div className="av-root">
 
        {/* TOP NAVBAR */}
        <div className="tv-navbar">
          <div className="tv-navbar-left">
            <div className="tv-logo">T</div>
            <div>
              <div className="tv-brand-name">TERVIES</div>
              <div className="tv-brand-sub">Super Admin</div>
            </div>
          </div>
          <div className="tv-navbar-right">
            <div className="tv-badge-role">👑 Super Admin</div>
            {!isCandidateMode && (
              <div className="tv-total-box">
                <div className="tv-total-lbl">Total Records</div>
                <div className="tv-total-val">{cases.length}</div>
              </div>
            )}
            <button className="tv-nav-btn" onClick={() => navTo("addClient")}>🏢 Clients</button>
            <button className="tv-nav-btn danger">🚪 Logout</button>
          </div>
        </div>
 
        {isCandidateMode ? (
          <div style={{padding:"0"}}>
            <div className="av-header">
              <div className="av-hd-eye">True Verification Services Pvt. Ltd.</div>
              <div className="av-hd-title">🏠 Address Verification <span className="av-badge candidate">Candidate</span></div>
              <div className="av-hd-sub">Residential Verification Portal</div>
            </div>
            <div className="av-page"><CandidatePane /></div>
          </div>
        ) : (
          <div className="tv-layout">
            {/* SIDEBAR */}
            <div className="tv-sidebar">
              <div className="tv-sidebar-section">Navigation</div>
              {navItems.map(item => (
                <div
                  key={item.key}
                  className={`tv-sidebar-item${sidebarActive===item.key?" active":""}`}
                  onClick={() => navTo(item.key)}
                >
                  <div className="tv-sidebar-item-left">
                    <span className="tv-sidebar-icon">{item.icon}</span>
                    {item.label}
                  </div>
                  {item.key === "records" && cases.length > 0 && (
                    <span className="tv-sidebar-count">{cases.length}</span>
                  )}
                  {item.key === "addClient" && clients.length > 0 && (
                    <span className="tv-sidebar-count">{clients.length}</span>
                  )}
                </div>
              ))}
              <div className="tv-sidebar-section" style={{marginTop:8}}>Admin</div>
              <div className="tv-sidebar-item" style={{color:"#dc2626"}}>
                <div className="tv-sidebar-item-left"><span className="tv-sidebar-icon">🚪</span>Logout</div>
              </div>
            </div>
 
            {/* MAIN */}
            <div className="tv-main">
              <div className="tv-page-header">
                <div className="tv-page-title">
                  {mode === "clients" ? "🏢" : "📊"} {pageTitle.title}
                </div>
                <div className="tv-page-sub">
                  <span className="tv-online-dot" />
                  {pageTitle.sub}
                </div>
              </div>
 
              {mode === "dashboard" && (
                <DashboardPane
                  cases={cases}
                  setCases={setCases}
                  prefillClient={pendingClientForCase}
                  onNav={navTo}
                />
              )}
 
              {mode === "clients" && (
                <ClientManagerPane
                  clients={clientsWithCount}
                  onAddClient={addClient}
                  onDeleteClient={deleteClient}
                  onSelectClient={setSelectedClientIdx}
                  selectedClientIdx={selectedClientIdx}
                  onAddCase={handleAddCaseForClient}
                  onImportExcelForClient={newCases => setCases(prev => [...prev, ...newCases])}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}