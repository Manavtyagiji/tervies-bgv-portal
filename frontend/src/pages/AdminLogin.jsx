import { useState } from "react";
import axios from "../utils/axios";
import { useNavigate } from "react-router-dom";
import bgImage from "../assets/admin.png";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const API = "/api";

  const login = async (e) => {
  e.preventDefault();

  try {
    const res = await axios.post("https://tervies.info/api/admin/login", { email, password });

    console.log("LOGIN RESPONSE:", res.data);

    if (res.data.token) {
      localStorage.setItem("token", res.data.token);        // ✅ "token" not "adminToken"
      localStorage.setItem("adminToken", res.data.token);   // keep for backward compat
      navigate("/admin/dashboard", { replace: true });
    } else {
      alert("No token received");
    }
  } catch (err) {
    console.error(err);
    alert("Invalid admin credentials");
  }
};

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-indigo-900/60 to-black/80"></div>

      {/* Glow */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl"></div>

      <div className="relative flex w-full max-w-6xl mx-auto px-6">

        {/* LEFT SIDE */}
        <div className="hidden lg:flex w-1/2 flex-col justify-center text-white pr-16">
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Trusted Background
            <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Verification Platform
            </span>
          </h1>

          <p className="text-gray-300 text-lg mb-8 max-w-lg">
            Secure, enterprise-grade background screening solution
            built to reduce risk and build hiring trust.
          </p>

          <div className="space-y-4 text-gray-300">
            <p>✔ Employment Verification</p>
            <p>✔ Education Checks</p>
            <p>✔ Criminal Record Screening</p>
            <p>✔ Identity Validation</p>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <form
            onSubmit={login} // ✅ form submit handled here
            className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-3xl p-10 w-full max-w-md text-white"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">Admin Portal</h2>
              <p className="text-gray-300 mt-2 text-sm">
                Authorized Access Only
              </p>
            </div>

            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full mb-4 bg-white/20 border border-white/30 px-4 py-3 rounded-xl placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mb-6 bg-white/20 border border-white/30 px-4 py-3 rounded-xl placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />

            <button
              type="submit" // ✅ important
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transform transition duration-300 text-white py-3 rounded-xl font-semibold shadow-lg"
            >
              Secure Login
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}