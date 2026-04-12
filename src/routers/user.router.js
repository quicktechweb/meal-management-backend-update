const express = require("express");

const {
  loginUser,
  signupUser,
  getUserData,
  instituteSignupUser,
  logout,
} = require("../controllers/user.controller");

const upload = require("../utilities/multer.js");

const requireAuth = require("../middlewares/auth.middleware");

const router = express.Router();

// login router

router.post("/login", loginUser);

router.post(
  "/signup",
  upload.fields([
    { name: "nid_image", maxCount: 10 },
    { name: "institute_image", maxCount: 10 },
  ]),
  signupUser,
);

// auth user
router.get("/me", requireAuth, getUserData);

// institute user

router.post(
  "/institute-signup",
  upload.fields([{ name: "institute_document", maxCount: 5 }]),
  instituteSignupUser,
);

router.post("/log-out", logout);

module.exports = router;
