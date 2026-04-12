const express = require("express");
const router = express.Router();

const {
  createNotice,
  getAllNotices,
  getSingleNotice,
  updateNotice,
  deleteNotice,
} = require("../controllers/notice.controller");

router.post("/create-notice", createNotice);
router.get("/all-notices", getAllNotices);
router.get("/single-notice/:id", getSingleNotice);
router.put("/notice-update/:id", updateNotice);
router.delete("/delete-notice/:id", deleteNotice);

module.exports = router;
