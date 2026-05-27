import { useState } from "react";
import axios from "../utils/axios";
import { generateBGVReport } from "../utils/generateReport";

// ─────────────────────────────────────────────────────────────────────────────
// API BASE URL
// LOCAL DEV  (localhost) → http://localhost:5000
// LIVE SERVER (tervies.info) → https://tervies.info/api
// ─────────────────────────────────────────────────────────────────────────────
const API = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://tervies.info/api";

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  SUBMITTED:        "bg-blue-500",
  UNDER_REVIEW:     "bg-yellow-500",
  VERIFIED:         "bg-green-600",
  DISCREPANCY:      "bg-red-600",
  INSUFFICIENT:     "bg-orange-500",
  CLOSED:           "bg-slate-700",
  REPORT_GENERATED: "bg-emerald-600",
  QC_APPROVED:      "bg-emerald-600",
};

const STATUS_LABEL = {
  SUBMITTED:        "Submitted",
  UNDER_REVIEW:     "Under Review",
  VERIFIED:         "Verified",
  DISCREPANCY:      "Discrepancy Found",
  INSUFFICIENT:     "Insufficient Info",
  CLOSED:           "Closed",
  REPORT_GENERATED: "Report Generated",
  QC_APPROVED:      "QC Approved",
};

// The standard 3-step verification progress flow
const STATUS_FLOW = ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"];

// ─────────────────────────────────────────────────────────────────────────────
// CHECK ICONS
// ─────────────────────────────────────────────────────────────────────────────
const CHECK_ICON = {
  "Employment Check":                "💼",
  "Residential Address Check":       "🏠",
  "Educational Qualification Check": "🎓",
  "Identity Check (PAN Card)":       "🆔",
  "Identity Check (Aadhar Card)":    "🆔",
  "Criminal Police Record Check":    "👮",
  "Criminal Database Check":         "⚖️",
  "Professional Reference Check":    "🤝",
};

// ─────────────────────────────────────────────────────────────────────────────
// INDEXEDDB STORAGE (Replaces sessionStorage/localStorage quotas)
// ─────────────────────────────────────────────────────────────────────────────
const DB_NAME = "BGV_ReportsDB";
const DB_VERSION = 1;
const STORE_NAME = "reports";

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getReportFromDB(caseId) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(caseId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error("IndexedDB Get Error:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getTrackReports() {
  try { return JSON.parse(localStorage.getItem("track_reports") || "{}"); }
  catch { return {}; }
}

function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch { return iso; }
}

// Download a base64 data URL as a file (fallback only)
function downloadFromDataUrl(dataUrl, filename) {
  try {
    const link     = document.createElement("a");
    link.href      = dataUrl;
    link.download  = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || "bg-gray-500";
  const label = STATUS_LABEL[status] || (status || "").replace(/_/g, " ") || "Unknown";
  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold text-white ${color}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — CheckCard
// ─────────────────────────────────────────────────────────────────────────────
function CheckCard({ check }) {
  const icon = CHECK_ICON[check] || "✅";
  return (
    <div className="flex items-center gap-3 bg-slate-700/60 rounded-xl px-4 py-3 border border-slate-600 hover:border-slate-500 transition">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{check}</p>
        <p className="text-xs text-emerald-400 mt-0.5">✓ Included in verification</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({ currentStatus }) {
  const progressIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-2xl border border-slate-700">
      <h3 className="font-semibold mb-5 text-center text-slate-200 text-base">
        Verification Progress
      </h3>

      <div className="relative flex items-center mb-3">
        {STATUS_FLOW.map((step, i) => {
          const done    = i <= progressIndex;
          const current = i === progressIndex;
          const isLast  = i === STATUS_FLOW.length - 1;
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 ${
                  done
                    ? current
                      ? "bg-emerald-400 border-emerald-400 text-white shadow-lg shadow-emerald-400/30"
                      : "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-slate-700 border-slate-500 text-slate-400"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
              </div>
              {!isLast && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                  i < progressIndex ? "bg-emerald-600" : "bg-slate-600"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-1">
        {STATUS_FLOW.map((step, i) => {
          const done = i <= progressIndex;
          return (
            <div key={step} className="flex-1 text-center">
              <p className={`text-xs font-semibold ${done ? "text-emerald-400" : "text-slate-500"}`}>
                {step.replace(/_/g, " ")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — ReportBanner (shown for non-QC-approved reports)
// ─────────────────────────────────────────────────────────────────────────────
function ReportBanner({ name, reportGeneratedAt }) {
  return (
    <div className="bg-emerald-900/50 backdrop-blur border border-emerald-600/60 p-6 rounded-2xl shadow-2xl">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-700/60 flex items-center justify-center flex-shrink-0 shadow-inner">
          <span className="text-2xl">🎉</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-bold text-emerald-300 text-base">
              Background Verification Report is Ready
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide">
              Completed
            </span>
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed mb-3">
            The background verification report for{" "}
            <strong className="text-emerald-200">{name}</strong> has been successfully
            generated and is now available. Please contact your HR or recruitment team
            to obtain the official copy of the report.
          </p>
          {reportGeneratedAt && (
            <div className="flex items-center gap-2 bg-emerald-800/60 border border-emerald-700/50 px-3 py-2 rounded-lg w-fit">
              <span className="text-emerald-400 text-sm">📅</span>
              <div>
                <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-semibold">Generated On</p>
                <p className="text-xs font-medium text-emerald-200">{formatDateTime(reportGeneratedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — QCApprovedBanner + Download (shown when qcApproved is true)
// This is the key new component — allows client to download the PDF
// ─────────────────────────────────────────────────────────────────────────────
function QCApprovedDownloadSection({ report, hasServerReport, onDownloadPdf, onDownloadDoc, verifiedDocs, downloadMsg, isPdfLoading }) {
  const hasPdf = !!report?.hasFullReport || hasServerReport;// IndexedDB check flag
  const hasDocs = verifiedDocs.length > 0;

  return (
    <div className="space-y-4">
      {/* QC Approved Banner */}
      <div className="bg-emerald-900/50 backdrop-blur border border-emerald-600/60 p-6 rounded-2xl shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-700/60 flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="text-2xl">📋</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-bold text-emerald-300 text-base">
                Quality Check Approved — Report Available
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide">
                QC Approved
              </span>
            </div>
            <p className="text-sm text-emerald-200/80 leading-relaxed mb-3">
              The background verification report for{" "}
              <strong className="text-emerald-200">{report?.name || "-"}</strong> has been
              reviewed by the Quality Check team and approved. You can download the
              official report below.
            </p>
            <div className="flex flex-wrap gap-3">
              {report?.qcApprovedAt && (
                <div className="flex items-center gap-2 bg-emerald-800/60 border border-emerald-700/50 px-3 py-2 rounded-lg">
                  <span className="text-emerald-400 text-sm">📅</span>
                  <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-semibold">QC Approved On</p>
                    <p className="text-xs font-medium text-emerald-200">{formatDateTime(report.qcApprovedAt)}</p>
                  </div>
                </div>
              )}
              {report?.reportGeneratedAt && (
                <div className="flex items-center gap-2 bg-emerald-800/60 border border-emerald-700/50 px-3 py-2 rounded-lg">
                  <span className="text-emerald-400 text-sm">📅</span>
                  <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-semibold">Report Generated</p>
                    <p className="text-xs font-medium text-emerald-200">{formatDateTime(report.reportGeneratedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Download success message */}
      {downloadMsg && (
        <div className="bg-emerald-600/20 border border-emerald-500/40 backdrop-blur px-5 py-3 rounded-xl text-sm font-medium text-center text-emerald-200">
          {downloadMsg}
        </div>
      )}

      {/* Download section */}
      <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <span>📥</span>
            <span>Download Verified Report</span>
          </h3>
          <span className="text-xs font-semibold bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            QC Approved
          </span>
        </div>

        <div className="space-y-3">
          {/* ✅ PDF download from IndexedDB (sent by QC team) */}
          {hasPdf && (
            <button
              onClick={onDownloadPdf}
              disabled={isPdfLoading}
              className={`flex justify-between items-center ${isPdfLoading ? 'bg-indigo-900/40 opacity-70 cursor-wait' : 'bg-indigo-800/50 hover:bg-indigo-700/70 hover:border-indigo-500'} border border-indigo-600/50 px-4 py-4 rounded-xl w-full transition text-left group`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-indigo-700/60 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                <strong className="text-emerald-200">{report?.name || "-"}</strong>
                  <p className="text-xs text-indigo-300 group-hover:text-indigo-200 transition mt-0.5">
                    QC-approved background verification report (PDF) — click to download
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-indigo-300 group-hover:text-white transition flex-shrink-0 ml-4 bg-indigo-700/40 group-hover:bg-indigo-600/60 px-3 py-1.5 rounded-lg">
                {isPdfLoading ? (
                  <span className="text-sm font-medium">Processing...</span>
                ) : (
                  <>
                    <span>⬇</span>
                    <span className="text-sm font-medium">Download PDF</span>
                  </>
                )}
              </div>
            </button>
          )}

          {/* Server-side verified documents */}
          {hasDocs && verifiedDocs.map((doc, i) => (
            <button
              key={i}
              onClick={() => onDownloadDoc(doc)}
              className="flex justify-between items-center bg-emerald-800/40 hover:bg-emerald-700/60 border border-emerald-600/40 hover:border-emerald-500 px-4 py-4 rounded-xl w-full transition text-left group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-700/60 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.originalName}</p>
                  <p className="text-xs text-emerald-300 group-hover:text-emerald-200 transition mt-0.5">
                    Verified document — click to download
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-300 group-hover:text-white transition flex-shrink-0 ml-4 bg-emerald-700/40 group-hover:bg-emerald-600/60 px-3 py-1.5 rounded-lg">
                <span>⬇</span>
                <span className="text-sm font-medium">Download</span>
              </div>
            </button>
          ))}

          {/* Nothing available yet */}
          {!hasPdf && !hasDocs && (
            <div className="flex items-center gap-3 text-slate-400 bg-slate-700/30 rounded-xl p-4">
              <span className="text-2xl">🕒</span>
              <p className="text-sm">
                The report document is being processed. Please check back shortly or
                contact your HR team with Case ID{" "}<span className="font-mono text-slate-300">{report?.caseId || "-"}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — DocumentCard (original, for server verified docs in non-QC flow)
// ─────────────────────────────────────────────────────────────────────────────
function DocumentCard({ doc, onDownload }) {
  const ext  = (doc.originalName || "").split(".").pop().toLowerCase();
  const icon = ext === "pdf" ? "📄"
             : ["doc", "docx"].includes(ext) ? "📝"
             : "📎";

  return (
    <button
      onClick={onDownload}
      className="flex justify-between items-center bg-emerald-800/40 hover:bg-emerald-700/60 border border-emerald-600/40 hover:border-emerald-500 px-4 py-4 rounded-xl w-full transition text-left group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-emerald-700/60 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{doc.originalName}</p>
          <p className="text-xs text-emerald-300 group-hover:text-emerald-200 transition mt-0.5">
            Verified document — click to download
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-emerald-300 group-hover:text-white transition flex-shrink-0 ml-4 bg-emerald-700/40 group-hover:bg-emerald-600/60 px-3 py-1.5 rounded-lg">
        <span className="text-sm">⬇</span>
        <span className="text-sm font-medium">Download</span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — CaseSummaryCard (original preserved, updated for QC)
// ─────────────────────────────────────────────────────────────────────────────
function CaseSummaryCard({
  name, caseId, clientName, clientCaseId,
  gender, dob, displayStatus, reportStatus,
  reportGeneratedAt, qcApproved, qcApprovedAt,
  onCopyId,
}) {
  return (
    <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-2xl border border-slate-700">
      {/* Top row */}
      <div className="flex justify-between items-start flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-2xl font-bold text-white truncate">{name}</h2>
            {qcApproved && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                QC Approved
              </span>
            )}
            {!qcApproved && reportStatus === "REPORT_GENERATED" && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                Report Ready
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">
            Case ID:{" "}
            <span className="text-slate-200 font-mono font-medium bg-slate-700/50 px-2 py-0.5 rounded text-xs">
              {caseId}
            </span>
          </p>
        </div>
        <button
          onClick={onCopyId}
          title="Copy Case ID to clipboard"
          className="text-sm bg-slate-700 hover:bg-slate-600 active:bg-slate-500 px-3 py-1.5 rounded-lg transition flex-shrink-0 flex items-center gap-1.5"
        >
          <span>📋</span>
          <span>Copy ID</span>
        </button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {clientName && (
          <div className="bg-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Client</p>
            <p className="text-sm font-medium text-slate-100">{clientName}</p>
          </div>
        )}
        {clientCaseId && (
          <div className="bg-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Client Case ID</p>
            <p className="text-sm font-medium text-slate-100 font-mono">{clientCaseId}</p>
          </div>
        )}
        {gender && (
          <div className="bg-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Gender</p>
            <p className="text-sm font-medium text-slate-100">{gender}</p>
          </div>
        )}
        {dob && (
          <div className="bg-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Date of Birth</p>
            <p className="text-sm font-medium text-slate-100">{dob}</p>
          </div>
        )}
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <StatusBadge status={displayStatus} />
        {qcApproved && (
          <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-600 text-white flex items-center gap-1.5">
            ✅ QC Approved
          </span>
        )}
        {!qcApproved && reportStatus === "REPORT_GENERATED" && (
          <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-600 text-white flex items-center gap-1.5">
            ✅ Report Generated
          </span>
        )}
      </div>

      {/* Timestamps */}
      {qcApproved && qcApprovedAt && (
        <p className="text-xs text-slate-400 mt-2">
          QC approved:{" "}
          <span className="text-emerald-400 font-medium">{formatDateTime(qcApprovedAt)}</span>
        </p>
      )}
      {!qcApproved && reportGeneratedAt && (
        <p className="text-xs text-slate-400 mt-2">
          Report generated on:{" "}
          <span className="text-emerald-400 font-medium">{formatDateTime(reportGeneratedAt)}</span>
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — SearchBox (original preserved)
// ─────────────────────────────────────────────────────────────────────────────
function SearchBox({ query, setQuery, onSearch, loading }) {
  return (
    <div className="w-full max-w-xl">
      <div className="flex gap-3 mb-3">
        <input
          className="flex-1 px-4 py-3 rounded-xl text-black text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
          placeholder="Enter Case ID, Client Case ID or Candidate Name"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSearch()}
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold shadow-lg transition text-sm whitespace-nowrap flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span>Searching...</span>
            </>
          ) : (
            <><span>🔍</span><span>Track</span></>
          )}
        </button>
      </div>
      <p className="text-xs text-slate-500 text-center">
        Search by Case ID, Client Case ID, or candidate name
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — EmptyState (original preserved)
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="text-center mt-12 select-none">
      <div className="text-7xl mb-5">🔍</div>
      <h3 className="text-xl font-semibold text-slate-300 mb-2">Track Your Verification</h3>
      <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
        Enter your Case ID, Client Case ID, or candidate name above to check the
        real-time status of your background verification
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <div className="text-2xl mb-1">📄</div>
          <p className="text-xs text-slate-400">Case ID</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <div className="text-2xl mb-1">🏢</div>
          <p className="text-xs text-slate-400">Client Case ID</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <div className="text-2xl mb-1">👤</div>
          <p className="text-xs text-slate-400">Name</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — NotFoundState (original preserved)
// ─────────────────────────────────────────────────────────────────────────────
function NotFoundState({ query }) {
  return (
    <div className="text-center mt-8 max-w-md mx-auto">
      <div className="text-6xl mb-4">🚫</div>
      <h3 className="text-xl font-semibold text-slate-300 mb-2">No Case Found</h3>
      <p className="text-slate-400 text-sm mb-4">
        We could not find a case matching{" "}
        <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-slate-200">{query}</span>
      </p>
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-left">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Try searching with:</p>
        <ul className="text-sm text-slate-300 space-y-1.5">
          <li>• Your exact Case ID (e.g. TVS/EDU/2026-1)</li>
          <li>• Your Client Case ID</li>
          <li>• Your full candidate name</li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — TrackStatus
// ─────────────────────────────────────────────────────────────────────────────
export default function TrackStatus() {
  const [query,       setQuery]       = useState("");
  const [serverData,  setServerData]  = useState(null);
  const [localReport, setLocalReport] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [error,       setError]       = useState("");
  const [downloadMsg, setDownloadMsg] = useState("");
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // ── Search ──────────────────────────────────────────────────────────────────
  const track = async () => {
    const q = query.trim();
    if (!q) {
      setError("Please enter a Case ID or name to search");
      return;
    }

    setLoading(true);
    setError("");
    setServerData(null);
    setLocalReport(null);
    setSearched(false);
    setDownloadMsg("");

    // Step 1: Search localStorage track_reports (metadata written by QC team)
    const allReports = getTrackReports();
    const foundLocal  = Object.values(allReports).find(r => {
      const qLow = q.toLowerCase();
      return (
        (r.caseId       || "").toLowerCase() === qLow ||
        (r.clientCaseId || "").toLowerCase() === qLow ||
        (r.name         || "").toLowerCase().includes(qLow)
      );
    }) || null;

    // Step 2: Query server for live status + verified documents
    let foundServer = null;
    try {
      const res = await axios.get(`${API}/track/${encodeURIComponent(q)}`);
      if (res.data?.success) foundServer = res.data;
    } catch {
      // Server unavailable — localStorage data still shown
    }

    setLocalReport(foundLocal);
    setServerData(foundServer);
    setSearched(true);

    if (!foundLocal && !foundServer) {
      setError(`No case found for "${q}". Please check the details and try again.`);
    }

    setLoading(false);
  };

  // ── Download PDF using generateBGVReport with full report from IndexedDB ─────────
  const handleDownloadPdf = async () => {
    const cid = serverData?.caseId || localReport?.caseId || "";
    setIsPdfLoading(true);
    setDownloadMsg("");
  
    try {
      // ✅ Use /api/track/report — correct path, works on ANY device
      if (serverData?.hasReport) {
        window.open(`${API}/track/report/${cid}`, "_blank");
        // API is already "https://tervies.info/api"
        // so this becomes: https://tervies.info/api/track/report/TVS-1 ✅
        setDownloadMsg("✅ Report downloaded successfully!");
        setTimeout(() => setDownloadMsg(""), 4000);
        return;
      }
  
      // Fallback: IndexedDB (same laptop only)
      const full = await getReportFromDB(cid);
      if (full) {
        generateBGVReport(full);
        setDownloadMsg("✅ Report downloaded!");
        setTimeout(() => setDownloadMsg(""), 4000);
        return;
      }
  
      if (localReport?.pdfDataUrl) {
        const safeName = (localReport.name || cid).replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadFromDataUrl(localReport.pdfDataUrl, `BGV_Report_${safeName}.pdf`);
        setDownloadMsg("✅ Report downloaded!");
        setTimeout(() => setDownloadMsg(""), 4000);
        return;
      }
  
      alert("Report not on server yet.\nAsk QC team to upload it.\nCase ID: " + cid);
    } catch (err) {
      console.error("Download error:", err);
      alert("Error downloading. Please try again.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  // ── Download verified doc from server ──────────────────────────────────────
  const downloadDoc = async (doc) => {
    const caseId = localReport?.caseId || serverData?.caseId || "";
    try {
      const encoded  = encodeURIComponent(doc.key);
      const response = await axios.get(
        `${API}/track/download/${caseId}/${encoded}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data]);
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = doc.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloadMsg("✅ Document downloaded successfully!");
      setTimeout(() => setDownloadMsg(""), 4000);
    } catch {
      alert("Download failed. Please try again or contact the verification team.");
    }
  };

  // ── Copy Case ID ────────────────────────────────────────────────────────────
  const copyId = () => {
    const id = localReport?.caseId || serverData?.caseId || "";
    if (!id) return;
    navigator.clipboard.writeText(id)
      .then(() => alert("Case ID copied to clipboard"))
      .catch(() => alert(`Your Case ID: ${id}`));
  };

  // ── Derive display values ───────────────────────────────────────────────────
  const name              = localReport?.name              || serverData?.name             || "-";
  const caseId            = localReport?.caseId            || serverData?.caseId           || "-";
  const clientName        = localReport?.clientName        || serverData?.clientName       || "";
  const clientCaseId      = localReport?.clientCaseId      || serverData?.clientCaseId     || "";
  const gender            = localReport?.gender            || serverData?.gender           || "";
  const dob               = localReport?.dob               || serverData?.dob              || "";
  const displayStatus     = serverData?.status             || localReport?.status          || "SUBMITTED";
  const reportStatus      = localReport?.reportStatus      || null;
  const reportGeneratedAt = localReport?.reportGeneratedAt || serverData?.reportGeneratedAt || null;
  const checks            = (localReport?.checks?.length ? localReport.checks : serverData?.checks) || [];
  const verifiedDocs      = serverData?.verifiedDocuments  || [];
  const hasResult         = !!(localReport || serverData);

  // ── QC approval flag ────────────────────────────────────────────────────────
  // Only show download when QC team has explicitly approved (qcApproved: true)
  const qcApproved   = localReport?.qcApproved === true || serverData?.qcApproved === true;
  const qcApprovedAt = localReport?.qcApprovedAt || serverData?.qcApprovedAt || null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white flex flex-col items-center px-4 py-10 md:py-14">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 px-4 py-1.5 rounded-full text-indigo-300 text-xs font-semibold uppercase tracking-wide mb-4">
          <span>💼</span>
          <span>Background Verification System</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Verification Status Tracker
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Search your case using Case ID, Client Case ID, or candidate name to view
          real-time verification status and report availability
        </p>
      </div>

      {/* ── SEARCH BOX ──────────────────────────────────────────────────────── */}
      <SearchBox
        query={query}
        setQuery={setQuery}
        onSearch={track}
        loading={loading}
      />

      {/* ── ERROR MESSAGE ────────────────────────────────────────────────────── */}
      {error && (
        <div className="mt-6 bg-red-600/20 border border-red-500/40 backdrop-blur px-5 py-4 rounded-xl text-sm font-medium max-w-xl w-full text-center text-red-200">
          <span className="text-red-400 mr-2">⚠️</span>
          {error}
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────────────────────────────── */}
      {!hasResult && !loading && !searched && <EmptyState />}

      {/* ── NOT FOUND STATE ─────────────────────────────────────────────────── */}
      {!hasResult && searched && !loading && <NotFoundState query={query} />}

      {/* ── RESULT SECTION ──────────────────────────────────────────────────── */}
      {hasResult && (
        <div className="w-full max-w-2xl mt-8 space-y-5">

          {/* 1. Case Summary Card */}
          <CaseSummaryCard
            name={name}
            caseId={caseId}
            clientName={clientName}
            clientCaseId={clientCaseId}
            gender={gender}
            dob={dob}
            displayStatus={displayStatus}
            reportStatus={reportStatus}
            reportGeneratedAt={reportGeneratedAt}
            qcApproved={qcApproved}
            qcApprovedAt={qcApprovedAt}
            onCopyId={copyId}
          />

          {/* 2. Progress Bar */}
          <ProgressBar currentStatus={displayStatus} />

          {/* 3. Checks Performed */}
          {checks.length > 0 && (
            <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-200">Verification Checks Performed</h3>
                <span className="text-xs font-semibold bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full">
                  {checks.length} check{checks.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {checks.map((check, i) => (
                  <CheckCard key={i} check={check} />
                ))}
              </div>
            </div>
          )}

          {/* ── 4a. QC Approved → show download section ─────────────────────── */}
          {qcApproved && (
  <QCApprovedDownloadSection
    report={localReport || serverData}
    hasServerReport={!!serverData?.hasReport}
    onDownloadPdf={handleDownloadPdf}
    onDownloadDoc={downloadDoc}
    verifiedDocs={verifiedDocs}
    downloadMsg={downloadMsg}
    isPdfLoading={isPdfLoading}
  />
)}

          {/* ── 4b. Not QC approved → show original report banner ───────────── */}
          {!qcApproved && reportStatus === "REPORT_GENERATED" && (
            <ReportBanner name={name} reportGeneratedAt={reportGeneratedAt} />
          )}

          {/* 5. Server verified docs (non-QC flow, original) */}
          {!qcApproved && verifiedDocs.length > 0 && (
            <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <span>📄</span><span>Verified Documents</span>
                </h3>
                <span className="text-xs font-semibold bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  {verifiedDocs.length} file{verifiedDocs.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {verifiedDocs.map((doc, i) => (
                  <DocumentCard
                    key={i}
                    doc={doc}
                    onDownload={() => downloadDoc(doc)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 6. Placeholder (original) */}
          {!qcApproved && reportStatus === "REPORT_GENERATED" && verifiedDocs.length === 0 && (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-5 rounded-2xl">
              <div className="flex items-center gap-3 text-slate-400">
                <span className="text-2xl">🕒</span>
                <p className="text-sm">
                  Official verified documents will appear here once they have been
                  processed and uploaded by the verification team.
                </p>
              </div>
            </div>
          )}

          {/* 7. Contact Info Footer (original) */}
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl text-center">
            <p className="text-xs text-slate-500">
              For any queries about your verification status, please contact your HR
              team or recruitment consultant with your Case ID{" "}
              <span className="font-mono bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">
                {caseId}
              </span>
            </p>
          </div>

        </div>
      )}

      {/* ── PAGE FOOTER (original) ───────────────────────────────────────────── */}
      <div className="mt-16 text-center text-slate-600 text-xs space-y-1">
        <p>Background Verification System — Secure &amp; Confidential</p>
        <p>All data is encrypted and access is strictly controlled</p>
        <p className="text-slate-700">©️ {new Date().getFullYear()} Tervies — tervies.info</p>
      </div>
    </div>
  );
}