import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .el-root {
    min-height: 100vh;
    background: #0f1117;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .el-bg-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  .el-bg-glow {
    position: absolute;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .el-card {
    position: relative;
    background: #16181f;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 44px 40px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.5);
  }
  .el-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(99,102,241,0.12);
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 999px;
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #818cf8;
    margin-bottom: 24px;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.05em;
  }
  .el-badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #818cf8;
    animation: el-pulse 2s ease-in-out infinite;
  }
  @keyframes el-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }
  .el-title {
    font-size: 28px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0 0 6px;
    line-height: 1.2;
  }
  .el-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.35);
    margin: 0 0 32px;
  }
  .el-field {
    margin-bottom: 18px;
  }
  .el-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    font-family: 'DM Mono', monospace;
  }
  .el-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 13px 16px;
    font-size: 15px;
    color: #f1f5f9;
    outline: none;
    transition: all 0.18s;
    font-family: 'DM Sans', sans-serif;
    box-sizing: border-box;
  }
  .el-input:focus {
    border-color: rgba(99,102,241,0.5);
    background: rgba(99,102,241,0.05);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }
  .el-input::placeholder { color: rgba(255,255,255,0.2); }
  .el-error {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fca5a5;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 18px;
  }
  .el-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 8px 24px rgba(99,102,241,0.3);
    margin-top: 8px;
  }
  .el-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(99,102,241,0.4);
  }
  .el-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .el-footer {
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .el-footer-icon {
    width: 32px; height: 32px;
    background: rgba(99,102,241,0.1);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }
  .el-footer-text {
    font-size: 12px;
    color: rgba(255,255,255,0.25);
    line-height: 1.5;
  }
`;

if (typeof document !== "undefined" && !document.getElementById("el-style")) {
  const s = document.createElement("style");
  s.id = "el-style";
  s.textContent = STYLE;
  document.head.appendChild(s);
}

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("https://tervies.info/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Invalid credentials"); return; }
      localStorage.setItem("employeeToken", data.token);
      localStorage.setItem("employeeId", data.employeeId);
      localStorage.setItem("employeeName", data.name);
      localStorage.setItem("employeeChecks", JSON.stringify(data.assignedChecks));
      navigate("/employee/dashboard");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="el-root">
      <div className="el-bg-grid" />
      <div className="el-bg-glow" />
      <div className="el-card">
        <div className="el-badge">
          <div className="el-badge-dot" />
          EMPLOYEE PORTAL
        </div>
        <h1 className="el-title">Welcome back</h1>
        <p className="el-sub">Sign in to access your assigned verification cases</p>

        {error && <div className="el-error">⚠ {error}</div>}

        <form onSubmit={handleLogin}>
          <div className="el-field">
            <label className="el-label">Email Address</label>
            <input className="el-input" type="email" placeholder="you@company.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="el-field">
            <label className="el-label">Password</label>
            <input className="el-input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="el-btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div className="el-footer">
          <div className="el-footer-icon">🔒</div>
          <div className="el-footer-text">
            Your access is restricted to checks assigned by your admin.<br />
            Contact admin if you need help.
          </div>
        </div>
      </div>
    </div>
  );
}