const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const FirebaseUser = require("../models/firebase.user.model");
const requireAuth = async (req, res, next) => {
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

    console.log(decoded);

    let user;

    if (decoded.source === "local") {
      user = await User.findById(decoded.id).select("-password");
    }

    if (decoded.source === "firebase") {
      user = await FirebaseUser.findOne({
        firebaseId: decoded.firebaseId,
      });
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Request is not authorized",
    });
  }
};

module.exports = requireAuth;
