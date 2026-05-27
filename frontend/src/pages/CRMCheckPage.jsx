import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { generateBGVReportAsBase64, logoBase64 as TERVIES_LOGO } from "../utils/generateReport";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ─────────────────────────────────────────────────────────────────────────────
// FAST HTML→PDF — used for S3 upload when sending to Track Status.
// Renders the existing HTML report preview into an offscreen div,
// screenshots it with html2canvas, and puts it in jsPDF.
// This NEVER hangs because it uses the browser's own rendering engine.
// The company sees the EXACT SAME report as the preview.
// ─────────────────────────────────────────────────────────────────────────────
async function createHtmlToPdfBlob(reportData) {
  // Build the full HTML report (same as preview, with images from S3)
  const previewImages = await collectPreviewImagesForHtml(reportData || {});
  const html = buildCRMCheckHtmlPreview(reportData || {}, previewImages);

  // Render into an offscreen container
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Wait for images to load
    await Promise.all(
      Array.from(container.querySelectorAll("img")).map(
        img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
      )
    );

    // Screenshot the rendered HTML
    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 794,
    });

    // Convert canvas to PDF using jsPDF
    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [794, canvas.height] });
    pdf.addImage(imgData, "JPEG", 0, 0, 794, canvas.height);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAST LIGHTWEIGHT PDF — used for S3 upload when sending to Track Status.
// Uses jsPDF (text-only, no images) so it never hangs. The company can
// download the report; it contains all key case data.
// ─────────────────────────────────────────────────────────────────────────────

const STYLE = `
  .qc-root {
    min-height: 100vh;
    background: #f4f7fb;
    padding: 32px 20px;
    font-family: Inter, system-ui, sans-serif;
  }
  .qc-wrap { max-width: 1150px; margin: 0 auto; }
  .qc-topbar {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; margin-bottom: 24px; flex-wrap: wrap;
  }
  .qc-title { font-size: 34px; font-weight: 800; color: #111827; margin: 0; }
  .qc-sub { color: #6b7280; font-size: 14px; margin-top: 6px; }
  .qc-btn {
    border: none; border-radius: 12px; padding: 12px 18px;
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    color: white; font-weight: 700; cursor: pointer;
    box-shadow: 0 8px 24px rgba(37,99,235,0.18); font-size: 14px;
    transition: opacity 0.15s;
  }
  .qc-btn:hover { opacity: 0.9; }
  .qc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .qc-btn-send {
    border: none; border-radius: 12px; padding: 12px 22px;
    background: linear-gradient(135deg, #059669, #10b981);
    color: white; font-weight: 700; cursor: pointer;
    box-shadow: 0 8px 24px rgba(16,185,129,0.25); font-size: 14px;
    transition: opacity 0.15s, transform 0.1s;
    display: flex; align-items: center; gap: 8px;
  }
  .qc-btn-send:hover { opacity: 0.92; transform: translateY(-1px); }
  .qc-btn-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .qc-btn-sent {
    border: 2px solid #10b981; border-radius: 12px; padding: 12px 22px;
    background: #ecfdf5; color: #065f46; font-weight: 700;
    cursor: default; font-size: 14px; display: flex; align-items: center; gap: 8px;
  }
  .qc-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .qc-card {
    background: white; border-radius: 20px; padding: 24px;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    margin-bottom: 18px; border: 1px solid #e5e7eb;
  }
  .qc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .qc-item {
    background: #f8fafc; border: 1px solid #e5e7eb;
    border-radius: 14px; padding: 14px;
  }
  .qc-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
    color: #64748b; font-weight: 700; margin-bottom: 6px;
  }
  .qc-edit-input, .qc-edit-textarea {
    width: 100%; border: none; outline: none; background: transparent;
    font-size: 15px; color: #111827; font-weight: 600; line-height: 1.5;
    font-family: inherit; padding: 0; margin: 0;
  }
  .qc-edit-textarea { resize: vertical; min-height: 78px; }
  .qc-section-title { font-size: 20px; font-weight: 800; margin: 0 0 16px; color: #111827; }
  .qc-check-pill-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
  .qc-pill {
    padding: 10px 14px; border-radius: 999px; background: #eef2ff;
    color: #3730a3; font-size: 13px; font-weight: 700; border: 1px solid #c7d2fe;
  }
  .qc-empty { text-align: center; padding: 70px 20px; color: #6b7280; }
  .qc-empty h2 { color: #111827; margin-bottom: 8px; }
  .qc-search-row {
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 0;
  }
  .qc-search-input {
    flex: 1; min-width: 260px; background: #f8fafc;
    border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px;
    font-size: 14px; color: #111827; outline: none;
  }
  .qc-search-input:focus {
    border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); background: #ffffff;
  }
  .qc-case-list { display: grid; gap: 12px; }
  .qc-case-btn {
    width: 100%; text-align: left; background: #f8fafc;
    border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 16px;
    cursor: pointer; transition: 0.2s ease; position: relative;
  }
  .qc-case-btn:hover { border-color: #2563eb; background: #eff6ff; }
  .qc-case-btn.active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .qc-case-btn.sent { border-color: #10b981; background: #f0fdf4; }
  .qc-case-id { font-size: 15px; font-weight: 800; color: #111827; padding-right: 110px; }
  .qc-case-meta { font-size: 13px; color: #6b7280; margin-top: 5px; }
  .qc-case-badge {
    display: inline-flex; align-items: center; gap: 4px;
    margin-top: 6px; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700;
  }
  .qc-case-badge.sent { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
  .qc-delete-btn {
    position: absolute; top: 50%; right: 14px; transform: translateY(-50%);
    background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;
    border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700;
    cursor: pointer; z-index: 2; transition: background 0.15s, box-shadow 0.15s;
    display: flex; align-items: center; gap: 5px; white-space: nowrap;
    line-height: 1;
  }
  .qc-delete-btn:hover { background: #fecaca; box-shadow: 0 2px 8px rgba(220,38,38,0.2); }
  .qc-images-wrap {
    margin-top: 16px; padding: 16px; background: #f8fafc;
    border-radius: 14px; border: 1px solid #e5e7eb;
  }
  .qc-images-grid { display: flex; gap: 12px; flex-wrap: wrap; }
  .qc-image-card {
    border: 1px solid #e5e7eb; padding: 4px; border-radius: 10px;
    background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    cursor: zoom-in; transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .qc-image-card:hover { transform: scale(1.04); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
  .qc-image-preview { height: 120px; width: 120px; object-fit: cover; border-radius: 6px; display: block; }
  .qc-file-card {
    border: 1px solid #e5e7eb; padding: 10px; border-radius: 10px;
    background: #fff; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    width: 120px; height: 120px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .qc-file-name {
    font-size: 10px; text-align: center; margin-top: 6px; max-width: 110px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: #64748b; padding: 0 4px;
  }
  .qc-send-banner {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border: 2px solid #6ee7b7; border-radius: 20px; padding: 24px;
    margin-bottom: 18px; display: flex; align-items: flex-start; gap: 16px;
  }
  .qc-send-banner-icon {
    width: 52px; height: 52px; border-radius: 14px; background: #10b981;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; flex-shrink: 0;
  }
  .qc-send-banner-title { font-size: 18px; font-weight: 800; color: #064e3b; margin-bottom: 6px; }
  .qc-send-banner-desc { font-size: 14px; color: #065f46; line-height: 1.5; margin-bottom: 14px; }
  .qc-already-sent-banner {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border: 2px solid #86efac; border-radius: 16px; padding: 16px 20px;
    margin-bottom: 18px; display: flex; align-items: center; gap: 12px;
    color: #166534; font-weight: 700; font-size: 14px;
  }
  .qc-preview-loading-overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55);
    z-index: 10000; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 20px;
  }
  .qc-preview-loading-box {
    background: white; border-radius: 20px; padding: 36px 48px;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.35); min-width: 300px;
  }
  .qc-preview-spinner {
    width: 48px; height: 48px; border: 5px solid #e5e7eb;
    border-top-color: #2563eb; border-radius: 50%;
    animation: qcSpin 0.8s linear infinite;
  }
  @keyframes qcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .qc-preview-loading-title { font-size: 17px; font-weight: 800; color: #111827; }
  .qc-preview-loading-sub { font-size: 13px; color: #6b7280; text-align: center; line-height: 1.5; }
  .qc-lightbox-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.88);
    z-index: 9999; display: flex; align-items: center;
    justify-content: center; animation: qcFadeIn 0.18s ease;
  }
  @keyframes qcFadeIn { from { opacity: 0; } to { opacity: 1; } }
  .qc-lightbox-inner {
    position: relative; display: flex; flex-direction: column;
    align-items: center; max-width: 92vw; max-height: 92vh;
  }
  .qc-lightbox-img {
    max-width: 88vw; max-height: 80vh; border-radius: 12px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6); transition: transform 0.2s ease;
    transform-origin: center center; cursor: grab; user-select: none;
  }
  .qc-lightbox-img:active { cursor: grabbing; }
  .qc-lightbox-controls { display: flex; gap: 12px; margin-top: 18px; align-items: center; }
  .qc-lb-btn {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
    color: #fff; border-radius: 10px; padding: 10px 18px; font-size: 14px;
    font-weight: 700; cursor: pointer; transition: background 0.15s; backdrop-filter: blur(6px);
  }
  .qc-lb-btn:hover { background: rgba(255,255,255,0.28); }
  .qc-lb-zoom-label { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; min-width: 48px; text-align: center; }
  .qc-lb-close {
    position: absolute; top: -40px; right: 0; background: rgba(255,255,255,0.15);
    border: none; color: #fff; font-size: 22px; border-radius: 50%;
    width: 36px; height: 36px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; backdrop-filter: blur(6px);
  }
  .qc-lb-nav {
    background: rgba(255,255,255,0.12); border: none; color: #fff; font-size: 26px;
    border-radius: 50%; width: 44px; height: 44px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    position: absolute; top: 50%; transform: translateY(-50%);
    backdrop-filter: blur(6px); transition: background 0.15s;
  }
  .qc-lb-nav:hover { background: rgba(255,255,255,0.25); }
  .qc-lb-nav.prev { left: -56px; }
  .qc-lb-nav.next { right: -56px; }
  .qc-detail-collapsed {
    padding: 16px 18px; background: #f8fafc; border: 1px solid #e5e7eb;
    border-radius: 14px; display: flex; align-items: center;
    justify-content: space-between; cursor: pointer;
    transition: 0.18s ease; margin-bottom: 18px;
  }
  .qc-detail-collapsed:hover { border-color: #2563eb; background: #eff6ff; }
  .qc-detail-collapsed-info { flex: 1; }
  .qc-detail-collapsed-name { font-size: 17px; font-weight: 800; color: #111827; }
  .qc-detail-collapsed-id { font-size: 13px; color: #6b7280; margin-top: 3px; }
  .qc-detail-chevron { font-size: 20px; color: #2563eb; transition: transform 0.2s; }
  .qc-detail-chevron.open { transform: rotate(180deg); }
  .qc-pdf-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    z-index: 9998; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .qc-pdf-modal-box {
    background: white; border-radius: 16px; width: 90vw; height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 24px 80px rgba(0,0,0,0.4);
  }
  .qc-pdf-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px; background: #1e293b; color: white; flex-shrink: 0;
  }
  .qc-pdf-modal-title { font-size: 15px; font-weight: 700; color: white; }
  .qc-pdf-modal-controls { display: flex; gap: 8px; align-items: center; }
  .qc-pdf-ctrl-btn {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
    color: white; border-radius: 8px; padding: 6px 14px; font-size: 13px;
    font-weight: 700; cursor: pointer; transition: background 0.15s;
  }
  .qc-pdf-ctrl-btn:hover { background: rgba(255,255,255,0.28); }
  .qc-pdf-zoom-label { color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 600; min-width: 44px; text-align: center; }
  .qc-pdf-close-btn {
    background: rgba(239,68,68,0.8); border: none; color: white;
    border-radius: 8px; padding: 6px 14px; font-size: 13px;
    font-weight: 700; cursor: pointer; margin-left: 12px;
  }
  .qc-pdf-close-btn:hover { background: rgba(239,68,68,1); }
  .qc-pdf-iframe-wrap {
    flex: 1; overflow: auto; background: #525659;
    display: flex; justify-content: center; padding: 20px;
  }
  .qc-pdf-iframe { border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.4); transform-origin: top center; transition: transform 0.2s ease; }

  /* ── Delete Confirm Modal ── */
  .qc-confirm-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 10001; display: flex; align-items: center; justify-content: center;
    animation: qcFadeIn 0.15s ease;
  }
  .qc-confirm-box {
    background: white; border-radius: 20px; padding: 32px 36px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.3); max-width: 420px; width: 90%;
    text-align: center;
  }
  .qc-confirm-icon { font-size: 48px; margin-bottom: 16px; }
  .qc-confirm-title { font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 8px; }
  .qc-confirm-desc { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
  .qc-confirm-cid { font-family: monospace; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; color: #dc2626; font-weight: 700; }
  .qc-confirm-actions { display: flex; gap: 12px; justify-content: center; }
  .qc-confirm-cancel {
    border: 2px solid #e5e7eb; border-radius: 12px; padding: 12px 24px;
    background: white; color: #374151; font-weight: 700; cursor: pointer; font-size: 14px;
    transition: border-color 0.15s;
  }
  .qc-confirm-cancel:hover { border-color: #9ca3af; }
  .qc-confirm-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
  .qc-confirm-delete {
    border: none; border-radius: 12px; padding: 12px 24px;
    background: linear-gradient(135deg, #dc2626, #ef4444);
    color: white; font-weight: 700; cursor: pointer; font-size: 14px;
    box-shadow: 0 8px 24px rgba(220,38,38,0.25); transition: opacity 0.15s;
    display: flex; align-items: center; gap: 8px;
  }
  .qc-confirm-delete:hover { opacity: 0.9; }
  .qc-confirm-delete:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 900px) {
    .qc-grid { grid-template-columns: 1fr; }
    .qc-lb-nav.prev { left: -40px; }
    .qc-lb-nav.next { right: -40px; }
  }
`;
// CRMCheckPage — 3-COLUMN LAYOUT
// Layout change only. All original logic, hooks, helpers and components are
// 100% identical to the original file. The only additions are:
//   1. splitPdfBlobUrl / isSplitPdfLoading state
//   2. handleGenerateSplitPdf() — same as handlePreviewPDF but targets col-2
//   3. CaseDocsPanel component — displays case docs in col-3
//   4. The return() JSX restructured into a 3-col flex layout
 
if (typeof document !== "undefined" && !document.getElementById("qc-style")) {
  const style = document.createElement("style");
  style.id = "qc-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}
 
const FILE_FIELDS = [
  "employmentDocuments","employmentScreenshots",
  "residentialDocuments","residentialScreenshots",
  "educationalAnnexureE","educationalScreenshots",
  "professionalAnnexureF","professionalScreenshots",
  "criminalDocuments","criminalScreenshots",
  "databaseAnnexureG","databaseScreenshots",
  "identityDocuments","identityScreenshots",
  "creditDocuments","creditScreenshots",
  "manualDocuments","documents","verifiedDocuments","uploadedManualFiles",
];
 
function normalizeFileFields(data) {
  const result = { ...data };
  FILE_FIELDS.forEach((field) => {
    const val = result[field];
    if (!val) {
      result[field] = [];
    } else if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        result[field] = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      } catch {
        result[field] = val.length > 0 ? [val] : [];
      }
    } else if (Array.isArray(val)) {
      result[field] = val.filter(Boolean);
    } else {
      result[field] = [];
    }
  });
  return result;
}
 
function isS3Key(val) {
  if (!val || typeof val !== "string") return false;
  if (val.startsWith("data:")) return false;
  if (val.startsWith("blob:")) return false;
  if (val.startsWith("http")) return false;
  return val.includes("/") || (!val.startsWith("{") && !val.startsWith("["));
}
 
async function fetchSignedUrls(keys) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("https://tervies.info/api/admin/get-signed-urls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keys }),
    });
    const data = await res.json();
    if (!data.success) return {};
    const map = {};
    (data.urls || []).forEach(({ key, url }) => { if (url) map[key] = url; });
    return map;
  } catch (err) {
    console.error("fetchSignedUrls error:", err);
    return {};
  }
}
 
async function urlToDataUrl(url) {
  try {
    if (!url) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn("Skipping missing/unavailable document:", res.status, url);
      return null;
    }

    const blob = await res.blob();

    // PDF report preview only embeds images. Skip PDFs/HTML/XML so pdfMake never hangs.
    if (!blob.type || !blob.type.startsWith("image/")) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.startsWith("data:image/") ? result : null);
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("urlToDataUrl skipped:", err?.message || err);
    return null;
  }
}
 
const CHECK_TO_FIELD_MAP = {
  "Employment Check":                "employmentDocuments",
  "Residential Address Check":       "residentialDocuments",
  "Educational Qualification Check": "educationalAnnexureE",
  "Identity Check (PAN Card)":       "identityDocuments",
  "Identity Check (Aadhar Card)":    "identityDocuments",
  "Criminal Police Record Check":    "criminalDocuments",
  "Criminal Database Check":         "databaseAnnexureG",
  "Professional Reference Check":    "professionalAnnexureF",
  "Credit Check":                    "creditDocuments",
};
 
async function resolveAllFilesForPDF(report) {
  const normalized = normalizeFileFields(report);
  const empDocs = report.checkDocuments || {};
  for (const [checkName, field] of Object.entries(CHECK_TO_FIELD_MAP)) {
    const docs = empDocs[checkName] || [];
    if (!docs.length) continue;
    const empKeys = docs.map(d => d.key).filter(Boolean);
    const existing = Array.isArray(normalized[field]) ? normalized[field] : [];
    const existingKeys = existing.map(item =>
      typeof item === "string" ? item : (item && item.key ? item.key : "")
    );
    const toAdd = empKeys.filter(k => !existingKeys.includes(k));
    normalized[field] = [...existing, ...toAdd];
  }
  const allKeys = [];
  FILE_FIELDS.forEach((field) => {
    (normalized[field] || []).forEach((item) => {
      if (isS3Key(item)) allKeys.push(item);
      else if (typeof item === "object" && item !== null && isS3Key(item.key)) allKeys.push(item.key);
    });
  });
  const signedUrlMap = allKeys.length > 0 ? await fetchSignedUrls(allKeys) : {};
  const dataUrlCache = {};
  await Promise.all(
    Object.entries(signedUrlMap).map(async ([key, url]) => {
      const dataUrl = await urlToDataUrl(url);
      if (dataUrl) dataUrlCache[key] = dataUrl;
    })
  );
  const resolved = { ...normalized };
  FILE_FIELDS.forEach((field) => {
    resolved[field] = (normalized[field] || []).map((item) => {
      if (item && typeof item === "object" && item.dataUrl) {
        return { ...item, isSerializedFile: true };
      }
      if (isS3Key(item)) {
        const dataUrl = dataUrlCache[item];
        if (!dataUrl) return null;
        const name    = item.split("/").pop() || "file";
        const isImage = dataUrl.startsWith("data:image/");
        return { name, dataUrl, isSerializedFile: true, type: dataUrl.split(";")[0].replace("data:", ""), isImage };
      }
      if (item && typeof item === "object" && isS3Key(item.key)) {
        const dataUrl = dataUrlCache[item.key];
        if (!dataUrl) return null;
        const isImage = dataUrl.startsWith("data:image/");
        return {
          name: item.originalName || item.name || item.key.split("/").pop(),
          dataUrl, isSerializedFile: true,
          type: dataUrl.split(";")[0].replace("data:", ""), isImage,
        };
      }
      if (item instanceof File || item instanceof Blob) return item;
      return null;
    }).filter(Boolean);
  });
  return resolved;
}
 
const show = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
};


// ─────────────────────────────────────────────────────────────────────────────
// FAST HTML REPORT PREVIEW
// This avoids pdfMake/S3 image processing completely, so the preview never hangs.
// It is only for on-screen preview in CRM Check. Download can still use PDF.
// ─────────────────────────────────────────────────────────────────────────────
const esc = (value) => String(value ?? "-")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const yn = (value) => value === undefined || value === null || value === "" ? "-" : value;

const qcRowHtml = (label, value) => `
  <tr>
    <td class="label">${esc(label)}</td>
    <td>${esc(yn(value))}</td>
  </tr>`;

const qcTwoRowHtml = (l1, v1, l2, v2) => `
  <tr>
    <td class="label">${esc(l1)}</td><td>${esc(yn(v1))}</td>
    <td class="label">${esc(l2)}</td><td>${esc(yn(v2))}</td>
  </tr>`;

const qcSectionHtml = (title, rows) => `
  <section class="section page-break">
    <h2>${esc(title)}</h2>
    <table class="report-table two-col">
      <tbody>${rows.join("")}</tbody>
    </table>
  </section>`;

function buildCRMCheckHtmlPreview(data = {}, previewImages = []) {
  const checks = Array.isArray(data.checks) ? data.checks : [];
  const color = data.color || "-";
  const colorClass = String(color).toLowerCase();

  const checkRows = checks.length
    ? checks.map((check) => `
      <tr>
        <td>${esc(check)}</td>
        <td class="status">Completed</td>
        <td>${esc(data.finalRemarks || data.comments || "Verified as per provided details")}</td>
        <td class="code ${esc(colorClass)}">${esc(color)}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="muted">No checks selected</td></tr>`;

  const sections = [];

  if (checks.includes("Employment Check")) {
    sections.push(qcSectionHtml("EMPLOYMENT CHECK REPORT", [
      qcRowHtml("Name of the respondent", data.respondentName),
      qcRowHtml("Designation", data.designation),
      qcRowHtml("Email ID", data.contactEmail),
      qcRowHtml("Name of the Organization", data.organization),
      qcRowHtml("Company Contact No.", data.companyContact),
      qcRowHtml("Employment Dates", data.employmentDates),
      qcRowHtml("Employee Code", data.employeeCode),
      qcRowHtml("Supervisor Name", data.supervisor),
      qcRowHtml("Salary Details", data.salary),
      qcRowHtml("Reason for Leaving", data.reasonLeaving),
      qcRowHtml("Eligible for Rehire", data.rehire),
      qcRowHtml("Comments", data.comments || data.vfComments),
    ]));
  }

  if (checks.includes("Residential Address Check")) {
    sections.push(qcSectionHtml("RESIDENTIAL ADDRESS CHECK REPORT", [
      qcRowHtml("Case Ref. No", data.residentialCaseRefNo || data.caseId),
      qcRowHtml("Name of Candidate", data.residentialCandidateName || data.name),
      qcRowHtml("Father's Name", data.residentialFatherName),
      qcRowHtml("Date of Birth", data.residentialDob || data.dob),
      qcRowHtml("Confirmation of Address", data.residentialConfirmationAddress || data.address),
      qcRowHtml("Type of Address", data.residentialAddressType),
      qcRowHtml("Contact Number", data.residentialContactNumber || data.mobile),
      qcRowHtml("Period of Stay", data.residentialPeriodOfStay),
      qcRowHtml("Type of Property", data.residentialPropertyType),
      qcRowHtml("Respondent Name", data.residentialRespondentName),
      qcRowHtml("Special Comments", data.residentialSpecialComments),
    ]));
  }

  if (checks.includes("Educational Qualification Check")) {
    sections.push(qcSectionHtml("EDUCATIONAL QUALIFICATION CHECK REPORT", [
      qcRowHtml("Candidate Name", data.educationalCandidateName || data.name),
      qcRowHtml("University / Institute", data.university || data.educationalUniversity),
      qcRowHtml("College", data.college || data.educationalCollege),
      qcRowHtml("Qualification", data.qualification || data.educationalQualification),
      qcRowHtml("Year of Passing", data.yearOfPassing || data.educationalYearOfPassing),
      qcRowHtml("Roll Number", data.rollNumber || data.educationalRollNo),
      qcRowHtml("Final Remarks", data.educationalFinalRemarks),
    ]));
  }

  if (checks.includes("Identity Check (PAN Card)") || checks.includes("Identity Check (Aadhar Card)")) {
    sections.push(qcSectionHtml("IDENTITY CHECK REPORT", [
      qcRowHtml("Candidate Name", data.identityCandidateName || data.name),
      qcRowHtml("PAN Number", data.panNumber || data.identityPanNumber),
      qcRowHtml("Aadhar Number", data.aadharNumber || data.identityAadharNumber),
      qcRowHtml("Date of Birth", data.dob || data.identityDob),
      qcRowHtml("Final Remarks", data.identityFinalRemarks),
    ]));
  }

  if (checks.includes("Criminal Police Record Check")) {
    sections.push(qcSectionHtml("CRIMINAL POLICE RECORD CHECK REPORT", [
      qcRowHtml("Respondent Name", data.criminalRespondentName),
      qcRowHtml("Designation", data.criminalDesignation),
      qcRowHtml("Police Station Name", data.criminalPoliceStationName),
      qcRowHtml("Date of Verification", data.criminalDateOfVerification),
      qcRowHtml("Candidate Address", data.criminalCandidateAddress),
      qcRowHtml("Final Remarks", data.criminalFinalRemarks),
      qcRowHtml("Additional Remarks", data.criminalAdditionalRemarks),
    ]));
  }

  if (checks.includes("Criminal Database Check")) {
    sections.push(qcSectionHtml("CRIMINAL DATABASE CHECK REPORT", [
      qcRowHtml("Candidate Name", data.databaseCandidateName || data.name),
      qcRowHtml("Date of Birth", data.databaseDob || data.dob),
      qcRowHtml("Father Name", data.databaseFatherName),
      qcRowHtml("Address", data.databaseAddress || data.address),
      qcRowHtml("Final Remarks", data.databaseFinalRemarks),
    ]));
  }

  if (checks.includes("Professional Reference Check")) {
    sections.push(qcSectionHtml("PROFESSIONAL REFERENCE CHECK REPORT", [
      qcRowHtml("Candidate Name", data.professionalCandidateName || data.name),
      qcRowHtml("Reference Name", data.referenceName || data.professionalReferenceName),
      qcRowHtml("Reference Designation", data.referenceDesignation || data.professionalReferenceDesignation),
      qcRowHtml("Reference Contact", data.referenceContact || data.professionalReferenceContact),
      qcRowHtml("Final Remarks", data.professionalFinalRemarks),
    ]));
  }

  if (checks.includes("Credit Check")) {
    sections.push(qcSectionHtml("CREDIT CHECK REPORT", [
      qcRowHtml("Candidate Name", data.creditCandidateName || data.name),
      qcRowHtml("Date of Birth", data.creditDob || data.dob),
      qcRowHtml("PAN Number", data.creditPanNumber || data.panNumber),
      qcRowHtml("Aadhar Number", data.creditAadharNumber || data.aadharNumber),
      qcRowHtml("Credit Agency Name", data.creditAgencyName),
      qcRowHtml("Credit Score", data.creditScore),
      qcRowHtml("Credit Rating", data.creditRating),
      qcRowHtml("Final Remarks", data.creditFinalRemarks),
    ]));
  }

  const imageSection = Array.isArray(previewImages) && previewImages.length
    ? `<section class="section page-break"><h2>UPLOADED DOCUMENT IMAGES</h2><div class="doc-image-grid">${previewImages.map((img) => `
        <div class="doc-image-card">
          <div class="doc-image-title">${esc(img.label || img.name || "Document Image")}</div>
          <img src="${esc(img.src)}" alt="${esc(img.name || "Document Image")}" />
        </div>`).join("")}</div></section>`
    : `<section class="section page-break"><h2>UPLOADED DOCUMENT IMAGES</h2><p class="muted">No image documents found for this case.</p></section>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>BGV Report Preview</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #dfe4ea; font-family: Arial, Helvetica, sans-serif; color: #111827; }
  .page { width: 794px; min-height: 1123px; margin: 18px auto; background: #fff; padding: 44px 46px; border: 2px solid #111; box-shadow: 0 8px 32px rgba(0,0,0,.18); position: relative; }
  .brand { display:flex; align-items:center; gap:10px; margin-bottom: 20px; }
  .brand-logo { width: 58px; height:58px; object-fit: contain; }
  .brand-title { font-size:22px; font-weight:800; margin:0; }
  .brand-sub { font-size:11px; color:#475569; margin-top:2px; }
  h1 { text-align:center; background:#dbeafe; border:1.5px solid #111; padding:8px; font-size:18px; margin: 10px 0 18px; }
  h2 { text-align:center; background:#dbeafe; border:1.5px solid #111; padding:8px; font-size:16px; margin: 26px 0 12px; }
  .report-table { width:100%; border-collapse: collapse; margin-bottom: 18px; }
  .report-table td, .report-table th { border:1.2px solid #111; padding:8px 9px; font-size:12px; vertical-align:top; line-height:1.35; }
  .report-table th, .label { background:#dbeafe; font-weight:700; }
  .two-col .label { width: 35%; }
  .status { font-weight:700; color:#166534; }
  .code { font-weight:800; text-align:center; }
  .code.green { background:#00ff00; color:#000; }
  .code.yellow { background:#ffff00; color:#000; }
  .code.red { background:#ff0000; color:#fff; }
  .muted { color:#64748b; text-align:center; }
  .section { break-inside: avoid; }
  .doc-image-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px; }
  .doc-image-card { border:1.2px solid #111; padding: 8px; break-inside: avoid; background:#fff; }
  .doc-image-title { font-size:10px; font-weight:700; color:#334155; margin-bottom:6px; word-break:break-all; }
  .doc-image-card img { width:100%; max-height: 360px; object-fit: contain; display:block; background:#f8fafc; border:1px solid #e2e8f0; }
  .footer { margin-top: 30px; border-top: 1.5px solid #111; padding-top: 8px; font-size: 9px; color:#334155; display:flex; justify-content:space-between; gap:10px; }
  @media print { body { background:#fff; } .page { box-shadow:none; margin:0 auto; page-break-after: always; } }
</style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <img class="brand-logo" src="${TERVIES_LOGO}" alt="Tervies Logo" />
      <div><div class="brand-title">Tervies</div><div class="brand-sub">BGV Platform</div></div>
    </div>
    <h1>FINAL BACKGROUND REPORT</h1>
    <table class="report-table">
      <tbody>
        ${qcTwoRowHtml("Applicant Name", data.name, "Date of Allocation", data.allocationDate)}
        ${qcTwoRowHtml("TVS Case ID", data.caseId, "Date of Delivery", data.deliveryDate)}
        ${qcTwoRowHtml("Gender", data.gender, "Date of Birth", data.dob)}
        ${qcTwoRowHtml("Client Name", data.clientName, "Client Case ID", data.clientCaseId)}
        ${qcTwoRowHtml("Level of Check", data.level, "Color Code", data.color)}
      </tbody>
    </table>
    <h2>EXECUTIVE SUMMARY</h2>
    <table class="report-table">
      <thead><tr><th>Type of Checks</th><th>Status</th><th>Remarks</th><th>Color Code</th></tr></thead>
      <tbody>${checkRows}</tbody>
    </table>
    <h2>STATUS DEFINITION</h2>
    <table class="report-table"><tbody><tr><td class="label">STATUS DEFINITION</td><td style="background:#ff0000;color:#fff;font-weight:800;text-align:center">RED<br/>Discrepancy</td><td style="background:#00ff00;font-weight:800;text-align:center">GREEN<br/>Verified OK</td><td style="background:#ffff00;font-weight:800;text-align:center">YELLOW<br/>Inaccessible / Unable to verify</td></tr></tbody></table>
    ${sections.join("")}
    ${imageSection}
    <div class="footer"><span>Corporate Office: Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306</span><span>www.trueverificationservices.in</span></div>
  </div>
</body>
</html>`;
}

const isLikelyImageName = (name = "") => /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(String(name).split("?")[0]);

function getPreviewImageCandidate(file, field = "Document") {
  if (!file) return null;

  if (typeof file === "string") {
    if (file.startsWith("data:image/")) return { src: file, name: "Image", label: field };
    if ((file.startsWith("http") || file.startsWith("blob:")) && isLikelyImageName(file)) {
      return { src: file, name: file.split("/").pop()?.split("?")[0] || "Image", label: field };
    }
    if (isS3Key(file) && isLikelyImageName(file)) {
      return { key: file, name: file.split("/").pop() || "Image", label: field };
    }
    return null;
  }

  const name = file.originalName || file.name || file.fileName || file.key || field;
  const type = String(file.type || file.mimeType || "");
  const dataUrl = file.dataUrl || file.base64 || "";
  const url = file.url || "";
  const key = file.key || file.path || "";

  if (dataUrl && String(dataUrl).startsWith("data:image/")) return { src: dataUrl, name, label: field };
  if (url && (type.startsWith("image/") || isLikelyImageName(name) || isLikelyImageName(url))) return { src: url, name, label: field };
  if (key && (type.startsWith("image/") || isLikelyImageName(name) || isLikelyImageName(key))) return { key, name, label: field };
  return null;
}

async function collectPreviewImagesForHtml(reportData = {}) {
  const candidates = [];

  FILE_FIELDS.forEach((field) => {
    (reportData[field] || []).forEach((file) => {
      const item = getPreviewImageCandidate(file, field);
      if (item) candidates.push(item);
    });
  });

  const empDocs = reportData.checkDocuments || {};
  Object.entries(CHECK_TO_FIELD_MAP).forEach(([checkName, field]) => {
    (empDocs[checkName] || []).forEach((doc) => {
      const item = getPreviewImageCandidate(doc?.key ? { ...doc, label: checkName } : doc, checkName || field);
      if (item) candidates.push(item);
    });
  });

  const keys = [...new Set(candidates.map((x) => x.key).filter(Boolean))];
  const signed = keys.length ? await fetchSignedUrls(keys) : {};

  const seen = new Set();
  return candidates
    .map((item) => ({ ...item, src: item.src || signed[item.key] || "" }))
    .filter((item) => item.src)
    .filter((item) => {
      const id = item.src.slice(0, 120);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 40);
}

async function createHtmlPreviewBlobUrl(reportData) {
  const previewImages = await collectPreviewImagesForHtml(reportData || {});
  const html = buildCRMCheckHtmlPreview(reportData || {}, previewImages);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}
 
const getFilePreview = (file) => {
  if (!file) return { src: "", isImage: false, name: "File" };
  if (typeof file === "string") {
    if (file.startsWith("data:image/")) return { src: file, isImage: true, name: "Image" };
    if (file.startsWith("http") || file.startsWith("blob:")) return { src: file, isImage: true, name: "Image" };
    return { src: "", isImage: false, name: file.split("/").pop() || "File" };
  }
  if (file instanceof File || file instanceof Blob) return { src: URL.createObjectURL(file), isImage: file.type?.startsWith("image/"), name: file.name || "File" };
  if (file?.dataUrl) return { src: file.dataUrl, isImage: file.dataUrl.startsWith("data:image/"), name: file.name || "Image" };
  if (file?.url) return { src: file.url, isImage: true, name: file.originalName || file.name || "Image" };
  return { src: "", isImage: false, name: file?.name || file?.originalName || "File" };
};


// ─────────────────────────────────────────────────────────────────────────────
// LOCAL MANUAL CASE DOCUMENTS — CasesPage saves uploaded manual/folder files in
// IndexedDB so local preview works without filling localStorage. CRM Check
// must read that same DB and merge docs into the selected report.
// ─────────────────────────────────────────────────────────────────────────────
const QC_MANUAL_DB_NAME = "BGV_AdminDB";
const QC_MANUAL_DB_VERSION = 1;
const QC_MANUAL_STORE_NAME = "admin_cases";

function initQCManualDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return resolve(null);
    const request = indexedDB.open(QC_MANUAL_DB_NAME, QC_MANUAL_DB_VERSION);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QC_MANUAL_STORE_NAME)) db.createObjectStore(QC_MANUAL_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getQCManualCasesFromDB() {
  try {
    const db = await initQCManualDB();
    if (!db) return [];
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(QC_MANUAL_STORE_NAME, "readonly");
      const req = tx.objectStore(QC_MANUAL_STORE_NAME).get("all_cases");
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("CRMCheck IndexedDB read skipped:", e);
    return [];
  }
}

function qcDocName(doc) {
  return doc?.originalName || doc?.name || doc?.fileName || doc?.key || "Document";
}

function qcDocToPreviewFile(doc) {
  if (!doc) return null;
  if (doc instanceof File || doc instanceof Blob) return doc;
  if (typeof doc === "string") return doc;
  return {
    ...doc,
    name: qcDocName(doc),
    originalName: qcDocName(doc),
    dataUrl: doc.dataUrl || doc.base64 || doc.url || "",
    type: doc.type || doc.mimeType || "",
    key: doc.key || doc.path || qcDocName(doc),
    isSerializedFile: !!(doc.dataUrl || doc.base64 || doc.url),
    isImage: String(doc.type || doc.mimeType || "").startsWith("image/") || String(doc.dataUrl || doc.url || "").startsWith("data:image/"),
  };
}

function inferQCFieldFromDoc(doc) {
  const name = qcDocName(doc).toLowerCase();
  const type = String(doc?.docType || doc?.source || doc?.category || "").toLowerCase();
  const text = `${type} ${name}`;
  if (text.includes("employment") || text.includes("salary") || text.includes("offer") || text.includes("experience") || text.includes("company")) return "employmentDocuments";
  if (text.includes("address") || text.includes("residential") || text.includes("rent") || text.includes("bill") || text.includes("aadhaar") || text.includes("aadhar")) return "residentialDocuments";
  if (text.includes("education") || text.includes("degree") || text.includes("marksheet") || text.includes("university") || text.includes("college")) return "educationalAnnexureE";
  if (text.includes("criminal") || text.includes("police") || text.includes("court")) return "criminalDocuments";
  if (text.includes("database")) return "databaseAnnexureG";
  if (text.includes("credit")) return "creditDocuments";
  return "identityDocuments";
}

function mergeManualDocsIntoReport(serverCase = {}, localCase = {}) {
  const merged = { ...(serverCase || {}), ...(localCase || {}) };

  // Keep server fields, but prefer local docs when available.
  const manualDocs = [
    ...(serverCase.documents || []), ...(localCase.documents || []),
    ...(serverCase.verifiedDocuments || []), ...(localCase.verifiedDocuments || []),
    ...(serverCase.uploadedManualFiles || []), ...(localCase.uploadedManualFiles || []),
    ...(serverCase.manualUploadedDocs || []), ...(localCase.manualUploadedDocs || []),
  ].map(qcDocToPreviewFile).filter(Boolean);

  // De-duplicate by key/name/dataUrl prefix.
  const seen = new Set();
  const uniqueManualDocs = manualDocs.filter(d => {
    const k = d.key || d.name || d.originalName || String(d.dataUrl || "").slice(0, 50);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  merged.manualDocuments = [...(merged.manualDocuments || []), ...uniqueManualDocs];
  merged.documents = [...(merged.documents || []), ...uniqueManualDocs];

  uniqueManualDocs.forEach(doc => {
    const field = inferQCFieldFromDoc(doc);
    const arr = Array.isArray(merged[field]) ? merged[field] : [];
    const exists = arr.some(x => (x?.key || x?.name || x?.originalName || x) === (doc.key || doc.name || doc.originalName));
    if (!exists) merged[field] = [...arr, doc];
  });

  return merged;
}
 
function useS3Preview(file) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!file) return;
    if (isS3Key(file)) {
      fetchSignedUrls([file]).then((map) => { if (map[file]) setSrc(map[file]); });
    } else if (file && typeof file === "object" && isS3Key(file.key)) {
      fetchSignedUrls([file.key]).then((map) => { if (map[file.key]) setSrc(map[file.key]); });
    }
  }, [file]);
  return src;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — DeleteConfirmModal (ORIGINAL — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmModal({ caseId, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="qc-confirm-overlay" onClick={onCancel}>
      <div className="qc-confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="qc-confirm-icon">🗑️</div>
        <div className="qc-confirm-title">Delete Case?</div>
        <div className="qc-confirm-desc">
          Are you sure you want to permanently delete case{" "}
          <span className="qc-confirm-cid">{caseId}</span>?<br />
          This action <strong>cannot be undone</strong>.
        </div>
        <div className="qc-confirm-actions">
          <button className="qc-confirm-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="qc-confirm-delete" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <svg style={{ width: 16, height: 16, animation: "qcSpin 0.8s linear infinite" }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" opacity="0.3" />
                  <path fill="white" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Deleting…
              </>
            ) : "🗑️ Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — EmployeeCheckBadge (ORIGINAL — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  "Completed":    { bg: "#dcfce7", border: "#86efac", color: "#166534", dot: "#22c55e" },
  "In Progress":  { bg: "#fef9c3", border: "#fde047", color: "#854d0e", dot: "#eab308" },
  "Discrepancy":  { bg: "#fee2e2", border: "#fca5a5", color: "#991b1b", dot: "#ef4444" },
  "Insufficient": { bg: "#ffedd5", border: "#fdba74", color: "#9a3412", dot: "#f97316" },
  "Pending":      { bg: "#f1f5f9", border: "#cbd5e1", color: "#475569", dot: "#94a3b8" },
};
 
function EmployeeCheckBadge({ checkStatuses, checkNotes, checkName }) {
  const entry = checkStatuses?.[checkName];
  if (!entry) return null;
  const { status, updatedBy, updatedAt } = entry;
  const note = checkNotes?.[checkName];
  const c = STATUS_COLORS[status] || STATUS_COLORS["Pending"];
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
      background: c.bg, border: `1.5px solid ${c.border}`,
      borderRadius: 12, padding: "12px 16px", marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.dot, flexShrink: 0, display: "inline-block" }} />
        <span style={{ fontWeight: 800, fontSize: 13, color: c.color }}>{status}</span>
        <span style={{ fontSize: 12, color: c.color, opacity: 0.75 }}>
          by <strong>{updatedBy}</strong>
          {updatedAt ? ` · ${new Date(updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
        </span>
      </div>
      {note && (
        <div style={{ fontSize: 13, color: c.color, fontStyle: "italic", paddingLeft: 19, lineHeight: 1.5 }}>
          "{note}"
        </div>
      )}
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — Lightbox (ORIGINAL — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
 
  const current = images[idx];
  const { src, name } = getFilePreview(current);
  const s3Src = useS3Preview(current);
  const finalSrc = src || s3Src;
 
  const prev = useCallback(() => { setIdx((i) => (i - 1 + images.length) % images.length); setZoom(1); setPan({ x: 0, y: 0 }); }, [images.length]);
  const next = useCallback(() => { setIdx((i) => (i + 1) % images.length); setZoom(1); setPan({ x: 0, y: 0 }); }, [images.length]);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.5, 5)), []);
  const zoomOut = useCallback(() => setZoom((z) => { const nz = Math.max(z - 0.5, 0.5); if (nz <= 1) setPan({ x: 0, y: 0 }); return nz; }), []);
  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
 
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next, zoomIn, zoomOut]);
 
  const handlePointerDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
 
  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  }, [isDragging, startPos]);
 
  const handlePointerUp = useCallback(() => { setIsDragging(false); }, []);
 
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);
 
  return (
    <div className="qc-lightbox-overlay" onClick={onClose}>
      <div className="qc-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="qc-lb-close" onClick={onClose}>✕</button>
        {images.length > 1 && (
          <>
            <button className="qc-lb-nav prev" onClick={prev}>‹</button>
            <button className="qc-lb-nav next" onClick={next}>›</button>
          </>
        )}
        <div style={{ width: "88vw", height: "80vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {finalSrc ? (
            <img
              src={finalSrc}
              alt={name}
              className="qc-lightbox-img"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                transition: isDragging ? "none" : "transform 0.2s ease",
                touchAction: "none",
                margin: 0,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
              draggable={false}
              onPointerDown={handlePointerDown}
            />
          ) : (
            <div style={{ color: "white", fontSize: 16 }}>Loading image…</div>
          )}
        </div>
        <div className="qc-lightbox-controls">
          <button className="qc-lb-btn" onClick={zoomOut}>− Zoom Out</button>
          <span className="qc-lb-zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="qc-lb-btn" onClick={zoomIn}>+ Zoom In</button>
          <button className="qc-lb-btn" onClick={reset}>Reset</button>
          {images.length > 1 && <span className="qc-lb-zoom-label">{idx + 1} / {images.length}</span>}
        </div>
      </div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — S3FileCard (ORIGINAL — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function S3FileCard({ file, index, onImageClick, globalOffset }) {
  const s3Src = useS3Preview(file);
  const { src: directSrc, isImage: directIsImage, name } = getFilePreview(file);
  const src = directSrc || s3Src;
  const isImage = directIsImage || (s3Src && s3Src.length > 0);
 
  if (!isImage || !src) {
    return (
      <div className="qc-file-card">
        <span style={{ fontSize: "28px" }}>📄</span>
        <div className="qc-file-name">{name}</div>
      </div>
    );
  }
 
  return (
    <div className="qc-image-card" onClick={() => onImageClick(globalOffset + index)} title="Click to zoom">
      <img src={src} alt={name || `File ${index}`} className="qc-image-preview" />
      <div className="qc-file-name">{name}</div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — FileSection (ORIGINAL — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function FileSection({ files, label, onImageClick, globalImages, globalOffset }) {
  if (!files || files.length === 0) return null;
  return (
    <div className="qc-images-wrap">
      <div className="qc-label" style={{ marginBottom: "12px" }}>{label} ({files.length})</div>
      <div className="qc-images-grid">
        {files.map((file, index) => (
          <S3FileCard key={index} file={file} index={index} onImageClick={onImageClick} globalOffset={globalOffset} />
        ))}
      </div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — Item (ORIGINAL — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const Item = ({ label, name, value, onChange, textarea = false }) => (
  <div className="qc-item">
    <div className="qc-label">{label}</div>
    {textarea ? (
      <textarea className="qc-edit-textarea" name={name} value={show(value)} onChange={onChange} />
    ) : (
      <input className="qc-edit-input" name={name} value={show(value)} onChange={onChange} />
    )}
  </div>
);
 
// ─────────────────────────────────────────────────────────────────────────────
// HELPER — sendReportToTrackStatus (ORIGINAL — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
async function sendReportToTrackStatus(report) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("https://tervies.info/api/admin/send-to-track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(report),
    });
    const data = await res.json();
    if (!data.success) throw new Error("Failed to send report");
    return true;
  } catch (error) {
    console.error("Send error:", error);
    return false;
  }
}
 
// ─────────────────────────────────────────────────────────────────────────────
// NEW COMPONENT — CaseDocsPanel  (col-3: documents from the case)
// Pure display component. Reads the already-loaded report's file fields,
// resolves S3 keys on demand via useS3Preview, and renders a scrollable list
// grouped by check type with a click-to-preview area.
// ─────────────────────────────────────────────────────────────────────────────
const DOC_GROUPS = [
  { label: "Employment",       icon: "💼", docs: "employmentDocuments",   shots: "employmentScreenshots"   },
  { label: "Residential",      icon: "🏠", docs: "residentialDocuments",  shots: "residentialScreenshots"  },
  { label: "Education",        icon: "🎓", docs: "educationalAnnexureE",  shots: "educationalScreenshots"  },
  { label: "Professional Ref", icon: "👔", docs: "professionalAnnexureF", shots: "professionalScreenshots" },
  { label: "Criminal Police",  icon: "🚔", docs: "criminalDocuments",     shots: "criminalScreenshots"     },
  { label: "Database",         icon: "🗄️", docs: "databaseAnnexureG",     shots: "databaseScreenshots"     },
  { label: "Identity",         icon: "🪪", docs: "identityDocuments",     shots: "identityScreenshots"     },
  { label: "Credit",           icon: "💳", docs: "creditDocuments",       shots: "creditScreenshots"       },
  { label: "Manual / Uploaded", icon: "📎", docs: "manualDocuments",       shots: "documents"               },
];
 
// Single thumbnail that resolves its own S3 URL
function DocThumb({ file, isSelected, onClick }) {
  const s3Src = useS3Preview(file);
  const { src: direct, isImage, name } = getFilePreview(file);
  const src = direct || s3Src;
 
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        border: isSelected ? "2.5px solid #3b82f6" : "2px solid #e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
        background: isSelected ? "#eff6ff" : "#f8fafc",
        width: 76,
        flexShrink: 0,
      }}
    >
      {isImage && src ? (
        <img src={src} alt={name} style={{ width: "100%", height: 58, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: 58, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: "#f1f5f9" }}>
          📄
        </div>
      )}
      <div style={{ fontSize: 9, color: "#64748b", padding: "3px 4px", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {(name || "file").slice(0, 14)}
      </div>
    </div>
  );
}
 
function CaseDocsPanel({ report }) {
  const [selected, setSelected] = useState(null); // { src, isImage, name }
  const [zoom, setZoom] = useState(1);
 
  // Reset when case changes
  useEffect(() => { setSelected(null); setZoom(1); }, [report?.caseId]);
 
  if (!report) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 8, padding: 24 }}>
        <div style={{ fontSize: 40 }}>📁</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#64748b" }}>Case Documents</div>
        <div style={{ fontSize: 12, textAlign: "center" }}>Select a case from the left to see its documents here</div>
      </div>
    );
  }
 
  // Build groups: merge qc flat fields + employee checkDocuments
  const empDocs = report.checkDocuments || {};
  const groups = DOC_GROUPS.map(g => {
    const files = [
      ...(report[g.shots] || []),
      ...(report[g.docs] || []),
    ];
    // Also add employee-uploaded docs from checkDocuments that map to this field
    Object.entries(CHECK_TO_FIELD_MAP).forEach(([checkName, field]) => {
      if (field === g.docs) {
        (empDocs[checkName] || []).forEach(d => {
          if (d?.key) {
            const alreadyHas = files.some(f =>
              (typeof f === "string" ? f : f?.key) === d.key
            );
            if (!alreadyHas) files.push(d.key);
          }
        });
      }
    });
    return { ...g, files: files.filter(Boolean) };
  }).filter(g => g.files.length > 0);
 
  const totalFiles = groups.reduce((a, g) => a + g.files.length, 0);
 
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>📁 Case Documents</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
          {totalFiles} file{totalFiles !== 1 ? "s" : ""} · {groups.length} check{groups.length !== 1 ? "s" : ""}
          <span style={{ marginLeft: 8, fontFamily: "monospace", background: "#e2e8f0", padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>
            {report.caseId}
          </span>
        </div>
      </div>
 
      {/* Body: thumbnail list on top, preview below */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Thumbnails scrollable area */}
        <div style={{ maxHeight: 200, overflowY: "auto", padding: "10px 12px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          {groups.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "16px 0" }}>No documents found for this case.</div>
          ) : (
            groups.map(g => (
              <div key={g.docs} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{g.icon}</span>
                  <span>{g.label}</span>
                  <span style={{ background: "#e2e8f0", borderRadius: 999, padding: "1px 5px", fontSize: 9, fontWeight: 600, color: "#64748b" }}>{g.files.length}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {g.files.map((file, i) => {
                    const fileKey = typeof file === "string" ? file : (file?.key || file?.dataUrl || String(i));
                    const isSelected = selected?.fileKey === fileKey;
                    return (
                      <DocThumb
                        key={`${g.docs}-${i}`}
                        file={file}
                        isSelected={isSelected}
                        onClick={() => {
                          const { src, isImage, name } = getFilePreview(file);
                          // For S3 keys we need to wait — trigger useS3Preview via a wrapper
                          setSelected({ fileKey, file, cachedSrc: src, isImage, name });
                          setZoom(1);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
 
        {/* Preview area */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Preview toolbar (only when something selected) */}
          {selected && (
            <div style={{ padding: "6px 12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selected.name || "Document"}
              </span>
              <button onClick={() => setZoom(z => Math.min(1, +(z + 0.25).toFixed(2)))} style={btnStyle}>＋</button>
              <button onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))} style={btnStyle}>－</button>
              <button onClick={() => setZoom(1)} style={{ ...btnStyle, background: "#e2e8f0", color: "#475569" }}>Reset</button>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{Math.round(zoom * 100)}%</span>
            </div>
          )}
          {/* Preview content */}
          <DocPreview file={selected?.file} zoom={zoom} />
        </div>
      </div>
    </div>
  );
}
 
const btnStyle = {
  background: "#3b82f6", color: "#fff", border: "none",
  borderRadius: 5, padding: "3px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
 
// Separate component so useS3Preview can be called at the hook level (not inside a callback)
function DocPreview({ file, zoom }) {
  const s3Src = useS3Preview(file);
  const { src: direct, isImage, name } = getFilePreview(file || "");
  const src = direct || s3Src;

  // IMPORTANT: case document zoom is a FIT zoom, not crop/scroll zoom.
  // 100% = full image fits inside the available preview area.
  // 75/50/25% = the same full image becomes smaller, still fully visible.
  const safeZoom = Math.max(0.25, Math.min(Number(zoom) || 1, 1));
  const fitPercent = `${Math.round(safeZoom * 100)}%`;

  if (!file) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexDirection: "column", gap: 8, background: "#f8fafc", minHeight: 0 }}>
        <div style={{ fontSize: 36 }}>👆</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Click a thumbnail to preview</div>
      </div>
    );
  }

  if (!src) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexDirection: "column", gap: 8, background: "#f8fafc", minHeight: 0 }}>
        <div style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "qcSpin 0.8s linear infinite" }} />
        <div style={{ fontSize: 11 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        background: "#e2e8f0",
        padding: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isImage ? (
        <div
          style={{
            width: fitPercent,
            height: fitPercent,
            maxWidth: "100%",
            maxHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 6,
            background: "#fff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          <img
            src={src}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              objectPosition: "center center",
              display: "block",
              borderRadius: 6,
              background: "#fff",
            }}
            draggable={false}
          />
        </div>
      ) : (
        <iframe
          src={src}
          title={name}
          style={{
            width: fitPercent,
            height: fitPercent,
            minWidth: 220,
            minHeight: 260,
            maxWidth: "100%",
            maxHeight: "100%",
            border: "none",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            background: "#fff",
            display: "block",
          }}
        />
      )}
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — CRMCheckPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CRMCheckPage() {
  const { caseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
 
  // ── All original state (UNCHANGED) ────────────────────────────────────────
  const [allReports, setAllReports] = useState([]);
  const [report, setReport] = useState(null);
  const [searchCaseId, setSearchCaseId] = useState(caseId || "");
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [savedReport, setSavedReport] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendingStep, setSendingStep] = useState(""); // tracks current send step
  const [sentCases, setSentCases] = useState({});
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
 
  // ── Delete state (UNCHANGED) ───────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
 
  // ── NEW: split-view PDF state (col-2) ─────────────────────────────────────
  const [splitPdfBlobUrl, setSplitPdfBlobUrl] = useState(null);
  const [isSplitPdfLoading, setIsSplitPdfLoading] = useState(false);

  // ── NEW: adjustable 3-panel layout + report preview zoom ────────────────
  const [casePanelWidth, setCasePanelWidth] = useState(18);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(58);
  const [docsPanelWidth, setDocsPanelWidth] = useState(24);
  const [splitPreviewZoom, setSplitPreviewZoom] = useState(1);
 
  // ── All original data-fetching & effects (UNCHANGED) ──────────────────────
  const loadCases = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const API_BASE = window.location.hostname === "localhost"
        ? "http://localhost:5001/api"
        : "/api";

      // CRM page must show ONLY the cases sent from Quality Check using "Send to CRM".
      // So we load /admin/crm-reports first and never show the full cases list here.
      const [localManualCases, crmResult, serverResult] = await Promise.all([
        getQCManualCasesFromDB(),
        fetch(`${API_BASE}/admin/crm-reports`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => ({ success: false, reports: [] })),
        fetch(`${API_BASE}/admin/cases`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => ({ success: false, cases: [] })),
      ]);

      const crmReports = crmResult.success ? (crmResult.reports || []) : [];
      const serverCases = serverResult.success ? (serverResult.cases || []) : [];
      const serverByCaseId = new Map(serverCases.map(c => [String(c.caseId || ""), c]));
      const localByCaseId = new Map(localManualCases.map(c => [String(c.caseId || ""), c]));
      const map = new Map();

      crmReports.forEach((crmReport) => {
        const key = String(crmReport.caseId || "");
        if (!key) return;
        const serverCase = serverByCaseId.get(key) || {};
        const localCase = localByCaseId.get(key) || {};
        const merged = mergeManualDocsIntoReport(
          { ...serverCase, ...(serverCase.qcReport || {}), ...crmReport, sentToCRM: true },
          localCase
        );
        map.set(key, normalizeFileFields(merged));
      });

      // Backward compatibility: if backend has sentToCRM on cases but crmReports file is old/empty.
      serverCases
        .filter(c => c?.sentToCRM || c?.crmSentAt || c?.crmStatus)
        .forEach((serverCase) => {
          const key = String(serverCase.caseId || "");
          if (!key || map.has(key)) return;
          const localCase = localByCaseId.get(key) || {};
          const merged = mergeManualDocsIntoReport(
            { ...serverCase, ...(serverCase.qcReport || {}), sentToCRM: true },
            localCase
          );
          map.set(key, normalizeFileFields(merged));
        });

      setAllReports(Array.from(map.values()));
    } catch (err) {
      console.error("Error loading CRM cases:", err);
      setAllReports([]);
    }
  };
 
  useEffect(() => { loadCases(); }, []);
 
  useEffect(() => {
    if (caseId) handleSelectCase(caseId);
  }, [caseId]);
 
  // Clear split PDF when case changes
  useEffect(() => {
    if (splitPdfBlobUrl) { URL.revokeObjectURL(splitPdfBlobUrl); setSplitPdfBlobUrl(null); }
  }, [report?.caseId]);
 
  // ── All original memos (UNCHANGED) ────────────────────────────────────────
  const selectedChecks = useMemo(() => report?.checks || [], [report]);
 
  const allImages = useMemo(() => {
    if (!report) return [];
    const sections = [
      report.employmentScreenshots, report.employmentDocuments,
      report.residentialScreenshots, report.residentialDocuments,
      report.educationalScreenshots, report.educationalAnnexureE,
      report.professionalScreenshots, report.professionalAnnexureF,
      report.criminalScreenshots, report.criminalDocuments,
      report.databaseScreenshots, report.databaseAnnexureG,
      report.identityScreenshots, report.identityDocuments,
      report.creditScreenshots, report.creditDocuments,
    ];
    return sections.flat().filter((f) => {
      if (!f) return false;
      if (isS3Key(f)) return true;
      if (f && typeof f === "object" && isS3Key(f.key)) return true;
      const { isImage } = getFilePreview(f);
      return isImage;
    });
  }, [report]);
 
  const buildOffset = useCallback((precedingArrays) => {
    return precedingArrays.reduce((acc, arr) => {
      if (!arr) return acc;
      return acc + arr.filter((f) => {
        if (!f) return false;
        if (isS3Key(f)) return true;
        if (f && typeof f === "object" && isS3Key(f.key)) return true;
        const { isImage } = getFilePreview(f);
        return isImage;
      }).length;
    }, 0);
  }, []);
 
  const displayedReports = useMemo(() => {
    const query = String(searchCaseId || "").trim().toLowerCase();
    if (!query) return allReports;
    return allReports.filter((item) => String(item.caseId || "").toLowerCase().includes(query));
  }, [allReports, searchCaseId]);
 
  const empOffset = 0;
  const resOffset = buildOffset([report?.employmentScreenshots, report?.employmentDocuments]);
  const eduOffset = buildOffset([report?.employmentScreenshots, report?.employmentDocuments, report?.residentialScreenshots, report?.residentialDocuments]);
  const proOffset = buildOffset([report?.employmentScreenshots, report?.employmentDocuments, report?.residentialScreenshots, report?.residentialDocuments, report?.educationalScreenshots, report?.educationalAnnexureE]);
  const criOffset = buildOffset([report?.employmentScreenshots, report?.employmentDocuments, report?.residentialScreenshots, report?.residentialDocuments, report?.educationalScreenshots, report?.educationalAnnexureE, report?.professionalScreenshots, report?.professionalAnnexureF]);
  const dbOffset = buildOffset([report?.employmentScreenshots, report?.employmentDocuments, report?.residentialScreenshots, report?.residentialDocuments, report?.educationalScreenshots, report?.educationalAnnexureE, report?.professionalScreenshots, report?.professionalAnnexureF, report?.criminalScreenshots, report?.criminalDocuments]);
  const idOffset = buildOffset([report?.employmentScreenshots, report?.employmentDocuments, report?.residentialScreenshots, report?.residentialDocuments, report?.educationalScreenshots, report?.educationalAnnexureE, report?.professionalScreenshots, report?.professionalAnnexureF, report?.criminalScreenshots, report?.criminalDocuments, report?.databaseScreenshots, report?.databaseAnnexureG]);
 
  const hasEmployment  = (report?.employmentScreenshots?.length || 0) > 0 || (report?.employmentDocuments?.length || 0)  > 0 || (report?.checkDocuments?.["Employment Check"]?.length || 0) > 0;
  const hasResidential = (report?.residentialScreenshots?.length || 0) > 0 || (report?.residentialDocuments?.length || 0) > 0 || (report?.checkDocuments?.["Residential Address Check"]?.length || 0) > 0;
  const hasEducation   = (report?.educationalScreenshots?.length || 0) > 0 || (report?.educationalAnnexureE?.length || 0)   > 0 || (report?.checkDocuments?.["Educational Qualification Check"]?.length || 0) > 0;
  const hasProfessional= (report?.professionalScreenshots?.length || 0) > 0 || (report?.professionalAnnexureF?.length || 0) > 0 || (report?.checkDocuments?.["Professional Reference Check"]?.length || 0) > 0;
  const hasCriminal    = (report?.criminalScreenshots?.length || 0) > 0 || (report?.criminalDocuments?.length || 0)          > 0 || (report?.checkDocuments?.["Criminal Police Record Check"]?.length || 0) > 0;
  const hasDatabase    = (report?.databaseScreenshots?.length || 0) > 0 || (report?.databaseAnnexureG?.length || 0)          > 0 || (report?.checkDocuments?.["Criminal Database Check"]?.length || 0) > 0;
  const hasIdentity    = (report?.identityScreenshots?.length || 0) > 0 || (report?.identityDocuments?.length || 0)          > 0 || (report?.checkDocuments?.["Identity Check (PAN Card)"]?.length || 0) > 0 || (report?.checkDocuments?.["Identity Check (Aadhar Card)"]?.length || 0) > 0;
  const hasCredit = (report?.creditScreenshots?.length || 0) > 0 ||
                    (report?.creditDocuments?.length || 0) > 0 ||
                    (report?.checkDocuments?.["Credit Check"]?.length || 0) > 0;
 
  // ── All original handlers (UNCHANGED) ─────────────────────────────────────
  const handleSearch = () => {
    const query = String(searchCaseId || "").trim().toLowerCase();
    if (!query) { setReport(null); return; }
    const matched = allReports.find((item) => String(item.caseId || "").toLowerCase().trim() === query);
    if (matched) {
      setReport(matched);
      setSavedReport(null);
      setDetailExpanded(false);
      navigate(`/crm-check/${encodeURIComponent(matched.caseId)}`, { replace: true, state: { reportData: matched } });
    } else {
      alert("No case found for this Case ID");
    }
  };
 
  const handleSelectCase = async (caseId) => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      navigate(`/crm-check/${caseId}`);
      const res = await fetch(`https://tervies.info/api/admin/case/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const serverCaseData = data.case;
        const localManualCases = await getQCManualCasesFromDB();
        const localCaseData = localManualCases.find(c => String(c.caseId) === String(caseId));
        const caseData = mergeManualDocsIntoReport(serverCaseData, localCaseData || {});
 
        const parseChecks = (raw) => {
          if (!raw) return [];
          if (Array.isArray(raw)) return raw;
          if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
          return [];
        };
 
        const qcChecks   = parseChecks(caseData.qcReport?.checks);
        const baseChecks = parseChecks(caseData.checks);
 
        const merged = {
          ...caseData,
          ...(caseData.qcReport || {}),
          checks: (() => {
            const base = qcChecks.length > 0 ? qcChecks : baseChecks;
            const fromEmpDocs = Object.keys(caseData.checkDocuments || {})
              .filter(k => (caseData.checkDocuments[k] || []).length > 0);
            return [...new Set([...base, ...fromEmpDocs])];
          })(),
          checkStatuses:    caseData.checkStatuses  || {},
          checkNotes:       caseData.checkNotes     || {},
          checkDocuments:   caseData.checkDocuments || {},
          creditDocuments:   (caseData.qcReport?.creditDocuments
            ? (Array.isArray(caseData.qcReport.creditDocuments)
                ? caseData.qcReport.creditDocuments
                : (() => { try { return JSON.parse(caseData.qcReport.creditDocuments); } catch { return []; } })())
            : []),
          creditScreenshots: (caseData.qcReport?.creditScreenshots
            ? (Array.isArray(caseData.qcReport.creditScreenshots)
                ? caseData.qcReport.creditScreenshots
                : (() => { try { return JSON.parse(caseData.qcReport.creditScreenshots); } catch { return []; } })())
            : []),
        };
 
        const CHECK_TO_FIELD = {
          "Employment Check":                "employmentDocuments",
          "Residential Address Check":       "residentialDocuments",
          "Educational Qualification Check": "educationalAnnexureE",
          "Identity Check (PAN Card)":       "identityDocuments",
          "Identity Check (Aadhar Card)":    "identityDocuments",
          "Criminal Police Record Check":    "criminalDocuments",
          "Criminal Database Check":         "databaseAnnexureG",
          "Professional Reference Check":    "professionalAnnexureF",
          "Credit Check":                    "creditDocuments",
        };
        const empDocs = caseData.checkDocuments || {};
        for (const [checkName, field] of Object.entries(CHECK_TO_FIELD)) {
          const employeeDocs = empDocs[checkName] || [];
          if (employeeDocs.length === 0) continue;
          const empKeys = employeeDocs.map(d => d.key).filter(Boolean);
          const existing = Array.isArray(merged[field]) ? merged[field] : [];
          const existingKeys = existing.map(item =>
            typeof item === "string" ? item : (item?.key || "")
          );
          const toAdd = empKeys.filter(k => !existingKeys.includes(k));
          merged[field] = [...existing, ...toAdd];
        }
 
        setReport(normalizeFileFields(merged));
        setSavedReport(null);
        setDetailExpanded(false);
      }
    } catch (err) {
      console.error("Error loading case:", err);
      const localManualCases = await getQCManualCasesFromDB();
      const localCaseData = localManualCases.find(c => String(c.caseId) === String(caseId));
      if (localCaseData) {
        setReport(normalizeFileFields(mergeManualDocsIntoReport(localCaseData, localCaseData)));
        setSavedReport(null);
        setDetailExpanded(false);
      }
    }
  };
 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setReport((prev) => ({ ...prev, [name]: value }));
  };
 
  const handleSave = async () => {
    if (!report?.caseId) { alert("No case selected"); return; }
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("checks", JSON.stringify(report.checks || []));
      Object.keys(report).forEach((key) => {
        const value = report[key];
        if (FILE_FIELDS.includes(key) || key === "checks") return;
        if (typeof value === "object" && value !== null && !(value instanceof File)) return;
        if (value !== undefined && value !== null) formData.append(key, value);
      });
      FILE_FIELDS.forEach((field) => {
        const arr = report[field] || [];
        const existingKeys = arr.filter(f => typeof f === "string" && isS3Key(f));
        const existingObjs = arr.filter(f => f && typeof f === "object" && isS3Key(f.key));
        const newFiles = arr.filter(f => f instanceof File);
        formData.append(field, JSON.stringify([...existingKeys, ...existingObjs.map(o => o.key)]));
        newFiles.forEach(file => formData.append(field, file));
      });
      const res = await fetch("https://tervies.info/api/admin/save-qc", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error("Save failed");
      setSavedReport({ ...report, savedAt: new Date().toISOString() });
      alert("Case saved successfully ✅");
    } catch (error) {
      console.error("Save error:", error);
      alert("Unable to save case ❌");
    }
  };
 
  const handleDeleteClick = (caseIdToDelete, e) => {
    e.stopPropagation();
    setDeleteTarget(caseIdToDelete);
  };
 
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://tervies.info/api/admin/case/${deleteTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAllReports((prev) => prev.filter((c) => c.caseId !== deleteTarget));
        setDeleteTarget(null);
      } else {
        alert("Failed to delete case. Please try again.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting case. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
 
  const handleDeleteCancel = () => { if (!isDeleting) setDeleteTarget(null); };
 
  const closePdfPreview = () => {
    if (pdfPreview?.blobUrl) URL.revokeObjectURL(pdfPreview.blobUrl);
    setPdfPreview(null);
  };
 
  const pdfZoomIn    = () => setPdfPreview((p) => ({ ...p, zoom: Math.min(p.zoom + 0.25, 3) }));
  const pdfZoomOut   = () => setPdfPreview((p) => ({ ...p, zoom: Math.max(p.zoom - 0.25, 0.5) }));
  const pdfZoomReset = () => setPdfPreview((p) => ({ ...p, zoom: 1 }));
 
  const openLightbox  = (index) => setLightbox({ images: allImages, index });
  const closeLightbox = () => setLightbox(null);
 
  const currentCaseId = report?.caseId;
  const alreadySent   = sentCases[currentCaseId] || report?.sentToTrack;
  const showSendButton = true;
 
  // ── Shared PDF-building helper (used by both download and split-view) ──────
  const buildReportForPDF = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://tervies.info/api/admin/case/${report.caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const serverFreshCase = data.success ? data.case : report;
    const localManualCases = await getQCManualCasesFromDB();
    const localFreshCase = localManualCases.find(c => String(c.caseId) === String(report.caseId));
    const freshCase = mergeManualDocsIntoReport(serverFreshCase, localFreshCase || {});
 
    const CHECK_TO_FIELD = {
      "Employment Check": "employmentDocuments", "Residential Address Check": "residentialDocuments",
      "Educational Qualification Check": "educationalAnnexureE", "Identity Check (PAN Card)": "identityDocuments",
      "Identity Check (Aadhar Card)": "identityDocuments", "Criminal Police Record Check": "criminalDocuments",
      "Criminal Database Check": "databaseAnnexureG", "Professional Reference Check": "professionalAnnexureF",
      "Credit Check": "creditDocuments",
    };
    const parse = (v) => { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } };
    const qcChecks   = parse(freshCase.qcReport?.checks);
    const baseChecks = parse(freshCase.checks);
    const savedChecks = qcChecks.length > 0 ? qcChecks : baseChecks;
    const merged = { ...freshCase, ...(freshCase.qcReport || {}), checks: savedChecks, checkStatuses: freshCase.checkStatuses || {}, checkNotes: freshCase.checkNotes || {}, checkDocuments: freshCase.checkDocuments || {} };
    const empDocs = freshCase.checkDocuments || {};
    for (const [checkName, field] of Object.entries(CHECK_TO_FIELD)) {
      const employeeDocs = empDocs[checkName] || [];
      if (!employeeDocs.length) continue;
      const empKeys = employeeDocs.map(d => d.key).filter(Boolean);
      const existing = Array.isArray(merged[field]) ? merged[field] : [];
      const existingKeys = existing.map(item => typeof item === "string" ? item : (item?.key || ""));
      merged[field] = [...existing, ...empKeys.filter(k => !existingKeys.includes(k))];
    }
    const empDocChecks = Object.keys(empDocs).filter(k => (empDocs[k] || []).length > 0);
    merged.checks = [...new Set([...savedChecks, ...empDocChecks])];
    return merged;
  };
 
  const buildResolvedReportForPDF = async () => {
    const merged           = await buildReportForPDF();
    const normalizedMerged = normalizeFileFields(merged);
    const resolvedReport   = await resolveAllFilesForPDF(normalizedMerged);
    return { merged, resolvedReport };
  };

  const buildSimplePdfDocDefinition = (resolvedReport, checks = []) => {
    const val = (x) => (x === undefined || x === null || x === "" ? "—" : String(x));
    const content = [
      { text: "BACKGROUND VERIFICATION REPORT", style: "title", alignment: "center", margin: [0, 0, 0, 14] },
      { text: `Case ID: ${val(resolvedReport.caseId)}`, style: "caseId", alignment: "center", margin: [0, 0, 0, 18] },
      {
        table: {
          widths: ["28%", "22%", "28%", "22%"],
          body: [
            [{ text: "Candidate Name", bold: true }, val(resolvedReport.name), { text: "Client", bold: true }, val(resolvedReport.clientName)],
            [{ text: "Client Case ID", bold: true }, val(resolvedReport.clientCaseId), { text: "Status", bold: true }, val(resolvedReport.status)],
            [{ text: "DOB", bold: true }, val(resolvedReport.dob), { text: "Gender", bold: true }, val(resolvedReport.gender)],
            [{ text: "Phone", bold: true }, val(resolvedReport.phone), { text: "Email", bold: true }, val(resolvedReport.email)],
            [{ text: "Father Name", bold: true }, val(resolvedReport.fatherName), { text: "PAN/Aadhar", bold: true }, val(resolvedReport.pan || resolvedReport.adharnumber)],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },
      { text: "Selected Checks", style: "section" },
      { ul: (checks && checks.length ? checks : ["No checks selected"]).map(val), margin: [0, 0, 0, 12] },
    ];

    if (resolvedReport.presentAddress || resolvedReport.permanentAddress) {
      content.push({ text: "Address", style: "section" });
      content.push({ text: `Present Address: ${val(resolvedReport.presentAddress)}`, margin: [0, 0, 0, 4] });
      content.push({ text: `Permanent Address: ${val(resolvedReport.permanentAddress)}`, margin: [0, 0, 0, 12] });
    }

    const imageFiles = [];
    FILE_FIELDS.forEach((field) => {
      (resolvedReport[field] || []).forEach((file) => {
        const dataUrl = file?.dataUrl || (typeof file === "string" && file.startsWith("data:image/") ? file : "");
        if (dataUrl && String(dataUrl).startsWith("data:image/")) {
          imageFiles.push({ field, name: file?.name || file?.originalName || field, dataUrl });
        }
      });
    });

    const seenImg = new Set();
    const uniqueImages = imageFiles.filter(img => {
      const k = img.dataUrl.slice(0, 80);
      if (seenImg.has(k)) return false;
      seenImg.add(k);
      return true;
    }).slice(0, 30);

    if (uniqueImages.length) {
      content.push({ text: "Case Documents / Images", style: "section", pageBreak: "before" });
      uniqueImages.forEach((img, i) => {
        content.push({ text: img.name, fontSize: 9, color: "#475569", margin: [0, i ? 12 : 0, 0, 4] });
        content.push({ image: img.dataUrl, fit: [500, 360], margin: [0, 0, 0, 8] });
      });
    } else {
      content.push({ text: "No uploaded images found for this case.", italics: true, color: "#64748b", margin: [0, 8, 0, 0] });
    }

    content.push({ text: "System Decision", style: "section", margin: [0, 16, 0, 6] });
    content.push({ text: val(resolvedReport.verificationSummary || resolvedReport.finalRemarks || "No summary yet"), margin: [0, 0, 0, 8] });

    return {
      pageSize: "A4",
      pageMargins: [36, 42, 36, 42],
      content,
      styles: {
        title: { fontSize: 18, bold: true, color: "#0f172a" },
        caseId: { fontSize: 10, color: "#475569" },
        section: { fontSize: 13, bold: true, color: "#1d4ed8", margin: [0, 10, 0, 6] },
      },
      defaultStyle: { fontSize: 10, color: "#111827" },
    };
  };

  // Convert anything returned by generateReport.js into a real PDF Blob.
  // This accepts: data URL, raw base64, Blob, ArrayBuffer, Uint8Array.
  const reportOutputToPdfBlob = async (output) => {
    if (!output) throw new Error("generateReport.js did not return PDF data");

    if (output instanceof Blob) {
      if (output.size === 0) throw new Error("PDF generated empty file");
      return output.type === "application/pdf" ? output : new Blob([output], { type: "application/pdf" });
    }

    if (output instanceof ArrayBuffer) {
      if (output.byteLength === 0) throw new Error("PDF generated empty file");
      return new Blob([output], { type: "application/pdf" });
    }

    if (output instanceof Uint8Array) {
      if (output.byteLength === 0) throw new Error("PDF generated empty file");
      return new Blob([output], { type: "application/pdf" });
    }

    const text = String(output).trim();

    // Normal output from src/utils/generateReport.js:
    // data:application/pdf;base64,JVBERi0x...
    if (text.startsWith("data:application/pdf")) {
      const res = await fetch(text);
      const blob = await res.blob();
      if (!blob || blob.size === 0) throw new Error("PDF generated empty file");
      return new Blob([blob], { type: "application/pdf" });
    }

    // Some older versions return only raw base64 without the data URL prefix.
    const cleanedBase64 = text.includes(",") ? text.split(",").pop() : text;
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(cleanedBase64) && cleanedBase64.length > 100) {
      const binary = atob(cleanedBase64.replace(/\s/g, ""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      if (bytes.length === 0) throw new Error("PDF generated empty file");
      return new Blob([bytes], { type: "application/pdf" });
    }

    throw new Error("Invalid PDF data returned from generateReport.js");
  };

  const createPdfBlobFromReport = async () => {
    const { resolvedReport } = await buildResolvedReportForPDF();

    // IMPORTANT: use the existing Generate Report PDF generator that RETURNS PDF data.
    // generateBGVReport() only downloads the file and returns undefined,
    // so CRM Check preview/download must call generateBGVReportAsBase64().
    const generatedPdf = await generateBGVReportAsBase64(resolvedReport);
    return await reportOutputToPdfBlob(generatedPdf);
  };

  const handleDownload = async () => {
    if (!report) return;
    setIsPdfLoading(true);
    try {
      const blob = await createPdfBlobFromReport();
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.caseId || "BGV"}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Download error:", error);
      alert(error?.message || "Unable to download PDF. Please try again.");
    } finally { setIsPdfLoading(false); }
  };
 
  const handlePreviewPDF = async () => {
    if (!report) return;
    setIsPdfLoading(true);
    try {
      const blobUrl = await createHtmlPreviewBlobUrl(report);
      if (pdfPreview?.blobUrl) URL.revokeObjectURL(pdfPreview.blobUrl);
      setPdfPreview({ blobUrl, zoom: 1 });
    } catch (error) {
      console.error("Report preview error:", error);
      alert(error?.message || "Unable to open report preview.");
    } finally {
      setIsPdfLoading(false);
    }
  };
 
  // ── Generate instant HTML report preview for col-2 split view ─────────────
  const handleGenerateSplitPdf = async () => {
    if (!report) return;
    setIsSplitPdfLoading(true);
    try {
      if (splitPdfBlobUrl) { URL.revokeObjectURL(splitPdfBlobUrl); setSplitPdfBlobUrl(null); }
      // IMPORTANT: no pdfMake, no S3 image fetching here. This prevents infinite loading.
      const blobUrl = await createHtmlPreviewBlobUrl(report);
      setSplitPdfBlobUrl(blobUrl);
    } catch (error) {
      console.error("Report preview error:", error);
      alert(error?.message || "Unable to generate report preview.");
    } finally {
      setIsSplitPdfLoading(false);
    }
  };
 
  const handleSendToTrackStatus = async () => {
    if (!report?.caseId) { alert("No case selected. Please select a case first."); return; }
    setIsSending(true);
    setSendingStep("Saving...");
    try {
      // Auto-save first if not already saved
      if (!savedReport && !report?.savedAt) {
        try {
          const token = localStorage.getItem("token");
          const formData = new FormData();
          formData.append("checks", JSON.stringify(report.checks || []));
          Object.keys(report).forEach((key) => {
            const value = report[key];
            if (FILE_FIELDS.includes(key) || key === "checks") return;
            if (typeof value === "object" && value !== null && !(value instanceof File)) return;
            if (value !== undefined && value !== null) formData.append(key, value);
          });
          FILE_FIELDS.forEach((field) => {
            const arr = report[field] || [];
            const existingKeys = arr.filter(f => typeof f === "string" && isS3Key(f));
            const existingObjs = arr.filter(f => f && typeof f === "object" && isS3Key(f.key));
            const newFiles = arr.filter(f => f instanceof File);
            formData.append(field, JSON.stringify([...existingKeys, ...existingObjs.map(o => o.key)]));
            newFiles.forEach(file => formData.append(field, file));
          });
          const saveRes = await fetch("https://tervies.info/api/admin/save-qc", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const saveData = await saveRes.json();
          if (saveData.success) {
            setSavedReport({ ...report, savedAt: new Date().toISOString() });
          }
        } catch (saveErr) {
          console.warn("Auto-save before Track Status send failed:", saveErr);
          // Continue anyway
        }
      }

      setSendingStep("Generating PDF...");
      // Use html2canvas to screenshot the HTML report preview — NEVER hangs.
      // The company sees the EXACT SAME report as the CRM preview (same layout, images, color codes).
      const pdfBlob = await createHtmlToPdfBlob(report);

      setSendingStep("Uploading...");
      const formData = new FormData();
      formData.append("file", pdfBlob, `${report.caseId || "BGV"}_Report.pdf`);

      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const uploadRes = await fetch(`https://tervies.info/api/admin/upload-bgv-report/${encodeURIComponent(report.caseId)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData?.success) {
        throw new Error(uploadData?.message || "Report PDF upload failed");
      }

      setSendingStep("Sending...");
      const success = await sendReportToTrackStatus({
        ...report,
        qcApproved: true,
        sentToTrack: true,
        reportGeneratedAt: report.reportGeneratedAt || new Date().toISOString(),
      });

      if (success) {
        setSentCases((prev) => ({ ...prev, [report.caseId]: true }));
        setReport((prev) => prev ? { ...prev, qcApproved: true, sentToTrack: true } : prev);
        setSendSuccess(true);
      } else {
        alert("Failed to send report to Track Status. Please try again.");
      }
    } catch (error) {
      console.error("Send to Track Status error:", error);
      alert(error?.message || "Error sending report. Please try again.");
    } finally {
      setIsSending(false);
      setSendingStep("");
    }
  };
 
  const resetPanelLayout = () => {
    setCasePanelWidth(18);
    setPreviewPanelWidth(58);
    setDocsPanelWidth(24);
  };

  const zoomSplitIn = () => setSplitPreviewZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)));
  const zoomSplitOut = () => setSplitPreviewZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)));
  const zoomSplitReset = () => setSplitPreviewZoom(1);

  const safeChecks = Array.isArray(selectedChecks) ? selectedChecks : [];
 
  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="qc-root">
      {/* ── Modals & overlays (all ORIGINAL — unchanged) ── */}
      {deleteTarget && (
        <DeleteConfirmModal caseId={deleteTarget} onConfirm={handleDeleteConfirm} onCancel={handleDeleteCancel} isDeleting={isDeleting} />
      )}
 
      {pdfPreview && (
        <div className="qc-pdf-modal-overlay" onClick={closePdfPreview}>
          <div className="qc-pdf-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="qc-pdf-modal-header">
              <div className="qc-pdf-modal-title">📄 PDF Preview — {report?.name || "Report"}</div>
              <div className="qc-pdf-modal-controls">
                <button className="qc-pdf-ctrl-btn" onClick={pdfZoomOut}>− Zoom Out</button>
                <span className="qc-pdf-zoom-label">{Math.round(pdfPreview.zoom * 100)}%</span>
                <button className="qc-pdf-ctrl-btn" onClick={pdfZoomIn}>+ Zoom In</button>
                <button className="qc-pdf-ctrl-btn" onClick={pdfZoomReset}>Reset</button>
                <button className="qc-pdf-close-btn" onClick={closePdfPreview}>✕ Close</button>
              </div>
            </div>
            <div className="qc-pdf-iframe-wrap">
              <div style={{ width: `${Math.round(794 * pdfPreview.zoom)}px`, minHeight: `${Math.round(1123 * pdfPreview.zoom)}px`, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                <iframe
                  className="qc-pdf-iframe"
                  src={pdfPreview.blobUrl}
                  style={{ width: "794px", height: "1123px", transform: `scale(${pdfPreview.zoom})`, transformOrigin: "top center", flexShrink: 0 }}
                  title="Report Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}
 
      {isPdfLoading && (
        <div className="qc-preview-loading-overlay">
          <div className="qc-preview-loading-box">
            <div className="qc-preview-spinner" />
            <div className="qc-preview-loading-title">Generating Preview…</div>
            <div className="qc-preview-loading-sub">
              Fetching images from server and building your report.<br />
              This may take a moment for large reports.
            </div>
          </div>
        </div>
      )}
 
      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={closeLightbox} />}
 
      {/* ── Main wrapper ── */}
      <div className="qc-wrap">
 
        {/* ── Top bar (ORIGINAL — unchanged) ── */}
        <div className="qc-topbar">
          <div>
            <h1 className="qc-title">CRM Check</h1>
            <div className="qc-sub">
              {report?.caseId ? `Case ID: ${report.caseId}` : "Select a case from the list"}
            </div>
          </div>
          <div className="qc-actions">
            {report && (
              <>
                <button className="qc-btn" onClick={handleSave}>💾 Save</button>
                <button className="qc-btn" onClick={handlePreviewPDF} disabled={isPdfLoading}>
                  {isPdfLoading ? "⏳ Generating…" : "👁️ Preview PDF"}
                </button>
                <button className="qc-btn" onClick={handleDownload} disabled={isPdfLoading}>
                  {isPdfLoading ? "⏳ Preparing…" : "⬇️ Download"}
                </button>
                {showSendButton && (
                  alreadySent ? (
                    <div className="qc-btn-sent">✓ Sent to Track Status</div>
                  ) : (
                    <button className="qc-btn-send" onClick={handleSendToTrackStatus} disabled={isSending}>
                      {isSending ? (
                        <><svg style={{ width: 16, height: 16, animation: "qcSpin 0.8s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" opacity="0.3" /><path fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> {sendingStep || "Sending..."}</>
                      ) : <>🚀 Send to Track Status</>}
                    </button>
                  )
                )}
              </>
            )}
            <button className="qc-btn" onClick={() => { if (report) { setReport(null); setSearchCaseId(""); } else navigate(-1); }}>← Back</button>
          </div>
        </div>
 
        {/* ── Banners (ORIGINAL — unchanged) ── */}
        {sendSuccess && (
          <div className="qc-send-banner">
            <div className="qc-send-banner-icon">🎉</div>
            <div>
              <div className="qc-send-banner-title">Report Sent to Track Status!</div>
              <div className="qc-send-banner-desc">
                The background verification report for <strong>{report?.name}</strong> (Case ID: <strong style={{ fontFamily: "monospace" }}>{report?.caseId}</strong>) has been approved and sent to Track Status.
              </div>
              <button className="qc-btn-send" onClick={() => setSendSuccess(false)} style={{ fontSize: 13, padding: "8px 16px" }}>✓ Got it</button>
            </div>
          </div>
        )}
 
        {alreadySent && report && !sendSuccess && (
          <div className="qc-already-sent-banner">
            <span style={{ fontSize: 20 }}>✅</span>
            <span>
              This report has already been sent to Track Status.
              Clients can search Case ID <strong style={{ fontFamily: "monospace" }}>{report.caseId}</strong> to view and download it.
            </span>
          </div>
        )}
 
        {/* ── Adjustable panel width controls ─────────────────────────────── */}
        <div
          className="qc-card"
          style={{
            padding: "6px 14px",
            marginBottom: 8,
            borderRadius: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#334155",
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                }}
              >
                Adjust Panel Width
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 10,
                  marginTop: 1,
                  lineHeight: 1.2,
                }}
              >
                Drag sliders to adjust Case Numbers, Report Preview, and Case Documents like your admin case page.
              </div>
            </div>
            <button
              onClick={resetPanelLayout}
              style={{
                background: "#fff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Reset Layout
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2.8fr 1fr",
              gap: 12,
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", padding: "0px 4px", lineHeight: 1.1 }}>
              Case Numbers
              <input
                type="range"
                min="12"
                max="35"
                value={casePanelWidth}
                onChange={(e) => setCasePanelWidth(Number(e.target.value))}
                style={{ width: "100%", height: 18, marginTop: 2 }}
              />
            </label>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", padding: "0px 4px", lineHeight: 1.1 }}>
              Report Preview
              <input
                type="range"
                min="40"
                max="70"
                value={previewPanelWidth}
                onChange={(e) => setPreviewPanelWidth(Number(e.target.value))}
                style={{ width: "100%", height: 18, marginTop: 2 }}
              />
            </label>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", padding: "0px 4px", lineHeight: 1.1 }}>
              Case Documents
              <input
                type="range"
                min="15"
                max="35"
                value={docsPanelWidth}
                onChange={(e) => setDocsPanelWidth(Number(e.target.value))}
                style={{ width: "100%", height: 18, marginTop: 2 }}
              />
            </label>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            3-COLUMN LAYOUT
            Col 1 (280px): Case list + search  — always visible
            Col 2 (flex):  PDF report preview  — empty until generated
            Col 3 (flex):  Case documents       — loads when case selected
        ════════════════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minHeight: "calc(100vh - 230px)", overflowX: "auto", paddingBottom: 8 }}>
 
          {/* ── COL 1: Case list ──────────────────────────────────────────── */}
          <div style={{ width: `${casePanelWidth}%`, minWidth: 180, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
 
            {/* Search card */}
            <div className="qc-card" style={{ padding: "14px 16px" }}>
              <div className="qc-search-row">
                <input
                  type="text"
                  placeholder="Enter Case ID"
                  value={searchCaseId}
                  onChange={(e) => setSearchCaseId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="qc-search-input"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button className="qc-btn" onClick={handleSearch}>Search</button>
              </div>
            </div>
 
            {/* Cases list card */}
            <div className="qc-card" style={{ padding: "14px 16px", flex: 1 }}>
              <h2 className="qc-section-title" style={{ marginBottom: 10 }}>Case Numbers</h2>
              {displayedReports.length === 0 ? (
                <div className="qc-empty" style={{ padding: "20px 0" }}>
                  <h2 style={{ fontSize: 14 }}>No cases found</h2>
                  <p style={{ fontSize: 12 }}>Generate Report page se case save hone ke baad yahan show hoga.</p>
                </div>
              ) : (
                <div className="qc-case-list" style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
                  {displayedReports.map((item) => {
                    const isSent = sentCases[item.caseId] || item.sentToTrack;
                    const isActive = String(report?.caseId) === String(item.caseId);
                    return (
                      <button
                        key={item.caseId}
                        className={`qc-case-btn ${isActive ? "active" : ""} ${isSent ? "sent" : ""}`}
                        onClick={() => handleSelectCase(item.caseId)}
                      >
                        <div className="qc-case-id">{item.caseId}</div>
                        <div className="qc-case-meta">{item.name || "Unnamed Candidate"} • {item.clientName || "No Client"}</div>
                        {isSent && <div className="qc-case-badge sent">✓ Sent to Track Status</div>}
                        <span
                          className="qc-delete-btn"
                          onClick={(e) => handleDeleteClick(item.caseId, e)}
                          title="Delete this case"
                        >
                          🗑️ Delete
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
 
          {/* ── COL 2: Report Preview ─────────────────────────────────── */}
          <div style={{ width: `${previewPanelWidth}%`, minWidth: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              className="qc-card"
              style={{
                padding: 0,
                overflow: "hidden",
                minHeight: "calc(100vh - 180px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Col-2 header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", flex: 1 }}>Report Preview</span>
                {report && !splitPdfBlobUrl && !isSplitPdfLoading && (
                  <button
                    onClick={handleGenerateSplitPdf}
                    style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    ⚡ Generate Preview
                  </button>
                )}
                {splitPdfBlobUrl && (
                  <>
                    <button onClick={zoomSplitOut} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>−</button>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 800, minWidth: 42, textAlign: "center" }}>{Math.round(splitPreviewZoom * 100)}%</span>
                    <button onClick={zoomSplitIn} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>＋</button>
                    <button onClick={zoomSplitReset} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reset</button>
                    <button onClick={handleDownload} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      ⬇️ Download
                    </button>
                    <button
                      onClick={() => { URL.revokeObjectURL(splitPdfBlobUrl); setSplitPdfBlobUrl(null); }}
                      style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      ✕ Clear
                    </button>
                  </>
                )}
              </div>
 
              {/* Col-2 content */}
              <div style={{ flex: 1, overflow: "auto", background: "#e8ecf0", display: "flex", alignItems: isSplitPdfLoading || !splitPdfBlobUrl ? "center" : "flex-start", justifyContent: "center", padding: 16 }}>
                {isSplitPdfLoading ? (
                  <div style={{ textAlign: "center", color: "#64748b" }}>
                    <div style={{ width: 44, height: 44, border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "qcSpin 0.8s linear infinite", margin: "0 auto 14px" }} />
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Generating Preview…</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Building report preview</div>
                  </div>
                ) : splitPdfBlobUrl ? (
                  <div
                    style={{
                      width: Math.round(794 * splitPreviewZoom),
                      minHeight: Math.round(1123 * splitPreviewZoom),
                      flexShrink: 0,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <iframe
                      src={splitPdfBlobUrl}
                      title="Report Preview"
                      style={{
                        width: 794,
                        minHeight: 1123,
                        border: "none",
                        borderRadius: 6,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                        background: "#fff",
                        display: "block",
                        transform: `scale(${splitPreviewZoom})`,
                        transformOrigin: "top center",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>📋</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#64748b", marginBottom: 6 }}>
                      {report ? "Preview not generated yet" : "No case selected"}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 18 }}>
                      {report
                        ? 'Click "⚡ Generate Preview" above to load the report'
                        : "Select a case from the left column"}
                    </div>
                    {report && (
                      <button
                        onClick={handleGenerateSplitPdf}
                        style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                      >
                        ⚡ Generate Report Preview
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
 
          {/* ── COL 3: Case Documents ─────────────────────────────────────── */}
          <div style={{ width: `${docsPanelWidth}%`, minWidth: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              className="qc-card"
              style={{
                padding: 0,
                overflow: "hidden",
                minHeight: "calc(100vh - 180px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CaseDocsPanel report={report} />
            </div>
 
            {/* QC detail fields (expandable, appears below col-3 on the right) */}
            {report && (
              <>
                {/* Collapsible header */}
                <div
                  className="qc-detail-collapsed"
                  onClick={() => setDetailExpanded((v) => !v)}
                  style={{ marginTop: 0 }}
                >
                  <div className="qc-detail-collapsed-info">
                    <div className="qc-detail-collapsed-name">{report.name || "Unnamed Candidate"}</div>
                    <div className="qc-detail-collapsed-id">
                      Case ID: {report.caseId}
                      {alreadySent && (
                        <span style={{ marginLeft: 10, background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                          ✓ Sent to Track Status
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`qc-detail-chevron${detailExpanded ? " open" : ""}`}>⌄</span>
                </div>
              </>
            )}
          </div>
        </div>
 
        {/* ── Expandable QC detail fields (full width, below all 3 cols) ── */}
        {report && detailExpanded && (
          <>
            <div className="qc-card" style={{ marginTop: 10 }}>
              <h2 className="qc-section-title">Case Summary</h2>
              <div className="qc-grid">
                <Item label="Applicant Name" name="name" value={report.name} onChange={handleChange} />
                <Item label="Case ID" name="caseId" value={report.caseId} onChange={handleChange} />
                <Item label="Gender" name="gender" value={report.gender} onChange={handleChange} />
                <Item label="Date of Birth" name="dob" value={report.dob} onChange={handleChange} />
                <Item label="Client Name" name="clientName" value={report.clientName} onChange={handleChange} />
                <Item label="Client Case ID" name="clientCaseId" value={report.clientCaseId} onChange={handleChange} />
                <Item label="Allocation Date" name="allocationDate" value={report.allocationDate} onChange={handleChange} />
                <Item label="Delivery Date" name="deliveryDate" value={report.deliveryDate} onChange={handleChange} />
                <Item label="Assigned Company" name="assignedCompany" value={report.assignedCompany} onChange={handleChange} />
                <Item label="Level of Check" name="level" value={report.level} onChange={handleChange} />
                <Item label="Color Code" name="color" value={report.color} onChange={handleChange} />
                <Item label="Saved At" name="savedAt" value={report.savedAt ? new Date(report.savedAt).toLocaleString() : ""} onChange={handleChange} />
              </div>
            </div>
 
            <div className="qc-card">
              <h2 className="qc-section-title">Selected Checks</h2>
              <div className="qc-check-pill-wrap">
                {safeChecks.length > 0 ? safeChecks.map((check) => <div key={check} className="qc-pill">{check}</div>) : <div>No checks selected</div>}
              </div>
            </div>
 
            {(safeChecks.includes("Employment Check") || hasEmployment) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Employment Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Employment Check" />
                <FileSection files={report.employmentScreenshots} label="Screenshots" onImageClick={openLightbox} globalImages={allImages} globalOffset={empOffset} />
                <FileSection files={report.employmentDocuments} label="Documents" onImageClick={openLightbox} globalImages={allImages} globalOffset={empOffset + (report.employmentScreenshots?.length || 0)} />
              </div>
            )}
 
            {(safeChecks.includes("Residential Address Check") || hasResidential) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Residential Address Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Residential Address Check" />
                <FileSection files={report.residentialScreenshots} label="Screenshots" onImageClick={openLightbox} globalImages={allImages} globalOffset={resOffset} />
                <FileSection files={report.residentialDocuments} label="Documents" onImageClick={openLightbox} globalImages={allImages} globalOffset={resOffset + (report.residentialScreenshots?.length || 0)} />
              </div>
            )}
 
            {(safeChecks.includes("Educational Qualification Check") || hasEducation) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Educational Qualification Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Educational Qualification Check" />
                <FileSection files={report.educationalScreenshots} label="Screenshots" onImageClick={openLightbox} globalImages={allImages} globalOffset={eduOffset} />
                <FileSection files={report.educationalAnnexureE} label="Documents" onImageClick={openLightbox} globalImages={allImages} globalOffset={eduOffset + (report.educationalScreenshots?.length || 0)} />
              </div>
            )}
 
            {(safeChecks.includes("Professional Reference Check") || hasProfessional) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Professional Reference Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Professional Reference Check" />
                <FileSection files={report.professionalScreenshots} label="Screenshots" onImageClick={openLightbox} globalImages={allImages} globalOffset={proOffset} />
                <FileSection files={report.professionalAnnexureF} label="Documents" onImageClick={openLightbox} globalImages={allImages} globalOffset={proOffset + (report.professionalScreenshots?.length || 0)} />
              </div>
            )}
 
            {(safeChecks.includes("Criminal Police Record Check") || hasCriminal) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Criminal Police Record Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Criminal Police Record Check" />
                <FileSection files={report.criminalScreenshots} label="Screenshots" onImageClick={openLightbox} globalImages={allImages} globalOffset={criOffset} />
                <FileSection files={report.criminalDocuments} label="Documents" onImageClick={openLightbox} globalImages={allImages} globalOffset={criOffset + (report.criminalScreenshots?.length || 0)} />
              </div>
            )}
 
            {(safeChecks.includes("Criminal Database Check") || hasDatabase) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Criminal Database Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Criminal Database Check" />
                <FileSection files={report.databaseScreenshots} label="Screenshots" onImageClick={openLightbox} globalImages={allImages} globalOffset={dbOffset} />
                <FileSection files={report.databaseAnnexureG} label="Documents" onImageClick={openLightbox} globalImages={allImages} globalOffset={dbOffset + (report.databaseScreenshots?.length || 0)} />
              </div>
            )}
 
            {(safeChecks.includes("Identity Check (PAN Card)") || safeChecks.includes("Identity Check (Aadhar Card)") || hasIdentity) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Identity Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Identity Check (PAN Card)" />
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Identity Check (Aadhar Card)" />
                <FileSection files={report.identityScreenshots} label="Screenshots" onImageClick={openLightbox} globalImages={allImages} globalOffset={idOffset} />
                <FileSection files={report.identityDocuments} label="Documents" onImageClick={openLightbox} globalImages={allImages} globalOffset={idOffset + (report.identityScreenshots?.length || 0)} />
              </div>
            )}
 
            {(safeChecks.includes("Credit Check") || hasCredit) && (
              <div className="qc-card">
                <h2 className="qc-section-title">Credit Check</h2>
                <EmployeeCheckBadge checkStatuses={report.checkStatuses} checkNotes={report.checkNotes} checkName="Credit Check" />
                <FileSection
                  files={report.creditScreenshots}
                  label="Screenshots"
                  onImageClick={openLightbox}
                  globalImages={allImages}
                  globalOffset={buildOffset([
                    report?.employmentScreenshots, report?.employmentDocuments,
                    report?.residentialScreenshots, report?.residentialDocuments,
                    report?.educationalScreenshots, report?.educationalAnnexureE,
                    report?.professionalScreenshots, report?.professionalAnnexureF,
                    report?.criminalScreenshots, report?.criminalDocuments,
                    report?.databaseScreenshots, report?.databaseAnnexureG,
                    report?.identityScreenshots, report?.identityDocuments,
                  ])}
                />
                <FileSection
                  files={report.creditDocuments}
                  label="Documents"
                  onImageClick={openLightbox}
                  globalImages={allImages}
                  globalOffset={buildOffset([
                    report?.employmentScreenshots, report?.employmentDocuments,
                    report?.residentialScreenshots, report?.residentialDocuments,
                    report?.educationalScreenshots, report?.educationalAnnexureE,
                    report?.professionalScreenshots, report?.professionalAnnexureF,
                    report?.criminalScreenshots, report?.criminalDocuments,
                    report?.databaseScreenshots, report?.databaseAnnexureG,
                    report?.identityScreenshots, report?.identityDocuments,
                    report?.creditScreenshots,
                  ])}
                />
              </div>
            )}
 
            {showSendButton && (
              <div className="qc-card" style={{ border: "2px solid #6ee7b7", background: "#f0fdf4" }}>
                <h2 className="qc-section-title" style={{ color: "#064e3b" }}>🚀 Send to Track Status</h2>
                {alreadySent ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#dcfce7", borderRadius: 14, border: "2px solid #86efac", color: "#166534", fontWeight: 700, fontSize: 15 }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <div>
                      <div>Report already sent to Track Status</div>
                      <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4, color: "#15803d" }}>
                        Track Status will show Case ID <strong style={{ fontFamily: "monospace" }}>{report.caseId}</strong> after sending.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: "#065f46", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                      The report has been saved and is ready to be sent to Track Status.
                      Once sent, Track Status will be able to use Case ID{" "}
                      <strong style={{ fontFamily: "monospace" }}>{report.caseId}</strong> and download the background verification report.
                    </p>
                    <button className="qc-btn-send" onClick={handleSendToTrackStatus} disabled={isSending} style={{ fontSize: 15, padding: "14px 28px" }}>
                      {isSending ? (
                        <><svg style={{ width: 18, height: 18, animation: "qcSpin 0.8s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" opacity="0.3" /><path fill="white" d="M4 12a8 8 0 018-8v8z" /></svg> {sendingStep || "Sending..."}</>
                      ) : <>🚀 Send to Track Status</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
 
      </div>
    </div>
  );
}