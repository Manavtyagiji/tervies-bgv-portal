// mailer.js
const nodemailer = require("nodemailer");
const fs = require("fs");

const transporter = nodemailer.createTransport({
  service: "gmail", // ✅ change to your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ===================================================
   SEND EMAIL TO HR (FULL DETAILS + ATTACHMENTS)
=================================================== */
async function sendToHR({
  caseId,
  form,
  documents = [],
}) {
  const attachments = [];

  documents.forEach((doc) => {
    attachments.push({
      filename: doc.originalName,
      path: `.${doc.url}`,
    });
  });

  await transporter.sendMail({
    from: `"TrueVerification" <${process.env.EMAIL_USER}>`,
    to: process.env.HR_EMAIL,
    subject: `New BGV Case Submitted - ${caseId}`,
    html: `
      <h2>New Background Verification Case</h2>
      <p><b>Case ID:</b> ${caseId}</p>
      <p><b>Name:</b> ${form.fullName}</p>
      <p><b>Email:</b> ${form.email}</p>
      <p><b>Phone:</b> ${form.phone}</p>
      <hr/>
      <p>See attached documents.</p>
    `,
    attachments,
  });
}

/* ===================================================
   SEND CONFIRMATION TO CANDIDATE
=================================================== */
async function sendToCandidate({ caseId, email, name }) {
  await transporter.sendMail({
    from: `"TrueVerification" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Verification Request Received - ${caseId}`,
    html: `
      <h2>Hello ${name},</h2>
      <p>Your Background Verification request has been received.</p>
      <p><b>Case ID:</b> ${caseId}</p>
      <p>You can track your status anytime using your Case ID.</p>
      <br/>
      <p>Thank you,<br/>TrueVerification Team</p>
    `,
  });
}

module.exports = { sendToHR, sendToCandidate };
