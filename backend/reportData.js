module.exports = function generateReportData(candidate) {
  return {
    gvsId: `GVS-${Date.now()}`,
    clientName: "TrueVerification Pvt Ltd",
    allocationDate: new Date().toLocaleDateString(),
    deliveryDate: new Date().toLocaleDateString(),

    candidateDetails: {
      name: candidate.fullName,
      dob: candidate.dob,
      gender: candidate.gender,
      fatherName: candidate.fatherName,
      levelOfCheck: "Comprehensive",
      overallStatus: "GREEN",
      color: "GREEN",
    },

    checks: [
      { name: "Residential Address Check", status: "Verified", color: "GREEN" },
      { name: "Employment Check", status: "Verified", color: "GREEN" },
      { name: "Education Check", status: "Verified", color: "GREEN" },
      { name: "Criminal Police Record Check", status: "Clear", color: "GREEN" },
      { name: "Criminal Database Check", status: "Clear", color: "GREEN" },
      { name: "Professional Reference Check", status: "Positive", color: "GREEN" },
    ],
  };
};
