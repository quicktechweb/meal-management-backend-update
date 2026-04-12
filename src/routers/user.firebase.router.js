const express = require("express");
const admin = require("../utilities/firebaseAdmin");
const firebaseUser = require("../models/firebase.user.model");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/google", async (req, res) => {
  try {
    console.log(req.body);

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    let user = await firebaseUser.findOne({ firebaseId: decoded.uid });

    if (!user) {
      user = await firebaseUser.create({
        firebaseId: decoded.uid,
        name: decoded.name || "",
        email: decoded.email || "",
        image: decoded.picture || "",
      });
    }

    const auth_token = jwt.sign(
      { firebaseId: user.firebaseId, source: "firebase" },
      process.env.Secret,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      user,
      token: auth_token,
      message: "Google Login Successfully",
    });
  } catch (err) {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
});

module.exports = router;
