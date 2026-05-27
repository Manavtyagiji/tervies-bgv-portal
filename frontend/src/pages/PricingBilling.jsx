import { useState, useEffect, useMemo } from "react";
import axios from "../utils/axios";

const API = "/api";


const BILLING_PASSWORD = "billing@123"; // ← Change this to your desired password
const CHECKS = [
  { key:"employment",     label:"Employment Check",         icon:"EMP", color:"blue",   checkLabel:"Employment Check"                },
  { key:"address",        label:"Address Verification",     icon:"ADR", color:"indigo", checkLabel:"Residential Address Check"       },
  { key:"education",      label:"Education Check",          icon:"EDU", color:"purple", checkLabel:"Educational Qualification Check" },
  { key:"identity",       label:"Identity Check (PAN)",     icon:"PAN", color:"teal",   checkLabel:"Identity Check (PAN Card)"       },
  { key:"identityAadhar", label:"Identity Check (Aadhar)",  icon:"ADH", color:"cyan",   checkLabel:"Identity Check (Aadhar)"         },
  { key:"criminal",       label:"Criminal Police Record",   icon:"POL", color:"red",    checkLabel:"Criminal Police Record Check"    },
  { key:"criminalDb",     label:"Criminal Database Check",  icon:"DB",  color:"orange", checkLabel:"Criminal Database Check"         },
  { key:"credit",         label:"Credit Check",             icon:"CRD", color:"pink",   checkLabel:"Credit Check"                   },
];

const EMPTY_PRICING = {
  employment:0, address:0, education:0,
  identity:0, identityAadhar:0,
  criminal:0, criminalDb:0, credit:0,
};

const COLOR_MAP = {
  blue:   { badge:"bg-blue-100 text-blue-700",     ring:"focus:ring-blue-200",   dot:"bg-blue-500"   },
  indigo: { badge:"bg-indigo-100 text-indigo-700", ring:"focus:ring-indigo-200", dot:"bg-indigo-500" },
  purple: { badge:"bg-purple-100 text-purple-700", ring:"focus:ring-purple-200", dot:"bg-purple-500" },
  teal:   { badge:"bg-teal-100 text-teal-700",     ring:"focus:ring-teal-200",   dot:"bg-teal-500"   },
  cyan:   { badge:"bg-cyan-100 text-cyan-700",     ring:"focus:ring-cyan-200",   dot:"bg-cyan-500"   },
  red:    { badge:"bg-red-100 text-red-700",       ring:"focus:ring-red-200",    dot:"bg-red-500"    },
  orange: { badge:"bg-orange-100 text-orange-700", ring:"focus:ring-orange-200", dot:"bg-orange-500" },
  pink:   { badge:"bg-pink-100 text-pink-700",     ring:"focus:ring-pink-200",   dot:"bg-pink-500"   },
};

const normP = (p = {}) => ({
  employment:     Number(p.employment     || 0),
  address:        Number(p.address        || 0),
  education:      Number(p.education      || 0),
  identity:       Number(p.identity       || 0),
  identityAadhar: Number(p.identityAadhar || 0),
  criminal:       Number(p.criminal       || 0),
  criminalDb:     Number(p.criminalDb     || 0),
  credit:         Number(p.credit         || 0),
});

function normalizeChecksArr(checks) {
  if (!checks) return [];
  if (Array.isArray(checks)) return checks
    .map(v => typeof v === "string" ? v : String(v?.key || v?.label || v || ""))
    .filter(Boolean);
  if (typeof checks === "string") return checks.split(",").map(s => s.trim()).filter(Boolean);
  if (typeof checks === "object") return Object.values(checks).map(String).filter(Boolean);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD GATE
// ─────────────────────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [input,    setInput]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const [shaking,  setShaking]  = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleUnlock = () => {
    if (input === BILLING_PASSWORD) {
      onUnlock();
    } else {
      setShaking(true);
      setAttempts(a => a + 1);
      setInput("");
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        .gate-shake { animation: shake 0.4s ease; }
      `}</style>

      <div className={`bg-white rounded-3xl border border-slate-200 shadow-xl p-10 w-full max-w-sm text-center ${shaking ? "gate-shake" : ""}`}>

        {/* Lock icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1.5" fill="white"/>
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">Billing Access</h2>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          This section is restricted.<br />
          Enter the billing password to continue.
        </p>

        {/* Input */}
        <div className="relative mb-3">
          <input
            type={showPass ? "text" : "password"}
            placeholder="Enter billing password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            autoFocus
            className={`w-full border-2 rounded-xl px-4 py-3 pr-12 text-sm text-center tracking-widest focus:outline-none transition ${
              attempts > 0
                ? "border-red-300 focus:border-red-400 bg-red-50 placeholder-red-300"
                : "border-slate-200 focus:border-indigo-400 bg-slate-50"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          >
            {showPass ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>

        {/* Error */}
        {attempts > 0 && (
          <p className="text-xs text-red-500 font-semibold mb-4">
            ✗ Wrong password.{attempts > 2 ? " Contact your administrator." : " Please try again."}
          </p>
        )}

        <button
          onClick={handleUnlock}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl text-sm font-bold transition shadow-md"
        >
          🔓 Unlock Billing
        </button>

        <p className="text-xs text-slate-300 mt-6">Tervies BGV Platform · Pricing & Billing</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PricingBilling() {
  const token = localStorage.getItem("adminToken");

  // ── Password gate state ───────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [companies,       setCompanies]       = useState([]);
  const [cases,           setCases]           = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [newClientName,   setNewClientName]   = useState("");
  const [creatingClient,  setCreatingClient]  = useState(false);
  const [pricing,         setPricing]         = useState(EMPTY_PRICING);
  const [savingPricing,   setSavingPricing]   = useState(false);
  const [saveStatus,      setSaveStatus]      = useState(null);
  const [expandedCard,    setExpandedCard]    = useState(null);
  const [loading,         setLoading]         = useState(true);

  // ── Show gate if locked ───────────────────────────────────────────────────


  // ── selectedCompanyData starts here ──────────────────────────────────────


  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`${API}/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = (res.data?.companies || [])
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCompanies(list);
    } catch (err) {
      console.error("fetchCompanies failed:", err);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await axios.get(`${API}/admin/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetched = (res.data?.cases || []).map(c => ({
        ...c,
        checks: normalizeChecksArr(c.checks),
      }));
      setCases(fetched);
    } catch (err) {
      console.error("fetchCases failed:", err);
    }
  };
  // ── Define fetchAll ───────────────────────────────────────────────────────
  const fetchAll = async () => {
    await Promise.all([fetchCompanies(), fetchCases()]);
    setLoading(false);
  };

  // ── Auto-refresh (only when unlocked) ─────────────────────────────────────
  useEffect(() => {
    if (!unlocked) return;
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [unlocked]);

  // ── Gate — must be after all hooks ────────────────────────────────────────
 

  // ── selectedCompanyData starts here ──────────────────────────────────────
   

  const selectedCompanyData = useMemo(
    () => companies.find(c => c.companyId === selectedCompany) || null,
    [companies, selectedCompany]
  );

  const totalPerCase = useMemo(
    () => Object.values(pricing).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [pricing]
  );

  const handleCompanyChange = companyId => {
    setSelectedCompany(companyId);
    setSaveStatus(null);
    const company = companies.find(c => c.companyId === companyId);
    setPricing(company?.pricing ? normP(company.pricing) : EMPTY_PRICING);
  };

  const createClient = async () => {
    const cleanName = newClientName.trim();
    if (!cleanName) { alert("Please enter client name first"); return; }
    const exists = companies.find(c =>
      (c.name || "").trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      setSelectedCompany(exists.companyId);
      setPricing(normP(exists.pricing));
      setNewClientName("");
      alert("Client already exists and has been selected.");
      return;
    }
    try {
      setCreatingClient(true);
      const res = await axios.post(
        `${API}/admin/create-company`,
        { name: cleanName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const created = res.data?.company;
      if (created) {
        await fetchCompanies();
        setSelectedCompany(created.companyId);
        setPricing(EMPTY_PRICING);
        setNewClientName("");
        alert("Client created successfully");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Client create failed");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSavePricing = async () => {
    if (!selectedCompany) { alert("Please select client first"); return; }
    setSavingPricing(true);
    setSaveStatus(null);
    try {
      await axios.post(
        `${API}/admin/update-pricing`,
        { companyId: selectedCompany, pricing },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies(prev =>
        prev.map(c => c.companyId === selectedCompany ? { ...c, pricing } : c)
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Save pricing failed:", err);
      alert("Failed to save pricing. Please check your connection and try again.");
    } finally {
      setSavingPricing(false);
    }
  };

  const generateInvoice = () => {
    if (!selectedCompany) { alert("Please select client first"); return; }
    window.open(`${API}/admin/generate-invoice?companyId=${selectedCompany}&token=${token}`);
  };

  const enrichedRevenue = useMemo(() => {
    return companies.map(comp => {
      const companyCases = cases.filter(c => {
        const byId   = c.companyId && c.companyId === comp.companyId;
        const byName = c.clientName &&
          c.clientName.trim().toLowerCase() === (comp.name || "").trim().toLowerCase();
        return byId || byName;
      });

      const totalCases = companyCases.length;
      const p = normP(comp.pricing);

      const checkBreakdown = CHECKS.map(check => {
        const pricePerCase = p[check.key] || 0;
        const count = companyCases.filter(c => {
          const caseChecks = Array.isArray(c.checks) ? c.checks : [];
          return caseChecks.includes(check.checkLabel);
        }).length;
        if (pricePerCase === 0 && count === 0) return null;
        return { ...check, pricePerCase, count, amount: pricePerCase * count };
      }).filter(Boolean);

      const calculatedTotal = checkBreakdown.reduce((sum, cb) => sum + cb.amount, 0);
      return {
        companyId: comp.companyId, companyName: comp.name || "Unknown",
        totalCases, calculatedTotal, checkBreakdown,
        hasPricing: Object.values(p).some(v => v > 0),
      };
    });
  }, [companies, cases]);

  const grandTotal = useMemo(
    () => enrichedRevenue.reduce((sum, r) => sum + r.calculatedTotal, 0),
    [enrichedRevenue]
  );

// Gate check BEFORE loading check
  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading pricing data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header with lock button */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Pricing & Billing</h1>
            <p className="text-slate-500 mt-1">Set per-check pricing for each client and generate invoices</p>
          </div>
          <button
            onClick={() => setUnlocked(false)}
            title="Lock this section"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-sm font-semibold transition shadow-sm flex-shrink-0 mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Lock
          </button>
        </div>

        {/* ── Create / Select client ── */}
        <div className="grid md:grid-cols-2 gap-5 mb-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">Create New Client</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter client name"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createClient()}
                className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                onClick={createClient}
                disabled={creatingClient}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow transition"
              >
                {creatingClient ? "Creating…" : "Create"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">
              Select Existing Client
              <span className="ml-2 text-xs font-normal text-slate-400">({companies.length} clients)</span>
            </p>
            <select
              value={selectedCompany}
              onChange={e => handleCompanyChange(e.target.value)}
              className="border border-slate-300 px-4 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Select company</option>
              {companies.map(c =>
                <option key={c.companyId} value={c.companyId}>{c.name}</option>
              )}
            </select>
            {selectedCompanyData && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                <p className="text-sm font-medium text-emerald-700">
                  ✓ Selected: {selectedCompanyData.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Pricing section ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-7">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Per-Check Pricing</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedCompanyData
                  ? `Setting prices for: ${selectedCompanyData.name}`
                  : "Select a client above to configure prices"}
              </p>
            </div>
            {totalPerCase > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
                <p className="text-xs text-indigo-500 mb-0.5">Total per case (all checks)</p>
                <p className="text-xl font-bold text-indigo-700">₹ {totalPerCase.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {CHECKS.map(check => {
              const colors = COLOR_MAP[check.color];
              return (
                <div key={check.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${colors.badge}`}>
                      {check.icon}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{check.label}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={pricing[check.key]}
                      onChange={e => setPricing({ ...pricing, [check.key]: Number(e.target.value) })}
                      disabled={!selectedCompany}
                      className={`w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${colors.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                      placeholder="0"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={handleSavePricing}
              disabled={savingPricing || !selectedCompany}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow transition"
            >
              {savingPricing ? "Saving…" : "Save Pricing"}
            </button>
            <button
              onClick={generateInvoice}
              disabled={!selectedCompany}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow transition"
            >
              Generate Invoice
            </button>
            {saveStatus === "saved" && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="text-sm font-semibold text-emerald-700">
                  Pricing saved! All laptops will see this within 30 seconds.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Revenue section ── */}
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Client Revenue</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculated from checks assigned per case × price per check
            </p>
          </div>
          {grandTotal > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-2 flex items-center gap-3">
              <span className="text-sm text-emerald-600 font-medium">Grand Total</span>
              <span className="text-2xl font-bold text-emerald-700">₹ {grandTotal.toLocaleString()}</span>
            </div>
          )}
        </div>

        {enrichedRevenue.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
            No clients yet. Create a client above to get started.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {enrichedRevenue.map(c => {
              const isExpanded = expandedCard === c.companyId;
              const initials   = (c.companyName || "?").slice(0, 2).toUpperCase();
              return (
                <div key={c.companyId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedCard(isExpanded ? null : c.companyId)}
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-800 truncate">{c.companyName}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.totalCases} case{c.totalCases !== 1 ? "s" : ""}
                        {c.hasPricing
                          ? ` · ${c.checkBreakdown.length} check type${c.checkBreakdown.length !== 1 ? "s" : ""} priced`
                          : " · No pricing set yet"}
                      </p>
                    </div>
                    {!isExpanded && c.checkBreakdown.length > 0 && (
                      <div className="hidden sm:flex gap-1.5 flex-wrap max-w-xs">
                        {c.checkBreakdown.slice(0, 3).map(cb => {
                          const colors = COLOR_MAP[cb.color];
                          return (
                            <span key={cb.key} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.badge}`}>
                              {cb.icon} ₹{cb.pricePerCase.toLocaleString()} ×{cb.count}
                            </span>
                          );
                        })}
                        {c.checkBreakdown.length > 3 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            +{c.checkBreakdown.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 mb-0.5">Total Revenue</p>
                        <p className="text-xl font-bold text-emerald-600">₹ {c.calculatedTotal.toLocaleString()}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                      {!c.hasPricing ? (
                        <div className="text-center py-6 text-slate-400 text-sm">
                          No pricing configured yet for <strong>{c.companyName}</strong>.<br />
                          <button
                            onClick={() => {
                              handleCompanyChange(c.companyId);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
                          >
                            Set Pricing for {c.companyName}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Check Type</th>
                                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price / Case</th>
                                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cases with Check</th>
                                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.checkBreakdown.map((cb, idx) => {
                                  const colors = COLOR_MAP[cb.color];
                                  return (
                                    <tr key={cb.key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colors.badge}`}>{cb.icon}</span>
                                          <span className="font-medium text-slate-700">{cb.label}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-right font-semibold text-slate-600">₹ {cb.pricePerCase.toLocaleString()}</td>
                                      <td className="px-4 py-3 text-right text-slate-500">× {cb.count}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-800">₹ {cb.amount.toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-emerald-700">Total</td>
                                  <td className="px-4 py-3 text-right text-lg font-bold text-emerald-700">₹ {c.calculatedTotal.toLocaleString()}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                handleCompanyChange(c.companyId);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
                            >
                              Edit Pricing
                            </button>
                            <button
                              onClick={() => window.open(`${API}/admin/generate-invoice?companyId=${c.companyId}&token=${token}`)}
                              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                            >
                              Generate Invoice
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}