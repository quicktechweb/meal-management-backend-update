const express = require("express");
const router = express.Router();

const Item = require("../models/item.modal");
const upload = require("../utilities/multer");
const uploadToImageBB = require("../utilities/uploadToImageBB");
const cloudinary = require("../utilities/cloudinary");

const IMAGEBB_API_KEY = process.env.imagbbKey;

const uploadVideoToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "items_videos",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
};

router.post(
  "/item-create",
  upload.fields([
    { name: "image", maxCount: 10 },
    { name: "video", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const data = req.body;
      const files = req.files || {};

      if (!data) {
        return res
          .status(400)
          .json({ success: false, message: "All fields required" });
      }

      if (!data?.price) {
        return res
          .status(400)
          .json({ success: false, message: "Price field required" });
      }

      if (!data?.title) {
        return res
          .status(400)
          .json({ success: false, message: "Title field required" });
      }

      if (!data?.ingridents) {
        return res.status(400).json({
          success: false,
          message: "Ingredients field required",
        });
      }

      const imageFile = files.image ? files.image[0] : null;
      const videoFile = files.video ? files.video[0] : null;

      let imageUrl = null;
      let videoUrl = null;
      let publicId = null;

      if (imageFile) {
        imageUrl = await uploadToImageBB(imageFile.buffer, IMAGEBB_API_KEY);
      }

      if (videoFile) {
        const videoUpload = await uploadVideoToCloudinary(videoFile.buffer);

        videoUrl = videoUpload.secure_url;
        publicId = videoUpload.public_id;
      }

      const itemData = await Item.create({
        title: data.title,
        price: Number(data.price),
        ingridents: data.ingridents,
        image: imageUrl,
        video: videoUrl,
        public_id: publicId,
      });

      return res.status(201).json({
        success: true,
        message: "Item Created Successfully",
        data: itemData,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

router.put(
  "/items/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = req.body;

      const files = req.files || {};
      const imageFile = files?.image ? files.image[0] : null;

      const videoFile = files?.video ? files.video[0] : null;

      if (videoFile) {
        const cloudinaryResult = await uploadVideoToCloudinary(
          videoFile.buffer,
        );
        updatedData.video = cloudinaryResult.secure_url;
        updatedData.public_id = cloudinaryResult.public_id;
      }

      if (imageFile) {
        const imageUrl = await uploadToImageBB(
          imageFile.buffer,
          IMAGEBB_API_KEY,
        );
        updatedData.image = imageUrl;
      }

      const updatedItem = await Item.findByIdAndUpdate(id, updatedData, {
        new: true,
        runValidators: true,
      });

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Item updated successfully",
        data: updatedItem,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },
);

router.delete("/item/:id", async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/items", async (req, res) => {
  try {
    const data = await Item.find();

    if (!data) {
      res.status(400).json({ success: false, message: "No Data Found" });
    }

    res.status(200).json({
      success: true,
      message: "Items Fetch Successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
