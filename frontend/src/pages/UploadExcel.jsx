import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axios";
import * as XLSX from "xlsx";

const API = "/api";

export default function UploadExcel() {
  const getToken = () => localStorage.getItem("adminToken");

  const [candidates, setCandidates] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`${API}/admin/companies`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      setCompanies(res.data?.companies || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    }
  };

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.companyId === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  const createClient = async () => {
    const cleanName = newClientName.trim();

    if (!cleanName) {
      alert("Please enter client name first");
      return;
    }

    const alreadyExists = companies.find(
      (c) => (c.name || "").trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (alreadyExists) {
      setSelectedCompanyId(alreadyExists.companyId);
      setNewClientName("");
      alert("Client already exists and has been selected.");
      return;
    }

    try {
      setCreatingClient(true);

      const res = await axios.post(
        `${API}/admin/create-company`,
        { name: cleanName },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      const createdCompany = res.data?.company;

      if (createdCompany) {
        const updatedCompanies = [...companies, createdCompany].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

        setCompanies(updatedCompanies);
        setSelectedCompanyId(createdCompany.companyId);
        setNewClientName("");
        alert("Client created successfully");
      }
    } catch (error) {
      console.error("Error creating client:", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Client create failed";
      alert(message);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleExcelUpload = (e) => {
    if (!selectedCompanyId) {
      alert("Please create/select client first");
      e.target.value = "";
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      setCandidates(Array.isArray(json) ? json : []);
    };

    reader.readAsArrayBuffer(file);
  };

  const sendEmail = async (candidate) => {
    if (!selectedCompany) {
      return alert("Please select client first");
    }

    try {
      await axios.post(
        `${API}/admin/send-candidate-link`,
        {
          name: candidate.Name || "",
          email: candidate.Email || "",
          phone: candidate.Phone || "",
          clientName: selectedCompany.name,
          companyId: selectedCompany.companyId,
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      alert("Email sent");
    } catch (error) {
      console.error("Send email error:", error);
      alert("Failed to send form");
    }
  };

  const sendManualEmail = async () => {
    if (!selectedCompany) {
      return alert("Please select client first");
    }

    if (!manualName || !manualEmail) {
      return alert("Fill name & email");
    }

    try {
      await axios.post(
        `${API}/admin/send-candidate-link`,
        {
          name: manualName,
          email: manualEmail,
          phone: manualPhone,
          clientName: selectedCompany.name,
          companyId: selectedCompany.companyId,
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      alert("Form sent");

      setManualName("");
      setManualEmail("");
      setManualPhone("");
    } catch (error) {
      console.error("Manual send error:", error);
      alert("Failed to send form");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Upload Candidate Excel
        </h1>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 mb-10">
          <h2 className="text-lg font-semibold text-indigo-600 mb-6">
            Step 1: Create or Select Client
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-indigo-100 rounded-2xl p-5 bg-indigo-50">
              <label className="text-sm font-semibold text-gray-700 block mb-3">
                Create New Client
              </label>

              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Enter client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />

                <button
                  onClick={createClient}
                  disabled={creatingClient}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg shadow"
                >
                  {creatingClient ? "Creating..." : "Create Client"}
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-white">
              <label className="text-sm font-semibold text-gray-700 block mb-3">
                Select Existing Client
              </label>

              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Client</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.name}
                  </option>
                ))}
              </select>

              {selectedCompany && (
                <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-sm font-medium text-green-700">
                    Selected Client: {selectedCompany.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 mb-10">
          <h2 className="text-lg font-semibold text-indigo-600 mb-6">
            Step 2: Upload Excel for Selected Client
          </h2>

          <label className="text-sm font-semibold text-gray-600 block mb-4">
            Upload Excel File
          </label>

          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-10 text-center bg-indigo-50 hover:bg-indigo-100 transition">
            <p className="text-gray-600 mb-4">
              Drag & drop your Excel file or click to upload
            </p>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="cursor-pointer"
            />
          </div>

          {!selectedCompanyId && (
            <p className="text-sm text-red-500 mt-4">
              Please create/select a client first before uploading Excel.
            </p>
          )}
        </div>

        {candidates.length > 0 && (
          <div className="bg-white shadow-sm border rounded-2xl p-6 mb-10">
            <h2 className="text-lg font-semibold text-indigo-600 mb-2">
              Step 3: Send Form Links
            </h2>

            {selectedCompany && (
              <p className="text-sm text-gray-500 mb-6">
                Forms will be sent under client:{" "}
                <span className="font-semibold text-indigo-700">
                  {selectedCompany.name}
                </span>
              </p>
            )}

            <div className="space-y-4">
              {candidates.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-gray-200 rounded-lg p-4 hover:bg-gray-50 gap-4"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{c.Name}</p>
                    <p className="text-sm text-gray-500">{c.Email}</p>
                    <p className="text-sm text-gray-500">{c.Phone}</p>
                  </div>

                  <button
                    onClick={() => sendEmail(c)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm shadow whitespace-nowrap"
                  >
                    Send Form
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-indigo-600 mb-2">
            Send Form Manually
          </h2>

          {selectedCompany && (
            <p className="text-sm text-gray-500 mb-6">
              Manual form will go under client:{" "}
              <span className="font-semibold text-indigo-700">
                {selectedCompany.name}
              </span>
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Candidate Name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="email"
              placeholder="Candidate Email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="text"
              placeholder="Phone Number"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={sendManualEmail}
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl shadow transition"
          >
            Send Form
          </button>
        </div>
      </div>
    </div>
  );
}