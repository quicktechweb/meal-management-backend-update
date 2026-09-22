// middlewares/superAdminAuth.middleware.js
// শুধু Super Admin (User model, role = superadmin) এই route এ ঢুকতে পারবে।
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// ⚠️ "admin" ও ঢুকতে দিতে চাইলে এখানে যোগ করো: ["superadmin", "admin"]
const ALLOWED_ROLES = ["superadmin"];

const superAdminAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, error: "Authorization token required" });
  }

  try {
    const decoded = jwt.verify(authorization.split(" ")[1], process.env.Secret);

    // institute/firebase token এখানে চলবে না
    if (decoded.source !== "local") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, error: "Request is not authorized" });
  }
};

module.exports = superAdminAuth;
