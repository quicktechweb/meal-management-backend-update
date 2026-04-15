const jwt = require("jsonwebtoken");
const InstituteRegistration = require("../models/instituteRegistration.model");

const instituteRequireAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authorization token required",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.Secret);

    const user = await InstituteRegistration.findById(decoded.id).select(
      "-password",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: "Institute account is deactivated",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token has expired",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Request is not authorized",
    });
  }
};

module.exports = instituteRequireAuth;
