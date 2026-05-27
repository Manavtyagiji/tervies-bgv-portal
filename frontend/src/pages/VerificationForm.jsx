import { useState, useEffect } from "react";
import axios from "../utils/axios";

export default function VerificationForm() {
  const [selectedService, setSelectedService] = useState("");
  const [verificationTypes, setVerificationTypes] = useState([]);

  const [form, setForm] = useState({
    fullName: "",
    dob: "",
    gender: "",
    fatherName: "",
    email: "",
    phone: "",
    clientName: "",
    companyId: "",
    spocName: "",
    presentAddress: "",
    permanentAddress: "",
    criminalDetails: ""
  });

  const [documents, setDocuments] = useState({
    address: null,
    employment: null,
    education: null,
    criminal: null,
  });

  const [previews, setPreviews] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const name = params.get("name");
    const email = params.get("email");
    const phone = params.get("phone");
    const clientName = params.get("clientName");
    const companyId = params.get("companyId");

    setForm((prev) => ({
      ...prev,
      fullName: name || "",
      email: email || "",
      phone: phone || "",
      clientName: clientName || "",
      companyId: companyId || ""
    }));
  }, []);

  const handleForm = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (section, file) => {
    if (!file) return;

    setDocuments((prev) => ({
      ...prev,
      [section]: file
    }));

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({
          ...prev,
          [section]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addService = () => {
    if (selectedService && !verificationTypes.includes(selectedService)) {
      setVerificationTypes([...verificationTypes, selectedService]);
      setSelectedService("");
    }
  };

  const removeService = (type) => {
    setVerificationTypes(verificationTypes.filter((t) => t !== type));

    setDocuments((prev) => ({ ...prev, [type]: null }));
    setPreviews((prev) => ({ ...prev, [type]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (verificationTypes.length === 0) {
      alert("Please select at least one service");
      return;
    }

    try {
      const data = new FormData();
      data.append("verificationTypes", JSON.stringify(verificationTypes));
      data.append("form", JSON.stringify(form));

      Object.entries(documents).forEach(([key, file]) => {
        if (file) data.append(key, file);
      });

      await axios.post("/api/submit", data);
      alert("Submitted Successfully");
    } catch (error) {
      console.error("Submit error:", error);
      alert("Submission failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-gray-900 p-6">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-2xl space-y-8">
        <h1 className="text-3xl font-bold text-indigo-700 text-center">
          Candidate Verification Form
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-l-4 border-indigo-600 pl-3">
              Basic Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="fullName"
                placeholder="Full Name"
                value={form.fullName}
                onChange={handleForm}
              />
              <Input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleForm}
              />
              <Input
                name="fatherName"
                placeholder="Father Name"
                value={form.fatherName}
                onChange={handleForm}
              />
              <Input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleForm}
              />
              <Input
                name="phone"
                placeholder="Mobile Number"
                value={form.phone}
                onChange={handleForm}
              />
              <Input
                name="clientName"
                placeholder="Client Name"
                value={form.clientName}
                readOnly
              />
              <Input
                name="spocName"
                placeholder="SPOC Name"
                value={form.spocName}
                onChange={handleForm}
              />

              <select
                name="gender"
                value={form.gender}
                onChange={handleForm}
                className="border px-3 py-2 rounded-lg"
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-l-4 border-indigo-600 pl-3">
              Select Verification Services
            </h2>

            <div className="flex gap-3">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="flex-1 border px-4 py-2 rounded-lg"
              >
                <option value="">Select Service</option>
                <option value="address">Address Verification</option>
                <option value="employment">Employment Verification</option>
                <option value="education">Education Verification</option>
                <option value="criminal">Criminal Check</option>
              </select>

              <button
                type="button"
                onClick={addService}
                className="bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {verificationTypes.map((type) => (
                <div
                  key={type}
                  className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full flex items-center gap-2"
                >
                  {type.toUpperCase()}
                  <button
                    type="button"
                    onClick={() => removeService(type)}
                    className="text-red-500 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {verificationTypes.includes("address") && (
            <ServiceSection
              title="Address Verification"
              section="address"
              handleForm={handleForm}
              handleFileChange={handleFileChange}
              previews={previews}
              form={form}
            />
          )}

          {verificationTypes.includes("employment") && (
            <div className="space-y-4 border p-5 rounded-xl bg-indigo-50">
              <h3 className="text-lg font-semibold text-indigo-700">
                Employment Verification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  name="company"
                  placeholder="Company Name"
                  value={form.company || ""}
                  onChange={handleForm}
                />
                <Input
                  name="designation"
                  placeholder="Designation"
                  value={form.designation || ""}
                  onChange={handleForm}
                />
                <Input
                  name="duration"
                  placeholder="Duration (From - To)"
                  value={form.duration || ""}
                  onChange={handleForm}
                />
                <Input
                  name="employeeId"
                  placeholder="Employee ID"
                  value={form.employeeId || ""}
                  onChange={handleForm}
                />
                <Input
                  name="ctc"
                  placeholder="CTC"
                  value={form.ctc || ""}
                  onChange={handleForm}
                />
                <Input
                  name="manager"
                  placeholder="Reporting Manager"
                  value={form.manager || ""}
                  onChange={handleForm}
                />
              </div>

              <textarea
                name="reasonLeaving"
                placeholder="Reason for Leaving"
                value={form.reasonLeaving || ""}
                onChange={handleForm}
                className="border px-3 py-2 rounded-lg w-full"
              />

              <input
                type="file"
                onChange={(e) => handleFileChange("employment", e.target.files[0])}
              />

              {previews.employment && (
                <img
                  src={previews.employment}
                  alt="Employment Preview"
                  className="mt-3 max-h-48 rounded border"
                />
              )}
            </div>
          )}

          {verificationTypes.includes("education") && (
            <div className="space-y-4 border p-5 rounded-xl bg-indigo-50">
              <h3 className="text-lg font-semibold text-indigo-700">
                Education Verification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  name="institution"
                  placeholder="Institution Name"
                  value={form.institution || ""}
                  onChange={handleForm}
                />
                <Input
                  name="university"
                  placeholder="University / Board"
                  value={form.university || ""}
                  onChange={handleForm}
                />
                <Input
                  name="degree"
                  placeholder="Degree / Qualification"
                  value={form.degree || ""}
                  onChange={handleForm}
                />
                <Input
                  name="year"
                  placeholder="Year of Passing"
                  value={form.year || ""}
                  onChange={handleForm}
                />
                <Input
                  name="registration"
                  placeholder="Registration No"
                  value={form.registration || ""}
                  onChange={handleForm}
                />
                <select
                  name="mode"
                  value={form.mode || ""}
                  onChange={handleForm}
                  className="border px-3 py-2 rounded-lg"
                >
                  <option value="">Mode of Study</option>
                  <option>Full Time</option>
                  <option>Part Time</option>
                  <option>Distance</option>
                </select>
              </div>

              <input
                type="file"
                onChange={(e) => handleFileChange("education", e.target.files[0])}
              />

              {previews.education && (
                <img
                  src={previews.education}
                  alt="Education Preview"
                  className="mt-3 max-h-48 rounded border"
                />
              )}
            </div>
          )}

          {verificationTypes.includes("criminal") && (
            <div className="space-y-4 border p-5 rounded-xl bg-indigo-50">
              <h3 className="text-lg font-semibold text-indigo-700">
                Criminal Check
              </h3>

              <textarea
                name="criminalDetails"
                placeholder="Have you ever been involved in any criminal case? Provide details."
                value={form.criminalDetails || ""}
                onChange={handleForm}
                className="border px-3 py-2 rounded-lg w-full"
              />

              <input
                type="file"
                onChange={(e) => handleFileChange("criminal", e.target.files[0])}
              />

              {previews.criminal && (
                <img
                  src={previews.criminal}
                  alt="Criminal Preview"
                  className="mt-3 max-h-48 rounded border"
                />
              )}
            </div>
          )}

          <button className="w-full bg-indigo-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-indigo-700">
            Submit Verification
          </button>
        </form>
      </div>
    </div>
  );
}

const Input = (props) => (
  <input {...props} className="border px-3 py-2 rounded-lg w-full" />
);

const ServiceSection = ({
  title,
  section,
  form,
  handleForm,
  handleFileChange,
  previews,
  textareaName
}) => (
  <div className="space-y-3 border p-4 rounded-xl bg-indigo-50">
    <h3 className="text-lg font-semibold">{title}</h3>

    {section === "address" && (
      <>
        <Input
          name="presentAddress"
          placeholder="Present Address"
          value={form.presentAddress || ""}
          onChange={handleForm}
        />
        <Input
          name="permanentAddress"
          placeholder="Permanent Address"
          value={form.permanentAddress || ""}
          onChange={handleForm}
        />
      </>
    )}

    {textareaName && (
      <textarea
        name={textareaName}
        placeholder="Details"
        onChange={handleForm}
        className="border px-3 py-2 rounded-lg w-full"
      />
    )}

    <input
      type="file"
      onChange={(e) => handleFileChange(section, e.target.files[0])}
    />

    {previews[section] && (
      <img
        src={previews[section]}
        alt="Preview"
        className="mt-3 max-h-48 rounded-lg border shadow"
      />
    )}
  </div>
);

const UploadOnlySection = ({ title, section, handleFileChange, previews }) => (
  <div className="space-y-3 border p-4 rounded-xl bg-indigo-50">
    <h3 className="text-lg font-semibold">{title}</h3>

    <input
      type="file"
      onChange={(e) => handleFileChange(section, e.target.files[0])}
    />

    {previews[section] && (
      <img
        src={previews[section]}
        alt="Preview"
        className="mt-3 max-h-48 rounded-lg border shadow"
      />
    )}
  </div>
);