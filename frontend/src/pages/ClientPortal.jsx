import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "/api";
const OUR_EMAIL = "talent@tervies.info";
const OUR_PHONE = "+91-98765-43210";
const OUR_WA    = "https://wa.me/919876543210";

/* ─── helpers ─────────────────────────────────────────── */
function getSession() {
  try { return JSON.parse(localStorage.getItem("cl_sess") || "null"); }
  catch { return null; }
}
function saveSession(d) { localStorage.setItem("cl_sess", JSON.stringify(d)); }
function clearSession() { localStorage.removeItem("cl_sess"); }
function fmtBytes(b) {
  if (!b) return "";
  return b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
const AV_BG = ["#d4380d","#096dd9","#389e0d","#531dab","#c41d7f","#0050b3","#7c3aed","#b45309"];
function avBg(name) { return AV_BG[(name || "A").charCodeAt(0) % AV_BG.length]; }

/* ─── STYLES ───────────────────────────────────────────── */
const S = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;background:#f1f3f6;color:#212121;-webkit-font-smoothing:antialiased}

/* TOPBAR */
.tb{background:#fff;border-bottom:1px solid #e0e0e0;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:300;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.tb-left{display:flex;align-items:center;gap:14px}
.tb-logo{display:flex;align-items:center;gap:8px}
.tb-logo-icon{width:36px;height:36px;background:linear-gradient(135deg,#d4380d,#ff7a45);border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Libre Baskerville',serif;font-weight:700;font-size:16px;color:#fff;letter-spacing:-.02em}
.tb-logo-name{font-family:'Libre Baskerville',serif;font-size:19px;font-weight:700;color:#1a1a2e;letter-spacing:-.02em}
.tb-logo-tag{font-size:10px;font-weight:800;color:#d4380d;background:#fff2e8;padding:2px 7px;border-radius:20px;border:1px solid #ffbb96;letter-spacing:.04em;text-transform:uppercase}
.tb-search{display:flex;align-items:center;gap:0;background:#f5f5f5;border:1.5px solid #e0e0e0;border-radius:8px;overflow:hidden;height:38px;width:340px}
.tb-search-icon{padding:0 10px;color:#999;font-size:15px;flex-shrink:0}
.tb-search-inp{border:none;outline:none;background:transparent;font-family:'Nunito',sans-serif;font-size:13px;color:#212121;flex:1}
.tb-search-inp::placeholder{color:#bbb}
.tb-search-btn{padding:0 14px;background:#d4380d;color:#fff;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;border:none;cursor:pointer;height:100%;transition:.15s;white-space:nowrap}
.tb-search-btn:hover{background:#b52f09}
.tb-right{display:flex;align-items:center;gap:8px}
.tb-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0}
.tb-company{font-size:13px;font-weight:700;color:#1a1a2e;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tb-logout{padding:6px 14px;border:1.5px solid #e0e0e0;border-radius:7px;background:#fff;color:#555;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:.15s}
.tb-logout:hover{border-color:#d4380d;color:#d4380d}

/* LAYOUT */
.layout{display:flex;min-height:calc(100vh - 56px)}

/* LEFT SIDEBAR */
.sidebar{width:210px;flex-shrink:0;background:#fff;border-right:1px solid #e8e8e8;padding:20px 0;position:sticky;top:56px;height:calc(100vh - 56px);overflow-y:auto;display:flex;flex-direction:column}
.sb-sec{margin-bottom:8px}
.sb-sec-title{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#bbb;padding:8px 18px 4px}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 18px;font-size:13.5px;font-weight:600;color:#555;cursor:pointer;transition:.12s;border:none;background:none;width:100%;text-align:left;position:relative}
.sb-item:hover{background:#fff5f0;color:#d4380d}
.sb-item.on{background:#fff2e8;color:#d4380d;font-weight:800;border-right:3px solid #d4380d}
.sb-item .sb-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0}
.sb-badge{margin-left:auto;background:#d4380d;color:#fff;font-size:10px;font-weight:800;padding:1px 6px;border-radius:12px;min-width:18px;text-align:center}
.sb-divider{height:1px;background:#f0f0f0;margin:8px 0}
.sb-bottom{margin-top:auto;padding:14px 16px;border-top:1px solid #f0f0f0}
.sb-acct{background:#f8f8f8;border-radius:10px;padding:12px}
.sb-acct-name{font-size:12px;font-weight:800;color:#1a1a2e;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-acct-email{font-size:10.5px;color:#999;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-acct-stat{font-size:11px;color:#555;font-weight:600}
.sb-acct-stat span{color:#d4380d;font-weight:800}

/* MAIN */
.main{flex:1;min-width:0;padding:20px 22px;background:#f1f3f6}

/* PAGE HERO */
.hero{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:14px;padding:22px 28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(212,56,13,.12)}
.hero::after{content:'';position:absolute;bottom:-40px;left:200px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.03)}
.hero-left{position:relative;z-index:1}
.hero-title{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;color:#fff;letter-spacing:-.02em;margin-bottom:5px}
.hero-sub{font-size:13px;color:rgba(255,255,255,.55);margin-bottom:16px}
.hero-chips{display:flex;gap:8px;flex-wrap:wrap}
.hero-chip{padding:5px 13px;border-radius:20px;font-size:12px;font-weight:700;border:1.5px solid}
.hero-chip.orange{color:#ff9c6e;border-color:rgba(255,156,110,.4);background:rgba(255,156,110,.1)}
.hero-chip.blue{color:#91d5ff;border-color:rgba(145,213,255,.3);background:rgba(145,213,255,.08)}
.hero-chip.green{color:#95de64;border-color:rgba(149,222,100,.3);background:rgba(149,222,100,.08)}
.hero-right{display:flex;gap:14px;position:relative;z-index:1;flex-shrink:0}
.hero-stat{text-align:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 16px}
.hero-stat-val{font-family:'Libre Baskerville',serif;font-size:26px;font-weight:700;color:#fff;line-height:1}
.hero-stat-label{font-size:10px;color:rgba(255,255,255,.45);margin-top:3px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}

/* FILTER ROW */
.filter-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.filter-label{font-size:12px;font-weight:700;color:#888;white-space:nowrap}
.f-chip{padding:6px 14px;border-radius:20px;font-size:12.5px;font-weight:700;border:1.5px solid #d9d9d9;background:#fff;color:#555;cursor:pointer;transition:.12s;white-space:nowrap}
.f-chip:hover{border-color:#d4380d;color:#d4380d}
.f-chip.on{background:#d4380d;border-color:#d4380d;color:#fff}
.f-select{padding:7px 10px;border-radius:8px;border:1.5px solid #d9d9d9;background:#fff;font-family:'Nunito',sans-serif;font-size:12.5px;font-weight:600;color:#555;outline:none;cursor:pointer}

/* CANDIDATE LIST */
.cand-list{display:flex;flex-direction:column;gap:10px}

/* ─ NAUKRI-STYLE CANDIDATE CARD ─ */
.cc{background:#fff;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;transition:.18s;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.cc:hover{box-shadow:0 4px 18px rgba(0,0,0,.1);border-color:#d9d9d9;transform:translateY(-1px)}
.cc-top{display:grid;grid-template-columns:52px 1fr auto;gap:14px;align-items:flex-start;padding:16px 18px}
.cc-av{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;flex-shrink:0;font-family:'Libre Baskerville',serif}
.cc-body{min-width:0}
.cc-name-row{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap}
.cc-name{font-size:16px;font-weight:800;color:#1a1a2e;letter-spacing:-.01em;font-family:'Libre Baskerville',serif}
.cc-exp-badge{padding:2px 9px;background:#e6f7ff;border:1px solid #91d5ff;border-radius:20px;font-size:11px;font-weight:700;color:#096dd9}
.cc-status-badge{padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:800;letter-spacing:.03em}
.cc-status-badge.verified{background:#f6ffed;border:1px solid #b7eb8f;color:#389e0d}
.cc-status-badge.submitted{background:#e6f7ff;border:1px solid #91d5ff;color:#096dd9}
.cc-status-badge.review{background:#fffbe6;border:1px solid #ffe58f;color:#d48806}
.cc-role{font-size:13px;color:#d4380d;font-weight:700;margin-bottom:4px}
.cc-meta{font-size:12px;color:#888;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cc-meta-sep{color:#d9d9d9}
.cc-skills{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
.cc-skill{padding:3px 9px;background:#f5f5f5;border:1px solid #e8e8e8;border-radius:5px;font-size:11.5px;font-weight:600;color:#444}
.cc-bio{font-size:12.5px;color:#777;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cc-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
.cc-toggle{padding:7px 16px;border-radius:8px;border:2px solid #d4380d;background:#fff;color:#d4380d;font-family:'Nunito',sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;transition:.15s;white-space:nowrap}
.cc-toggle:hover{background:#fff5f0}
.cc-toggle.open{background:#d4380d;color:#fff}
.cc-shortlisted-tag{font-size:11px;font-weight:700;color:#389e0d;background:#f6ffed;border:1px solid #b7eb8f;border-radius:20px;padding:3px 10px;white-space:nowrap}

/* EXPANDED PANEL */
.cc-expand{border-top:1px solid #f0f0f0;display:grid;grid-template-columns:220px 1fr;animation:slideDown .18s ease}
@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}

/* Profile col */
.cc-prof{background:#fafafa;border-right:1px solid #f0f0f0;padding:18px}
.cp-block{margin-bottom:14px}
.cp-label{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#bbb;margin-bottom:5px}
.cp-val{font-size:13px;font-weight:700;color:#1a1a2e;line-height:1.4}
.cp-val-sm{font-size:12px;color:#666;line-height:1.5}

/* CONTACT BANNER inside profile */
.contact-banner{background:linear-gradient(135deg,#fff2e8,#fff);border:1.5px solid #ffbb96;border-radius:10px;padding:13px;margin-bottom:14px}
.contact-banner-title{font-size:11px;font-weight:800;color:#d4380d;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:5px}
.contact-line{display:flex;align-items:center;gap:7px;margin-bottom:6px}
.contact-line:last-of-type{margin-bottom:0}
.contact-ico{font-size:13px}
.contact-txt{font-size:12px;font-weight:700;color:#d4380d}
.contact-note{font-size:10px;color:#999;margin-top:7px;line-height:1.45}

/* Resume col */
.cc-resumes{padding:18px 20px}
.res-hd{font-size:13px;font-weight:800;color:#1a1a2e;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between}
.res-hd-count{font-size:11.5px;font-weight:600;color:#999}

/* LOCKED RESUME CARD */
.res-locked{border:1.5px dashed #e0e0e0;border-radius:10px;padding:14px 16px;margin-bottom:8px;position:relative;overflow:hidden;background:#fafafa}
.res-locked-blur{filter:blur(4px);pointer-events:none;user-select:none;opacity:.5}
.res-locked-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.65);backdrop-filter:blur(1px);gap:6px}
.res-locked-icon{font-size:22px}
.res-locked-text{font-size:12px;font-weight:800;color:#555;text-align:center}
.res-locked-cta{padding:6px 16px;background:#d4380d;color:#fff;border:none;border-radius:7px;font-family:'Nunito',sans-serif;font-size:12px;font-weight:800;cursor:pointer;transition:.15s;letter-spacing:.01em}
.res-locked-cta:hover{background:#b52f09}

/* UNLOCKED RESUME CARD */
.res-card{border:1.5px solid #e8e8e8;border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;background:#fff;transition:.15s}
.res-card:hover{border-color:#ffbb96;background:#fff8f5}
.res-card.shortlisted-res{border-color:#b7eb8f;background:#f6ffed}
.res-file-icon{width:38px;height:38px;border-radius:8px;background:#fff2e8;border:1px solid #ffbb96;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.res-info{flex:1;min-width:0}
.res-name{font-size:13px;font-weight:700;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.res-meta{font-size:11px;color:#bbb;margin-top:2px}
.res-latest{font-size:10px;font-weight:800;color:#d4380d;background:#fff2e8;border-radius:4px;padding:1px 6px;margin-left:6px}
.res-btns{display:flex;gap:6px;flex-shrink:0}
.btn-dl{padding:6px 13px;border:1.5px solid #d9d9d9;border-radius:7px;background:#fff;color:#444;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:.15s}
.btn-dl:hover{border-color:#555}
.btn-dl:disabled{opacity:.4;cursor:default}
.btn-sl{padding:6px 14px;border:none;border-radius:7px;background:#d4380d;color:#fff;font-family:'Nunito',sans-serif;font-size:12px;font-weight:800;cursor:pointer;transition:.15s}
.btn-sl:hover{background:#b52f09}
.btn-sl.done{background:#389e0d}
.btn-sl.done:hover{background:#2a7a0a}
.btn-sl:disabled{opacity:.5;cursor:default}
.btn-contact-sm{padding:6px 12px;border:1.5px solid #1a1a2e;border-radius:7px;background:#1a1a2e;color:#fff;font-family:'Nunito',sans-serif;font-size:12px;font-weight:800;cursor:pointer;transition:.15s}
.btn-contact-sm:hover{background:#2d2d4a}

/* After shortlist banner */
.after-sl{display:flex;align-items:center;gap:8px;padding:10px 13px;background:#f6ffed;border:1.5px solid #b7eb8f;border-radius:8px;font-size:12.5px;color:#2a7a0a;margin-top:10px}

/* UNLOCK PROMPT (full-width for candidate with no accessible resume) */
.unlock-prompt{padding:28px;text-align:center;background:linear-gradient(135deg,#fff8f5,#fff)}
.unlock-prompt-icon{font-size:40px;margin-bottom:10px}
.unlock-prompt-title{font-size:15px;font-weight:800;color:#1a1a2e;margin-bottom:5px;font-family:'Libre Baskerville',serif}
.unlock-prompt-sub{font-size:12.5px;color:#888;margin-bottom:16px;line-height:1.6;max-width:380px;margin-inline:auto}
.unlock-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn-unlock-wa{padding:9px 20px;border-radius:8px;background:#25d366;color:#fff;border:none;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer;transition:.15s}
.btn-unlock-wa:hover{background:#1ebe5d}
.btn-unlock-email{padding:9px 20px;border-radius:8px;background:#d4380d;color:#fff;border:none;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer;transition:.15s}
.btn-unlock-email:hover{background:#b52f09}
.btn-unlock-tel{padding:9px 20px;border-radius:8px;background:#fff;color:#1a1a2e;border:2px solid #1a1a2e;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer;transition:.15s}
.btn-unlock-tel:hover{background:#1a1a2e;color:#fff}

/* MODAL */
.modal-ov{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)}
.modal{background:#fff;border-radius:16px;width:100%;max-width:440px;box-shadow:0 24px 80px rgba(0,0,0,.2);overflow:hidden;animation:popIn .2s ease}
@keyframes popIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
.modal-stripe{background:linear-gradient(135deg,#d4380d,#ff7a45);padding:20px 24px;display:flex;align-items:center;justify-content:space-between}
.modal-stripe-title{font-family:'Libre Baskerville',serif;font-size:18px;font-weight:700;color:#fff}
.modal-stripe-close{background:rgba(255,255,255,.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}
.modal-stripe-close:hover{background:rgba(255,255,255,.3)}
.modal-body{padding:20px 24px 24px}
.modal-cand-row{display:flex;align-items:center;gap:12px;background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;padding:12px;margin-bottom:14px}
.modal-cand-av{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:#fff;font-family:'Libre Baskerville',serif;flex-shrink:0}
.modal-cand-name{font-size:14px;font-weight:800;color:#1a1a2e}
.modal-cand-role{font-size:12px;color:#888}
.modal-notice{background:#fff8f5;border:1.5px solid #ffbb96;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#7a3000;line-height:1.55}
.modal-notice strong{display:block;margin-bottom:3px;font-size:13px;color:#d4380d}
.modal-contact-row{display:flex;align-items:center;gap:10px;padding:11px 13px;background:#f8f8f8;border:1px solid #e8e8e8;border-radius:9px;margin-bottom:8px;cursor:pointer;transition:.15s;text-decoration:none}
.modal-contact-row:hover{border-color:#d4380d;background:#fff5f0}
.mc-icon{font-size:20px;flex-shrink:0}
.mc-val{font-size:13.5px;font-weight:800;color:#1a1a2e}
.mc-label{font-size:11px;color:#999}
.mc-arrow{margin-left:auto;color:#bbb;font-size:14px}
.modal-note{font-size:11.5px;color:#bbb;margin-top:12px;line-height:1.5;text-align:center}

/* SHORTLIST PAGE */
.sl-card{background:#fff;border:1px solid #e8e8e8;border-radius:10px;display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:8px;transition:.15s}
.sl-card:hover{border-color:#d9d9d9;box-shadow:0 2px 10px rgba(0,0,0,.06)}

/* CONTACT PAGE */
.contact-page-hero{background:linear-gradient(135deg,#d4380d,#ff7a45);border-radius:14px;padding:28px 32px;text-align:center;margin-bottom:20px;color:#fff}
.contact-page-hero-title{font-family:'Libre Baskerville',serif;font-size:24px;font-weight:700;margin-bottom:8px}
.contact-page-hero-sub{font-size:14px;opacity:.8;margin-bottom:20px}
.contact-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px}
.ccontact-card{background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:22px 20px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05);transition:.2s;cursor:pointer;text-decoration:none;display:block}
.ccontact-card:hover{box-shadow:0 6px 20px rgba(212,56,13,.12);border-color:#ffbb96;transform:translateY(-2px)}
.ccontact-card-icon{font-size:32px;margin-bottom:12px}
.ccontact-card-label{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#bbb;margin-bottom:5px}
.ccontact-card-val{font-size:15px;font-weight:800;color:#d4380d;margin-bottom:6px;font-family:'Libre Baskerville',serif}
.ccontact-card-desc{font-size:12px;color:#888;line-height:1.6}
.how-steps{background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:22px 24px}
.how-steps-title{font-size:14px;font-weight:800;color:#1a1a2e;margin-bottom:18px;font-family:'Libre Baskerville',serif}
.step-row{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px}
.step-row:last-child{margin-bottom:0}
.step-num{width:32px;height:32px;border-radius:50%;background:#d4380d;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.step-title{font-size:13.5px;font-weight:800;color:#1a1a2e;margin-bottom:3px}
.step-desc{font-size:12.5px;color:#888;line-height:1.55}

/* AUTH */
.auth-root{min-height:100vh;display:flex;background:#f1f3f6}
.auth-left{width:480px;flex-shrink:0;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);display:flex;flex-direction:column;padding:52px 50px;position:relative;overflow:hidden}
.auth-left::before{content:'';position:absolute;top:-100px;right:-80px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(212,56,13,.2) 0%,transparent 70%);pointer-events:none}
.auth-left::after{content:'';position:absolute;bottom:-80px;left:-60px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(15,52,96,.5) 0%,transparent 70%);pointer-events:none}
.auth-brand{display:flex;align-items:center;gap:10px;margin-bottom:60px;position:relative;z-index:1}
.auth-brand-icon{width:44px;height:44px;background:linear-gradient(135deg,#d4380d,#ff7a45);border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Libre Baskerville',serif;font-weight:700;font-size:20px;color:#fff}
.auth-brand-name{font-family:'Libre Baskerville',serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:-.02em}
.auth-hl{font-family:'Libre Baskerville',serif;font-size:36px;font-weight:700;color:#fff;line-height:1.2;margin-bottom:14px;letter-spacing:-.02em;position:relative;z-index:1}
.auth-hl em{color:#ff9c6e;font-style:normal}
.auth-hl-sub{font-size:14px;color:rgba(255,255,255,.45);line-height:1.7;margin-bottom:36px;position:relative;z-index:1}
.auth-feat-list{position:relative;z-index:1}
.auth-feat{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
.auth-feat-dot{width:8px;height:8px;border-radius:50%;background:#d4380d;flex-shrink:0;margin-top:5px}
.auth-feat-text{font-size:13px;color:rgba(255,255,255,.6);line-height:1.5}
.auth-feat-text b{color:rgba(255,255,255,.85);font-weight:700}
.auth-foot{margin-top:auto;font-size:11px;color:rgba(255,255,255,.2);position:relative;z-index:1}
.auth-right{flex:1;display:flex;align-items:center;justify-content:center;padding:52px 44px}
.auth-box{width:100%;max-width:400px}
.auth-box-title{font-family:'Libre Baskerville',serif;font-size:26px;font-weight:700;color:#1a1a2e;margin-bottom:5px;letter-spacing:-.02em}
.auth-box-sub{font-size:13px;color:#999;margin-bottom:26px}
.auth-toggle{display:flex;background:#f5f5f5;border:1px solid #e8e8e8;border-radius:10px;padding:4px;margin-bottom:22px;gap:3px}
.auth-toggle-btn{flex:1;padding:9px;border-radius:7px;border:none;background:transparent;font-family:'Nunito',sans-serif;font-size:13px;font-weight:600;color:#999;cursor:pointer;transition:.15s}
.auth-toggle-btn.on{background:#fff;color:#1a1a2e;font-weight:800;box-shadow:0 1px 4px rgba(0,0,0,.1)}
.fg{margin-bottom:14px}
.fg label{display:block;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#bbb;margin-bottom:6px}
.fg input{width:100%;padding:11px 13px;border:1.5px solid #e0e0e0;border-radius:9px;font-family:'Nunito',sans-serif;font-size:14px;color:#1a1a2e;background:#fff;outline:none;transition:.15s}
.fg input:focus{border-color:#d4380d;box-shadow:0 0 0 3px rgba(212,56,13,.1)}
.fg input::placeholder{color:#ccc}
.btn-auth{width:100%;padding:13px;background:linear-gradient(135deg,#d4380d,#ff7a45);color:#fff;border:none;border-radius:9px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;transition:.2s;margin-top:6px;letter-spacing:.01em;box-shadow:0 4px 16px rgba(212,56,13,.3)}
.btn-auth:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(212,56,13,.4)}
.btn-auth:disabled{opacity:.5;cursor:default;transform:none;box-shadow:none}
.err-box{background:#fff2f0;border:1.5px solid #ffccc7;border-radius:9px;padding:11px 13px;font-size:13px;color:#cf1322;margin-bottom:14px}
.auth-sw{text-align:center;margin-top:18px;font-size:13px;color:#999}
.auth-sw button{background:none;border:none;color:#d4380d;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;font-size:13px}

/* EMPTY */
.empty{text-align:center;padding:70px 20px;background:#fff;border:1px solid #e8e8e8;border-radius:12px}
.empty-icon{font-size:52px;margin-bottom:14px}
.empty-title{font-family:'Libre Baskerville',serif;font-size:19px;font-weight:700;color:#1a1a2e;margin-bottom:6px}
.empty-desc{font-size:13px;color:#bbb;max-width:300px;margin:0 auto;line-height:1.6}

/* LOADING */
.loading{text-align:center;padding:70px 20px}
.spin{width:36px;height:36px;border:3px solid #f0f0f0;border-top-color:#d4380d;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 14px}
@keyframes spin{to{transform:rotate(360deg)}}
.loading p{font-size:13px;color:#bbb;font-weight:600}

/* TOAST */
.toasts{position:fixed;bottom:22px;right:22px;z-index:9999;display:flex;flex-direction:column;gap:8px}
.toast{background:#fff;border:1px solid #e8e8e8;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.15);padding:13px 16px;display:flex;align-items:center;gap:11px;max-width:320px;animation:toastIn .25s ease}
@keyframes toastIn{from{transform:translateX(80px);opacity:0}to{transform:none;opacity:1}}
.toast-ico{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.toast-msg{font-size:13px;font-weight:700;color:#1a1a2e;flex:1;line-height:1.4}
.toast-x{background:none;border:none;color:#ccc;font-size:16px;cursor:pointer;flex-shrink:0}

/* SCROLLBAR */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:#f5f5f5}
::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:3px}

@media(max-width:900px){
  .auth-left{display:none}
  .layout{flex-direction:column}
  .sidebar{display:none}
  .hero{flex-direction:column;gap:16px}
  .hero-right{width:100%;justify-content:center}
  .cc-expand{grid-template-columns:1fr}
  .contact-cards{grid-template-columns:1fr}
}
`;

/* ─── TOAST HOOK ───────────────────────────────────────── */
function useToasts() {
  const [list, setList] = useState([]);
  const push = (msg, type = "ok") => {
    const id = Date.now();
    setList(l => [...l, { id, msg, type }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), 3800);
  };
  const remove = id => setList(l => l.filter(x => x.id !== id));
  return { list, push, remove };
}
function ToastBox({ list, remove }) {
  const cfg = { ok: { bg: "#f6ffed", color: "#389e0d", icon: "✓" }, err: { bg: "#fff2f0", color: "#cf1322", icon: "✕" }, info: { bg: "#e6f7ff", color: "#096dd9", icon: "ℹ" } };
  return (
    <div className="toasts">
      {list.map(t => {
        const c = cfg[t.type] || cfg.ok;
        return (
          <div key={t.id} className="toast">
            <div className="toast-ico" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
            <div className="toast-msg">{t.msg}</div>
            <button className="toast-x" onClick={() => remove(t.id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── CONTACT MODAL ────────────────────────────────────── */
function ContactModal({ cand, onClose }) {
  const role = cand?.profile?.desiredRole || "Candidate";
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-stripe">
          <div className="modal-stripe-title">Contact to Unlock</div>
          <button className="modal-stripe-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-cand-row">
            <div className="modal-cand-av" style={{ background: avBg(cand.name) }}>{initials(cand.name)}</div>
            <div>
              <div className="modal-cand-name">{cand.name}</div>
              <div className="modal-cand-role">{role}</div>
            </div>
          </div>
          <div className="modal-notice">
            <strong>🔒 Resume access is protected</strong>
            To view and download this candidate's full resume and contact details, reach out to our talent team. We'll arrange access and coordinate the introduction within 24 hours.
          </div>
          <a className="modal-contact-row" href={`https://wa.me/919876543210?text=Hi Tervies, I'm interested in candidate: ${cand.name} (${role}). Please help me access their resume.`} target="_blank" rel="noreferrer">
            <span className="mc-icon">💬</span>
            <div><div className="mc-val">WhatsApp Us</div><div className="mc-label">Fastest response — typically under 1 hour</div></div>
            <span className="mc-arrow">↗</span>
          </a>
          <a className="modal-contact-row" href={`mailto:${OUR_EMAIL}?subject=Resume Access Request — ${cand.name}&body=Hi Tervies Team,%0A%0AI'm interested in candidate: ${cand.name} (${role}).%0ACompany: [Your Company]%0A%0APlease help me access their resume and arrange an introduction.%0A%0AThank you.`}>
            <span className="mc-icon">✉️</span>
            <div><div className="mc-val">{OUR_EMAIL}</div><div className="mc-label">Email our talent team</div></div>
            <span className="mc-arrow">↗</span>
          </a>
          <a className="modal-contact-row" href={`tel:${OUR_PHONE.replace(/[^+\d]/g, "")}`}>
            <span className="mc-icon">📞</span>
            <div><div className="mc-val">{OUR_PHONE}</div><div className="mc-label">Call us — Mon to Sat, 9am–7pm IST</div></div>
            <span className="mc-arrow">↗</span>
          </a>
          <div className="modal-note">Mention <strong>{cand.name}'s</strong> name and your company — we'll get back within 1 business day.</div>
        </div>
      </div>
    </div>
  );
}

/* ─── AUTH VIEW ────────────────────────────────────────── */
function AuthView({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [f, setF] = useState({ contactName: "", companyName: "", email: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = k => e => { setF(p => ({ ...p, [k]: e.target.value })); setErr(""); };
  const sw  = v => { setTab(v); setErr(""); setF(p => ({ ...p, password: "", confirm: "" })); };

  const submit = async e => {
    e.preventDefault(); setErr("");
    if (!f.email || !f.password) return setErr("Email and password are required.");
    if (tab === "register") {
      if (!f.contactName.trim()) return setErr("Your name is required.");
      if (!f.companyName.trim()) return setErr("Company name is required.");
      if (f.password.length < 6) return setErr("Password must be at least 6 characters.");
      if (f.password !== f.confirm) return setErr("Passwords do not match.");
    }
    setBusy(true);
    try {
      const url = tab === "register" ? `${API}/client/register` : `${API}/client/login`;
      const body = tab === "register"
        ? { contactName: f.contactName.trim(), companyName: f.companyName.trim(), email: f.email.trim(), password: f.password }
        : { email: f.email.trim(), password: f.password };
      const res = await axios.post(url, body);
      const s = { token: res.data.token, contactName: res.data.contactName, companyName: res.data.companyName, email: f.email.trim(), clientId: res.data.clientId };
      saveSession(s); onLogin(s);
    } catch (e) { setErr(e.response?.data?.message || "Something went wrong."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <style>{S}</style>
      <div className="auth-root">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">T</div>
            <div className="auth-brand-name">Tervies</div>
          </div>
          <div className="auth-hl">Find <em>verified talent</em><br />that's ready to hire.</div>
          <div className="auth-hl-sub">India's talent portal where every candidate has completed background verification, skills review, and submission before you see them.</div>
          <div className="auth-feat-list">
            {[
              ["Verified candidate pool", "Every profile is screened, BGV-checked, and ready."],
              ["Resume on demand", "Contact us to instantly unlock any candidate's resume."],
              ["No spam. No noise.", "Only relevant, active candidates who want to be found."],
              ["24-hour turnaround", "Our team connects you with candidates within a day."],
            ].map(([t, d]) => (
              <div key={t} className="auth-feat">
                <div className="auth-feat-dot" />
                <div className="auth-feat-text"><b>{t}</b> — {d}</div>
              </div>
            ))}
          </div>
          <div className="auth-foot">© {new Date().getFullYear()} Tervies BGV Services Pvt. Ltd.</div>
        </div>

        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-box-title">{tab === "login" ? "Recruiter Sign In" : "Create Recruiter Account"}</div>
            <div className="auth-box-sub">{tab === "login" ? "Access your hiring dashboard." : "Start browsing verified talent today."}</div>
            <div className="auth-toggle">
              {[["login", "Sign In"], ["register", "Register"]].map(([v, l]) => (
                <button key={v} className={`auth-toggle-btn ${tab === v ? "on" : ""}`} onClick={() => sw(v)}>{l}</button>
              ))}
            </div>
            {err && <div className="err-box">{err}</div>}
            <form onSubmit={submit}>
              {tab === "register" && (<>
                <div className="fg"><label>Your Full Name</label><input value={f.contactName} onChange={set("contactName")} placeholder="Priya Kapoor" /></div>
                <div className="fg"><label>Company / Organisation</label><input value={f.companyName} onChange={set("companyName")} placeholder="Acme Solutions Pvt. Ltd." /></div>
              </>)}
              <div className="fg"><label>Work Email</label><input type="email" value={f.email} onChange={set("email")} placeholder="hr@company.com" /></div>
              <div className="fg"><label>Password</label><input type="password" value={f.password} onChange={set("password")} placeholder={tab === "register" ? "Min 6 characters" : "Enter password"} /></div>
              {tab === "register" && <div className="fg"><label>Confirm Password</label><input type="password" value={f.confirm} onChange={set("confirm")} placeholder="Repeat password" /></div>}
              <button type="submit" className="btn-auth" disabled={busy}>{busy ? "Please wait…" : tab === "login" ? "Sign In →" : "Create Account →"}</button>
            </form>
            <div className="auth-sw">
              {tab === "login" ? "New recruiter? " : "Already registered? "}
              <button onClick={() => sw(tab === "login" ? "register" : "login")}>{tab === "login" ? "Create account" : "Sign in"}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── MAIN DASHBOARD ───────────────────────────────────── */
function Dashboard({ session, onLogout }) {
  const [page, setPage]         = useState("browse");
  const [cases, setCases]       = useState([]);
  const [busy, setBusy]         = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [shortlisted, setShortlisted] = useState({});
  const [saving, setSaving]     = useState({});
  const [dlBusy, setDlBusy]     = useState({});
  const [contactFor, setContactFor] = useState(null);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole]     = useState("all");
  const { list: toasts, push: toast, remove: rmToast } = useToasts();

  const authHead = { Authorization: `Bearer ${session.token}` };

  useEffect(() => {
    axios.get(`${API}/client/cases`, { headers: authHead })
      .then(r => {
        const data = r.data.cases || [];
        setCases(data);
        const sl = {};
        data.forEach(c => { if (c.selectedResumeKey) sl[c.caseId] = c.selectedResumeKey; });
        setShortlisted(sl);
      })
      .catch(() => toast("Failed to load candidates.", "err"))
      .finally(() => setBusy(false));
  }, []);

  const doShortlist = async (caseId, key) => {
    const already = shortlisted[caseId] === key;
    setSaving(p => ({ ...p, [caseId]: true }));
    try {
      await axios.post(`${API}/client/select-resume`, { caseId, resumeKey: already ? null : key }, { headers: authHead });
      setShortlisted(p => {
        const n = { ...p };
        already ? delete n[caseId] : (n[caseId] = key);
        return n;
      });
      toast(already ? "Removed from shortlist." : "Candidate shortlisted!", already ? "info" : "ok");
    } catch { toast("Failed. Please retry.", "err"); }
    finally { setSaving(p => ({ ...p, [caseId]: false })); }
  };

  const doDownload = async (key, name) => {
    setDlBusy(p => ({ ...p, [key]: true }));
    try {
      const r = await axios.get(`${API}/client/resume-download`, { params: { key }, headers: authHead });
      const a = document.createElement("a");
      a.href = r.data.url; a.download = name || "resume"; a.target = "_blank";
      document.body.appendChild(a); a.click(); a.remove();
      toast("Resume downloading…", "ok");
    } catch { toast("Download failed.", "err"); }
    finally { setDlBusy(p => ({ ...p, [key]: false })); }
  };

  /* derived */
  const allRoles = [...new Set(cases.map(c => c.candidateSummary?.desiredRole).filter(Boolean))];
  const slCount  = Object.keys(shortlisted).length;
  const verified = cases.filter(c => c.status?.toLowerCase() === "verified").length;

  const filtered = cases.filter(c => {
    const p = c.candidateSummary || {};
    const q = search.toLowerCase();
    const mQ = !q || [c.name, p.desiredRole, p.city, p.industry, ...(p.skills || [])].some(v => (v || "").toLowerCase().includes(q));
    const mS = filterStatus === "all" || (c.status || "").toLowerCase() === filterStatus;
    const mR = filterRole === "all" || (p.desiredRole || "") === filterRole;
    return mQ && mS && mR;
  });
  const slCases = cases.filter(c => shortlisted[c.caseId]);

  const statusBadge = status => {
    const s = (status || "submitted").toLowerCase();
    if (s === "verified") return { cls: "verified", label: "BGV Verified" };
    if (s === "under_review") return { cls: "review", label: "In Review" };
    return { cls: "submitted", label: "Submitted" };
  };

  const NAV = [
    { id: "browse",    icon: "🔍", label: "Search Candidates" },
    { id: "shortlist", icon: "⭐", label: "My Shortlist", badge: slCount > 0 ? slCount : null },
    { id: "contact",   icon: "📞", label: "Contact Us" },
  ];

  /* ── CANDIDATE CARD ── */
  const CandCard = ({ c }) => {
    const p        = c.candidateSummary || {};
    const resumes  = c.candidateResumes || [];
    const isOpen   = expanded === c.caseId;
    const isSl     = !!shortlisted[c.caseId];
    const sb       = statusBadge(c.status);
    const bg       = avBg(c.name);

    // Only show resumes as unlocked if they are actually accessible
    // ALL resumes are locked — client must contact us to unlock
    const RESUME_UNLOCKED = false; // Set to true per-client after payment/contact

    return (
      <div className="cc">
        {/* TOP ROW */}
        <div className="cc-top">
          <div className="cc-av" style={{ background: bg }}>{initials(c.name)}</div>

          <div className="cc-body">
            <div className="cc-name-row">
              <span className="cc-name">{c.name || "Unnamed"}</span>
              {p.experience && <span className="cc-exp-badge">{p.experience}</span>}
              <span className={`cc-status-badge ${sb.cls}`}>{sb.label}</span>
              {isSl && <span style={{ fontSize: 11, color: "#389e0d", fontWeight: 800, background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 20, padding: "2px 9px" }}>⭐ Shortlisted</span>}
            </div>
            {p.desiredRole && <div className="cc-role">{p.desiredRole}{p.industry ? ` · ${p.industry}` : ""}</div>}
            <div className="cc-meta">
              {p.city && <><span>📍 {p.city}</span><span className="cc-meta-sep">|</span></>}
              {p.degree && <><span>🎓 {p.degree}</span><span className="cc-meta-sep">|</span></>}
              {p.college && <span>{p.college}</span>}
            </div>
            {p.skills?.length > 0 && (
              <div className="cc-skills">
                {p.skills.slice(0, 6).map(s => <span key={s} className="cc-skill">{s}</span>)}
                {p.skills.length > 6 && <span className="cc-skill" style={{ color: "#bbb" }}>+{p.skills.length - 6} more</span>}
              </div>
            )}
            {p.bio && <div className="cc-bio">{p.bio}</div>}
          </div>

          <div className="cc-right">
            <button
              className={`cc-toggle ${isOpen ? "open" : ""}`}
              onClick={() => setExpanded(isOpen ? null : c.caseId)}
            >
              {isOpen ? "▲ Hide" : "▼ View Profile"}
            </button>
            <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600 }}>
              {resumes.length} resume{resumes.length !== 1 ? "s" : ""}
            </span>
            {isSl && <span className="cc-shortlisted-tag">⭐ In Shortlist</span>}
          </div>
        </div>

        {/* EXPANDED */}
        {isOpen && (
          <div className="cc-expand">
            {/* PROFILE SIDEBAR */}
            <div className="cc-prof">
              <div className="contact-banner">
                <div className="contact-banner-title">🔒 Unlock via Tervies</div>
                <div className="contact-line"><span className="contact-ico">💬</span><span className="contact-txt">WhatsApp Us</span></div>
                <div className="contact-line"><span className="contact-ico">✉️</span><span className="contact-txt">{OUR_EMAIL}</span></div>
                <div className="contact-line"><span className="contact-ico">📞</span><span className="contact-txt">{OUR_PHONE}</span></div>
                <div className="contact-note">Mention this candidate's name. We respond within 24 hrs.</div>
              </div>

              {p.desiredRole && <div className="cp-block"><div className="cp-label">Desired Role</div><div className="cp-val">{p.desiredRole}</div></div>}
              {p.experience  && <div className="cp-block"><div className="cp-label">Experience</div><div className="cp-val">{p.experience}</div></div>}
              {p.industry    && <div className="cp-block"><div className="cp-label">Industry</div><div className="cp-val">{p.industry}</div></div>}
              {p.city        && <div className="cp-block"><div className="cp-label">Location</div><div className="cp-val">{p.city}</div></div>}
              {(p.degree || p.college) && (
                <div className="cp-block">
                  <div className="cp-label">Education</div>
                  {p.degree  && <div className="cp-val">{p.degree}</div>}
                  {p.college && <div className="cp-val-sm">{p.college}</div>}
                </div>
              )}
              {p.skills?.length > 0 && (
                <div className="cp-block">
                  <div className="cp-label">Skills</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                    {p.skills.map(s => <span key={s} className="cc-skill" style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                </div>
              )}
              {p.bio && <div className="cp-block"><div className="cp-label">Summary</div><div className="cp-val-sm" style={{ fontStyle: "italic" }}>{p.bio}</div></div>}
            </div>

            {/* RESUME PANEL */}
            <div className="cc-resumes">
              <div className="res-hd">
                <span>📄 Submitted Resumes</span>
                <span className="res-hd-count">{resumes.length} file{resumes.length !== 1 ? "s" : ""}</span>
              </div>

              {resumes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 20px", color: "#ccc" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No resume uploaded yet.</div>
                </div>
              ) : (
                <>
                  {resumes.map((res, ri) => {
                    const isSel = shortlisted[c.caseId] === res.key;
                    // Every resume is locked — must contact us
                    return (
                      <div key={ri} style={{ position: "relative", marginBottom: 8 }}>
                        {/* BLURRED BACKGROUND (fake resume row) */}
                        <div className="res-locked">
                          <div className="res-locked-blur" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className="res-file-icon">📕</div>
                            <div>
                              <div className="res-name">{"●".repeat(28)}</div>
                              <div className="res-meta">{"●".repeat(16)} · {"●".repeat(10)}</div>
                            </div>
                            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                              <div style={{ width: 80, height: 30, background: "#e0e0e0", borderRadius: 7 }} />
                              <div style={{ width: 80, height: 30, background: "#e0e0e0", borderRadius: 7 }} />
                            </div>
                          </div>
                          <div className="res-locked-overlay">
                            <div className="res-locked-icon">🔐</div>
                            <div className="res-locked-text">Resume Locked{ri === 0 ? " — Latest Upload" : ""}</div>
                            <button className="res-locked-cta" onClick={() => setContactFor({ name: c.name, profile: p })}>
                              Contact Us to Unlock
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* UNLOCK PROMPT */}
                  <div className="unlock-prompt">
                    <div className="unlock-prompt-icon">🔓</div>
                    <div className="unlock-prompt-title">Want to view this candidate's resume?</div>
                    <div className="unlock-prompt-sub">
                      Our team will share the full resume and contact details within 24 hours. Reach out via WhatsApp for the fastest response.
                    </div>
                    <div className="unlock-btns">
                      <a className="btn-unlock-wa" href={`https://wa.me/919876543210?text=Hi Tervies, I want to access the resume of: ${c.name}. Please help.`} target="_blank" rel="noreferrer">
                        💬 WhatsApp
                      </a>
                      <a className="btn-unlock-email" href={`mailto:${OUR_EMAIL}?subject=Resume Request — ${c.name}&body=Hi Tervies,%0A%0AI'd like to access the resume of: ${c.name} (${p.desiredRole || "Candidate"}).%0A%0AThank you.`}>
                        ✉️ Email Us
                      </a>
                      <button className="btn-unlock-tel" onClick={() => setContactFor({ name: c.name, profile: p })}>
                        📋 View Contact Info
                      </button>
                    </div>
                  </div>

                  {/* SHORTLIST (can still shortlist without resume) */}
                  <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      className={`btn-sl ${isSl ? "done" : ""}`}
                      disabled={saving[c.caseId]}
                      onClick={() => doShortlist(c.caseId, resumes[0]?.key)}
                    >
                      {saving[c.caseId] ? "Saving…" : isSl ? "⭐ Shortlisted" : "+ Add to Shortlist"}
                    </button>
                    <button className="btn-contact-sm" onClick={() => setContactFor({ name: c.name, profile: p })}>
                      📞 Contact Us
                    </button>
                  </div>

                  {isSl && (
                    <div className="after-sl">
                      <span>✓</span>
                      <span><strong>Added to shortlist.</strong> Email us at <strong>{OUR_EMAIL}</strong> to proceed with this candidate.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── BROWSE PAGE ── */
  const BrowsePage = () => (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-title">Search Verified Candidates</div>
          <div className="hero-sub">All profiles are pre-screened. Resumes available on request.</div>
          <div className="hero-chips">
            <span className="hero-chip orange">🔒 Resumes on Request</span>
            <span className="hero-chip blue">✅ BGV Pre-Verified</span>
            <span className="hero-chip green">⚡ 24hr Turnaround</span>
          </div>
        </div>
        <div className="hero-right">
          {[
            { val: cases.length, label: "Candidates" },
            { val: verified, label: "BGV Verified" },
            { val: slCount, label: "Shortlisted" },
          ].map(s => (
            <div key={s.label} className="hero-stat">
              <div className="hero-stat-val">{s.val}</div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div className="filter-row">
        <span className="filter-label">Filter:</span>
        {["all", "verified", "submitted", "under_review"].map(s => (
          <button key={s} className={`f-chip ${filterStatus === s ? "on" : ""}`} onClick={() => setFilterStatus(s)}>
            {s === "all" ? "All Status" : s === "under_review" ? "In Review" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        {allRoles.length > 0 && (
          <select className="f-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#bbb", fontWeight: 600 }}>
          {filtered.length} of {cases.length} candidates
        </span>
      </div>

      {/* LIST */}
      {busy ? (
        <div className="loading"><div className="spin" /><p>Loading candidates…</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{search ? "🔍" : "👥"}</div>
          <div className="empty-title">{search ? "No results found" : "No candidates yet"}</div>
          <div className="empty-desc">{search ? "Try different keywords or clear the filters." : "Candidates will appear here once they join the platform."}</div>
        </div>
      ) : (
        <div className="cand-list">
          {filtered.map(c => <CandCard key={c.caseId} c={c} />)}
        </div>
      )}
    </>
  );

  /* ── SHORTLIST PAGE ── */
  const ShortlistPage = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>My Shortlist</div>
        {slCount > 0 && <span style={{ background: "#d4380d", color: "#fff", fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>{slCount}</span>}
      </div>

      {slCount === 0 ? (
        <div className="empty">
          <div className="empty-icon">⭐</div>
          <div className="empty-title">No shortlisted candidates</div>
          <div className="empty-desc">Browse candidates and click "+ Add to Shortlist" to save them here.</div>
        </div>
      ) : (
        <>
          <div style={{ padding: "13px 16px", background: "#fff8f5", border: "1.5px solid #ffbb96", borderRadius: 10, fontSize: 13, color: "#7a3000", marginBottom: 14, fontWeight: 600 }}>
            💡 You've shortlisted <strong>{slCount}</strong> candidate{slCount !== 1 ? "s" : ""}. Email <strong>{OUR_EMAIL}</strong> or WhatsApp us — we'll share their resumes and coordinate interviews within 24 hours.
          </div>
          {slCases.map(c => {
            const p  = c.candidateSummary || {};
            const sb = statusBadge(c.status);
            return (
              <div key={c.caseId} className="sl-card">
                <div className="cc-av" style={{ width: 46, height: 46, fontSize: 17, background: avBg(c.name), borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Libre Baskerville',serif", fontWeight: 700, color: "#fff" }}>{initials(c.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", fontFamily: "'Libre Baskerville',serif" }}>{c.name}</span>
                    <span className={`cc-status-badge ${sb.cls}`}>{sb.label}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#d4380d", fontWeight: 700 }}>{p.desiredRole || "—"}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{p.experience}{p.city ? ` · 📍 ${p.city}` : ""}{p.industry ? ` · ${p.industry}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                  <button className="btn-contact-sm" onClick={() => setContactFor({ name: c.name, profile: p })}>Unlock Resume →</button>
                  <button className="btn-sl done" style={{ fontSize: 12 }} disabled={saving[c.caseId]} onClick={() => doShortlist(c.caseId, shortlisted[c.caseId])}>Remove</button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );

  /* ── CONTACT PAGE ── */
  const ContactPage = () => (
    <>
      <div className="contact-page-hero">
        <div className="contact-page-hero-title">🤝 Our Talent Team is Here</div>
        <div className="contact-page-hero-sub">We unlock resumes, coordinate interviews, and handle introductions — all within 24 hours.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={`https://wa.me/919876543210`} target="_blank" rel="noreferrer" style={{ padding: "9px 20px", borderRadius: 8, background: "#25d366", color: "#fff", border: "none", fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer", textDecoration: "none" }}>💬 WhatsApp Now</a>
          <a href={`mailto:${OUR_EMAIL}`} style={{ padding: "9px 20px", borderRadius: 8, background: "rgba(255,255,255,.15)", color: "#fff", border: "1.5px solid rgba(255,255,255,.3)", fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer", textDecoration: "none" }}>✉️ Send Email</a>
        </div>
      </div>

      <div className="contact-cards">
        {[
          { icon: "💬", label: "WhatsApp", val: OUR_PHONE, desc: "Fastest response. Message us anytime — we reply within 1 hour during business hours.", href: OUR_WA },
          { icon: "✉️", label: "Email", val: OUR_EMAIL, desc: "Send us candidate names and your requirements. We'll respond within 24 hours.", href: `mailto:${OUR_EMAIL}` },
          { icon: "📞", label: "Phone", val: OUR_PHONE, desc: "Call us Monday to Saturday, 9am–7pm IST. We're always available for urgent requests.", href: `tel:${OUR_PHONE.replace(/[^+\d]/g, "")}` },
        ].map(c => (
          <a key={c.label} className="ccontact-card" href={c.href} target="_blank" rel="noreferrer">
            <div className="ccontact-card-icon">{c.icon}</div>
            <div className="ccontact-card-label">{c.label}</div>
            <div className="ccontact-card-val">{c.val}</div>
            <div className="ccontact-card-desc">{c.desc}</div>
          </a>
        ))}
      </div>

      <div className="how-steps">
        <div className="how-steps-title">How to Access a Candidate's Resume</div>
        {[
          ["Browse & Shortlist", "Find candidates that match your requirements. Click "+ "Add to Shortlist to save them."],
          ["Contact Our Team", `WhatsApp or email us at ${OUR_EMAIL} with the candidate name and your company.`],
          ["We Share the Resume", "Our team sends you the full resume and coordinates your preferred interview time."],
          ["Interview & Hire", "Conduct your interview. We assist with documentation and final BGV report handover."],
        ].map(([t, d], i) => (
          <div key={t} className="step-row">
            <div className="step-num">{i + 1}</div>
            <div><div className="step-title">{t}</div><div className="step-desc">{d}</div></div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      <style>{S}</style>

      {/* TOP BAR */}
      <div className="tb">
        <div className="tb-left">
          <div className="tb-logo">
            <div className="tb-logo-icon">T</div>
            <div className="tb-logo-name">Tervies</div>
            <div className="tb-logo-tag">Hire</div>
          </div>
          <div className="tb-search">
            <span className="tb-search-icon">🔍</span>
            <input
              className="tb-search-inp"
              placeholder="Search by skill, role, city, name…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage("browse"); }}
            />
            <button className="tb-search-btn">Search</button>
          </div>
        </div>
        <div className="tb-right">
          <div className="tb-av" style={{ background: avBg(session.companyName || session.contactName) }}>
            {initials(session.companyName || session.contactName)}
          </div>
          <div className="tb-company">{session.companyName || session.contactName}</div>
          <button className="tb-logout" onClick={onLogout}>Log Out</button>
        </div>
      </div>

      <div className="layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          {NAV.map(n => (
            <button key={n.id} className={`sb-item ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)}>
              <span className="sb-icon">{n.icon}</span>
              {n.label}
              {n.badge && <span className="sb-badge">{n.badge}</span>}
            </button>
          ))}

          <div className="sb-divider" />
          <div style={{ padding: "4px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#ccc", padding: "4px 18px 6px" }}>Live Stats</div>
            {[
              { label: "Total Candidates", val: cases.length },
              { label: "BGV Verified", val: verified },
              { label: "My Shortlist", val: slCount },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 18px", fontSize: 12, color: "#888", fontWeight: 600 }}>
                <span>{s.label}</span>
                <span style={{ fontWeight: 800, color: "#d4380d" }}>{s.val}</span>
              </div>
            ))}
          </div>

          <div className="sb-bottom">
            <div className="sb-acct">
              <div className="sb-acct-name">{session.companyName || session.contactName}</div>
              <div className="sb-acct-email">{session.email}</div>
              <div className="sb-acct-stat">Shortlisted: <span>{slCount}</span> · Total: <span>{cases.length}</span></div>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          {page === "browse"    && <BrowsePage />}
          {page === "shortlist" && <ShortlistPage />}
          {page === "contact"   && <ContactPage />}
        </div>
      </div>

      {contactFor && <ContactModal cand={contactFor} onClose={() => setContactFor(null)} />}
      <ToastBox list={toasts} remove={rmToast} />
    </>
  );
}

/* ─── ROOT ─────────────────────────────────────────────── */
export default function ClientPortal() {
  const [session, setSession] = useState(getSession);
  const login   = s => { saveSession(s); setSession(s); };
  const logout  = () => { clearSession(); setSession(null); };
  if (!session) return <AuthView onLogin={login} />;
  return <Dashboard session={session} onLogout={logout} />;
}