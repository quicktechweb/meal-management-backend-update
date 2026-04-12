const KitchenVideo = require("../models/kitchen.video.model");
const cloudinary = require("../utilities/cloudinary");
const uploadToImageBB = require("../utilities/uploadToImageBB");

const IMAGEBB_API_KEY = process.env.imagbbKey;

const uploadVideoToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "kitchen_videos",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
};

// Upload Kitchen Video
const uploadKitchenVideo = async (req, res) => {
  try {
    const files = req.files || {};

    const videoFile = files.kitchen_video ? files.kitchen_video[0] : null;
    const thumbnailFile = files.kitchen_thumbnail
      ? files.kitchen_thumbnail[0]
      : null;

    // Validate required fields
    if (!videoFile) {
      return res.status(400).json({ message: "Video file is required" });
    }
    if (!req.body.title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Upload thumbnail if provided
    let thumbnailUrl = null;
    if (thumbnailFile) {
      thumbnailUrl = await uploadToImageBB(
        thumbnailFile.buffer,
        IMAGEBB_API_KEY,
      );
    }

    // Upload video to Cloudinary
    const cloudinaryResult = await uploadVideoToCloudinary(videoFile.buffer);

    // Save to DB
    const video = await KitchenVideo.create({
      title: req.body.title,
      kitchen_thumbnail: thumbnailUrl,
      kitchen_video: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id,
    });

    res.status(201).json({
      success: true,
      message: "Video created successfully",
      data: video,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong during upload",
    });
  }
};

// Get all Kitchen Videos
const allKitchenVideo = async (req, res) => {
  try {
    const data = await KitchenVideo.find();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Kitchen Video
const updateKitchenVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    const files = req.files || {};

    // Update video if new file uploaded
    if (files.video) {
      const cloudinaryResult = await uploadVideoToCloudinary(
        files.video[0].buffer,
      );
      updateData.kitchen_video = cloudinaryResult.secure_url;
      updateData.public_id = cloudinaryResult.public_id;
    }

    // Update thumbnail if new file uploaded
    if (files.kitchen_thumbnail) {
      const thumbnailUrl = await uploadToImageBB(
        files.kitchen_thumbnail[0].buffer,
        IMAGEBB_API_KEY,
      );
      updateData.kitchen_thumbnail = thumbnailUrl;
    }

    const updatedKitchenVideo = await KitchenVideo.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      },
    );

    if (!updatedKitchenVideo) {
      return res
        .status(404)
        .json({ success: false, message: "Kitchen video not found" });
    }

    res.status(200).json({
      success: true,
      message: "Kitchen video updated successfully",
      data: updatedKitchenVideo,
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteKitchenVideo = async (req, res) => {
  try {
    const kitchenVideo = await KitchenVideo.findByIdAndDelete(req.params.id);

    if (!kitchenVideo) {
      return res.status(404).json({
        success: false,
        message: "Kitchen Video not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Kitchen Video deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  uploadKitchenVideo,
  allKitchenVideo,
  updateKitchenVideo,
  deleteKitchenVideo,
};
