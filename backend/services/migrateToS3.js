require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  S3Client,
  PutObjectCommand
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const CASES_FILE = path.join(__dirname, "data", "cases.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const VERIFIED_DIR = path.join(__dirname, "verified");

const cases = JSON.parse(fs.readFileSync(CASES_FILE));

async function migrate() {

  console.log("🚀 Starting Migration to S3...\n");

  for (const c of cases) {

    // ===============================
    // MIGRATE CLIENT DOCUMENTS
    // ===============================

    if (c.documents) {
      for (const doc of c.documents) {

        if (!doc.key && doc.url && doc.url.startsWith("/uploads")) {

          const fileName = path.basename(doc.url);
          const localPath = path.join(UPLOADS_DIR, fileName);

          if (!fs.existsSync(localPath)) {
            console.log(`❌ File not found: ${localPath}`);
            continue;
          }

          const fileBuffer = fs.readFileSync(localPath);

          const newKey = `client/${c.caseId}-${Date.now()}-${doc.originalName}`;

          await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: newKey,
            Body: fileBuffer
          }));

          doc.key = newKey;
          delete doc.url;

          console.log(`✅ Migrated client doc: ${doc.originalName}`);
        }
      }
    }

    // ===============================
    // MIGRATE VERIFIED DOCUMENTS
    // ===============================

    if (c.verifiedDocuments) {
      for (const doc of c.verifiedDocuments) {

        if (!doc.key && doc.url && doc.url.startsWith("/verified")) {

          const fileName = path.basename(doc.url);
          const localPath = path.join(VERIFIED_DIR, fileName);

          if (!fs.existsSync(localPath)) {
            console.log(`❌ File not found: ${localPath}`);
            continue;
          }

          const fileBuffer = fs.readFileSync(localPath);

          const newKey = `verified/${c.caseId}-${Date.now()}-${doc.originalName}`;

          await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: newKey,
            Body: fileBuffer
          }));

          doc.key = newKey;
          delete doc.url;

          console.log(`✅ Migrated verified doc: ${doc.originalName}`);
        }
      }
    }

  }

  fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2));

  console.log("\n🎉 Migration Completed Successfully!");
}

migrate();
