const axios = require("axios");

// 🔴 PUT YOUR REAL WEBHOOK URL HERE
const HR_WEBHOOK_URL =
  "https://hooks.slack.com/services/XXX/YYY/ZZZ";

module.exports = async ({ caseId, form }) => {
  try {
    await axios.post(HR_WEBHOOK_URL, {
      text: `📩 *New Background Verification Submitted*

🆔 Case ID: ${caseId}

👤 Name: ${form.fullName}
📧 Email: ${form.email}
📞 Phone: ${form.phone}

⏱ Submitted At: ${new Date().toLocaleString()}
      `,
    });

    console.log("✅ HR notified successfully");
  } catch (err) {
    console.error("❌ HR webhook error:", err.message);
  }
};