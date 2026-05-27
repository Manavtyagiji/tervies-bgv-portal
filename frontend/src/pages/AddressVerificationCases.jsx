import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const STATUS_STYLES = {
  SUBMITTED:    { bg: "#dbeafe", color: "#1e40af", label: "Submitted" },
  VERIFIED:     { bg: "#dcfce7", color: "#166534", label: "Verified" },
  DISCREPANCY:  { bg: "#fee2e2", color: "#991b1b", label: "Discrepancy" },
  INSUFFICIENT: { bg: "#fef9c3", color: "#854d0e", label: "Insufficient" },
};

export default function AddressVerificationCases() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});
  const [updating, setUpdating] = useState(false);
  const [remarkInput, setRemarkInput] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/address-verify/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setVerifications(data.verifications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (v) => {
    setSelected(v);
    setRemarkInput(v.remarks || "");
    setNewStatus(v.status || "SUBMITTED");
    setPhotoUrls({});
    try {
      const res = await fetch(`${API}/api/address-verify/admin/get-photo-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verificationId: v.verificationId }),
      });
      const data = await res.json();
      if (data.success) setPhotoUrls(data.urls || {});
    } catch (e) {}
  };

  const updateStatus = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      await fetch(`${API}/api/address-verify/admin/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          verificationId: selected.verificationId,
          status: newStatus,
          remarks: remarkInput,
        }),
      });
      await fetchAll();
      setSelected(null);
    } catch (e) {}
    setUpdating(false);
  };

  const downloadReport = (id) => {
    window.open(`${API}/api/address-verify/report/${id}?token=${token}`, "_blank");
  };

  const filtered = verifications.filter((v) => {
    const q = search.toLowerCase();
    const matchSearch =
      v.name?.toLowerCase().includes(q) ||
      v.verificationId?.toLowerCase().includes(q) ||
      v.phone?.includes(q) ||
      v.caseId?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const PHOTO_LABELS = {
    selfie: "Selfie", addressProof: "Address Proof",
    housePic: "House Photo", landmarkPic: "Landmark", signature: "Signature",
  };

  const counts = {
    total:        verifications.length,
    submitted:    verifications.filter(v => v.status === "SUBMITTED").length,
    verified:     verifications.filter(v => v.status === "VERIFIED").length,
    discrepancy:  verifications.filter(v => v.status === "DISCREPANCY").length,
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>
          🏠 Address Verification Cases
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          All residential address verifications submitted via the portal
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total", value: counts.total, color: "#1e3a8a", bg: "#eff6ff" },
          { label: "Submitted", value: counts.submitted, color: "#1d4ed8", bg: "#dbeafe" },
          { label: "Verified", value: counts.verified, color: "#166534", bg: "#dcfce7" },
          { label: "Discrepancy", value: counts.discrepancy, color: "#991b1b", bg: "#fee2e2" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, phone, case ID..."
          style={{
            flex: 1, padding: "9px 14px", border: "1.5px solid #bfdbfe",
            borderRadius: 9, fontSize: 13, outline: "none",
          }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: "9px 14px", border: "1.5px solid #bfdbfe",
            borderRadius: 9, fontSize: 13, background: "#fff", outline: "none",
          }}
        >
          <option value="ALL">All Status</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="VERIFIED">Verified</option>
          <option value="DISCREPANCY">Discrepancy</option>
          <option value="INSUFFICIENT">Insufficient</option>
        </select>
        <button
          onClick={fetchAll}
          style={{
            padding: "9px 18px", background: "#1e3a8a", color: "#fff",
            border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "#f8fafc",
          borderRadius: 12, border: "1.5px dashed #bfdbfe", color: "#64748b",
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏠</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No address verifications found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            They will appear here once candidates submit the form
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {["Verification ID","Name","Phone","Case ID","Address","Submitted At","Status","Actions"].map(h => (
                  <th key={h} style={{
                    padding: "11px 14px", textAlign: "left", fontWeight: 700,
                    color: "#1e3a8a", fontSize: 12, borderBottom: "1px solid #e2e8f0",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const st = STATUS_STYLES[v.status] || STATUS_STYLES.SUBMITTED;
                return (
                  <tr key={v.verificationId}
                    style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 11, color: "#2563eb" }}>
                      {v.verificationId}
                    </td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: "#0f172a" }}>
                      {v.name || "—"}
                    </td>
                    <td style={{ padding: "11px 14px", color: "#374151" }}>{v.phone || "—"}</td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 11 }}>
                      {v.caseId || "—"}
                    </td>
                    <td style={{ padding: "11px 14px", color: "#374151", maxWidth: 180,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.presentAddress || "—"}
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 11 }}>
                      {fmtDate(v.submittedAt)}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{
                        background: st.bg, color: st.color,
                        padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11,
                      }}>{st.label}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openDetail(v)}
                          style={{
                            padding: "5px 12px", background: "#2563eb", color: "#fff",
                            border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >View</button>
                        <button
                          onClick={() => downloadReport(v.verificationId)}
                          style={{
                            padding: "5px 12px", background: "#059669", color: "#fff",
                            border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >PDF</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, width: "100%", maxWidth: 760,
              maxHeight: "90vh", overflow: "auto", padding: 28,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a" }}>
                  {selected.name}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontFamily: "monospace" }}>
                  {selected.verificationId}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "#f1f5f9", border: "none", borderRadius: 8,
                  width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#64748b",
                }}
              >✕</button>
            </div>

            {/* Info Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                ["Phone", selected.phone],
                ["Case ID", selected.caseId || "N/A"],
                ["Father's Name", selected.fatherName || "—"],
                ["DOB", selected.dob || "—"],
                ["Gender", selected.gender || "—"],
                ["Verifier", `${selected.verifierName || "—"} (${selected.relationWithVerifier || "—"})`],
                ["Nature of Residence", selected.natureOfResidence || "—"],
                ["Period of Stay", `${selected.periodOfStayFrom || "—"} to ${selected.periodOfStayTo || "—"}`],
                ["Nearest Landmark", selected.nearestLandmark || "—"],
                ["GPS", selected.gps ? `${parseFloat(selected.gps.lat).toFixed(6)}, ${parseFloat(selected.gps.lng).toFixed(6)}` : "—"],
                ["Submitted", fmtDate(selected.submittedAt)],
                ["Reviewed", fmtDate(selected.reviewedAt)],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a" }}>{k}</div>
                  <div style={{ fontSize: 13, color: "#0f172a", marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Address */}
            <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af" }}>Present Address</div>
              <div style={{ fontSize: 13, color: "#1e3a8a", marginTop: 4 }}>{selected.presentAddress || "—"}</div>
            </div>

            {/* Photos */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 10 }}>
                Photographic Evidence
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {Object.entries(PHOTO_LABELS).map(([field, label]) => (
                  <div key={field} style={{ border: "1.5px solid #bfdbfe", borderRadius: 10, overflow: "hidden" }}>
                    {photoUrls[field] ? (
                      <img
                        src={photoUrls[field]}
                        alt={label}
                        style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{
                        height: 120, background: "#f1f5f9", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        color: "#94a3b8", fontSize: 12,
                      }}>
                        {field === "landmarkPic" ? "Not provided" : "Loading..."}
                      </div>
                    )}
                    <div style={{
                      padding: "6px 10px", fontSize: 11, fontWeight: 700,
                      color: "#1e40af", background: "#eff6ff",
                    }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Status */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", marginBottom: 10 }}>
                Update Status
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                {["SUBMITTED","VERIFIED","DISCREPANCY","INSUFFICIENT"].map(s => {
                  const st = STATUS_STYLES[s] || STATUS_STYLES.SUBMITTED;
                  return (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      style={{
                        padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        border: newStatus === s ? "2.5px solid #1e3a8a" : "1.5px solid #bfdbfe",
                        background: newStatus === s ? st.bg : "#fff",
                        color: newStatus === s ? st.color : "#64748b",
                        cursor: "pointer",
                      }}
                    >{st.label}</button>
                  );
                })}
              </div>
              <textarea
                value={remarkInput}
                onChange={e => setRemarkInput(e.target.value)}
                placeholder="Add remarks (optional)..."
                rows={2}
                style={{
                  width: "100%", padding: "8px 12px", border: "1.5px solid #bfdbfe",
                  borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={updateStatus}
                disabled={updating}
                style={{
                  flex: 1, padding: "11px 0", background: "#1e3a8a", color: "#fff",
                  border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700,
                  cursor: updating ? "not-allowed" : "pointer", opacity: updating ? 0.7 : 1,
                }}
              >{updating ? "Saving..." : "Save Status"}</button>
              <button
                onClick={() => downloadReport(selected.verificationId)}
                style={{
                  flex: 1, padding: "11px 0", background: "#059669", color: "#fff",
                  border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >Download PDF Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}