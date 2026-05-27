import { useRef, useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { generateBGVReport } from "../utils/generateReport";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  .gr-root {
    min-height: 100vh;
    background: #f0f4fa;
    font-family: 'DM Sans', sans-serif;
    color: #1a2a3a;
    padding: 48px 24px;
    position: relative;
  }

  .gr-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 800px 600px at 10% 0%, rgba(59,130,246,0.10) 0%, transparent 70%),
      radial-gradient(ellipse 600px 400px at 90% 100%, rgba(37,99,235,0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .gr-inner {
    max-width: 1100px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .gr-page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 1.5px solid #d1ddf0;
  }

  .gr-tag {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #2563eb;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 4px 12px;
    border-radius: 99px;
    margin-bottom: 10px;
    display: inline-block;
  }

  .gr-title {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 700;
    color: #0f2340;
    line-height: 1.15;
    letter-spacing: -0.5px;
  }

  .gr-subtitle {
    font-size: 13px;
    color: #6b7f99;
    margin-top: 6px;
  }

  .gr-badge {
    background: linear-gradient(135deg, #1e40af, #2563eb);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 6px 16px;
    border-radius: 99px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: 0 4px 14px rgba(37,99,235,0.30);
  }

  .gr-prefill-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: #f0fdf4;
    border: 1.5px solid #86efac;
    border-radius: 14px;
    padding: 14px 20px;
    margin-bottom: 28px;
    font-size: 13px;
    color: #166534;
    font-weight: 500;
  }

  .gr-prefill-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .gr-prefill-chip {
    background: #dcfce7;
    border: 1px solid #86efac;
    border-radius: 99px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #15803d;
  }

  .gr-card {
    background: #ffffff;
    border: 1px solid #dde8f5;
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 24px;
    box-shadow: 0 2px 16px rgba(37,99,235,0.05);
    position: relative;
    overflow: hidden;
  }

  .gr-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #2563eb, #1d4ed8);
    border-radius: 4px 0 0 4px;
  }

  .gr-section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #2563eb;
    margin-bottom: 6px;
  }

  .gr-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    color: #0f2340;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .gr-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2ecf8;
  }

  .gr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .gr-full {
    grid-column: 1 / -1;
  }

  .gr-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .gr-label {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5b7ea0;
  }

  .gr-label-auto {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #16a34a;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .gr-label-auto-badge {
    font-size: 9px;
    background: #dcfce7;
    border: 1px solid #86efac;
    color: #15803d;
    border-radius: 99px;
    padding: 1px 6px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .gr-input {
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    background: #f7faff;
    border: 1.5px solid #dce8f5;
    border-radius: 10px;
    padding: 10px 14px;
    color: #0f2340;
    outline: none;
    transition: all 0.18s ease;
    width: 100%;
    box-sizing: border-box;
  }

  .gr-input:focus {
    border-color: #2563eb;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
  }

  .gr-input.auto {
    background: #f0fdf4;
    border-color: #86efac;
    color: #14532d;
  }

  .gr-input.auto:focus {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22,163,74,0.12);
  }

  .gr-select {
    appearance: none;
    padding-right: 36px;
  }

  textarea.gr-input {
    resize: vertical;
    min-height: 90px;
    line-height: 1.6;
  }

  .gr-checks-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .gr-check-tile {
    cursor: pointer;
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: 1.5px solid #dce8f5;
    background: #f7faff;
    transition: all 0.18s ease;
    font-size: 13px;
    font-weight: 500;
    color: #3a5070;
  }

  .gr-check-tile.active {
    border-color: #2563eb;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    color: #1d4ed8;
    box-shadow: 0 2px 10px rgba(37,99,235,0.12);
  }

  .gr-check-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid #dce8f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    flex-shrink: 0;
    color: transparent;
  }

  .gr-check-tile.active .gr-check-icon {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .gr-emp-card {
    background: linear-gradient(135deg, #f0f7ff, #e8f2ff);
    border: 1.5px solid #bfdbfe;
    border-radius: 16px;
    padding: 28px;
    margin-bottom: 24px;
  }

  .gr-emp-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gr-emp-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2563eb;
    display: inline-block;
  }

  .gr-compare-wrap {
    display: grid;
    gap: 18px;
  }

  .gr-compare-row {
    display: grid;
    grid-template-columns: 220px 1fr 1fr;
    gap: 14px;
    align-items: start;
  }

  .gr-compare-label {
    font-size: 12px;
    font-weight: 700;
    color: #1e3a5f;
    padding-top: 12px;
  }

  .gr-col-head {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #2563eb;
    margin-bottom: 8px;
  }

  .gr-upload-section {
    margin-top: 28px;
  }

  .gr-upload-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .gr-upload-box {
    border: 1.5px dashed #93c5fd;
    border-radius: 14px;
    padding: 22px;
    background: #f7fbff;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .gr-upload-box:hover {
    background: #eff6ff;
    border-color: #2563eb;
    transform: translateY(-2px);
  }

  .gr-upload-icon {
    font-size: 22px;
    margin-bottom: 6px;
  }

  .gr-upload-title {
    font-size: 13px;
    font-weight: 600;
    color: #1d4ed8;
  }

  .gr-upload-sub {
    font-size: 11px;
    color: #6b7f99;
  }

  .gr-upload-count {
    margin-top: 8px;
    font-size: 11px;
    color: #334155;
    font-weight: 600;
  }

  .gr-thumb-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 4px;
  }

  .gr-thumb-item {
    position: relative;
    width: 90px;
    border-radius: 10px;
    overflow: visible;
    border: 1.5px solid #bfdbfe;
    background: #fff;
  }

  .gr-thumb-img {
    width: 90px;
    height: 70px;
    object-fit: cover;
    border-radius: 8px;
    display: block;
  }

  .gr-thumb-name {
    font-size: 9px;
    color: #334155;
    text-align: center;
    padding: 3px 4px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gr-thumb-delete {
    position: absolute;
    top: -7px;
    right: -7px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ef4444;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(239,68,68,0.35);
    transition: background 0.15s;
    padding: 0;
  }

  .gr-thumb-delete:hover { background: #b91c1c; }

  .gr-file-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 99px;
    padding: 4px 10px 4px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #1e40af;
    margin: 3px 3px;
  }

  .gr-file-pill-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: #ef4444;
    font-size: 13px;
    font-weight: 700;
    padding: 0 0 0 2px;
    line-height: 1;
    display: flex;
    align-items: center;
  }

  .gr-file-pill-delete:hover { color: #b91c1c; }

  .gr-submit-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 14px;
    padding-top: 8px;
    flex-wrap: wrap;
  }

  .gr-submit-note {
    font-size: 12px;
    color: #8aa0ba;
    margin-right: auto;
  }

  .gr-btn-group {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  .gr-btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    background: linear-gradient(135deg, #1e40af, #2563eb);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 32px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 6px 20px rgba(37,99,235,0.30);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gr-btn:hover { transform: translateY(-1px); }
  .gr-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .gr-btn-secondary {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 32px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 6px 20px rgba(99,102,241,0.30);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gr-btn-secondary:hover { transform: translateY(-1px); }
  .gr-btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .gr-btn-search {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    background: linear-gradient(135deg, #1e40af, #2563eb);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 22px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 6px 20px rgba(37,99,235,0.24);
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .gr-btn-search:hover { transform: translateY(-1px); }

  .gr-company-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #dcfce7;
    border: 1px solid #86efac;
    border-radius: 99px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #15803d;
    margin-top: 2px;
  }

  .gr-search-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: end;
    margin-bottom: 16px;
  }

  .gr-search-results { display: grid; gap: 12px; margin-top: 10px; }

  .gr-search-card {
    border: 1.5px solid #dce8f5;
    background: #f7faff;
    border-radius: 14px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .gr-search-card:hover {
    border-color: #2563eb;
    background: #eff6ff;
    box-shadow: 0 2px 10px rgba(37,99,235,0.10);
  }

  .gr-search-card-title { font-size: 15px; font-weight: 700; color: #0f2340; margin-bottom: 6px; }

  .gr-search-card-meta {
    font-size: 12px;
    color: #5b7ea0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .gr-search-empty {
    font-size: 13px;
    color: #6b7f99;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    padding: 14px 16px;
    margin-top: 10px;
  }

  .gr-saving-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gr-saving-box {
    background: white;
    border-radius: 20px;
    padding: 36px 48px;
    text-align: center;
    box-shadow: 0 24px 80px rgba(0,0,0,0.25);
  }

  .gr-saving-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #dbeafe;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: grSpin 0.8s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes grSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .gr-saving-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f2340;
    margin-bottom: 6px;
  }

  .gr-saving-sub {
    font-size: 13px;
    color: #6b7f99;
  }

  @media (max-width: 900px) {
    .gr-compare-row { grid-template-columns: 1fr; }
    .gr-compare-label { padding-top: 0; margin-bottom: -4px; }
    .gr-grid, .gr-checks-grid, .gr-search-row, .gr-upload-buttons { grid-template-columns: 1fr; }
  }
`;

if (typeof document !== "undefined" && !document.getElementById("gr-style")) {
  const s = document.createElement("style");
  s.id = "gr-style";
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const AUTO_GROUP_LABELS = {
  name: "Name", caseId: "Case ID", gender: "Gender", dob: "Date of Birth",
  clientName: "Client Name", clientCaseId: "Client Case ID", color: "Color Code",
  allocationDate: "Allocation Date", deliveryDate: "Delivery Date", assignedCompany: "Assigned Company",
};

const FILE_FIELDS = [
  "employmentDocuments","employmentScreenshots",
  "residentialDocuments","residentialScreenshots",
  "educationalAnnexureE","educationalScreenshots",
  "professionalAnnexureF","professionalScreenshots",
  "criminalDocuments","criminalScreenshots",
  "databaseAnnexureG","databaseScreenshots",
  "identityDocuments","identityScreenshots",
  // ── NEW ──
  "creditDocuments","creditScreenshots",
];

const DEFAULT_FORM = {
  name:"",caseId:"",gender:"",dob:"",allocationDate:"",deliveryDate:"",
  clientName:"",clientCaseId:"",assignedCompany:"",level:"STANDARD",color:"Green",
  respondentName:"",designation:"",contactEmail:"",organization:"",companyContact:"",
  employmentDates:"",employeeCode:"",supervisor:"",salary:"",reasonLeaving:"",rehire:"",comments:"",
  vfRespondentName:"",vfDesignation:"",vfContactEmail:"",vfOrganization:"",vfCompanyContact:"",
  vfEmploymentDates:"",vfEmployeeCode:"",vfSupervisor:"",vfSalary:"",vfReasonLeaving:"",vfRehire:"",vfComments:"",
  residentialCaseRefNo:"",residentialCandidateName:"",residentialFatherName:"",residentialDob:"",
  residentialConfirmationAddress:"",residentialAddressType:"",residentialContactNumber:"",
  residentialPeriodOfStay:"",residentialPropertyType:"",residentialPhotoIdProofSignature:"",
  residentialRespondentName:"",residentialSpecialComments:"",
  eduRespondentName:"",eduDesignation:"",eduInstituteName:"",eduUniversityName:"",
  eduYearOfPassing:"",eduQualificationObtained:"",eduFinalRemarks:"",eduAdditionalRemarks:"",
  profRespondentName:"",profDesignation:"",profOrganization:"",profApplicantName:"",
  profEmployerName:"",profLastPositionHeld:"",profDutiesAndResponsibilities:"",profYearOfAssociation:"",
  profSubjectKnowledge:"",profCommunicationSkill:"",profPerformanceRating:"",profSoftSkills:"",
  profBehaviorAndConduct:"",profIntegrityIssues:"",profProfessionalStrengths:"",profOverallAssessment:"",profAdditionalComments:"",
  criminalRespondentName:"",criminalDesignation:"",criminalPoliceStationName:"",
  criminalDateOfVerification:"",criminalCandidateAddress:"",criminalFinalRemarks:"",criminalAdditionalRemarks:"",
  dbCandidateName:"",dbFathersName:"",dbDob:"",dbDateOfVerification:"",dbAddressProvided:"",
  dbAddressIdProofProvided:"",dbCaseInitiationDate:"",dbCaseCompletionDate:"",dbRecordSummary:"",dbAdditionalRemarks:"",
  panCandidateName:"",panFatherName:"",panDob:"",panNumber:"",panVerifiedName:"",
  panVerifiedFatherName:"",panVerifiedDob:"",panVerifiedNumber:"",panVerificationDate:"",panRespondentName:"Online",panFinalRemarks:"",
  aadharCandidateName:"",aadharFatherName:"",aadharDob:"",aadharNumber:"",aadharVerifiedName:"",
  aadharVerifiedFatherName:"",aadharVerifiedDob:"",aadharVerifiedNumber:"",aadharVerificationDate:"",aadharRespondentName:"Online",aadharFinalRemarks:"",
  // ── NEW: Credit Check fields ──
  creditAgencyName:"",creditScore:"",creditRating:"",creditReportDate:"",
  creditCandidateName:"",creditDob:"",creditPanNumber:"",creditAadharNumber:"",
  creditAccountsFound:"",creditDefaultOrDues:"",creditRespondentName:"Online",
  creditFinalRemarks:"",creditAdditionalRemarks:"",
  // ── File arrays ──
  employmentDocuments:[],employmentScreenshots:[],residentialDocuments:[],residentialScreenshots:[],
  educationalAnnexureE:[],educationalScreenshots:[],professionalAnnexureF:[],professionalScreenshots:[],
  criminalDocuments:[],criminalScreenshots:[],databaseAnnexureG:[],databaseScreenshots:[],
  identityDocuments:[],identityScreenshots:[],
  // ── NEW ──
  creditDocuments:[],creditScreenshots:[],
};

// ─────────────────────────────────────────────────────────────────────────────
// FILE SERIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

function saveLightMeta(serializedReport, existing = null) {
  const light = {
    caseId: serializedReport.caseId, name: serializedReport.name || "",
    clientName: serializedReport.clientName || "", clientCaseId: serializedReport.clientCaseId || "",
    gender: serializedReport.gender || "", dob: serializedReport.dob || "",
    allocationDate: serializedReport.allocationDate || "", deliveryDate: serializedReport.deliveryDate || "",
    assignedCompany: serializedReport.assignedCompany || "", level: serializedReport.level || "",
    color: serializedReport.color || "", checks: serializedReport.checks || [],
    savedAt: serializedReport.savedAt || new Date().toISOString(), sentToTrack: serializedReport.sentToTrack || false,
  };
  const prev = existing || JSON.parse(localStorage.getItem("qualityCheckReports") || "[]");
  const filtered = prev.filter(r => String(r.caseId) !== String(light.caseId));
  try { localStorage.setItem("qualityCheckReports", JSON.stringify([light, ...filtered])); } catch (e) { console.warn("qualityCheckReports save failed:", e.message); }
  localStorage.setItem("latestQualityCheckCaseId", light.caseId);
  return light;
}


function isSameStoredFile(a, b) {
  const ak = typeof a === "string" ? a : (a?.key || a?.dataUrl || a?.url || a?.name || a?.originalName || "");
  const bk = typeof b === "string" ? b : (b?.key || b?.dataUrl || b?.url || b?.name || b?.originalName || "");
  return String(ak) && String(ak) === String(bk);
}

function mergeFileArrays(...arrays) {
  const merged = [];
  arrays.flat().filter(Boolean).forEach((item) => {
    if (!merged.some((existing) => isSameStoredFile(existing, item))) merged.push(item);
  });
  return merged;
}

function mergeFileFields(base = {}, incoming = {}) {
  const result = { ...base, ...incoming };
  FILE_FIELDS.forEach((field) => {
    result[field] = mergeFileArrays(base[field] || [], incoming[field] || []);
  });
  return result;
}

function getStoredCaseById(caseId) {
  if (!caseId) return null;
  const q = String(caseId).trim().toLowerCase();
  const keys = ["selectedCaseForReport", "lastPrefilledReportCase", "qualityCheckReports", "cases", "allCases", "uploadedCases", "excelData", "clientsData"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const found = list.find((item) => {
        const id = item?.caseId || item?.caseID || item?.clientCaseId || item?.id;
        return String(id || "").trim().toLowerCase() === q;
      });
      if (found) return found;
    } catch {}
  }
  return null;
}


// ─────────────────────────────────────────────────────────────────────────────
// READ FULL CASE DETAILS SAVED BY CaseDetailsPage / CasesPage FROM INDEXEDDB
// CaseDetailsPage stores the user-edited full form in BGV_AdminDB → admin_cases.
// localStorage only keeps a light copy, so Generate Report must read IndexedDB
// to auto-fill every field again.
// ─────────────────────────────────────────────────────────────────────────────
const GR_CASE_DB_NAME = "BGV_AdminDB";
const GR_CASE_DB_VERSION = 1;
const GR_CASE_STORE_NAME = "admin_cases";

function openGenerateReportCaseDB() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) return resolve(null);
    const req = indexedDB.open(GR_CASE_DB_NAME, GR_CASE_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(GR_CASE_STORE_NAME)) db.createObjectStore(GR_CASE_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function getIndexedDBCaseById(caseId) {
  try {
    if (!caseId) return null;
    const q = String(caseId).trim().toLowerCase();
    const db = await openGenerateReportCaseDB();
    if (!db) return null;
    const rows = await new Promise((resolve) => {
      const tx = db.transaction(GR_CASE_STORE_NAME, "readonly");
      const req = tx.objectStore(GR_CASE_STORE_NAME).get("all_cases");
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
    return rows.find((item) => {
      const id = item?.caseId || item?.caseID || item?.clientCaseId || item?.id;
      return String(id || "").trim().toLowerCase() === q;
    }) || null;
  } catch (err) {
    console.warn("GenerateReport IndexedDB case read skipped:", err);
    return null;
  }
}

function isUsefulValue(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return true;
  return String(value).trim() !== "";
}

function mergeNonEmptyObjects(...objects) {
  const result = {};
  objects.filter(Boolean).forEach((obj) => {
    Object.entries(obj).forEach(([key, value]) => {
      if (FILE_FIELDS.includes(key)) return;
      if (isUsefulValue(value)) result[key] = value;
    });
  });
  FILE_FIELDS.forEach((field) => {
    result[field] = mergeFileArrays(...objects.map(obj => obj?.[field] || []));
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE PREVIEW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getPreviewUrl(item) {
  if (!item) return null;
  if (item?.isSerializedFile) return item.dataUrl;
  if (item instanceof File || item instanceof Blob) return URL.createObjectURL(item);
  return null;
}

function isImageItem(item) {
  if (!item) return false;
  if (item?.isSerializedFile) return item.type?.startsWith("image/");
  if (item instanceof File) return item.type?.startsWith("image/");
  return false;
}

function getItemName(item) {
  if (!item) return "";
  return item.name || "file";
}

function FilePreviewList({ files, onDelete }) {
  const images = files.filter(isImageItem);
  const others = files.filter(f => !isImageItem(f));
  return (
    <div>
      {images.length > 0 && (
        <div className="gr-thumb-grid">
          {images.map((file, idx) => {
            const url = getPreviewUrl(file);
            return (
              <div className="gr-thumb-item" key={idx}>
                {url ? <img src={url} alt={getItemName(file)} className="gr-thumb-img" /> : (
                  <div className="gr-thumb-img" style={{ background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>🖼️</div>
                )}
                <div className="gr-thumb-name">{getItemName(file)}</div>
                <button className="gr-thumb-delete" onClick={() => onDelete(files.indexOf(file))}>✕</button>
              </div>
            );
          })}
        </div>
      )}
      {others.length > 0 && (
        <div style={{ marginTop: images.length ? 10 : 0, display:"flex", flexWrap:"wrap" }}>
          {others.map((file, idx) => (
            <span className="gr-file-pill" key={idx}>
              📄 {getItemName(file)}
              <button className="gr-file-pill-delete" onClick={() => onDelete(files.indexOf(file))}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ label, name, form, onChange, full, auto }) => (
  <div className={`gr-field${full ? " gr-full" : ""}`}>
    <label className={auto ? "gr-label-auto" : "gr-label"}>
      {label}{auto && <span className="gr-label-auto-badge">AUTO</span>}
    </label>
    <input name={name} value={form[name] ?? ""} onChange={onChange} className={`gr-input${auto ? " auto" : ""}`} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function GenerateReport() {
  const location = useLocation();
  const navigate  = useNavigate();
  const prefilled = location.state?.prefilled || {};

  const [form,          setForm]          = useState(DEFAULT_FORM);
  const [checks,        setChecks]        = useState([]);
  const [autoFields,    setAutoFields]    = useState(new Set());
  const [searchCaseId,  setSearchCaseId]  = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);

  // File input refs
  const employmentAnnexureRef   = useRef(null);
  const employmentScreenshotRef = useRef(null);
  const residentialAnnexureRef  = useRef(null);
  const residentialScreenshotRef= useRef(null);
  const educationalAnnexureRef  = useRef(null);
  const educationalScreenshotRef= useRef(null);
  const professionalAnnexureRef = useRef(null);
  const professionalScreenshotRef=useRef(null);
  const criminalAnnexureRef     = useRef(null);
  const criminalScreenshotRef   = useRef(null);
  const databaseAnnexureRef     = useRef(null);
  const databaseScreenshotRef   = useRef(null);
  const identityAnnexureRef     = useRef(null);
  const identityScreenshotRef   = useRef(null);
  // ── NEW ──
  const creditAnnexureRef       = useRef(null);
  const creditScreenshotRef     = useRef(null);

  // Available cases for search
  const availableCases = useMemo(() => {
    const keys = ["cases","allCases","uploadedCases","excelData","clientsData","qualityCheckReports","selectedCaseForReport","lastPrefilledReportCase"];
    const merged = [];
    keys.forEach(k => {
      try {
        const v = localStorage.getItem(k);
        if (!v) return;
        const p = JSON.parse(v);
        if (Array.isArray(p)) p.forEach(i => { if (i && typeof i === "object") merged.push(i); });
        else if (p && typeof p === "object") merged.push(p);
      } catch {}
    });
    const map = new Map();
    merged.forEach((item, index) => {
      const n = normalizeCaseData(item);
      const key = String(n.caseId || n.clientCaseId || `row-${index}`).trim().toLowerCase();
      if (!key) return;
      map.set(key, map.has(key) ? { ...map.get(key), ...n } : n);
    });
    return Array.from(map.values());
  }, []);

  useEffect(() => {
    if (!prefilled || !Object.keys(prefilled).length) return;

    let isMounted = true;

    const loadPrefilledWithSavedReport = async () => {
      const { checks: preChecks = [], _autoFields = [], ...rest } = prefilled;
      const caseIdToLoad = rest.caseId || rest.clientCaseId || searchCaseId;

      let serverCase = {};
      let localStoredCase = getStoredCaseById(caseIdToLoad) || {};
      let indexedDbCase = {};

      // Read the FULL Case Details form saved in CaseDetailsPage / CasesPage.
      // This is the missing part: fields like email, phone, PAN, Aadhaar, address,
      // employment, education, etc. are stored in IndexedDB, not only localStorage.
      if (caseIdToLoad) {
        indexedDbCase = (await getIndexedDBCaseById(caseIdToLoad)) || {};

        try {
          const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
          const res = await fetch(`https://tervies.info/api/admin/case/${encodeURIComponent(caseIdToLoad)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (data?.success && data?.case) serverCase = data.case;
        } catch (err) {
          console.warn("GenerateReport prefill server load skipped:", err);
        }
      }

      if (!isMounted) return;

      // Order matters:
      // 1) server base, 2) previously generated report data,
      // 3) full Case Details form from IndexedDB, 4) current navigation payload.
      // Empty values never overwrite filled values.
      const merged = mergeNonEmptyObjects(
        normalizeCaseData(serverCase),
        normalizeCaseData(localStoredCase),
        normalizeCaseData(indexedDbCase),
        normalizeCaseData(rest)
      );

      setForm(prev => mergeNonEmptyObjects(prev, merged));

      const finalChecks = Array.isArray(merged.checks) && merged.checks.length
        ? merged.checks
        : (Array.isArray(preChecks) ? preChecks : []);
      if (finalChecks.length) setChecks(finalChecks);

      const auto = Array.from(new Set([
        ...(_autoFields || []),
        ...getAutoFieldsFromData(merged),
      ]));
      setAutoFields(new Set(auto.filter(k => merged[k])));
      if (merged.caseId) setSearchCaseId(merged.caseId);
    };

    loadPrefilledWithSavedReport();

    return () => { isMounted = false; };
  }, [prefilled]);

  const isAuto = (name) => autoFields.has(name);
  const autoChips = [...autoFields].filter(k => AUTO_GROUP_LABELS[k]).map(k => AUTO_GROUP_LABELS[k]);

  const handleChange = (e) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };
  const handleCheckChange = (value) => { setChecks(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]); };

  const getAutoFieldsFromData = (data) => Object.keys(AUTO_GROUP_LABELS).filter(key => {
    const v = data?.[key]; return v !== undefined && v !== null && String(v).trim() !== "";
  });

  const applyCaseToForm = async (caseData) => {
    const base = normalizeCaseData(caseData);
    let serverCase = {};
    let indexedDbCase = {};

    if (base.caseId) {
      indexedDbCase = (await getIndexedDBCaseById(base.caseId)) || {};
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
        const res = await fetch(`https://tervies.info/api/admin/case/${encodeURIComponent(base.caseId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (data?.success && data?.case) serverCase = data.case;
      } catch (err) {
        console.warn("GenerateReport apply case server load skipped:", err);
      }
    }

    const latest = mergeNonEmptyObjects(
      normalizeCaseData(serverCase),
      normalizeCaseData(getStoredCaseById(base.caseId) || {}),
      normalizeCaseData(indexedDbCase),
      base
    );

    setForm(prev => mergeNonEmptyObjects(prev, latest));

    if (Array.isArray(latest.checks) && latest.checks.length) setChecks(latest.checks);
    setAutoFields(new Set(getAutoFieldsFromData(latest)));
    setSearchCaseId(latest.caseId || "");
  };

  const handleSearch = () => {
    const q = String(searchCaseId || "").trim().toLowerCase();
    setSearchAttempted(true);
    if (!q) { setSearchResults([]); return; }
    setSearchResults(availableCases.filter(item =>
      String(item.caseId||"").toLowerCase().includes(q) ||
      String(item.clientCaseId||"").toLowerCase().includes(q) ||
      String(item.name||"").toLowerCase().includes(q)
    ));
  };

  // File field helpers
  const addFiles = (field, files) => setForm(prev => ({ ...prev, [field]: [...prev[field], ...files] }));
  const removeFile = (field, idx) => setForm(prev => { const a = [...prev[field]]; a.splice(idx,1); return { ...prev, [field]: a }; });

  const buildPayload = () => ({ ...form, checks, savedAt: new Date().toISOString() });


  // Convert uploaded Files to dataUrl before generating PDF preview/download.
  // This keeps server save logic untouched, but fixes generated PDF when files
  // are still browser File objects.
  const buildPayloadForPdf = async (payload) => {
    const converted = { ...payload };
    await Promise.all(FILE_FIELDS.map(async (field) => {
      const arr = Array.isArray(payload[field]) ? payload[field] : [];
      converted[field] = await Promise.all(arr.map(async (item) => {
        if (item instanceof File || item instanceof Blob) {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(item);
          });
          return {
            name: item.name || "file",
            type: item.type || "application/octet-stream",
            dataUrl,
            isSerializedFile: true,
            isImage: String(item.type || "").startsWith("image/"),
          };
        }
        return item;
      }));
    }));
    return converted;
  };

  // ─── CORE SAVE FUNCTION ────────────────────────────────────────────────────
  const performSave = async (payload) => {
    if (!payload.caseId) {
      alert("Case ID required");
      return;
    }

    const formData = new FormData();
    formData.append("checks", JSON.stringify(payload.checks || []));

    Object.keys(payload).forEach((key) => {
      if (!FILE_FIELDS.includes(key) && key !== "checks") {
        if (typeof payload[key] !== "object" || payload[key] instanceof File) {
          if (payload[key] !== undefined && payload[key] !== null) {
            formData.append(key, payload[key]);
          }
        }
      }
    });

    FILE_FIELDS.forEach((field) => {
      const existingKeys = [];

      payload[field]?.forEach((file) => {
        if (file instanceof File) {
          formData.append(field, file);
        } else if (typeof file === "string") {
          existingKeys.push(file);
        } else if (file?.key) {
          existingKeys.push(file.key);
        }
      });

      // Send previous uploaded S3 keys back to backend so regenerate/edit keeps old photos/files.
      if (existingKeys.length) {
        formData.append(field, JSON.stringify([...new Set(existingKeys)]));
      }
    });

    try {
      const res = await fetch("https://tervies.info/api/admin/save-qc", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
        });

      const data = await res.json();
      if (data?.success) {
        const normalizedSnapshot = normalizeCaseData(payload);
        saveLightMeta({ ...normalizedSnapshot, checks: payload.checks || [] });
      }
      return data;
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  // ─── QUALITY CHECK ─────────────────────────────────────────────────────────
  const handleQualityCheck = async () => {
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const serialized = await performSave(payload);
      if (!serialized) return;
      navigate(`/quality-check/${encodeURIComponent(payload.caseId)}`, {
        state: { reportData: payload },
      });
    } catch (err) {
      console.error("Quality Check save error:", err);
      alert("Unable to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── GENERATE PDF ──────────────────────────────────────────────────────────
const handleGeneratePDF = async () => {
  setIsSaving(true);
  try {
    const payload = buildPayload();
    await performSave(payload);

    // Fetch the fully merged case from server, but keep current form files too.
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    const res = await fetch(
      `https://tervies.info/api/admin/case/${encodeURIComponent(payload.caseId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => null);

    let serverCase = {};
    let serverQc = {};
    if (res) {
      const serverData = await res.json().catch(() => ({}));
      serverCase = serverData?.case || {};
      serverQc = serverCase.qcReport || {};
    }

    // Convert File objects to dataUrl before sending to PDF generator.
    const pdfPayload = await buildPayloadForPdf(payload);

    // Merge: serverQc base + current payload on top (current form wins)
    const merged = {
      ...serverCase,
      ...serverQc,
      ...pdfPayload,
      checks: pdfPayload.checks?.length ? pdfPayload.checks :
              (serverQc.checks || serverCase.checks || []),
    };

    await generateBGVReport(merged);
  } catch (err) {
    console.error("PDF generation error:", err);
    alert("Unable to generate PDF. Please try again.");
  } finally {
    setIsSaving(false);
  }
};

  // ─── UPLOAD SECTION RENDERER ───────────────────────────────────────────────
  const renderUploadSection = ({ annexureRef, screenshotRef, documentsField, screenshotsField, onDocumentsChange, onScreenshotsChange, title = "Upload Annexure" }) => {
    const docFiles = form[documentsField] || [];
    const imgFiles = form[screenshotsField] || [];
    return (
      <div className="gr-upload-section">
        <div className="gr-section-title" style={{ fontSize:"15px" }}>Supporting Documents</div>
        <div className="gr-upload-buttons">
          <div className="gr-upload-box" onClick={() => annexureRef.current?.click()}>
            <div className="gr-upload-icon">📄</div>
            <div className="gr-upload-title">{title}</div>
            <div className="gr-upload-sub">PDF / DOC / Image</div>
            <div className="gr-upload-count">{docFiles.length ? `${docFiles.length} file(s) — click to add more` : "Click to upload"}</div>
            <input ref={annexureRef} type="file" accept=".pdf,.doc,.docx,image/*" multiple hidden onChange={onDocumentsChange} />
          </div>
          <div className="gr-upload-box" onClick={() => screenshotRef.current?.click()}>
            <div className="gr-upload-icon">📷</div>
            <div className="gr-upload-title">Upload Screenshots</div>
            <div className="gr-upload-sub">JPG / PNG</div>
            <div className="gr-upload-count">{imgFiles.length ? `${imgFiles.length} image(s) — click to add more` : "Click to upload"}</div>
            <input ref={screenshotRef} type="file" accept="image/*" multiple hidden onChange={onScreenshotsChange} />
          </div>
        </div>
        {docFiles.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#2563eb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6 }}>Annexure Files</div>
            <FilePreviewList files={docFiles} onDelete={idx => removeFile(documentsField, idx)} />
          </div>
        )}
        {imgFiles.length > 0 && (
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:"#2563eb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6 }}>Screenshots</div>
            <FilePreviewList files={imgFiles} onDelete={idx => removeFile(screenshotsField, idx)} />
          </div>
        )}
      </div>
    );
  };

  // ── Check list (Credit Check added) ──
  const checkList = [
    "Employment Check","Residential Address Check","Educational Qualification Check",
    "Identity Check (PAN Card)","Identity Check (Aadhar Card)","Criminal Police Record Check",
    "Criminal Database Check","Professional Reference Check",
    "Credit Check",  // ← NEW
  ];

  const comparisonFields = [
    { label:"Name of the respondent",   claimName:"respondentName",   feedbackName:"vfRespondentName" },
    { label:"Designation",              claimName:"designation",       feedbackName:"vfDesignation" },
    { label:"Email ID",                 claimName:"contactEmail",      feedbackName:"vfContactEmail" },
    { label:"Name of the Organization", claimName:"organization",      feedbackName:"vfOrganization" },
    { label:"Company Contact No.",      claimName:"companyContact",    feedbackName:"vfCompanyContact" },
    { label:"Employment Dates",         claimName:"employmentDates",   feedbackName:"vfEmploymentDates" },
    { label:"Employee Code",            claimName:"employeeCode",      feedbackName:"vfEmployeeCode" },
    { label:"Supervisor Name",          claimName:"supervisor",        feedbackName:"vfSupervisor" },
    { label:"Salary Details",           claimName:"salary",            feedbackName:"vfSalary" },
    { label:"Reason for Leaving",       claimName:"reasonLeaving",     feedbackName:"vfReasonLeaving" },
    { label:"Eligible for Rehire",      claimName:"rehire",            feedbackName:"vfRehire" },
  ];

  return (
    <div className="gr-root">
      {/* ── Saving Overlay ── */}
      {isSaving && (
        <div className="gr-saving-overlay">
          <div className="gr-saving-box">
            <div className="gr-saving-spinner" />
            <div className="gr-saving-title">Processing Report…</div>
            <div className="gr-saving-sub">Encoding images and saving data. Please wait.</div>
          </div>
        </div>
      )}

      <div className="gr-inner">
        <div className="gr-page-header">
          <div>
            <div className="gr-tag">BGV Platform</div>
            <div className="gr-title">Candidate Verification</div>
            <div className="gr-subtitle">Generate professional background verification reports</div>
          </div>
          <div className="gr-badge">Admin Panel</div>
        </div>

        {/* ── SEARCH ── */}
        <div className="gr-card">
          <div className="gr-section-label">Step 00</div>
          <div className="gr-section-title">Search Case</div>
          <div className="gr-search-row">
            <div className="gr-field">
              <label className="gr-label">Search by Case ID / Client Case ID / Name</label>
              <input type="text" value={searchCaseId} onChange={e => setSearchCaseId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Enter case id and click search" className="gr-input" />
            </div>
            <button className="gr-btn-search" onClick={handleSearch}>Search</button>
          </div>
          {searchResults.length > 0 && (
            <div className="gr-search-results">
              {searchResults.map((item, i) => (
                <div key={`${item.caseId||i}`} className="gr-search-card" onClick={() => applyCaseToForm(item)}>
                  <div className="gr-search-card-title">{item.name || "Unnamed Candidate"}</div>
                  <div className="gr-search-card-meta">
                    <span><strong>Case ID:</strong> {item.caseId||"-"}</span>
                    <span><strong>Client Case ID:</strong> {item.clientCaseId||"-"}</span>
                    <span><strong>Client:</strong> {item.clientName||"-"}</span>
                    <span><strong>Company:</strong> {item.assignedCompany||"-"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {searchAttempted && searchResults.length === 0 && (
            <div className="gr-search-empty">No case found. Search with correct Case ID, Client Case ID, or Candidate Name.</div>
          )}
        </div>

        {autoChips.length > 0 && (
          <div className="gr-prefill-banner">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2" style={{flexShrink:0,marginTop:1}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div><strong>Auto-fetched from portal</strong> — fields highlighted in green are pre-filled.</div>
              <div className="gr-prefill-chips">
                {autoChips.map(chip => <span key={chip} className="gr-prefill-chip">{chip}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* ── CANDIDATE INFO ── */}
        <div className="gr-card">
          <div className="gr-section-label">Step 01</div>
          <div className="gr-section-title">Candidate Information</div>
          <div className="gr-grid">
            <Field label="Applicant Name"  name="name"           form={form} onChange={handleChange} auto={isAuto("name")} />
            <Field label="Case ID"         name="caseId"         form={form} onChange={handleChange} auto={isAuto("caseId")} />
            <Field label="Gender"          name="gender"         form={form} onChange={handleChange} auto={isAuto("gender")} />
            <Field label="Date of Birth"   name="dob"            form={form} onChange={handleChange} auto={isAuto("dob")} />
            <Field label="Allocation Date" name="allocationDate" form={form} onChange={handleChange} auto={isAuto("allocationDate")} />
            <Field label="Delivery Date"   name="deliveryDate"   form={form} onChange={handleChange} auto={isAuto("deliveryDate")} />
            <Field label="Client Name"     name="clientName"     form={form} onChange={handleChange} auto={isAuto("clientName")} />
            <Field label="Client Case ID"  name="clientCaseId"   form={form} onChange={handleChange} auto={isAuto("clientCaseId")} />
            <Field label="Level of Check"  name="level"          form={form} onChange={handleChange} />
            <div className="gr-field">
              <label className={isAuto("color") ? "gr-label-auto" : "gr-label"}>
                Color Code {isAuto("color") && <span className="gr-label-auto-badge">AUTO</span>}
              </label>
              <select name="color" value={form.color} onChange={handleChange} className={`gr-input gr-select${isAuto("color") ? " auto" : ""}`}>
                <option value="Green">Green — Verified OK</option>
                <option value="Red">Red — Discrepancy</option>
                <option value="Yellow">Yellow — Unable to Verify</option>
              </select>
            </div>
            <div className="gr-field">
              <label className={isAuto("assignedCompany") ? "gr-label-auto" : "gr-label"}>
                Assigned Company {isAuto("assignedCompany") && <span className="gr-label-auto-badge">AUTO</span>}
              </label>
              {isAuto("assignedCompany") ? (
                <div className="gr-company-pill">{form.assignedCompany}</div>
              ) : (
                <input name="assignedCompany" value={form.assignedCompany} onChange={handleChange} className="gr-input" />
              )}
            </div>
          </div>
        </div>

        {/* ── CHECKS ── */}
        <div className="gr-card">
          <div className="gr-section-label">Step 02</div>
          <div className="gr-section-title">Verification Checks</div>
          <div className="gr-checks-grid">
            {checkList.map(check => (
              <div key={check} onClick={() => handleCheckChange(check)} className={`gr-check-tile${checks.includes(check) ? " active" : ""}`}>
                <span>{check}</span>
                <span className="gr-check-icon">✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── EMPLOYMENT ── */}
        {checks.includes("Employment Check") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Employment Check Details</div>
            <div className="gr-compare-wrap">
              {comparisonFields.map(item => (
                <div className="gr-compare-row" key={item.label}>
                  <div className="gr-compare-label">{item.label}</div>
                  <div className="gr-field">
                    <div className="gr-col-head">Details as per Claim / Documents Provided</div>
                    <input name={item.claimName} value={form[item.claimName]} onChange={handleChange} className="gr-input" />
                  </div>
                  <div className="gr-field">
                    <div className="gr-col-head">Details as per Verification Feedback</div>
                    <input name={item.feedbackName} value={form[item.feedbackName]} onChange={handleChange} className="gr-input" />
                  </div>
                </div>
              ))}
              <div className="gr-compare-row">
                <div className="gr-compare-label">Comments</div>
                <div className="gr-field">
                  <div className="gr-col-head">Details as per Claim / Documents Provided</div>
                  <textarea name="comments" value={form.comments} onChange={handleChange} className="gr-input" />
                </div>
                <div className="gr-field">
                  <div className="gr-col-head">Details as per Verification Feedback</div>
                  <textarea name="vfComments" value={form.vfComments} onChange={handleChange} className="gr-input" />
                </div>
              </div>
            </div>
            {renderUploadSection({
              annexureRef: employmentAnnexureRef, screenshotRef: employmentScreenshotRef,
              documentsField: "employmentDocuments", screenshotsField: "employmentScreenshots",
              onDocumentsChange: e => { addFiles("employmentDocuments", Array.from(e.target.files||[])); e.target.value=""; },
              onScreenshotsChange: e => { addFiles("employmentScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
            })}
          </div>
        )}

        {/* ── RESIDENTIAL ── */}
        {checks.includes("Residential Address Check") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Residential Address Check Details</div>
            <div className="gr-grid">
              <Field label="GVS Case Reff. No."           name="residentialCaseRefNo"            form={form} onChange={handleChange} />
              <Field label="Name of Candidate"            name="residentialCandidateName"        form={form} onChange={handleChange} />
              <Field label="Father's Name"                name="residentialFatherName"           form={form} onChange={handleChange} />
              <Field label="Candidate - Date of Birth"    name="residentialDob"                  form={form} onChange={handleChange} />
              <Field label="Confirmation of Address"      name="residentialConfirmationAddress"  form={form} onChange={handleChange} full />
              <Field label="Type of Address"              name="residentialAddressType"          form={form} onChange={handleChange} />
              <Field label="Contact Number of Candidate"  name="residentialContactNumber"        form={form} onChange={handleChange} />
              <Field label="Period of Stay"               name="residentialPeriodOfStay"         form={form} onChange={handleChange} />
              <Field label="Type of Property"             name="residentialPropertyType"         form={form} onChange={handleChange} />
              <Field label="Photo ID Proof Signature"     name="residentialPhotoIdProofSignature" form={form} onChange={handleChange} />
              <Field label="Respondent Name"              name="residentialRespondentName"       form={form} onChange={handleChange} full />
              <div className="gr-field gr-full">
                <label className="gr-label">Any Special Comments</label>
                <textarea name="residentialSpecialComments" value={form.residentialSpecialComments} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: residentialAnnexureRef, screenshotRef: residentialScreenshotRef,
              documentsField: "residentialDocuments", screenshotsField: "residentialScreenshots",
              onDocumentsChange: e => { addFiles("residentialDocuments", Array.from(e.target.files||[])); e.target.value=""; },
              onScreenshotsChange: e => { addFiles("residentialScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
              title: "Upload Annexure C & D",
            })}
          </div>
        )}

        {/* ── EDUCATIONAL ── */}
        {checks.includes("Educational Qualification Check") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Educational Qualification Check Details</div>
            <div className="gr-grid">
              <Field label="Respondent Name"        name="eduRespondentName"         form={form} onChange={handleChange} />
              <Field label="Designation"            name="eduDesignation"            form={form} onChange={handleChange} />
              <Field label="Institute Name"         name="eduInstituteName"          form={form} onChange={handleChange} />
              <Field label="University Name"        name="eduUniversityName"         form={form} onChange={handleChange} />
              <Field label="Year of Passing"        name="eduYearOfPassing"          form={form} onChange={handleChange} />
              <Field label="Qualification Obtained" name="eduQualificationObtained"  form={form} onChange={handleChange} />
              <Field label="Final Remarks"          name="eduFinalRemarks"           form={form} onChange={handleChange} full />
              <div className="gr-field gr-full">
                <label className="gr-label">Additional Remarks</label>
                <textarea name="eduAdditionalRemarks" value={form.eduAdditionalRemarks} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: educationalAnnexureRef, screenshotRef: educationalScreenshotRef,
              documentsField: "educationalAnnexureE", screenshotsField: "educationalScreenshots",
              onDocumentsChange: e => {
                const files = Array.from(e.target.files||[]);
                setForm(prev => {
                  const combined = [...prev.educationalAnnexureE, ...files];
                  if (combined.length > 5) { alert("Max 5 files for Annexure E."); return { ...prev, educationalAnnexureE: combined.slice(0,5) }; }
                  return { ...prev, educationalAnnexureE: combined };
                });
                e.target.value="";
              },
              onScreenshotsChange: e => { addFiles("educationalScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
              title: "Upload Annexure E",
            })}
          </div>
        )}

        {/* ── PROFESSIONAL ── */}
        {checks.includes("Professional Reference Check") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Professional Reference Check Details</div>
            <div className="gr-grid">
              <Field label="Respondent Name" name="profRespondentName" form={form} onChange={handleChange} />
              <Field label="Designation"     name="profDesignation"    form={form} onChange={handleChange} />
              <Field label="Organization"    name="profOrganization"   form={form} onChange={handleChange} full />
              <div className="gr-field gr-full" style={{ marginTop:"12px" }}>
                <div style={{ background:"#1e40af",color:"white",padding:"10px 16px",fontSize:"11px",fontWeight:"700",letterSpacing:"0.12em",textTransform:"uppercase",textAlign:"center",borderRadius:"4px" }}>Feedback</div>
              </div>
              <Field label="Applicant Name"              name="profApplicantName"              form={form} onChange={handleChange} />
              <Field label="Employer Name"               name="profEmployerName"               form={form} onChange={handleChange} />
              <Field label="Last Position Held"          name="profLastPositionHeld"           form={form} onChange={handleChange} />
              <Field label="Duties and Responsibilities" name="profDutiesAndResponsibilities"  form={form} onChange={handleChange} />
              <Field label="Year of association"         name="profYearOfAssociation"          form={form} onChange={handleChange} />
              <Field label="Subject Knowledge"           name="profSubjectKnowledge"           form={form} onChange={handleChange} />
              <Field label="Communication skill"         name="profCommunicationSkill"         form={form} onChange={handleChange} />
              <Field label="Performance rating (1–10)"  name="profPerformanceRating"          form={form} onChange={handleChange} />
              <Field label="Soft skills"                 name="profSoftSkills"                 form={form} onChange={handleChange} />
              <Field label="Behavior and code of conduct" name="profBehaviorAndConduct"        form={form} onChange={handleChange} />
              <Field label="Integrity issues"            name="profIntegrityIssues"            form={form} onChange={handleChange} />
              <Field label="Overall assessment"          name="profOverallAssessment"          form={form} onChange={handleChange} />
              <div className="gr-field gr-full">
                <label className="gr-label">Professional strengths & improvement areas</label>
                <textarea name="profProfessionalStrengths" value={form.profProfessionalStrengths} onChange={handleChange} className="gr-input" style={{minHeight:"60px"}} />
              </div>
              <div className="gr-field gr-full">
                <label className="gr-label">Additional Comments</label>
                <textarea name="profAdditionalComments" value={form.profAdditionalComments} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: professionalAnnexureRef, screenshotRef: professionalScreenshotRef,
              documentsField: "professionalAnnexureF", screenshotsField: "professionalScreenshots",
              onDocumentsChange: e => {
                const files = Array.from(e.target.files||[]);
                setForm(prev => {
                  const combined = [...prev.professionalAnnexureF, ...files];
                  if (combined.length > 5) { alert("Max 5 files for Annexure F."); return { ...prev, professionalAnnexureF: combined.slice(0,5) }; }
                  return { ...prev, professionalAnnexureF: combined };
                });
                e.target.value="";
              },
              onScreenshotsChange: e => { addFiles("professionalScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
              title: "Upload Annexure F",
            })}
          </div>
        )}

        {/* ── CRIMINAL POLICE ── */}
        {checks.includes("Criminal Police Record Check") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Criminal Police Record Check Details</div>
            <div className="gr-grid">
              <Field label="Respondent Name"            name="criminalRespondentName"       form={form} onChange={handleChange} />
              <Field label="Designation"                name="criminalDesignation"          form={form} onChange={handleChange} />
              <Field label="Police Station Name"        name="criminalPoliceStationName"    form={form} onChange={handleChange} />
              <Field label="Date of Verification"       name="criminalDateOfVerification"   form={form} onChange={handleChange} />
              <Field label="Candidate Permanent Address" name="criminalCandidateAddress"    form={form} onChange={handleChange} full />
              <Field label="Final Remarks"              name="criminalFinalRemarks"         form={form} onChange={handleChange} full />
              <div className="gr-field gr-full">
                <label className="gr-label">Additional Remarks</label>
                <textarea name="criminalAdditionalRemarks" value={form.criminalAdditionalRemarks} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: criminalAnnexureRef, screenshotRef: criminalScreenshotRef,
              documentsField: "criminalDocuments", screenshotsField: "criminalScreenshots",
              onDocumentsChange: e => { addFiles("criminalDocuments", Array.from(e.target.files||[])); e.target.value=""; },
              onScreenshotsChange: e => { addFiles("criminalScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
            })}
          </div>
        )}

        {/* ── CRIMINAL DATABASE ── */}
        {checks.includes("Criminal Database Check") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Criminal Database Check Details</div>
            <div className="gr-grid">
              <Field label="Candidate name"            name="dbCandidateName"          form={form} onChange={handleChange} />
              <Field label="Fathers Name"              name="dbFathersName"             form={form} onChange={handleChange} />
              <Field label="Candidate - Date of Birth" name="dbDob"                    form={form} onChange={handleChange} />
              <Field label="Date of Verification"      name="dbDateOfVerification"     form={form} onChange={handleChange} />
              <Field label="Address Provided"          name="dbAddressProvided"        form={form} onChange={handleChange} full />
              <Field label="Address & ID Proof"        name="dbAddressIdProofProvided" form={form} onChange={handleChange} />
              <Field label="Case Initiation Date"      name="dbCaseInitiationDate"     form={form} onChange={handleChange} />
              <Field label="Case Completion Date"      name="dbCaseCompletionDate"     form={form} onChange={handleChange} />
              <div className="gr-field gr-full">
                <label className="gr-label">Record summary</label>
                <textarea name="dbRecordSummary" value={form.dbRecordSummary} onChange={handleChange} className="gr-input" style={{minHeight:"60px"}} />
              </div>
              <div className="gr-field gr-full">
                <label className="gr-label">Additional Remarks</label>
                <textarea name="dbAdditionalRemarks" value={form.dbAdditionalRemarks} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: databaseAnnexureRef, screenshotRef: databaseScreenshotRef,
              documentsField: "databaseAnnexureG", screenshotsField: "databaseScreenshots",
              onDocumentsChange: e => {
                const files = Array.from(e.target.files||[]);
                setForm(prev => {
                  const combined = [...prev.databaseAnnexureG, ...files];
                  if (combined.length > 5) { alert("Max 5 files for Annexure G."); return { ...prev, databaseAnnexureG: combined.slice(0,5) }; }
                  return { ...prev, databaseAnnexureG: combined };
                });
                e.target.value="";
              },
              onScreenshotsChange: e => { addFiles("databaseScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
              title: "Upload Annexure G",
            })}
          </div>
        )}

        {/* ── PAN CARD ── */}
        {checks.includes("Identity Check (PAN Card)") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Identity Check (PAN Card) Details</div>
            <div className="gr-grid">
              <Field label="Candidate Name"         name="panCandidateName"       form={form} onChange={handleChange} />
              <Field label="Father's Name"          name="panFatherName"          form={form} onChange={handleChange} />
              <Field label="Date of Birth"          name="panDob"                 form={form} onChange={handleChange} />
              <Field label="PAN Card No."           name="panNumber"              form={form} onChange={handleChange} />
              <Field label="Verified Full Name"     name="panVerifiedName"        form={form} onChange={handleChange} />
              <Field label="Verified Father's Name" name="panVerifiedFatherName"  form={form} onChange={handleChange} />
              <Field label="Verified DOB"           name="panVerifiedDob"         form={form} onChange={handleChange} />
              <Field label="Verified PAN No."       name="panVerifiedNumber"      form={form} onChange={handleChange} />
              <Field label="Date of Verification"   name="panVerificationDate"    form={form} onChange={handleChange} />
              <Field label="Respondent Name"        name="panRespondentName"      form={form} onChange={handleChange} />
              <div className="gr-field gr-full">
                <label className="gr-label">Final Remarks</label>
                <textarea name="panFinalRemarks" value={form.panFinalRemarks} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: identityAnnexureRef, screenshotRef: identityScreenshotRef,
              documentsField: "identityDocuments", screenshotsField: "identityScreenshots",
              onDocumentsChange: e => { addFiles("identityDocuments", Array.from(e.target.files||[])); e.target.value=""; },
              onScreenshotsChange: e => { addFiles("identityScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
            })}
          </div>
        )}

        {/* ── AADHAR CARD ── */}
        {checks.includes("Identity Check (Aadhar Card)") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Identity Check (Aadhar Card) Details</div>
            <div className="gr-grid">
              <Field label="Candidate Name"         name="aadharCandidateName"       form={form} onChange={handleChange} />
              <Field label="Father's Name"          name="aadharFatherName"          form={form} onChange={handleChange} />
              <Field label="Date of Birth"          name="aadharDob"                 form={form} onChange={handleChange} />
              <Field label="Aadhar Card No."        name="aadharNumber"              form={form} onChange={handleChange} />
              <Field label="Verified Full Name"     name="aadharVerifiedName"        form={form} onChange={handleChange} />
              <Field label="Verified Father's Name" name="aadharVerifiedFatherName"  form={form} onChange={handleChange} />
              <Field label="Verified DOB"           name="aadharVerifiedDob"         form={form} onChange={handleChange} />
              <Field label="Verified Aadhar No."    name="aadharVerifiedNumber"      form={form} onChange={handleChange} />
              <Field label="Date of Verification"   name="aadharVerificationDate"    form={form} onChange={handleChange} />
              <Field label="Respondent Name"        name="aadharRespondentName"      form={form} onChange={handleChange} />
              <div className="gr-field gr-full">
                <label className="gr-label">Final Remarks</label>
                <textarea name="aadharFinalRemarks" value={form.aadharFinalRemarks} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: identityAnnexureRef, screenshotRef: identityScreenshotRef,
              documentsField: "identityDocuments", screenshotsField: "identityScreenshots",
              onDocumentsChange: e => { addFiles("identityDocuments", Array.from(e.target.files||[])); e.target.value=""; },
              onScreenshotsChange: e => { addFiles("identityScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
            })}
          </div>
        )}

        {/* ── CREDIT CHECK (NEW) ── */}
        {checks.includes("Credit Check") && (
          <div className="gr-emp-card">
            <div className="gr-emp-title"><span className="gr-emp-dot"></span>Credit Check Details</div>
            <div className="gr-grid">
              <Field label="Candidate Name"         name="creditCandidateName"    form={form} onChange={handleChange} />
              <Field label="Date of Birth"          name="creditDob"              form={form} onChange={handleChange} />
              <Field label="PAN Number"             name="creditPanNumber"        form={form} onChange={handleChange} />
              <Field label="Aadhar Number"          name="creditAadharNumber"     form={form} onChange={handleChange} />
              <Field label="Credit Agency Name"     name="creditAgencyName"       form={form} onChange={handleChange} />
              <Field label="Credit Score"           name="creditScore"            form={form} onChange={handleChange} />
              <Field label="Credit Rating"          name="creditRating"           form={form} onChange={handleChange} />
              <Field label="Report Date"            name="creditReportDate"       form={form} onChange={handleChange} />
              <Field label="Accounts Found"         name="creditAccountsFound"    form={form} onChange={handleChange} full />
              <Field label="Default / Outstanding Dues" name="creditDefaultOrDues" form={form} onChange={handleChange} full />
              <Field label="Respondent Name"        name="creditRespondentName"   form={form} onChange={handleChange} />
              <Field label="Final Remarks"          name="creditFinalRemarks"     form={form} onChange={handleChange} full />
              <div className="gr-field gr-full">
                <label className="gr-label">Additional Remarks</label>
                <textarea name="creditAdditionalRemarks" value={form.creditAdditionalRemarks} onChange={handleChange} className="gr-input" />
              </div>
            </div>
            {renderUploadSection({
              annexureRef: creditAnnexureRef, screenshotRef: creditScreenshotRef,
              documentsField: "creditDocuments", screenshotsField: "creditScreenshots",
              onDocumentsChange: e => { addFiles("creditDocuments", Array.from(e.target.files||[])); e.target.value=""; },
              onScreenshotsChange: e => { addFiles("creditScreenshots", Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"))); e.target.value=""; },
              title: "Upload Credit Report",
            })}
          </div>
        )}

        {/* ── SUBMIT ── */}
        <div className="gr-submit-row">
          <span className="gr-submit-note">{checks.length} check{checks.length !== 1 ? "s" : ""} selected</span>
          <div className="gr-btn-group">
            <button className="gr-btn-secondary" onClick={handleQualityCheck} disabled={isSaving}>
              {isSaving ? "Saving…" : "Quality Check"}
            </button>
            <button className="gr-btn" onClick={handleGeneratePDF} disabled={isSaving}>
              {isSaving ? "Generating…" : "Generate PDF Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
function normalizeCaseData(item = {}) {
  const qc = item.qcReport || {};
  const employment = item.employment || {};
  const residential = item.residential || {};
  const education = item.education || item.educational || {};
  const professional = item.professional || item.reference || {};
  const criminal = item.criminal || {};
  const database = item.database || item.db || {};
  const identity = item.identity || {};

  const get = (...keys) => {
    for (const k of keys) {
      const sources = [qc, item, employment, residential, education, professional, criminal, database, identity];
      for (const src of sources) {
        const v = src?.[k];
        if (isUsefulValue(v) && typeof v !== "object") return v;
      }
    }
    return "";
  };

  const name = get("name", "candidateName", "applicantName", "fullName", "full_name");
  const caseId = get("caseId", "caseID", "Case ID", "case_id", "id");
  const dob = get("dob", "dateOfBirth", "DOB", "Date of Birth", "birthDate");
  const fatherName = get("fatherName", "father_name", "fathersName", "father", "Father Name");
  const phone = get("phone", "mobile", "mobileNumber", "contactNumber", "contact", "companyContact");
  const email = get("email", "contactEmail", "candidateEmail");
  const pan = get("pan", "panNumber", "panNo", "panCard", "PAN", "PAN Number");
  const aadhar = get("adharnumber", "aadharNumber", "aadhaarNumber", "aadhar", "aadhaar", "Aadhar Number");
  const presentAddress = get("presentAddress", "currentAddress", "address", "candidateAddress", "confirmationAddress");
  const permanentAddress = get("permanentAddress", "permanent_address");
  const fullAddress = presentAddress || permanentAddress;
  const company = get("company", "organization", "employer", "employerName", "companyName");
  const designation = get("designation", "jobTitle", "position", "lastPositionHeld");
  const duration = get("duration", "employmentDates", "period", "periodOfStay");
  const employeeId = get("employeeId", "employeeCode", "empId");
  const ctc = get("ctc", "salary");
  const manager = get("manager", "supervisor");
  const reasonLeaving = get("reasonLeaving", "reasonForLeaving");
  const institution = get("institution", "instituteName", "eduInstituteName", "college");
  const university = get("university", "universityName", "eduUniversityName");
  const degree = get("degree", "qualification", "qualificationObtained", "eduQualificationObtained");
  const year = get("year", "yearOfPassing", "passingYear", "eduYearOfPassing");
  const registration = get("registration", "registrationNumber", "rollNo");
  const mode = get("mode", "educationMode");

  const normalized = {
    ...item,
    ...qc,

    // Core candidate fields
    name,
    caseId,
    gender:          get("gender", "Gender"),
    dob,
    allocationDate:  get("allocationDate", "allocation_date", "Allocation Date", "receivedDate"),
    deliveryDate:    get("deliveryDate", "delivery_date", "Delivery Date", "closedDate"),
    clientName:      get("clientName", "client", "Client Name"),
    clientCaseId:    get("clientCaseId", "client_case_id", "Client Case ID"),
    assignedCompany: get("assignedCompany", "assigned_company", "Assigned Company", "companyName", "clientName"),
    level:           get("level", "levelOfCheck", "Level of Check") || "STANDARD",
    color:           get("color", "colorCode", "Color Code") || "Green",

    // Keep raw CaseDetails fields too, so they are not lost on save/regenerate
    email,
    phone,
    alternatephone: get("alternatephone", "alternatePhone", "altPhone"),
    adharnumber: aadhar,
    fatherName,
    pan,
    presentAddress,
    permanentAddress,
    STATE: get("STATE", "state"),
    pincode: get("pincode", "pinCode", "zip"),
    company,
    duration,
    employeeId,
    ctc,
    manager,
    institution,
    university,
    degree,
    year,
    registration,
    mode,
    criminalDetails: get("criminalDetails", "criminalRecord", "criminalSummary"),
    verificationSummary: get("verificationSummary"),
    totalCost: get("totalCost"),

    // Employment fields — auto-fill from CaseDetails employment section
    respondentName:  qc.respondentName  || employment.respondentName  || get("respondentName") || name,
    designation:     qc.designation     || employment.designation     || designation,
    contactEmail:    qc.contactEmail    || employment.contactEmail    || email,
    organization:    qc.organization    || employment.organization    || company,
    companyContact:  qc.companyContact  || employment.companyContact  || phone,
    employmentDates: qc.employmentDates || employment.employmentDates || duration,
    employeeCode:    qc.employeeCode    || employment.employeeCode    || employeeId,
    supervisor:      qc.supervisor      || employment.supervisor      || manager,
    salary:          qc.salary          || employment.salary          || ctc,
    reasonLeaving:   qc.reasonLeaving   || employment.reasonLeaving   || reasonLeaving,
    rehire:          qc.rehire          || employment.rehire          || get("rehire"),
    comments:        qc.comments        || employment.comments        || get("comments"),

    // Verification feedback fields
    vfRespondentName:  qc.vfRespondentName  || item.vfRespondentName  || "",
    vfDesignation:     qc.vfDesignation     || item.vfDesignation     || "",
    vfContactEmail:    qc.vfContactEmail    || item.vfContactEmail    || "",
    vfOrganization:    qc.vfOrganization    || item.vfOrganization    || "",
    vfCompanyContact:  qc.vfCompanyContact  || item.vfCompanyContact  || "",
    vfEmploymentDates: qc.vfEmploymentDates || item.vfEmploymentDates || "",
    vfEmployeeCode:    qc.vfEmployeeCode    || item.vfEmployeeCode    || "",
    vfSupervisor:      qc.vfSupervisor      || item.vfSupervisor      || "",
    vfSalary:          qc.vfSalary          || item.vfSalary          || "",
    vfReasonLeaving:   qc.vfReasonLeaving   || item.vfReasonLeaving   || "",
    vfRehire:          qc.vfRehire          || item.vfRehire          || "",
    vfComments:        qc.vfComments        || item.vfComments        || "",

    // Residential — auto-fill from CaseDetails address + identity fields
    residentialCaseRefNo:             qc.residentialCaseRefNo || residential.caseRefNo || item.residentialCaseRefNo || caseId,
    residentialCandidateName:         qc.residentialCandidateName || residential.candidateName || item.residentialCandidateName || name,
    residentialFatherName:            qc.residentialFatherName || residential.fatherName || item.residentialFatherName || fatherName,
    residentialDob:                   qc.residentialDob || residential.dob || item.residentialDob || dob,
    residentialConfirmationAddress:   qc.residentialConfirmationAddress || residential.confirmationAddress || item.residentialConfirmationAddress || fullAddress,
    residentialAddressType:           qc.residentialAddressType || residential.addressType || item.residentialAddressType || get("addressType"),
    residentialContactNumber:         qc.residentialContactNumber || residential.contactNumber || item.residentialContactNumber || phone,
    residentialPeriodOfStay:          qc.residentialPeriodOfStay || residential.periodOfStay || item.residentialPeriodOfStay || duration,
    residentialPropertyType:          qc.residentialPropertyType || residential.propertyType || item.residentialPropertyType || get("propertyType"),
    residentialPhotoIdProofSignature: qc.residentialPhotoIdProofSignature || residential.photoIdProofSignature || item.residentialPhotoIdProofSignature || "",
    residentialRespondentName:        qc.residentialRespondentName || residential.respondentName || item.residentialRespondentName || name,
    residentialSpecialComments:       qc.residentialSpecialComments || residential.specialComments || item.residentialSpecialComments || "",

    // Educational — auto-fill from CaseDetails education fields
    eduRespondentName:        qc.eduRespondentName || education.respondentName || item.eduRespondentName || name,
    eduDesignation:           qc.eduDesignation || education.designation || item.eduDesignation || "",
    eduInstituteName:         qc.eduInstituteName || education.instituteName || item.eduInstituteName || institution,
    eduUniversityName:        qc.eduUniversityName || education.universityName || item.eduUniversityName || university,
    eduYearOfPassing:         qc.eduYearOfPassing || education.yearOfPassing || item.eduYearOfPassing || year,
    eduQualificationObtained: qc.eduQualificationObtained || education.qualificationObtained || item.eduQualificationObtained || degree,
    eduFinalRemarks:          qc.eduFinalRemarks || item.eduFinalRemarks || "",
    eduAdditionalRemarks:     qc.eduAdditionalRemarks || item.eduAdditionalRemarks || [registration, mode].filter(Boolean).join(" | "),

    // Professional reference — use employment details as starting values
    profRespondentName:           qc.profRespondentName || professional.respondentName || item.profRespondentName || manager || name,
    profDesignation:              qc.profDesignation || professional.designation || item.profDesignation || designation,
    profOrganization:             qc.profOrganization || professional.organization || item.profOrganization || company,
    profApplicantName:            qc.profApplicantName || professional.applicantName || item.profApplicantName || name,
    profEmployerName:             qc.profEmployerName || professional.employerName || item.profEmployerName || company,
    profLastPositionHeld:         qc.profLastPositionHeld || professional.lastPositionHeld || item.profLastPositionHeld || designation,
    profDutiesAndResponsibilities:qc.profDutiesAndResponsibilities || professional.dutiesAndResponsibilities || item.profDutiesAndResponsibilities || "",
    profYearOfAssociation:        qc.profYearOfAssociation || professional.yearOfAssociation || item.profYearOfAssociation || duration,
    profSubjectKnowledge:         qc.profSubjectKnowledge || item.profSubjectKnowledge || "",
    profCommunicationSkill:       qc.profCommunicationSkill || item.profCommunicationSkill || "",
    profPerformanceRating:        qc.profPerformanceRating || item.profPerformanceRating || "",
    profSoftSkills:               qc.profSoftSkills || item.profSoftSkills || "",
    profBehaviorAndConduct:       qc.profBehaviorAndConduct || item.profBehaviorAndConduct || "",
    profIntegrityIssues:          qc.profIntegrityIssues || item.profIntegrityIssues || "",
    profProfessionalStrengths:    qc.profProfessionalStrengths || item.profProfessionalStrengths || "",
    profOverallAssessment:        qc.profOverallAssessment || item.profOverallAssessment || "",
    profAdditionalComments:       qc.profAdditionalComments || item.profAdditionalComments || "",

    // Criminal
    criminalRespondentName:     qc.criminalRespondentName || criminal.respondentName || item.criminalRespondentName || name,
    criminalDesignation:        qc.criminalDesignation || criminal.designation || item.criminalDesignation || "",
    criminalPoliceStationName:  qc.criminalPoliceStationName || criminal.policeStationName || item.criminalPoliceStationName || "",
    criminalDateOfVerification: qc.criminalDateOfVerification || criminal.dateOfVerification || item.criminalDateOfVerification || "",
    criminalCandidateAddress:   qc.criminalCandidateAddress || criminal.candidateAddress || item.criminalCandidateAddress || fullAddress,
    criminalFinalRemarks:       qc.criminalFinalRemarks || criminal.finalRemarks || item.criminalFinalRemarks || get("criminalDetails"),
    criminalAdditionalRemarks:  qc.criminalAdditionalRemarks || criminal.additionalRemarks || item.criminalAdditionalRemarks || get("criminalDetails"),

    // Database
    dbCandidateName:          qc.dbCandidateName || database.candidateName || item.dbCandidateName || name,
    dbFathersName:            qc.dbFathersName || database.fathersName || item.dbFathersName || fatherName,
    dbDob:                    qc.dbDob || database.dob || item.dbDob || dob,
    dbDateOfVerification:     qc.dbDateOfVerification || item.dbDateOfVerification || "",
    dbAddressProvided:        qc.dbAddressProvided || item.dbAddressProvided || fullAddress,
    dbAddressIdProofProvided: qc.dbAddressIdProofProvided || item.dbAddressIdProofProvided || "",
    dbCaseInitiationDate:     qc.dbCaseInitiationDate || item.dbCaseInitiationDate || get("allocationDate", "receivedDate"),
    dbCaseCompletionDate:     qc.dbCaseCompletionDate || item.dbCaseCompletionDate || get("deliveryDate", "closedDate"),
    dbRecordSummary:          qc.dbRecordSummary || item.dbRecordSummary || get("criminalDetails"),
    dbAdditionalRemarks:      qc.dbAdditionalRemarks || item.dbAdditionalRemarks || "",

    // PAN / Aadhaar — auto-fill from CaseDetails Identity section
    panCandidateName:      qc.panCandidateName || identity.candidateName || item.panCandidateName || name,
    panFatherName:         qc.panFatherName || identity.fatherName || item.panFatherName || fatherName,
    panDob:                qc.panDob || identity.dob || item.panDob || dob,
    panNumber:             qc.panNumber || identity.panNumber || item.panNumber || pan,
    panVerifiedName:       qc.panVerifiedName || identity.verifiedName || item.panVerifiedName || name,
    panVerifiedFatherName: qc.panVerifiedFatherName || identity.verifiedFatherName || item.panVerifiedFatherName || fatherName,
    panVerifiedDob:        qc.panVerifiedDob || identity.verifiedDob || item.panVerifiedDob || dob,
    panVerifiedNumber:     qc.panVerifiedNumber || identity.verifiedNumber || item.panVerifiedNumber || pan,
    panVerificationDate:   qc.panVerificationDate || identity.verificationDate || item.panVerificationDate || "",
    panRespondentName:     qc.panRespondentName || identity.respondentName || item.panRespondentName || "Online",
    panFinalRemarks:       qc.panFinalRemarks || identity.finalRemarks || item.panFinalRemarks || "",

    aadharCandidateName:      qc.aadharCandidateName || item.aadharCandidateName || name,
    aadharFatherName:         qc.aadharFatherName || item.aadharFatherName || fatherName,
    aadharDob:                qc.aadharDob || item.aadharDob || dob,
    aadharNumber:             qc.aadharNumber || item.aadharNumber || aadhar,
    aadharVerifiedName:       qc.aadharVerifiedName || item.aadharVerifiedName || name,
    aadharVerifiedFatherName: qc.aadharVerifiedFatherName || item.aadharVerifiedFatherName || fatherName,
    aadharVerifiedDob:        qc.aadharVerifiedDob || item.aadharVerifiedDob || dob,
    aadharVerifiedNumber:     qc.aadharVerifiedNumber || item.aadharVerifiedNumber || aadhar,
    aadharVerificationDate:   qc.aadharVerificationDate || item.aadharVerificationDate || "",
    aadharRespondentName:     qc.aadharRespondentName || item.aadharRespondentName || "Online",
    aadharFinalRemarks:       qc.aadharFinalRemarks || item.aadharFinalRemarks || "",

    // Credit
    creditCandidateName:     qc.creditCandidateName || item.creditCandidateName || name,
    creditDob:               qc.creditDob || item.creditDob || dob,
    creditPanNumber:         qc.creditPanNumber || item.creditPanNumber || pan,
    creditAadharNumber:      qc.creditAadharNumber || item.creditAadharNumber || aadhar,
    creditAgencyName:        qc.creditAgencyName || item.creditAgencyName || "",
    creditScore:             qc.creditScore || item.creditScore || "",
    creditRating:            qc.creditRating || item.creditRating || "",
    creditReportDate:        qc.creditReportDate || item.creditReportDate || "",
    creditAccountsFound:     qc.creditAccountsFound || item.creditAccountsFound || "",
    creditDefaultOrDues:     qc.creditDefaultOrDues || item.creditDefaultOrDues || "",
    creditRespondentName:    qc.creditRespondentName || item.creditRespondentName || "Online",
    creditFinalRemarks:      qc.creditFinalRemarks || item.creditFinalRemarks || "",
    creditAdditionalRemarks: qc.creditAdditionalRemarks || item.creditAdditionalRemarks || "",

    checks: Array.isArray(item.checks) ? item.checks :
            Array.isArray(qc.checks)   ? qc.checks   : [],
  };

  FILE_FIELDS.forEach((field) => {
    normalized[field] = mergeFileArrays(item[field] || [], qc[field] || []);
  });

  return normalized;
}

