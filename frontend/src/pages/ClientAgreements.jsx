import { useState, useEffect } from "react";
import axios from "../utils/axios";

const API = "/api";

export default function ClientAgreements() {

const token = localStorage.getItem("adminToken");

const [companies, setCompanies] = useState([]);
const [agreements, setAgreements] = useState([]);
const [selectedCompany, setSelectedCompany] = useState("");
const [editingId, setEditingId] = useState(null);

const [agreement, setAgreement] = useState({
  agreementName: "",
  agreementStatus: "Active",
  startDate: "",
  endDate: "",
  autoRenewal: false,
  services: {
    address: true,
    employment: true,
    education: true,
    criminal: true
  },
  sla: {
    address: 2,
    employment: 3,
    education: 3,
    criminal: 1
  },
  pricing: {
    address: 0,
    employment: 0,
    education: 0,
    criminal: 0
  },
  billingCycle: "Monthly",
  paymentTerms: "Net 30",
  monthlyLimit: 1000,
  overagePrice: 0,
  contactName: "",
  contactEmail: "",
  contactPhone: ""
});

const [file, setFile] = useState(null);

useEffect(() => {
  fetchCompanies();
  fetchAgreements();
}, []);

/* ================= FETCH ================= */

const fetchCompanies = async () => {
  try {
    const res = await axios.get(`${API}/admin/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setCompanies(res.data?.companies || []);
  } catch (err) {
    console.error(err);
  }
};

const fetchAgreements = async () => {
  try {
    const res = await axios.get(`${API}/admin/agreements`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 🔥 SAFE FIX
    const safeData = (res.data?.agreements || []).map(a => ({
      ...a,
      agreement: a.agreement || {}
    }));

    setAgreements(safeData);

  } catch (err) {
    console.error(err);
  }
};

/* ================= EDIT ================= */

const handleEdit = (a) => {
  setSelectedCompany(a.companyId || "");
  setAgreement(a.agreement || {});
  setEditingId(a.id || null);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ================= SAVE ================= */

const saveAgreement = async () => {
  if (!selectedCompany) {
    alert("Select company");
    return;
  }

  try {
    await axios.post(
      `${API}/admin/save-agreement`,
      {
        companyId: selectedCompany,
        agreement
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    alert("Agreement saved");

    setEditingId(null);
    setFile(null);
    fetchAgreements();

  } catch (err) {
    console.error(err);
    alert("Error saving agreement");
  }
};

/* ================= PDF ================= */

const generatePDF = async () => {
  if (!selectedCompany) {
    alert("Select company");
    return;
  }

  try {
    const res = await axios.post(
      `${API}/admin/generate-agreement-pdf`,
      {
        companyId: selectedCompany,
        agreement
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");

    link.href = url;
    link.download = "agreement.pdf";
    link.click();

  } catch (err) {
    console.error(err);
  }
};

/* ================= UI ================= */

return (
<div className="min-h-screen bg-slate-50 p-10">

<div className="max-w-7xl mx-auto">

{/* HEADER */}

<div className="flex justify-between mb-10">

<h1 className="text-3xl font-bold">
Client Agreement Settings
</h1>

<div className="flex gap-4">

<button
onClick={generatePDF}
className="bg-green-600 text-white px-6 py-3 rounded"
>
Download PDF
</button>

<span className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm">
Active Agreements
</span>

</div>

</div>

{/* COMPANY */}

<div className="bg-white p-6 rounded-2xl shadow mb-8">

<select
value={selectedCompany}
onChange={(e) => setSelectedCompany(e.target.value)}
className="border rounded-lg px-4 py-2 w-64"
>
<option value="">Select Company</option>
{companies.map(c => (
<option key={c.companyId} value={c.companyId}>
{c.name}
</option>
))}
</select>

</div>

{/* TABLE */}

<div className="bg-white rounded-2xl shadow-lg p-8 mb-10">

<table className="w-full">

<thead>
<tr className="text-left border-b">
<th>Company</th>
<th>Agreement</th>
<th>Status</th>
<th>Start</th>
<th>End</th>
<th>Action</th>
</tr>
</thead>

<tbody>

{agreements.map(a => {

const company = companies.find(c => c.companyId === a.companyId);

return (

<tr key={a.id} className="border-t">

<td>{company?.name || "-"}</td>

<td>{a.agreement?.agreementName || "-"}</td>

<td>
<span className={`px-3 py-1 rounded text-xs

${a.agreement?.agreementStatus === "Active"
? "bg-green-100 text-green-700"
: "bg-red-100 text-red-600"}

`}>
{a.agreement?.agreementStatus || "-"}
</span>
</td>

<td>{a.agreement?.startDate || "-"}</td>
<td>{a.agreement?.endDate || "-"}</td>

<td>
<button
onClick={() => handleEdit(a)}
className="bg-indigo-600 text-white px-3 py-1 rounded"
>
Edit
</button>
</td>

</tr>

);

})}

</tbody>

</table>

</div>

{/* FORM */}

<div className="bg-white p-6 rounded shadow">

<input
placeholder="Agreement Name"
value={agreement.agreementName || ""}
onChange={(e) => setAgreement({ ...agreement, agreementName: e.target.value })}
className="border p-2 mb-4 w-full"
/>

<input
type="date"
value={agreement.startDate || ""}
onChange={(e) => setAgreement({ ...agreement, startDate: e.target.value })}
className="border p-2 mb-4 w-full"
/>

<input
type="date"
value={agreement.endDate || ""}
onChange={(e) => setAgreement({ ...agreement, endDate: e.target.value })}
className="border p-2 mb-4 w-full"
/>

<button
onClick={saveAgreement}
className="bg-indigo-600 text-white px-6 py-2 rounded"
>
Save Agreement
</button>

</div>

</div>

</div>
);
}