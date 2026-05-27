import { useState, useEffect } from "react";
import axios from "../utils/axios";

const ALL_CHECKS = [
  "Employment Check",
  "Residential Address Check",
  "Educational Qualification Check",
  "Identity Check (PAN Card)",
  "Identity Check (Aadhar Card)",
  "Criminal Police Record Check",
  "Criminal Database Check",
  "Professional Reference Check",
];

const CHECK_COLORS = {
  "Employment Check":               "#3b82f6",
  "Residential Address Check":      "#6366f1",
  "Educational Qualification Check":"#8b5cf6",
  "Identity Check (PAN Card)":      "#0891b2",
  "Identity Check (Aadhar Card)":   "#0891b2",
  "Criminal Police Record Check":   "#dc2626",
  "Criminal Database Check":        "#ea580c",
  "Professional Reference Check":   "#059669",
};

const CHECK_ICONS = {
  "Employment Check":               "💼",
  "Residential Address Check":      "🏠",
  "Educational Qualification Check":"🎓",
  "Identity Check (PAN Card)":      "🪪",
  "Identity Check (Aadhar Card)":   "🪪",
  "Criminal Police Record Check":   "🚔",
  "Criminal Database Check":        "🗄️",
  "Professional Reference Check":   "👔",
};

const STYLE = `
  .ae-root { min-height: 100vh; background: #f8fafc; padding: 32px 28px; font-family: 'DM Sans', Inter, system-ui, sans-serif; }
  .ae-header { margin-bottom: 28px; }
  .ae-title { font-size: 30px; font-weight: 800; color: #111827; margin: 0; }
  .ae-sub { color: #6b7280; font-size: 14px; margin-top: 6px; }

  .ae-add-card {
    background: white; border-radius: 20px; border: 1px solid #e5e7eb;
    padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .ae-add-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 20px; }
  .ae-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 20px; }
  .ae-field label {
    display: block; font-size: 11px; font-weight: 700; color: #9ca3af;
    text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px;
  }
  .ae-input {
    width: 100%; border: 1px solid #e5e7eb; border-radius: 10px;
    padding: 10px 14px; font-size: 14px; color: #111827; outline: none;
    transition: border-color 0.15s; font-family: inherit; box-sizing: border-box;
  }
  .ae-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

  .ae-checks-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px; }
  .ae-checks-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .ae-check-toggle {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 14px; border-radius: 999px; border: 2px solid #e5e7eb;
    cursor: pointer; font-size: 12px; font-weight: 600; color: #6b7280;
    background: white; transition: all 0.15s; font-family: inherit;
  }
  .ae-check-toggle.selected { color: white; border-color: transparent; }
  .ae-check-toggle:hover { border-color: #c7d2fe; }

  .ae-create-btn {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white; border: none; border-radius: 12px;
    padding: 11px 28px; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    box-shadow: 0 4px 16px rgba(99,102,241,0.25);
  }
  .ae-create-btn:hover { transform: translateY(-1px); }
  .ae-create-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Employee list */
  .ae-list-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 16px; }
  .ae-emp-card {
    background: white; border-radius: 18px; border: 1px solid #e5e7eb;
    padding: 20px 24px; margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    transition: box-shadow 0.15s;
  }
  .ae-emp-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
  .ae-emp-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
  .ae-emp-avatar {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800; color: white; flex-shrink: 0;
  }
  .ae-emp-name { font-size: 16px; font-weight: 700; color: #111827; }
  .ae-emp-email { font-size: 13px; color: #6b7280; margin-top: 2px; }
  .ae-emp-actions { margin-left: auto; display: flex; gap: 8px; }
  .ae-action-btn {
    padding: 7px 14px; border-radius: 9px; font-size: 12px; font-weight: 700;
    cursor: pointer; border: 1px solid; transition: all 0.15s; font-family: inherit;
  }
  .ae-btn-edit { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }
  .ae-btn-edit:hover { background: #e0e7ff; }
  .ae-btn-delete { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
  .ae-btn-delete:hover { background: #fee2e2; }
  .ae-emp-checks { display: flex; flex-wrap: wrap; gap: 7px; }
  .ae-check-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 11px; border-radius: 999px; font-size: 11px; font-weight: 600;
  }
  .ae-emp-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
    margin-left: 8px;
  }
  .ae-emp-id { font-size: 11px; color: #9ca3af; font-family: monospace; }

  /* Edit modal */
  .ae-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .ae-modal {
    background: white; border-radius: 20px; padding: 32px; width: 100%; max-width: 540px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;
  }
  .ae-modal-title { font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 20px; }
  .ae-modal-actions { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }
  .ae-modal-cancel {
    padding: 10px 22px; border: 1px solid #e5e7eb; border-radius: 10px;
    background: white; color: #374151; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }
  .ae-modal-save {
    padding: 10px 22px; border: none; border-radius: 10px;
    background: linear-gradient(135deg, #6366f1, #4f46e5); color: white;
    font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
  }
  .ae-empty { text-align: center; padding: 48px; color: #9ca3af; font-size: 14px; }
  .ae-empty-icon { font-size: 40px; margin-bottom: 12px; }
  .ae-success { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 12px 16px; color: #065f46; font-size: 13px; font-weight: 600; margin-bottom: 16px; }

  @media (max-width: 768px) {
    .ae-form-grid { grid-template-columns: 1fr; }
    .ae-root { padding: 20px 16px; }
  }
`;

if (typeof document !== "undefined" && !document.getElementById("ae-style")) {
  const s = document.createElement("style");
  s.id = "ae-style";
  s.textContent = STYLE;
  document.head.appendChild(s);
}

const emptyForm = { name: "", email: "", password: "", assignedChecks: [] };

export default function AdminEmployees() {
  const token = localStorage.getItem("adminToken");
  const [employees,     setEmployees]     = useState([]);
  const [form,          setForm]          = useState(emptyForm);
  const [creating,      setCreating]      = useState(false);
  const [successMsg,    setSuccessMsg]    = useState("");
  const [editTarget,    setEditTarget]    = useState(null); // employee being edited
  const [editForm,      setEditForm]      = useState({});
  const [saving,        setSaving]        = useState(false);
  const [loading,       setLoading]       = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/admin/employees", { headers });
      setEmployees(res.data?.employees || []);
    } catch { setEmployees([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const toggleCheck = (checkName, formSetter, currentChecks) => {
    formSetter(prev => ({
      ...prev,
      assignedChecks: currentChecks.includes(checkName)
        ? currentChecks.filter(c => c !== checkName)
        : [...currentChecks, checkName],
    }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { alert("Name, email, and password required"); return; }
    if (form.assignedChecks.length === 0) { alert("Assign at least one check type"); return; }
    setCreating(true);
    try {
      const res = await axios.post("/api/admin/create-employee", form, { headers });
      if (res.data?.success) {
        setEmployees(prev => [...prev, res.data.employee]);
        setForm(emptyForm);
        setSuccessMsg(`Employee "${res.data.employee.name}" created successfully!`);
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create employee");
    } finally { setCreating(false); }
  };

  const handleDelete = async (emp) => {
    if (!confirm(`Delete employee "${emp.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/employees/${emp.employeeId}`, { headers });
      setEmployees(prev => prev.filter(e => e.employeeId !== emp.employeeId));
    } catch { alert("Failed to delete employee"); }
  };

  const openEdit = (emp) => {
    setEditTarget(emp);
    setEditForm({ name: emp.name, email: emp.email, password: "", assignedChecks: [...(emp.assignedChecks || [])] });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await axios.post("/api/admin/update-employee", {
        employeeId: editTarget.employeeId,
        ...editForm,
      }, { headers });
      if (res.data?.success) {
        setEmployees(prev => prev.map(e => e.employeeId === editTarget.employeeId ? res.data.employee : e));
        setEditTarget(null);
      }
    } catch { alert("Failed to update employee"); }
    finally { setSaving(false); }
  };

  const initials = (name) => (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="ae-root">
      <div className="ae-header">
        <h1 className="ae-title">Employee Management</h1>
        <p className="ae-sub">Create employees and assign specific check types — employees only see their assigned checks</p>
      </div>

      {/* Create form */}
      <div className="ae-add-card">
        <div className="ae-add-title">➕ Add New Employee</div>

        {successMsg && <div className="ae-success">✅ {successMsg}</div>}

        <div className="ae-form-grid">
          <div className="ae-field">
            <label>Full Name</label>
            <input className="ae-input" placeholder="Rahul Sharma" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="ae-field">
            <label>Email</label>
            <input className="ae-input" type="email" placeholder="rahul@company.com" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="ae-field">
            <label>Password</label>
            <input className="ae-input" type="password" placeholder="Set a password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
        </div>

        <div className="ae-checks-label">Assign Check Types</div>
        <div className="ae-checks-grid">
          {ALL_CHECKS.map(ch => {
            const selected = form.assignedChecks.includes(ch);
            const color = CHECK_COLORS[ch] || "#6366f1";
            return (
              <button
                key={ch}
                className={`ae-check-toggle${selected ? " selected" : ""}`}
                style={selected ? { background: color } : {}}
                onClick={() => toggleCheck(ch, setForm, form.assignedChecks)}
              >
                <span>{CHECK_ICONS[ch]}</span>
                <span>{ch}</span>
              </button>
            );
          })}
        </div>

        <button className="ae-create-btn" onClick={handleCreate} disabled={creating}>
          {creating ? "Creating…" : "Create Employee"}
        </button>
      </div>

      {/* Employee list */}
      <div className="ae-list-title">
        Employees ({employees.length})
      </div>

      {loading ? (
        <div className="ae-empty"><div className="ae-empty-icon">⏳</div>Loading employees…</div>
      ) : employees.length === 0 ? (
        <div className="ae-empty">
          <div className="ae-empty-icon">👥</div>
          No employees yet. Create one above.
        </div>
      ) : (
        employees.map(emp => (
          <div key={emp.employeeId} className="ae-emp-card">
            <div className="ae-emp-top">
              <div className="ae-emp-avatar">{initials(emp.name)}</div>
              <div>
                <div className="ae-emp-name">
                  {emp.name}
                  <span className="ae-emp-status" style={emp.active !== false
                    ? { background: "#ecfdf5", color: "#065f46" }
                    : { background: "#fef2f2", color: "#dc2626" }}>
                    {emp.active !== false ? "● Active" : "● Inactive"}
                  </span>
                </div>
                <div className="ae-emp-email">{emp.email}</div>
                <div className="ae-emp-id">ID: {emp.employeeId}</div>
              </div>
              <div className="ae-emp-actions">
                <button className="ae-action-btn ae-btn-edit" onClick={() => openEdit(emp)}>✏️ Edit</button>
                <button className="ae-action-btn ae-btn-delete" onClick={() => handleDelete(emp)}>🗑️ Delete</button>
              </div>
            </div>
            <div className="ae-emp-checks">
              {(emp.assignedChecks || []).length === 0 ? (
                <span style={{ fontSize: 13, color: "#9ca3af" }}>No checks assigned</span>
              ) : (
                (emp.assignedChecks || []).map(ch => {
                  const color = CHECK_COLORS[ch] || "#6366f1";
                  return (
                    <span key={ch} className="ae-check-pill"
                      style={{ background: color + "18", color, border: `1px solid ${color}33` }}>
                      {CHECK_ICONS[ch]} {ch}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        ))
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="ae-modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="ae-modal" onClick={e => e.stopPropagation()}>
            <div className="ae-modal-title">✏️ Edit Employee — {editTarget.name}</div>

            <div className="ae-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="ae-field">
                <label>Full Name</label>
                <input className="ae-input" value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="ae-field">
                <label>Email</label>
                <input className="ae-input" value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="ae-field">
                <label>New Password (leave blank to keep)</label>
                <input className="ae-input" type="password" placeholder="••••••••"
                  value={editForm.password}
                  onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
              </div>
            </div>

            <div className="ae-checks-label" style={{ marginTop: 8 }}>Assigned Check Types</div>
            <div className="ae-checks-grid">
              {ALL_CHECKS.map(ch => {
                const selected = editForm.assignedChecks?.includes(ch);
                const color = CHECK_COLORS[ch] || "#6366f1";
                return (
                  <button
                    key={ch}
                    className={`ae-check-toggle${selected ? " selected" : ""}`}
                    style={selected ? { background: color } : {}}
                    onClick={() => toggleCheck(ch, setEditForm, editForm.assignedChecks || [])}
                  >
                    <span>{CHECK_ICONS[ch]}</span>
                    <span>{ch}</span>
                  </button>
                );
              })}
            </div>

            <div className="ae-modal-actions">
              <button className="ae-modal-cancel" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="ae-modal-save" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}