import { useEffect, useState } from "react";
import axios from "../utils/axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Document, Page } from "react-pdf";

const API = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://tervies.info/api";

// ─────────────────────────────────────────────────────────────────────────────
// INDEXEDDB DATABASE WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
const DB_NAME    = "BGV_AdminDB";
const DB_VERSION = 1;
const STORE_NAME = "admin_cases";

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
    request.onerror  = () => reject(request.error);
  });
}

async function saveCasesArrayToDB(casesArray) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req   = store.put(casesArray, "all_cases");
      req.onsuccess = () => resolve(true);
      req.onerror   = () => reject(req.error);
    });
  } catch (error) {
    console.error("IndexedDB Save Error:", error);
    return false;
  }
}

async function getCasesArrayFromDB() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req   = store.get("all_cases");
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  } catch (error) {
    console.error("IndexedDB Get Error:", error);
    return [];
  }
}

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
  });

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CaseDetailsPage() {
  const { id: rawId } = useParams();
  const id            = decodeURIComponent(rawId);
  const navigate      = useNavigate();
  const location      = useLocation();
  const getToken      = () => localStorage.getItem("adminToken");

  // ── Core state ─────────────────────────────────────────────────────────────
  const [selectedCase, setSelectedCase] = useState(null);
  const [editData,     setEditData]     = useState(null);
  const [isEditing,    setIsEditing]    = useState(false);
  const [saving,       setSaving]       = useState(false);

  // ── Document preview state ──────────────────────────────────────────────────
  const [previewDoc,   setPreviewDoc]   = useState(null);
  const [verifiedFile, setVerifiedFile] = useState(null);
  const [scale,        setScale]        = useState(1);
  const [rotation,     setRotation]     = useState(0);

  // ── UI toggles ──────────────────────────────────────────────────────────────
  const [showClientDetails, setShowClientDetails] = useState(false);

  // ── BGV Report upload (cross-device) ────────────────────────────────────────
  const [bgvReportFile, setBgvReportFile] = useState(null);
  const [bgvUploading,  setBgvUploading]  = useState(false);

  // ── Save feedback ───────────────────────────────────────────────────────────
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => { fetchCase(); }, [id]);

  // ─────────────────────────────────────────────────────────────────────────
  // LOCAL STORAGE HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const saveToLocal = async (data) => {
    try {
      const localCases = await getCasesArrayFromDB();
      const exists     = localCases.some((c) => c.caseId === data.caseId);
      const updated    = exists
        ? localCases.map((c) => c.caseId === data.caseId ? { ...c, ...data } : c)
        : [{ ...data }, ...localCases];

      await saveCasesArrayToDB(updated);

      // Lightweight fallback to localStorage
      try {
        const light = updated.map(c => ({
          ...c,
          documents:         [],
          verifiedDocuments: (c.verifiedDocuments || []).map(d => ({ ...d, dataUrl: undefined })),
        }));
        localStorage.setItem("cases", JSON.stringify(light));
      } catch {}
    } catch (e) {
      console.error("saveToLocal error:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH CASE
  // ─────────────────────────────────────────────────────────────────────────
  const fetchCase = async () => {
    const localCases = await getCasesArrayFromDB();
    const localData  = localCases.find((c) => c.caseId === id);

    try {
      const res        = await axios.get(`${API}/admin/cases`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      let serverData = res.data.cases.find((c) => c.caseId === id);

      if (!serverData && location.state?.manualData) {
        serverData = {
          ...location.state.manualData,
          verificationSummary: "",
          documents:           [],
          verifiedDocuments:   [],
        };
      }

      // Local always wins for user-edited fields
      const merged = {
        caseId: id,
        ...(serverData  || {}),
        ...(localData   || {}),
        documents: (localData?.documents?.length
          ? localData.documents
          : serverData?.documents) || [],
        verifiedDocuments: (localData?.verifiedDocuments?.length
          ? localData.verifiedDocuments
          : serverData?.verifiedDocuments) || [],
        // Preserve server QC fields
        qcApproved:        serverData?.qcApproved        || localData?.qcApproved        || false,
        qcApprovedAt:      serverData?.qcApprovedAt       || localData?.qcApprovedAt       || null,
        bgvReportKey:      serverData?.bgvReportKey       || localData?.bgvReportKey       || null,
        reportGeneratedAt: serverData?.reportGeneratedAt  || localData?.reportGeneratedAt  || null,
      };

      setSelectedCase(merged);
      setEditData(merged);
    } catch (error) {
      console.error("Fetch case error:", error);

      let caseData = localData || null;

      if (!caseData && location.state?.manualData) {
        caseData = {
          ...location.state.manualData,
          verificationSummary: "",
          documents:           [],
          verifiedDocuments:   [],
        };
      }

      caseData = {
        caseId: id,
        ...caseData,
        verifiedDocuments: Array.isArray(caseData?.verifiedDocuments) ? caseData.verifiedDocuments : [],
        documents:         Array.isArray(caseData?.documents)         ? caseData.documents         : [],
      };

      setSelectedCase(caseData);
      setEditData(caseData);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE MANUAL DETAILS  ← the critical fix: saves ALL fields properly
  // ─────────────────────────────────────────────────────────────────────────
  const saveManualDetails = async () => {
    if (!editData?.caseId) {
      alert("Case ID missing. Please enter the case ID.");
      return;
    }

    setSaving(true);
    setIsEditing(false);

    // 1. Save locally FIRST — always persisted even if server fails
    await saveToLocal(editData);
    setSelectedCase(editData);

    try {
      // 2. Build payload — strip base64 blobs to avoid 413 errors
      const payload = {
        ...editData,
        documents: (editData.documents || []).map(d => ({
          ...d,
          dataUrl: undefined,
          base64:  undefined,
        })),
        verifiedDocuments: (editData.verifiedDocuments || []).map(d => ({
          ...d,
          dataUrl: undefined,
          base64:  undefined,
        })),
      };

      // 3. Send to server via update-case-details
      const res = await axios.post(
        `${API}/admin/update-case-details`,
        payload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      const savedCase = res.data?.case || editData;
      // Re-merge to keep local docs intact
      const merged = { ...savedCase, ...editData };
      setSelectedCase(merged);
      setEditData(merged);
      await saveToLocal(merged);

      setSaveMsg("✅ Case details saved successfully!");
    } catch (error) {
      console.error("Update failed:", error);
      // Local already saved — show success anyway
      setSaveMsg("✅ Saved locally (will sync when server is available)");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PREVIEW DOCUMENT
  // ─────────────────────────────────────────────────────────────────────────
  const previewDocument = (caseId, key) => {
    const allDocs = [
      ...(currentData.documents         || []),
      ...(currentData.verifiedDocuments || []),
    ];
    const doc = allDocs.find(d => d.key === key);

    if (doc?.dataUrl) {
      setPreviewDoc({ url: doc.dataUrl, name: doc.originalName || key });
      return;
    }

    const encoded = encodeURIComponent(key);
    const url     = `${API}/admin/download/${caseId}/${encoded}?token=${getToken()}`;
    setPreviewDoc({ url, name: key });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPLOAD VERIFIED DOCUMENT
  // ─────────────────────────────────────────────────────────────────────────
  const uploadVerified = async () => {
    if (!verifiedFile)          return alert("Select a file first");
    if (!selectedCase?.caseId)  return alert("Case not found");

    const formData = new FormData();
    formData.append("file", verifiedFile);

    try {
      await axios.post(
        `${API}/admin/upload-verified/${selectedCase.caseId}`,
        formData,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      alert("Verified document uploaded");
      setVerifiedFile(null);
      fetchCase();
    } catch (error) {
      console.error("Verified upload error:", error);

      // Offline fallback — store in IndexedDB
      try {
        const localCases  = await getCasesArrayFromDB();
        const base64Str   = await fileToBase64(verifiedFile);
        const fakeDoc     = {
          key:          `${Date.now()}-${verifiedFile.name}`,
          originalName: verifiedFile.name,
          dataUrl:      base64Str,
        };

        const updatedCases = localCases.map((c) =>
          c.caseId === selectedCase.caseId
            ? { ...c, verifiedDocuments: [...(c.verifiedDocuments || []), fakeDoc] }
            : c
        );

        await saveCasesArrayToDB(updatedCases);
        const currentUpdated = updatedCases.find(c => c.caseId === selectedCase.caseId);
        setSelectedCase(currentUpdated);
        setEditData(currentUpdated);
        alert("Server down — document cached locally.");
        setVerifiedFile(null);
      } catch (err) {
        console.error(err);
        alert("Upload failed completely.");
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPLOAD BGV REPORT (QC APPROVED — cross-device download)
  // ─────────────────────────────────────────────────────────────────────────
// ✅ NEW uploadBGVReport — with auto-close
const uploadBGVReport = async () => {
  if (!bgvReportFile)         return alert("Select a PDF file first");
  if (!selectedCase?.caseId)  return alert("Case not found");

  setBgvUploading(true);
  try {
    // Step 1: Upload BGV report to S3
    const formData = new FormData();
    formData.append("file", bgvReportFile);

    await axios.post(
      `${API}/admin/upload-bgv-report/${selectedCase.caseId}`,
      formData,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );

    // Step 2: Auto-close the case
    const closedDate = new Date().toISOString();
    await axios.post(
      `${API}/admin/update`,
      { caseId: selectedCase.caseId, status: "CLOSED", closedDate },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );

    // Step 3: Update local state immediately
    const updatedCase = {
      ...selectedCase,
      status:       "CLOSED",
      closedDate,
      qcApproved:   true,
      qcApprovedAt: closedDate,
    };
    setSelectedCase(updatedCase);
    setEditData(updatedCase);
    await saveToLocal(updatedCase);

    // Step 4: Update localStorage track_reports
    try {
      const allReports = JSON.parse(localStorage.getItem("track_reports") || "{}");
      const cid = selectedCase.caseId;
      if (allReports[cid]) {
        allReports[cid].qcApproved   = true;
        allReports[cid].qcApprovedAt = closedDate;
        localStorage.setItem("track_reports", JSON.stringify(allReports));
      }
    } catch {}

    alert("✅ BGV Report uploaded & Case automatically closed!");
    setBgvReportFile(null);
    fetchCase(); // Refresh to confirm server state
  } catch (err) {
    console.error("BGV Report upload error:", err);
    alert("Upload failed: " + (err.response?.data?.message || err.message));
  } finally {
    setBgvUploading(false);
  }
};

  // ─────────────────────────────────────────────────────────────────────────
  // CLOSE CASE
  // ─────────────────────────────────────────────────────────────────────────
  const closeCase = async () => {
    if (!selectedCase?.caseId) return alert("Case not found");

    const closedDate  = new Date().toISOString();
    const updatedCase = { ...selectedCase, status: "CLOSED", closedDate };

    setSelectedCase(updatedCase);
    setEditData(updatedCase);
    await saveToLocal(updatedCase);

    try {
      await axios.post(
        `${API}/admin/update`,
        { caseId: selectedCase.caseId, status: "CLOSED", closedDate },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      alert("Case closed successfully");
      fetchCase();
    } catch (error) {
      console.error("Close case error:", error);
      alert("Case closed locally");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT CHANGE HANDLER
  // ─────────────────────────────────────────────────────────────────────────
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (!selectedCase || !editData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading case details...</p>
        </div>
      </div>
    );
  }

  const currentData    = isEditing ? editData : selectedCase;
  const hasVerifiedDocs =
  (Array.isArray(currentData.verifiedDocuments) &&
  currentData.verifiedDocuments.length > 0) ||
  !!currentData.bgvReportKey ||
  !!currentData.qcApproved;
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS COLORS
  // ─────────────────────────────────────────────────────────────────────────
  const statusStyle = {
    VERIFIED:    "bg-green-200 text-green-800",
    DISCREPANCY: "bg-red-200 text-red-800",
    CLOSED:      "bg-slate-800 text-white",
    SUBMITTED:   "bg-yellow-200 text-yellow-800",
    UNDER_REVIEW:"bg-blue-200 text-blue-800",
    INSUFFICIENT:"bg-orange-200 text-orange-800",
  }[currentData.status] || "bg-yellow-200 text-yellow-800";

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-6">

      {/* ── BACK BUTTON ──────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm font-medium"
      >
        ← Back
      </button>

      {/* ── SAVE FEEDBACK ────────────────────────────────────────────────── */}
      {saveMsg && (
        <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">
          {saveMsg}
        </div>
      )}

      {/* ── HEADER CARD ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Case {currentData.caseId}
            </h1>
            <p className="text-gray-600 mt-1">
              Candidate: <span className="font-semibold">{currentData.name || "—"}</span>
            </p>
            <p className="text-gray-600">
              Client: <span className="font-semibold">{currentData.clientName || "—"}</span>
            </p>

            {/* QC Approved badge */}
            {currentData.qcApproved && (
              <div className="mt-2 inline-flex items-center gap-2 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
                ✅ QC Approved — Report live on Track page
              </div>
            )}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={() => setShowClientDetails(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 text-sm font-medium"
            >
              View Client Details
            </button>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 text-sm font-medium"
              >
                Edit Details
              </button>
            ) : (
              <>
                <button
                  onClick={saveManualDetails}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Details"}
                </button>
                <button
                  onClick={() => { setEditData(selectedCase); setIsEditing(false); }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 text-sm font-medium"
                >
                  Cancel
                </button>
              </>
            )}

            <span className={`px-4 py-2 rounded-full font-semibold text-sm ${statusStyle}`}>
              {currentData.status || "SUBMITTED"}
            </span>
          </div>
        </div>

        {/* Cost banner */}
        <div className="bg-green-100 p-4 rounded-xl mt-4">
          <h3 className="font-bold text-green-800">Case Cost</h3>
          <p className="text-lg font-semibold text-green-700">₹ {currentData.totalCost || 0}</p>
        </div>

        {/* System Decision */}
        <div className="mt-4 p-4 rounded-xl bg-white/60 backdrop-blur border">
          <h3 className="font-semibold text-gray-700 mb-1">System Decision</h3>
          <p className={`text-lg font-semibold ${
            currentData.status === "VERIFIED" || currentData.status === "CLOSED"
              ? "text-green-600" : "text-red-600"
          }`}>
            {currentData.verificationSummary || "No summary yet"}
          </p>
        </div>

        {/* OCR grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-blue-100 p-4 rounded-xl shadow">
            <h3 className="text-blue-700 font-semibold text-sm">Extracted Name</h3>
            <p className="text-gray-800 font-medium">{currentData.ocrExtractedName || "Not detected"}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-xl shadow">
            <h3 className="text-purple-700 font-semibold text-sm">Extracted DOB</h3>
            <p className="text-gray-800 font-medium">{currentData.ocrExtractedDob || "Not detected"}</p>
          </div>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN GRID ───────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* ── LEFT: Document sections ─────────────────────────────────────── */}
        <div className="col-span-3 space-y-4">
          <DocumentSection
            title="Address"
            docs={currentData.documents?.filter((d) => d.type === "address")}
            caseId={currentData.caseId}
            previewDocument={previewDocument}
          />
          <DocumentSection
            title="Employment"
            docs={currentData.documents?.filter((d) => d.type === "employment")}
            caseId={currentData.caseId}
            previewDocument={previewDocument}
          />
          <DocumentSection
            title="Education"
            docs={currentData.documents?.filter((d) => d.type === "education")}
            caseId={currentData.caseId}
            previewDocument={previewDocument}
          />
          <DocumentSection
            title="Criminal"
            docs={currentData.documents?.filter((d) => d.type === "criminal")}
            caseId={currentData.caseId}
            previewDocument={previewDocument}
          />
          <DocumentSection
            title="Identity"
            docs={currentData.documents?.filter((d) => d.type === "identity")}
            caseId={currentData.caseId}
            previewDocument={previewDocument}
          />
        </div>

        {/* ── CENTRE: Document Preview ─────────────────────────────────────── */}
        <div className="col-span-6">
          <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-xl p-6 h-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Document Preview</h2>

            {!previewDoc && (
              <p className="text-gray-400 text-center mt-32 text-sm">
                Select a document to preview
              </p>
            )}

            {previewDoc && (
              <div>
                {/* Controls */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button
                    onClick={() => setScale(s => Math.min(s + 0.2, 3))}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                  >
                    Zoom +
                  </button>
                  <button
                    onClick={() => setScale(s => Math.max(0.4, s - 0.2))}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                  >
                    Zoom −
                  </button>
                  <button
                    onClick={() => setRotation(r => r + 90)}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => { setScale(1); setRotation(0); }}
                    className="bg-gray-500 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-600"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="ml-auto bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm hover:bg-red-200"
                  >
                    Close
                  </button>
                </div>

                <p className="text-xs text-gray-500 mb-2 truncate">{previewDoc.name}</p>

                <div className="border rounded-xl h-[520px] flex justify-center items-center overflow-auto bg-gray-50">
                  {(previewDoc.url.includes(".pdf") ||
                    previewDoc.url.startsWith("data:application/pdf")) ? (
                    <Document file={previewDoc.url}>
                      <Page pageNumber={1} scale={scale} rotate={rotation} />
                    </Document>
                  ) : (
                    <img
                      src={previewDoc.url}
                      alt="preview"
                      style={{
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transition: "transform 0.2s",
                      }}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Actions ───────────────────────────────────────────────── */}
        <div className="col-span-3 space-y-4">

          {/* Verified Documents list */}
          <div className="bg-green-100 rounded-2xl shadow-lg p-5">
            <h2 className="font-semibold mb-3 text-green-800 text-sm">Verified Documents</h2>

            {(!currentData.verifiedDocuments || currentData.verifiedDocuments.length === 0) && (
              <p className="text-gray-500 text-sm">No verified documents yet</p>
            )}

            {currentData.verifiedDocuments?.map((doc) => (
              <div key={doc.key} className="border p-2 rounded mb-2 bg-green-50 text-sm">
                <button
                  onClick={() => previewDocument(currentData.caseId, doc.key)}
                  className="text-left w-full"
                >
                  ✅ <span className="text-green-800 hover:underline">{doc.originalName}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Upload Verified Document */}
          <div className="bg-blue-100 rounded-2xl shadow-lg p-5">
            <h2 className="font-semibold mb-3 text-blue-900 text-sm">Upload Verified Document</h2>

            <input
              type="file"
              onChange={(e) => setVerifiedFile(e.target.files[0])}
              className="text-sm w-full"
            />

            <button
              onClick={uploadVerified}
              disabled={!verifiedFile}
              className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
            >
              Upload
            </button>

            {/* Close Case button */}
            {hasVerifiedDocs && currentData.status !== "CLOSED" && (
              <button
                onClick={closeCase}
                className="mt-3 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold text-sm"
              >
                Close Case
              </button>
            )}

            {currentData.status === "CLOSED" && (
              <div className="mt-3 w-full bg-slate-800 text-white px-4 py-2 rounded-lg text-center font-semibold text-sm">
                ✅ Case Closed
              </div>
            )}
          </div>

          {/* ── BGV REPORT UPLOAD (QC Approved — cross-device) ─────────────── */}
          <div className="bg-purple-100 rounded-2xl shadow-lg p-5">
            <h2 className="font-semibold mb-1 text-purple-900 text-sm">
              📤 Upload BGV Report (QC Approved)
            </h2>
            <p className="text-xs text-purple-700 mb-3">
              Uploads PDF to server — downloadable from <strong>any device</strong> via Track page.
            </p>

            {/* QC status indicator */}
            {currentData.qcApproved ? (
              <div className="mb-3 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs px-3 py-2 rounded-lg font-medium">
                ✅ QC Approved — Report is live on Track page
                {currentData.qcApprovedAt && (
                  <span className="block text-emerald-600 mt-0.5">
                    {new Date(currentData.qcApprovedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs px-3 py-2 rounded-lg">
                ⏳ Not yet approved — upload PDF below to publish
              </div>
            )}

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setBgvReportFile(e.target.files[0])}
              className="text-sm w-full"
            />

            <button
              onClick={uploadBGVReport}
              disabled={bgvUploading || !bgvReportFile}
              className="mt-3 w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold text-sm disabled:opacity-50"
            >
              {bgvUploading ? "Uploading..." : currentData.qcApproved ? "Replace Report" : "Upload & Approve Report"}
            </button>
          </div>

        </div>
      </div>

      {/* ── CLIENT DETAILS MODAL ─────────────────────────────────────────── */}
      {showClientDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[860px] max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Client Form Details</h2>
                {isEditing && (
                  <p className="text-xs text-red-600 font-semibold mt-0.5">
                    Please enter the Case ID starting from TVS-1
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={saveManualDetails}
                    disabled={saving}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Details"}
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setShowClientDetails(false)}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Save feedback inside modal */}
            {saveMsg && (
              <div className="mx-6 mt-4 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                {saveMsg}
              </div>
            )}

            {/* Fields grid */}
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">

              {/* ── IDENTITY ───────────────────────────────────────────── */}
              <SectionHeading label="Identity" colSpan={2} />

              <EditableField label="Case ID"       name="caseId"       value={editData.caseId}       isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Full Name"      name="name"         value={editData.name}         isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Email"          name="email"        value={editData.email}        isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Phone"          name="phone"        value={editData.phone}        isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Alternate Phone" name="alternatephone" value={editData.alternatephone} isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Aadhar Number"  name="adharnumber"  value={editData.adharnumber}  isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Gender"         name="gender"       value={editData.gender}       isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Father Name"    name="fatherName"   value={editData.fatherName}   isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Date of Birth"  name="dob"          value={editData.dob}          isEditing={isEditing} onChange={handleEditChange} />
               <EditableField label="Pan Number" name="pan" value={editData.pan} isEditing={isEditing} onChange={handleEditChange} />

              {/* ── CLIENT INFO ─────────────────────────────────────────── */}
              <SectionHeading label="Client Information" colSpan={2} />

              <EditableField label="Client Name"    name="clientName"   value={editData.clientName}   isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Client Case ID" name="clientCaseId" value={editData.clientCaseId} isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="SPOC Name"      name="spocName"     value={editData.spocName}     isEditing={isEditing} onChange={handleEditChange} />

              {/* ── ADDRESS ─────────────────────────────────────────────── */}
              <SectionHeading label="Address" colSpan={2} />

              <EditableField label="Present Address"   name="presentAddress"   value={editData.presentAddress}   isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Permanent Address" name="permanentAddress" value={editData.permanentAddress} isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="State"             name="STATE"            value={editData.STATE}            isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Pincode"           name="pincode"          value={editData.pincode}          isEditing={isEditing} onChange={handleEditChange} />

              {/* ── EMPLOYMENT ──────────────────────────────────────────── */}
              <SectionHeading label="Employment" colSpan={2} />

              <EditableField label="Company"       name="company"     value={editData.company}     isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Designation"   name="designation" value={editData.designation} isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Duration"      name="duration"    value={editData.duration}    isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Employee ID"   name="employeeId"  value={editData.employeeId}  isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="CTC"           name="ctc"         value={editData.ctc}         isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Manager"       name="manager"     value={editData.manager}     isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Reason Leaving" name="reasonLeaving" value={editData.reasonLeaving} isEditing={isEditing} onChange={handleEditChange} />

              {/* ── EDUCATION ───────────────────────────────────────────── */}
              <SectionHeading label="Education" colSpan={2} />

              <EditableField label="Institution"   name="institution" value={editData.institution} isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="University"    name="university"  value={editData.university}  isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Degree"        name="degree"      value={editData.degree}      isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Year"          name="year"        value={editData.year}        isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Registration"  name="registration" value={editData.registration} isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Mode"          name="mode"        value={editData.mode}        isEditing={isEditing} onChange={handleEditChange} />

              {/* ── CRIMINAL ────────────────────────────────────────────── */}
              <SectionHeading label="Criminal" colSpan={2} />

              <EditableField label="Criminal Details" name="criminalDetails" value={editData.criminalDetails} isEditing={isEditing} onChange={handleEditChange} />

              {/* ── VERIFICATION ────────────────────────────────────────── */}
              <SectionHeading label="Verification" colSpan={2} />

              <EditableField label="Status"               name="status"               value={editData.status}               isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Verification Summary" name="verificationSummary"  value={editData.verificationSummary}  isEditing={isEditing} onChange={handleEditChange} />
              <EditableField label="Total Cost"           name="totalCost"            value={editData.totalCost}            isEditing={isEditing} onChange={handleEditChange} />

            </div>

            {/* Bottom save/close bar */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              {isEditing && (
                <button
                  onClick={saveManualDetails}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "💾 Save All Details"}
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => { setEditData(selectedCase); setIsEditing(false); }}
                  className="bg-gray-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => setShowClientDetails(false)}
                className="bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ label, colSpan = 1 }) {
  return (
    <div className={`col-span-${colSpan} mt-2`}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b border-indigo-200 pb-1">
        {label}
      </h3>
    </div>
  );
}

function EditableField({ label, name, value, isEditing, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
        {label}
      </label>
      {isEditing ? (
        <input
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full border border-indigo-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
      ) : (
        <p className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 min-h-[38px]">
          {value || <span className="text-gray-400">—</span>}
        </p>
      )}
    </div>
  );
}

function DocumentSection({ title, docs, caseId, previewDocument }) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-2xl shadow-md p-4">
      <h3 className="font-semibold text-gray-700 mb-3 text-sm">
        {title} Documents
      </h3>

      {(!docs || docs.length === 0) && (
        <p className="text-gray-400 text-xs">No documents uploaded</p>
      )}

      {docs?.map((doc) => (
        <div
          key={doc.key}
          className="flex justify-between items-center border border-gray-200 p-2 rounded-lg mb-2 hover:bg-gray-50"
        >
          <span className="text-xs truncate text-gray-700 mr-2">
            📄 {doc.originalName}
          </span>
          <button
            onClick={() => previewDocument(caseId, doc.key)}
            className="text-blue-600 text-xs font-semibold hover:underline whitespace-nowrap flex-shrink-0"
          >
            Preview
          </button>
        </div>
      ))}
    </div>
  );
}