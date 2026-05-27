import { useEffect, useState, useRef, useMemo } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";

const API = "/api";

// ─── palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:   "#0f172a",
  blue:   "#1e40af",
  sky:    "#0ea5e9",
  indigo: "#4f46e5",
  green:  "#16a34a",
  red:    "#dc2626",
  amber:  "#d97706",
  slate:  "#64748b",
  light:  "#f1f5f9",
};

// ─── Stat mini-card ───────────────────────────────────────────────────────────
function MiniStat({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 20px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)", display: "flex",
      alignItems: "flex-start", gap: 14, minWidth: 0,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: color + "18", display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, color: C.slate, marginTop: 3, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ title, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

// ─── Quick-action tile ────────────────────────────────────────────────────────
function ActionTile({ icon, label, desc, color, onClick, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? color : "#fff",
        border: `2px solid ${color}22`,
        borderRadius: 16, padding: "20px 18px", cursor: "pointer",
        transition: "all .2s", position: "relative", overflow: "hidden",
        boxShadow: hov ? `0 8px 24px ${color}30` : "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      {badge && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: C.red, color: "#fff", borderRadius: 20,
          fontSize: 10, fontWeight: 800, padding: "2px 7px",
        }}>{badge}</div>
      )}
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 14, color: hov ? "#fff" : C.navy }}>{label}</div>
      <div style={{ fontSize: 12, color: hov ? "rgba(255,255,255,.8)" : C.slate, marginTop: 4, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

// ─── Client card (shown after selection) ─────────────────────────────────────
function ClientCard({ company, onClose }) {
  const stats = [
    { label: "Total Cases", value: company.total, icon: "📁", color: C.blue },
    { label: "Verified", value: company.verified, icon: "✅", color: C.green },
    { label: "Under Review", value: company.underReview, icon: "🔍", color: C.amber },
    { label: "Discrepancy", value: company.discrepancy, icon: "⚠️", color: C.red },
    { label: "Insufficient", value: company.insufficient ?? 0, icon: "📋", color: C.slate },
    { label: "Submitted", value: company.submitted ?? 0, icon: "📨", color: C.indigo },
  ];
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
      padding: 24, marginTop: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{
            display: "inline-block", background: C.blue + "18",
            color: C.blue, fontSize: 11, fontWeight: 800,
            padding: "3px 10px", borderRadius: 20, marginBottom: 6,
          }}>CLIENT</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.navy }}>{company.name}</div>
          <div style={{ fontSize: 12, color: C.slate }}>ID: {company.companyId}</div>
        </div>
        <button onClick={onClose} style={{
          background: "#f1f5f9", border: "none", borderRadius: 8,
          padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: C.slate,
        }}>✕ Close</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {stats.map(s => <MiniStat key={s.label} {...s} />)}
      </div>
    </div>
  );
}

// ─── Employee row ─────────────────────────────────────────────────────────────
function EmployeeRow({ emp, index }) {
  const checks = emp.assignedChecks || [];
  const checkColors = { "Employment Check": "#4f46e5", "Criminal Police Record Check": "#dc2626", "Identity Check (PAN Card)": "#0ea5e9", "Identity Check (Aadhar Card)": "#0284c7", "Residential Address Check": "#16a34a", "Educational Qualification Check": "#d97706", "Credit Check": "#7c3aed", "Criminal Database Check": "#b45309", "Professional Reference Check": "#0f766e" };
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "32px 1fr auto auto",
      alignItems: "center", gap: 14, padding: "12px 0",
      borderBottom: "1px solid #f1f5f9",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: [C.blue, C.indigo, C.green, C.amber, C.sky][index % 5] + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, color: [C.blue, C.indigo, C.green, C.amber, C.sky][index % 5],
      }}>{(emp.name || "?")[0].toUpperCase()}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{emp.name}</div>
        <div style={{ fontSize: 11, color: C.slate }}>{emp.email}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 340 }}>
        {checks.slice(0, 3).map(c => (
          <span key={c} style={{
            background: (checkColors[c] || C.slate) + "18",
            color: checkColors[c] || C.slate,
            fontSize: 10, fontWeight: 700,
            padding: "2px 8px", borderRadius: 20,
          }}>{c.replace(" Check", "").replace(" Record", "")}</span>
        ))}
        {checks.length > 3 && (
          <span style={{ background: "#f1f5f9", color: C.slate, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
            +{checks.length - 3}
          </span>
        )}
      </div>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: emp.active !== false ? C.green : C.red,
      }} />
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();

  // auth
  useEffect(() => {
    if (!localStorage.getItem("adminToken")) navigate("/admin/login");
  }, []);

  // state
  const [analytics, setAnalytics] = useState(null);
  const [companyAnalytics, setCompanyAnalytics] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [cases, setCases] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);

  // client selector
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const dropRef = useRef(null);

  // chart tab
  const [chartTab, setChartTab] = useState("bar");

  // fetch
  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(fetchAll, 10000);
    return () => clearInterval(iv);
  }, [autoRefresh]);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setClientDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnalytics(), fetchCompanyAnalytics(),
        fetchEmployees(), fetchRevenue(), fetchCases(),
      ]);
    } finally { setLoading(false); }
  };

  const fetchAnalytics = async () => {
    try { const r = await axios.get(`${API}/admin/analytics`); setAnalytics(r.data); } catch {}
  };
  const fetchCompanyAnalytics = async () => {
    try { const r = await axios.get(`${API}/admin/company-analytics`); setCompanyAnalytics(r.data.companies || []); } catch {}
  };
  const fetchEmployees = async () => {
    try { const r = await axios.get(`${API}/admin/employees`); setEmployees(r.data.employees || []); } catch {}
  };
  const fetchRevenue = async () => {
    try { const r = await axios.get(`${API}/admin/revenue`); setRevenue(r.data.companies || []); } catch {}
  };
  const fetchCases = async () => {
    try { const r = await axios.get(`${API}/admin/cases`); setCases(r.data.cases || []); } catch {}
  };

  const exportExcel = async () => {
    try {
      const r = await axios.get(`${API}/admin/export`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data]));
      Object.assign(document.createElement("a"), { href: url, download: "cases.xlsx" }).click();
    } catch { alert("Export failed"); }
  };

  const logout = () => { localStorage.removeItem("adminToken"); navigate("/admin/login"); };

  // derived
  const filteredClients = useMemo(() =>
    companyAnalytics.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())),
    [companyAnalytics, clientSearch]
  );

  const revenueMap = useMemo(() => {
    const m = {};
    revenue.forEach(r => { m[r.companyId] = r; });
    return m;
  }, [revenue]);

  const selectedClientRevenue = selectedClient
    ? revenueMap[selectedClient.companyId]?.totalRevenue ?? 0
    : null;

  // chart data: real case statuses per month
  const monthlyData = useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    return months.map((m, i) => {
      const mo = i;
      const monthCases = cases.filter(c => {
        const d = new Date(c.createdAt || c.receivedDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === mo;
      });
      return {
        month: m,
        verified: monthCases.filter(c => c.status === "VERIFIED").length,
        pending: monthCases.filter(c => ["SUBMITTED","UNDER_REVIEW"].includes(c.status)).length,
        discrepancy: monthCases.filter(c => c.status === "DISCREPANCY").length,
      };
    });
  }, [cases]);

  // recent cases
  const recentCases = useMemo(() =>
    [...cases].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    [cases]
  );

  // top revenue clients
  const topRevenue = useMemo(() =>
    [...revenue].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5),
    [revenue]
  );

  const statusColor = { VERIFIED: C.green, SUBMITTED: C.sky, UNDER_REVIEW: C.amber, DISCREPANCY: C.red, INSUFFICIENT: C.slate };
  const statusBg    = { VERIFIED: "#dcfce7", SUBMITTED: "#e0f2fe", UNDER_REVIEW: "#fef9c3", DISCREPANCY: "#fee2e2", INSUFFICIENT: "#f1f5f9" };

  // nav items
  const navItems = [
    { label: "Dashboard", icon: "⊞", path: "/admin/dashboard" },
    { label: "Cases", icon: "📁", path: "/admin/cases" },
    { label: "Employees", icon: "👥", path: "/admin/employees" },
    { label: "Analytics", icon: "📊", path: "/admin/analytics" },
    { label: "Upload Excel", icon: "📤", path: "/admin/upload-excel" },
    { label: "Pricing & Billing", icon: "💰", path: "/admin/pricing-billing" },
    { label: "Client Agreements", icon: "📝", path: "/admin/agreements" },
    { label: "Generate Report", icon: "📄", path: "/generate-report" },
    { label: "Quality Check", icon: "✅", path: "/quality-check" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .nav-item { transition: all .15s; }
        .nav-item:hover { background: rgba(255,255,255,.12) !important; }
        .nav-item.active { background: rgba(255,255,255,.18) !important; }
        input:focus { outline: none; }
        button:focus { outline: none; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, background: C.navy, color: "#fff",
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "sticky", top: 0, height: "100vh", overflow: "auto",
      }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,#3b82f6,#1e40af)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 900,
            }}>T</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Tervies</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", letterSpacing: 1 }}>BGV PLATFORM</div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>MAIN</div>
          {navItems.slice(0, 4).map(n => (
            <div key={n.path} className="nav-item"
              onClick={() => navigate(n.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                marginBottom: 2, fontSize: 13, fontWeight: 600,
                background: window.location.pathname === n.path ? "rgba(255,255,255,.18)" : "transparent",
              }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
            </div>
          ))}

          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: 1.5, margin: "16px 0 8px", fontWeight: 700 }}>TOOLS</div>
          {navItems.slice(4).map(n => (
            <div key={n.path} className="nav-item"
              onClick={() => navigate(n.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                marginBottom: 2, fontSize: 13, fontWeight: 600,
              }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg,#3b82f6,#7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13,
            }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Admin</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>Administrator</div>
            </div>
          </div>
          <button onClick={logout} style={{
            marginTop: 12, width: "100%", background: "rgba(220,38,38,.15)",
            color: "#fca5a5", border: "1px solid rgba(220,38,38,.3)",
            borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Log Out</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {/* header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 28px", background: "#fff",
          borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: C.navy }}>Admin Dashboard</div>
            <div style={{ fontSize: 12, color: C.slate }}>Welcome back — here's your overview</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={fetchAll} style={{
              background: "#f1f5f9", border: "none", borderRadius: 8,
              padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: C.navy,
            }}>🔄 Refresh</button>
            <button onClick={() => setAutoRefresh(v => !v)} style={{
              background: autoRefresh ? C.amber + "18" : "#f1f5f9",
              border: `1px solid ${autoRefresh ? C.amber : "transparent"}`,
              color: autoRefresh ? C.amber : C.slate,
              borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{autoRefresh ? "⏸ Auto" : "▶️ Auto"}</button>
            <button onClick={exportExcel} style={{
              background: C.green, color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>⬇ Export</button>
          </div>
        </div>

        <div style={{ padding: "24px 28px", maxWidth: 1300, margin: "0 auto" }}>

          {/* ── TOP STATS ── */}
          {analytics && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
              <MiniStat label="Total Cases" value={analytics.total} icon="📁" color={C.blue} />
              <MiniStat label="Verified" value={analytics.verified} icon="✅" color={C.green} sub={analytics.total ? `${Math.round(analytics.verified / analytics.total * 100)}% rate` : null} />
              <MiniStat label="Under Review" value={analytics.underReview ?? 0} icon="🔍" color={C.amber} />
              <MiniStat label="Discrepancy" value={analytics.discrepancy} icon="⚠️" color={C.red} />
              <MiniStat label="Employees" value={employees.length} icon="👥" color={C.indigo} sub={`${employees.filter(e => e.active !== false).length} active`} />
            </div>
          )}

          {/* ── TWO-COL ROW 1 ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>

            {/* chart */}
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <SectionHead
                title="Case Activity"
                sub="Monthly verification status breakdown"
                action={
                  <div style={{ display: "flex", gap: 6 }}>
                    {["bar","area"].map(t => (
                      <button key={t} onClick={() => setChartTab(t)} style={{
                        background: chartTab === t ? C.blue : "#f1f5f9",
                        color: chartTab === t ? "#fff" : C.slate,
                        border: "none", borderRadius: 7, padding: "5px 12px",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}>{t === "bar" ? "Bar" : "Area"}</button>
                    ))}
                  </div>
                }
              />
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  {chartTab === "bar" ? (
                    <BarChart data={monthlyData} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="verified" fill={C.green} radius={[4,4,0,0]} />
                      <Bar dataKey="pending" fill={C.sky} radius={[4,4,0,0]} />
                      <Bar dataKey="discrepancy" fill={C.red} radius={[4,4,0,0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.2}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
                        <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.sky} stopOpacity={0.2}/><stop offset="95%" stopColor={C.sky} stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="verified" stroke={C.green} fill="url(#gv)" strokeWidth={2} />
                      <Area type="monotone" dataKey="pending" stroke={C.sky} fill="url(#gp)" strokeWidth={2} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* recent cases */}
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <SectionHead title="Recent Cases" sub="Latest 5 submissions"
                action={
                  <button onClick={() => navigate("/admin/cases")} style={{
                    background: C.blue + "12", color: C.blue, border: "none",
                    borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>View All →</button>
                }
              />
              <div>
                {recentCases.length === 0 && <div style={{ color: C.slate, fontSize: 13 }}>No cases yet.</div>}
                {recentCases.map(c => (
                  <div key={c.caseId} onClick={() => navigate(`/admin/cases`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f8fafc", cursor: "pointer" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{c.name || "—"}</div>
                      <div style={{ fontSize: 11, color: C.slate }}>{c.caseId} · {c.clientName || "—"}</div>
                    </div>
                    <span style={{
                      background: statusBg[c.status] || "#f1f5f9",
                      color: statusColor[c.status] || C.slate,
                      fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20,
                    }}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CLIENT SELECTOR ── */}
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <SectionHead
              title="Client Lookup"
              sub="Search and select a client to view their detailed stats"
              action={
                <button onClick={() => navigate("/admin/pricing-billing")} style={{
                  background: C.indigo + "12", color: C.indigo, border: "none",
                  borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>Manage Clients →</button>
              }
            />

            {/* search + dropdown */}
            <div style={{ position: "relative", maxWidth: 480 }} ref={dropRef}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                border: `2px solid ${clientDropOpen ? C.blue : "#e2e8f0"}`,
                borderRadius: 12, padding: "10px 14px", background: "#f8fafc",
                transition: "border-color .2s",
              }}>
                <span style={{ fontSize: 16 }}>🔍</span>
                <input
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientDropOpen(true); }}
                  onFocus={() => setClientDropOpen(true)}
                  placeholder="Search client by name…"
                  style={{
                    border: "none", background: "transparent", flex: 1,
                    fontSize: 14, fontWeight: 600, color: C.navy,
                  }}
                />
                {clientSearch && (
                  <span onClick={() => { setClientSearch(""); setSelectedClient(null); setClientDropOpen(false); }}
                    style={{ cursor: "pointer", color: C.slate, fontSize: 14 }}>✕</span>
                )}
                <span style={{ color: C.slate, fontSize: 12 }}>▼</span>
              </div>

              {clientDropOpen && filteredClients.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: "#fff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e8f0", zIndex: 100, maxHeight: 240, overflowY: "auto",
                }}>
                  {filteredClients.map(c => (
                    <div key={c.companyId}
                      onClick={() => { setSelectedClient(c); setClientSearch(c.name); setClientDropOpen(false); }}
                      style={{
                        padding: "12px 16px", cursor: "pointer", display: "flex",
                        justifyContent: "space-between", alignItems: "center",
                        borderBottom: "1px solid #f8fafc",
                        background: selectedClient?.companyId === c.companyId ? C.blue + "08" : "transparent",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = selectedClient?.companyId === c.companyId ? C.blue + "08" : "transparent"}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.slate }}>{c.total} case{c.total !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ background: "#dcfce7", color: C.green, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 20 }}>✓ {c.verified}</span>
                        {c.discrepancy > 0 && <span style={{ background: "#fee2e2", color: C.red, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 20 }}>⚠ {c.discrepancy}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {clientDropOpen && filteredClients.length === 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: "#fff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e8f0", padding: 16, zIndex: 100,
                  fontSize: 13, color: C.slate, textAlign: "center",
                }}>No clients found</div>
              )}
            </div>

            {/* selected client detail */}
            {selectedClient && (
              <ClientCard
                company={{ ...selectedClient, ...(companyAnalytics.find(c => c.companyId === selectedClient.companyId) || {}) }}
                onClose={() => { setSelectedClient(null); setClientSearch(""); }}
              />
            )}
            {selectedClient && selectedClientRevenue !== null && (
              <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                <div style={{
                  background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 20px", flex: 1,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>TOTAL REVENUE</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>₹{selectedClientRevenue.toLocaleString("en-IN")}</div>
                </div>
                <button onClick={() => navigate("/admin/pricing-billing")} style={{
                  background: C.indigo, color: "#fff", border: "none", borderRadius: 12,
                  padding: "0 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>View Billing →</button>
                <button onClick={() => navigate("/admin/agreements")} style={{
                  background: C.navy, color: "#fff", border: "none", borderRadius: 12,
                  padding: "0 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>Agreement →</button>
              </div>
            )}

            {!selectedClient && (
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 12, color: C.slate, fontWeight: 600, alignSelf: "center" }}>All clients:</div>
                {companyAnalytics.slice(0, 8).map(c => (
                  <button key={c.companyId}
                    onClick={() => { setSelectedClient(c); setClientSearch(c.name); }}
                    style={{
                      background: "#f1f5f9", border: "none", borderRadius: 20,
                      padding: "5px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", color: C.navy,
                    }}>{c.name}</button>
                ))}
              </div>
            )}
          </div>

          {/* ── TWO-COL ROW 2: Employees + Revenue ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

            {/* employees */}
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <SectionHead
                title="Employees"
                sub={`${employees.length} total · ${employees.filter(e => e.active !== false).length} active`}
                action={
                  <button onClick={() => navigate("/admin/employees")} style={{
                    background: C.indigo + "12", color: C.indigo, border: "none",
                    borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>Manage →</button>
                }
              />
              <div>
                {employees.length === 0 && <div style={{ color: C.slate, fontSize: 13 }}>No employees yet. <span style={{ color: C.blue, cursor: "pointer", fontWeight: 700 }} onClick={() => navigate("/admin/employees")}>Add one →</span></div>}
                {employees.slice(0, 6).map((e, i) => <EmployeeRow key={e.employeeId} emp={e} index={i} />)}
                {employees.length > 6 && (
                  <button onClick={() => navigate("/admin/employees")} style={{
                    marginTop: 12, background: "#f1f5f9", border: "none", borderRadius: 8,
                    padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: C.slate, width: "100%",
                  }}>View all {employees.length} employees →</button>
                )}
              </div>
            </div>

            {/* top revenue */}
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <SectionHead
                title="Top Revenue Clients"
                sub="Sorted by total billing"
                action={
                  <button onClick={() => navigate("/admin/pricing-billing")} style={{
                    background: C.green + "12", color: C.green, border: "none",
                    borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>Full Report →</button>
                }
              />
              {topRevenue.length === 0 && <div style={{ color: C.slate, fontSize: 13 }}>No billing data yet.</div>}
              {topRevenue.map((r, i) => {
                const max = topRevenue[0]?.totalRevenue || 1;
                const pct = Math.round((r.totalRevenue / max) * 100);
                return (
                  <div key={r.companyId} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{r.companyName || r.companyId}</div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: C.green }}>₹{r.totalRevenue?.toLocaleString("en-IN") || 0}</div>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: pct + "%", background: `linear-gradient(90deg,${C.green},${C.sky})`, borderRadius: 3, transition: "width .5s" }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{r.totalCases} case{r.totalCases !== 1 ? "s" : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <SectionHead title="Quick Actions" sub="Jump to any section instantly" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
              <ActionTile icon="📁" label="Manage Cases" desc="View, assign and update all BGV cases" color={C.blue} onClick={() => navigate("/admin/cases")} badge={cases.filter(c => c.status === "SUBMITTED").length || null} />
              <ActionTile icon="👥" label="Employees" desc="Add employees and assign verification checks" color={C.indigo} onClick={() => navigate("/admin/employees")} />
              <ActionTile icon="💰" label="Pricing & Billing" desc="Set check prices per client and view revenue" color={C.green} onClick={() => navigate("/admin/pricing-billing")} />
              <ActionTile icon="📝" label="Agreements" desc="Generate and send client service agreements" color={C.amber} onClick={() => navigate("/admin/agreements")} />
              <ActionTile icon="✅" label="Quality Check" desc="Review QC reports and send to track status" color={C.sky} onClick={() => navigate("/quality-check")} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}