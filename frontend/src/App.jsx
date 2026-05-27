import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import logo from "./assets/logoo.png";

import VerificationForm from "./pages/VerificationForm";
import TrackStatus from "./pages/TrackStatus";

import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import CasesPage from "./pages/CasesPage";
import Analytics from "./pages/Analytics";
import CaseDetailsPage from "./pages/CaseDetailsPage";

import UploadExcel from "./pages/UploadExcel";
import PricingBilling from "./pages/PricingBilling";

import CompanyLogin from "./pages/CompanyLogin";
import CompanyDashboard from "./pages/CompanyDashboard";
import ClientAgreements from "./pages/ClientAgreements";
import AdminLayout from "./layouts/AdminLayout";
import ClientRevenueDetails from "./pages/ClientRevenueDetails";
import GenerateReport from "./pages/GenerateReport";
import QualityCheckPage from "./pages/QualityCheckPage";
import CRMCheckPage from "./pages/CRMCheckPage";

import EmployeeLogin     from "./pages/EmployeeLogin";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminEmployees    from "./pages/AdminEmployees";

import ClientPortal    from "./pages/ClientPortal";
import CandidatePortal from "./pages/CandidatePortal";
import AddressVerificationPortal from "./pages/AddressVerificationPortal";
import AddressVerificationCases from "./pages/AddressVerificationCases";



/* ============================= */
/* 🔐 PROTECTED ROUTES */
/* ============================= */

function ProtectedAdmin({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function ProtectedCompany({ children }) {
  const companyId = localStorage.getItem("companyId");

  if (!companyId) {
    return <Navigate to="/company/login" replace />;
  }

  return children;
}

/* ============================= */
/* QUALITY CHECK REDIRECT */
/* ============================= */

function QualityCheckRedirect() {
  const latestCaseId = localStorage.getItem("latestQualityCheckCaseId");

  if (latestCaseId) {
    return <Navigate to={`/quality-check/${encodeURIComponent(latestCaseId)}`} replace />;
  }

  return (
    <div className="flex items-center justify-center h-screen text-xl">
      No quality check case found. Please open a case first from Generate Report.
    </div>
  );
}

function ProtectedEmployee({ children }) {
  const token = localStorage.getItem("employeeToken");
  if (!token) return <Navigate to="/employee/login" replace />;
  return children;
}

/* ============================= */
/* 🌐 LAYOUT */
/* ============================= */

function Layout() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <>
      {path === "/admin/login" && (
        <nav
          className="bg-gradient-to-r from-indigo-500 via-indigo-800 to-indigo-900 
          h-24 px-14 flex items-center justify-between
          shadow-lg border-b border-white/10"
        >
          <div className="flex items-center">
            <img
              src={logo}
              alt="TrueVerify Logo"
              className="h-28 w-auto object-contain scale-110"
            />
          </div>

          <span className="text-indigo-200 text-sm font-semibold tracking-wide">
            Admin Access
          </span>
        </nav>
      )}

      {path === "/company/login" && (
        <nav
          className="bg-gradient-to-r from-indigo-500 via-indigo-800 to-indigo-900 
          h-24 px-14 flex items-center justify-between
          shadow-lg border-b border-white/10"
        >
          <div className="flex items-center">
            <img
              src={logo}
              alt="TrueVerify Logo"
              className="h-28 w-auto object-contain scale-110"
            />
          </div>

          <span className="text-indigo-200 text-sm font-semibold tracking-wide">
            Company Access
          </span>
        </nav>
      )}

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<VerificationForm />} />
        <Route path="/track" element={<TrackStatus />} />
        <Route path="/client"    element={<ClientPortal />} />
        <Route path="/candidate" element={<CandidatePortal />} />
            {/* ✅ NEW — Address Verification Portal (public, no auth needed) */}
        {/* Candidates access via link:  /address-verify?name=X&phone=Y&caseId=Z */}
        <Route path="/address-verify"        element={<AddressVerificationPortal />} />
        <Route path="/address-verify/:token" element={<AddressVerificationPortal />} />



        <Route
          path="/admin/agreements"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <ClientAgreements />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        {/* ADMIN ROUTES */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdmin>
              <AdminDashboard />
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/cases"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <CasesPage />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <Analytics />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/upload-excel"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <UploadExcel />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/pricing-billing"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <PricingBilling />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/case/:id"
          element={
            <ProtectedAdmin>
              <CaseDetailsPage />
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/generate-report"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <GenerateReport />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        {/* THIS FIXES YOUR SIDEBAR CLICK */}
        <Route
          path="/admin/Quality-Check"
          element={
            <ProtectedAdmin>
              <QualityCheckRedirect />
            </ProtectedAdmin>
          }
        />

        <Route
  path="/admin/address-verification"
  element={
    <ProtectedAdmin>
      <AdminLayout>
        <AddressVerificationCases />
      </AdminLayout>
    </ProtectedAdmin>
  }
/>



 <Route path="/employee/login" element={<EmployeeLogin />} />
 <Route
   path="/employee/dashboard"
   element={
     <ProtectedEmployee>
       <EmployeeDashboard />
     </ProtectedEmployee>
   }
 />
  
 {/* Admin — Employees page */}
 <Route
   path="/admin/employees"
   element={
     <ProtectedAdmin>
       <AdminLayout>
         <AdminEmployees />
       </AdminLayout>
     </ProtectedAdmin>
   }
 />
  


        <Route
          path="/crm-check/*"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <CRMCheckPage />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/CRM-Check"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <CRMCheckPage />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/quality-check/*"
  element={
    <ProtectedAdmin>
      <AdminLayout>
        <QualityCheckPage />
      </AdminLayout>
    </ProtectedAdmin>
  }
/>

        <Route
          path="/admin/revenue/:companyId"
          element={
            <ProtectedAdmin>
              <ClientRevenueDetails />
            </ProtectedAdmin>
          }
        />

        {/* COMPANY ROUTES */}
        <Route path="/company/login" element={<CompanyLogin />} />

        <Route
          path="/company/dashboard"
          element={
            <ProtectedCompany>
              <CompanyDashboard />
            </ProtectedCompany>
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center h-screen text-xl">
              Page Not Found
            </div>
          }
        />
      </Routes>
    </>
    
  );
}

/* ============================= */
/* 🚀 MAIN APP */
/* ============================= */

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}