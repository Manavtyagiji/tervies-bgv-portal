import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BASE = "https://tervies.info";

const CHECK_META = {
  "Employment Check":               { icon: "💼", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  "Residential Address Check":      { icon: "🏠", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  "Educational Qualification Check":{ icon: "🎓", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  "Identity Check (PAN Card)":      { icon: "🪪", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  "Identity Check (Aadhar Card)":   { icon: "🪪", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  "Criminal Police Record Check":   { icon: "🚔", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  "Criminal Database Check":        { icon: "🗄️", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  "Professional Reference Check":   { icon: "👔", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
};

const STATUS_OPTIONS = [
  { value: "Pending",      label: "Pending",      color: "#6b7280", bg: "#f3f4f6" },
  { value: "In Progress",  label: "In Progress",  color: "#d97706", bg: "#fffbeb" },
  { value: "Completed",    label: "Completed",    color: "#059669", bg: "#ecfdf5" },
  { value: "Discrepancy",  label: "Discrepancy",  color: "#dc2626", bg: "#fef2f2" },
  { value: "Insufficient", label: "Insufficient", color: "#7c3aed", bg: "#f5f3ff" },
];

const STATUS_COLOR = {
  "Pending":      { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
  "In Progress":  { bg: "#fffbeb", color: "#b45309", dot: "#f59e0b" },
  "Completed":    { bg: "#ecfdf5", color: "#166534", dot: "#22c55e" },
  "Discrepancy":  { bg: "#fef2f2", color: "#991b1b", dot: "#ef4444" },
  "Insufficient": { bg: "#f5f3ff", color: "#5b21b6", dot: "#8b5cf6" },
};

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }

  .ed-root { min-height: 100vh; background: #f0f2f7; font-family: 'Plus Jakarta Sans', sans-serif; }

  .ed-topbar {
    background: white; border-bottom: 1px solid #e5e7eb;
    padding: 0 32px; height: 60px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 6px rgba(0,0,0,0.05);
  }
  .ed-topbar-left { display: flex; align-items: center; gap: 16px; }
  .ed-logo { font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
  .ed-logo span { color: #4f46e5; }
  .ed-divider-v { width: 1px; height: 22px; background: #e5e7eb; }
  .ed-emp-pill {
    display: flex; align-items: center; gap: 8px;
    background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 999px;
    padding: 4px 14px 4px 5px;
  }
  .ed-emp-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: white;
  }
  .ed-emp-name { font-size: 13px; font-weight: 600; color: #374151; }
  .ed-topbar-right { display: flex; align-items: center; gap: 10px; }
  .ed-logout-btn {
    background: none; border: 1px solid #e5e7eb; border-radius: 8px;
    padding: 6px 14px; font-size: 13px; font-weight: 600; color: #6b7280;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .ed-logout-btn:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

  .ed-layout { display: flex; height: calc(100vh - 60px); }

  .ed-sidebar {
    width: 256px; flex-shrink: 0; background: white;
    border-right: 1px solid #e5e7eb; overflow-y: auto; padding: 14px 10px;
    display: flex; flex-direction: column; gap: 3px;
  }
  .ed-sidebar::-webkit-scrollbar { width: 0; }
  .ed-sidebar-section {
    font-size: 10px; font-weight: 700; color: #9ca3af;
    text-transform: uppercase; letter-spacing: 0.1em;
    padding: 10px 10px 4px; font-family: 'JetBrains Mono', monospace;
  }
  .ed-my-checks {
    background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px;
    padding: 10px; margin-bottom: 4px;
  }
  .ed-my-checks-title {
    font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase;
    letter-spacing: 0.08em; margin-bottom: 7px; font-family: 'JetBrains Mono', monospace;
  }
  .ed-my-check-tag {
    display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;
    padding: 5px 8px; border-radius: 8px; background: white;
    border: 1px solid #e5e7eb; margin-bottom: 3px;
  }
  .ed-nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 10px; font-size: 13px; font-weight: 600; color: #6b7280;
    cursor: pointer; transition: all 0.15s; border: 1px solid transparent;
  }
  .ed-nav-item:hover { background: #f8fafc; color: #111827; border-color: #e5e7eb; }
  .ed-nav-item.active { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }
  .ed-nav-item-icon { font-size: 15px; width: 20px; text-align: center; }
  .ed-nav-item-count {
    margin-left: auto; background: #e0e7ff; color: #4338ca;
    font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
  }
  .ed-sidebar-case {
    padding: 10px 12px; border-radius: 10px; cursor: pointer;
    transition: all 0.15s; border: 1px solid transparent; margin-bottom: 2px;
  }
  .ed-sidebar-case:hover { background: #f8fafc; border-color: #e5e7eb; }
  .ed-sidebar-case.active { background: #eef2ff; border-color: #c7d2fe; }
  .ed-sc-id { font-size: 12px; font-weight: 700; color: #1e1b4b; font-family: 'JetBrains Mono', monospace; }
  .ed-sc-name { font-size: 11px; color: #6b7280; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ed-sc-dots { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
  .ed-sc-dot-tag { font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 999px; display: inline-flex; align-items: center; gap: 3px; }
  .ed-sc-dot { width: 5px; height: 5px; border-radius: 50%; }

  .ed-main { flex: 1; overflow-y: auto; padding: 28px; }
  .ed-main::-webkit-scrollbar { width: 5px; }
  .ed-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

  .ed-page-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.5px; }
  .ed-page-sub   { font-size: 13px; color: #64748b; margin: 0 0 24px; }

  .ed-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
  .ed-stat-card {
    background: white; border-radius: 16px; padding: 20px 22px;
    border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  }
  .ed-stat-num   { font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: -1px; font-family: 'JetBrains Mono', monospace; }
  .ed-stat-label { font-size: 11px; color: #9ca3af; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .ed-stat-bar   { height: 3px; border-radius: 999px; margin-top: 14px; }

  .ed-cases-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .ed-cases-title  { font-size: 16px; font-weight: 700; color: #0f172a; }

  .ed-empty-state { text-align: center; padding: 64px 32px; color: #9ca3af; }
  .ed-empty-icon  { font-size: 48px; margin-bottom: 14px; }
  .ed-empty-title { font-size: 18px; font-weight: 700; color: #374151; margin-bottom: 6px; }
  .ed-empty-sub   { font-size: 14px; }

  /* Excel Table */
  .ed-excel-wrap {
    background: white; border-radius: 16px;
    border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    overflow: hidden;
  }
  .ed-excel-header {
    display: grid;
    grid-template-columns: 50px 130px 180px 110px 1fr 160px 180px;
    background: linear-gradient(135deg, #1e1b4b, #312e81);
    border-bottom: 2px solid #1e1b4b;
  }
  .ed-excel-header-cell {
    padding: 12px 14px;
    font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.85);
    text-transform: uppercase; letter-spacing: 0.08em;
    border-right: 1px solid rgba(255,255,255,0.1);
    font-family: 'JetBrains Mono', monospace;
  }
  .ed-excel-header-cell:last-child { border-right: none; }

  .ed-excel-row {
    display: grid;
    grid-template-columns: 50px 130px 180px 110px 1fr 160px 180px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.12s;
    cursor: default;
  }
  .ed-excel-row:last-child { border-bottom: none; }
  .ed-excel-row:hover { background: #eff6ff !important; }
  .ed-excel-row.even { background: #ffffff; }
  .ed-excel-row.odd  { background: #fafbff; }

  .ed-excel-cell {
    padding: 13px 14px;
    font-size: 13px; color: #374151;
    border-right: 1px solid #f1f5f9;
    display: flex; align-items: center;
    overflow: hidden;
  }
  .ed-excel-cell:last-child { border-right: none; }

  .ed-excel-footer {
    padding: 10px 16px;
    background: #f8fafc; border-top: 2px solid #e5e7eb;
    font-size: 12px; color: #6b7280; font-weight: 600;
    display: flex; justify-content: space-between; align-items: center;
  }

  /* Detail */
  .ed-detail-back {
    display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: #6b7280;
    cursor: pointer; padding: 7px 14px; border-radius: 10px; background: white;
    border: 1px solid #e5e7eb; margin-bottom: 20px; transition: all 0.15s;
  }
  .ed-detail-back:hover { background: #f8fafc; color: #4f46e5; border-color: #c7d2fe; }

  .ed-detail-header {
    background: white; border-radius: 20px; padding: 24px 28px;
    border: 1px solid #e5e7eb; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .ed-detail-title    { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.5px; }
  .ed-detail-subtitle { font-size: 14px; color: #6b7280; }
  .ed-detail-meta     { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
  .ed-meta-item  { background: #f8fafc; border-radius: 12px; padding: 12px 14px; border: 1px solid #f1f5f9; }
  .ed-meta-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; font-family: 'JetBrains Mono', monospace; }
  .ed-meta-value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px; }

  .ed-gen-report-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, #4f46e5, #6366f1); color: white;
    border: none; border-radius: 12px; padding: 11px 22px;
    font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
    box-shadow: 0 4px 14px rgba(79,70,229,0.3); transition: all 0.15s; margin-top: 18px;
  }
  .ed-gen-report-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(79,70,229,0.4); }

  .ed-check-card {
    background: white; border-radius: 18px; border: 1px solid #e5e7eb;
    margin-bottom: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.04); transition: box-shadow 0.15s;
  }
  .ed-check-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .ed-check-header { display: flex; align-items: center; gap: 14px; padding: 18px 22px; cursor: pointer; }
  .ed-check-icon-wrap {
    width: 42px; height: 42px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; flex-shrink: 0;
  }
  .ed-check-name   { font-size: 15px; font-weight: 700; color: #0f172a; }
  .ed-check-status-badge { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; margin-left: auto; }
  .ed-check-chevron { font-size: 16px; color: #9ca3af; transition: transform 0.2s; flex-shrink: 0; }
  .ed-check-chevron.open { transform: rotate(180deg); }
  .ed-check-body { padding: 0 22px 22px; border-top: 1px solid #f8fafc; }
  .ed-check-body-inner { padding-top: 18px; }

  .ed-field-label {
    font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase;
    letter-spacing: 0.07em; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace;
  }
  .ed-status-row { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 16px; }
  .ed-status-btn {
    padding: 7px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
    border: 2px solid transparent; cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .ed-status-btn.selected { border-color: currentColor; }

  .ed-notes-input {
    width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; padding: 11px 14px;
    font-size: 14px; color: #0f172a; resize: vertical; min-height: 78px;
    font-family: inherit; outline: none; transition: border-color 0.15s; background: #fafafa;
  }
  .ed-notes-input:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

  .ed-upload-zone {
    border: 2px dashed #e5e7eb; border-radius: 12px; padding: 18px;
    text-align: center; cursor: pointer; transition: all 0.15s; margin: 12px 0; background: #fafafa;
  }
  .ed-upload-zone:hover { border-color: #6366f1; background: #eef2ff; }
  .ed-upload-icon { font-size: 24px; margin-bottom: 5px; }
  .ed-upload-text { font-size: 13px; color: #6b7280; font-weight: 600; }
  .ed-upload-sub  { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .ed-file-hidden { display: none; }

  .ed-doc-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
  .ed-doc-item {
    display: flex; align-items: center; gap: 10px;
    background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 9px 12px;
  }
  .ed-doc-name { font-size: 13px; font-weight: 500; color: #374151; flex: 1; }
  .ed-doc-date { font-size: 11px; color: #9ca3af; font-family: 'JetBrains Mono', monospace; }
  .ed-doc-link { font-size: 12px; color: #4f46e5; font-weight: 700; text-decoration: none; }
  .ed-doc-link:hover { text-decoration: underline; }
  .ed-uploading { font-size: 13px; color: #4f46e5; font-weight: 600; padding: 8px 0; }

  .ed-save-btn {
    background: linear-gradient(135deg, #4f46e5, #6366f1); color: white;
    border: none; border-radius: 11px; padding: 10px 22px;
    font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit;
    box-shadow: 0 4px 14px rgba(79,70,229,0.25);
  }
  .ed-save-btn:hover { transform: translateY(-1px); }
  .ed-save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .ed-saved-msg { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #059669; margin-left: 12px; }

  @media (max-width: 768px) {
    .ed-layout { flex-direction: column; }
    .ed-sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid #e5e7eb; }
    .ed-detail-meta { grid-template-columns: 1fr 1fr; }
    .ed-stats { grid-template-columns: 1fr; }
    .ed-excel-wrap { overflow-x: auto; }
    .ed-excel-header, .ed-excel-row { min-width: 900px; }
  }
`;

if (typeof document !== "undefined" && !document.getElementById("ed-style")) {
  const s = document.createElement("style");
  s.id = "ed-style";
  s.textContent = STYLE;
  document.head.appendChild(s);
}

function buildGenReportPrefill(c) {
  const checks   = c.checks || [];
  const statuses = c.checkStatuses || {};
  const notes    = c.checkNotes    || {};

  const prefilled = {
    name:           c.name         || "",
    caseId:         c.caseId       || "",
    gender:         c.gender       || "",
    dob:            c.dob          || "",
    clientName:     c.clientName   || "",
    clientCaseId:   c.clientCaseId || "",
    color:          "Green",
    allocationDate: c.receivedDate
      ? new Date(c.receivedDate).toLocaleDateString("en-IN") : "",
    deliveryDate:   "",
    assignedCompany: c.clientName  || "",
    level:          "STANDARD",
    checks,
    _autoFields: ["name","caseId","gender","dob","clientName","clientCaseId","allocationDate","assignedCompany"],
  };

  if (checks.includes("Criminal Police Record Check")) {
    prefilled.criminalFinalRemarks      = notes["Criminal Police Record Check"] || "";
    prefilled.criminalAdditionalRemarks = statuses["Criminal Police Record Check"]?.status
      ? `Status: ${statuses["Criminal Police Record Check"].status} — by ${statuses["Criminal Police Record Check"].updatedBy || ""}`
      : "";
  }
  if (checks.includes("Identity Check (Aadhar Card)")) {
    prefilled.aadharCandidateName = c.name || "";
    prefilled.aadharDob           = c.dob  || "";
    prefilled.aadharFinalRemarks  = notes["Identity Check (Aadhar Card)"] || "";
  }
  if (checks.includes("Identity Check (PAN Card)")) {
    prefilled.panCandidateName = c.name || "";
    prefilled.panDob           = c.dob  || "";
    prefilled.panFinalRemarks  = notes["Identity Check (PAN Card)"] || "";
  }
  if (checks.includes("Employment Check")) {
    prefilled.respondentName  = c.company       || "";
    prefilled.designation     = c.designation   || "";
    prefilled.employmentDates = c.duration      || "";
    prefilled.reasonLeaving   = c.reasonLeaving || "";
    prefilled.comments        = notes["Employment Check"] || "";
  }
  if (checks.includes("Residential Address Check")) {
    prefilled.residentialCandidateName       = c.name           || "";
    prefilled.residentialDob                 = c.dob            || "";
    prefilled.residentialConfirmationAddress = c.presentAddress || "";
    prefilled.residentialSpecialComments     = notes["Residential Address Check"] || "";
  }
  if (checks.includes("Educational Qualification Check")) {
    prefilled.eduInstituteName         = c.institution || "";
    prefilled.eduUniversityName        = c.university  || "";
    prefilled.eduYearOfPassing         = c.year        || "";
    prefilled.eduQualificationObtained = c.degree      || "";
    prefilled.eduFinalRemarks          = notes["Educational Qualification Check"] || "";
  }

  return prefilled;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const empName  = localStorage.getItem("employeeName")  || "Employee";
  const empToken = localStorage.getItem("employeeToken");
  const myChecks = JSON.parse(localStorage.getItem("employeeChecks") || "[]");

  const [view,          setView]          = useState("dashboard");
  const [cases,         setCases]         = useState([]);
  const [selectedCase,  setSelectedCase]  = useState(null);
  const [expandedCheck, setExpandedCheck] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [checkState,    setCheckState]    = useState({});
  const [hoveredRow,    setHoveredRow]    = useState(null);

  const initials = empName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const fetchCases = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE}/api/employee/cases`, { headers: { Authorization: `Bearer ${empToken}` } });
      const data = await res.json();
      if (data.success) setCases(data.cases);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [empToken]);

  useEffect(() => {
    if (!empToken) navigate("/employee/login");
    else fetchCases();
  }, []);

  const openCase = async (c) => {
    setSelectedCase(c);
    setExpandedCheck(null);
    setView("detail");

    const initial = {};
    (c.checks || []).forEach(checkName => {
      const st    = c.checkStatuses?.[checkName];
      const notes = c.checkNotes?.[checkName] || "";
      initial[checkName] = { status: st?.status || "Pending", notes, saving: false, saved: false, uploading: false, signedUrls: {} };
    });
    setCheckState(initial);

    for (const checkName of (c.checks || [])) {
      const docs = c.checkDocuments?.[checkName] || [];
      const keys = docs.map(d => d.key).filter(Boolean);
      if (!keys.length) continue;
      try {
        const res  = await fetch(`${BASE}/api/employee/get-signed-urls`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${empToken}` },
          body: JSON.stringify({ keys }),
        });
        const data = await res.json();
        if (data.success) {
          const map = {};
          data.urls.forEach(({ key, url }) => { if (url) map[key] = url; });
          setCheckState(prev => ({ ...prev, [checkName]: { ...prev[checkName], signedUrls: map } }));
        }
      } catch {}
    }
  };

  const updateField = (checkName, field, value) =>
    setCheckState(prev => ({ ...prev, [checkName]: { ...prev[checkName], [field]: value, saved: false } }));

  const saveCheck = async (checkName) => {
    updateField(checkName, "saving", true);
    try {
      const { status, notes } = checkState[checkName];
      const res  = await fetch(`${BASE}/api/employee/update-check`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${empToken}` },
        body: JSON.stringify({ caseId: selectedCase.caseId, checkName, status, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setCheckState(prev => ({ ...prev, [checkName]: { ...prev[checkName], saving: false, saved: true } }));
        setTimeout(() => updateField(checkName, "saved", false), 3000);
        setCases(prev => prev.map(c =>
          c.caseId !== selectedCase.caseId ? c :
          { ...c, checkStatuses: { ...c.checkStatuses, [checkName]: { status } } }
        ));
        setSelectedCase(prev => ({
          ...prev,
          checkStatuses: { ...prev.checkStatuses, [checkName]: { status, updatedBy: empName } },
          checkNotes:    { ...prev.checkNotes,    [checkName]: notes },
        }));
      }
    } catch { updateField(checkName, "saving", false); }
  };

  const handleUpload = async (checkName, file) => {
    if (!file) return;
    updateField(checkName, "uploading", true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("checkName", checkName);
      const res  = await fetch(`${BASE}/api/employee/upload-check-doc/${selectedCase.caseId}`, {
        method: "POST", headers: { Authorization: `Bearer ${empToken}` }, body: fd,
      });
      const data = await res.json();
      if (data.success) {
        const caseRes  = await fetch(`${BASE}/api/employee/case/${selectedCase.caseId}`, {
          headers: { Authorization: `Bearer ${empToken}` },
        });
        const caseData = await caseRes.json();
        if (caseData.success) {
          setSelectedCase(caseData.case);
          const docs = caseData.case.checkDocuments?.[checkName] || [];
          const keys = docs.map(d => d.key).filter(Boolean);
          if (keys.length) {
            const urlRes  = await fetch(`${BASE}/api/employee/get-signed-urls`, {
              method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${empToken}` },
              body: JSON.stringify({ keys }),
            });
            const urlData = await urlRes.json();
            if (urlData.success) {
              const map = {};
              urlData.urls.forEach(({ key, url }) => { if (url) map[key] = url; });
              setCheckState(prev => ({
                ...prev,
                [checkName]: { ...prev[checkName], signedUrls: { ...prev[checkName]?.signedUrls, ...map } },
              }));
            }
          }
        }
      }
    } catch (e) { console.error(e); }
    finally { updateField(checkName, "uploading", false); }
  };

  const goGenReport = (caseData) => {
    const prefilled = buildGenReportPrefill(caseData);
    localStorage.setItem("lastPrefilledReportCase",    JSON.stringify(prefilled));
    localStorage.setItem("latestGenerateReportCaseId", caseData.caseId);
    navigate("/admin/generate-report", { state: { prefilled } });
  };

  const handleLogout = () => {
    ["employeeToken","employeeId","employeeName","employeeChecks"].forEach(k => localStorage.removeItem(k));
    navigate("/employee/login");
  };

  const totalCases      = cases.length;
  const completedCases  = cases.filter(c => { const v = Object.values(c.checkStatuses || {}); return v.length > 0 && v.every(s => s.status === "Completed"); }).length;
  const inProgressCases = cases.filter(c => Object.values(c.checkStatuses || {}).some(s => s.status === "In Progress")).length;

  const caseOverallStatus = (c) => {
    const vals = Object.values(c.checkStatuses || {}).map(s => s.status);
    if (!vals.length || vals.every(v => !v || v === "Pending")) return "Pending";
    if (vals.some(v => v === "Discrepancy"))  return "Discrepancy";
    if (vals.some(v => v === "Insufficient")) return "Insufficient";
    if (vals.every(v => v === "Completed"))   return "Completed";
    return "In Progress";
  };

  return (
    <div className="ed-root">

      {/* Topbar */}
      <div className="ed-topbar">
        <div className="ed-topbar-left">
          <div className="ed-logo">Ter<span>vies</span></div>
          <div className="ed-divider-v" />
          <div className="ed-emp-pill">
            <div className="ed-emp-avatar">{initials}</div>
            <span className="ed-emp-name">{empName}</span>
          </div>
        </div>
        <div className="ed-topbar-right">
          <button className="ed-logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div className="ed-layout">

        {/* Sidebar */}
        <div className="ed-sidebar">
          <div className="ed-my-checks">
            <div className="ed-my-checks-title">My Checks</div>
            {myChecks.map(ch => {
              const meta = CHECK_META[ch] || { icon: "✓", color: "#6366f1" };
              return (
                <div key={ch} className="ed-my-check-tag">
                  <span>{meta.icon}</span>
                  <span style={{ color: meta.color, fontSize: 11 }}>{ch}</span>
                </div>
              );
            })}
          </div>

          <div
            className={`ed-nav-item${view === "dashboard" ? " active" : ""}`}
            onClick={() => { setView("dashboard"); setSelectedCase(null); }}
          >
            <span className="ed-nav-item-icon">🏠</span>
            Dashboard
            <span className="ed-nav-item-count">{totalCases}</span>
          </div>

          <div className="ed-sidebar-section">Cases</div>

          {loading ? (
            <div style={{ padding: "10px 10px", fontSize: 12, color: "#9ca3af" }}>Loading…</div>
          ) : cases.length === 0 ? (
            <div style={{ padding: "10px 10px", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>No cases yet</div>
          ) : cases.map(c => {
            const os  = caseOverallStatus(c);
            const sc  = STATUS_COLOR[os] || STATUS_COLOR["Pending"];
            return (
              <div
                key={c.caseId}
                className={`ed-sidebar-case${selectedCase?.caseId === c.caseId ? " active" : ""}`}
                onClick={() => openCase(c)}
              >
                <div className="ed-sc-id">{c.caseId}</div>
                <div className="ed-sc-name">{c.name || "Unknown"}</div>
                <div className="ed-sc-dots">
                  {(c.checks || []).map(ch => {
                    const st   = c.checkStatuses?.[ch]?.status || "Pending";
                    const stc  = STATUS_COLOR[st] || STATUS_COLOR["Pending"];
                    const meta = CHECK_META[ch]  || { color: "#6366f1", bg: "#eef2ff" };
                    return (
                      <span key={ch} className="ed-sc-dot-tag" style={{ background: meta.bg, color: meta.color }}>
                        <span className="ed-sc-dot" style={{ background: stc.dot }} />
                        {st}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div className="ed-main">

          {/* ══ DASHBOARD — EXCEL TABLE ══ */}
          {view === "dashboard" && (
            <>
              <h1 className="ed-page-title">My Dashboard</h1>
              <p className="ed-page-sub">Your assigned cases and verification progress</p>

              {/* Stats */}
              <div className="ed-stats">
                <div className="ed-stat-card">
                  <div className="ed-stat-num">{totalCases}</div>
                  <div className="ed-stat-label">Total Cases</div>
                  <div className="ed-stat-bar" style={{ background: "#e0e7ff" }} />
                </div>
                <div className="ed-stat-card">
                  <div className="ed-stat-num" style={{ color: "#d97706" }}>{inProgressCases}</div>
                  <div className="ed-stat-label">In Progress</div>
                  <div className="ed-stat-bar" style={{ background: "#fde68a" }} />
                </div>
                <div className="ed-stat-card">
                  <div className="ed-stat-num" style={{ color: "#059669" }}>{completedCases}</div>
                  <div className="ed-stat-label">Completed</div>
                  <div className="ed-stat-bar" style={{ background: "#a7f3d0" }} />
                </div>
              </div>

              <div className="ed-cases-header">
                <span className="ed-cases-title">All Cases ({totalCases})</span>
              </div>

              {loading ? (
                <div className="ed-empty-state">
                  <div className="ed-empty-icon">⏳</div>
                  <div className="ed-empty-title">Loading cases…</div>
                </div>
              ) : cases.length === 0 ? (
                <div className="ed-empty-state">
                  <div className="ed-empty-icon">📭</div>
                  <div className="ed-empty-title">No cases assigned yet</div>
                  <div className="ed-empty-sub">Cases matching your check types will appear here</div>
                </div>
              ) : (
                <div className="ed-excel-wrap">

                  {/* Header Row */}
                  <div className="ed-excel-header">
                    <div className="ed-excel-header-cell">#</div>
                    <div className="ed-excel-header-cell">Case ID</div>
                    <div className="ed-excel-header-cell">Candidate</div>
                    <div className="ed-excel-header-cell">Client</div>
                    <div className="ed-excel-header-cell">Assigned Checks</div>
                    <div className="ed-excel-header-cell">Overall Status</div>
                    <div className="ed-excel-header-cell">Actions</div>
                  </div>

                  {/* Data Rows */}
                  {cases.map((c, rowIdx) => {
                    const os = caseOverallStatus(c);
                    const sc = STATUS_COLOR[os] || STATUS_COLOR["Pending"];
                    const isHovered = hoveredRow === rowIdx;

                    return (
                      <div
                        key={c.caseId}
                        className={`ed-excel-row ${rowIdx % 2 === 0 ? "even" : "odd"}`}
                        style={{ background: isHovered ? "#eff6ff" : rowIdx % 2 === 0 ? "#ffffff" : "#fafbff" }}
                        onMouseEnter={() => setHoveredRow(rowIdx)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* # */}
                        <div className="ed-excel-cell" style={{ justifyContent: "center" }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: "#9ca3af",
                            fontFamily: "JetBrains Mono, monospace",
                          }}>{rowIdx + 1}</span>
                        </div>

                        {/* Case ID */}
                        <div className="ed-excel-cell">
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: "#4f46e5",
                            fontFamily: "JetBrains Mono, monospace",
                            background: "#eef2ff", padding: "3px 8px",
                            borderRadius: 6, border: "1px solid #c7d2fe",
                            whiteSpace: "nowrap",
                          }}>{c.caseId}</span>
                        </div>

                        {/* Candidate */}
                        <div className="ed-excel-cell" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                            {c.name || "Unknown"}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {c.dob || "—"} · {c.gender || "—"}
                          </div>
                        </div>

                        {/* Client */}
                        <div className="ed-excel-cell">
                          <span style={{ fontSize: 12, color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>
                            {c.clientName || "—"}
                          </span>
                        </div>

                        {/* Assigned Checks */}
                        <div className="ed-excel-cell" style={{ flexWrap: "wrap", gap: 4, alignItems: "flex-start", paddingTop: 10, paddingBottom: 10 }}>
                          {(c.checks || []).map(ch => {
                            const meta = CHECK_META[ch] || { icon: "✓", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" };
                            const st   = c.checkStatuses?.[ch]?.status || "Pending";
                            const stc  = STATUS_COLOR[st] || STATUS_COLOR["Pending"];
                            return (
                              <span key={ch} style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                fontSize: 10, fontWeight: 700,
                                padding: "2px 7px", borderRadius: 999,
                                background: meta.bg, color: meta.color,
                                border: `1px solid ${meta.border}`,
                                whiteSpace: "nowrap",
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: stc.dot, flexShrink: 0 }} />
                                {meta.icon} {ch.split(" ").slice(0, 2).join(" ")}
                              </span>
                            );
                          })}
                        </div>

                        {/* Overall Status */}
                        <div className="ed-excel-cell">
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: sc.bg, color: sc.color,
                            fontSize: 12, fontWeight: 700,
                            padding: "5px 12px", borderRadius: 999,
                            whiteSpace: "nowrap",
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                            {os}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="ed-excel-cell" style={{ gap: 8 }}>
                          <button
                            onClick={() => openCase(c)}
                            style={{
                              background: "#f8fafc", border: "1px solid #e5e7eb",
                              borderRadius: 8, padding: "6px 11px",
                              fontSize: 11, fontWeight: 600, color: "#374151",
                              cursor: "pointer", fontFamily: "inherit",
                              whiteSpace: "nowrap", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.borderColor = "#c7d2fe"; e.currentTarget.style.color = "#4f46e5"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
                          >✏️ Update</button>
                          <button
                            onClick={() => goGenReport(c)}
                            style={{
                              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                              border: "none", borderRadius: 8, padding: "6px 11px",
                              fontSize: 11, fontWeight: 700, color: "white",
                              cursor: "pointer", fontFamily: "inherit",
                              boxShadow: "0 3px 10px rgba(79,70,229,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >📄 Report</button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer */}
                  <div className="ed-excel-footer">
                    <span>Showing {totalCases} case{totalCases !== 1 ? "s" : ""}</span>
                    <span style={{ display: "flex", gap: 16 }}>
                      <span style={{ color: "#059669" }}>✔ {completedCases} Completed</span>
                      <span style={{ color: "#d97706" }}>⏳ {inProgressCases} In Progress</span>
                      <span style={{ color: "#6b7280" }}>◯ {totalCases - completedCases - inProgressCases} Pending</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ DETAIL — unchanged ══ */}
          {view === "detail" && selectedCase && (
            <>
              <div className="ed-detail-back" onClick={() => { setView("dashboard"); setSelectedCase(null); }}>
                ← Back to Dashboard
              </div>

              <div className="ed-detail-header">
                <div className="ed-detail-title">{selectedCase.name || "Unknown Candidate"}</div>
                <div className="ed-detail-subtitle">Case ID: <strong>{selectedCase.caseId}</strong> · {selectedCase.clientName}</div>
                <div className="ed-detail-meta">
                  <div className="ed-meta-item">
                    <div className="ed-meta-label">Case Status</div>
                    <div className="ed-meta-value">{selectedCase.status || "—"}</div>
                  </div>
                  <div className="ed-meta-item">
                    <div className="ed-meta-label">Date of Birth</div>
                    <div className="ed-meta-value">{selectedCase.dob || "—"}</div>
                  </div>
                  <div className="ed-meta-item">
                    <div className="ed-meta-label">Gender</div>
                    <div className="ed-meta-value">{selectedCase.gender || "—"}</div>
                  </div>
                </div>
                <button className="ed-gen-report-btn" onClick={() => goGenReport(selectedCase)}>
                  📄 Generate Report for this Case
                </button>
              </div>

              {(selectedCase.checks || []).map(checkName => {
                const meta       = CHECK_META[checkName] || { icon: "✓", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" };
                const cs         = checkState[checkName] || { status: "Pending", notes: "", saving: false, saved: false, uploading: false, signedUrls: {} };
                const docs       = selectedCase.checkDocuments?.[checkName] || [];
                const isOpen     = expandedCheck === checkName;
                const statusMeta = STATUS_OPTIONS.find(s => s.value === cs.status) || STATUS_OPTIONS[0];

                return (
                  <div key={checkName} className="ed-check-card">
                    <div className="ed-check-header" onClick={() => setExpandedCheck(isOpen ? null : checkName)}>
                      <div className="ed-check-icon-wrap" style={{ background: meta.bg }}>{meta.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div className="ed-check-name">{checkName}</div>
                      </div>
                      <span className="ed-check-status-badge" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                        {cs.status}
                      </span>
                      <span className={`ed-check-chevron${isOpen ? " open" : ""}`}>⌄</span>
                    </div>

                    {isOpen && (
                      <div className="ed-check-body">
                        <div className="ed-check-body-inner">

                          <div className="ed-field-label" style={{ marginBottom: 8 }}>Update Status</div>
                          <div className="ed-status-row">
                            {STATUS_OPTIONS.map(opt => (
                              <button key={opt.value}
                                className={`ed-status-btn${cs.status === opt.value ? " selected" : ""}`}
                                style={{ background: cs.status === opt.value ? opt.bg : "#f8fafc", color: opt.color, borderColor: cs.status === opt.value ? opt.color : "transparent" }}
                                onClick={() => updateField(checkName, "status", opt.value)}
                              >{opt.label}</button>
                            ))}
                          </div>

                          <div className="ed-field-label" style={{ marginTop: 14 }}>Notes / Remarks</div>
                          <textarea className="ed-notes-input"
                            placeholder="Add your findings, remarks, or notes here…"
                            value={cs.notes}
                            onChange={e => updateField(checkName, "notes", e.target.value)}
                          />

                          <div className="ed-field-label" style={{ marginTop: 14 }}>Upload Documents</div>
                          {docs.length > 0 && (
                            <div className="ed-doc-list">
                              {docs.map((doc, i) => {
                                const signedUrl = cs.signedUrls?.[doc.key];
                                return (
                                  <div key={i} className="ed-doc-item">
                                    <span style={{ fontSize: 16 }}>📎</span>
                                    <span className="ed-doc-name">{doc.originalName}</span>
                                    <span className="ed-doc-date">
                                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-IN") : ""}
                                    </span>
                                    {signedUrl && <a href={signedUrl} target="_blank" rel="noreferrer" className="ed-doc-link">View ↗</a>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {cs.uploading ? (
                            <div className="ed-uploading">⏳ Uploading…</div>
                          ) : (
                            <label className="ed-upload-zone">
                              <input type="file" className="ed-file-hidden"
                                onChange={e => handleUpload(checkName, e.target.files[0])} />
                              <div className="ed-upload-icon">📁</div>
                              <div className="ed-upload-text">Click to upload a document</div>
                              <div className="ed-upload-sub">PDF, DOC, JPG, PNG supported</div>
                            </label>
                          )}

                          <div style={{ marginTop: 16, display: "flex", alignItems: "center" }}>
                            <button className="ed-save-btn" onClick={() => saveCheck(checkName)} disabled={cs.saving}>
                              {cs.saving ? "Saving…" : "💾 Save"}
                            </button>
                            {cs.saved && <span className="ed-saved-msg">✅ Saved successfully</span>}
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

        </div>
      </div>
    </div>
  );
}