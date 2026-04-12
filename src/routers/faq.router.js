const express = require("express");
const router = express.Router();
const {
  createFAQ,
  getAllFAQ,
  updateFAQ,
  deleteFAQ,
} = require("../controllers/faq.controller");

router.post("/create-faq", createFAQ);
router.get("/all-faq", getAllFAQ);
router.put("/update-faq/:id", updateFAQ);
router.delete("/delete-faq/:id", deleteFAQ);

module.exports = router;
