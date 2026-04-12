const jwt = require("jsonwebtoken");
const InstituteRegistration = require("../models/instituteRegistration.model");

const instituteRequireAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      error: "Authorization token required",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.Secret);

    let user;

    user = await InstituteRegistration.findById(decoded.id).select("-password");

    req.user = user;

    

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Request is not authorized",
    });
  }
};

module.exports = instituteRequireAuth;
