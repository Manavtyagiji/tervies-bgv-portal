const ExcelJS = require("exceljs");
const fs = require("fs");

const EXCEL_PATH = "./cases.xlsx";

exports.appendToExcel = async ({
  caseId,
  form,
  education = [],
  employment = [],
  reference = [],
  status,
}) => {
  const workbook = new ExcelJS.Workbook();

  if (fs.existsSync(EXCEL_PATH)) {
    await workbook.xlsx.readFile(EXCEL_PATH);
  }

  const sheet =
    workbook.getWorksheet("All Cases") ||
    workbook.addWorksheet("All Cases");

  // 🔹 HEADER (ONLY ONCE)
  if (sheet.rowCount === 0) {
    sheet.addRow([
      // Case Info
      "Case ID",
      "Status",
      "Created At",

      // Personal
      "Full Name",
      "DOB",
      "Gender",
      "Father Name",
      "Email",
      "Phone",

      // Address
      "Present Address",
      "Permanent Address",

      // Education (1st record)
      "Edu Institution",
      "University",
      "Degree",
      "Passing Year",
      "Registration No",
      "Mode",

      // Employment (1st record)
      "Company",
      "Designation",
      "Duration",
      "Employee ID",
      "CTC",
      "Manager",
      "Reason for Leaving",

      // Reference (1st)
      "Ref Name",
      "Ref Company",
      "Ref Designation",
      "Ref Phone",
      "Ref Email",
      "Ref Years",
    ]);
  }

  const edu = education[0] || {};
  const emp = employment[0] || {};
  const ref = reference[0] || {};

  // 🔹 DATA ROW
  sheet.addRow([
    caseId,
    status,
    new Date().toLocaleString(),

    form.fullName,
    form.dob,
    form.gender,
    form.fatherName,
    form.email,
    form.phone,

    form.presentAddress,
    form.permanentAddress,

    
    edu.institution,
    edu.university,
    edu.degree,
    edu.year,
    edu.registration,
    edu.mode,

    emp.company,
    emp.designation,
    emp.duration,
    emp.empId,
    emp.ctc,
    emp.manager,
    emp.reason,

    ref.name,
    ref.company,
    ref.designation,
    ref.phone,
    ref.email,
    ref.years,
  ]);

  await workbook.xlsx.writeFile(EXCEL_PATH);
};
