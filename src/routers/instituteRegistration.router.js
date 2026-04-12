const express = require("express");
const router = express.Router();

const {
  instituteRegistration,
  getPendingInstitutes,
  approveInstitute,
  instituteLogin,
  instituteUserRegistration,
  getApprovedInstitutes,
  instituteUserLogin,
  getPendingInstituteUser,
  approveInstituteUser,
  getInsituteUserData,
  updateInstituteUserData,
  userInstituteAdminData,
  getApprovedInstituteUser,
} = require("../controllers/instituteRegistration.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

router.post("/institute-registration", instituteRegistration);

router.get("/institute-pending-users", getPendingInstitutes);

router.get("/institute-approved-users", getApprovedInstitutes);

router.post("/institute-approved-users", approveInstitute);

router.post("/institute-login", instituteLogin);

router.post("/institute-user-registration", instituteUserRegistration);

router.get(
  "/instituteuser-pending-users",
  instituteRequireAuth,
  getPendingInstituteUser,
);

router.get(
  "/instituteuser-approved-user",
  instituteRequireAuth,
  getApprovedInstituteUser,
);

router.post("/instituteuser-approved-users", approveInstituteUser);

router.get("/instituteuser", instituteRequireAuth, getInsituteUserData);

router.get("/insituteuser-admin-data/:id", userInstituteAdminData);

router.patch(
  "/instituteuser/:id",
  instituteRequireAuth,
  updateInstituteUserData,
);

module.exports = router;
