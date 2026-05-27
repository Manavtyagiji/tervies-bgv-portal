import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "/api";

const JOB_ROLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Analyst", "Data Scientist", "Machine Learning Engineer", "DevOps Engineer",
  "UI/UX Designer", "Product Manager", "Business Analyst", "Marketing Analyst",
  "Financial Analyst", "HR Executive", "Sales Executive", "Operations Manager",
  "Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Content Writer",
  "Graphic Designer", "Cybersecurity Analyst", "Cloud Engineer", "QA Engineer",
];

const SKILLS_LIST = [
  "JavaScript", "React", "Node.js", "Python", "Java", "SQL", "MongoDB",
  "AWS", "Docker", "Git", "TypeScript", "C++", "Machine Learning", "Excel",
  "Figma", "Photoshop", "Communication", "Leadership", "Project Management",
  "Data Visualization", "Tableau", "Power BI", "REST APIs", "Agile/Scrum",
];

const INDUSTRIES = [
  "Information Technology", "Finance & Banking", "Healthcare", "E-Commerce",
  "Education", "Manufacturing", "Consulting", "Media & Entertainment",
  "Real Estate", "Logistics & Supply Chain", "Government", "Startup",
];

const EXPERIENCE_LEVELS = ["Fresher (0 yrs)", "0–1 Year", "1–2 Years", "2–5 Years", "5+ Years"];

// ─── SESSION ──────────────────────────────────────────────────────────────────
function getSession() {
  try { return JSON.parse(localStorage.getItem("candidate_session") || "null"); }
  catch { return null; }
}
function setSession(data) { localStorage.setItem("candidate_session", JSON.stringify(data)); }
function clearSession() { localStorage.removeItem("candidate_session"); }

function formatBytes(b) {
  if (!b) return "";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder, maxLength, mono, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength}
        className={`w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
          placeholder:text-slate-300 ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={onChange}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
        <option value="">{placeholder || "Select…"}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 3, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
          placeholder:text-slate-300 resize-none" />
    </div>
  );
}

function TagPicker({ label, options, selected, onToggle, max }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {label} <span className="text-slate-400 normal-case font-normal">(pick up to {max})</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const active = selected.includes(o);
          return (
            <button key={o} type="button" onClick={() => onToggle(o)}
              disabled={!active && selected.length >= max}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-violet-400 hover:text-violet-600 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Steps({ current, steps }) {
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none min-w-0">
          <div className={`flex items-center gap-2 ${i <= current ? "opacity-100" : "opacity-40"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
              i < current ? "bg-violet-600 border-violet-600 text-white"
              : i === current ? "border-violet-600 text-violet-600 bg-white"
              : "border-slate-300 text-slate-400 bg-white"
            }`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-semibold hidden sm:block whitespace-nowrap ${i === current ? "text-violet-700" : "text-slate-400"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 min-w-2 ${i < current ? "bg-violet-500" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function DropZone({ file, onFile, onRemove, accept, maxMB, formats, icon, hint }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragOver ? "border-violet-500 bg-violet-50 scale-[1.01]"
        : file ? "border-green-400 bg-green-50"
        : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/40"
      }`}
      onClick={() => !file && fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]); }}
    >
      <input ref={fileRef} type="file" accept={accept} hidden onChange={e => onFile(e.target.files[0])} />
      {file ? (
        <div>
          <div className="text-3xl mb-2">{icon}</div>
          <p className="font-semibold text-slate-700 text-sm">{file.name}</p>
          <p className="text-slate-400 text-xs mt-1">{formatBytes(file.size)}</p>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="mt-3 text-xs text-red-500 hover:text-red-700 underline">Remove file</button>
        </div>
      ) : (
        <div>
          <div className="text-3xl mb-3">{icon}</div>
          <p className="font-semibold text-slate-600 text-sm">Drag your {hint} here</p>
          <p className="text-slate-400 text-xs mt-1">or click to browse</p>
          <div className="flex gap-2 justify-center mt-3 flex-wrap">
            {formats.map(f => (
              <span key={f} className="px-2 py-0.5 bg-white text-slate-500 text-xs rounded font-mono border border-slate-200">{f}</span>
            ))}
            <span className="px-2 py-0.5 bg-white text-slate-500 text-xs rounded border border-slate-200">Max {maxMB} MB</span>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoPreview({ file }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return null;
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-black">
      <video src={url} controls className="w-full max-h-48 object-contain" />
    </div>
  );
}

// ─── AUTH VIEW ────────────────────────────────────────────────────────────────
function AuthView({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => { setForm(p => ({ ...p, [k]: e.target.value })); setError(""); };
  const switchTab = (v) => { setTab(v); setError(""); setForm(p => ({ ...p, password: "", confirm: "" })); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) return setError("Email and password are required.");
    if (tab === "register") {
      if (!form.name.trim()) return setError("Full name is required.");
      if (!/^\d{10}$/.test(form.phone)) return setError("Enter a valid 10-digit phone number.");
      if (form.password.length < 6) return setError("Password must be at least 6 characters.");
      if (form.password !== form.confirm) return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      if (tab === "register") {
        const res = await axios.post(`${API}/candidate/register`, {
          name: form.name.trim(), email: form.email.trim(),
          phone: form.phone.trim(), password: form.password,
        });
        setSession({ token: res.data.token, name: res.data.name, email: form.email, profileComplete: false });
        onLogin();
      } else {
        const res = await axios.post(`${API}/candidate/login`, { email: form.email.trim(), password: form.password });
        setSession({ token: res.data.token, name: res.data.name, email: form.email, profileComplete: res.data.profileComplete });
        onLogin();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute bottom-20 -left-10 w-48 h-48 rounded-full bg-violet-600/30" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">T</div>
            <h1 className="text-2xl font-bold tracking-tight">Tervies</h1>
          </div>
          <p className="text-violet-300 text-sm">Recruitment Platform</p>
        </div>
        <div className="relative">
          <div className="inline-block px-3 py-1 bg-violet-700/50 rounded-full text-violet-200 text-xs font-medium mb-4">
            👋 Candidate Portal
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">Your next<br />opportunity starts here.</h2>
          <p className="text-violet-300 text-base leading-relaxed mb-10">
            Build your profile, upload your resume, record your intro, and get discovered by top companies actively hiring in your domain.
          </p>
          <div className="space-y-5">
            {[
              ["🧑‍💼", "Create Profile", "Add your education, skills & experience"],
              ["📄", "Upload CV", "Submit your latest resume securely"],
              ["🎬", "Intro Video", "Record a short introduction video"],
              ["✅", "Sign Consent", "Complete BGV & privacy consent"],
              ["🔍", "Get Discovered", "Companies matching your skills will find you"],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-violet-300 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-violet-500 text-xs relative">©️ {new Date().getFullYear()} Tervies Recruitment Services</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-bold text-violet-900">Tervies</h1>
            <p className="text-slate-500 text-sm">Candidate Portal</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {tab === "login" ? "Sign in to manage your profile and resume." : "Join Tervies to get discovered by top companies."}
          </p>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 mb-6">
            {[["login", "Sign In"], ["register", "Register"]].map(([v, label]) => (
              <button key={v} type="button" onClick={() => switchTab(v)}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                  tab === v ? "bg-violet-900 text-white shadow" : "text-slate-500 hover:text-slate-700"
                }`}>{label}</button>
            ))}
          </div>
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            {tab === "register" && (
              <>
                <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="Rahul Sharma" required />
                <Field label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="9876543210" maxLength={10} required />
              </>
            )}
            <Field label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
            <Field label="Password" type="password" value={form.password} onChange={set("password")}
              placeholder={tab === "register" ? "Min 6 characters" : "Enter password"} required />
            {tab === "register" && (
              <Field label="Confirm Password" type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" required />
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-violet-900 hover:bg-violet-800 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors">
              {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            {tab === "login" ? "Don't have an account?" : "Already registered?"}{" "}
            <button type="button" onClick={() => switchTab(tab === "login" ? "register" : "login")}
              className="text-violet-700 font-semibold hover:underline">
              {tab === "login" ? "Register here" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE SETUP WIZARD (modal or full-page) ────────────────────────────────
function ProfileSetup({ session, onComplete, onCancel, isModal = false }) {
  const STEPS = ["Basic Info", "Education", "Skills & Role", "CV Upload", "Video & Consent"];
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [profile, setProfile] = useState({
    bio: "", city: "", linkedIn: "", portfolio: "",
    degree: "", college: "", graduationYear: "", percentage: "",
    desiredRole: "", experience: "", industry: "", skills: [],
    cv: null, introVideo: null,
    consentBGV: false, consentPrivacy: false,
    consentSignature: "", consentDate: new Date().toISOString().split("T")[0],
  });

  const set = (k) => (v) => setProfile(p => ({ ...p, [k]: v }));
  const setE = (k) => (e) => set(k)(e.target.value);
  const toggleSkill = (s) => {
    setProfile(p => ({
      ...p,
      skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s],
    }));
  };

  const pickCV = (f) => {
    if (!f) return;
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) return setError("Only PDF, DOC or DOCX files are accepted.");
    if (f.size > 10 * 1024 * 1024) return setError("CV must be under 10 MB.");
    setError(""); setProfile(p => ({ ...p, cv: f }));
  };

  const pickVideo = (f) => {
    if (!f) return;
    const allowed = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
    if (!allowed.includes(f.type)) return setError("Only MP4, MOV or WEBM videos are accepted.");
    if (f.size > 100 * 1024 * 1024) return setError("Video must be under 100 MB.");
    setError(""); setProfile(p => ({ ...p, introVideo: f }));
  };

  const validateStep = () => {
    setError("");
    if (step === 0) {
      if (!profile.bio.trim()) return setError("Please write a short bio.");
      if (!profile.city.trim()) return setError("City is required.");
    }
    if (step === 1) {
      if (!profile.degree.trim()) return setError("Degree is required.");
      if (!profile.college.trim()) return setError("College/University is required.");
      if (!profile.graduationYear) return setError("Graduation year is required.");
    }
    if (step === 2) {
      if (!profile.desiredRole) return setError("Please select your desired job role.");
      if (!profile.experience) return setError("Please select your experience level.");
      if (!profile.industry) return setError("Please select your target industry.");
      if (profile.skills.length === 0) return setError("Please select at least one skill.");
    }
    if (step === 3) {
      if (!profile.cv) return setError("Please upload your CV.");
    }
    if (step === 4) {
      if (!profile.consentBGV) return setError("You must consent to background verification.");
      if (!profile.consentPrivacy) return setError("You must accept the data privacy policy.");
      if (!profile.consentSignature.trim()) return setError("Please enter your full name as signature.");
    }
    return true;
  };

  const next = () => { if (validateStep() === true) { setError(""); setStep(s => s + 1); } };
  const back = () => { setError(""); setStep(s => s - 1); };

  const submit = async () => {
    if (validateStep() !== true) return;
    setSaving(true); setError(""); setUploadProgress(0);
    try {
      await axios.post(`${API}/candidate/profile`, {
        bio: profile.bio, city: profile.city, linkedIn: profile.linkedIn, portfolio: profile.portfolio,
        degree: profile.degree, college: profile.college, graduationYear: profile.graduationYear,
        percentage: profile.percentage, desiredRole: profile.desiredRole, experience: profile.experience,
        industry: profile.industry, skills: profile.skills,
      }, { headers: { Authorization: `Bearer ${session.token}` } });
      setUploadProgress(20);

      const cvFd = new FormData();
      cvFd.append("resume", profile.cv);
      await axios.post(`${API}/candidate/upload-resume`, cvFd, {
        headers: { Authorization: `Bearer ${session.token}` },
        onUploadProgress: (e) => setUploadProgress(20 + Math.round((e.loaded / e.total) * 30)),
      });
      setUploadProgress(50);

      if (profile.introVideo) {
        const vidFd = new FormData();
        vidFd.append("introVideo", profile.introVideo);
        await axios.post(`${API}/candidate/upload-intro-video`, vidFd, {
          headers: { Authorization: `Bearer ${session.token}` },
          onUploadProgress: (e) => setUploadProgress(50 + Math.round((e.loaded / e.total) * 35)),
        });
      }
      setUploadProgress(85);

      await axios.post(`${API}/candidate/consent`, {
        consentBGV: profile.consentBGV, consentPrivacy: profile.consentPrivacy,
        consentSignature: profile.consentSignature.trim(), consentDate: profile.consentDate,
      }, { headers: { Authorization: `Bearer ${session.token}` } });
      setUploadProgress(100);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally { setSaving(false); }
  };

  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + 2 - i));

  const content = (
    <div className={isModal ? "" : "max-w-2xl mx-auto px-4 py-10"}>
      {!isModal && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Complete your profile</h2>
          <p className="text-slate-500 text-sm">Help companies find you — this takes less than 5 minutes.</p>
        </div>
      )}

      <Steps current={step} steps={STEPS} />

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 text-lg mb-4">About You</h3>
            <TextareaField label="Short Bio" value={profile.bio} onChange={setE("bio")}
              placeholder="I'm a final-year CS student passionate about building scalable web apps…" required />
            <Field label="City / Location" value={profile.city} onChange={setE("city")} placeholder="Bangalore, Karnataka" required />
            <Field label="LinkedIn URL" value={profile.linkedIn} onChange={setE("linkedIn")} placeholder="https://linkedin.com/in/yourprofile" />
            <Field label="Portfolio / GitHub URL" value={profile.portfolio} onChange={setE("portfolio")} placeholder="https://github.com/yourprofile" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 text-lg mb-4">Education</h3>
            <Field label="Degree / Qualification" value={profile.degree} onChange={setE("degree")} placeholder="B.Tech in Computer Science" required />
            <Field label="College / University" value={profile.college} onChange={setE("college")} placeholder="IIT Delhi" required />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Graduation Year" value={profile.graduationYear} onChange={setE("graduationYear")}
                options={years} placeholder="Select year" required />
              <Field label="CGPA / Percentage" value={profile.percentage} onChange={setE("percentage")} placeholder="8.5 CGPA / 85%" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-bold text-slate-700 text-lg mb-4">Skills & Preferences</h3>
            <SelectField label="Desired Job Role" value={profile.desiredRole} onChange={setE("desiredRole")} options={JOB_ROLES} placeholder="Select role" required />
            <SelectField label="Experience Level" value={profile.experience} onChange={setE("experience")} options={EXPERIENCE_LEVELS} placeholder="Select level" required />
            <SelectField label="Target Industry" value={profile.industry} onChange={setE("industry")} options={INDUSTRIES} placeholder="Select industry" required />
            <TagPicker label="Skills" options={SKILLS_LIST} selected={profile.skills} onToggle={toggleSkill} max={10} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 text-lg mb-1">Upload Your CV</h3>
            <p className="text-slate-500 text-sm mb-4">Upload your latest CV or resume. This will be shared with matching companies.</p>
            <DropZone file={profile.cv} onFile={pickCV} onRemove={() => setProfile(p => ({ ...p, cv: null }))}
              accept=".pdf,.doc,.docx" maxMB={10} formats={["PDF", "DOC", "DOCX"]} icon="📄" hint="CV / Resume" />
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 mt-4">
              <p className="text-xs font-semibold text-violet-700 mb-2">💡 CV Tips</p>
              <ul className="text-xs text-violet-600 space-y-1 list-disc list-inside">
                <li>Keep it to 1–2 pages for best results</li>
                <li>Include your latest experience and skills</li>
                <li>PDF format is recommended for consistent formatting</li>
                <li>Ensure your contact details are up to date</li>
              </ul>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-slate-700 text-lg mb-1">Introduction Video</h3>
              <p className="text-slate-500 text-sm mb-4">
                Record a 1–2 minute video introducing yourself.{" "}
                <span className="text-violet-600 font-medium">Optional but highly recommended.</span>
              </p>
              <DropZone file={profile.introVideo} onFile={pickVideo} onRemove={() => setProfile(p => ({ ...p, introVideo: null }))}
                accept=".mp4,.mov,.webm" maxMB={100} formats={["MP4", "MOV", "WEBM"]} icon="🎬" hint="intro video" />
              {profile.introVideo && <VideoPreview file={profile.introVideo} />}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-3">
                <p className="text-xs font-semibold text-amber-700 mb-1.5">🎥 What to say in your intro</p>
                <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
                  <li>Briefly introduce yourself (name, background)</li>
                  <li>Mention your key skills and experience</li>
                  <li>Share what kind of role you're looking for</li>
                  <li>Keep it under 2 minutes — keep it natural!</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="font-bold text-slate-700 text-lg mb-1">Consent & Agreement</h3>
              <p className="text-slate-500 text-sm mb-5">Please read and accept the following to complete your profile.</p>

              <div className={`border rounded-xl p-4 mb-3 transition-colors ${profile.consentBGV ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-slate-50"}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={profile.consentBGV}
                    onChange={e => setProfile(p => ({ ...p, consentBGV: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-violet-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      Background Verification (BGV) Consent <span className="text-rose-400">*</span>
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      I hereby authorize Tervies Recruitment Services and its clients to conduct a background verification
                      check including employment history, educational qualifications, criminal records, and identity
                      verification. I confirm that all information provided by me is accurate and complete.
                    </p>
                  </div>
                </label>
              </div>

              <div className={`border rounded-xl p-4 mb-5 transition-colors ${profile.consentPrivacy ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-slate-50"}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={profile.consentPrivacy}
                    onChange={e => setProfile(p => ({ ...p, consentPrivacy: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-violet-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      Data Privacy & Usage Policy <span className="text-rose-400">*</span>
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      I consent to Tervies Recruitment Services collecting, storing, and processing my personal data
                      including my CV, introduction video, and profile information for recruitment purposes. My data
                      will be shared with verified hiring companies and retained for 12 months.
                    </p>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                <Field label="Full Name (Electronic Signature)" value={profile.consentSignature}
                  onChange={setE("consentSignature")} placeholder="Type your full legal name" required />
                <Field label="Date" type="date" value={profile.consentDate} onChange={setE("consentDate")} required />
              </div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                By typing your name above you confirm that you have read, understood, and agree to the BGV consent and
                data privacy policy. This constitutes a legally binding electronic signature.
              </p>
            </div>
          </div>
        )}
      </div>

      {saving && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              {uploadProgress < 20 ? "Saving profile…"
                : uploadProgress < 50 ? "Uploading CV…"
                : uploadProgress < 85 ? "Uploading video…"
                : uploadProgress < 100 ? "Saving consent…"
                : "✓ All done!"}
            </span>
            <span className="text-xs font-bold text-violet-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-violet-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        {isModal && step === 0 && onCancel && (
          <button onClick={onCancel} disabled={saving}
            className="flex-1 py-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold rounded-lg transition-colors">
            Cancel
          </button>
        )}
        {step > 0 && (
          <button onClick={back} disabled={saving}
            className="flex-1 py-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold rounded-lg transition-colors">
            ← Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next}
            className="flex-1 py-3 bg-violet-900 hover:bg-violet-800 text-white font-semibold rounded-lg transition-colors">
            Continue →
          </button>
        ) : (
          <button onClick={submit} disabled={saving}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors">
            {saving ? `Submitting… ${uploadProgress}%` : "✓ Submit Profile"}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10 px-4">
        <div className="bg-slate-50 rounded-2xl w-full max-w-2xl shadow-2xl">
          <div className="bg-violet-900 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Complete Your Profile</h2>
              <p className="text-violet-300 text-xs">Help companies find you</p>
            </div>
            {onCancel && step === 0 && (
              <button onClick={onCancel} className="text-violet-300 hover:text-white text-xl font-bold">✕</button>
            )}
          </div>
          <div className="p-6">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-violet-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">T</div>
          <h1 className="text-lg font-bold">Tervies</h1>
          <span className="text-violet-400 text-sm">/ Set Up Profile</span>
        </div>
        <p className="text-sm font-medium">{session.name}</p>
      </div>
      {content}
    </div>
  );
}

// ─── RESUME BUILDER ────────────────────────────────────────────────────────────
function ResumeBuilder({ session }) {
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", city: "", linkedIn: "",
    objective: "",
    edu_degree: "", edu_college: "", edu_year: "", edu_grade: "",
    exp_company: "", exp_role: "", exp_duration: "", exp_desc: "",
    skills: "",
    cert_name: "", cert_org: "",
    lang: "English, Hindi",
  });
  const [preview, setPreview] = useState(false);

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Resume Builder</h2>
          <p className="text-slate-500 text-sm mt-0.5">Build a professional resume in minutes</p>
        </div>
        <button onClick={() => setPreview(p => !p)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            preview ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-violet-900 text-white hover:bg-violet-800"
          }`}>
          {preview ? "← Edit" : "Preview Resume →"}
        </button>
      </div>

      {!preview ? (
        <div className="space-y-5">
          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">1</span>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" value={form.fullName} onChange={setF("fullName")} placeholder="Rahul Sharma" required />
              <Field label="Email" type="email" value={form.email} onChange={setF("email")} placeholder="you@example.com" required />
              <Field label="Phone" value={form.phone} onChange={setF("phone")} placeholder="9876543210" />
              <Field label="City" value={form.city} onChange={setF("city")} placeholder="Bangalore" />
              <div className="sm:col-span-2">
                <Field label="LinkedIn URL" value={form.linkedIn} onChange={setF("linkedIn")} placeholder="https://linkedin.com/in/yourprofile" />
              </div>
            </div>
          </div>

          {/* Objective */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">2</span>
              Career Objective
            </h3>
            <TextareaField label="Objective" value={form.objective} onChange={setF("objective")}
              placeholder="A motivated software engineer seeking a challenging role to contribute to innovative projects…" rows={3} />
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">3</span>
              Education
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Degree" value={form.edu_degree} onChange={setF("edu_degree")} placeholder="B.Tech in Computer Science" />
              <Field label="College / University" value={form.edu_college} onChange={setF("edu_college")} placeholder="IIT Delhi" />
              <Field label="Graduation Year" value={form.edu_year} onChange={setF("edu_year")} placeholder="2024" />
              <Field label="CGPA / %" value={form.edu_grade} onChange={setF("edu_grade")} placeholder="8.5 CGPA" />
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">4</span>
              Work Experience
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company" value={form.exp_company} onChange={setF("exp_company")} placeholder="Google India" />
              <Field label="Role / Position" value={form.exp_role} onChange={setF("exp_role")} placeholder="Software Engineer Intern" />
              <Field label="Duration" value={form.exp_duration} onChange={setF("exp_duration")} placeholder="Jun 2023 – Aug 2023" />
            </div>
            <div className="mt-4">
              <TextareaField label="Key Responsibilities" value={form.exp_desc} onChange={setF("exp_desc")}
                placeholder="• Built REST APIs using Node.js&#10;• Reduced load time by 30% through caching" rows={3} />
            </div>
          </div>

          {/* Skills & Certs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">5</span>
              Skills & Certifications
            </h3>
            <div className="space-y-4">
              <TextareaField label="Skills (comma separated)" value={form.skills} onChange={setF("skills")}
                placeholder="JavaScript, React, Python, SQL, Docker…" rows={2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Certification Name" value={form.cert_name} onChange={setF("cert_name")} placeholder="AWS Certified Developer" />
                <Field label="Issuing Organization" value={form.cert_org} onChange={setF("cert_org")} placeholder="Amazon Web Services" />
              </div>
              <Field label="Languages Known" value={form.lang} onChange={setF("lang")} placeholder="English, Hindi" />
            </div>
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-xs font-semibold text-violet-700">Pro Tip</p>
              <p className="text-xs text-violet-600 mt-0.5">Click "Preview Resume" to see how your resume looks. You can download it as PDF from the preview.</p>
            </div>
          </div>
        </div>
      ) : (
        /* RESUME PREVIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-violet-900 text-white p-8">
            <h1 className="text-3xl font-bold">{form.fullName || "Your Name"}</h1>
            {form.exp_role && <p className="text-violet-300 text-base mt-1">{form.exp_role}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-violet-200">
              {form.email && <span>✉ {form.email}</span>}
              {form.phone && <span>📱 {form.phone}</span>}
              {form.city && <span>📍 {form.city}</span>}
              {form.linkedIn && <a href={form.linkedIn} target="_blank" rel="noreferrer" className="text-violet-300 hover:text-white underline">LinkedIn ↗️</a>}
            </div>
          </div>

          <div className="p-8 space-y-6">
            {form.objective && (
              <section>
                <h2 className="text-sm font-bold text-violet-700 uppercase tracking-widest mb-2 pb-1 border-b border-violet-100">Career Objective</h2>
                <p className="text-slate-700 text-sm leading-relaxed">{form.objective}</p>
              </section>
            )}

            {(form.edu_degree || form.edu_college) && (
              <section>
                <h2 className="text-sm font-bold text-violet-700 uppercase tracking-widest mb-2 pb-1 border-b border-violet-100">Education</h2>
                <div>
                  <p className="font-semibold text-slate-800">{form.edu_degree}</p>
                  <p className="text-slate-500 text-sm">{form.edu_college}{form.edu_year ? ` · ${form.edu_year}` : ""}{form.edu_grade ? ` · ${form.edu_grade}` : ""}</p>
                </div>
              </section>
            )}

            {(form.exp_company || form.exp_role) && (
              <section>
                <h2 className="text-sm font-bold text-violet-700 uppercase tracking-widest mb-2 pb-1 border-b border-violet-100">Experience</h2>
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{form.exp_role}</p>
                      <p className="text-slate-500 text-sm">{form.exp_company}</p>
                    </div>
                    {form.exp_duration && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{form.exp_duration}</span>}
                  </div>
                  {form.exp_desc && (
                    <div className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{form.exp_desc}</div>
                  )}
                </div>
              </section>
            )}

            {form.skills && (
              <section>
                <h2 className="text-sm font-bold text-violet-700 uppercase tracking-widest mb-2 pb-1 border-b border-violet-100">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {form.skills.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                    <span key={s} className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">{s}</span>
                  ))}
                </div>
              </section>
            )}

            {(form.cert_name || form.cert_org) && (
              <section>
                <h2 className="text-sm font-bold text-violet-700 uppercase tracking-widest mb-2 pb-1 border-b border-violet-100">Certifications</h2>
                <p className="font-semibold text-slate-800 text-sm">{form.cert_name}</p>
                {form.cert_org && <p className="text-slate-500 text-xs">{form.cert_org}</p>}
              </section>
            )}

            {form.lang && (
              <section>
                <h2 className="text-sm font-bold text-violet-700 uppercase tracking-widest mb-2 pb-1 border-b border-violet-100">Languages</h2>
                <div className="flex flex-wrap gap-2">
                  {form.lang.split(",").map(l => l.trim()).filter(Boolean).map(l => (
                    <span key={l} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">{l}</span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="border-t border-slate-100 px-8 py-4 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">Generated via Tervies Resume Builder</p>
            <button onClick={() => window.print()}
              className="px-4 py-2 bg-violet-900 text-white text-xs font-semibold rounded-lg hover:bg-violet-800 transition-colors">
              🖨 Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CLIENT PARTNERS ──────────────────────────────────────────────────────────
function ClientPartners({ profileData }) {
  const PARTNER_COMPANIES = [
    { name: "TechCorp India", industry: "Information Technology", roles: ["Software Engineer", "DevOps Engineer", "Cloud Engineer"], openings: 12, logo: "TC", color: "bg-blue-100 text-blue-700" },
    { name: "FinanceHub", industry: "Finance & Banking", roles: ["Financial Analyst", "Business Analyst"], openings: 5, logo: "FH", color: "bg-green-100 text-green-700" },
    { name: "DataSynapse", industry: "Information Technology", roles: ["Data Scientist", "ML Engineer", "Data Analyst"], openings: 8, logo: "DS", color: "bg-purple-100 text-purple-700" },
    { name: "BuildRight Pvt Ltd", industry: "Manufacturing", roles: ["Civil Engineer", "Mechanical Engineer"], openings: 6, logo: "BR", color: "bg-orange-100 text-orange-700" },
    { name: "CreativePixel", industry: "Media & Entertainment", roles: ["UI/UX Designer", "Graphic Designer", "Content Writer"], openings: 4, logo: "CP", color: "bg-pink-100 text-pink-700" },
    { name: "CloudNine Solutions", industry: "Consulting", roles: ["Full Stack Developer", "Backend Developer", "QA Engineer"], openings: 9, logo: "CN", color: "bg-cyan-100 text-cyan-700" },
    { name: "MedTech Innovations", industry: "Healthcare", roles: ["Data Analyst", "Product Manager"], openings: 3, logo: "MI", color: "bg-teal-100 text-teal-700" },
    { name: "EduLearn Platform", industry: "Education", roles: ["Frontend Developer", "Content Writer"], openings: 7, logo: "EL", color: "bg-yellow-100 text-yellow-700" },
  ];

  const userRole = profileData?.desiredRole;
  const userIndustry = profileData?.industry;

  const tagged = PARTNER_COMPANIES.map(c => ({
    ...c,
    matched: userRole && c.roles.includes(userRole),
    industryMatch: userIndustry && c.industry === userIndustry,
  })).sort((a, b) => (b.matched || b.industryMatch ? 1 : 0) - (a.matched || a.industryMatch ? 1 : 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Client Partners</h2>
        <p className="text-slate-500 text-sm mt-0.5">Companies actively hiring through Tervies</p>
      </div>

      {userRole && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 flex items-center gap-3">
          <span className="text-lg">🎯</span>
          <div>
            <p className="text-xs font-semibold text-violet-700">Showing matches for your profile</p>
            <p className="text-xs text-violet-600 mt-0.5">
              Role: <strong>{userRole}</strong>
              {userIndustry && <> · Industry: <strong>{userIndustry}</strong></>}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tagged.map((company) => (
          <div key={company.name}
            className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${
              company.matched ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200"
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${company.color}`}>
                {company.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800">{company.name}</h3>
                  {company.matched && (
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">🎯 Match</span>
                  )}
                  {company.industryMatch && !company.matched && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Industry Match</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{company.industry}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-slate-800">{company.openings}</p>
                <p className="text-xs text-slate-400">openings</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Hiring For</p>
              <div className="flex flex-wrap gap-1.5">
                {company.roles.map(r => (
                  <span key={r}
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      r === userRole ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 italic">
                {company.matched
                  ? "✓ Your profile is visible to this company's recruiters."
                  : "Complete your profile to get discovered by this company."}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
        <p className="text-sm font-semibold text-slate-700 mb-1">More companies joining every week</p>
        <p className="text-xs text-slate-400">Tervies is onboarding new hiring partners across all industries. Keep your profile updated to stay discoverable.</p>
      </div>
    </div>
  );
}

// ─── SIDEBAR LAYOUT ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "overview", icon: "🏠", label: "Overview" },
  { key: "profile", icon: "🧑‍💼", label: "My Profile" },
  { key: "resume-tab", icon: "📄", label: "CV / Resume" },
  { key: "video", icon: "🎬", label: "Intro Video" },
  { key: "consent", icon: "✅", label: "Consent" },
  { key: "partners", icon: "🏢", label: "Client Partners" },
  { key: "builder", icon: "📝", label: "Resume Builder" },
];

function SidebarLayout({ session, onLogout, children, activeTab, onTabChange, onEditProfile, profileComplete }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* TOP BAR */}
      <div className="bg-violet-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button className="lg:hidden mr-1 p-1 rounded hover:bg-violet-800 transition-colors"
            onClick={() => setSidebarOpen(o => !o)}>
            <div className="space-y-1">
              <div className="w-5 h-0.5 bg-white" /><div className="w-5 h-0.5 bg-white" /><div className="w-5 h-0.5 bg-white" />
            </div>
          </button>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">T</div>
          <h1 className="text-lg font-bold">Tervies</h1>
          <span className="text-violet-400 text-sm hidden sm:block">/ Candidate Portal</span>
        </div>
        <div className="flex items-center gap-3">
          {/* YOUR PROFILE BUTTON */}
          <button onClick={onEditProfile}
            className="flex items-center gap-2 px-3 py-1.5 bg-violet-700 hover:bg-violet-600 rounded-lg text-sm transition-colors border border-violet-600">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {session.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm font-medium">Your Profile</span>
            {!profileComplete && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
          <button onClick={onLogout}
            className="px-3 py-1.5 bg-violet-800 hover:bg-violet-700 rounded-lg text-sm transition-colors hidden sm:block">
            Log out
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* SIDEBAR OVERLAY (mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* SIDEBAR */}
        <aside className={`
          fixed lg:sticky top-0 lg:top-[73px] left-0 h-full lg:h-[calc(100vh-73px)]
          w-64 bg-white border-r border-slate-200 z-40 lg:z-auto
          transform transition-transform duration-300 flex-shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          overflow-y-auto shadow-xl lg:shadow-none flex flex-col
        `}>
          {/* Profile mini card */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-lg font-bold text-violet-700 flex-shrink-0">
                {session.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{session.name}</p>
                <p className="text-xs text-slate-400 truncate">{session.email}</p>
              </div>
            </div>
            <button onClick={() => { onEditProfile(); setSidebarOpen(false); }}
              className="mt-3 w-full py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-violet-100">
              {!profileComplete && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              {profileComplete ? "✏️ Edit Profile" : "⚠️ Complete Your Profile"}
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
            {NAV_ITEMS.map(item => (
              <button key={item.key}
                onClick={() => { onTabChange(item.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                  activeTab === item.key
                    ? "bg-violet-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
                {item.key === "profile" && !profileComplete && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </nav>

          {/* Bottom logout */}
          <div className="p-3 border-t border-slate-100">
            <button onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
              <span className="text-base">🚪</span>
              Log Out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
function DashboardView({ session, onLogout, onEditProfile, profileComplete }) {
  const [profileData, setProfileData] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [consentData, setConsentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/candidate/profile`, { headers: { Authorization: `Bearer ${session.token}` } }),
      axios.get(`${API}/candidate/my-resumes`, { headers: { Authorization: `Bearer ${session.token}` } }),
      axios.get(`${API}/candidate/consent`, { headers: { Authorization: `Bearer ${session.token}` } }).catch(() => ({ data: { consent: null } })),
    ]).then(([pRes, rRes, cRes]) => {
      setProfileData(pRes.data.profile);
      setUploads(rRes.data.resumes || []);
      setConsentData(cRes.data.consent || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pickFile = (f) => {
    if (!f) return;
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) return setUploadError("Only PDF, DOC or DOCX files accepted.");
    if (f.size > 10 * 1024 * 1024) return setUploadError("File must be under 10 MB.");
    setUploadError(""); setUploadFile(f);
  };

  const uploadNew = async () => {
    if (!uploadFile) return;
    setUploading(true); setUploadError(""); setUploadSuccess("");
    const fd = new FormData();
    fd.append("resume", uploadFile);
    try {
      await axios.post(`${API}/candidate/upload-resume`, fd, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setUploadSuccess("New CV uploaded successfully!");
      setUploadFile(null);
      const r = await axios.get(`${API}/candidate/my-resumes`, { headers: { Authorization: `Bearer ${session.token}` } });
      setUploads(r.data.resumes || []);
    } catch (err) {
      setUploadError(err.response?.data?.message || "Upload failed.");
    } finally { setUploading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading your profile…</p>
    </div>
  );

  const p = profileData || {};

  const renderContent = () => {
    switch (activeTab) {

      case "overview":
        return (
          <div className="space-y-6">
            {/* Welcome banner */}
            <div className="bg-gradient-to-r from-violet-900 to-indigo-800 rounded-2xl p-6 text-white">
              <h2 className="text-xl font-bold mb-1">Welcome back, {session.name?.split(" ")[0]}! 👋</h2>
              <p className="text-violet-200 text-sm">
                {profileComplete
                  ? "Your profile is live and being matched with companies."
                  : "Complete your profile to get discovered by top companies."}
              </p>
              {!profileComplete && (
                <button onClick={onEditProfile}
                  className="mt-4 px-4 py-2 bg-white text-violet-900 text-sm font-bold rounded-lg hover:bg-violet-50 transition-colors">
                  Complete Your Profile →
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "CVs Uploaded", value: uploads.length, icon: "📄", color: "bg-violet-50 border-violet-100" },
                { label: "Industry", value: p.industry?.split(" ")[0] || "—", icon: "🏭", color: "bg-blue-50 border-blue-100" },
                { label: "Experience", value: p.experience?.split(" ")[0] || "—", icon: "💼", color: "bg-amber-50 border-amber-100" },
                { label: "Consent", value: consentData ? "Signed" : "Pending", icon: consentData ? "✅" : "⏳", color: consentData ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100" },
              ].map(stat => (
                <div key={stat.label} className={`rounded-2xl border p-4 ${stat.color}`}>
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <p className="text-lg font-bold text-slate-800 truncate">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl font-bold text-violet-700 flex-shrink-0">
                  {session.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800">{session.name}</h3>
                  <p className="text-violet-600 font-medium text-sm">{p.desiredRole || "—"}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{p.city || ""}{p.city && p.experience ? " · " : ""}{p.experience || ""}</p>
                  {p.bio && <p className="text-slate-600 text-sm mt-2 leading-relaxed">{p.bio}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.linkedIn && <a href={p.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline">LinkedIn ↗️</a>}
                  {p.portfolio && <a href={p.portfolio} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline">Portfolio ↗️</a>}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: "partners", icon: "🏢", title: "Client Partners", desc: "See companies actively hiring in your domain" },
                { key: "builder", icon: "📝", title: "Resume Builder", desc: "Build a polished resume directly in your browser" },
                { key: "resume-tab", icon: "📄", title: "Upload CV", desc: "Upload or update your latest CV" },
              ].map(card => (
                <button key={card.key} onClick={() => setActiveTab(card.key)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-violet-300 hover:shadow-md transition-all shadow-sm">
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <p className="font-semibold text-slate-800 text-sm">{card.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Profile</h2>
                <p className="text-slate-500 text-sm mt-0.5">Your professional details visible to hiring companies</p>
              </div>
              <button onClick={onEditProfile}
                className="px-4 py-2 bg-violet-900 text-white text-sm font-semibold rounded-lg hover:bg-violet-800 transition-colors">
                ✏️ Edit Profile
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl font-bold text-violet-700 flex-shrink-0">
                  {session.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800">{session.name}</h3>
                  <p className="text-violet-600 font-semibold text-sm">{p.desiredRole || "—"}</p>
                  <p className="text-slate-400 text-sm">{p.city}{p.city && p.experience ? " · " : ""}{p.experience}</p>
                  {p.bio && <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-xl">{p.bio}</p>}
                  <div className="flex gap-3 mt-3">
                    {p.linkedIn && <a href={p.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline font-medium">LinkedIn ↗️</a>}
                    {p.portfolio && <a href={p.portfolio} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline font-medium">Portfolio ↗️</a>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">🎓 Education</h3>
                {p.degree ? (
                  <div>
                    <p className="font-semibold text-slate-800">{p.degree}</p>
                    <p className="text-slate-500 text-sm">{p.college} · Class of {p.graduationYear}</p>
                    {p.percentage && <p className="text-slate-400 text-xs mt-0.5">{p.percentage}</p>}
                  </div>
                ) : <p className="text-slate-400 text-sm">Not added yet.</p>}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-3">💼 Job Preferences</h3>
                <div className="space-y-2">
                  {[
                    ["Desired Role", p.desiredRole],
                    ["Experience", p.experience],
                    ["Target Industry", p.industry],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="text-xs font-semibold text-slate-700">{val}</span>
                    </div>
                  ) : null)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-3">🛠️ Skills</h3>
              {p.skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {p.skills.map(s => (
                    <span key={s} className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">{s}</span>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm">No skills added yet. Edit your profile to add skills.</p>}
            </div>
          </div>
        );

      case "resume-tab":
        return (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-800">CV / Resume</h2>
              <p className="text-slate-500 text-sm mt-0.5">Upload and manage your CVs</p>
            </div>

            {uploadError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{uploadError}</div>}
            {uploadSuccess && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">✓ {uploadSuccess}</div>}

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-4">
              <h3 className="font-bold text-slate-700 mb-3">Upload New CV</h3>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-3 ${
                  uploadFile ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-violet-300"
                }`}
                onClick={() => !uploadFile && fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={e => pickFile(e.target.files[0])} />
                {uploadFile ? (
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{uploadFile.name}</p>
                    <p className="text-slate-400 text-xs">{formatBytes(uploadFile.size)}</p>
                    <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 underline">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl mb-2">📄</div>
                    <p className="text-slate-500 text-sm font-medium">Drag file here or click to browse</p>
                    <p className="text-slate-400 text-xs mt-1">PDF, DOC, DOCX · Max 10 MB</p>
                  </div>
                )}
              </div>
              <button onClick={uploadNew} disabled={!uploadFile || uploading}
                className="w-full py-2.5 bg-violet-900 hover:bg-violet-800 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
                {uploading ? "Uploading…" : "Upload CV"}
              </button>
            </div>

            {uploads.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-3">Submitted CVs</h3>
                <div className="space-y-2">
                  {uploads.map((u, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                      <span className="text-lg">📄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{u.originalName}</p>
                        <p className="text-xs text-slate-400">
                          {formatBytes(u.size)} · {new Date(u.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        i === 0 ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"
                      }`}>{i === 0 ? "Latest" : "Archived"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No CVs submitted yet.</p>
            )}
          </div>
        );

      case "video":
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-700 text-xl mb-1">Introduction Video</h2>
            <p className="text-slate-500 text-sm mb-5">Your intro video helps companies get to know you before an interview.</p>
            {p.introVideoKey ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">🎬</div>
                <p className="font-semibold text-green-700 text-sm">Introduction video uploaded</p>
                <p className="text-green-600 text-xs mt-1">
                  Uploaded on {p.introVideoUploadedAt ? new Date(p.introVideoUploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </p>
                <p className="text-slate-500 text-xs mt-3">To replace your video, please contact support or re-complete the profile wizard.</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">🎬</div>
                <p className="font-semibold text-amber-700 text-sm">No intro video uploaded</p>
                <p className="text-amber-600 text-xs mt-2">Adding a video significantly increases your chances of being shortlisted.</p>
                <button onClick={onEditProfile}
                  className="mt-3 px-4 py-2 bg-violet-900 text-white text-xs font-semibold rounded-lg hover:bg-violet-800 transition-colors">
                  Upload via Profile Wizard →
                </button>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">🎥 What to include in your 1–2 min video</p>
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li>Your name, education background and location</li>
                <li>Your key skills and what you're best at</li>
                <li>What kind of role and company you're looking for</li>
                <li>Why you'd be a great hire — be genuine!</li>
              </ul>
            </div>
          </div>
        );

      case "consent":
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-700 text-xl mb-4">Consent & Agreement</h2>
            {consentData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-green-600 text-xl">✅</span>
                  <div>
                    <p className="text-sm font-semibold text-green-700">BGV Consent — Signed</p>
                    <p className="text-xs text-green-600">Signed on {consentData.consentDate || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-green-600 text-xl">✅</span>
                  <div>
                    <p className="text-sm font-semibold text-green-700">Data Privacy Policy — Accepted</p>
                    <p className="text-xs text-green-600">Accepted on {consentData.consentDate || "—"}</p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold">Electronic Signature:</span> {consentData.consentSignature || "—"}
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your consent was recorded on {consentData.consentDate}. This is a legally binding electronic agreement.
                  For any concerns, please contact support@tervies.info.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="font-semibold text-amber-700">Consent not yet signed</p>
                <p className="text-amber-600 text-xs mt-2">Please complete the profile setup wizard to sign your consent forms.</p>
                <button onClick={onEditProfile}
                  className="mt-3 px-4 py-2 bg-violet-900 text-white text-xs font-semibold rounded-lg hover:bg-violet-800 transition-colors">
                  Go to Profile Wizard →
                </button>
              </div>
            )}
          </div>
        );

      case "partners":
        return <ClientPartners profileData={profileData} />;

      case "builder":
        return <ResumeBuilder session={session} />;

      default:
        return null;
    }
  };

  return (
    <SidebarLayout
      session={session}
      onLogout={onLogout}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEditProfile={onEditProfile}
      profileComplete={profileComplete}
    >
      {renderContent()}
    </SidebarLayout>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function CandidatePortal() {
  const [session, setSession] = useState(getSession);
  const [profileComplete, setProfileComplete] = useState(() => getSession()?.profileComplete ?? false);
  const [showProfileWizard, setShowProfileWizard] = useState(false);

  const handleLogin = () => {
    const s = getSession();
    setSession(s);
    const isComplete = s?.profileComplete ?? false;
    setProfileComplete(isComplete);
    if (!isComplete) setShowProfileWizard(true);
  };

  const handleLogout = () => { clearSession(); setSession(null); setProfileComplete(false); setShowProfileWizard(false); };

  const handleProfileComplete = () => {
    const s = { ...getSession(), profileComplete: true };
    setSession(s);
    localStorage.setItem("candidate_session", JSON.stringify(s));
    setProfileComplete(true);
    setShowProfileWizard(false);
  };

  const handleEditProfile = () => setShowProfileWizard(true);

  if (!session) return <AuthView onLogin={handleLogin} />;

  return (
    <>
      <DashboardView
        session={session}
        onLogout={handleLogout}
        onEditProfile={handleEditProfile}
        profileComplete={profileComplete}
      />
      {showProfileWizard && (
        <ProfileSetup
          session={session}
          onComplete={handleProfileComplete}
          onCancel={() => profileComplete && setShowProfileWizard(false)}
          isModal={true}
        />
      )}
    </>
  );
}