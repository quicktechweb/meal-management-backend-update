const express = require("express");
const {
  createBanner,
  getAllBanner,
  getSingleBanner,
  deleteSingleBanner,
  updateBanner,
} = require("../controllers/banner.controller");
const upload = require("../utilities/multer.js");

const router = express.Router();

router.post(
  "/create-banner",
  upload.fields([
    { name: "banner_bg", maxCount: 10 },
    { name: "banner_image", maxCount: 10 },
  ]),
  createBanner,
);

router.get("/all-banner", getAllBanner);

router.get("/single-banner/:id", getSingleBanner);

router.put(
  "/banner-update/:id",
  upload.fields([
    { name: "banner_bg", maxCount: 10 },
    { name: "banner_image", maxCount: 10 },
  ]),
  updateBanner,
);

router.delete("/delete-banner/:id", deleteSingleBanner);

module.exports = router;
