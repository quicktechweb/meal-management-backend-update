const express = require("express");
const router = express.Router();
const upload = require("../utilities/multer.js");

const {
  uploadKitchenVideo,
  allKitchenVideo,
  deleteKitchenVideo,
  updateKitchenVideo,
} = require("../controllers/kitchenvideo.controller");

router.post(
  "/upload-video",
  upload.fields([
    { name: "kitchen_thumbnail", maxCount: 10 },
    { name: "kitchen_video", maxCount: 1 },
  ]),
  uploadKitchenVideo,
);

router.put(
  "/update-video/:id",
  upload.fields([
    { name: "kitchen_thumbnail", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  updateKitchenVideo,
);

router.get("/all-video", allKitchenVideo);

router.delete("/delete-kitchen-video/:id", deleteKitchenVideo);

module.exports = router;
