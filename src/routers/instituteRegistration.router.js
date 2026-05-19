const express = require("express");
const router = express.Router();
const InstituteRegistration = require("../models/instituteRegistration.model");

const Role = require("../models/role.model");

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
  deleteInstituteUser,
  getApprovedInstituteallUser,
  addBalance,
  getBalance,
  getAllInstituteUserspart,
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
router.get(
  "/instituteuser-approved-user-all",
  // instituteRequireAuth,
  getApprovedInstituteallUser,
);

router.post("/add-balance/:userId", addBalance);
router.get("/balance/:userId", getBalance);
router.post("/instituteuser-approved-users", approveInstituteUser);

router.get("/instituteuser", instituteRequireAuth, getInsituteUserData);
router.get("/instituteuseralldata",  getAllInstituteUserspart);

router.get("/insituteuser-admin-data/:id", userInstituteAdminData);

router.patch(
  "/instituteuser/:id",
  instituteRequireAuth,
  updateInstituteUserData,
);

router.patch(
  "/instituteuser-role-update",
  instituteRequireAuth,
  async (req, res) => {
    try {
      const { user_ids, role } = req.body;

      if (!user_ids || !role) {
        return res
          .status(400)
          .json({ message: "user_ids and role are required" });
      }

      const ids = Array.isArray(user_ids) ? user_ids : [user_ids];

      await InstituteRegistration.updateMany(
        { _id: { $in: ids } },
        { role: role },
      );

      res.status(200).json({
        success: true,
        message: "Roles updated successfully",
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

router.delete(
  "/instituteuser-delete",
  instituteRequireAuth,
  deleteInstituteUser,
);

router.get(
  "/individual-user-role-permission",
  instituteRequireAuth,
  async (req, res) => {
    try {
      const user = req.user;

      console.log(user);

      const roles = await Role.find({
        institute_id: user.institute_id ?? user._id,
      }).populate("permissions");

      const individual_user_role_permission = roles?.find(
        (role) => role?.name?.toLowerCase() === user?.role?.toLowerCase(),
      );

      console.log(individual_user_role_permission);

      if (!individual_user_role_permission) {
        return res.status(404).json({
          success: false,
          message: "Role not found for this user",
        });
      }

      return res.status(200).json({
        success: true,
        data: individual_user_role_permission,
      });
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

module.exports = router;
