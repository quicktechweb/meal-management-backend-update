const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utilities/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "kitchen_videos",
    resource_type: "video",
  },
});

const upload_video = multer({ storage });

module.exports = upload_video;
