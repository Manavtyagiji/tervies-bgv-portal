import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const STYLE = `
  :root {
    --admin-sidebar-width: 240px;
  }

  body.admin-sidebar-collapsed {
    --admin-sidebar-width: 72px;
  }

  .sidebar-root {
    position: fixed;
    top: 0; left: 0;
    width: var(--admin-sidebar-width, 240px);
    height: 100vh;
    background: linear-gradient(180deg, #1e1b4b 0%, #1e3a8a 60%, #1d4ed8 100%);
    display: flex;
    flex-direction: column;
    z-index: 100;
    box-shadow: 4px 0 24px rgba(0,0,0,0.18);
    overflow: hidden;
    transition: width 0.3s ease-in-out;
  }

  .sidebar-toggle-btn {
    position: fixed;
    top: 88px;
    left: calc(var(--admin-sidebar-width, 240px) - 16px);
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.45);
    background: #ffffff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 120;
    cursor: pointer;
    font-size: 15px;
    font-weight: 900;
    box-shadow: 0 6px 18px rgba(15,23,42,0.2);
    transition: left 0.3s ease-in-out, transform 0.2s ease;
  }

  .sidebar-toggle-btn:hover {
    transform: scale(1.06);
  }

  /* ── Logo area ── */
  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 28px 22px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
    min-height: 93px;
  }

  .sidebar-logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    box-shadow: 0 4px 12px rgba(59,130,246,0.4);
    flex-shrink: 0;
    overflow: hidden;
    cursor: pointer;
    border: 0;
    padding: 0;
  }

  .sidebar-logo-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .sidebar-logo-copy {
    min-width: 0;
    opacity: 1;
    transition: opacity 0.2s ease;
  }

  .sidebar-logo-text {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 0.5px;
    font-family: Inter, system-ui, sans-serif;
    white-space: nowrap;
  }

  .sidebar-logo-sub {
    font-size: 10px;
    color: rgba(255,255,255,0.45);
    font-weight: 500;
    letter-spacing: 0.5px;
    margin-top: 1px;
    font-family: Inter, system-ui, sans-serif;
    white-space: nowrap;
  }

  .sidebar-logo-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .sidebar-logo-action-btn {
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.88);
    border-radius: 9px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    font-family: Inter, system-ui, sans-serif;
    transition: all 0.16s ease;
  }

  .sidebar-logo-action-btn:hover {
    background: rgba(255,255,255,0.16);
    color: #fff;
  }

  .sidebar-logo-action-btn.remove {
    color: #fca5a5;
  }

  /* ── Nav ── */
  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sidebar-nav::-webkit-scrollbar { width: 0; }

  .sidebar-section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
    padding: 10px 10px 4px;
    font-family: Inter, system-ui, sans-serif;
    white-space: nowrap;
    transition: opacity 0.2s ease;
  }

  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 12px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255,255,255,0.65);
    transition: all 0.18s ease;
    position: relative;
    font-family: Inter, system-ui, sans-serif;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    white-space: nowrap;
  }
  .sidebar-link:hover {
    background: rgba(255,255,255,0.08);
    color: #ffffff;
    transform: translateX(2px);
  }
  .sidebar-link.active {
    background: rgba(255,255,255,0.14);
    color: #ffffff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }
  .sidebar-link.active::before {
    content: "";
    position: absolute;
    left: 0; top: 20%; bottom: 20%;
    width: 3px;
    background: #60a5fa;
    border-radius: 0 3px 3px 0;
  }
  .sidebar-link-icon {
    font-size: 17px;
    width: 22px;
    text-align: center;
    flex-shrink: 0;
    opacity: 0.85;
  }
  .sidebar-link.active .sidebar-link-icon { opacity: 1; }
  .sidebar-link-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.2s ease, width 0.2s ease;
  }

  .sidebar-link-badge {
    background: #3b82f6;
    color: white;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  /* ── Divider ── */
  .sidebar-divider {
    height: 1px;
    background: rgba(255,255,255,0.07);
    margin: 8px 12px;
  }

  /* ── Footer ── */
  .sidebar-footer {
    padding: 16px 12px 20px;
    border-top: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .sidebar-logout {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 12px;
    border-radius: 12px;
    color: rgba(255,255,255,0.55);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: Inter, system-ui, sans-serif;
    white-space: nowrap;
  }
  .sidebar-logout:hover {
    background: rgba(239,68,68,0.15);
    color: #fca5a5;
  }
  .sidebar-admin-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255,255,255,0.06);
    border-radius: 12px;
    margin-bottom: 10px;
    min-height: 50px;
  }
  .sidebar-admin-avatar {
    width: 30px; height: 30px;
    background: linear-gradient(135deg, #818cf8, #6366f1);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: white;
    flex-shrink: 0;
    font-family: Inter, system-ui, sans-serif;
  }
  .sidebar-admin-copy {
    min-width: 0;
    transition: opacity 0.2s ease;
  }
  .sidebar-admin-name {
    font-size: 13px; font-weight: 700; color: white;
    font-family: Inter, system-ui, sans-serif;
    white-space: nowrap;
  }
  .sidebar-admin-role {
    font-size: 10px; color: rgba(255,255,255,0.4);
    font-family: Inter, system-ui, sans-serif;
    white-space: nowrap;
  }

  /* ── Collapsed mode ── */
  body.admin-sidebar-collapsed .sidebar-root {
    width: 72px;
  }

  body.admin-sidebar-collapsed .sidebar-logo {
    padding-left: 18px;
    padding-right: 18px;
    justify-content: center;
  }

  body.admin-sidebar-collapsed .sidebar-logo-copy,
  body.admin-sidebar-collapsed .sidebar-section-label,
  body.admin-sidebar-collapsed .sidebar-link-label,
  body.admin-sidebar-collapsed .sidebar-admin-copy,
  body.admin-sidebar-collapsed .sidebar-logout span:last-child {
    opacity: 0;
    width: 0;
    max-width: 0;
    overflow: hidden;
    pointer-events: none;
  }

  body.admin-sidebar-collapsed .sidebar-logo-actions {
    display: none;
  }

  body.admin-sidebar-collapsed .sidebar-nav {
    padding-left: 10px;
    padding-right: 10px;
  }

  body.admin-sidebar-collapsed .sidebar-link {
    justify-content: center;
    gap: 0;
    padding-left: 0;
    padding-right: 0;
  }

  body.admin-sidebar-collapsed .sidebar-link:hover {
    transform: none;
  }

  body.admin-sidebar-collapsed .sidebar-divider {
    margin-left: 8px;
    margin-right: 8px;
  }

  body.admin-sidebar-collapsed .sidebar-admin-pill {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }

  body.admin-sidebar-collapsed .sidebar-logout {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }
`;

if (typeof document !== "undefined" && !document.getElementById("sidebar-style")) {
  const style = document.createElement("style");
  style.id = "sidebar-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}

const MENU = [
  {
    section: "Main",
    items: [
      { name: "Dashboard",        path: "/admin/dashboard",      icon: "📊" },
      { name: "Cases",            path: "/admin/cases",          icon: "📁" },
      { name: "Analytics",        path: "/admin/analytics",      icon: "📈" },
      { name: "Employees",        path: "/admin/employees",      icon: "👥" }, 
    ],
  },
  {
    section: "Tools",
    items: [
      { name: "Upload Excel",          path: "/admin/upload-excel",          icon: "📤" },
      { name: "Generate Report",       path: "/admin/generate-report",       icon: "📄" },
      { name: "Quality Check",         path: "/quality-check",               icon: "✅" },
      { name: "CRM Check",             path: "/crm-check",                   icon: "📞" },
      { name: "Address Verification",  path: "/admin/address-verification",  icon: "🏠" },
    ],
  },
  {
    section: "Finance",
    items: [
      { name: "Pricing & Billing", path: "/admin/pricing-billing", icon: "💰" },
      { name: "Client Agreements", path: "/admin/agreements",      icon: "🤝" },
    ],
  },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logoInputRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("adminSidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  const [adminLogo, setAdminLogo] = useState(() => {
    try {
      return localStorage.getItem("adminSidebarLogo") || "";
    } catch {
      return "";
    }
  });

  const [showLogoActions, setShowLogoActions] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("admin-sidebar-collapsed", collapsed);
    try {
      localStorage.setItem("adminSidebarCollapsed", collapsed ? "true" : "false");
    } catch {}

    return () => {
      document.body.classList.remove("admin-sidebar-collapsed");
    };
  }, [collapsed]);

  const isActive = (path) => {
    if (path === "/quality-check") return location.pathname.startsWith("/quality-check");
    if (path === "/crm-check") return location.pathname.startsWith("/crm-check");
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file for logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAdminLogo(dataUrl);
      try {
        localStorage.setItem("adminSidebarLogo", dataUrl);
      } catch {
        alert("Logo image is too large. Please choose a smaller image.");
      }
      setShowLogoActions(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setAdminLogo("");
    setShowLogoActions(false);
    try {
      localStorage.removeItem("adminSidebarLogo");
    } catch {}
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    navigate("/admin/login");
  };

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={() => setCollapsed(prev => !prev)}
        title={collapsed ? "Show sidebar" : "Hide sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </button>

      <div className="sidebar-root">
        {/* Logo */}
        <div className="sidebar-logo">
          <button
            type="button"
            className="sidebar-logo-icon"
            onClick={() => setShowLogoActions(prev => !prev)}
            title="Click logo to change/remove"
          >
            {adminLogo ? <img src={adminLogo} alt="Tervies Logo" /> : "✦"}
          </button>
          <div className="sidebar-logo-copy">
            <div className="sidebar-logo-text">Tervies</div>
            <div className="sidebar-logo-sub">BGV Platform</div>
            {showLogoActions && !collapsed && (
              <div className="sidebar-logo-actions">
                <button
                  type="button"
                  className="sidebar-logo-action-btn"
                  onClick={() => logoInputRef.current?.click()}
                >
                  Change Logo
                </button>
                <button
                  type="button"
                  className="sidebar-logo-action-btn remove"
                  onClick={handleRemoveLogo}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleLogoChange}
          />
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {MENU.map((section, si) => (
            <div key={si}>
              {si > 0 && <div className="sidebar-divider" />}
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  className={`sidebar-link${isActive(item.path) ? " active" : ""}`}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-label">{item.name}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-admin-pill">
            <div className="sidebar-admin-avatar">A</div>
            <div className="sidebar-admin-copy">
              <div className="sidebar-admin-name">Admin</div>
              <div className="sidebar-admin-role">Administrator</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Log Out">
            <span style={{ fontSize: 17 }}>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
