const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "cases.json");

function readCases() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath));
}

function writeCases(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

exports.addCase = (record) => {
  const cases = readCases();
  cases.push(record);
  writeCases(cases);
};

exports.getCaseById = (id) => readCases().find((c) => c.caseId === id);
exports.getAllCases = () => readCases();

exports.updateCaseStatus = (id, status) => {
  const cases = readCases();
  const i = cases.findIndex((c) => c.caseId === id);
  if (i === -1) return false;
  cases[i].status = status;
  writeCases(cases);
  return true;
};
