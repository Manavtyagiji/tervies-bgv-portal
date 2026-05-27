#!/bin/bash
set -e
SERVER_FILE=${1:-server.js}
if [ ! -f "$SERVER_FILE" ]; then
  echo "ERROR: $SERVER_FILE not found"
  exit 1
fi
cp "$SERVER_FILE" "$SERVER_FILE.bak.$(date +%Y%m%d%H%M%S)"
python3 - "$SERVER_FILE" <<'PY'
import re, sys
p=sys.argv[1]
s=open(p,encoding='utf-8').read()
route=r'''app.get("/api/track/report/:caseId", async (req, res) => {
  try {
    const searchIdRaw = String(req.params.caseId || "").trim();
    const searchId = decodeURIComponent(searchIdRaw).toLowerCase().trim();

    const cases = readCases();
    const crmReports = (typeof readCRMReports === "function") ? readCRMReports() : [];
    const matchId = (v) => String(v || "").toLowerCase().trim() === searchId;

    let found = cases.find(c =>
      matchId(c.caseId) ||
      matchId(c.clientCaseId) ||
      matchId(c.name)
    );

    const crmReport = crmReports.find(r =>
      matchId(r.caseId) ||
      matchId(r.clientCaseId) ||
      matchId(r.name)
    );

    if (found && crmReport) found = { ...crmReport, ...found, qcReport: found.qcReport || crmReport };
    if (!found && crmReport) found = crmReport;

    if (!found) return res.status(404).json({ success: false, message: "Case not found" });

    const approved =
      found.sentToTrack === true ||
      found.qcApproved === true ||
      found.crmSentToTrack === true ||
      found.trackStatusSent === true ||
      found.sentToTrackStatus === true ||
      (found.qcReport && (found.qcReport.sentToTrack === true || found.qcReport.qcApproved === true));

    if (!approved) return res.status(403).json({ success: false, message: "Report not yet approved" });

    const key = found.bgvReportKey || found.reportKey || found.pdfKey || found.qcReportKey || found?.qcReport?.bgvReportKey || found?.qcReport?.reportKey || found?.qcReport?.pdfKey;
    if (key) {
      try {
        const command = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        return res.redirect(signedUrl);
      } catch (e) {
        console.warn("PDF key failed, generating fallback PDF:", e.message);
      }
    }

    const report = found.qcReport || found.report || found;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${String(found.caseId || report.caseId || "BGV").replace(/[^a-zA-Z0-9_-]/g, "_")}_Report.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 42 });
    doc.pipe(res);
    const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));

    doc.fontSize(18).font("Helvetica-Bold").text("FINAL BACKGROUND REPORT", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(12).font("Helvetica-Bold").text("Candidate Information");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Case ID: ${safe(found.caseId || report.caseId)}`);
    doc.text(`Candidate Name: ${safe(found.name || report.name || found.fullName || report.fullName)}`);
    doc.text(`Client Name: ${safe(found.clientName || report.clientName)}`);
    doc.text(`Client Case ID: ${safe(found.clientCaseId || report.clientCaseId)}`);
    doc.text(`Status: ${safe(found.status || report.status)}`);
    doc.text(`Report Generated At: ${safe(found.reportGeneratedAt || report.reportGeneratedAt || new Date().toISOString())}`);
    doc.moveDown();

    doc.fontSize(12).font("Helvetica-Bold").text("Executive Summary");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10).text(safe(report.finalRemarks || report.comments || report.verificationSummary || found.verificationSummary || "Verified as per provided details."), { width: 510 });
    doc.moveDown();

    const checks = Array.isArray(report.checks) ? report.checks : (Array.isArray(found.checks) ? found.checks : []);
    doc.fontSize(12).font("Helvetica-Bold").text("Verification Checks");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10);
    if (checks.length) checks.forEach((check, i) => doc.text(`${i + 1}. ${safe(check)}`));
    else doc.text("No checks found");

    doc.end();
  } catch (err) {
    console.error("DOWNLOAD BGV REPORT ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});'''
# remove all existing /api/track/report route blocks conservatively
pattern = r'app\.get\("/api/track/report/:caseId", async \(req, res\) => \{[\s\S]*?\n\}\);'
new, n = re.subn(pattern, route, s, count=1)
if n == 0:
    marker='/* =========================================================\n   PUBLIC DOWNLOAD VERIFIED DOCUMENT'
    idx=s.find(marker)
    if idx==-1:
        new=s+'\n\n'+route+'\n'
    else:
        new=s[:idx]+route+'\n\n'+s[idx:]
else:
    # remove duplicate later route blocks if any
    new = re.sub(pattern, '', new)
    # insert fixed route after public download verified document section marker or append if accidentally removed
    if '/api/track/report/:caseId' not in new:
        new += '\n\n'+route+'\n'
open(p,'w',encoding='utf-8').write(new)
print('PATCHED', p)
PY
node -c "$SERVER_FILE"
echo "OK: server.js patched. Restart backend now: pm2 restart all"

