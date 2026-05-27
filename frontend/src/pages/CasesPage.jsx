import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
 
// ─────────────────────────────────────────────────────────────────────────────
// API BASE URL
// ─────────────────────────────────────────────────────────────────────────────
const API = window.location.hostname === "localhost"
  ? "https://tervies.info/api"
  : "/api";
 
// ─────────────────────────────────────────────────────────────────────────────
// CHECK CARDS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const CHECK_CARDS = [
  { key: "Employment Check",                label: "Employment Check",        short: "EMP" },
  { key: "Residential Address Check",       label: "Address Verification",    short: "ADR" },
  { key: "Educational Qualification Check", label: "Education Check",         short: "EDU" },
  { key: "Identity Check (PAN Card)",       label: "Identity Check (PAN)",    short: "PAN" },
  { key: "Identity Check (Aadhar)",         label: "Identity Check (Aadhar)", short: "ADH" },
  { key: "Criminal Police Record Check",    label: "Police Record",           short: "POL" },
  { key: "Criminal Database Check",         label: "Database Check",          short: "DB"  },
  { key: "Credit Check",                    label: "Credit Check",            short: "CRD" },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// STATUS OPTIONS — includes STOPPED
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "DISCREPANCY",
  "INSUFFICIENT",
  "CLOSED",
  "STOPPED",
];
 
// ─────────────────────────────────────────────────────────────────────────────
// CASE CHECKS STORE — localStorage["case_checks"]
// Single source of truth for which checks a case has.
// Never overwritten by fetchCases().
// ─────────────────────────────────────────────────────────────────────────────
function getAllSavedChecks() {
  try { return JSON.parse(localStorage.getItem("case_checks") || "{}"); }
  catch { return {}; }
}
function saveChecksForCase(caseId, checks) {
  try {
    const all = getAllSavedChecks();
    all[caseId] = checks;
    localStorage.setItem("case_checks", JSON.stringify(all));
  } catch (e) { console.error("saveChecksForCase error:", e); }
}
function getChecksForCase(caseId) {
  const all = getAllSavedChecks();
  return Object.prototype.hasOwnProperty.call(all, caseId) ? all[caseId] : null;
}
function applyLocalChecks(normalizedCase) {
  const local = getChecksForCase(safeValue(normalizedCase.caseId));
  return local !== null ? { ...normalizedCase, checks: local } : normalizedCase;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// TRACK REPORTS STORE — localStorage["track_reports"]
// ─────────────────────────────────────────────────────────────────────────────
function saveReportToTrack(caseObj, checks) {
  try {
    const all = JSON.parse(localStorage.getItem("track_reports") || "{}");
    all[safeValue(caseObj.caseId)] = {
      caseId:            safeValue(caseObj.caseId),
      name:              safeValue(caseObj.name),
      clientName:        safeValue(caseObj.clientName),
      clientCaseId:      safeValue(caseObj.clientCaseId),
      gender:            safeValue(caseObj.gender),
      dob:               safeValue(caseObj.dob),
      checks:            Array.isArray(checks) ? checks : [],
      status:            safeValue(caseObj.status) || "SUBMITTED",
      reportStatus:      "REPORT_GENERATED",
      reportGeneratedAt: new Date().toISOString(),
    };
    localStorage.setItem("track_reports", JSON.stringify(all));
  } catch (e) { console.error("saveReportToTrack error:", e); }
}
function getTrackReports() {
  try { return JSON.parse(localStorage.getItem("track_reports") || "{}"); }
  catch { return {}; }
}
 
// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function safeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(safeValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    for (const key of ["name", "label", "value", "status", "companyId", "caseId"]) {
      if (value[key] !== undefined && value[key] !== null) return String(value[key]);
    }
    try { return JSON.stringify(value); } catch { return ""; }
  }
  return "";
}
function safeStatus(status) {
  if (typeof status === "string") return status;
  if (status && typeof status === "object") {
    for (const key of ["status", "name", "label", "value"]) {
      if (typeof status[key] === "string") return status[key];
    }
  }
  return "SUBMITTED";
}
function normalizeChecks(checks) {
  if (!checks) return [];
  if (Array.isArray(checks)) return checks.map(safeValue).filter(Boolean);
  if (typeof checks === "string") return checks.split(",").map(i => i.trim()).filter(Boolean);
  if (typeof checks === "object") return Object.values(checks).map(safeValue).filter(Boolean);
  return [];
}
function normalizeCase(item) {
  return {
    ...item,
    checks:       normalizeChecks(item.checks),
    name:         safeValue(item.name),
    clientName:   safeValue(item.clientName),
    clientCaseId: safeValue(item.clientCaseId),
    caseId:       safeValue(item.caseId),
    status:       safeStatus(item.status),
    companyId:    safeValue(item.companyId),
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// SAFE CASES CACHE — localStorage has a very small quota (~5MB).
// Never store uploaded image/PDF base64 data in localStorage, otherwise React can
// crash with QuotaExceededError and show a white screen after Save Case.
// Full uploaded documents are stored in IndexedDB by saveManualCaseToIndexedDB().
// ─────────────────────────────────────────────────────────────────────────────
function stripHeavyCaseData(caseObj = {}) {
  const stripDocs = docs => Array.isArray(docs)
    ? docs.map(d => ({
        key: d?.key,
        originalName: d?.originalName || d?.name,
        name: d?.name || d?.originalName,
        type: d?.type,
        mimeType: d?.mimeType,
        uploadedAt: d?.uploadedAt,
        source: d?.source,
      }))
    : [];

  return {
    ...caseObj,
    documents: stripDocs(caseObj.documents),
    verifiedDocuments: stripDocs(caseObj.verifiedDocuments),
    uploadedManualFiles: [],
    dataUrl: undefined,
    base64: undefined,
    file: undefined,
    url: undefined,
  };
}

function saveCasesLight(casesData) {
  try {
    const lightCases = Array.isArray(casesData)
      ? casesData.map(stripHeavyCaseData)
      : [];
    localStorage.setItem("cases", JSON.stringify(lightCases));
  } catch (err) {
    console.warn("LocalStorage cases cache skipped to prevent white screen:", err);
    try { localStorage.removeItem("cases"); } catch {}
  }
}

function getClientShort(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function shortCheckLabel(check) {
  const map = {
    "Employment Check":                "Employment",
    "Residential Address Check":       "Address",
    "Educational Qualification Check": "Education",
    "Identity Check (PAN Card)":       "Identity",
    "Identity Check (Aadhar)":         "Aadhar",
    "Criminal Police Record Check":    "Police",
    "Criminal Database Check":         "Database",
    "Credit Check":                    "Credit",
  };
  return map[safeValue(check)] || safeValue(check);
}
function mapStatusToColor(status) {
  const s = safeStatus(status);
  if (s === "VERIFIED" || s === "CLOSED") return "Green";
  if (s === "DISCREPANCY") return "Red";
  return "Yellow";
}
function formatDate(raw) {
  if (!raw) return "";
  try { return new Date(raw).toLocaleDateString("en-IN"); }
  catch { return String(raw); }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN EXCEL UPLOAD HELPERS — creates cases directly from Excel rows
// ─────────────────────────────────────────────────────────────────────────────
function normalizeExcelHeader(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickExcelValue(row, keys = []) {
  for (const key of keys) {
    const exact = row[key];
    if (exact !== undefined && exact !== null && String(exact).trim() !== "") return String(exact).trim();

    const normalizedKey = normalizeExcelHeader(key);
    const matchedKey = Object.keys(row).find(k => normalizeExcelHeader(k) === normalizedKey);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== "") {
      return String(row[matchedKey]).trim();
    }
  }
  return "";
}

function buildCaseFromExcelRow(row, index, companies = [], selectedClient = "ALL") {
  const cleanSelectedClient = selectedClient !== "ALL" ? selectedClient : "";

  const excelClientName = pickExcelValue(row, [
    "client name", "client", "company client", "assigned client", "organization client"
  ]);

  const resolvedClientName = excelClientName || cleanSelectedClient;
  const matchedCompany = companies.find(co =>
    safeValue(co.name).trim().toLowerCase() === resolvedClientName.trim().toLowerCase() ||
    safeValue(co.companyId).trim().toLowerCase() === resolvedClientName.trim().toLowerCase()
  );

  const rawChecks = pickExcelValue(row, ["checks", "check", "verification checks", "level of check"]);
  const checks = rawChecks
    ? rawChecks.split(/[,|;]+/).map(v => v.trim()).filter(Boolean)
    : [];

  const caseId = pickExcelValue(row, ["case id", "caseid", "case no", "case number"]) ||
    `EXL-${Date.now()}-${index + 1}`;

  return {
    ...emptyCase(),
    name: pickExcelValue(row, ["name", "full name", "candidate name", "applicant name"]),
    caseId,
    email: pickExcelValue(row, ["email", "email id", "mail"]),
    phone: pickExcelValue(row, ["phone", "mobile", "contact", "phone number", "mobile number"]),
    alternatephone: pickExcelValue(row, ["alternate phone", "alternate mobile", "alt phone"]),
    fatherName: pickExcelValue(row, ["father name", "father's name", "fathername"]),
    dob: pickExcelValue(row, ["dob", "date of birth", "birth date"]),
    gender: pickExcelValue(row, ["gender", "sex"]),
    adharnumber: pickExcelValue(row, ["aadhaar number", "aadhar number", "aadhaar", "aadhar"]),
    pan: pickExcelValue(row, ["pan", "pan number", "pan card"]),
    clientName: matchedCompany ? safeValue(matchedCompany.name) : resolvedClientName,
    companyId: matchedCompany ? safeValue(matchedCompany.companyId) : pickExcelValue(row, ["company id", "companyid"]),
    clientCaseId: pickExcelValue(row, ["client case id", "clientcaseid", "client ref", "reference id"]),
    spocName: pickExcelValue(row, ["spoc", "spoc name", "hr name"]),
    presentAddress: pickExcelValue(row, ["present address", "current address", "address"]),
    permanentAddress: pickExcelValue(row, ["permanent address"]),
    STATE: pickExcelValue(row, ["state"]),
    pincode: pickExcelValue(row, ["pincode", "pin code", "postal code"]),
    company: pickExcelValue(row, ["company", "employer", "organization"]),
    designation: pickExcelValue(row, ["designation", "position", "job title"]),
    duration: pickExcelValue(row, ["duration", "tenure"]),
    employeeId: pickExcelValue(row, ["employee id", "emp id"]),
    ctc: pickExcelValue(row, ["ctc", "salary"]),
    manager: pickExcelValue(row, ["manager", "supervisor"]),
    reasonLeaving: pickExcelValue(row, ["reason for leaving", "reason leaving"]),
    institution: pickExcelValue(row, ["institution", "college", "school"]),
    university: pickExcelValue(row, ["university"]),
    degree: pickExcelValue(row, ["degree", "qualification"]),
    year: pickExcelValue(row, ["year", "passing year", "year of passing"]),
    registration: pickExcelValue(row, ["registration", "roll number", "enrollment"]),
    mode: pickExcelValue(row, ["mode"]),
    criminalDetails: pickExcelValue(row, ["criminal details", "police details"]),
    verificationSummary: pickExcelValue(row, ["verification summary", "remarks", "comments"]),
    totalCost: pickExcelValue(row, ["total cost", "cost"]),
    status: safeStatus(pickExcelValue(row, ["status"]) || "SUBMITTED"),
    checks,
    receivedDate: new Date().toISOString(),
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// MANUAL DOCUMENT HELPERS — used only for the folder/manual entry panel
// Saves uploaded manual documents so they are visible on View / Edit page.
// ─────────────────────────────────────────────────────────────────────────────
const MANUAL_DB_NAME    = "BGV_AdminDB";
const MANUAL_DB_VERSION = 1;
const MANUAL_STORE_NAME = "admin_cases";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isManualAllowedFile(file) {
  const type = file?.type || "";
  const name = (file?.name || "").toLowerCase();
  return type.startsWith("image/") || type === "application/pdf" || name.endsWith(".pdf");
}

function inferManualDocType(fileName = "") {
  const n = String(fileName).toLowerCase();
  if (n.includes("address") || n.includes("aadhaar") || n.includes("aadhar") || n.includes("rent") || n.includes("bill")) return "address";
  if (n.includes("employment") || n.includes("salary") || n.includes("offer") || n.includes("experience") || n.includes("company")) return "employment";
  if (n.includes("education") || n.includes("degree") || n.includes("marksheet") || n.includes("university") || n.includes("college")) return "education";
  if (n.includes("criminal") || n.includes("police") || n.includes("court")) return "criminal";
  return "identity";
}

function initManualDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB not supported"));
    const request = indexedDB.open(MANUAL_DB_NAME, MANUAL_DB_VERSION);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(MANUAL_STORE_NAME)) db.createObjectStore(MANUAL_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveManualCaseToIndexedDB(caseObj) {
  try {
    const db = await initManualDB();
    const existing = await new Promise((resolve, reject) => {
      const tx = db.transaction(MANUAL_STORE_NAME, "readonly");
      const req = tx.objectStore(MANUAL_STORE_NAME).get("all_cases");
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });

    const idx = existing.findIndex(c => safeValue(c.caseId) === safeValue(caseObj.caseId));
    const updatedCase = idx >= 0 ? { ...existing[idx], ...caseObj } : caseObj;
    const updated = idx >= 0
      ? existing.map((c, i) => i === idx ? updatedCase : c)
      : [updatedCase, ...existing];

    await new Promise((resolve, reject) => {
      const tx = db.transaction(MANUAL_STORE_NAME, "readwrite");
      const req = tx.objectStore(MANUAL_STORE_NAME).put(updated, "all_cases");
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("saveManualCaseToIndexedDB error:", e);
  }
}
function emptyCase() {
  return {
    // Identity
    name: "", caseId: "", email: "", phone: "", alternatephone: "",
    adharnumber: "", gender: "", fatherName: "", dob: "", pan: "",

    // Client information
    clientName: "", companyId: "", clientCaseId: "", spocName: "",

    // Address
    presentAddress: "", permanentAddress: "", STATE: "", pincode: "",

    // Employment
    company: "", designation: "", duration: "", employeeId: "", ctc: "",
    manager: "", reasonLeaving: "",

    // Education
    institution: "", university: "", degree: "", year: "", registration: "", mode: "",

    // Criminal + verification
    criminalDetails: "", verificationSummary: "", totalCost: "",
    status: "SUBMITTED", checks: [],
  };
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const safe = safeStatus(status);
  const colors = {
    SUBMITTED:    "bg-blue-500",
    UNDER_REVIEW: "bg-yellow-500",
    VERIFIED:     "bg-green-600",
    DISCREPANCY:  "bg-red-600",
    INSUFFICIENT: "bg-orange-500",
    CLOSED:       "bg-slate-800",
    STOPPED:      "bg-rose-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-white text-xs font-semibold ${colors[safe] || "bg-gray-400"}`}>
      {safe.replace(/_/g, " ")}
    </span>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — OpenCasesButton
// ─────────────────────────────────────────────────────────────────────────────
function OpenCasesButton({ count, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 text-left rounded-xl border px-4 py-3 transition-all duration-200 ${
        selected ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-100 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
        OPN
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 mb-0.5">Open Cases</p>
        <p className="text-xl font-bold text-emerald-600 leading-none">{count}</p>
      </div>
      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"}`}>
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — ClosedCasesButton
// ─────────────────────────────────────────────────────────────────────────────
function ClosedCasesButton({ count, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 text-left rounded-xl border px-4 py-3 transition-all duration-200 ${
        selected ? "border-slate-600 bg-slate-50 ring-1 ring-slate-200 shadow-sm" : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${selected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"}`}>
        CLS
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 mb-0.5">Closed Cases</p>
        <p className="text-xl font-bold text-slate-700 leading-none">{count}</p>
      </div>
      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-slate-800 bg-slate-800" : "border-slate-300 bg-white"}`}>
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — StoppedCasesButton
// ─────────────────────────────────────────────────────────────────────────────
function StoppedCasesButton({ count, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 text-left rounded-xl border px-4 py-3 transition-all duration-200 ${
        selected ? "border-rose-500 bg-rose-50 ring-1 ring-rose-100 shadow-sm" : "border-slate-200 bg-white hover:border-rose-300 hover:shadow-sm"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${selected ? "bg-rose-700 text-white" : "bg-slate-100 text-slate-500"}`}>
        STP
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 mb-0.5">Stopped Cases</p>
        <p className="text-xl font-bold text-rose-700 leading-none">{count}</p>
      </div>
      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-rose-700 bg-rose-700" : "border-slate-300 bg-white"}`}>
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — ClientCard
// ─────────────────────────────────────────────────────────────────────────────
function ClientCard({ client, active, onSelect, onDelete }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200 ${
      active ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-100 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
    }`}>
      <button onClick={() => onSelect(client.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
          {client.short}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{client.name}</p>
          <p className="text-[11px] text-slate-400">{client.count} case(s)</p>
        </div>
        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"}`}>
          {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onDelete(client.companyId, client.name); }}
        className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition"
        title="Remove client"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — ChecksDropdown
// ─────────────────────────────────────────────────────────────────────────────
function ChecksDropdown({ caseId, currentChecks, isOpen, savingFor, dropdownRef, onToggleOpen, onToggleCheck }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleOpen(); }}
        className="w-full min-h-[44px] border border-slate-300 rounded-xl px-3 py-2 bg-white text-left flex items-center justify-between gap-3 hover:border-blue-300 transition"
      >
        <div className="flex gap-2 flex-wrap">
          {currentChecks.length > 0 ? (
            currentChecks.map(ch => (
              <span key={safeValue(ch)} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                {shortCheckLabel(ch)}
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-sm">Select checks</span>
          )}
        </div>
        <span className="text-slate-500 text-xs font-semibold whitespace-nowrap flex-shrink-0">
          {savingFor === caseId ? "Saving..." : isOpen ? "Close ▲" : "Select ▼"}
        </span>
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-2 z-30 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-3"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-2 px-1">
            Select verification checks
          </p>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {CHECK_CARDS.map(card => {
              const checked = currentChecks.includes(card.key);
              return (
                <label
                  key={card.key}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                    checked ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:border-blue-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleCheck(card.key)}
                    className="h-4 w-4 cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700">{card.label}</span>
                  {checked && <span className="ml-auto text-xs text-blue-500 font-semibold">✓</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — StopCasesModal
// Shown when admin clicks "Stop Cases with Remark"
// Requires a non-empty remark before confirming
// ─────────────────────────────────────────────────────────────────────────────
function StopCasesModal({ count, onConfirm, onCancel }) {
  const [remark, setRemark] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md mx-4 overflow-hidden">
 
        {/* Header */}
        <div className="bg-rose-700 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl flex-shrink-0">
            🛑
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Stop Cases</h2>
            <p className="text-rose-200 text-xs mt-0.5">
              {count} case{count !== 1 ? "s" : ""} will be moved to Stopped Cases
            </p>
          </div>
        </div>
 
        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-slate-600 text-sm mb-5 leading-relaxed">
            These cases will be moved out of <strong className="text-slate-800">Open Cases</strong> into{" "}
            <strong className="text-rose-700">Stopped Cases</strong>. The remark will be recorded against each case and visible in the case list.
          </p>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Admin Remark <span className="text-rose-500">*</span>
          </label>
          <textarea
            autoFocus
            rows={4}
            placeholder="e.g. Client has withdrawn the background verification request for this batch. No further action needed..."
            value={remark}
            onChange={e => setRemark(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none placeholder:text-slate-300"
          />
          <div className="flex items-center justify-between mt-2">
            {remark.trim().length === 0 ? (
              <p className="text-rose-500 text-xs">A remark is required to stop cases.</p>
            ) : (
              <p className="text-emerald-600 text-xs">✓ Remark added — ready to stop.</p>
            )}
            <span className="text-slate-300 text-xs">{remark.length} chars</span>
          </div>
        </div>
 
        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={() => remark.trim() && onConfirm(remark.trim())}
            disabled={!remark.trim()}
            className="flex-1 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            🛑 Stop {count} Case{count !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — CasesPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CasesPage() {
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem("adminToken");
 
  // Refs
  const checksDropdownRef = useRef(null);
  const tableWrapperRef   = useRef(null);   // the scrollable table container
  const topScrollRef      = useRef(null);   // the sticky scrollbar above the table
  const fixedScrollRef = useRef(null);
  const phantomRef     = useRef(null);
 
  // ── State ──────────────────────────────────────────────────────────────────
  const [cases,              setCases]              = useState([]);
  const [companies,          setCompanies]          = useState([]);
  const [search,             setSearch]             = useState("");
  const [status,             setStatus]             = useState("ALL");
  const [selectedClient,     setSelectedClient]     = useState("ALL");
  const [selectedCaseFlow,   setSelectedCaseFlow]   = useState("ALL");
  const [loadingReportId,    setLoadingReportId]    = useState(null);
  const [showAddClient,      setShowAddClient]      = useState(false);
  const [newClientName,      setNewClientName]      = useState("");
  const [addingClient,       setAddingClient]       = useState(false);
  const [showAddRow,         setShowAddRow]         = useState(false);
  const [newCase,            setNewCase]            = useState(emptyCase());
  const [openChecksDropdown, setOpenChecksDropdown] = useState(null);
  const [savingChecksFor,    setSavingChecksFor]    = useState(null);
  const [selectedCaseIds,    setSelectedCaseIds]    = useState(new Set());
  const [showStopModal,      setShowStopModal]      = useState(false);

  // Hide-only list for Client Sent Folders cards.
  // This DOES NOT delete cases or documents from the server/admin portal; it only removes
  // the folder card from this screen for this browser.
  const [hiddenCompanyFolderIds, setHiddenCompanyFolderIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hidden_company_folder_ids") || "[]"); }
    catch { return []; }
  });

  // Folder upload + document preview panel
  const [folderFiles,        setFolderFiles]        = useState([]);
  const [selectedFolderFile, setSelectedFolderFile] = useState(null);
  const [showFolderPanel,    setShowFolderPanel]    = useState(false);
  const [folderPreviewZoom,  setFolderPreviewZoom]  = useState(1);
  const [folderPreviewRotate,setFolderPreviewRotate]= useState(0);
  const [manualUploadedDocs, setManualUploadedDocs] = useState([]);
  const [folderPaneSizes,   setFolderPaneSizes]   = useState({ files: 0.8, preview: 3.5, form: 0.8 });
  const manualDocInputRef = useRef(null);
  const adminExcelInputRef = useRef(null);
  const [excelUploading, setExcelUploading] = useState(false);
 
  // ── Sticky top scrollbar — synced bidirectionally with table wrapper ────────
  // The top scrollbar sits above the table with position:sticky so it is ALWAYS
  // visible regardless of how far down the page you scroll.
 useEffect(() => {
  const wrapper = tableWrapperRef.current;
  const fixed   = fixedScrollRef.current;
  const phantom = phantomRef.current;
  if (!wrapper || !fixed || !phantom) return;

  let fromFixed = false, fromWrapper = false;
  const onWrapper = () => { if (fromFixed) return; fromWrapper = true; fixed.scrollLeft = wrapper.scrollLeft; fromWrapper = false; };
  const onFixed   = () => { if (fromWrapper) return; fromFixed = true; wrapper.scrollLeft = fixed.scrollLeft; fromFixed = false; };

  wrapper.addEventListener("scroll", onWrapper);
  fixed.addEventListener("scroll", onFixed);

  const updatePosition = () => {
    const rect = wrapper.getBoundingClientRect();
    fixed.style.left  = rect.left + "px";
    fixed.style.width = rect.width + "px";
    if (phantom) phantom.style.width = wrapper.scrollWidth + "px";
  };

  updatePosition();
  window.addEventListener("scroll",  updatePosition, { passive: true });
  window.addEventListener("resize",  updatePosition);
  const ro = new ResizeObserver(updatePosition);
  ro.observe(wrapper);

  return () => {
    wrapper.removeEventListener("scroll", onWrapper);
    fixed.removeEventListener("scroll", onFixed);
    window.removeEventListener("scroll", updatePosition);
    window.removeEventListener("resize", updatePosition);
    ro.disconnect();
  };
}, []);
 
  // Keep phantom div inside top scrollbar the same width as the table
  // so the scrollbar thumb size is correct.
  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    const top     = topScrollRef.current;
    if (!wrapper || !top) return;
    const phantom = top.firstChild;
    if (phantom) phantom.style.width = wrapper.scrollWidth + "px";
  });
 
  // ── On mount: load localStorage cache, then hit server ───────────────────
  useEffect(() => {
    const localCases     = JSON.parse(localStorage.getItem("cases")     || "[]");
    const localCompanies = JSON.parse(localStorage.getItem("companies") || "[]");
    if (localCases.length > 0)
      setCases(localCases.map(c => applyLocalChecks(normalizeCase(c))));
    if (localCompanies.length > 0)
      setCompanies(localCompanies.map(c => ({ ...c, name: safeValue(c.name), companyId: safeValue(c.companyId) })));
  }, []);
 
  useEffect(() => { fetchCases(); fetchCompanies(); }, []);
 
  // Auto-refresh every 30 s so all browser tabs stay in sync
  useEffect(() => {
    const id = setInterval(() => { fetchCases(); fetchCompanies(); }, 30000);
    return () => clearInterval(id);
  }, []);
 
  // Close checks dropdown on outside click
  useEffect(() => {
    const handle = e => {
      if (checksDropdownRef.current && !checksDropdownRef.current.contains(e.target))
        setOpenChecksDropdown(null);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
 
  // Refresh when tab regains focus
  useEffect(() => {
    const onFocus = () => { fetchCases(); fetchCompanies(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
 
  // Clear row selections when the client filter changes
  useEffect(() => { setSelectedCaseIds(new Set()); }, [selectedClient]);

  // Revoke local object URLs when page unmounts
  useEffect(() => {
    return () => {
      folderFiles.forEach(f => {
        if (f?.url && !f.isRemote) URL.revokeObjectURL(f.url);
      });
    };
  }, [folderFiles]);

  useEffect(() => {
    setFolderPreviewZoom(1);
    setFolderPreviewRotate(0);
  }, [selectedFolderFile]);
 
  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchCases = async () => {
    try {
      const res     = await axios.get(`${API}/admin/cases`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const fetched = (res.data?.cases || []).map(item => applyLocalChecks(normalizeCase(item)));
      setCases(fetched);
      saveCasesLight(fetched);
    } catch {
      try {
        const fb = JSON.parse(localStorage.getItem("cases") || "[]").map(c => applyLocalChecks(normalizeCase(c)));
        if (fb.length > 0) setCases(fb);
      } catch {}
    }
  };
 
  const fetchCompanies = async () => {
    try {
      const res     = await axios.get(`${API}/admin/companies`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const fetched = (res.data?.companies || []).map(c => ({ ...c, name: safeValue(c.name), companyId: safeValue(c.companyId) }));
      setCompanies(fetched);
      localStorage.setItem("companies", JSON.stringify(fetched));
    } catch {
      try {
        const fb = JSON.parse(localStorage.getItem("companies") || "[]");
        setCompanies(Array.isArray(fb) ? fb : []);
      } catch { setCompanies([]); }
    }
  };
 
  // ── Computed / memos ───────────────────────────────────────────────────────
  const clientCards = useMemo(() => {
    const countMap = {};
    cases.forEach(c => {
      const n = safeValue(c.clientName).trim();
      if (n) countMap[n] = (countMap[n] || 0) + 1;
    });
    return companies
      .map(co => ({ companyId: co.companyId, name: co.name, short: getClientShort(co.name), count: countMap[co.name.trim()] || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cases, companies]);
 
  const companyFolderCases = useMemo(() => {
    const hiddenSet = new Set(hiddenCompanyFolderIds.map(safeValue));
    return cases
      .filter(c => {
        const rawCaseId = safeValue(c.caseId);
        if (hiddenSet.has(rawCaseId)) return false;

        const caseId = rawCaseId.toUpperCase();
        const clientCaseId = safeValue(c.clientCaseId).toUpperCase();
        const name = safeValue(c.name).toLowerCase();
        const verifiedDocs = Array.isArray(c.verifiedDocuments) ? c.verifiedDocuments : [];
        const normalDocs = Array.isArray(c.documents) ? c.documents : [];
        const docs = [...verifiedDocs, ...normalDocs];
        return docs.length > 0 && (
          caseId.startsWith("FDR-") ||
          clientCaseId.startsWith("FOLDER-") ||
          name.includes("folder upload")
        );
      })
      .sort((a, b) => new Date(b.createdAt || b.receivedDate || 0) - new Date(a.createdAt || a.receivedDate || 0));
  }, [cases, hiddenCompanyFolderIds]);

  const filtered = useMemo(() => {
    let t = [...cases];
    // OPEN = not CLOSED and not STOPPED
    if (selectedCaseFlow === "OPEN")    t = t.filter(c => safeStatus(c.status) !== "CLOSED" && safeStatus(c.status) !== "STOPPED");
    if (selectedCaseFlow === "CLOSED")  t = t.filter(c => safeStatus(c.status) === "CLOSED");
    if (selectedCaseFlow === "STOPPED") t = t.filter(c => safeStatus(c.status) === "STOPPED");
    if (status !== "ALL")               t = t.filter(c => safeStatus(c.status) === status);
    if (selectedClient !== "ALL")       t = t.filter(c => safeValue(c.clientName).trim() === selectedClient);
    if (search.trim()) {
      const q = search.toLowerCase();
      t = t.filter(c =>
        safeValue(c.name).toLowerCase().includes(q) ||
        safeValue(c.caseId).toLowerCase().includes(q) ||
        safeValue(c.clientCaseId).toLowerCase().includes(q) ||
        safeValue(c.clientName).toLowerCase().includes(q)
      );
    }
    return t;
  }, [cases, search, status, selectedClient, selectedCaseFlow]);
 
  const openCasesCount    = useMemo(() => cases.filter(c => safeStatus(c.status) !== "CLOSED" && safeStatus(c.status) !== "STOPPED").length, [cases]);
  const closedCasesCount  = useMemo(() => cases.filter(c => safeStatus(c.status) === "CLOSED").length,  [cases]);
  const stoppedCasesCount = useMemo(() => cases.filter(c => safeStatus(c.status) === "STOPPED").length, [cases]);
 
  // Select-all helpers
  const allFilteredIds = useMemo(() => filtered.map(c => safeValue(c.caseId)), [filtered]);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedCaseIds.has(id));
  const someSelected   = allFilteredIds.some(id => selectedCaseIds.has(id)) && !allSelected;
 
  const handleSelectAll = () => {
    if (allSelected) setSelectedCaseIds(new Set());
    else setSelectedCaseIds(new Set(allFilteredIds));
  };
  const handleToggleSelectCase = caseId => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      next.has(caseId) ? next.delete(caseId) : next.add(caseId);
      return next;
    });
  };
 
  // ── Client actions ─────────────────────────────────────────────────────────
  const handleAddClient = async () => {
    const cleanName = newClientName.trim();
    if (!cleanName) { alert("Please enter client name."); return; }
    if (companies.some(c => c.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      alert("Client already exists."); return;
    }
    setAddingClient(true);
    try {
      const res     = await axios.post(`${API}/admin/create-company`, { name: cleanName }, { headers: { Authorization: `Bearer ${getToken()}` } });
      const created = res.data?.company;
      if (created) {
        const updated = [...companies, created].sort((a, b) => safeValue(a.name).localeCompare(safeValue(b.name)));
        setCompanies(updated);
        localStorage.setItem("companies", JSON.stringify(updated));
        setSelectedClient(created.name);
      }
      setNewClientName(""); setShowAddClient(false);
    } catch (error) {
      const msg = error?.response?.data?.message || "";
      if (msg.toLowerCase().includes("already exists")) { alert("Client already exists on the server."); await fetchCompanies(); }
      else alert("Could not create client: " + (msg || "Server error"));
    } finally { setAddingClient(false); }
  };
 
  const deleteClient = async (companyId, companyName) => {
    if (!window.confirm(`Remove client "${companyName}"? This will not delete their cases.`)) return;
    try { await axios.delete(`${API}/admin/companies/${companyId}`, { headers: { Authorization: `Bearer ${getToken()}` } }); } catch {}
    const updated = companies.filter(c => safeValue(c.companyId) !== companyId);
    setCompanies(updated);
    localStorage.setItem("companies", JSON.stringify(updated));
    if (selectedClient === companyName) setSelectedClient("ALL");
  };
 
  // ── Case actions ───────────────────────────────────────────────────────────
  const deleteCase = async caseId => {
    if (!window.confirm(`Delete case ${caseId}? This cannot be undone.`)) return;
    try { await axios.delete(`${API}/admin/cases/${caseId}`, { headers: { Authorization: `Bearer ${getToken()}` } }); } catch {}
    const updated = cases.filter(c => safeValue(c.caseId) !== caseId);
    setCases(updated);
    saveCasesLight(updated);
    const allChecks = getAllSavedChecks(); delete allChecks[caseId];
    localStorage.setItem("case_checks", JSON.stringify(allChecks));
    try { const r = getTrackReports(); delete r[caseId]; localStorage.setItem("track_reports", JSON.stringify(r)); } catch {}
    setSelectedCaseIds(prev => { const next = new Set(prev); next.delete(caseId); return next; });
  };
 
  const assignCompany = async (caseId, selectedValue) => {
    if (!selectedValue) return;
    const company            = companies.find(c => safeValue(c.companyId) === selectedValue);
    const resolvedClientName = company ? safeValue(company.name) : selectedValue;
    const updated = cases.map(c => safeValue(c.caseId) === caseId ? { ...c, companyId: selectedValue, clientName: resolvedClientName } : c);
    setCases(updated); saveCasesLight(updated);
    try { await axios.post(`${API}/admin/assign-company`, { caseId, companyId: selectedValue }, { headers: { Authorization: `Bearer ${getToken()}` } }); }
    catch (err) { console.error("Assign company error:", err); }
  };
 
  const updateStatus = async (caseId, newStatus) => {
    const updated = cases.map(c =>
      safeValue(c.caseId) === caseId
        ? { ...c, status: newStatus, closedDate: newStatus === "CLOSED" ? new Date().toISOString() : c.closedDate }
        : c
    );
    setCases(updated); saveCasesLight(updated);
    try {
      const payload = { caseId, status: newStatus };
      if (newStatus === "CLOSED") payload.closedDate = new Date().toISOString();
      await axios.post(`${API}/admin/update`, payload, { headers: { Authorization: `Bearer ${getToken()}` } });
    } catch {}
  };
 
  // ── BULK STOP CASES ────────────────────────────────────────────────────────
  // Called when admin confirms the StopCasesModal.
  // 1. Updates all selected cases to STOPPED with the remark in local state + localStorage.
  // 2. Fires background API calls to persist on server (failure is non-blocking).
  // 3. Clears selection, closes modal, switches view to Stopped Cases.
  const handleConfirmStop = async remark => {
    const ids       = [...selectedCaseIds];
    const stoppedAt = new Date().toISOString();
 
    const updated = cases.map(c =>
      ids.includes(safeValue(c.caseId))
        ? { ...c, status: "STOPPED", stopRemark: remark, stoppedAt }
        : c
    );
    setCases(updated);
    saveCasesLight(updated);
 
    // Background server sync — one request per case
    ids.forEach(async caseId => {
      try {
        await axios.post(
          `${API}/admin/update`,
          { caseId, status: "STOPPED", stopRemark: remark, stoppedAt },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } catch (err) { console.error("Stop case server error for", caseId, err); }
    });
 
    setSelectedCaseIds(new Set());
    setShowStopModal(false);
    setSelectedCaseFlow("STOPPED");   // navigate view to Stopped Cases
    setStatus("ALL");                 // reset any status filter
  };
 
  // ── Checks actions ─────────────────────────────────────────────────────────
  const updateChecks = async (caseId, newChecks) => {
    const normalized = normalizeChecks(newChecks);
    saveChecksForCase(caseId, normalized);
    setCases(prev => {
      const updated = prev.map(c => safeValue(c.caseId) === caseId ? { ...c, checks: normalized } : c);
      saveCasesLight(updated);
      return updated;
    });
    setSavingChecksFor(caseId);
    try { await axios.post(`${API}/admin/update`, { caseId, checks: normalized }, { headers: { Authorization: `Bearer ${getToken()}` } }); }
    catch (err) { console.error("Server save failed — checks safe in localStorage:", err); }
    finally { setSavingChecksFor(null); }
  };
 
  const toggleExistingCaseCheck = (caseId, currentChecks, checkKey) => {
    const current = normalizeChecks(currentChecks);
    updateChecks(caseId, current.includes(checkKey) ? current.filter(i => i !== checkKey) : [...current, checkKey]);
  };
  const toggleNewCaseCheck = checkKey => {
    setNewCase(prev => ({
      ...prev,
      checks: prev.checks.includes(checkKey) ? prev.checks.filter(k => k !== checkKey) : [...prev.checks, checkKey],
    }));
  };
 
  // ── Add new row ────────────────────────────────────────────────────────────
  const handleClientDropdownChange = value => {
    const selected = companies.find(c => safeValue(c.companyId) === value);
    setNewCase(prev => ({ ...prev, companyId: value, clientName: selected ? safeValue(selected.name) : value }));
  };

  const handleFolderUpload = e => {
    const uploaded = Array.from(e.target.files || []).map(file => ({
      file,
      name: file.name,
      path: file.webkitRelativePath || file.name,
      type: file.type || "",
      url: URL.createObjectURL(file),
    }));

    if (uploaded.length === 0) return;

    folderFiles.forEach(f => {
      if (f?.url && !f.isRemote) URL.revokeObjectURL(f.url);
    });

    setFolderFiles(uploaded);
    setSelectedFolderFile(uploaded[0]);
    setShowFolderPanel(true);
    setShowAddRow(false);
    e.target.value = "";
  };

  const handleAdminExcelUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      alert("Please upload a valid Excel file (.xlsx, .xls, or .csv).");
      e.target.value = "";
      return;
    }

    setExcelUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        alert("Excel file is empty.");
        return;
      }

      const preparedCases = rows
        .map((row, index) => buildCaseFromExcelRow(row, index, companies, selectedClient))
        .filter(item => safeValue(item.name) && safeValue(item.caseId));

      if (!preparedCases.length) {
        alert("No valid cases found. Excel must have at least Candidate Name and Case ID columns.");
        return;
      }

      const createdCases = [];
      let failed = 0;

      for (const caseToSave of preparedCases) {
        const serverPayload = stripHeavyCaseData(caseToSave);
        serverPayload.documents = [];
        serverPayload.verifiedDocuments = [];

        try {
          await axios.post(
            `${API}/admin/create-case`,
            serverPayload,
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );

          try {
            await axios.post(
              `${API}/admin/update-case-details`,
              serverPayload,
              { headers: { Authorization: `Bearer ${getToken()}` } }
            );
          } catch (err) {
            console.warn("Extra Excel case details sync skipped:", err);
          }

          saveChecksForCase(caseToSave.caseId, normalizeChecks(caseToSave.checks));
          createdCases.push(stripHeavyCaseData(caseToSave));
        } catch (err) {
          console.error("Excel case create failed:", caseToSave.caseId, err);
          failed += 1;
        }
      }

      if (createdCases.length > 0) {
        setCases(prev => {
          const oldIds = new Set(createdCases.map(c => safeValue(c.caseId)));
          const updated = [...createdCases, ...prev.filter(c => !oldIds.has(safeValue(c.caseId)))];
          saveCasesLight(updated);
          return updated;
        });
        fetchCompanies();
        setTimeout(fetchCases, 1000);
      }

      alert(`Excel upload completed. ${createdCases.length} case(s) created${failed ? `, ${failed} failed` : ""}.`);
    } catch (err) {
      console.error("Excel upload error:", err);
      alert("Excel upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setExcelUploading(false);
      e.target.value = "";
    }
  };

  const openCompanyFolderCase = async caseObj => {
    const verifiedDocs = Array.isArray(caseObj?.verifiedDocuments) ? caseObj.verifiedDocuments : [];
    const normalDocs = Array.isArray(caseObj?.documents) ? caseObj.documents : [];
    const docs = [...verifiedDocs, ...normalDocs];
    if (!docs.length) {
      alert("No uploaded folder documents found for this client folder.");
      return;
    }

    const docKeys = docs
      .map(doc => doc?.key)
      .filter(key => key && !String(key).startsWith("http") && !String(key).startsWith("data:"));

    let signedUrlMap = {};
    if (docKeys.length > 0) {
      try {
        const signedRes = await axios.post(
          `${API}/admin/get-signed-urls`,
          { keys: docKeys },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        (signedRes.data?.urls || []).forEach(item => {
          if (item?.key && item?.url) signedUrlMap[item.key] = item.url;
        });
      } catch (err) {
        console.error("Could not fetch signed URLs for folder documents:", err);
      }
    }

    const mapped = docs.map((doc, index) => {
      const originalName = doc.originalName || doc.name || `Document-${index + 1}`;
      const key = doc.key || originalName;
      const lowerName = String(originalName).toLowerCase();
      const lowerKey = String(key).toLowerCase();
      const mime = doc.mimeType || doc.mimetype || doc.type || "";
      const isPdf = lowerName.endsWith(".pdf") || lowerKey.endsWith(".pdf") || String(mime).includes("pdf");
      const isImage = String(mime).startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lowerName) || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lowerKey);

      let url = "";
      if (String(key).startsWith("http") || String(key).startsWith("data:")) {
        url = key;
      } else if (signedUrlMap[key]) {
        url = signedUrlMap[key];
      } else {
        // Fallback only. Live server should normally use /api/admin/get-signed-urls above.
        url = `${API}/admin/download/${encodeURIComponent(safeValue(caseObj.caseId))}/${encodeURIComponent(key)}?token=${encodeURIComponent(getToken() || "")}`;
      }

      return {
        id: `${safeValue(caseObj.caseId)}-${index}-${key}`,
        name: originalName,
        path: `${safeValue(caseObj.clientName)} / ${originalName}`,
        type: isPdf ? "application/pdf" : (isImage ? "image/*" : (mime || "application/octet-stream")),
        url,
        isRemote: true,
        sourceCaseId: safeValue(caseObj.caseId),
      };
    });

    folderFiles.forEach(f => {
      if (f?.url && !f.isRemote) {
        try { URL.revokeObjectURL(f.url); } catch {}
      }
    });

    setFolderFiles(mapped);
    setSelectedFolderFile(mapped[0] || null);
    setShowFolderPanel(true);
    setShowAddRow(false);
    setFolderPreviewZoom(1);
    setFolderPreviewRotate(0);

    // Pre-fill client details so admin can add a manual case from this folder quickly.
    const companyMatch = companies.find(co =>
      safeValue(co.companyId) === safeValue(caseObj.companyId) ||
      safeValue(co.name).trim().toLowerCase() === safeValue(caseObj.clientName).trim().toLowerCase()
    );
    setNewCase(prev => ({
      ...prev,
      clientName: safeValue(caseObj.clientName),
      companyId: companyMatch ? safeValue(companyMatch.companyId) : safeValue(caseObj.companyId),
      clientCaseId: "",
    }));
  };

  const hideCompanyFolderCard = caseId => {
    const cleanId = safeValue(caseId);
    if (!cleanId) return;

    const folderIsOpen = folderFiles.some(f => safeValue(f.sourceCaseId) === cleanId);
    if (!window.confirm("Remove this folder card from this screen only? Cases and documents will NOT be deleted.")) return;

    setHiddenCompanyFolderIds(prev => {
      const next = Array.from(new Set([...prev, cleanId]));
      try { localStorage.setItem("hidden_company_folder_ids", JSON.stringify(next)); } catch {}
      return next;
    });

    if (folderIsOpen) {
      setFolderFiles([]);
      setSelectedFolderFile(null);
      setShowFolderPanel(false);
      setFolderPreviewZoom(1);
      setFolderPreviewRotate(0);
    }
  };

  const closeFolderPanel = () => {
    folderFiles.forEach(f => {
      if (f?.url && !f.isRemote) URL.revokeObjectURL(f.url);
    });
    setFolderFiles([]);
    setSelectedFolderFile(null);
    setShowFolderPanel(false);
    setFolderPreviewZoom(1);
    setFolderPreviewRotate(0);
  };

  const addManualDocuments = async files => {
    const incoming = Array.from(files || []).filter(isManualAllowedFile);
    if (incoming.length === 0) {
      alert("Please upload only images or PDF files.");
      return;
    }

    const remaining = Math.max(0, 6 - manualUploadedDocs.length);
    if (remaining === 0) {
      alert("You can upload maximum 6 images/PDF files for one case.");
      return;
    }

    const limited = incoming.slice(0, remaining);
    const converted = await Promise.all(limited.map(async file => ({
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
      originalName: file.name,
      name: file.name,
      type: inferManualDocType(file.name),
      mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/*"),
      dataUrl: await fileToDataUrl(file),
      uploadedAt: new Date().toISOString(),
      source: "manual-case-entry",
    })));

    setManualUploadedDocs(prev => [...prev, ...converted]);
    if (incoming.length > remaining) alert("Only 6 files are allowed. Extra files were skipped.");
  };

  const handleManualDocInput = async e => {
    await addManualDocuments(e.target.files);
    e.target.value = "";
  };

  const handleManualDrop = async e => {
    e.preventDefault();
    e.stopPropagation();

    const draggedFolderIndex = e.dataTransfer.getData("folder-file-index");
    if (draggedFolderIndex !== "") {
      const dragged = folderFiles[Number(draggedFolderIndex)];
      if (dragged?.file) await addManualDocuments([dragged.file]);
      return;
    }

    await addManualDocuments(e.dataTransfer.files);
  };

  const removeManualDocument = key => {
    setManualUploadedDocs(prev => prev.filter(doc => doc.key !== key));
  };

  const clearManualForm = () => {
    setNewCase(emptyCase());
    setManualUploadedDocs([]);
  };
 
  const handleSaveNewRow = async () => {
    if (!newCase.name || !newCase.caseId) {
      alert("Please fill in both Candidate Name and Case ID!");
      return;
    }

    // Keep full uploaded image/PDF data ONLY in IndexedDB for View/Edit preview.
    // Do NOT send base64/dataUrl files to server and do NOT cache them in localStorage.
    // This prevents QuotaExceededError and the white screen after Save Case.
    const documents = manualUploadedDocs.map(doc => ({ ...doc }));

    const caseToSave = {
      ...newCase,
      checks: normalizeChecks(newCase.checks),
      documents,
      verifiedDocuments: [],
      receivedDate: newCase.receivedDate || new Date().toISOString(),
      closedDate: newCase.closedDate || "",
      verificationSummary: newCase.verificationSummary || "",
    };

    // Server should receive only normal text fields + checks.
    // Your live server.js /api/admin/create-case ignores document blobs anyway,
    // and sending them makes the request huge.
    const serverPayload = stripHeavyCaseData(caseToSave);
    serverPayload.documents = [];
    serverPayload.verifiedDocuments = [];

    try {
      await axios.post(
        `${API}/admin/create-case`,
        serverPayload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      // Your server.js has /api/admin/update-case-details. This second lightweight
      // call saves the extra full-form fields like PAN, Aadhaar, SPOC, pincode, etc.
      try {
        await axios.post(
          `${API}/admin/update-case-details`,
          serverPayload,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } catch (err) {
        console.warn("Extra case details sync skipped:", err);
      }

      await saveManualCaseToIndexedDB(caseToSave);
      saveChecksForCase(caseToSave.caseId, normalizeChecks(caseToSave.checks));

      setCases(prev => {
        const withoutOld = prev.filter(c => safeValue(c.caseId) !== safeValue(caseToSave.caseId));
        const updated = [stripHeavyCaseData(caseToSave), ...withoutOld];
        saveCasesLight(updated);
        return updated;
      });
      fetchCompanies();
    } catch (err) {
      console.error("Save case server error; saved locally:", err);

      // Offline/server fallback: full docs stay in IndexedDB, list cache stays light.
      const fallback = caseToSave;
      await saveManualCaseToIndexedDB(fallback);
      saveChecksForCase(fallback.caseId, normalizeChecks(fallback.checks));

      setCases(prev => {
        const withoutOld = prev.filter(c => safeValue(c.caseId) !== safeValue(fallback.caseId));
        const updated = [stripHeavyCaseData(fallback), ...withoutOld];
        saveCasesLight(updated);
        return updated;
      });
    }

    setShowAddRow(false);
    setNewCase(emptyCase());
    setManualUploadedDocs([]);
  };
 
  // Resolve which companyId to show in the Assign dropdown for a given case
  const getDropdownValue = c => {
    const companyId  = safeValue(c.companyId);
    const clientName = safeValue(c.clientName).trim();
    if (companyId && companies.some(co => safeValue(co.companyId) === companyId)) return companyId;
    if (clientName) {
      const match = companies.find(co => safeValue(co.name).trim().toLowerCase() === clientName.toLowerCase());
      if (match) return safeValue(match.companyId);
    }
    return "";
  };
  // ── Generate Report ────────────────────────────────────────────────────────
  const handleGenerateReport = async caseObj => {
    setLoadingReportId(caseObj.caseId);
    try {
      let detail = {};
      try {
        const res = await axios.get(`${API}/admin/case/${caseObj.caseId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        detail = res.data?.case || res.data || {};
      } catch {}
 
      const merged         = { ...caseObj, ...detail, checks: normalizeChecks(detail.checks || caseObj.checks) };
      const assignedCompany =
        companies.find(c => safeValue(c.companyId) === safeValue(merged.companyId))?.name ||
        merged.companyName || merged.clientName || "";
 
      const prefilled = {
        name: safeValue(merged.name), caseId: safeValue(merged.caseId),
        gender: safeValue(merged.gender), dob: safeValue(merged.dob),
        clientName: safeValue(merged.clientName), clientCaseId: safeValue(merged.clientCaseId),
        color: mapStatusToColor(safeStatus(merged.status)),
        allocationDate: formatDate(merged.receivedDate || merged.allocationDate),
        deliveryDate:   formatDate(merged.closedDate   || merged.deliveryDate),
        assignedCompany: safeValue(assignedCompany),
        level: safeValue(merged.level) || "STANDARD",
        // Employment fields
        respondentName:  safeValue(merged.employment?.respondentName),
        designation:     safeValue(merged.employment?.designation),
        contactEmail:    safeValue(merged.employment?.contactEmail),
        organization:    safeValue(merged.employment?.organization),
        companyContact:  safeValue(merged.employment?.companyContact),
        employmentDates: safeValue(merged.employment?.employmentDates),
        employeeCode:    safeValue(merged.employment?.employeeCode),
        supervisor:      safeValue(merged.employment?.supervisor),
        salary:          safeValue(merged.employment?.salary),
        reasonLeaving:   safeValue(merged.employment?.reasonLeaving),
        rehire:          safeValue(merged.employment?.rehire),
        comments:        safeValue(merged.employment?.comments),
        // Verification feedback (empty — filled in GenerateReport)
        vfRespondentName: "", vfDesignation: "", vfContactEmail: "", vfOrganization: "",
        vfCompanyContact: "", vfEmploymentDates: "", vfEmployeeCode: "", vfSupervisor: "",
        vfSalary: "", vfReasonLeaving: "", vfRehire: "", vfComments: "",
        // Residential fields
        residentialCaseRefNo:             safeValue(merged.residential?.caseRefNo),
        residentialCandidateName:         safeValue(merged.residential?.candidateName) || safeValue(merged.name),
        residentialFatherName:            safeValue(merged.residential?.fatherName),
        residentialDob:                   safeValue(merged.residential?.dob) || safeValue(merged.dob),
        residentialConfirmationAddress:   safeValue(merged.residential?.confirmationAddress),
        residentialAddressType:           safeValue(merged.residential?.addressType),
        residentialContactNumber:         safeValue(merged.residential?.contactNumber),
        residentialPeriodOfStay:          safeValue(merged.residential?.periodOfStay),
        residentialPropertyType:          safeValue(merged.residential?.propertyType),
        residentialPhotoIdProofSignature: safeValue(merged.residential?.photoIdProofSignature),
        residentialRespondentName:        safeValue(merged.residential?.respondentName),
        residentialSpecialComments:       safeValue(merged.residential?.specialComments),
        // Criminal fields
        criminalRespondentName:     safeValue(merged.criminal?.respondentName),
        criminalDesignation:        safeValue(merged.criminal?.designation),
        criminalPoliceStationName:  safeValue(merged.criminal?.policeStationName),
        criminalDateOfVerification: safeValue(merged.criminal?.dateOfVerification),
        criminalCandidateAddress:   safeValue(merged.criminal?.candidateAddress),
        criminalFinalRemarks:       safeValue(merged.criminal?.finalRemarks),
        criminalAdditionalRemarks:  safeValue(merged.criminal?.additionalRemarks),
        // PAN / Identity fields
        panCandidateName:      safeValue(merged.identity?.candidateName) || safeValue(merged.name),
        panFatherName:         safeValue(merged.identity?.fatherName),
        panDob:                safeValue(merged.identity?.dob) || safeValue(merged.dob),
        panNumber:             safeValue(merged.identity?.panNumber),
        panVerifiedName:       safeValue(merged.identity?.verifiedName),
        panVerifiedFatherName: safeValue(merged.identity?.verifiedFatherName),
        panVerifiedDob:        safeValue(merged.identity?.verifiedDob),
        panVerifiedNumber:     safeValue(merged.identity?.verifiedNumber),
        panVerificationDate:   safeValue(merged.identity?.verificationDate),
        panRespondentName:     safeValue(merged.identity?.respondentName) || "Online",
        panFinalRemarks:       safeValue(merged.identity?.finalRemarks),
        // File arrays
        employmentDocuments: [], employmentScreenshots: [],
        residentialDocuments: [], residentialScreenshots: [],
        criminalDocuments: [], criminalScreenshots: [],
        identityDocuments: [], identityScreenshots: [],
        checks: normalizeChecks(merged.checks),
        _autoFields: ["name","caseId","gender","dob","clientName","clientCaseId","color","allocationDate","deliveryDate","assignedCompany"],
      };
 
      localStorage.setItem("selectedCaseForReport",      JSON.stringify(merged));
      localStorage.setItem("latestGenerateReportCaseId", safeValue(merged.caseId));
      localStorage.setItem("lastPrefilledReportCase",    JSON.stringify(prefilled));
      saveReportToTrack(merged, normalizeChecks(merged.checks));
      navigate("/admin/generate-report", { state: { prefilled } });
    } catch { alert("Case data could not be fetched. Please try again."); }
    finally { setLoadingReportId(null); }
  };
 
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
 
      {/* ── Global scrollbar styles ─────────────────────────────────────────
          Always-visible scrollbars everywhere.
          .tbl-wrap hides its own scrollbar — the sticky top one is used.
          .top-hscroll styles the sticky scrollbar itself. */}
      <style>{`
        ::-webkit-scrollbar                    { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track              { background: #f1f5f9; border-radius: 8px; }
        ::-webkit-scrollbar-thumb              { background: #94a3b8; border-radius: 8px; border: 2px solid #f1f5f9; }
        ::-webkit-scrollbar-thumb:hover        { background: #64748b; }
        ::-webkit-scrollbar-corner             { background: #f1f5f9; }
        .tbl-wrap::-webkit-scrollbar            { display: none; }
.tbl-wrap                               { -ms-overflow-style: none; scrollbar-width: none; }
.fixed-hscroll::-webkit-scrollbar       { height: 14px; }
.fixed-hscroll::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 0; }
.fixed-hscroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 6px; border: 3px solid #e2e8f0; }
.fixed-hscroll::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
 
      {/* ── Stop Cases Modal ─────────────────────────────────────────────── */}
      {showStopModal && (
        <StopCasesModal
          count={selectedCaseIds.size}
          onConfirm={handleConfirmStop}
          onCancel={() => setShowStopModal(false)}
        />
      )}
 
      <div className="max-w-[1600px] mx-auto">
 
        {/* ── TOP CONTROL CARD ──────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-4">
 
          {/* Header row */}
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Cases</h1>
              <p className="text-slate-500 mt-1">Case management and client filtering</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-2.5 text-sm font-semibold rounded-xl shadow transition cursor-pointer">
                📁 Upload Folder
                <input
                  type="file"
                  multiple
                  webkitdirectory="true"
                  directory="true"
                  onChange={handleFolderUpload}
                  className="hidden"
                />
              </label>

              <label className={`bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-2.5 text-sm font-semibold rounded-xl shadow transition cursor-pointer ${excelUploading ? "opacity-60 pointer-events-none" : ""}`}>
                {excelUploading ? "⏳ Uploading..." : "📊 Upload Excel"}
                <input
                  ref={adminExcelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleAdminExcelUpload}
                  className="hidden"
                  disabled={excelUploading}
                />
              </label>

              <button
                onClick={() => setShowAddRow(!showAddRow)}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 text-sm font-semibold rounded-xl shadow transition"
              >
                {showAddRow ? "✕ Cancel Adding" : "+ Add Row"}
              </button>
            </div>
          </div>
 
          {/* Case overview + Clients grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-7">
 
            {/* ── Case Overview ──────────────────────────────────────── */}
            <div className="xl:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-semibold text-slate-700">Case Overview</h2>
                <button
                  onClick={() => { setSelectedCaseFlow("ALL"); setSelectedClient("ALL"); setStatus("ALL"); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCaseFlow === "ALL" && selectedClient === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Show All Cases
                </button>
              </div>
              {/* Three flow buttons — Open / Closed / Stopped */}
              <div className="flex flex-col sm:flex-row gap-3">
                <OpenCasesButton
                  count={openCasesCount}
                  selected={selectedCaseFlow === "OPEN"}
                  onClick={() => { setSelectedCaseFlow("OPEN"); setStatus("ALL"); }}
                />
                <ClosedCasesButton
                  count={closedCasesCount}
                  selected={selectedCaseFlow === "CLOSED"}
                  onClick={() => { setSelectedCaseFlow("CLOSED"); setStatus("ALL"); }}
                />
                <StoppedCasesButton
                  count={stoppedCasesCount}
                  selected={selectedCaseFlow === "STOPPED"}
                  onClick={() => { setSelectedCaseFlow("STOPPED"); setStatus("ALL"); }}
                />
              </div>
            </div>
 
            {/* ── Clients ────────────────────────────────────────────── */}
            <div className="xl:col-span-1">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-base font-semibold text-slate-700">Clients</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedClient("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      selectedClient === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setShowAddClient(!showAddClient)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                  >
                    {showAddClient ? "Cancel" : "+ Add"}
                  </button>
                </div>
              </div>
 
              {showAddClient && (
                <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Client name"
                      value={newClientName}
                      onChange={e => setNewClientName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddClient()}
                      className="flex-1 border border-indigo-300 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                      onClick={handleAddClient}
                      disabled={addingClient}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      {addingClient ? "..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
 
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                {clientCards.length > 0 ? (
                  clientCards.map(client => (
                    <ClientCard
                      key={client.companyId}
                      client={client}
                      active={selectedClient === client.name}
                      onSelect={setSelectedClient}
                      onDelete={deleteClient}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                    No clients yet. Click "+ Add" to create one.
                  </div>
                )}
              </div>
            </div>
          </div>
 
          {/* ── Search & Filter row ─────────────────────────────────────── */}
          <div className="flex gap-3 flex-wrap items-center">
            <input
              placeholder="Search by name / case id / client..."
              className="border border-slate-300 px-4 py-2.5 rounded-xl w-72 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="border border-slate-300 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
 
            {/* Active filter chips */}
            {selectedCaseFlow !== "ALL" && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-xs border ${
                selectedCaseFlow === "OPEN"    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : selectedCaseFlow === "STOPPED" ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-slate-100 text-slate-700 border-slate-300"
              }`}>
                {selectedCaseFlow === "OPEN" ? "📂 Open Cases" : selectedCaseFlow === "STOPPED" ? "🛑 Stopped Cases" : "📁 Closed Cases"}
                <button onClick={() => setSelectedCaseFlow("ALL")} className="text-base leading-none opacity-60 hover:opacity-100">×</button>
              </div>
            )}
            {selectedClient !== "ALL" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-200">
                👤 {safeValue(selectedClient)}
                <button onClick={() => setSelectedClient("ALL")} className="ml-1 text-indigo-400 hover:text-indigo-700 text-base leading-none">×</button>
              </div>
            )}
            {selectedCaseIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 text-violet-700 font-semibold text-xs border border-violet-200">
                ✓ {selectedCaseIds.size} selected
                <button onClick={() => setSelectedCaseIds(new Set())} className="ml-1 text-violet-400 hover:text-violet-700 text-base leading-none">×</button>
              </div>
            )}
            <span className="ml-auto text-xs text-slate-400 font-medium">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
 
        {/* ── COMPANY SENT FOLDERS ────────────────────────────────────────── */}
        {companyFolderCases.length > 0 && (
          <div className="mb-4 bg-white rounded-3xl shadow-sm border border-indigo-200 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">📁 Client Sent Folders</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Folders sent from client portal. Open a folder, view documents, then add a manual case from the same panel.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                {companyFolderCases.length} folder{companyFolderCases.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {companyFolderCases.map(fc => (
                <div key={safeValue(fc.caseId)} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                      📁
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{safeValue(fc.clientName) || "Client"}</p>
                      <p className="text-xs text-slate-500 truncate">Case ID: {safeValue(fc.caseId)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(fc.verifiedDocuments || []).length} file{(fc.verifiedDocuments || []).length !== 1 ? "s" : ""} received
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openCompanyFolderCase(fc)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      Open Folder + Add Case
                    </button>
                    <button
                      type="button"
                      onClick={() => hideCompanyFolderCard(fc.caseId)}
                      className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 px-3 py-2 rounded-xl text-sm font-bold transition"
                      title="Remove folder card from this screen only"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STOP CASES ACTION BAR ──────────────────────────────────────────
            Appears whenever one or more rows are selected.
            The red bar is prominent and contains the Stop button that opens
            the StopCasesModal where admin enters the remark. */}
        {selectedCaseIds.size > 0 && (
          <div className="mb-4 bg-rose-700 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl flex-shrink-0">
                🛑
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">
                  {selectedCaseIds.size} case{selectedCaseIds.size !== 1 ? "s" : ""} selected
                </p>
                <p className="text-rose-200 text-xs mt-0.5">
                  Use "Stop Cases with Remark" if the client doesn't want to proceed
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCaseIds(new Set())}
              className="text-rose-200 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-white/10 transition whitespace-nowrap"
            >
              Clear selection
            </button>
            <button
              onClick={() => setShowStopModal(true)}
              className="bg-white text-rose-700 hover:bg-rose-50 font-bold px-5 py-2.5 rounded-xl text-sm shadow transition whitespace-nowrap flex items-center gap-2"
            >
              🛑 Stop Cases with Remark
            </button>
          </div>
        )}
 
        {/* ── STICKY TOP HORIZONTAL SCROLLBAR ───────────────────────────────
            position:sticky + top:0 means this scrollbar is ALWAYS visible at
            the top of the viewport — you never need to scroll down to find it.
            It is bidirectionally synced with the table wrapper via useEffect. */}
        <div
  ref={fixedScrollRef}
  className="fixed-hscroll"
  style={{
    position: "fixed",
    bottom: 0,
    left: 0,
    width: "100%",
    zIndex: 50,
    overflowX: "scroll",
    overflowY: "hidden",
    height: "18px",
    background: "#e2e8f0",
    borderTop: "2px solid #cbd5e1",
    scrollbarWidth: "thin",
    scrollbarColor: "#94a3b8 #e2e8f0",
  }}
>
  <div ref={phantomRef} style={{ height: "1px", minWidth: "2000px" }} />
</div>
{/* ── FOLDER UPLOAD + DOCUMENT PREVIEW PANEL ─────────────────────── */}
        {showFolderPanel && (
          <div className="mb-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Folder Documents + Manual Case Entry</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Select any uploaded file on the left, preview it in the center, and enter case details on the right.
                </p>
              </div>
              <button
                onClick={closeFolderPanel}
                className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 hover:text-white transition"
              >
                Close Folder
              </button>
            </div>

            <div className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 leading-tight">Adjust panel width</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Drag sliders to adjust Uploaded Files, Document Preview, and Add Case panels.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFolderPaneSizes({ files: 0.8, preview: 3.5, form: 0.8 })}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Reset Layout
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[0.8fr_3.5fr_0.8fr] gap-2 items-center">
                <label className="text-[11px] font-semibold text-slate-600 leading-tight">
                  Uploaded Files
                  <input
                    type="range"
                    min="0.6"
                    max="2"
                    step="0.1"
                    value={folderPaneSizes.files}
                    onChange={e => setFolderPaneSizes(prev => ({ ...prev, files: Number(e.target.value) }))}
                    className="w-full mt-0.5 h-[18px]"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-600 leading-tight">
                  Document Preview
                  <input
                    type="range"
                    min="2"
                    max="5"
                    step="0.1"
                    value={folderPaneSizes.preview}
                    onChange={e => setFolderPaneSizes(prev => ({ ...prev, preview: Number(e.target.value) }))}
                    className="w-full mt-0.5 h-[18px]"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-600 leading-tight">
                  Add Case Manually
                  <input
                    type="range"
                    min="0.6"
                    max="2"
                    step="0.1"
                    value={folderPaneSizes.form}
                    onChange={e => setFolderPaneSizes(prev => ({ ...prev, form: Number(e.target.value) }))}
                    className="w-full mt-0.5 h-[18px]"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: `minmax(180px, ${folderPaneSizes.files}fr) minmax(520px, ${folderPaneSizes.preview}fr) minmax(260px, ${folderPaneSizes.form}fr)` }}>
              {/* File list — 1/4 part */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="p-3 bg-slate-100 font-semibold text-sm text-slate-700 flex items-center justify-between">
                  <span>Uploaded Files</span>
                  <span className="text-xs text-slate-400">{folderFiles.length}</span>
                </div>

                <div className="max-h-[560px] overflow-y-auto">
                  {folderFiles.map((f, index) => (
                    <button
                      key={`${f.path}-${index}`}
                      type="button"
                      draggable
                      onDragStart={e => e.dataTransfer.setData("folder-file-index", String(index))}
                      onClick={() => setSelectedFolderFile(f)}
                      className={`w-full text-left px-3 py-2 border-b text-xs transition ${
                        selectedFolderFile?.path === f.path
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <p className="truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{f.path}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview — 1/4 part */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="p-3 bg-slate-100 font-semibold text-sm text-slate-700 flex items-center justify-between gap-2">
                  <span>Document Preview</span>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{Math.round(folderPreviewZoom * 100)}%</span>
                </div>

                <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFolderPreviewZoom(z => Math.min(3, Number((z + 0.2).toFixed(1))))}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    Zoom +
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderPreviewZoom(z => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    Zoom −
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderPreviewRotate(r => (r + 90) % 360)}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition"
                  >
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFolderPreviewZoom(1); setFolderPreviewRotate(0); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-200 transition"
                  >
                    Reset
                  </button>
                </div>

                <div className="h-[506px] bg-slate-50 overflow-auto border-t border-slate-100">
                  {!selectedFolderFile ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-slate-400 text-sm">Select a file</p>
                    </div>
                  ) : selectedFolderFile.type.startsWith("image/") ? (
                    <div
                      className="min-h-full min-w-full flex items-center justify-center p-4"
                      style={{
                        width: `${folderPreviewZoom * 100}%`,
                        height: `${folderPreviewZoom * 100}%`,
                      }}
                    >
                      <img
                        src={selectedFolderFile.url}
                        alt={selectedFolderFile.name}
                        onError={() => {
                          alert("Image preview could not open. Please check that the backend signed URL route is active, then click Open File.");
                        }}
                        style={{
                          transform: `rotate(${folderPreviewRotate}deg)`,
                          width: `${folderPreviewZoom * 100}%`,
                          maxWidth: "none",
                          maxHeight: "none",
                        }}
                        className="object-contain transition-all duration-200"
                      />
                    </div>
                  ) : selectedFolderFile.type === "application/pdf" || selectedFolderFile.type.startsWith("text/") ? (
                    <div
                      className="bg-white transition-all duration-200"
                      style={{
                        width: `${folderPreviewZoom * 100}%`,
                        height: `${folderPreviewZoom * 100}%`,
                        minWidth: `${folderPreviewZoom * 100}%`,
                        minHeight: `${folderPreviewZoom * 100}%`,
                        transform: `rotate(${folderPreviewRotate}deg)`,
                        transformOrigin: "top left",
                      }}
                    >
                      <iframe
                        src={selectedFolderFile.url}
                        title={selectedFolderFile.name}
                        style={{
                          width: "100%",
                          height: `${Math.max(506, 506 * folderPreviewZoom)}px`,
                          border: 0,
                        }}
                        className="bg-white"
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center px-4">
                      <div>
                        <p className="text-slate-700 text-sm font-semibold mb-1">Preview not supported in browser</p>
                        <p className="text-slate-400 text-xs mb-3">{selectedFolderFile.name}</p>
                        <a
                          href={selectedFolderFile.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
                        >
                          Open File
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual entry — remaining 2/4 part */}
              <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-4 max-h-[620px] overflow-y-auto">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2 sticky top-0 bg-blue-50/95 backdrop-blur z-10 pb-2">
                  <h3 className="font-bold text-slate-800">Add Case Manually</h3>
                  {selectedFolderFile && (
                    <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full max-w-full truncate">
                      Viewing: {selectedFolderFile.name}
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1 mb-3">Identity</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Case ID *" value={newCase.caseId} onChange={e => setNewCase({ ...newCase, caseId: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Full Name *" value={newCase.name} onChange={e => setNewCase({ ...newCase, name: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Email" value={newCase.email} onChange={e => setNewCase({ ...newCase, email: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Phone" value={newCase.phone} onChange={e => setNewCase({ ...newCase, phone: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Alternate Phone" value={newCase.alternatephone} onChange={e => setNewCase({ ...newCase, alternatephone: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Aadhar Number" value={newCase.adharnumber} onChange={e => setNewCase({ ...newCase, adharnumber: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Gender" value={newCase.gender} onChange={e => setNewCase({ ...newCase, gender: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Father Name" value={newCase.fatherName} onChange={e => setNewCase({ ...newCase, fatherName: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Date of Birth" value={newCase.dob} onChange={e => setNewCase({ ...newCase, dob: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="PAN Number" value={newCase.pan} onChange={e => setNewCase({ ...newCase, pan: e.target.value })} />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1 mb-3">Client Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      className="border border-blue-300 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={newCase.companyId}
                      onChange={e => handleClientDropdownChange(e.target.value)}
                    >
                      <option value="">Select Client</option>
                      {companies.map(comp => (
                        <option key={safeValue(comp.companyId)} value={safeValue(comp.companyId)}>
                          {safeValue(comp.name)}
                        </option>
                      ))}
                    </select>
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Client Case ID" value={newCase.clientCaseId} onChange={e => setNewCase({ ...newCase, clientCaseId: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 md:col-span-2" placeholder="SPOC Name" value={newCase.spocName} onChange={e => setNewCase({ ...newCase, spocName: e.target.value })} />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1 mb-3">Address</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <textarea className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} placeholder="Present Address" value={newCase.presentAddress} onChange={e => setNewCase({ ...newCase, presentAddress: e.target.value })} />
                    <textarea className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} placeholder="Permanent Address" value={newCase.permanentAddress} onChange={e => setNewCase({ ...newCase, permanentAddress: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="State" value={newCase.STATE} onChange={e => setNewCase({ ...newCase, STATE: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Pincode" value={newCase.pincode} onChange={e => setNewCase({ ...newCase, pincode: e.target.value })} />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1 mb-3">Employment</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Company" value={newCase.company} onChange={e => setNewCase({ ...newCase, company: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Designation" value={newCase.designation} onChange={e => setNewCase({ ...newCase, designation: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Duration" value={newCase.duration} onChange={e => setNewCase({ ...newCase, duration: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Employee ID" value={newCase.employeeId} onChange={e => setNewCase({ ...newCase, employeeId: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="CTC" value={newCase.ctc} onChange={e => setNewCase({ ...newCase, ctc: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Manager" value={newCase.manager} onChange={e => setNewCase({ ...newCase, manager: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 md:col-span-2" placeholder="Reason Leaving" value={newCase.reasonLeaving} onChange={e => setNewCase({ ...newCase, reasonLeaving: e.target.value })} />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1 mb-3">Education</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Institution" value={newCase.institution} onChange={e => setNewCase({ ...newCase, institution: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="University" value={newCase.university} onChange={e => setNewCase({ ...newCase, university: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Degree" value={newCase.degree} onChange={e => setNewCase({ ...newCase, degree: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Year" value={newCase.year} onChange={e => setNewCase({ ...newCase, year: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Registration" value={newCase.registration} onChange={e => setNewCase({ ...newCase, registration: e.target.value })} />
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Mode" value={newCase.mode} onChange={e => setNewCase({ ...newCase, mode: e.target.value })} />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1 mb-3">Criminal</p>
                  <textarea className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none w-full" rows={2} placeholder="Criminal Details" value={newCase.criminalDetails} onChange={e => setNewCase({ ...newCase, criminalDetails: e.target.value })} />
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1 mb-3">Verification</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      className="border border-blue-300 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={newCase.status}
                      onChange={e => setNewCase({ ...newCase, status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <input className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Total Cost" value={newCase.totalCost} onChange={e => setNewCase({ ...newCase, totalCost: e.target.value })} />
                    <textarea className="border border-blue-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none md:col-span-2" rows={2} placeholder="Verification Summary" value={newCase.verificationSummary} onChange={e => setNewCase({ ...newCase, verificationSummary: e.target.value })} />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Select Checks</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {CHECK_CARDS.map(card => {
                      const active = newCase.checks.includes(card.key);
                      return (
                        <button
                          key={card.key}
                          type="button"
                          onClick={() => toggleNewCaseCheck(card.key)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition ${
                            active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-300"
                          }`}
                        >
                          {card.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Upload Images / PDF</p>
                  <div
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleManualDrop}
                    onClick={() => manualDocInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 bg-white hover:bg-blue-50 rounded-2xl p-4 cursor-pointer transition"
                  >
                    <input
                      ref={manualDocInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,application/pdf"
                      onChange={handleManualDocInput}
                      className="hidden"
                    />
                    <div className="text-center">
                      <p className="text-sm font-bold text-blue-700">📤 Upload / Drag & Drop Documents</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Upload maximum 6 images or PDF files. You can also drag files from the Uploaded Files list and drop here.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">{manualUploadedDocs.length}/6 selected</p>
                    </div>
                  </div>

                  {manualUploadedDocs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      {manualUploadedDocs.map(doc => (
                        <div key={doc.key} className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl p-2">
                          <button
                            type="button"
                            onClick={() => setSelectedFolderFile({ name: doc.originalName, path: doc.originalName, type: doc.mimeType, url: doc.dataUrl })}
                            className="flex-1 min-w-0 text-left"
                            title="Preview this uploaded document"
                          >
                            <p className="text-xs font-semibold text-slate-700 truncate">{doc.mimeType === "application/pdf" ? "📄" : "🖼️"} {doc.originalName}</p>
                            <p className="text-[10px] text-slate-400 truncate">Will show in View / Edit → {doc.type} documents</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeManualDocument(doc.key)}
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold transition"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4 flex-wrap sticky bottom-0 bg-blue-50/95 backdrop-blur pt-3">
                  <button
                    onClick={handleSaveNewRow}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
                  >
                    Save Case
                  </button>
                  <button
                    type="button"
                    onClick={clearManualForm}
                    className="bg-white text-slate-600 border border-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                  >
                    Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={() => manualDocInputRef.current?.click()}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    Upload Image/PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CASES TABLE ────────────────────────────────────────────────────
            .tbl-wrap hides its own scrollbar — horizontal scrolling is done
            exclusively via the sticky scrollbar above. */}
        <div
          ref={tableWrapperRef}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 tbl-wrap"
          style={{ overflowX: "auto", overflowY: "visible" }}
        >
          <table className="min-w-[2000px] w-full">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                {/* Checkbox — Select All */}
                <th className="p-4 text-left whitespace-nowrap w-12">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={handleSelectAll}
                      className="h-4 w-4 cursor-pointer accent-violet-600 rounded"
                      title={allSelected ? "Deselect all" : "Select all visible"}
                    />
                    <span className="text-xs font-semibold text-slate-500">All</span>
                  </div>
                </th>
                {[
                  "Name", "Case ID", "Client", "Client Case ID",
                  "Checks", "Status", "Received", "Closed",
                  "Assign", "Update", "Action", "Report", "Delete",
                ].map(h => (
                  <th key={h} className="p-4 text-left text-sm font-semibold text-slate-700 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
 
            <tbody>
 
              {/* ── ADD NEW ROW ──────────────────────────────────────── */}
              {showAddRow && (
                <tr className="border-t bg-blue-50/60 align-top">
                  <td className="p-3 text-slate-400">—</td>
                  <td className="p-3">
                    <input
                      autoFocus
                      placeholder="Candidate Name *"
                      className="border border-blue-300 px-3 py-2 w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={newCase.name}
                      onChange={e => setNewCase({ ...newCase, name: e.target.value })}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      placeholder="Case ID *"
                      className="border border-blue-300 px-3 py-2 w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={newCase.caseId}
                      onChange={e => setNewCase({ ...newCase, caseId: e.target.value })}
                    />
                  </td>
                  <td className="p-3">
                    <select
                      className="border border-blue-300 px-3 py-2 w-full rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={newCase.companyId}
                      onChange={e => handleClientDropdownChange(e.target.value)}
                    >
                      <option value="">Select Client</option>
                      {companies.map(comp => (
                        <option key={safeValue(comp.companyId)} value={safeValue(comp.companyId)}>
                          {safeValue(comp.name)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      placeholder="Client Case ID"
                      className="border border-blue-300 px-3 py-2 w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={newCase.clientCaseId}
                      onChange={e => setNewCase({ ...newCase, clientCaseId: e.target.value })}
                    />
                  </td>
                  <td className="p-3 min-w-[280px]">
                    <div className="grid grid-cols-2 gap-2">
                      {CHECK_CARDS.map(card => {
                        const active = newCase.checks.includes(card.key);
                        return (
                          <button
                            key={card.key}
                            type="button"
                            onClick={() => toggleNewCaseCheck(card.key)}
                            className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition ${
                              active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-300"
                            }`}
                          >
                            {card.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className="border border-blue-300 px-3 py-2 w-full rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={newCase.status}
                      onChange={e => setNewCase({ ...newCase, status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-sm text-slate-400">Today</td>
                  <td className="p-3 text-sm text-slate-400">—</td>
                  <td className="p-3 text-sm text-slate-400">—</td>
                  <td className="p-3 text-sm text-slate-400">—</td>
                  <td className="p-3">
                    <button
                      onClick={handleSaveNewRow}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition whitespace-nowrap"
                    >
                      Save Row
                    </button>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/admin/case/${encodeURIComponent(newCase.caseId || "new")}`, { state: { manualData: newCase } })}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition whitespace-nowrap"
                    >
                      Add Details
                    </button>
                  </td>
                  <td className="p-3 text-sm text-slate-400">—</td>
                </tr>
              )}
 
              {/* ── DATA ROWS ───────────────────────────────────────── */}
              {filtered.map(c => {
                const caseId        = safeValue(c.caseId);
                const isOpen        = openChecksDropdown === caseId;
                const currentChecks = normalizeChecks(c.checks);
                const trackReports  = getTrackReports();
                const hasReport     = !!trackReports[caseId];
                const isRowSelected = selectedCaseIds.has(caseId);
                const isStopped     = safeStatus(c.status) === "STOPPED";
 
                return (
                  <tr
                    key={caseId}
                    className={`border-t transition-colors ${
                      isRowSelected ? "bg-violet-50 hover:bg-violet-100"
                      : isStopped   ? "bg-rose-50/30 hover:bg-rose-50/60"
                      :               "hover:bg-slate-50"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={() => handleToggleSelectCase(caseId)}
                        className="h-4 w-4 cursor-pointer accent-violet-600 rounded"
                      />
                    </td>
 
                    {/* Name — shows stop remark below if stopped */}
                    <td className="p-4 max-w-[180px]">
                      <p className="font-medium text-slate-800 truncate">{safeValue(c.name) || "—"}</p>
                      {isStopped && c.stopRemark && (
                        <p
                          className="text-[11px] text-rose-600 mt-1 leading-snug"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                          title={c.stopRemark}
                        >
                          🛑 {c.stopRemark}
                        </p>
                      )}
                    </td>
 
                    {/* Case ID */}
                    <td className="p-4 text-xs text-slate-500 font-mono whitespace-nowrap">{caseId || "—"}</td>
 
                    {/* Client */}
                    <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{safeValue(c.clientName) || "—"}</td>
 
                    {/* Client Case ID */}
                    <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{safeValue(c.clientCaseId) || "—"}</td>
 
                    {/* Checks dropdown */}
                    <td className="p-4 min-w-[320px]">
                      <ChecksDropdown
                        caseId={caseId}
                        currentChecks={currentChecks}
                        isOpen={isOpen}
                        savingFor={savingChecksFor}
                        dropdownRef={isOpen ? checksDropdownRef : null}
                        onToggleOpen={() => setOpenChecksDropdown(prev => prev === caseId ? null : caseId)}
                        onToggleCheck={checkKey => toggleExistingCaseCheck(caseId, c.checks, checkKey)}
                      />
                    </td>
 
                    {/* Status + Report Ready badge */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={safeStatus(c.status)} />
                        {hasReport && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold w-fit border border-emerald-200">
                            ✓ Report Ready
                          </span>
                        )}
                      </div>
                    </td>
 
                    {/* Received */}
                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                      {c.receivedDate ? new Date(c.receivedDate).toLocaleDateString("en-IN") : "—"}
                    </td>
 
                    {/* Closed */}
                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                      {c.closedDate && c.closedDate !== "Open"
                        ? new Date(c.closedDate).toLocaleDateString("en-IN")
                        : <span className="text-emerald-600 font-medium">Open</span>
                      }
                    </td>
 
                    {/* Assign company */}
                    <td className="p-4">
                      <select
                        value={getDropdownValue(c)}
                        onChange={e => assignCompany(caseId, e.target.value)}
                        className="border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {companies.map(comp => (
                          <option key={safeValue(comp.companyId)} value={safeValue(comp.companyId)}>
                            {safeValue(comp.name)}
                          </option>
                        ))}
                      </select>
                    </td>
 
                    {/* Update status */}
                    <td className="p-4">
                      <select
                        value={safeStatus(c.status)}
                        onChange={e => updateStatus(caseId, e.target.value)}
                        className="border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
 
                    {/* View / Edit */}
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/admin/case/${encodeURIComponent(caseId)}`)}
                        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
                      >
                        View / Edit
                      </button>
                    </td>
 
                    {/* Generate Report */}
                    <td className="p-4">
                      <button
                        onClick={() => handleGenerateReport(c)}
                        disabled={loadingReportId === caseId}
                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                      >
                        {loadingReportId === caseId ? "Fetching..." : "Gen Report"}
                      </button>
                    </td>
 
                    {/* Delete */}
                    <td className="p-4">
                      <button
                        onClick={() => deleteCase(caseId)}
                        className="bg-red-50 hover:bg-red-600 active:bg-red-700 text-red-600 hover:text-white border border-red-200 hover:border-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
 
              {/* ── EMPTY STATE ─────────────────────────────────────── */}
              {filtered.length === 0 && !showAddRow && (
                <tr>
                  <td colSpan={14} className="p-16 text-center">
                    <div className="text-5xl mb-3">
                      {selectedCaseFlow === "STOPPED" ? "🛑" : "📋"}
                    </div>
                    <p className="text-slate-400 font-medium text-lg">No cases found</p>
                    <p className="text-slate-300 text-sm mt-1">
                      {search || status !== "ALL" || selectedClient !== "ALL"
                        ? "Try adjusting your filters or search query"
                        : selectedCaseFlow === "STOPPED"
                          ? "No stopped cases yet. Stop cases using the action bar above."
                          : "Click '+ Add Row' to create the first case"
                      }
                    </p>
                  </td>
                </tr>
              )}
 
            </tbody>
          </table>
        </div>
 
        {/* ── TABLE FOOTER ──────────────────────────────────────────────────── */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{filtered.length}</strong> of{" "}
            <strong className="text-slate-600">{cases.length}</strong> cases
            {selectedCaseIds.size > 0 && (
              <span className="ml-2 text-violet-600 font-semibold">
                · {selectedCaseIds.size} selected
              </span>
            )}
          </span>
          <span>
            {openCasesCount} open · {closedCasesCount} closed · {stoppedCasesCount} stopped
          </span>
        </div>
 
      </div>
    </div>
  );
}
