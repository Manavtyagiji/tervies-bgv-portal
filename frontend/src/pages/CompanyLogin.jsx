import { useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
import bgImage from "../assets/company1.png";

export default function CompanyLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // const API = "/api";

 const login = async () => {
  try {
    const res = await fetch("https://tervies.info/api/company/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    console.log("Response:", data);
    
    if (!data.success) {
      alert("Invalid credentials: " + data.message);
      return;
    }

    localStorage.setItem("companyId", data.companyId);
    localStorage.setItem("companyName", data.name);
    localStorage.setItem("role", "company");
    navigate("/company/dashboard");

  } catch (err) {
    console.error(err);
    alert("Login failed");
  }
};

  return (
    <div
      className="relative min-h-screen overflow-hidden animate-bgMove"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* ===== ENTERPRISE BLUE OVERLAY (Balanced) ===== */}
      <div className="absolute inset-0 
                      bg-gradient-to-br 
                      from-blue-950/65 
                      via-indigo-900/55 
                      to-blue-900/65 
                      backdrop-blur-[2px]">
      </div>

      {/* ===== MAIN SECTION ===== */}
      <div className="relative z-10 flex min-h-screen items-center px-6 lg:px-16">

        <div className="grid lg:grid-cols-2 w-full max-w-7xl mx-auto gap-16 items-center">

          {/* ===== LEFT CONTENT ===== */}
          <div className="hidden lg:block text-white space-y-6">

            <h1 className="text-5xl font-extrabold leading-tight">
              Trusted Background
              <span className="block bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Verification Platform
              </span>
            </h1>

            <p className="text-blue-200 text-lg max-w-xl">
              Secure, enterprise-grade background screening solution built
              to reduce risk and build hiring trust with structured,
              compliant workflows.
            </p>

            <div className="space-y-3 text-blue-200 text-lg">
              <p>✔ Employment Verification</p>
              <p>✔ Education Checks</p>
              <p>✔ Criminal Record Screening</p>
              <p>✔ Identity Validation</p>
            </div>
          </div>

          {/* ===== LOGIN CARD ===== */}
          <div className="flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20
                            shadow-2xl rounded-2xl p-10 w-full max-w-md text-white
                            transition duration-300 hover:shadow-purple-500/30">

              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">
                  Company Portal
                </h2>
                <p className="text-blue-200 mt-2 text-sm">
                  Authorized Access Only
                </p>
              </div>

              <input
                type="email"
                className="w-full mb-4 bg-white/10 border border-white/20
                           px-4 py-3 rounded-xl placeholder-blue-200
                           focus:outline-none focus:ring-2
                           focus:ring-purple-400 transition"
                placeholder="Company Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                className="w-full mb-6 bg-white/10 border border-white/20
                           px-4 py-3 rounded-xl placeholder-blue-200
                           focus:outline-none focus:ring-2
                           focus:ring-purple-400 transition"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={login}
                className="w-full py-3 rounded-xl font-semibold
                           bg-gradient-to-r from-indigo-500 to-purple-600
                           hover:from-indigo-600 hover:to-purple-700
                           transform hover:scale-105 transition duration-300
                           shadow-lg"
              >
                Secure Login
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ===== Background Animation Keyframes ===== */}
      <style>
        {`
          .animate-bgMove {
            animation: bgMove 20s ease-in-out infinite alternate;
          }

          @keyframes bgMove {
            0% { background-position: center top; }
            100% { background-position: center bottom; }
          }
        `}
      </style>

    </div>
  );
}