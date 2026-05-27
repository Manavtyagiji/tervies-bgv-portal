/******************************************************************
   TRUEVERIFY – COMPLETE ENTERPRISE BGV SYSTEM
   Fully Cloud-Based (100% S3)
******************************************************************/
 
require("dotenv").config();
const express     = require("express");
const cors        = require("cors");
const multer      = require("multer");
const fs          = require("fs");
const path        = require("path");
const nodemailer  = require("nodemailer");
const Tesseract   = require("tesseract.js");
const crypto      = require("crypto");
const PDFDocument = require("pdfkit");
const ExcelJS     = require("exceljs");
const archiver    = require("archiver");
const { upload: s3Upload, uploadToS3 } = require("./middleware/uploadS3");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const https = require("https"); 
 
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
 
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://tervies.info",
    "https://www.tervies.info"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization","companyid"],
  credentials: true
}));

 
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
/* =========================================================
   S3 CLIENT
========================================================= */
 
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
 
/* =========================================================
   MAILER
========================================================= */
 
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
 
/* =========================================================
   FILE STORAGE — crash-proof JSON helpers
   ✅ FIX: safeReadJSON never crashes even on corrupt/missing files
   ✅ FIX: safeWriteJSON uses atomic tmp→rename to prevent corruption
========================================================= */
 
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
 
const CASES_FILE      = path.join(DATA_DIR, "cases.json");
const COMPANIES_FILE  = path.join(DATA_DIR, "companies.json");
const ACTIVITY_FILE   = path.join(DATA_DIR, "activity.json");
const AGREEMENTS_FILE = path.join(DATA_DIR, "agreements.json");
const TOKENS_FILE     = path.join(DATA_DIR, "tokens.json");
const CRM_FILE        = path.join(DATA_DIR, "crmReports.json");
const CANDIDATES_FILE  = path.join(__dirname, "data", "candidates.json");
const CLIENTS_FILE     = path.join(__dirname, "data", "clients.json");
const CANDIDATE_PROFILES_FILE = path.join(__dirname, "data", "candidateProfiles.json");
const CLIENT_ACCOUNTS_FILE    = path.join(__dirname, "data", "clientAccounts.json");
 
function safeReadJSON(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[safeReadJSON] Corrupt file ${filePath}, resetting. Error:`, err.message);
    try { fs.copyFileSync(filePath, filePath + ".corrupt." + Date.now()); } catch {}
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}
 
function safeWriteJSON(filePath, data) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}
 
// Initialize all files on startup
[CASES_FILE, COMPANIES_FILE, ACTIVITY_FILE, AGREEMENTS_FILE, TOKENS_FILE, CRM_FILE, CANDIDATE_PROFILES_FILE,CLIENT_ACCOUNTS_FILE]
  .forEach(f => safeReadJSON(f, []));
 
const readCases       = () => safeReadJSON(CASES_FILE,      []);
const writeCases      = (d) => safeWriteJSON(CASES_FILE,      d);
const readCompanies   = () => safeReadJSON(COMPANIES_FILE,  []);
const writeCompanies  = (d) => safeWriteJSON(COMPANIES_FILE,  d);
const readActivity    = () => safeReadJSON(ACTIVITY_FILE,   []);
const writeActivity   = (d) => safeWriteJSON(ACTIVITY_FILE,   d);
const readAgreements  = () => safeReadJSON(AGREEMENTS_FILE, []);
const writeAgreements = (d) => safeWriteJSON(AGREEMENTS_FILE, d);
const readTokens      = () => safeReadJSON(TOKENS_FILE,     []);
const writeTokens     = (d) => safeWriteJSON(TOKENS_FILE,     d);
const readCRMReports  = () => safeReadJSON(CRM_FILE,        []);
const writeCRMReports = (d) => safeWriteJSON(CRM_FILE,        d);
const readCandidates  = () => safeReadJSON(CANDIDATES_FILE, []);
const writeCandidates = (d) => safeWriteJSON(CANDIDATES_FILE, d);
const readClients     = () => safeReadJSON(CLIENTS_FILE, []);
const writeClients    = (d) => safeWriteJSON(CLIENTS_FILE, d);
const readCandidateProfiles  = () => safeReadJSON(CANDIDATE_PROFILES_FILE, []);
const writeCandidateProfiles = (d) => safeWriteJSON(CANDIDATE_PROFILES_FILE, d);
const readClientAccounts     = () => safeReadJSON(CLIENT_ACCOUNTS_FILE, []);
const writeClientAccounts    = (d) => safeWriteJSON(CLIENT_ACCOUNTS_FILE, d);
 

 
/* =========================================================
   ✅ HELPER FUNCTIONS — defined FIRST before any routes
   (your original code had these at the bottom which caused 500 errors)
========================================================= */
 
function normalizePricing(pricing = {}) {
  return {
    employment: Number(pricing.employment || 0),
    address:    Number(pricing.address    || 0),
    education:  Number(pricing.education  || 0),
    identity:   Number(pricing.identity   || 0),
    criminal:   Number(pricing.criminal   || 0),
    criminalDb: Number(pricing.criminalDb || 0),
    credit:     Number(pricing.credit     || 0),
    identityAadhar: Number(pricing.identityAadhar || 0),
  };
}
 
function calculateCaseCostFromDocuments(caseItem, company) {
  if (!company || !company.pricing) return 0;
  const pricing = normalizePricing(company.pricing);
  let totalCost = 0;
  (caseItem.documents || []).forEach((doc) => {
    if (doc.type === "employment") totalCost += pricing.employment;
    if (doc.type === "address")    totalCost += pricing.address;
    if (doc.type === "education")  totalCost += pricing.education;
    if (doc.type === "identity")   totalCost += pricing.identity;
    if (doc.type === "criminal")   totalCost += pricing.criminal;
    if (doc.type === "criminalDb") totalCost += pricing.criminalDb;
    if (doc.type === "credit") totalCost += pricing.credit;
    if (doc.type === "identityAadhar") totalCost += pricing.identityAadhar;
  });
  return totalCost;
}
 
/* =========================================================
   AUTH
========================================================= */
 
const adminAuth = (req, res, next) => {
  const headerToken = req.headers.authorization;
  const queryToken  = req.query.token;
 
  const valid =
    headerToken === `Bearer ${process.env.ADMIN_TOKEN}` ||
    queryToken  === process.env.ADMIN_TOKEN;
 
  if (!valid)
    return res.status(403).json({ success: false });
 
  next();
};
 
const companyAuth = (req, res, next) => {
  const headerId = req.headers.companyid;
  const queryId  = req.query.companyid;
 
  const companyId = headerId || queryId;
 
  if (!companyId)
    return res.status(403).json({ success: false });
 
  req.companyId = companyId;
  next();
};

function candidateAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "No token" });
  try {
    req.candidate = jwt.verify(h.slice(7), process.env.JWT_SECRET || "tervies_long_random_secret_2025");
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

function clientAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "No token" });
  try {
    req.client = jwt.verify(h.slice(7), process.env.JWT_SECRET || "tervies_long_random_secret_2025");
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
 
/* =========================================================
   ACTIVITY LOG
========================================================= */
 
const logActivity = (caseId, action, actor) => {
  try {
    const activity = readActivity();
    activity.push({ caseId, action, actor, timestamp: new Date() });
    writeActivity(activity);
  } catch (err) {
    console.error("logActivity error:", err.message);
  }
};
 
/* =========================================================
   WORKFLOW
========================================================= */
 
const WORKFLOW = {
  SUBMITTED:    ["UNDER_REVIEW"],
  UNDER_REVIEW: ["VERIFIED", "DISCREPANCY", "INSUFFICIENT"],
  VERIFIED:     [],
  DISCREPANCY:  ["UNDER_REVIEW"],
  INSUFFICIENT: ["UNDER_REVIEW"],
};
 
const validateTransition = (current, next) => {
  return WORKFLOW[current]?.includes(next);
};
const EMPLOYEES_FILE = path.join(DATA_DIR, "employees.json");
safeReadJSON(EMPLOYEES_FILE, []); // initialize on startup
const readEmployees  = () => safeReadJSON(EMPLOYEES_FILE, []);
const writeEmployees = (d) => safeWriteJSON(EMPLOYEES_FILE, d);
 
// ── Step 2: Employee Auth Middleware ──────────────────────
const employeeAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(403).json({ success: false, message: "No token" });
  }
  const token = header.replace("Bearer ", "").trim();
  const employees = readEmployees();
  const employee = employees.find(e => e.token === token);
  if (!employee) return res.status(403).json({ success: false, message: "Invalid token" });
  req.employee = employee;
  next();
};
/* =========================================================
   CLIENT SUBMIT
========================================================= */
 
app.post("/api/submit", s3Upload.any(), async (req, res) => {
  try {
    const form       = JSON.parse(req.body.form);
    const clientName = form.clientName || "";
    const spocName   = form.spocName   || "";
    const cases      = readCases();
 
    const caseId    = "GVS-" + Date.now();
    const documents = [];
    let extractedText = "";
 
    for (const file of req.files) {
      const section = file.fieldname;
      const key     = `client/${caseId}-${Date.now()}-${file.originalname}`;
 
      await s3.send(new PutObjectCommand({
        Bucket:      process.env.AWS_BUCKET_NAME,
        Key:         key,
        Body:        file.buffer,
        ContentType: file.mimetype,
      }));
 
      if (file.mimetype.startsWith("image/")) {
        const result = await Tesseract.recognize(file.buffer, "eng");
        extractedText += result.data.text;
      }
 
      documents.push({ originalName: file.originalname, key, type: section });
    }
 
    const cleanOCR = extractedText
      .replace(/[^a-zA-Z0-9\/:\- ]/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
 
    const cleanName = form.fullName?.toLowerCase().trim();
 
    const dobRegex     = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/;
    const extractedDob = cleanOCR.match(dobRegex)?.[0] || "";
 
    let normalizedDob = "";
    if (form.dob) {
      const parts   = form.dob.split("-");
      normalizedDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
 
    let extractedName = "";
    if (cleanName) {
      const nameParts = cleanName.split(" ");
      let matchCount  = 0;
      nameParts.forEach(part => { if (cleanOCR.includes(part)) matchCount++; });
      if (matchCount >= Math.ceil(nameParts.length / 2)) extractedName = form.fullName;
    }
 
    const nameMatch = extractedName !== "";
    const dobMatch  = extractedDob === normalizedDob;
 
    let autoStatus = "UNDER_REVIEW", verificationReason = "";
 
    if (nameMatch && dobMatch) {
      autoStatus = "VERIFIED";
      verificationReason = "Name and DOB matched automatically.";
    } else if (!nameMatch && !dobMatch) {
      autoStatus = "DISCREPANCY";
      verificationReason = "Both Name and DOB mismatch.";
    } else if (!nameMatch) {
      autoStatus = "DISCREPANCY";
      verificationReason = "Name mismatch detected.";
    } else {
      autoStatus = "DISCREPANCY";
      verificationReason = "DOB mismatch detected.";
    }
 
    console.log("OCR TEXT:", extractedText);
    console.log("Extracted Name:", extractedName);
    console.log("Extracted DOB:", extractedDob);
    console.log("Form DOB:", normalizedDob);
    console.log("Status:", autoStatus);
 
    const companies = readCompanies();
    const company   = companies.find(c => c.companyId === form.companyId);
    let totalCost   = 0;
 
    if (company && company.pricing) {
      documents.forEach(doc => {
        if (doc.type === "address")    totalCost += company.pricing.address    || 0;
        if (doc.type === "employment") totalCost += company.pricing.employment || 0;
        if (doc.type === "education")  totalCost += company.pricing.education  || 0;
        if (doc.type === "identity")   totalCost += company.pricing.identity   || 0;
        if (doc.type === "criminal")   totalCost += company.pricing.criminal   || 0;
        if (doc.type === "criminalDb") totalCost += company.pricing.criminalDb || 0;
      });
    }
 
    const newCase = {
      caseId,
      name:             form.fullName        || "",
      email:            form.email           || "",
      phone:            form.phone           || "",
      gender:           form.gender          || "",
      fatherName:       form.fatherName      || "",
      dob:              form.dob             || "",
      receivedDate:     new Date(),
      closedDate:       null,
      clientName:       form.clientName      || "",
      spocName:         form.spocName        || "",
      companyId:        form.companyId       || "",
      totalCost,
      presentAddress:   form.presentAddress  || "",
      permanentAddress: form.permanentAddress|| "",
      company:          form.company         || "",
      designation:      form.designation     || "",
      duration:         form.duration        || "",
      employeeId:       form.employeeId      || "",
      ctc:              form.ctc             || "",
      manager:          form.manager         || "",
      reasonLeaving:    form.reasonLeaving   || "",
      institution:      form.institution     || "",
      university:       form.university      || "",
      degree:           form.degree          || "",
      year:             form.year            || "",
      registration:     form.registration    || "",
      mode:             form.mode            || "",
      criminalDetails:  form.criminalDetails || "",
      status:           autoStatus,
      verificationSummary: verificationReason,
      ocrExtractedName:    extractedName,
      ocrExtractedDob:     extractedDob,
      documents,
      verifiedDocuments: [],
      createdAt: new Date()
    };
 
    cases.push(newCase);
    writeCases(cases);
 
    if (form.email) {
      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      form.email,
        subject: "Verification Case Submitted",
        text:    `Your Case ID: ${caseId}`,
      });
    }
 
    res.json({ success: true, caseId });
 
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN LOGIN
========================================================= */
 
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
 
  console.log("FROM FRONTEND:", email, password);
  console.log("ENV EMAIL:", process.env.ADMIN_EMAIL);
  console.log("ENV PASSWORD:", process.env.ADMIN_PASSWORD);
 
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: "Environment variables not loaded"
    });
  }
 
  if (
    email    === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true, token: process.env.ADMIN_TOKEN });
  }
 
  return res.status(401).json({ success: false, message: "Invalid admin credentials" });
});
 
/* =========================================================
   COMPANY LOGIN
========================================================= */
 
app.post("/api/company/login", (req, res) => {
  const { email, password } = req.body;

  const companies = readCompanies();

  const company = companies.find(
    c =>
      c.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
      c.password?.trim() === password.trim()
  );

  if (!company) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  return res.json({
    success: true,
    companyId: company.companyId,
    name: company.name
  });
});
 


/* =========================================================
   CRM CHECK — SEND REPORT TO CRM
   Stores CRM-approved reports separately without changing Track Status logic.
========================================================= */
app.post("/api/admin/send-to-crm", adminAuth, (req, res) => {
  try {
    const report = req.body || {};
    const caseId = String(report.caseId || "").trim();
    if (!caseId) {
      return res.status(400).json({ success: false, message: "Case ID required" });
    }

    const crmReports = readCRMReports();
    const crmEntry = {
      ...report,
      caseId,
      sentToCRM: true,
      crmStatus: "RECEIVED",
      crmSentAt: new Date().toISOString(),
    };

    const filtered = crmReports.filter(r => String(r.caseId).trim() !== caseId);
    writeCRMReports([crmEntry, ...filtered]);

    const cases = readCases();
    const idx = cases.findIndex(c => String(c.caseId).trim() === caseId);
    if (idx !== -1) {
      cases[idx] = {
        ...cases[idx],
        sentToCRM: true,
        crmStatus: "RECEIVED",
        crmSentAt: crmEntry.crmSentAt,
        qcReport: report,
        updatedAt: new Date().toISOString(),
      };
      writeCases(cases);
    }

    logActivity(caseId, "Report sent to CRM", "ADMIN");
    return res.json({ success: true, report: crmEntry });
  } catch (err) {
    console.error("SEND TO CRM ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/admin/crm-reports", adminAuth, (req, res) => {
  try {
    return res.json({ success: true, reports: readCRMReports() });
  } catch (err) {
    console.error("GET CRM REPORTS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   ADMIN GET ALL CASES
========================================================= */
 
app.get("/api/admin/cases", adminAuth, (req, res) => {
  try {
    const cases = readCases();
    return res.json({ success: true, cases });
  } catch (err) {
    console.error("GET CASES ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
// ── GET ALL COMPANIES ──────────────────────────────────────────────────────
app.get("/api/admin/companies", adminAuth, (req, res) => {
  try {
    const companies = readCompanies();
    return res.json({ success: true, companies });
  } catch (err) {
    console.error("GET COMPANIES ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN GET SINGLE CASE
========================================================= */
 
app.get("/api/admin/case/:caseId", adminAuth, (req, res) => {
  try {
    const cases = readCases();
    const found = cases.find(c => String(c.caseId).trim() === String(req.params.caseId).trim());
    if (!found) return res.status(404).json({ success: false });
    return res.json({ success: true, case: found });
  } catch (err) {
    console.error("GET CASE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN DELETE CASE
   ✅ FIX: Single route, case-insensitive fallback match
========================================================= */
 
app.delete("/api/admin/cases/:caseId", adminAuth, (req, res) => {
  try {
    const caseId = String(req.params.caseId).trim();
    const cases  = readCases();
 
    let index = cases.findIndex(c => String(c.caseId).trim() === caseId);
    if (index === -1) {
      index = cases.findIndex(
        c => String(c.caseId).trim().toLowerCase() === caseId.toLowerCase()
      );
    }
 
    if (index === -1) {
      console.log("DELETE: Case not found. ID received:", caseId);
      console.log("DELETE: Available IDs:", cases.map(c => c.caseId));
      return res.status(404).json({ success: false, message: `Case not found: ${caseId}` });
    }
 
    cases.splice(index, 1);
    writeCases(cases);
    logActivity(caseId, "Case deleted", "ADMIN");
 
    return res.json({ success: true, message: "Case deleted successfully" });
 
  } catch (err) {
    console.error("DELETE CASE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   COMPANY GET ASSIGNED CASES
========================================================= */
 
app.get("/api/company/cases", companyAuth, (req, res) => {
  try {
    const cases = readCases();
    
    // ADD THIS LOG:
    console.log("Company cases request - companyId:", req.companyId);
    console.log("All case companyIds:", cases.map(c => ({ caseId: c.caseId, companyId: c.companyId })));
    
    const companyCases = cases.filter(c => 
  String(c.companyId).toLowerCase().trim() === String(req.companyId).toLowerCase().trim()
);
    return res.json({ success: true, cases: companyCases });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 

/* =========================================================
   COMPANY DELETE OWN CASE
   Lets company delete only its own submitted/assigned case.
========================================================= */
app.delete("/api/company/cases/:caseId", companyAuth, (req, res) => {
  try {
    const caseId = decodeURIComponent(String(req.params.caseId || "")).trim();
    const companyId = String(req.companyId || "").toLowerCase().trim();

    if (!caseId) {
      return res.status(400).json({ success: false, message: "Case ID required" });
    }

    const cases = readCases();
    const index = cases.findIndex(c =>
      String(c.caseId || "").trim().toLowerCase() === caseId.toLowerCase() &&
      String(c.companyId || "").trim().toLowerCase() === companyId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not allowed for this company",
      });
    }

    const deletedCase = cases[index];
    cases.splice(index, 1);
    writeCases(cases);

    logActivity(caseId, "Case deleted by company", req.companyId || "COMPANY");

    return res.json({
      success: true,
      message: "Case deleted successfully",
      case: deletedCase,
    });
  } catch (err) {
    console.error("COMPANY DELETE CASE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   ADMIN UPDATE STATUS
========================================================= */
 

 
/* =========================================================
   ADMIN CREATE CASE
========================================================= */
 
app.post("/api/admin/create-case", adminAuth, (req, res) => {
  try {
    const {
      name, caseId, clientName, companyId, clientCaseId,
      gender, dob, email, phone, fatherName,
      presentAddress, permanentAddress, company, designation,
      duration, institution, university, degree, year,
      criminalDetails, status, checks
    } = req.body;
 
    if (!name || !caseId) {
      return res.status(400).json({ success: false, message: "Name and Case ID are required" });
    }
 
    const cases = readCases();
 
    const alreadyExists = cases.find(
      (c) => String(c.caseId).trim().toLowerCase() === String(caseId).trim().toLowerCase()
    );
 
    if (alreadyExists) {
      return res.status(400).json({ success: false, message: "Case ID already exists" });
    }
 
    const newCase = {
      caseId:           String(caseId).trim(),
      name:             name             || "",
      clientName:       clientName       || "",
      companyId:        companyId        || "",
      clientCaseId:     clientCaseId     || "",
      gender:           gender           || "",
      dob:              dob              || "",
      email:            email            || "",
      phone:            phone            || "",
      fatherName:       fatherName       || "",
      presentAddress:   presentAddress   || "",
      permanentAddress: permanentAddress || "",
      company:          company          || "",
      designation:      designation      || "",
      duration:         duration         || "",
      institution:      institution      || "",
      university:       university       || "",
      degree:           degree           || "",
      year:             year             || "",
      criminalDetails:  criminalDetails  || "",
      status:           status           || "SUBMITTED",
      checks:           Array.isArray(checks) ? checks : [],
      documents:           [],
      verifiedDocuments:   [],
      verificationSummary: "",
      receivedDate: new Date(),
      closedDate:   "",
      createdAt:    new Date(),
      updatedAt:    new Date()
    };
 
    cases.unshift(newCase);
    writeCases(cases);
 
    return res.json({ success: true, case: newCase });
 
  } catch (err) {
    console.error("CREATE CASE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


/* =========================================================
   COMPANY → CREATE CASE (called from Company Dashboard Excel upload)
   No adminAuth — authenticated by companyId header instead
   Add this route AFTER your existing /api/admin/create-case route
========================================================= */

app.post("/api/admin/create-case-from-company", companyAuth, (req, res) => {
  try {
    const {
      name, caseId, clientName, companyId, clientCaseId,
      fatherName, gender, dob, email, phone,
      presentAddress, permanentAddress,
      company, designation, duration,
      institution, university, degree, year,
      criminalDetails, status, checks,
    } = req.body;

    // ── Validate required fields ───────────────────────────
    if (!name || !caseId) {
      return res.status(400).json({
        success: false,
        message: "Name and Case ID are required",
      });
    }

    // ── Validate companyId matches the authenticated company ─
    if (req.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "CompanyId mismatch — not authorized",
      });
    }

    const cases = readCases();
    const companies = readCompanies();

    // ── Check for duplicate case ID ───────────────────────
    const alreadyExists = cases.find(
      (c) =>
        String(c.caseId).trim().toLowerCase() ===
        String(caseId).trim().toLowerCase()
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: `Case ID "${caseId}" already exists`,
      });
    }

    // ── Resolve clientName from companies list ────────────
    const company_record = companies.find((c) => c.companyId === companyId);
    const resolvedClientName =
      clientName ||
      (company_record ? company_record.name : companyId);

    // ── Build new case object ──────────────────────────────
    const newCase = {
      caseId:           String(caseId).trim(),
      name:             name             || "",
      clientName:       resolvedClientName,
      companyId:        companyId        || "",
      clientCaseId:     clientCaseId     || "",
      fatherName:       fatherName       || "",
      gender:           gender           || "",
      dob:              dob              || "",
      email:            email            || "",
      phone:            phone            || "",
      presentAddress:   presentAddress   || "",
      permanentAddress: permanentAddress || "",
      company:          company          || "",
      designation:      designation      || "",
      duration:         duration         || "",
      institution:      institution      || "",
      university:       university       || "",
      degree:           degree           || "",
      year:             year             || "",
      criminalDetails:  criminalDetails  || "",
      status:           status           || "SUBMITTED",
      checks:           Array.isArray(checks) ? checks : [],
      documents:           [],
      verifiedDocuments:   [],
      verificationSummary: "",
      receivedDate: new Date(),
      closedDate:   "",
      createdAt:    new Date(),
      updatedAt:    new Date(),
      // Flag so admin knows this case came from company portal
      createdByCompany: true,
    };

    // ── Save ───────────────────────────────────────────────
    cases.unshift(newCase);
    writeCases(cases);

    logActivity(caseId, `Case created by company ${resolvedClientName}`, "COMPANY");

    return res.json({ success: true, case: newCase });

  } catch (err) {
    console.error("CREATE CASE FROM COMPANY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN ASSIGN COMPANY
   ✅ FIX: Always stores clientName — works for real + manual clients
========================================================= */
 
app.post("/api/admin/assign-company", adminAuth, (req, res) => {
  try {
    const { caseId, companyId } = req.body;
 
    console.log("ASSIGN HIT:", caseId, companyId);
 
    const cases     = readCases();
    const companies = readCompanies();
 
    const index = cases.findIndex(c => c.caseId === caseId);
 
    if (index === -1) {
      return res.status(404).json({ success: false });
    }
 
    cases[index].companyId = companyId;
 
    // ✅ FIX: Always set clientName
    const company = companies.find(c => c.companyId === companyId);
    cases[index].clientName = company ? company.name : companyId;
 
    let totalCost = 0;
 
    if (company && company.pricing && Array.isArray(cases[index].documents)) {
      cases[index].documents.forEach(doc => {
        if (doc.type === "address")    totalCost += company.pricing.address    || 0;
        if (doc.type === "employment") totalCost += company.pricing.employment || 0;
        if (doc.type === "education")  totalCost += company.pricing.education  || 0;
        if (doc.type === "identity")   totalCost += company.pricing.identity   || 0;
        if (doc.type === "criminal")   totalCost += company.pricing.criminal   || 0;
        if (doc.type === "criminalDb") totalCost += company.pricing.criminalDb || 0;
      });
    }
 
    cases[index].totalCost = totalCost;
    writeCases(cases);
 
    res.json({ success: true });
 
  } catch (err) {
    console.error("ASSIGN ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN SEND CANDIDATE LINK
========================================================= */
 
app.post("/api/admin/send-candidate-link", adminAuth, async (req, res) => {
  try {
    const { name, email, phone, clientName, companyId } = req.body;
 
    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }
 
    const formLink =
      `https://tervies.info/?email=${encodeURIComponent(email)}` +
      `&name=${encodeURIComponent(name || "")}` +
      `&phone=${encodeURIComponent(phone || "")}` +
      `&clientName=${encodeURIComponent(clientName || "")}` +
      `&companyId=${encodeURIComponent(companyId || "")}`;
 
    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: "Action Required: Complete Your Background Verification Form",
      html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f5f7fb; padding:30px">
        <div style="max-width:600px;margin:auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)">
          <div style="background:#1e3a8a;color:white;padding:20px;text-align:center">
            <h2 style="margin:0">TrueVerify</h2>
            <p style="margin:0;font-size:14px">Background Verification Platform</p>
          </div>
          <div style="padding:30px">
            <p style="font-size:16px">Dear <b>${name || "Candidate"}</b>,</p>
            <p style="font-size:15px;line-height:1.6;color:#444">
              You have been requested to complete your <b>Background Verification (BGV)</b> process.
              To proceed, please fill out the verification form using the secure link below.
            </p>
            ${clientName ? `<p style="font-size:14px;color:#444"><b>Client:</b> ${clientName}</p>` : ""}
            <div style="text-align:center;margin:30px 0">
              <a href="${formLink}" style="background:#2563eb;color:white;padding:14px 28px;font-size:16px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">
                Complete Verification Form
              </a>
            </div>
            <p style="font-size:14px;color:#555">Please ensure that the information provided is accurate and that all required documents are uploaded clearly to avoid delays in the verification process.</p>
            <p style="font-size:14px;color:#555">If you face any issues accessing the form, please contact the verification team.</p>
            <hr style="margin:25px 0">
            <p style="font-size:13px;color:#777">This is an automated message from the TrueVerify verification system. Please do not reply to this email.</p>
            <p style="font-size:13px;color:#777">©️ ${new Date().getFullYear()} TrueVerify. All rights reserved.</p>
          </div>
        </div>
      </div>`
    });
 
    res.json({ success: true });
  } catch (err) {
    console.error("SEND LINK ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN GENERATE ONE-TIME TRACK LINK
========================================================= */
 
app.post("/api/admin/generate-link", adminAuth, (req, res) => {
  try {
    const { caseId } = req.body;
    const tokens     = readTokens();
    const token      = crypto.randomBytes(32).toString("hex");
 
    tokens.push({ token, caseId, used: false, expiresAt: Date.now() + (1000 * 60 * 60) });
    writeTokens(tokens);
 
    const secureLink = `http://localhost:3000/secure-track/${token}`;
    res.json({ success: true, link: secureLink });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   VERIFIED UPLOAD (ADMIN)
========================================================= */
 
app.post("/api/admin/upload-verified/:caseId",
  adminAuth,
  s3Upload.single("file"),
  async (req, res) => {
    try {
      const cases = readCases();
      const index = cases.findIndex(c => c.caseId === req.params.caseId);
 
      if (index === -1)
        return res.status(404).json({ success: false });
 
      const file = req.file;
      const key  = `verified/${req.params.caseId}-${Date.now()}-${file.originalname}`;
 
      await s3.send(new PutObjectCommand({
        Bucket:      process.env.AWS_BUCKET_NAME,
        Key:         key,
        Body:        file.buffer,
        ContentType: file.mimetype,
      }));
 
      if (!cases[index].verifiedDocuments) cases[index].verifiedDocuments = [];
      cases[index].verifiedDocuments.push({
        originalName: file.originalname,
        key,
        uploadedAt: new Date()
      });
 
      writeCases(cases);
      res.json({ success: true });
 
    } catch (err) {
      console.error("UPLOAD VERIFIED (ADMIN) ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
 
/* =========================================================
   VERIFIED UPLOAD (COMPANY)
========================================================= */
 
app.post("/api/company/upload-verified/:caseId",
  companyAuth,
  s3Upload.single("file"),
  async (req, res) => {
    try {
      const cases = readCases();
      const index = cases.findIndex(
        c => c.caseId === req.params.caseId && c.companyId === req.companyId
      );
 
      if (index === -1)
        return res.status(404).json({ success: false });
 
      const file = req.file;
      const key  = `verified/${req.params.caseId}-${Date.now()}-${file.originalname}`;
 
      await s3.send(new PutObjectCommand({
        Bucket:      process.env.AWS_BUCKET_NAME,
        Key:         key,
        Body:        file.buffer,
        ContentType: file.mimetype,
      }));
 
      if (!cases[index].verifiedDocuments) cases[index].verifiedDocuments = [];
      cases[index].verifiedDocuments.push({
        originalName: file.originalname,
        key,
        uploadedAt:   new Date(),
        uploadedBy:   "COMPANY"
      });
 
      writeCases(cases);
      res.json({ success: true });
 
    } catch (err) {
      console.error("UPLOAD VERIFIED (COMPANY) ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });



  // ─────────────────────────────────────────────────────────────────────────────
// REPLACE your existing /api/admin/save-qc route in server.js with this one.
// Only this route changes — nothing else in server.js is touched.
// ─────────────────────────────────────────────────────────────────────────────

app.post(
  "/api/admin/save-qc",
  adminAuth,
  s3Upload.fields([
    { name: "employmentDocuments" },
    { name: "employmentScreenshots" },
    { name: "residentialDocuments" },
    { name: "residentialScreenshots" },
    { name: "educationalAnnexureE" },
    { name: "educationalScreenshots" },
    { name: "professionalAnnexureF" },
    { name: "professionalScreenshots" },
    { name: "criminalDocuments" },
    { name: "criminalScreenshots" },
    { name: "databaseAnnexureG" },
    { name: "databaseScreenshots" },
    { name: "identityDocuments" },
    { name: "identityScreenshots" },
    { name: "creditDocuments" },
    { name: "creditScreenshots" },
  ]),
  async (req, res) => {
    try {
      const qcReport = { ...req.body };
      const files = req.files || {};

      const FILE_FIELDS = [
        "employmentDocuments", "employmentScreenshots",
        "residentialDocuments", "residentialScreenshots",
        "educationalAnnexureE", "educationalScreenshots",
        "professionalAnnexureF", "professionalScreenshots",
        "criminalDocuments", "criminalScreenshots",
        "databaseAnnexureG", "databaseScreenshots",
        "identityDocuments", "identityScreenshots",
        "creditDocuments", "creditScreenshots",
      ];

      // ── These are the scalar qcReport fields that belong to a specific check.
      // When a new admin saves, we must NOT overwrite existing check's fields
      // if the incoming save doesn't include that check.
      // We map each check name → the qcReport field keys it owns.
      const CHECK_FIELD_MAP = {
        "Employment Check": [
          "respondentName","designation","contactEmail","organization","companyContact",
          "employmentDates","employeeCode","supervisor","salary","reasonLeaving","rehire","comments",
          "vfRespondentName","vfDesignation","vfContactEmail","vfOrganization","vfCompanyContact",
          "vfEmploymentDates","vfEmployeeCode","vfSupervisor","vfSalary","vfReasonLeaving","vfRehire","vfComments",
        ],
        "Residential Address Check": [
          "residentialCaseRefNo","residentialCandidateName","residentialFatherName","residentialDob",
          "residentialConfirmationAddress","residentialAddressType","residentialContactNumber",
          "residentialPeriodOfStay","residentialPropertyType","residentialPhotoIdProofSignature",
          "residentialRespondentName","residentialSpecialComments",
        ],
        "Educational Qualification Check": [
          "eduRespondentName","eduDesignation","eduInstituteName","eduUniversityName",
          "eduYearOfPassing","eduQualificationObtained","eduFinalRemarks","eduAdditionalRemarks",
        ],
        "Professional Reference Check": [
          "profRespondentName","profDesignation","profOrganization","profApplicantName",
          "profEmployerName","profLastPositionHeld","profDutiesAndResponsibilities","profYearOfAssociation",
          "profSubjectKnowledge","profCommunicationSkill","profPerformanceRating","profSoftSkills",
          "profBehaviorAndConduct","profIntegrityIssues","profProfessionalStrengths","profOverallAssessment",
          "profAdditionalComments",
        ],
        "Criminal Police Record Check": [
          "criminalRespondentName","criminalDesignation","criminalPoliceStationName",
          "criminalDateOfVerification","criminalCandidateAddress","criminalFinalRemarks","criminalAdditionalRemarks",
        ],
        "Criminal Database Check": [
          "dbCandidateName","dbFathersName","dbDob","dbDateOfVerification","dbAddressProvided",
          "dbAddressIdProofProvided","dbCaseInitiationDate","dbCaseCompletionDate","dbRecordSummary","dbAdditionalRemarks",
        ],
        "Identity Check (PAN Card)": [
          "panCandidateName","panFatherName","panDob","panNumber","panVerifiedName",
          "panVerifiedFatherName","panVerifiedDob","panVerifiedNumber","panVerificationDate",
          "panRespondentName","panFinalRemarks",
        ],
        "Identity Check (Aadhar Card)": [
          "aadharCandidateName","aadharFatherName","aadharDob","aadharNumber","aadharVerifiedName",
          "aadharVerifiedFatherName","aadharVerifiedDob","aadharVerifiedNumber","aadharVerificationDate",
          "aadharRespondentName","aadharFinalRemarks",
        ],
        "Credit Check": [
          "creditCandidateName","creditDob","creditPanNumber","creditAadharNumber","creditAgencyName",
          "creditScore","creditRating","creditReportDate","creditAccountsFound","creditDefaultOrDues",
          "creditRespondentName","creditFinalRemarks","creditAdditionalRemarks",
        ],
      };

      // ── Step 1: Upload new files to S3 and collect their keys ──────────────
      for (const field of FILE_FIELDS) {
        const uploadedFiles = files[field] || [];
        const newKeys = [];

        for (const file of uploadedFiles) {
          const key = `qc-files/${qcReport.caseId}-${Date.now()}-${file.originalname}`;
          await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }));
          newKeys.push(key);
        }

        // Parse existing S3 keys sent as JSON string from frontend
        let existingKeys = [];
        try {
          const raw = qcReport[field];
          if (typeof raw === "string") {
            existingKeys = JSON.parse(raw);
          } else if (Array.isArray(raw)) {
            existingKeys = raw;
          }
        } catch {
          existingKeys = [];
        }

        // Combine incoming + newly uploaded keys (deduped below in step 5)
        qcReport[field] = [...existingKeys, ...newKeys];
      }

      // ── Step 2: Parse incoming checks ─────────────────────────────────────
      let incomingChecks = [];
      try {
        const raw = qcReport.checks;
        if (typeof raw === "string") incomingChecks = JSON.parse(raw);
        else if (Array.isArray(raw)) incomingChecks = raw;
      } catch {
        incomingChecks = [];
      }

      // ── Step 3: Find or create case ───────────────────────────────────────
      const cases = readCases();
      const index = cases.findIndex(
        (c) => String(c.caseId) === String(qcReport.caseId)
      );

      if (index !== -1) {
        const existingQc = cases[index].qcReport || {};

        // ── Step 4: MERGE checks — union of existing + incoming ──────────────
        // This is the core fix: never throw away checks already saved by
        // another admin. Take the union of both arrays (deduped).
        const existingChecks = (() => {
          try {
            const raw = existingQc.checks;
            if (Array.isArray(raw)) return raw;
            if (typeof raw === "string") return JSON.parse(raw);
            return [];
          } catch { return []; }
        })();

        const mergedChecks = [...new Set([...existingChecks, ...incomingChecks])];

        // ── Step 5: Merge file fields — union of existing + incoming keys ─────
        for (const field of FILE_FIELDS) {
          const existingArr = Array.isArray(existingQc[field]) ? existingQc[field] : [];
          const incomingArr = Array.isArray(qcReport[field]) ? qcReport[field] : [];
          const merged = [...existingArr];
          for (const item of incomingArr) {
            if (!merged.includes(item)) merged.push(item);
          }
          qcReport[field] = merged;
        }

        // ── Step 6: MERGE scalar fields per-check ───────────────────────────
        // For each check that is NOT in the incoming save, preserve the
        // existing qcReport scalar fields so they don't get blanked out.
        // For checks that ARE incoming, the new values overwrite (normal behaviour).
        const preservedFields = {};
        for (const [checkName, fields] of Object.entries(CHECK_FIELD_MAP)) {
          // If this check is NOT being saved in this request, keep existing values
          if (!incomingChecks.includes(checkName)) {
            fields.forEach((fieldKey) => {
              if (existingQc[fieldKey] !== undefined && existingQc[fieldKey] !== null && existingQc[fieldKey] !== "") {
                preservedFields[fieldKey] = existingQc[fieldKey];
              }
            });
          }
        }

        // ── Step 7: Build merged qcReport — existing base + incoming updates
        //            + preserved fields for checks not in this save ────────────
        cases[index].qcReport = {
          ...existingQc,       // base: everything already saved
          ...qcReport,         // incoming: overwrites fields for this admin's checks
          ...preservedFields,  // restore: fields for OTHER admins' checks that incoming may have blanked
          checks: mergedChecks, // always use merged union of all checks
        };

        // ── Step 8: Merge top-level case checks too ───────────────────────────
        const topLevelChecks = (() => {
          try {
            const raw = cases[index].checks;
            if (Array.isArray(raw)) return raw;
            if (typeof raw === "string") return JSON.parse(raw);
            return [];
          } catch { return []; }
        })();
        cases[index].checks = [...new Set([...topLevelChecks, ...incomingChecks])];

      } else {
        // New case — just create it fresh
        cases.unshift({
          caseId: qcReport.caseId,
          checks: incomingChecks,
          qcReport: {
            ...qcReport,
            checks: incomingChecks,
          },
        });
      }

      writeCases(cases);
      logActivity(qcReport.caseId, "QC report saved (merged)", "ADMIN");
      res.json({ success: true });

    } catch (err) {
      console.error("SAVE QC ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);
  app.post("/api/admin/get-signed-urls", adminAuth, async (req, res) => {
    try {
      const { keys } = req.body;
      console.log("GET SIGNED URLS — keys received:", keys); // ← ADD THIS
      
      if (!Array.isArray(keys) || keys.length === 0) {
        return res.json({ success: true, urls: [] });
      }
  
      const urls = await Promise.all(
        keys.map(async (key) => {
          if (!key || typeof key !== "string") return { key, url: null };
          try {
            // Check object exists first. Without this, S3 can return a signed URL that later gives 404,
            // which breaks document preview/PDF generation in the browser.
            await s3.send(new HeadObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key,
            }));

            const command = new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key,
            });
            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
            return { key, url };
          } catch (err) {
            console.warn("Signed URL skipped missing key:", key, err?.name || err?.message || err);
            return { key, url: null };
          }
        })
      );
      res.json({ success: true, urls });
    } catch (err) {
      console.error("GET SIGNED URLS ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
/* =========================================================
   CREATE COMPANY / CLIENT (ADMIN)
========================================================= */
 
app.post("/api/admin/create-company", adminAuth, (req, res) => {
  try {
    const { name }  = req.body;
    const cleanName = String(name || "").trim();
 
    if (!cleanName) {
      return res.status(400).json({ success: false, message: "Client name is required" });
    }
 
    const companies = readCompanies();
 
    const alreadyExists = companies.find(
      (c) => (c.name || "").trim().toLowerCase() === cleanName.toLowerCase()
    );
 
    if (alreadyExists) {
      return res.status(400).json({ success: false, message: "Client already exists" });
    }
 
    const companyId  = "CMP-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
    const newCompany = {
      companyId,
      name:      cleanName,
      email:     "",
      password:  "",
     pricing: {
  address:        0,
  employment:     0,
  education:      0,
  identity:       0,
  identityAadhar: 0,  // ← ADD
  criminal:       0,
  criminalDb:     0,
  credit:         0,  // ← ADD
},
      createdAt: new Date()
    };
 
    companies.push(newCompany);
    writeCompanies(companies);
 
    return res.json({ success: true, message: "Client created successfully", company: newCompany });
 
  } catch (err) {
    console.error("CREATE COMPANY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN DELETE COMPANY / CLIENT
========================================================= */
 
app.delete("/api/admin/companies/:companyId", adminAuth, (req, res) => {
  try {
    const { companyId } = req.params;
    const companies     = readCompanies();
    const index         = companies.findIndex(c => c.companyId === companyId);
 
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
 
    companies.splice(index, 1);
    writeCompanies(companies);
 
    return res.json({ success: true, message: "Company deleted successfully" });
 
  } catch (err) {
    console.error("DELETE COMPANY ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN UPDATE COMPANY PRICING
========================================================= */
 
app.post("/api/admin/update-pricing", adminAuth, (req, res) => {
  try {
    const { companyId, pricing } = req.body;
 
    const companies = readCompanies();
    const cases     = readCases();
 
    const index = companies.findIndex(
      (c) => String(c.companyId) === String(companyId)
    );
 
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
 
    companies[index].pricing   = normalizePricing(pricing);
    companies[index].updatedAt = new Date();
 
    const company = companies[index];
 
    const updatedCases = cases.map((caseItem) => {
      if (String(caseItem.companyId) !== String(companyId)) return caseItem;
      return {
        ...caseItem,
        totalCost:  calculateCaseCostFromDocuments(caseItem, company),
        updatedAt:  new Date(),
      };
    });
 
    writeCompanies(companies);
    writeCases(updatedCases);
 
    return res.json({ success: true, message: "Pricing updated successfully", company });
 
  } catch (err) {
    console.error("UPDATE PRICING ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   COMPANY PERFORMANCE ANALYTICS (ADMIN)
========================================================= */
 
app.get("/api/admin/company-analytics", adminAuth, (req, res) => {
  try {
    const cases     = readCases();
    const companies = readCompanies();
 
    const result = companies.map(company => {
      const companyCases = cases.filter(c => c.companyId === company.companyId);
      return {
        companyId:    company.companyId,
        name:         company.name,
        total:        companyCases.length,
        verified:     companyCases.filter(c => c.status === "VERIFIED").length,
        discrepancy:  companyCases.filter(c => c.status === "DISCREPANCY").length,
        insufficient: companyCases.filter(c => c.status === "INSUFFICIENT").length,
        submitted:    companyCases.filter(c => c.status === "SUBMITTED").length,
        underReview:  companyCases.filter(c => c.status === "UNDER_REVIEW").length,
      };
    });
 
    res.json({ success: true, companies: result });
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN REVENUE (ALL COMPANIES)
   ✅ FIX: Returns ALL companies including those with 0 cases
========================================================= */
 
app.get("/api/admin/revenue", adminAuth, (req, res) => {
  try {
    const cases     = readCases();
    const companies = readCompanies();
 
    const result = {};
 
    // Start with ALL companies so 0-case clients always appear
    companies.forEach(company => {
      result[company.companyId] = {
        companyId:    company.companyId,
        companyName:  company.name,
        totalRevenue: 0,
        totalCases:   0
      };
    });
 
    // Add revenue from cases
    cases.forEach(c => {
      if (!c.companyId) return;
 
      if (!result[c.companyId]) {
        // Case with a companyId not in companies list
        result[c.companyId] = {
          companyId:    c.companyId,
          companyName:  c.clientName || c.companyId,
          totalRevenue: 0,
          totalCases:   0
        };
      }
 
      result[c.companyId].totalRevenue += c.totalCost || 0;
      result[c.companyId].totalCases   += 1;
    });
 
    res.json({ success: true, companies: Object.values(result) });
  } catch (err) {
    console.error("GET REVENUE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   ADD THIS ROUTE to server.js — after /api/admin/update route
   This fixes the update route to also handle checks + case details
========================================================= */

/* =========================================================
   STEP 1: In server.js, find your existing /api/admin/update route
   and REPLACE the entire route with this fixed version.
   
   The fix: added "checks" to destructuring and saves it to the case.
========================================================= */

app.post("/api/admin/update", adminAuth, (req, res) => {
  try {
    const { caseId, status, closedDate, checks } = req.body;  // ✅ added checks
    const cases = readCases();
    const index = cases.findIndex(c => c.caseId === caseId);

    if (index === -1)
      return res.status(404).json({ success: false });

    if (status !== undefined) {
      if (
        status === "VERIFIED" &&
        (!cases[index].verifiedDocuments || cases[index].verifiedDocuments.length === 0)
      ) {
        return res.status(400).json({ success: false, message: "Upload verified document first" });
      }
      cases[index].status = status;
      if (status === "CLOSED" && closedDate) cases[index].closedDate = closedDate;
      else if (status === "VERIFIED") cases[index].closedDate = new Date();
    }

    // ✅ FIX: Save checks when provided
    if (checks !== undefined) {
      cases[index].checks = Array.isArray(checks) ? checks : [];
    }

    cases[index].updatedAt = new Date();

    writeCases(cases);
    logActivity(caseId, `Status/checks updated`, "ADMIN");

    return res.json({ success: true });

  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   STEP 2: Also ADD this new route after the update route above.
   This is needed by CaseDetailsPage to save case details.
========================================================= */

// ✅ KEEP ONLY THIS ONE — delete the other 2 copies of update-case-details
app.post("/api/admin/update-case-details", adminAuth, (req, res) => {
  try {
    const updatedData = req.body;
    const { caseId }  = updatedData;

    if (!caseId)
      return res.status(400).json({ success: false, message: "Case ID is required" });

    const cases = readCases();
    const index = cases.findIndex(
      c => String(c.caseId).trim() === String(caseId).trim()
    );

    if (index === -1)
      return res.status(404).json({ success: false, message: "Case not found" });

    cases[index] = {
      ...cases[index],
      ...updatedData,
      documents:         cases[index].documents         || [],
      verifiedDocuments: cases[index].verifiedDocuments || [],
      updatedAt: new Date(),
    };

    writeCases(cases);
    logActivity(caseId, "Case details updated manually", "ADMIN");

    return res.json({ success: true, case: cases[index] });

  } catch (err) {
    console.error("UPDATE CASE DETAILS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   ADD THIS NEW ROUTE too — after the update route above
   For saving full case details (used by CaseDetailsPage)
========================================================= */

/* =========================================================
   ADMIN REVENUE (SINGLE COMPANY)
========================================================= */
 
app.get("/api/admin/revenue/:companyId", adminAuth, (req, res) => {
  try {
    const { companyId } = req.params;
 
    const cases     = readCases();
    const companies = readCompanies();
 
    const company = companies.find(c => c.companyId === companyId);
 
    if (!company) {
      return res.status(404).json({ success: false });
    }
 
    const companyCases = cases.filter(c => c.companyId === companyId);
 
    let addressTotal = 0, employmentTotal = 0, educationTotal = 0, criminalTotal = 0;
 
    const employees = companyCases.map(c => {
      let address = 0, employment = 0, education = 0, criminal = 0;
 
      (c.documents || []).forEach(doc => {
        if (doc.type === "address")    { address    = company.pricing?.address    || 0; addressTotal    += address;    }
        if (doc.type === "employment") { employment = company.pricing?.employment || 0; employmentTotal += employment; }
        if (doc.type === "education")  { education  = company.pricing?.education  || 0; educationTotal  += education;  }
        if (doc.type === "criminal")   { criminal   = company.pricing?.criminal   || 0; criminalTotal   += criminal;   }
      });
 
      return {
        id:         c.caseId,
        name:       c.name,
        address,
        employment,
        education,
        criminal,
        total: address + employment + education + criminal
      };
    });
 
    res.json({
      companyName:     company.name,
      totalEmployees:  companyCases.length,
      totalRevenue:    addressTotal + employmentTotal + educationTotal + criminalTotal,
      addressTotal,
      employmentTotal,
      educationTotal,
      criminalTotal,
      employees
    });
  } catch (err) {
    console.error("SINGLE REVENUE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   GENERATE INVOICE PDF
========================================================= */
 
app.get("/api/admin/generate-invoice", adminAuth, (req, res) => {
  try {
    const companyId = req.query.companyId;
 
    const cases     = readCases();
    const companies = readCompanies();
 
    const company = companies.find(c => c.companyId === companyId);
 
    if (!company) {
      return res.status(404).json({ success: false });
    }
 
    const companyCases = cases.filter(c => c.companyId === companyId);
 
    let total = 0;
    companyCases.forEach(c => { total += c.totalCost || 0; });
 
    const doc      = new PDFDocument();
    const fileName = `invoice-${companyId}-${Date.now()}.pdf`;
 
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
 
    doc.pipe(res);
 
    doc.fontSize(22).text("TrueVerify Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Client: ${company.name}`);
    doc.text(`Email: ${company.email}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(16).text("Cases");
    doc.moveDown();
 
    companyCases.forEach(c => {
      doc.fontSize(12).text(`${c.caseId}   -   ₹${c.totalCost || 0}`);
    });
 
    doc.moveDown();
    doc.fontSize(16).text(`Total Amount: ₹${total}`);
    doc.end();
  } catch (err) {
    console.error("INVOICE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   EMAIL INVOICE
========================================================= */
 
app.post("/api/admin/email-invoice", adminAuth, async (req, res) => {
  try {
    const { companyId }  = req.body;
    const companies      = readCompanies();
    const cases          = readCases();
    const company        = companies.find(c => c.companyId === companyId);
    const companyCases   = cases.filter(c => c.companyId === companyId);
 
    let total = 0;
    companyCases.forEach(c => { total += c.totalCost || 0; });
 
    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      company.email,
      subject: `Invoice from TrueVerify`,
      html: `
        <h2>TrueVerify Invoice</h2>
        <p>Client: ${company.name}</p>
        <p>Total Cases: ${companyCases.length}</p>
        <p>Total Amount: ₹${total}</p>
        <p>Please contact us for payment details.</p>
      `
    });
 
    res.json({ success: true });
  } catch (err) {
    console.error("EMAIL INVOICE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   SAVE AGREEMENT
========================================================= */
 
app.post("/api/admin/save-agreement", adminAuth, (req, res) => {
  try {
    const agreements = readAgreements();
    const { companyId, agreement } = req.body;
 
    const newAgreement = { id: Date.now(), companyId, agreement, createdAt: new Date() };
    agreements.push(newAgreement);
    writeAgreements(agreements);
 
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
app.get("/api/admin/agreements", adminAuth, (req, res) => {
  try {
    const agreements = readAgreements();
    res.json({ success: true, agreements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/admin/send-to-track", adminAuth, (req, res) => {
  try {
    const report = req.body || {};
    const caseId = String(report.caseId || "").trim();

    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId required" });
    }

    const cases = readCases();
    const index = cases.findIndex(
      c => String(c.caseId).trim().toLowerCase() === caseId.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    cases[index] = {
      ...cases[index],
      ...report,
      qcReport: report,
      sentToTrack: true,
      qcApproved: true,
      qcApprovedAt: new Date(),
      reportGeneratedAt: new Date(),
      status: cases[index].status || "SUBMITTED",
    };

    writeCases(cases);
    return res.json({ success: true, case: cases[index] });
  } catch (err) {
    console.error("SEND TO TRACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   GENERATE AGREEMENT PDF (full original content preserved)
========================================================= */
 
app.post("/api/admin/generate-agreement-pdf", adminAuth, (req, res) => {
  try {
    const { companyId } = req.body;

    const companies = readCompanies();
    const company = companies.find(c => c.companyId === companyId);

    if (!company) {
      return res.status(404).json({ success: false });
    }

    const clientName = company.name || "Client";

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 60, right: 60 }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=agreement.pdf`);

    doc.pipe(res);

    const contentWidth = doc.page.width - 120;

    try {
      const logoPath = path.join(__dirname, "uploads", "logo2.jpg");
      doc.image(logoPath, 60, 40, { width: 140 });
    } catch (e) {
      console.log("Logo error:", e);
    }

    doc.y = 110;

    doc.font("Times-Bold").fontSize(14).text("SERVICE AGREEMENT", { align: "center", underline: true });
    doc.moveDown(1.2);
    doc.font("Times-Roman").fontSize(10);

    doc.text("THIS SERVICE AGREEMENT dated this ", { continued: true });
    doc.font("Times-Bold").text("1st day of March 2026", { continued: true });
    doc.font("Times-Roman").text(", BY AND BETWEEN");
    doc.moveDown();

    doc.font("Times-Bold").text(`${clientName} Pvt Ltd`, { continued: true });
    doc.font("Times-Roman").text(
      " and having its Office at 3rd Floor, F-17, Devsha Business Park, Sector – 63, Noida, Gautam India (Hereinafter referred to as ",
      { continued: true }
    );
    doc.font("Times-Bold").text("“CLIENT”", { continued: true });
    doc.font("Times-Roman").text(
      " which expression shall unless repugnant to the context or meaning thereof, be deemed to include its successors, legal representatives and assigns of the ONE PART);"
    );
    doc.moveDown();

    doc.font("Times-Bold").text("AND", { align: "center" });
    doc.moveDown();

    doc.font("Times-Bold").text("True Verification Services Pvt. Ltd.", { continued: true });
    doc.font("Times-Roman").text(
      " a Company and having its Corporate Office Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306, India (hereinafter referred to as ",
      { continued: true }
    );
    doc.font("Times-Bold").text("“Service Provider”", { continued: true });
    doc.font("Times-Roman").text(
      ", which expression shall unless repugnant to the context or meaning thereof, be deemed to include its successors, legal representatives and assigns of the OTHER PART);"
    );
    doc.moveDown();

    doc.text(`${clientName} and Service Provider are hereinafter also referred to as ‘Parties’ collectively and ‘Party’ individually.`);
    doc.moveDown();

    doc.text("Now in consideration of the mutual covenants and obligations contained herein ", { continued: true });
    doc.font("Times-Bold").text("IT IS HEREBY AGREED", { continued: true });
    doc.font("Times-Roman").text(" as follows:");
    doc.moveDown();

    doc.font("Times-Bold").text("1. Scope of Services");
    doc.moveDown(0.4);
    doc.font("Times-Roman").text("1.1 The scope of services to be performed by Service Provider as per mentioned in Annexure – A");
    doc.moveDown();

    doc.font("Times-Bold").text("2. Obligations of Service Provider");
    doc.moveDown(0.4);
    doc.font("Times-Roman").text(
      `2.1 Service Provider assumes that ${clientName} has obtained necessary authorization/consents from the candidates in respect of whom such verification/search is required to be conducted. As such ${clientName} shall not be liable for any consequences resulting from any action taken by Service Provider based on ${clientName}'s output.`
    );
    doc.moveDown();
    doc.text(
      `2.2 On receipt of the above details from ${clientName}, Service Provider will assess the same & send a message to ${clientName} confirming the completeness of the said information.`
    );
    doc.moveDown();
    doc.text(
      `2.3 The Turnaround Time (TAT) for Service Provider to deliver the output will be 21 Working days for Confirmation of Educational/Professional Qualification Check, Criminal Police Record Verification for 30 business days, and 10 Working days for Verification of Employment History, Address Check (Local/Present), Criminal Database Check and Professional Reference Check said time period shall be counted from the time Service Provider sends message to ${clientName} confirming the completeness of the details received w. rt the person (for whom verification is to be done).`
    );
    doc.moveDown();
    doc.text("2.4 Service Provider shall raise invoice on monthly basis.");
    doc.moveDown();
    doc.text("2.5 Any Cancellation within 24 hours of submission of cases would be subject to 25% of the total cost of the report");
    doc.moveDown();
    doc.text(
      `2.6 Service Provider will not share any hard copy of original criminal police verification report to ${clientName} post receipt from police station as per company legal policy, service provider will be sharing the final report in hard copy in Genuine Services letter heads on demand basis only, with duly signed and stamped, for NCR Locations Noida, Delhi, Ghaziabad, Faridabad and Gurgaon only (For Judicial Police Verification Cases)`
    );
    doc.moveDown();
    doc.text(
      "2.7 It is to be noted that there are no such centralized criminal records maintained by the government or any law enforcement agency/company in India, as these records were mostly managed/maintained manually at the local police station, therefore aforesaid criminal police check conducted by the Service Provider can only be auditable for NCR Police Reports only (Noida, Delhi, Ghaziabad, Faridabad and Gurgaon Only) for Judicial Process."
    );
    doc.moveDown();
    doc.text(
      "2.8 Criminal Police check (NCR Locations Only) would be conducted with the police station under particular jurisdiction the address provided to us come under. Service Provider will not verify any other record that the candidate might have under other police station across the country"
    );

    const footerY2 = doc.page.height - 80;
    doc.font("Times-Bold").fontSize(9).text("True Verification Services Private Limited.", 60, footerY2, {
      align: "center",
      width: contentWidth
    });
    doc.font("Times-Roman").fontSize(8).text(
      "Corporate Office: Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306, Tel: 9289977268, www.trueverificationservices.in",
      60,
      footerY2 + 12,
      { align: "center", width: contentWidth }
    );

    doc.addPage();
    try {
      doc.image(path.join(__dirname, "uploads", "logo2.jpg"), 60, 40, { width: 140 });
    } catch (e) {}
    doc.y = 110;
    doc.font("Times-Roman").fontSize(10);

    doc.text(`2.9 ${clientName} agrees to pay the Service Provider “Unable to Verify” cases for service rendered.`);
    doc.moveDown();
    doc.text("2.10 Criminal Police Verification would be conducted on the basis of address mentioned in the ID of the candidate");
    doc.moveDown();
    doc.text(
      "2.11 The verification result pertains to a period of one year prior to the date of verification and does not cover any police records that the candidate might have stayed prior to that."
    );
    doc.moveDown();
    doc.text(
      "2.12 Criminal Police verification report would be as on date from the date of case initiation only, service provider would not be responsible any discrepancy comes out after the date of case initiation (date of Police Verification mentioned in the report)"
    );
    doc.moveDown();
    doc.text(`3. Obligations of ${clientName}.`);
    doc.moveDown();
    doc.text(`3.1 ${clientName} shall forward to Service Provider, the complete details of persons with respect to whom the said verification is to be done.`);
    doc.moveDown();
    doc.text(`3.2 ${clientName} shall pay the invoices as per the payment terms of this agreement.`);
    doc.moveDown();
    doc.text("4. Commercials and Payment Terms");
    doc.moveDown();
    doc.text(
      `4.1 For every case/output delivered by ${clientName}, ${clientName} shall pay service fee depending upon the number of verifications done in each case. The fee for verification done in each case mentioned in Annexure.`
    );
    doc.moveDown();
    doc.text("Service Tax will be extra as applicable");
    doc.moveDown();
    doc.text(`4.2 At the end of each month, Service Provider will raise bill to ${clientName} for the cases done in that particular month.`);
    doc.moveDown();
    doc.text(`4.3 ${clientName} will be settling the undisputed invoices within 15 days from the date of receipt of valid invoice.`);
    doc.moveDown();
    doc.text(
      "4.4 In case of disputes in the submitted invoices, the payment would need to be made within 10 business days from the date of resolution of the disputes"
    );
    doc.moveDown();
    doc.text("5 Confidentiality");
    doc.moveDown();
    doc.text(
      "Both Parties shall keep all information of confidential nature received from the other Party in whatever form as strictly confidential and shall not disclose it to third party without the prior written consent of the other Party during the term of this Agreement."
    );
    doc.moveDown();
    doc.text("6 Notices");
    doc.moveDown();
    doc.text(
      "Unless otherwise stated in this Agreement, any notice required or permitted to be given under this Agreement, shall be given in writing and shall be delivered by hand or sent by registered mail to the address of the other Party first set forth above or to such other address as a Party may designate to the other by written notice."
    );
    doc.moveDown();
    doc.text("7 Term");
    doc.moveDown();
    doc.text(
      "The Agreement shall come into force with effect from 7th September 2015, and shall remain in full force and effect for 2 years i.e until 6th September 2017 with said terms being capable of extension by mutual written Agreement by the parties."
    );
    doc.moveDown();

    const footerY = doc.page.height - 80;
    doc.font("Times-Bold").fontSize(9).text("True Verification Services Private Limited.", 60, footerY, {
      align: "center",
      width: contentWidth
    });
    doc.font("Times-Roman").fontSize(8).text(
      "Corporate Office: Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306, Tel: 9289977268, www.trueverificationservices.in",
      60,
      footerY + 12,
      { align: "center", width: contentWidth }
    );

    doc.addPage();
    try {
      doc.image(path.join(__dirname, "uploads", "logo2.jpg"), 60, 40, { width: 140 });
    } catch (e) {}
    doc.y = 110;
    doc.font("Times-Roman").fontSize(10);

    doc.text("8 Termination");
    doc.moveDown();
    doc.text("Either Party shall have the right to terminate this Agreement by giving 30 (Thirty) days written notice to the other party.");
    doc.moveDown();
    doc.text(
      "Either Party shall have the right to terminate this Agreement with immediate effect, if: The other Party fails to perform any material obligations under this Agreement, and such failure continues un remedied for a period of (30) days following receipt of written notice of such failure,"
    );
    doc.moveDown();
    doc.text("or");
    doc.moveDown();
    doc.text(
      "ii) The other Party goes into liquidation, either voluntary or compulsory, or becomes insolvent or the other Party enters into receivership or bankruptcy"
    );
    doc.moveDown();
    doc.text(
      "Upon termination, parties shall immediately settle the dues of the either Party, without any claim on any account whatsoever against each other."
    );
    doc.moveDown();
    doc.text("9 Force Majeure");
    doc.moveDown();
    doc.text(
      "The Parties should be relieved from liability for their failure to perform any obligation under this Agreement during such period and to the extent that the due performance thereof by either Party is prevented due to any cause beyond their reasonable control including but not limited to strikes, wars, revolutions, fires, floods, severe storms, explosions, earthquakes, government regulations, act of god, riots."
    );
    doc.moveDown();
    doc.text("10 Indemnification and Limitation of Liability");
    doc.moveDown();
    doc.text(
      `Service Provider shall indemnify ${clientName} its affiliates, officers, directors, agents or employees harmless from and against all claims, actions, suits or other proceedings and all losses, judgments, damages, expenses or other costs (including counsel fees and disbursements), arising from or in any way relating to`
    );
    doc.moveDown();
    doc.text("i) any breach or violation of terms of the agreement,");
    doc.moveDown();
    doc.text("ii) any erroneous verification report provided");
    doc.moveDown();
    doc.text(
      "Subject to the express terms of this Agreement neither party shall be liable to each other in connection with the exercise of its rights or the performance of its obligations under this Agreement for any indirect or consequential loss whether arising from negligence, breach of contract or howsoever"
    );
    doc.moveDown();
    doc.text(
      `Notwithstanding anything contained in this Agreement, the Liability of Service Provider under this agreement in any circumstances if there is any wrong reports provided by the service provider shall not exceed 3 times of the cost of the checks to be paid by the Service Provider to ${clientName}`
    );
    doc.moveDown();
    doc.text("11 Governing Law and Dispute Resolutions");
    doc.moveDown();
    doc.text(
      "11.1 This Agreement shall be construed, interpreted and governed by the laws of India and for all purposes only the courts at New Delhi shall have the exclusive jurisdiction."
    );
    doc.moveDown();
    doc.text(
      "11.2 Any dispute arising out of or related to or connected with any provisions under this contract shall be resolved as per the Indian Arbitration & Conciliation Act 1996 and any amendments thereof. There shall be sole arbitrator appointed by the mutual consent of both the parties. The arbitration proceedings shall be conducted in New Delhi. The language of arbitration shall be English."
    );

    const footerYBreak = doc.page.height - 80;
    doc.font("Times-Bold").fontSize(9).text("True Verification Services Private Limited.", 60, footerYBreak, {
      align: "center",
      width: contentWidth
    });
    doc.font("Times-Roman").fontSize(8).text(
      "Corporate Office: Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306, Tel: 9289977268, www.trueverificationservices.in",
      60,
      footerYBreak + 12,
      { align: "center", width: contentWidth }
    );

    doc.addPage();
    try {
      doc.image(path.join(__dirname, "uploads", "logo2.jpg"), 60, 40, { width: 140 });
    } catch (e) {}
    doc.y = 110;
    doc.font("Times-Roman").fontSize(10);

    doc.text("12 Miscellaneous");
    doc.moveDown();
    doc.text(
      "12.1 Assignment: Neither party can assign its rights and remedies nor transfer its obligations under this Agreement without prior written consent of other Party."
    );
    doc.moveDown();
    doc.text(
      "12.3 Waiver: The failure of either Party to enforce at any time the provisions hereof shall not be construed to be a waiver of such provisions nor a waiver of such duty or obligation."
    );
    doc.moveDown();
    doc.text(
      "12.4 Severability: Should any provision of this Agreement be determined to be unenforceable or invalid, or any transaction contemplated hereby determined to be unlawful by any court of law, arbitrator or competent government body for any reason, all other provisions shall continue in full force and effect."
    );
    doc.moveDown();
    doc.text(
      "12.5 Entire Agreement: This Agreement, including the Appendices, Annexure constitutes the entire Agreement of the Parties with respect to the matters herein contained and supersedes all prior agreements and understandings between the Parties whether written or oral."
    );
    doc.moveDown();
    doc.text(
      "12.6 This Agreement may only be modified in writing, by the mutual assent of the parties to this Agreement and signature of a duly authorized officer of each party hereto."
    );
    doc.moveDown();
    doc.text("13. Counterparts");
    doc.moveDown();
    doc.text("This Agreement has been executed on the date set forth herein in two (2) copies of which the Parties have taken one each.");
    doc.moveDown();
    doc.text("IN WITNESS WHEREOF, THE PARTIES HERE TO HAVE EXECUTED THIS AGREEMENT ON THE DATE HEREIN ABOVE WRITTEN");

    doc.moveDown(2);

    const startY = doc.y + 40;
    const leftX = 60;
    const rightX = doc.page.width / 2 + 20;

    doc.font("Times-Roman").text("For and on behalf of,", leftX, startY);
    doc.font("Times-Bold").text(`${clientName} Pvt. Ltd.`, leftX, startY + 20);
    doc.font("Times-Roman").text("Signature:", leftX, startY + 60);
    doc.font("Times-Bold").text("Ms Sumita Arora", leftX, startY + 80);
    doc.font("Times-Roman").text("Head of Operations", leftX, startY + 100);

    doc.font("Times-Roman").text("For and on behalf of,", rightX, startY);
    doc.font("Times-Bold").text("True Verification Services Pvt. Ltd.", rightX, startY + 20);
    doc.font("Times-Roman").text("Signature:", rightX, startY + 60);
    doc.font("Times-Bold").text("Mr. Bipul Mishra", rightX, startY + 80);
    doc.font("Times-Roman").text("Senior Manager", rightX, startY + 100);

    doc.font("Times-Bold").fontSize(9).text("True Verification Services Private Limited.", 60, footerYBreak, {
      align: "center",
      width: contentWidth
    });
    doc.font("Times-Roman").fontSize(8).text(
      "Corporate Office: Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306, Tel: 9289977268, www.trueverificationservices.in",
      60,
      footerYBreak + 12,
      { align: "center", width: contentWidth }
    );

    doc.addPage();
    try {
      doc.image(path.join(__dirname, "uploads", "logo2.jpg"), 60, 40, { width: 140 });
    } catch (e) {}
    doc.y = 110;
    doc.font("Times-Bold").fontSize(14).text("ANNEXURE - A", { align: "center", underline: true });

    doc.font("Times-Bold").fontSize(9).text("True Verification Services Private Limited.", 60, footerYBreak, {
      align: "center",
      width: contentWidth
    });
    doc.font("Times-Roman").fontSize(8).text(
      "Corporate Office: Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306, Tel: 9289977268, www.trueverificationservices.in",
      60,
      footerYBreak + 12,
      { align: "center", width: contentWidth }
    );

    doc.addPage();
    try {
      doc.image(path.join(__dirname, "uploads", "logo2.jpg"), 60, 40, { width: 140 });
    } catch (e) {}
    doc.y = 110;
    doc.font("Times-Roman").fontSize(10);

    doc.text("Important Note:-");
    doc.moveDown();
    doc.text("*Prices exclusive of all applicable GST.");
    doc.moveDown();
    doc.text("*Fees charged by professional organizations, universities, institute and all third parties have to be bear by the customer.");
    doc.moveDown();
    doc.text(
      "*Photo ID Proof Signature will be provided for all A, B & C Category Cities (Metro and Non- Metro Cities) in condition wherever the applicant’s or applicant’s family members willing to provide the signature in the ID Proof while conducting Address Check."
    );
    doc.moveDown();
    doc.text("Residence Snapshot will be provided for all Metro City cases wherever it will be possible only for Address Check cases.");
    doc.moveDown();
    doc.text(
      "*Criminal/Police Record Check through Police Stations - Delhi NCR Locations Only, which comprises of Noida, Delhi, Ghaziabad, Faridabad and Gurgaon only (For Judicial Police Verification Cases)"
    );
    doc.moveDown();
    doc.text(
      "In India the criminal verification is done based on the address of the individual since in India there is no centralise database of criminal records. GENUINE tried to get in touch with the respective zonal police station and verifies whether the individual or candidate has any criminal record or any FIR laungh against him or not."
    );
    doc.moveDown();
    doc.text(
      "*Please note that there would be a certain percentages of cases specifically for Criminal Police and Education checks which might take comparatively some more time to be completed due to various factors the same would be intimated to the client during the course of verification."
    );

    doc.font("Times-Bold").fontSize(9).text("True Verification Services Private Limited.", 60, footerYBreak, {
      align: "center",
      width: contentWidth
    });
    doc.font("Times-Roman").fontSize(8).text(
      "Corporate Office: Tower-3 A 1321 Nx One Techno-IV Greater Noida West – 201306, Tel: 9289977268, www.trueverificationservices.in",
      60,
      footerYBreak + 12,
      { align: "center", width: contentWidth }
    );

    doc.end();
  } catch (err) {
    console.error("AGREEMENT PDF ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   SECURE ONE-TIME TRACK LINK
========================================================= */
 
app.get("/api/secure-track/:token", (req, res) => {
  try {
    const tokens    = readTokens();
    const cases     = readCases();
    const tokenData = tokens.find(t => t.token === req.params.token);
 
    if (!tokenData)
      return res.status(404).json({ success: false, message: "Invalid link" });
 
    if (tokenData.used)
      return res.status(403).json({ success: false, message: "Link already used" });
 
    if (Date.now() > tokenData.expiresAt)
      return res.status(403).json({ success: false, message: "Link expired" });
 
    const foundCase = cases.find(c => c.caseId === tokenData.caseId);
 
    if (!foundCase)
      return res.status(404).json({ success: false });
 
    tokenData.used = true;
    writeTokens(tokens);
 
    res.json({ success: true, caseId: foundCase.caseId, name: foundCase.name, status: foundCase.status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   PUBLIC TRACK CASE
========================================================= */
 
/* =========================================================
   PUBLIC TRACK CASE
========================================================= */
 
app.get("/api/track/:caseId", (req, res) => {
  try {
    const searchId = String(req.params.caseId).toLowerCase().trim();
    const cases = readCases();
    const found = cases.find(c => String(c.caseId).toLowerCase().trim() === searchId);

    if (!found) return res.json({ success: false });

    return res.json({
      success:            true,
      caseId:             found.caseId,
      name:               found.name,
      status:             found.status,
      clientName:         found.clientName        || "",
      clientCaseId:       found.clientCaseId      || "",
      gender:             found.gender             || "",
      dob:                found.dob                || "",
      checks:             found.checks             || [],
      verifiedDocuments:  found.verifiedDocuments  || [],
      qcApproved:         found.qcApproved         || false, 
      qcApprovedAt:       found.qcApprovedAt       || null,  
      reportGeneratedAt:  found.reportGeneratedAt  || null,  
      hasReport:          !!found.bgvReportKey,              
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});
 
/* =========================================================
   PUBLIC DOWNLOAD VERIFIED DOCUMENT
========================================================= */
 
app.get("/api/track/download/:caseId/:key", async (req, res) => {
  try {
    const searchId = String(req.params.caseId).toLowerCase().trim();
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);
 
    const cases = readCases();
    const found = cases.find(c => String(c.caseId).toLowerCase().trim() === searchId);
 
    if (!found) return res.status(404).json({ success: false });
 
    const doc = found.verifiedDocuments?.find(d => d.key === decodedKey);
 
    if (!doc) return res.status(404).json({ success: false });
 
    const command   = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: doc.key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    return res.redirect(signedUrl);
 
  } catch (err) {
    console.error("PUBLIC DOWNLOAD ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   PUBLIC DOWNLOAD BGV REPORT (any device, no auth needed)
========================================================= */

app.get("/api/track/report/:caseId", async (req, res) => {
  try {
    const searchId = String(req.params.caseId).toLowerCase().trim();
    const cases = readCases();
    const found = cases.find(c => String(c.caseId).toLowerCase().trim() === searchId);

    if (!found) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    if (!found.qcApproved && !found.sentToTrack) {
      return res.status(403).json({ success: false, message: "Report not yet approved" });
    }

    if (found.bgvReportKey) {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: found.bgvReportKey,
      });
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      return res.redirect(signedUrl);
    }

    const report = found.qcReport || found;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${found.caseId || "BGV"}_Report.pdf"`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(20).text("FINAL BACKGROUND REPORT", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Case ID: ${found.caseId || "-"}`);
    doc.text(`Candidate Name: ${found.name || report.name || "-"}`);
    doc.text(`Client Name: ${found.clientName || report.clientName || "-"}`);
    doc.text(`Status: ${found.status || "-"}`);
    doc.text(`Report Generated At: ${found.reportGeneratedAt || new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(15).text("Verification Checks", { underline: true });
    doc.moveDown(0.5);

    const checks = Array.isArray(report.checks) ? report.checks : [];
    if (checks.length) {
      checks.forEach((check, i) => doc.fontSize(11).text(`${i + 1}. ${check}`));
    } else {
      doc.fontSize(11).text("No checks found");
    }

    doc.moveDown();
    doc.fontSize(15).text("Remarks", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(report.finalRemarks || report.comments || "Verified as per provided details.");

    doc.end();
  } catch (err) {
    console.error("DOWNLOAD BGV REPORT ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
/* =========================================================
   ADMIN EXPORT EXCEL
========================================================= */
 
app.get("/api/admin/export", adminAuth, async (req, res) => {
  try {
    const cases    = readCases();
    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet("All Cases");
 
    sheet.columns = [
      { header: "Case ID",           key: "caseId",          width: 22 },
      { header: "Status",            key: "status",          width: 15 },
      { header: "Full Name",         key: "name",            width: 25 },
      { header: "DOB",               key: "dob",             width: 15 },
      { header: "Gender",            key: "gender",          width: 12 },
      { header: "pan",            key: "pan",          width: 12 },
      { header: "Father Name",       key: "fatherName",      width: 25 },
      { header: "Email",             key: "email",           width: 30 },
      { header: "Phone",             key: "phone",           width: 20 },
      { header: "Received Date",     key: "receivedDate",    width: 20 },
      { header: "Closed Date",       key: "closedDate",      width: 20 },
      { header: "Present Address",   key: "presentAddress",  width: 40 },
      { header: "Permanent Address", key: "permanentAddress",width: 40 },
      { header: "Company Name",      key: "company",         width: 25 },
      { header: "Designation",       key: "designation",     width: 25 },
      { header: "Duration",          key: "duration",        width: 20 },
      { header: "Employee ID",       key: "employeeId",      width: 20 },
      { header: "CTC",               key: "ctc",             width: 15 },
      { header: "Reporting Manager", key: "manager",         width: 25 },
      { header: "Reason for Leaving",key: "reasonLeaving",   width: 40 },
      { header: "Institution Name",  key: "institution",     width: 30 },
      { header: "University",        key: "university",      width: 30 },
      { header: "Degree",            key: "degree",          width: 25 },
      { header: "Year of Passing",   key: "year",            width: 20 },
      { header: "Registration No",   key: "registration",    width: 25 },
      { header: "Mode of Study",     key: "mode",            width: 20 },
      { header: "Criminal Details",  key: "criminalDetails", width: 50 },
      { header: "Created At",        key: "createdAt",       width: 25 }
    ];
 
    cases.forEach(c => {
      sheet.addRow({
        caseId:          c.caseId,
        status:          c.status,
        name:            c.name,
        dob:             c.dob,
        pan:             c.pan,
        gender:          c.gender,
        fatherName:      c.fatherName,
        email:           c.email,
        phone:           c.phone,
        receivedDate:    c.receivedDate,
        closedDate:      c.closedDate,
        presentAddress:  c.presentAddress,
        permanentAddress:c.permanentAddress,
        company:         c.company,
        designation:     c.designation,
        duration:        c.duration,
        employeeId:      c.employeeId,
        ctc:             c.ctc,
        manager:         c.manager,
        reasonLeaving:   c.reasonLeaving,
        institution:     c.institution,
        university:      c.university,
        degree:          c.degree,
        year:            c.year,
        registration:    c.registration,
        mode:            c.mode,
        criminalDetails: c.criminalDetails,
        createdAt:       c.createdAt
      });
    });
 
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=verification-cases.xlsx");
 
    await workbook.xlsx.write(res);
    res.end();
 
  } catch (err) {
    console.error("ADMIN EXPORT ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
app.get("/api/company/export", adminAuth, async (req, res) => {
  try {
    const cases    = readCases();
    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet("All Cases");
 
    sheet.columns = [
      { header: "Case ID",           key: "caseId",          width: 20 },
      { header: "Status",            key: "status",          width: 15 },
      { header: "Full Name",         key: "name",            width: 25 },
      { header: "Email",             key: "email",           width: 30 },
      { header: "Phone",             key: "phone",           width: 20 },
      { header: "Present Address",   key: "presentAddress",  width: 40 },
      { header: "Permanent Address", key: "permanentAddress",width: 40 },
      { header: "Company",           key: "company",         width: 25 },
      { header: "Designation",       key: "designation",     width: 25 },
      { header: "Duration",          key: "duration",        width: 20 },
      { header: "Employee ID",       key: "employeeId",      width: 20 },
      { header: "CTC",               key: "ctc",             width: 15 },
      { header: "Manager",           key: "manager",         width: 25 },
      { header: "Reason Leaving",    key: "reasonLeaving",   width: 30 },
      { header: "Institution",       key: "institution",     width: 25 },
      { header: "University",        key: "university",      width: 25 },
      { header: "Degree",            key: "degree",          width: 20 },
      { header: "Year",              key: "year",            width: 10 },
      { header: "Registration No",   key: "registration",    width: 20 },
      { header: "Mode",              key: "mode",            width: 15 },
      { header: "Criminal Details",  key: "criminalDetails", width: 40 },
      { header: "Created At",        key: "createdAt",       width: 25 }
    ];
 
    cases.forEach(c => {
      sheet.addRow({
        caseId:          c.caseId,
        status:          c.status,
        name:            c.name,
        email:           c.email,
        phone:           c.phone,
        presentAddress:  c.presentAddress,
        permanentAddress:c.permanentAddress,
        company:         c.company,
        designation:     c.designation,
        duration:        c.duration,
        employeeId:      c.employeeId,
        ctc:             c.ctc,
        manager:         c.manager,
        reasonLeaving:   c.reasonLeaving,
        institution:     c.institution,
        university:      c.university,
        degree:          c.degree,
        year:            c.year,
        registration:    c.registration,
        mode:            c.mode,
        criminalDetails: c.criminalDetails,
        createdAt:       c.createdAt
      });
    });
 
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=verification-cases.xlsx");
 
    await workbook.xlsx.write(res);
    res.end();
 
  } catch (err) {
    console.error("COMPANY EXPORT ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ✅ GET ALL CASES (QC PAGE)
app.get("/api/admin/cases", adminAuth, (req, res) => {
  try {
    const cases = readCases();
    res.json({
      success: true,
      cases: cases
    });
  } catch (err) {
    console.error("Fetch cases error:", err);
    res.status(500).json({ success: false });
  }
});
 
/* =========================================================
   DOWNLOAD ALL DOCUMENTS AS ZIP (ADMIN)
   ✅ FIX: Missing closing brace in original caused syntax error
========================================================= */
 
app.get("/admin/download-all/:caseId", adminAuth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const cases      = readCases();
    const found      = cases.find(c => c.caseId === caseId);
 
    if (!found)
      return res.status(404).json({ success: false });
 
    const archive = archiver("zip", { zlib: { level: 9 } });
    res.attachment(`${caseId}-documents.zip`);
    archive.pipe(res);
 
    const allDocs = [
      ...(found.documents        || []),
      ...(found.verifiedDocuments|| [])
    ];
 
    for (const doc of allDocs) {
      const command  = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: doc.key });
      const s3Object = await s3.send(command);
      archive.append(s3Object.Body, { name: doc.originalName });
    }
 
    await archive.finalize();
 
  } catch (err) {
    console.error("ZIP ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});




/* =========================================================
   UPLOAD BGV REPORT (ADMIN — QC approved, stored in S3)
   Called when QC team approves and sends report to track page
========================================================= */

app.post("/api/admin/upload-bgv-report/:caseId",
  adminAuth,
  s3Upload.single("file"),
  async (req, res) => {
    try {
      const cases = readCases();
      const index = cases.findIndex(c => c.caseId === req.params.caseId);

      if (index === -1)
        return res.status(404).json({ success: false, message: "Case not found" });

      const file = req.file;
      const key  = `reports/${req.params.caseId}-BGV-Report-${Date.now()}.pdf`;

      await s3.send(new PutObjectCommand({
        Bucket:      process.env.AWS_BUCKET_NAME,
        Key:         key,
        Body:        file.buffer,
        ContentType: "application/pdf",
      }));

      cases[index].bgvReportKey      = key;
      cases[index].qcApproved        = true;
      cases[index].qcApprovedAt      = new Date();
      cases[index].reportGeneratedAt = cases[index].reportGeneratedAt || new Date();

      writeCases(cases);
      logActivity(req.params.caseId, "BGV Report uploaded & QC approved", "ADMIN");

      return res.json({ success: true });
    } catch (err) {
      console.error("UPLOAD BGV REPORT ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);





// ADMIN — Create employee
app.post("/api/admin/create-employee", adminAuth, (req, res) => {
  try {
    const { name, email, password, assignedChecks } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password required" });
    }
    const employees = readEmployees();
    if (employees.find(e => e.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ success: false, message: "Employee with this email already exists" });
    }
    const newEmployee = {
      employeeId: "EMP-" + Date.now(),
      name,
      email,
      password,
      assignedChecks: Array.isArray(assignedChecks) ? assignedChecks : [],
      token: require("crypto").randomBytes(32).toString("hex"),
      createdAt: new Date(),
      active: true,
    };
    employees.push(newEmployee);
    writeEmployees(employees);
    const { password: _, token: __, ...safeEmployee } = newEmployee;
    return res.json({ success: true, employee: safeEmployee });
  } catch (err) {
    console.error("CREATE EMPLOYEE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// ADMIN — Get all employees
app.get("/api/admin/employees", adminAuth, (req, res) => {
  try {
    const employees = readEmployees().map(({ password, token, ...rest }) => rest);
    return res.json({ success: true, employees });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// ADMIN — Update employee
app.post("/api/admin/update-employee", adminAuth, (req, res) => {
  try {
    const { employeeId, name, email, password, assignedChecks, active } = req.body;
    const employees = readEmployees();
    const index = employees.findIndex(e => e.employeeId === employeeId);
    if (index === -1) return res.status(404).json({ success: false, message: "Employee not found" });
    if (name !== undefined) employees[index].name = name;
    if (email !== undefined) employees[index].email = email;
    if (password !== undefined && password !== "") employees[index].password = password;
    if (assignedChecks !== undefined) employees[index].assignedChecks = assignedChecks;
    if (active !== undefined) employees[index].active = active;
    employees[index].updatedAt = new Date();
    writeEmployees(employees);
    const { password: _, token: __, ...safeEmployee } = employees[index];
    return res.json({ success: true, employee: safeEmployee });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// ADMIN — Delete employee
app.delete("/api/admin/employees/:employeeId", adminAuth, (req, res) => {
  try {
    const employees = readEmployees();
    const index = employees.findIndex(e => e.employeeId === req.params.employeeId);
    if (index === -1) return res.status(404).json({ success: false, message: "Employee not found" });
    employees.splice(index, 1);
    writeEmployees(employees);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// EMPLOYEE — Login
app.post("/api/employee/login", (req, res) => {
  try {
    const { email, password } = req.body;
    const employees = readEmployees();
    const employee = employees.find(
      e => e.email.trim().toLowerCase() === email.trim().toLowerCase() &&
           e.password === password &&
           e.active !== false
    );
    if (!employee) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    return res.json({
      success: true,
      token: employee.token,
      employeeId: employee.employeeId,
      name: employee.name,
      assignedChecks: employee.assignedChecks,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// EMPLOYEE — Get my cases (only cases that contain my assigned checks)
app.get("/api/employee/cases", employeeAuth, (req, res) => {
  try {
    const { assignedChecks } = req.employee;
    const cases = readCases();
    // Filter cases that have at least one of the employee's assigned checks
    const myCases = cases.filter(c => {
      const caseChecks = Array.isArray(c.checks) ? c.checks : [];
      return caseChecks.some(check => assignedChecks.includes(check));
    }).map(c => {
      // Only expose the checks this employee is responsible for
      const caseChecks = Array.isArray(c.checks) ? c.checks : [];
      const myChecks = caseChecks.filter(ch => assignedChecks.includes(ch));
      return {
        caseId: c.caseId,
        name: c.name,
        clientName: c.clientName,
        status: c.status,
        receivedDate: c.receivedDate,
        dob: c.dob,
        gender: c.gender,
        checks: myChecks, // only their checks
        checkStatuses: c.checkStatuses || {},
        checkDocuments: c.checkDocuments || {},
        checkNotes: c.checkNotes || {},
      };
    });
    return res.json({ success: true, cases: myCases });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// EMPLOYEE — Get single case detail
app.get("/api/employee/case/:caseId", employeeAuth, (req, res) => {
  try {
    const { assignedChecks } = req.employee;
    const cases = readCases();
    const found = cases.find(c => String(c.caseId).trim() === String(req.params.caseId).trim());
    if (!found) return res.status(404).json({ success: false });
    const caseChecks = Array.isArray(found.checks) ? found.checks : [];
    const myChecks = caseChecks.filter(ch => assignedChecks.includes(ch));
    if (myChecks.length === 0) return res.status(403).json({ success: false, message: "Not authorized for this case" });
    return res.json({
      success: true,
      case: {
        ...found,
        checks: myChecks, // only their checks — never exposes other checks
        checkStatuses: found.checkStatuses || {},
        checkDocuments: found.checkDocuments || {},
        checkNotes: found.checkNotes || {},
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// EMPLOYEE — Update check status + notes for their assigned checks only
app.post("/api/employee/update-check", employeeAuth, (req, res) => {
  try {
    const { caseId, checkName, status, notes } = req.body;
    const { assignedChecks, name: employeeName, employeeId } = req.employee;
 
    // Guard: employee can only update their own checks
    if (!assignedChecks.includes(checkName)) {
      return res.status(403).json({ success: false, message: "Not authorized for this check" });
    }
 
    const cases = readCases();
    const index = cases.findIndex(c => String(c.caseId).trim() === String(caseId).trim());
    if (index === -1) return res.status(404).json({ success: false });
 
    if (!cases[index].checkStatuses) cases[index].checkStatuses = {};
    if (!cases[index].checkNotes) cases[index].checkNotes = {};
 
    cases[index].checkStatuses[checkName] = {
      status,
      updatedBy: employeeName,
      employeeId,
      updatedAt: new Date(),
    };
    if (notes !== undefined) cases[index].checkNotes[checkName] = notes;
    cases[index].updatedAt = new Date();
 
    writeCases(cases);
    logActivity(caseId, `Check "${checkName}" updated to "${status}" by ${employeeName}`, "EMPLOYEE");
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 
// EMPLOYEE — Upload document for their check
app.post("/api/employee/upload-check-doc/:caseId",
  employeeAuth,
  s3Upload.single("file"),
  async (req, res) => {
    try {
      const { checkName } = req.body;
      const { assignedChecks, name: employeeName, employeeId } = req.employee;
 
      if (!assignedChecks.includes(checkName)) {
        return res.status(403).json({ success: false, message: "Not authorized for this check" });
      }
 
      const cases = readCases();
      const index = cases.findIndex(c => String(c.caseId).trim() === String(req.params.caseId).trim());
      if (index === -1) return res.status(404).json({ success: false });
 
      const file = req.file;
      const key = `employee-docs/${req.params.caseId}-${checkName.replace(/\s+/g, "-")}-${Date.now()}-${file.originalname}`;
 
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
 
      if (!cases[index].checkDocuments) cases[index].checkDocuments = {};
      if (!cases[index].checkDocuments[checkName]) cases[index].checkDocuments[checkName] = [];
 
      cases[index].checkDocuments[checkName].push({
        originalName: file.originalname,
        key,
        uploadedBy: employeeName,
        employeeId,
        uploadedAt: new Date(),
      });
 
      writeCases(cases);
      logActivity(req.params.caseId, `Document uploaded for "${checkName}" by ${employeeName}`, "EMPLOYEE");
      return res.json({ success: true, key });
    } catch (err) {
      console.error("EMPLOYEE UPLOAD ERROR:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);
 
// EMPLOYEE — Get signed URLs for their check documents
app.post("/api/employee/get-signed-urls", employeeAuth, async (req, res) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) return res.json({ success: true, urls: [] });
    const urls = await Promise.all(keys.map(async (key) => {
      try {
        const command = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return { key, url };
      } catch { return { key, url: null }; }
    }));
    return res.json({ success: true, urls });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});



// COMPANY — Get their agreements
app.get("/api/company/agreements", companyAuth, (req, res) => {
  try {
    const agreements = readAgreements();
    const mine = agreements.filter(a => a.companyId === req.companyId);
    return res.json({ success: true, agreements: mine });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// COMPANY — Get their billing/pricing
app.get("/api/company/billing", companyAuth, (req, res) => {
  try {
    const companies = readCompanies();
    const cases = readCases();
    const company = companies.find(c => c.companyId === req.companyId);
    if (!company) return res.status(404).json({ success: false });

    const myCases = cases.filter(c => c.companyId === req.companyId);
    const pricing = normalizePricing(company.pricing || {});

    // Map check labels → pricing keys
    const CHECK_TO_PRICE_KEY = {
      "Employment Check":               "employment",
      "Residential Address Check":      "address",
      "Educational Qualification Check":"education",
      "Identity Check (PAN Card)":      "identity",
      "Identity Check (Aadhar Card)":   "identityAadhar",
      "Identity Check (Aadhar)":        "identityAadhar",
      "Criminal Police Record Check":   "criminal",
      "Criminal Database Check":        "criminalDb",
      "Credit Check":                   "credit",
    };

    let totalBilled = 0;

    const breakdown = myCases.map(c => {
      // First try totalCost, then recalculate from checks array
      let cost = c.totalCost || 0;

      if (cost === 0 && Array.isArray(c.checks) && c.checks.length > 0) {
        cost = c.checks.reduce((sum, checkLabel) => {
          const key = CHECK_TO_PRICE_KEY[checkLabel];
          return sum + (key ? (pricing[key] || 0) : 0);
        }, 0);
      }

      // Also try documents array
      if (cost === 0 && Array.isArray(c.documents) && c.documents.length > 0) {
        cost = c.documents.reduce((sum, doc) => {
          return sum + (pricing[doc.type] || 0);
        }, 0);
      }

      totalBilled += cost;
      return {
        caseId: c.caseId,
        name: c.name,
        status: c.status,
        cost,
        createdAt: c.createdAt,
        checks: c.checks || [],
      };
    });

    return res.json({
      success: true,
      pricing,
      totalBilled,
      breakdown,
      companyName: company.name,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// COMPANY — Download their BGV report
app.get("/api/company/report/:caseId", companyAuth, async (req, res) => {
  try {
    const cases = readCases();
    const found = cases.find(
      c => String(c.caseId) === String(req.params.caseId) && c.companyId === req.companyId
    );
    if (!found) return res.status(404).json({ success: false });
    if (!found.sentToTrack) return res.status(403).json({ success: false, message: "Report not ready" });
    const qcReport = found.qcReport || found;
    return res.json({ success: true, report: qcReport, case: found });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
 

/* =========================================================
   PUBLIC DOWNLOAD BGV REPORT (any device, no auth needed)
========================================================= */

/* =========================================================
   CANDIDATE PORTAL ROUTES
========================================================= */
// ── Register ──────────────────────────────────────────────────────────────
app.post("/api/candidate/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
 
    if (!name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: "All fields are required." });
    if (!/^\d{10}$/.test(phone))
      return res.status(400).json({ success: false, message: "Enter a valid 10-digit phone number." });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
 
    const candidates = readCandidates();
    if (candidates.find(c => c.email.toLowerCase() === email.toLowerCase()))
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
 
    const hashed = await bcrypt.hash(password, 10);
    const candidate = {
      id:           "CAND-" + Date.now(),
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      phone:        phone.trim(),
      password:     hashed,
      profileComplete: false,
      createdAt:    new Date().toISOString(),
      resumes:      [],
    };
    candidates.push(candidate);
    writeCandidates(candidates);
 
    const token = jwt.sign(
      { id: candidate.id, email: candidate.email, name: candidate.name },
      process.env.JWT_SECRET || "tervies_long_random_secret_2025",
      { expiresIn: "7d" }
    );
    res.json({ success: true, token, name: candidate.name, profileComplete: false });
  } catch (err) {
    console.error("candidate/register:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Login ─────────────────────────────────────────────────────────────────
app.post("/api/candidate/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required." });
 
    const candidates = readCandidates();
    const candidate  = candidates.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!candidate || !(await bcrypt.compare(password, candidate.password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });
 
    const token = jwt.sign(
      { id: candidate.id, email: candidate.email, name: candidate.name },
      process.env.JWT_SECRET || "tervies_long_random_secret_2025",
      { expiresIn: "7d" }
    );
    res.json({
      success:         true,
      token,
      name:            candidate.name,
      profileComplete: candidate.profileComplete || false,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Save / Update Profile ─────────────────────────────────────────────────
app.post("/api/candidate/profile", candidateAuth, (req, res) => {
  try {
    const {
      bio, city, linkedIn, portfolio,
      degree, college, graduationYear, percentage,
      desiredRole, experience, industry, skills,
    } = req.body;
 
    if (!bio || !city || !degree || !college || !graduationYear || !desiredRole || !experience || !industry)
      return res.status(400).json({ success: false, message: "All profile fields are required." });
    if (!Array.isArray(skills) || skills.length === 0)
      return res.status(400).json({ success: false, message: "Select at least one skill." });
 
    // Save to candidateProfiles.json
    const profiles = readCandidateProfiles();
    const existingIdx = profiles.findIndex(p => p.candidateId === req.candidate.id);
 
    const profileData = {
      candidateId:    req.candidate.id,
      name:           req.candidate.name,
      email:          req.candidate.email,
      bio:            (bio || "").trim(),
      city:           (city || "").trim(),
      linkedIn:       (linkedIn || "").trim(),
      portfolio:      (portfolio || "").trim(),
      degree:         (degree || "").trim(),
      college:        (college || "").trim(),
      graduationYear: graduationYear || "",
      percentage:     (percentage || "").trim(),
      desiredRole:    desiredRole || "",
      experience:     experience || "",
      industry:       industry || "",
      skills:         Array.isArray(skills) ? skills : [],
      updatedAt:      new Date().toISOString(),
    };
 
    if (existingIdx !== -1) {
      profiles[existingIdx] = { ...profiles[existingIdx], ...profileData };
    } else {
      profileData.createdAt = new Date().toISOString();
      profiles.push(profileData);
    }
    writeCandidateProfiles(profiles);
 
    // Mark profileComplete on candidate record
    const candidates = readCandidates();
    const candIdx    = candidates.findIndex(c => c.id === req.candidate.id);
    if (candIdx !== -1) {
      candidates[candIdx].profileComplete = true;
      writeCandidates(candidates);
    }
 
    res.json({ success: true });
  } catch (err) {
    console.error("candidate/profile POST:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Get Profile ───────────────────────────────────────────────────────────
app.get("/api/candidate/profile", candidateAuth, (req, res) => {
  try {
    const profiles = readCandidateProfiles();
    const profile  = profiles.find(p => p.candidateId === req.candidate.id) || null;
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Upload Resume ─────────────────────────────────────────────────────────
app.post("/api/candidate/upload-resume", candidateAuth, s3Upload.single("resume"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded." });
 
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.mimetype))
      return res.status(400).json({ success: false, message: "Only PDF, DOC, DOCX files are accepted." });
    if (file.size > 10 * 1024 * 1024)
      return res.status(400).json({ success: false, message: "File must be under 10 MB." });
 
    const key = `resumes/${req.candidate.id}-${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
 
    await s3.send(new PutObjectCommand({
      Bucket:      process.env.AWS_BUCKET_NAME,
      Key:         key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));
 
    const resumeRecord = {
      key,
      originalName: file.originalname,
      size:         file.size,
      uploadedAt:   new Date().toISOString(),
    };
 
    // Save to candidate record
    const candidates = readCandidates();
    const idx        = candidates.findIndex(c => c.id === req.candidate.id);
    if (idx !== -1) {
      candidates[idx].resumes = candidates[idx].resumes || [];
      candidates[idx].resumes.unshift(resumeRecord); // latest first
      writeCandidates(candidates);
    }
 
    // Also update candidateProfiles with latestResume for client browsing
    const profiles   = readCandidateProfiles();
    const profileIdx = profiles.findIndex(p => p.candidateId === req.candidate.id);
    if (profileIdx !== -1) {
      profiles[profileIdx].latestResume = resumeRecord;
      writeCandidateProfiles(profiles);
    }
 
    res.json({ success: true, key });
  } catch (err) {
    console.error("candidate/upload-resume:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── My Resumes ────────────────────────────────────────────────────────────
app.get("/api/candidate/my-resumes", candidateAuth, (req, res) => {
  try {
    const candidates = readCandidates();
    const candidate  = candidates.find(c => c.id === req.candidate.id);
    res.json({ success: true, resumes: candidate?.resumes || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
 
// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: CLIENT PORTAL ROUTES (NEW)
// These are BRAND NEW routes — add them after your existing client routes.
// They do NOT replace the old /api/client/login — add them separately or
// replace the old block entirely. The new register + onboarding are new.
// ═══════════════════════════════════════════════════════════════════════════
 // Client self-registers (no admin needed to create them first)
app.post("/api/client/register", async (req, res) => {
  try {
    const { contactName, companyName, email, password } = req.body;
 
    if (!contactName || !companyName || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required." });
 
    const clients = readClients();
    if (clients.find(c => c.email.toLowerCase() === email.toLowerCase()))
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
 
    const hashed = await bcrypt.hash(password, 10);
    const client = {
      id:              "CLT-" + Date.now(),
      contactName:     contactName.trim(),
      companyName:     companyName.trim(),
      name:            companyName.trim(),   // used by existing /api/client/cases matcher
      email:           email.trim().toLowerCase(),
      password:        hashed,
      assignedCaseIds: [],
      plan:            null,                 // set after plan selection
      createdAt:       new Date().toISOString(),
    };
    clients.push(client);
    writeClients(clients);
 
    const token = jwt.sign(
      { id: client.id, email: client.email, name: client.name, clientId: client.id },
      process.env.JWT_SECRET || "tervies_long_random_secret_2025",
      { expiresIn: "7d" }
    );
 
    res.json({
      success:     true,
      token,
      contactName: client.contactName,
      companyName: client.companyName,
      clientId:    client.id,
      plan:        null,
    });
  } catch (err) {
    console.error("client/register:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Also update your existing /api/client/login to return contactName + companyName + plan ──
// Find your existing app.post("/api/client/login", ...) and replace it with this:
 
app.post("/api/client/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required." });
 
    const clients = readClients();
    const client  = clients.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!client || !(await bcrypt.compare(password, client.password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });
 
    const token = jwt.sign(
      { id: client.id, email: client.email, name: client.name, clientId: client.id },
      process.env.JWT_SECRET || "tervies_long_random_secret_2025",
      { expiresIn: "7d" }
    );
 
    res.json({
      success:     true,
      token,
      contactName: client.contactName || client.name,
      companyName: client.companyName || client.name,
      clientId:    client.id,
      plan:        client.plan || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// POST /api/client/select-plan
// Client picks their plan (free / gold / premium) after registering
app.post("/api/client/select-plan", clientAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ["free", "gold", "premium"];
 
    if (!plan || !validPlans.includes(plan))
      return res.status(400).json({ success: false, message: "Invalid plan. Choose free, gold, or premium." });
 
    const clients = readClients();
    const idx     = clients.findIndex(c => c.id === req.client.clientId);
 
    if (idx === -1)
      return res.status(404).json({ success: false, message: "Client not found." });
 
    clients[idx].plan       = plan;
    clients[idx].planSetAt  = new Date().toISOString();
    writeClients(clients);
 
    res.json({ success: true, plan });
  } catch (err) {
    console.error("client/select-plan:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ── Client Onboarding (save industries + roles) ───────────────────────────
app.post("/api/client/onboarding", clientAuth, (req, res) => {
  try {
    const { companySize, website, description, industries, roles } = req.body;
 
    if (!industries || industries.length === 0)
      return res.status(400).json({ success: false, message: "Select at least one industry." });
    if (!roles || roles.length === 0)
      return res.status(400).json({ success: false, message: "Select at least one job role." });
 
    const accounts = readClientAccounts();
    const idx      = accounts.findIndex(a => a.id === req.client.id);
    if (idx === -1)
      return res.status(404).json({ success: false, message: "Account not found." });
 
    accounts[idx].companySize          = companySize || "";
    accounts[idx].website              = (website || "").trim();
    accounts[idx].description          = (description || "").trim();
    accounts[idx].industries           = Array.isArray(industries) ? industries : [];
    accounts[idx].roles                = Array.isArray(roles) ? roles : [];
    accounts[idx].onboardingComplete   = true;
    accounts[idx].onboardingCompletedAt = new Date().toISOString();
 
    writeClientAccounts(accounts);
    res.json({ success: true });
  } catch (err) {
    console.error("client/onboarding:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Browse Matching Candidates ─────────────────────────────────────────────
// Returns candidate profiles that match the client's selected industries / roles.
// Only candidates with a complete profile and at least one resume are returned.
app.get("/api/client/candidates", clientAuth, (req, res) => {
  try {
    const accounts = readClientAccounts();
    const account  = accounts.find(a => a.id === req.client.id);
 
    // Determine filter preferences
    const clientIndustries = account?.industries || [];
    const clientRoles      = account?.roles      || [];
 
    const profiles   = readCandidateProfiles();
    const candidates = readCandidates();
 
    // Match: candidate's industry OR desiredRole overlaps with client prefs
    const matched = profiles
      .filter(p => {
        // Must have at least one resume
        const cand = candidates.find(c => c.id === p.candidateId);
        if (!cand || !cand.resumes || cand.resumes.length === 0) return false;
 
        // If client has no preferences set, show all
        if (clientIndustries.length === 0 && clientRoles.length === 0) return true;
 
        const industryMatch = clientIndustries.length === 0 || clientIndustries.includes(p.industry);
        const roleMatch     = clientRoles.length === 0      || clientRoles.includes(p.desiredRole);
 
        return industryMatch || roleMatch;
      })
      .map(p => {
        // Never expose candidate email or phone to clients
        const { candidateId, ...safe } = p;
        return safe;
      });
 
    res.json({ success: true, candidates: matched });
  } catch (err) {
    console.error("client/candidates:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Client: Download Resume (signed S3 URL) ───────────────────────────────
// Reuses /api/client/resume-download — already exists in your server.js.
// No changes needed there — it accepts any S3 key and returns a signed URL.
 
 
// ── Admin: List all client accounts ───────────────────────────────────────
app.get("/api/admin/client-accounts", adminAuth, (req, res) => {
  try {
    const accounts = readClientAccounts().map(({ password, ...rest }) => rest);
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ── Admin: Delete a client account ───────────────────────────────────────
app.delete("/api/admin/client-accounts/:id", adminAuth, (req, res) => {
  try {
    const accounts = readClientAccounts();
    const idx      = accounts.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Account not found." });
    accounts.splice(idx, 1);
    writeClientAccounts(accounts);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ═══════════════════════════════════════════════════════════════════════════
// ADD THESE ROUTES TO server.js
// Place them right after your existing /api/candidate/my-resumes route
// ═══════════════════════════════════════════════════════════════════════════

// ── Data file path (add with your other file path constants) ─────────────────
// const CANDIDATE_CONSENTS_FILE = path.join(__dirname, "data", "candidateConsents.json");
// safeReadJSON(CANDIDATE_CONSENTS_FILE, []);  // add to startup initializer
// const readCandidateConsents  = () => safeReadJSON(CANDIDATE_CONSENTS_FILE, []);
// const writeCandidateConsents = (d) => safeWriteJSON(CANDIDATE_CONSENTS_FILE, d);


// ── Upload Intro Video ────────────────────────────────────────────────────────
app.post("/api/candidate/upload-intro-video", candidateAuth, s3Upload.single("introVideo"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded." });

    const allowed = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
    if (!allowed.includes(file.mimetype))
      return res.status(400).json({ success: false, message: "Only MP4, MOV, WEBM videos are accepted." });
    if (file.size > 100 * 1024 * 1024)
      return res.status(400).json({ success: false, message: "Video must be under 100 MB." });

    const key = `intro-videos/${req.candidate.id}-${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.AWS_BUCKET_NAME,
      Key:         key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));

    // Update candidateProfiles with video key
    const profiles   = readCandidateProfiles();
    const profileIdx = profiles.findIndex(p => p.candidateId === req.candidate.id);
    if (profileIdx !== -1) {
      profiles[profileIdx].introVideoKey        = key;
      profiles[profileIdx].introVideoUploadedAt = new Date().toISOString();
      writeCandidateProfiles(profiles);
    }

    res.json({ success: true, key });
  } catch (err) {
    console.error("candidate/upload-intro-video:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ── Save Consent ──────────────────────────────────────────────────────────────
app.post("/api/candidate/consent", candidateAuth, (req, res) => {
  try {
    const { consentBGV, consentPrivacy, consentSignature, consentDate } = req.body;

    if (!consentBGV || !consentPrivacy)
      return res.status(400).json({ success: false, message: "Both consents are required." });
    if (!consentSignature?.trim())
      return res.status(400).json({ success: false, message: "Electronic signature is required." });

    // Read or initialize consents file
    const CANDIDATE_CONSENTS_FILE = path.join(__dirname, "data", "candidateConsents.json");
    const consents = safeReadJSON(CANDIDATE_CONSENTS_FILE, []);

    const existingIdx = consents.findIndex(c => c.candidateId === req.candidate.id);
    const consentRecord = {
      candidateId:      req.candidate.id,
      email:            req.candidate.email,
      consentBGV:       !!consentBGV,
      consentPrivacy:   !!consentPrivacy,
      consentSignature: consentSignature.trim(),
      consentDate:      consentDate || new Date().toISOString().split("T")[0],
      signedAt:         new Date().toISOString(),
      ipAddress:        req.ip || "",
    };

    if (existingIdx !== -1) {
      consents[existingIdx] = consentRecord;
    } else {
      consents.push(consentRecord);
    }
    safeWriteJSON(CANDIDATE_CONSENTS_FILE, consents);

    // Also mark on candidateProfiles for quick access
    const profiles   = readCandidateProfiles();
    const profileIdx = profiles.findIndex(p => p.candidateId === req.candidate.id);
    if (profileIdx !== -1) {
      profiles[profileIdx].consentSigned    = true;
      profiles[profileIdx].consentSignedAt  = consentRecord.signedAt;
      profiles[profileIdx].consentSignature = consentSignature.trim();
      profiles[profileIdx].consentDate      = consentRecord.consentDate;
      writeCandidateProfiles(profiles);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("candidate/consent:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ── Get Consent (for dashboard) ───────────────────────────────────────────────
app.get("/api/candidate/consent", candidateAuth, (req, res) => {
  try {
    const CANDIDATE_CONSENTS_FILE = path.join(__dirname, "data", "candidateConsents.json");
    const consents = safeReadJSON(CANDIDATE_CONSENTS_FILE, []);
    const consent  = consents.find(c => c.candidateId === req.candidate.id) || null;
    res.json({ success: true, consent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ── Admin: View all consents ───────────────────────────────────────────────────
app.get("/api/admin/candidate-consents", adminAuth, (req, res) => {
  try {
    const CANDIDATE_CONSENTS_FILE = path.join(__dirname, "data", "candidateConsents.json");
    const consents = safeReadJSON(CANDIDATE_CONSENTS_FILE, []);
    res.json({ success: true, consents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── LINK: /api/client/cases ──────────────────────────────────────────────────
// Returns cases assigned to this client, with matching candidate resumes
// injected based on email match between case.email and candidate profile.
app.get("/api/client/cases", clientAuth, (req, res) => {
  try {
    const clients  = readClients();
    const client   = clients.find(c => c.id === req.client.clientId);
    if (!client) return res.status(404).json({ success: false, message: "Client not found." });

    const candidates    = readCandidates();
    const profiles      = readCandidateProfiles();
    const allCases      = readCases();

    // ── Determine filter preferences ─────────────────────────
    const clientIndustries = client.industries || [];
    const clientRoles      = client.roles      || [];
    const plan             = client.plan || "free";
    const RESUME_LIMITS    = { free: 2, gold: 5, premium: 10 };
    const limit            = RESUME_LIMITS[plan] || 2;

    // ── Find ALL candidates who have uploaded at least one resume ──
    const candidatesWithResumes = candidates.filter(c =>
      c.resumes && c.resumes.length > 0
    );

    // ── Match by industry/role if client has preferences ──────
    const matched = candidatesWithResumes.filter(cand => {
      const profile = profiles.find(p => p.candidateId === cand.id);
      if (!profile) return true; // show even without profile

      if (clientIndustries.length === 0 && clientRoles.length === 0) return true;

      const industryMatch = clientIndustries.length === 0 || clientIndustries.includes(profile.industry);
      const roleMatch     = clientRoles.length === 0      || clientRoles.includes(profile.desiredRole);

      return industryMatch || roleMatch;
    });

    // ── Build case-like objects for each matched candidate ────
    // Try to find an existing case for this candidate (by email match),
    // otherwise create a virtual entry from the candidate's profile.
    const results = matched.slice(0, limit).map(cand => {
      const profile  = profiles.find(p => p.candidateId === cand.id) || {};
      const caseData = allCases.find(c =>
        c.email?.toLowerCase() === cand.email?.toLowerCase()
      );

      return {
        caseId:    caseData?.caseId || cand.id,
        name:      cand.name,
        email:     cand.email,
        status:    caseData?.status || "SUBMITTED",
        receivedDate: caseData?.receivedDate || cand.createdAt,
        checks:    caseData?.checks || [],
        candidateResumes: cand.resumes.map(r => ({
          key:          r.key,
          originalName: r.originalName,
          size:         r.size,
          uploadedAt:   r.uploadedAt,
          uploadedBy:   cand.name,
        })),
        selectedResumeKey: caseData?.selectedResumeKey || null,
        candidateSummary: {
          desiredRole:  profile.desiredRole  || "",
          experience:   profile.experience   || "",
          industry:     profile.industry     || "",
          skills:       profile.skills       || [],
          city:         profile.city         || "",
          degree:       profile.degree       || "",
          college:      profile.college      || "",
        },
      };
    });

    return res.json({ success: true, cases: results });
  } catch (err) {
    console.error("CLIENT CASES ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── LINK: /api/client/resume-download ────────────────────────────────────────
// Returns a signed S3 URL so the client can download the resume directly.
app.get("/api/client/resume-download", clientAuth, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ success: false, message: "Key is required." });

    // Security: key must be under the resumes/ prefix
    if (!key.startsWith("resumes/")) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const command   = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    return res.json({ success: true, url: signedUrl });
  } catch (err) {
    console.error("CLIENT RESUME DOWNLOAD ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── LINK: /api/client/select-resume ──────────────────────────────────────────
// Client saves which resume they've chosen for a case.
app.post("/api/client/select-resume", clientAuth, (req, res) => {
  try {
    const { caseId, resumeKey } = req.body;
    if (!caseId || !resumeKey)
      return res.status(400).json({ success: false, message: "caseId and resumeKey are required." });

    const cases = readCases();
    const index = cases.findIndex(c => c.caseId === caseId);
    if (index === -1)
      return res.status(404).json({ success: false, message: "Case not found." });

    cases[index].selectedResumeKey = resumeKey;
    cases[index].updatedAt = new Date();
    writeCases(cases);

    logActivity(caseId, `Client selected resume: ${resumeKey}`, "CLIENT");
    return res.json({ success: true });
  } catch (err) {
    console.error("CLIENT SELECT RESUME ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 



/* =========================================================
   ADDRESS VERIFICATION PORTAL — SERVER ROUTES
   ─────────────────────────────────────────────────────────
   PASTE THIS ENTIRE BLOCK into server.js, just before the
   "START SERVER" section at the bottom.

   It adds:
     POST /api/address-verify/send-otp
     POST /api/address-verify/verify-otp
     POST /api/address-verify/submit        (multipart)
     GET  /api/address-verify/admin/all     (admin — list all submissions)
     GET  /api/address-verify/admin/:id     (admin — single submission)
     POST /api/address-verify/admin/send-link   (admin — send link to candidate)
     GET  /api/address-verify/report/:id    (admin — generate PDF report, same format as RGN)

   PREREQUISITES — already in your server.js, nothing new to install:
     express, nodemailer, pdfkit, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner,
     s3Upload (your existing multer-s3 middleware), crypto, path, fs
========================================================= */

/* ── data file ─────────────────────────────────────────────────────────── */
const ADDRESS_VERIFY_FILE = path.join(DATA_DIR, "addressVerifications.json");
safeReadJSON(ADDRESS_VERIFY_FILE, []);
const readAddressVerifications  = () => safeReadJSON(ADDRESS_VERIFY_FILE, []);
const writeAddressVerifications = (d) => safeWriteJSON(ADDRESS_VERIFY_FILE, d);

/* ── in-memory OTP store (fine for single-server; swap to Redis for scale) */
const OTP_STORE = new Map(); // phone → { otp, expiresAt, verified }

/* ── generate + email/SMS OTP ─────────────────────────────────────────── */
app.post("/api/address-verify/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!/^\d{10}$/.test(phone))
      return res.status(400).json({ success: false, message: "Enter a valid 10-digit phone number." });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    OTP_STORE.set(phone, { otp, expiresAt: Date.now() + 10 * 60 * 1000, verified: false });

    console.log(`[OTP] ${phone} → ${otp}`); // remove in production

    /* ── Send via email if candidate has email on record ──────────────
       (In production, replace with SMS gateway — Twilio, MSG91, etc.)
       For now we log the OTP and optionally email it if email is known. */

    // Try to find candidate email from cases (optional, best-effort)
    const cases = readCases();
    const caseMatch = cases.find(c => c.phone === phone || c.phone === `+91${phone}`);
    const emailTo = caseMatch?.email;

    if (emailTo) {
      try {
        await transporter.sendMail({
          from:    process.env.EMAIL_USER,
          to:      emailTo,
          subject: "TrueVerify — Your Address Verification OTP",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#f8fafc;border-radius:10px">
              <div style="background:#1e3a8a;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;text-align:center">
                <strong>True Verification Services</strong><br>
                <small>Residential Address Verification</small>
              </div>
              <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px">
                <p>Your OTP for address verification:</p>
                <div style="font-size:36px;font-weight:900;letter-spacing:10px;text-align:center;color:#1e3a8a;padding:16px 0">${otp}</div>
                <p style="font-size:12px;color:#64748b">Valid for 10 minutes. Do not share with anyone.</p>
              </div>
            </div>`,
        });
      } catch (mailErr) {
        console.error("OTP email error:", mailErr.message);
      }
    }

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── verify OTP ────────────────────────────────────────────────────────── */
app.post("/api/address-verify/verify-otp", (req, res) => {
  try {
    const { phone, otp } = req.body;
    const record = OTP_STORE.get(phone);

    if (!record)
      return res.status(400).json({ success: false, message: "OTP not sent or expired. Please request again." });

    if (Date.now() > record.expiresAt) {
      OTP_STORE.delete(phone);
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    if (record.otp !== String(otp))
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });

    record.verified = true;

    // Issue a short-lived token so the submit step is authenticated
    const token = jwt.sign(
      { phone, purpose: "address-verify" },
      process.env.JWT_SECRET || "tervies_long_random_secret_2025",
      { expiresIn: "30m" }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── submit verification (multipart) ──────────────────────────────────── */
app.post(
  "/api/address-verify/submit",
  s3Upload.fields([
    { name: "selfie",       maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "housePic",     maxCount: 1 },
    { name: "landmarkPic",  maxCount: 1 },
    { name: "signature",    maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const formData = JSON.parse(req.body.form || "{}");
      const authToken = req.body.authToken;
      const files = req.files || {};

      // Validate OTP token
      let phone = formData.phone;
      if (authToken) {
        try {
          const decoded = jwt.verify(authToken, process.env.JWT_SECRET || "tervies_long_random_secret_2025");
          if (decoded.purpose !== "address-verify")
            return res.status(403).json({ success: false, message: "Invalid verification token." });
          phone = decoded.phone;
        } catch {
          return res.status(403).json({ success: false, message: "Session expired. Please re-verify OTP." });
        }
      }

      if (!formData.presentAddress || !formData.name)
        return res.status(400).json({ success: false, message: "Required fields missing." });

      if (!files.selfie || !files.addressProof || !files.housePic)
        return res.status(400).json({ success: false, message: "Selfie, Address Proof and House Photo are required." });

      const verificationId = "AVR-" + Date.now();
      const capturedAt = new Date().toISOString();
      const gps = formData.gps || null;

      /* ── Upload all photos to S3 ───────────────────────────────────── */
      const photoKeys = {};
      const PHOTO_FIELDS = ["selfie", "addressProof", "housePic", "landmarkPic", "signature"];

      for (const field of PHOTO_FIELDS) {
        const fileArr = files[field];
        if (!fileArr || fileArr.length === 0) continue;
        const file = fileArr[0];
        const key = `address-verify/${verificationId}-${field}-${Date.now()}${path.extname(file.originalname) || ".jpg"}`;

        await s3.send(new PutObjectCommand({
          Bucket:      process.env.AWS_BUCKET_NAME,
          Key:         key,
          Body:        file.buffer,
          ContentType: file.mimetype,
        }));

        photoKeys[field] = key;
      }

      /* ── Build verification record ─────────────────────────────────── */
      const record = {
        verificationId,
        phone,
        name:              formData.name         || "",
        email:             formData.email         || "",
        fatherName:        formData.fatherName    || "",
        dob:               formData.dob           || "",
        gender:            formData.gender        || "",
        caseId:            formData.caseId        || "",
        verifierName:      formData.verifierName  || "",
        relationWithVerifier: formData.relationWithVerifier || "",
        presentAddress:    formData.presentAddress || "",
        permanentAddress:  formData.permanentAddress || "",
        periodOfStayFrom:  formData.periodOfStayFrom || "",
        periodOfStayTo:    formData.periodOfStayTo || "",
        natureOfResidence: formData.natureOfResidence || "Owned",
        nearestLandmark:   formData.nearestLandmark || "",
        addressType:       formData.addressType   || "Permanent",
        gps,
        photoKeys,
        status:            "SUBMITTED",    // SUBMITTED → VERIFIED / DISCREPANCY
        capturedAt,
        submittedAt:       new Date().toISOString(),
        reviewedBy:        null,
        reviewedAt:        null,
        remarks:           "",
      };

      /* ── Save to address verifications file ────────────────────────── */
      const avrs = readAddressVerifications();
      avrs.unshift(record);
      writeAddressVerifications(avrs);

      /* ── If caseId provided, attach verificationId to the case ────────  */
      if (formData.caseId) {
        const cases = readCases();
        const idx = cases.findIndex(c => String(c.caseId) === String(formData.caseId));
        if (idx !== -1) {
          cases[idx].addressVerificationId = verificationId;
          cases[idx].addressVerificationStatus = "SUBMITTED";
          cases[idx].addressVerifiedAt = null;
          writeCases(cases);
        }
      }

      logActivity(verificationId, `Address verification submitted by ${formData.name}`, "CANDIDATE");

      /* ── Notify admin ──────────────────────────────────────────────── */
      if (process.env.ADMIN_EMAIL) {
        transporter.sendMail({
          from:    process.env.EMAIL_USER,
          to:      process.env.ADMIN_EMAIL,
          subject: `New Address Verification Submitted — ${formData.name}`,
          html: `<p>New address verification submitted.</p>
                 <p><b>ID:</b> ${verificationId}<br>
                 <b>Name:</b> ${formData.name}<br>
                 <b>Phone:</b> ${phone}<br>
                 <b>Address:</b> ${formData.presentAddress}<br>
                 <b>Case ID:</b> ${formData.caseId || "N/A"}</p>`,
        }).catch(e => console.error("Admin notify email error:", e.message));
      }

      res.json({ success: true, verificationId });
    } catch (err) {
      console.error("ADDRESS VERIFY SUBMIT ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── ADMIN — list all address verifications ────────────────────────────── */
app.get("/api/address-verify/admin/all", adminAuth, (req, res) => {
  try {
    const avrs = readAddressVerifications();
    res.json({ success: true, verifications: avrs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── ADMIN — get single verification ────────────────────────────────────── */
app.get("/api/address-verify/admin/:id", adminAuth, (req, res) => {
  try {
    const avrs = readAddressVerifications();
    const found = avrs.find(a => a.verificationId === req.params.id);
    if (!found) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, verification: found });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── ADMIN — update status (VERIFIED / DISCREPANCY / INSUFFICIENT) ──────── */
app.post("/api/address-verify/admin/update-status", adminAuth, (req, res) => {
  try {
    const { verificationId, status, remarks } = req.body;
    const avrs = readAddressVerifications();
    const idx = avrs.findIndex(a => a.verificationId === verificationId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Not found" });

    avrs[idx].status     = status;
    avrs[idx].remarks    = remarks || "";
    avrs[idx].reviewedAt = new Date().toISOString();
    writeAddressVerifications(avrs);

    // Sync to case if linked
    if (avrs[idx].caseId) {
      const cases = readCases();
      const cIdx = cases.findIndex(c => String(c.caseId) === String(avrs[idx].caseId));
      if (cIdx !== -1) {
        cases[cIdx].addressVerificationStatus = status;
        cases[cIdx].addressVerifiedAt = new Date().toISOString();
        writeCases(cases);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── ADMIN — send address verification link to candidate ─────────────────── */
app.post("/api/address-verify/admin/send-link", adminAuth, async (req, res) => {
  try {
    const { name, email, phone, caseId, clientName } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    const portalLink =
      `https://tervies.info/address-verify` +
      `?name=${encodeURIComponent(name || "")}` +
      `&phone=${encodeURIComponent(phone || "")}` +
      `&caseId=${encodeURIComponent(caseId || "")}` +
      `&email=${encodeURIComponent(email || "")}`;

    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: "Action Required: Complete Your Residential Address Verification",
      html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:30px">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1)">
          <div style="background:#1e3a8a;color:#fff;padding:20px;text-align:center">
            <h2 style="margin:0">True Verification Services</h2>
            <p style="margin:4px 0 0;font-size:13px;opacity:.8">Residential Address Verification</p>
          </div>
          <div style="padding:28px">
            <p style="font-size:15px">Dear <b>${name || "Candidate"}</b>,</p>
            <p style="font-size:14px;line-height:1.7;color:#444">
              You are required to complete your <b>Residential Address Verification</b> as part of your Background Verification (BGV) process.
            </p>
            ${clientName ? `<p style="font-size:13px;color:#555"><b>Client:</b> ${clientName}</p>` : ""}
            ${caseId ? `<p style="font-size:13px;color:#555"><b>Case ID:</b> ${caseId}</p>` : ""}
            <p style="font-size:14px;color:#444;line-height:1.6">Please use the link below on your <b>mobile phone</b>. You will need to:</p>
            <ul style="font-size:13px;color:#555;line-height:2">
              <li>Verify your mobile number with OTP</li>
              <li>Allow GPS/location access</li>
              <li>Take a selfie at your residence</li>
              <li>Upload address proof (Aadhaar/Voter ID)</li>
              <li>Take photos of your house and surroundings</li>
              <li>Provide a digital signature</li>
            </ul>
            <div style="text-align:center;margin:28px 0">
              <a href="${portalLink}"
                 style="background:#2563eb;color:#fff;padding:14px 32px;font-size:15px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:700">
                🏠 Start Address Verification
              </a>
            </div>
            <p style="font-size:12px;color:#888">This link is intended for <b>${name || "you"}</b>. Please do not share it with anyone. The verification must be completed from your current residence location.</p>
            <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0">
            <p style="font-size:11px;color:#999">True Verification Services Pvt. Ltd. | Greater Noida West – 201306 | www.trueverificationservices.in</p>
          </div>
        </div>
      </div>`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("SEND ADDRESS VERIFY LINK ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── ADMIN — generate signed URLs for photos ─────────────────────────────── */
app.post("/api/address-verify/admin/get-photo-urls", adminAuth, async (req, res) => {
  try {
    const { verificationId } = req.body;
    const avrs = readAddressVerifications();
    const found = avrs.find(a => a.verificationId === verificationId);
    if (!found) return res.status(404).json({ success: false });

    const urls = {};
    for (const [field, key] of Object.entries(found.photoKeys || {})) {
      try {
        const cmd = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key });
        urls[field] = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
      } catch { urls[field] = null; }
    }

    res.json({ success: true, urls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── ADMIN — generate PDF report (matching RGN format) ──────────────────── */
/* ══════════════════════════════════════════════════════════════════════════
   REPLACE your existing app.get("/api/address-verify/report/:id", ...)
   Fixes:
   1. Row heights auto-calculated to fit wrapped text — no overlap/collapse
   2. Tervies logo in header instead of logo2.jpg
   3. Map is full content width (CW), same height (120px)
══════════════════════════════════════════════════════════════════════════ */

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? require("https") : require("http");
    mod.get(url, { headers: { "User-Agent": "TrueVerify-BGV/1.0" } }, (resp) => {
      const chunks = [];
      resp.on("data", (c) => chunks.push(c));
      resp.on("end",  () => resolve(Buffer.concat(chunks)));
      resp.on("error", reject);
    }).on("error", reject);
  });
}

function lonLatToTile(lon, lat, z) {
  const n      = Math.pow(2, z);
  const x      = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y      = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

async function fetchOSMTile(lat, lng, zoom = 15) {
  try {
    const { x, y } = lonLatToTile(lng, lat, zoom);
    return await fetchBuffer(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
  } catch (e) {
    console.error("OSM tile error:", e.message);
    return null;
  }
}

app.get("/api/address-verify/report/:id", adminAuth, async (req, res) => {
  try {
    const avrs = readAddressVerifications();
    const avr  = avrs.find(a => a.verificationId === req.params.id);
    if (!avr) return res.status(404).json({ success: false, message: "Not found." });

    /* ── S3 photo buffers ─────────────────────────────────────────── */
    const photoBuffers = {};
    const PHOTO_LABELS = {
      selfie: "Selfie", addressProof: "Address Proof",
      housePic: "House Picture", landmarkPic: "Landmark Picture", signature: "Signature",
    };
    for (const [field, key] of Object.entries(avr.photoKeys || {})) {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
        const chunks = [];
        for await (const c of obj.Body) chunks.push(c);
        photoBuffers[field] = Buffer.concat(chunks);
      } catch (e) { console.error(`S3 ${field}:`, e.message); }
    }

    /* ── OSM tile ─────────────────────────────────────────────────── */
    let mapBuf = null;
    if (avr.gps?.lat && avr.gps?.lng)
      mapBuf = await fetchOSMTile(parseFloat(avr.gps.lat), parseFloat(avr.gps.lng), 15);

    /* ── Formatters ───────────────────────────────────────────────── */
    const fmtDate = (iso) => {
      if (!iso) return "N/A";
      try { return new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); }
      catch { return String(iso); }
    };
    const fmtDateTime = (iso) => {
      if (!iso) return "N/A";
      try { return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" }); }
      catch { return String(iso); }
    };

    const gLat   = avr.gps ? parseFloat(avr.gps.lat) : null;
    const gLng   = avr.gps ? parseFloat(avr.gps.lng) : null;
    const gpsStr = gLat !== null ? `${gLat.toFixed(8)}, ${gLng.toFixed(8)}` : "N/A";
    const accKm  = avr.gps?.accuracy ? (parseFloat(avr.gps.accuracy)/1000).toFixed(3) : "0.000";

    /* ══════════════════════════════════════════════════════════════
       PDF SETUP
    ══════════════════════════════════════════════════════════════ */
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${avr.verificationId}-Address-Report.pdf`);
    doc.pipe(res);

    const PW = 595.28;
    const PH = 841.89;
    const ML = 36;
    const CW = PW - ML * 2;  // 523.28

    // Column layout for 2-col rows:
    // | KEY1 (90) | VAL1 (170) | KEY2 (110) | VAL2 (remaining) |
    const K1W = 90;   // left key width
    const V1W = 162;  // left value width
    const K2W = 110;  // right key width
    const V2W = CW - K1W - V1W - K2W - 5; // right value width ~116
    // divider X positions
    const D1 = ML + K1W;           // after left key
    const D2 = ML + K1W + V1W;     // after left value (= start of right key)
    const D3 = ML + K1W + V1W + K2W; // after right key

    // Full-row divider
    const FK = 150; // full row key width

    let pageNum = 1;

    /* ── helper: measure text height given width & font ─────────────
       PDFKit doesn't expose this natively, so we estimate:
       chars-per-line × line-height                                  */
    const estimateH = (text, width, fontSize) => {
      const charsPerLine = Math.floor(width / (fontSize * 0.52));
      const lines = Math.ceil(String(text || "").length / Math.max(1, charsPerLine));
      return Math.max(1, lines) * (fontSize + 3);
    };

    /* ── Header ─────────────────────────────────────────────────── */
    const drawHeader = () => {
  // Tervies logo top-left — using the correct path from dist/assets
  try {
    doc.image(path.join(__dirname, "..", "frontend", "dist", "assets", "logoo-MySvA9zV.png"), ML, 6, { height: 90 });
  } catch (e) {
    console.error("Tervies logo error:", e.message);
  }
  // Title top-right italic bold
  doc.fillColor("#1e3a8a").font("Helvetica-BoldOblique").fontSize(13)
     .text("Residential Address Verification Report", ML, 16, { width: CW, align: "right", lineBreak: false });
  doc.fillColor("#374151").font("Helvetica").fontSize(9)
     .text(fmtDateTime(avr.submittedAt), ML, 34, { width: CW, align: "right", lineBreak: false });
  // Divider line
  doc.rect(0, 80, PW, 1).fillColor("#9ca3af").fill();
};

    /* ── Footer ─────────────────────────────────────────────────── */
    const drawFooter = (n) => {
      const FY = PH - 28;
      doc.rect(ML, FY - 4, CW, 0.5).fillColor("#d1d5db").fill();
      doc.fillColor("#6b7280").font("Helvetica").fontSize(7.5)
         .text(`Page ${n}`, ML, FY, { width: CW, align: "right", lineBreak: false });
    };

    /* ── Section bar ─────────────────────────────────────────────── */
    const secBar = (label, y) => {
      doc.rect(ML, y, CW, 20).fillColor("#1e5799").fill();
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9)
         .text(label, ML+7, y+6, { width: CW-14, lineBreak: false });
      return y + 20;
    };

    /* ── Full-width single row — height auto-fits content ─────────── */
    const fullRow = (key, val, y, shade) => {
      const valStr = String(val ?? "N/A");
      // calculate needed height for value text
      const valH   = estimateH(valStr, CW - FK - 12, 8);
      const RH     = Math.max(20, valH + 8);

      if (shade) doc.rect(ML, y, CW, RH).fillColor("#f0f4ff").fill();
      doc.rect(ML, y, CW, RH).strokeColor("#c7d7f0").lineWidth(0.4).stroke();
      doc.moveTo(ML+FK, y).lineTo(ML+FK, y+RH).strokeColor("#c7d7f0").lineWidth(0.4).stroke();

      doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(8.5)
         .text(String(key), ML+5, y+6, { width: FK-8, lineBreak: false });
      doc.fillColor("#1a1a1a").font("Helvetica").fontSize(8.5)
         .text(valStr, ML+FK+5, y+6, { width: CW-FK-10, lineBreak: true });
      return y + RH;
    };

    /* ── Two-column row — height auto-fits tallest cell ──────────── */
    const twoColRow = (k1, v1, k2, v2, y, shade) => {
      const s1 = String(v1 ?? "N/A");
      const s2 = String(v2 ?? "N/A");
      const h1 = estimateH(s1, V1W - 6, 8);
      const h2 = estimateH(s2, V2W - 6, 8);
      const RH = Math.max(20, Math.max(h1, h2) + 8);

      if (shade) doc.rect(ML, y, CW, RH).fillColor("#f0f4ff").fill();
      doc.rect(ML, y, CW, RH).strokeColor("#c7d7f0").lineWidth(0.4).stroke();

      // vertical dividers
      [D1, D2, D3].forEach(dx => {
        doc.moveTo(dx, y).lineTo(dx, y+RH).strokeColor("#c7d7f0").lineWidth(0.4).stroke();
      });

      // left key
      doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(8.5)
         .text(String(k1), ML+5, y+6, { width: K1W-8, lineBreak: true });
      // left value
      doc.fillColor("#1a1a1a").font("Helvetica").fontSize(8.5)
         .text(s1, D1+5, y+6, { width: V1W-8, lineBreak: true });
      // right key
      doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(8.5)
         .text(String(k2), D2+5, y+6, { width: K2W-8, lineBreak: true });
      // right value
      doc.fillColor("#1a1a1a").font("Helvetica").fontSize(8.5)
         .text(s2, D3+5, y+6, { width: V2W-8, lineBreak: true });

      return y + RH;
    };

    /* ══════════════════════════════════════════════════════════════
       PAGE 1
    ══════════════════════════════════════════════════════════════ */
    doc.addPage({ size: "A4", margin: 0 });
    drawHeader();

    let y = 120;

    y = secBar("Candidate Residential Address Detail", y);
    y = fullRow("Profile Name",  avr.name,            y, false);
    y = fullRow("Address",       avr.presentAddress,  y, true);

    y = twoColRow(
      "Client Name",    avr.clientName || "True Verification Services Pvt. Ltd.",
      "Relation With Verifier", avr.relationWithVerifier,
      y, false
    );
    y = twoColRow(
      "Mobile",         avr.phone,
      "Reference ID",   avr.caseId || "NA",
      y, true
    );
    y = twoColRow(
      "Period of Stay", `${fmtDate(avr.periodOfStayFrom)} - ${fmtDate(avr.periodOfStayTo)}`,
      "Verification Date", fmtDateTime(avr.submittedAt),
      y, false
    );
    y = twoColRow(
      "Verifier Name",  avr.verifierName,
      "Nature of Residence", avr.natureOfResidence,
      y, true
    );
    y = twoColRow(
      "Nearest Landmark", avr.nearestLandmark || "NA",
      "Status", avr.status === "SUBMITTED" ? "Pass" : (avr.status || "N/A"),
      y, false
    );

    y += 12;

    /* ── Map table ───────────────────────────────────────────────── */
    y = secBar("Address shown on the map", y);

    // Column widths: Address(wide) | Source | Distance | Location API | Legend
    const mcw = [CW*0.44, CW*0.14, CW*0.11, CW*0.22, CW*0.09];
    const mcx = [ML, ML+mcw[0], ML+mcw[0]+mcw[1], ML+mcw[0]+mcw[1]+mcw[2], ML+mcw[0]+mcw[1]+mcw[2]+mcw[3]];

    // header
    doc.rect(ML, y, CW, 18).fillColor("#e8f0fb").fill();
    doc.rect(ML, y, CW, 18).strokeColor("#c7d7f0").lineWidth(0.4).stroke();
    ["Address","Source","Distance","Location API","Legend"].forEach((h, i) => {
      doc.fillColor("#1e3a8a").font("Helvetica-Bold").fontSize(8)
         .text(h, mcx[i]+4, y+5, { width: mcw[i]-8, lineBreak: false });
      if (i > 0) doc.moveTo(mcx[i], y).lineTo(mcx[i], y+18).strokeColor("#c7d7f0").lineWidth(0.4).stroke();
    });
    y += 18;

    // data rows — auto height for address cell
    [
      [avr.presentAddress, "Input address", "0km",        "Google Location API", "#f97316"],
      [gpsStr,             "GPS",           `${accKm}Km`, "Google Location API", "#3b82f6"],
    ].forEach((row, ri) => {
      const addrH = estimateH(String(row[0]), mcw[0]-8, 8);
      const RH    = Math.max(20, addrH + 8);

      doc.rect(ML, y, CW, RH).fillColor(ri%2===0?"#ffffff":"#f5f8ff").fill();
      doc.rect(ML, y, CW, RH).strokeColor("#c7d7f0").lineWidth(0.4).stroke();

      row.slice(0,4).forEach((cell, ci) => {
        if (ci > 0) doc.moveTo(mcx[ci], y).lineTo(mcx[ci], y+RH).strokeColor("#c7d7f0").lineWidth(0.4).stroke();
        doc.fillColor("#1a1a1a").font("Helvetica").fontSize(8)
           .text(String(cell), mcx[ci]+4, y+6, { width: mcw[ci]-8, lineBreak: true });
      });
      doc.rect(mcx[4]+6, y+(RH-10)/2, 14, 10).fillColor(row[4]).fill();
      y += RH;
    });

    y += 12;

    /* ── OSM Map — full content width, 120px tall ────────────────── */
   // Calculate safe map height so it never hits the footer
const FOOTER_Y = PH - 35;
const MAP_H = Math.min(300, FOOTER_Y - y - 10);

    if (mapBuf) {
  // If map won't fit, start a new page
  if (y + MAP_H > PH - 40) {
    drawFooter(pageNum);
    pageNum++;
    doc.addPage({ size: "A4", margin: 0 });
    drawHeader();
    y = 92;
  }
  try {
    doc.image(mapBuf, ML, y, { width: CW, height: MAP_H });
      } catch {}

      // Map/Satellite tabs (top-left)
      doc.rect(ML+3, y+3, 88, 18).fillColor("#ffffff").fill();
      doc.rect(ML+3, y+3, 88, 18).strokeColor("#d1d5db").lineWidth(0.5).stroke();
      doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(7.5)
         .text("Map", ML+8, y+7, { width: 28, lineBreak: false });
      doc.rect(ML+3, y+3, 42, 18).strokeColor("#4285f4").lineWidth(1.2).stroke();
      doc.fillColor("#555555").font("Helvetica").fontSize(7.5)
         .text("Satellite", ML+47, y+7, { width: 38, lineBreak: false });

      // Orange circle (input address)
      const cx2 = ML + CW * 0.42;
      const cy2 = y + MAP_H * 0.45;
      const R1  = MAP_H * 0.30;
      doc.circle(cx2, cy2, R1).fillOpacity(0.20).fillColor("#f97316").fill();
      doc.circle(cx2, cy2, R1).fillOpacity(1).strokeColor("#f97316").lineWidth(1.2).stroke();

      // Blue circle (GPS) offset right
      const R2 = MAP_H * 0.24;
      const ox = CW * 0.06;
      doc.circle(cx2+ox, cy2, R2).fillOpacity(0.20).fillColor("#3b82f6").fill();
      doc.circle(cx2+ox, cy2, R2).fillOpacity(1).strokeColor("#3b82f6").lineWidth(1.2).stroke();

      doc.fillOpacity(1);

      // Orange pin
      doc.circle(cx2, cy2, 5).fillColor("#f97316").fill();
      doc.circle(cx2, cy2, 5).strokeColor("#ffffff").lineWidth(1.5).stroke();
      doc.circle(cx2, cy2, 2).fillColor("#ffffff").fill();

      // Blue pin
      doc.circle(cx2+ox, cy2, 5).fillColor("#3b82f6").fill();
      doc.circle(cx2+ox, cy2, 5).strokeColor("#ffffff").lineWidth(1.5).stroke();
      doc.circle(cx2+ox, cy2, 2).fillColor("#ffffff").fill();

      // Border
      doc.rect(ML, y, CW, MAP_H).strokeColor("#c7d7f0").lineWidth(0.8).stroke();

      // Attribution bar
     
      y += MAP_H + 8;
    } else {
      doc.rect(ML, y, CW, MAP_H).fillColor("#f1f5f9").fill();
      doc.rect(ML, y, CW, MAP_H).strokeColor("#c7d7f0").lineWidth(0.8).stroke();
      doc.fillColor("#9ca3af").font("Helvetica").fontSize(10)
         .text("Map not available", ML, y+MAP_H/2-7, { width: CW, align: "center", lineBreak: false });
      y += MAP_H + 8;
    }

    drawFooter(pageNum);

    /* ══════════════════════════════════════════════════════════════
       PAGE 2+ — 2×2 PHOTO GRID
       Caption below each photo: Label | Location | Time
    ══════════════════════════════════════════════════════════════ */
    const PHOTO_ORDER    = ["selfie","addressProof","housePic","landmarkPic","signature"];
    const photosToRender = PHOTO_ORDER.filter(f => !!photoBuffers[f]);

    if (photosToRender.length > 0) {
      pageNum++;
      doc.addPage({ size: "A4", margin: 0 });
      drawHeader();

      const COL_GAP = 12;
      const PHOTO_W = (CW - COL_GAP) / 2;
      const PHOTO_H = 178;
      const CAP_H   = 44;
      const CELL_H  = PHOTO_H + CAP_H;
      const ROW_GAP = 12;

      let gY = 120;
      gY = secBar("Photographic Evidence", gY);
      gY += 8;

      for (let i = 0; i < photosToRender.length; i++) {
        const field = photosToRender[i];
        const buf   = photoBuffers[field];
        const label = PHOTO_LABELS[field];

        const col = i % 2;

        // Advance Y at start of each new row (except first)
        if (i > 0 && col === 0) gY += CELL_H + ROW_GAP;

        // Page overflow check
        if (gY + CELL_H > PH - 35) {
          drawFooter(pageNum);
          pageNum++;
          doc.addPage({ size: "A4", margin: 0 });
          drawHeader();
          gY = 68;
        }

        const pX = col === 0 ? ML : ML + PHOTO_W + COL_GAP;

        // Photo
        doc.rect(pX, gY, PHOTO_W, PHOTO_H).fillColor("#e5e7eb").fill();
        if (buf) {
          try {
            doc.image(buf, pX, gY, { width: PHOTO_W, height: PHOTO_H, cover: [PHOTO_W, PHOTO_H] });
          } catch {}
        } else {
          doc.fillColor("#9ca3af").font("Helvetica").fontSize(9)
             .text("Not available", pX, gY+PHOTO_H/2-6, { width: PHOTO_W, align: "center", lineBreak: false });
        }

        // Caption area background
        const capY = gY + PHOTO_H;
        doc.rect(pX, capY, PHOTO_W, CAP_H).fillColor("#ffffff").fill();

        // Full cell border (photo + caption)
        doc.rect(pX, gY, PHOTO_W, PHOTO_H+CAP_H).strokeColor("#9ca3af").lineWidth(0.6).stroke();

        // Caption text
        doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(8.5)
           .text(label, pX+5, capY+5, { width: PHOTO_W-10, lineBreak: false });
        doc.fillColor("#374151").font("Helvetica").fontSize(8)
           .text(`Location: ${gpsStr}`, pX+5, capY+17, { width: PHOTO_W-10, lineBreak: false });
        doc.fillColor("#374151").font("Helvetica").fontSize(8)
           .text(`Time: ${fmtDateTime(avr.submittedAt)}`, pX+5, capY+29, { width: PHOTO_W-10, lineBreak: false });
      }

      drawFooter(pageNum);
    }

    doc.end();
    logActivity(avr.verificationId, "Address verification PDF report generated", "ADMIN");

  } catch (err) {
    console.error("ADDRESS VERIFY REPORT ERROR:", err);
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
});
/* ─────────────────────────────────────────────────────────────────────────
   END OF ADDRESS VERIFICATION PORTAL ROUTES
────────────────────────────────────────────────────────────────────────── */
 
/* =========================================================
   START SERVER
========================================================= */
 
const PORT = process.env.PORT || 5001;
 
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 TrueVerify running on port ${PORT}`);
  try {
    const companies = readCompanies();
    const cases     = readCases();
    console.log(`📊 Loaded — Companies: ${companies.length}, Cases: ${cases.length}`);
  } catch (err) {
    console.error("⚠️  Startup data check failed:", err.message);
  }
});
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Tervies backend is running",
    time: new Date()
  });
});