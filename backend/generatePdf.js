const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

module.exports = function generatePDF(report) {
  try {
    if (!fs.existsSync("reports")) {
      fs.mkdirSync("reports");
    }

    const filePath = path.join("reports", `${report.gvsId}.pdf`);
    console.log("📄 Generating PDF at:", filePath);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(18).text("BACKGROUND VERIFICATION REPORT", { align: "center" });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`GVS ID: ${report.gvsId}`);
    doc.text(`Client Name: ${report.clientName}`);
    doc.text(`Candidate Name: ${report.candidateDetails.name}`);
    doc.text(`Overall Status: ${report.candidateDetails.overallStatus}`);

    doc.end();

    stream.on("finish", () => {
      console.log("✅ PDF generated successfully");
    });

    stream.on("error", (err) => {
      console.error("❌ PDF stream error:", err);
    });

    return filePath;
  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    return null;
  }
};
