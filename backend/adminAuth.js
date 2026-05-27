const ADMIN_EMAIL = "admin@trueverification.com";
const ADMIN_PASSWORD = "admin123"; // later move to env

exports.loginAdmin = (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: "TRUEVER_ADMIN_TOKEN",
    });
  }

  res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });
};
