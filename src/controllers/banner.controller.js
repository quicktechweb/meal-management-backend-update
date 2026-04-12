const uploadToImageBB = require("../utilities/uploadToImageBB");
const IMAGEBB_API_KEY = process.env.imagbbKey;
const Banner = require("../models/banner.model");

const mongoose = require("mongoose");

const createBanner = async (req, res) => {
  try {
    const files = req.files || {};

    const bg_banner_file = files.banner_bg ? files.banner_bg[0] : null;
    const img_banner_file = files.banner_image ? files.banner_image[0] : null;

    if (!req.body.title) {
      return res.status(400).json({ message: "Banner title required" });
    }

    if (!req.body.description) {
      return res.status(400).json({ message: "Banner description required" });
    }

    if (!bg_banner_file) {
      return res.status(400).json({ message: "Banner background required" });
    }

    if (!img_banner_file) {
      return res.status(400).json({ message: "Banner image required" });
    }

    let bg_banner_url = null;
    let img_banner_url = null;

    // Upload background banner
    if (bg_banner_file) {
      bg_banner_url = await uploadToImageBB(
        bg_banner_file.buffer,
        IMAGEBB_API_KEY,
      );
    }

    // Upload main banner image
    if (img_banner_file) {
      img_banner_url = await uploadToImageBB(
        img_banner_file.buffer,
        IMAGEBB_API_KEY,
      );
    }

    // Save to DB
    const banner = await Banner.create({
      title: req.body.title,
      description: req.body.description,
      banner_bg: bg_banner_url,
      banner_image: img_banner_url,
    });

    res.status(201).json({
      success: true,
      message: "Banner uploaded successfully",
      data: banner,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getAllBanner = async (req, res) => {
  try {
    const data = await Banner.find();

    res.status(201).json({
      success: true,
      message: "Banner fatch successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Banner failed to fatch" });
  }
};

const getSingleBanner = async (req, res) => {
  try {
    const data = await Banner.findById(req.params.id);

    res.status(201).json({
      success: true,
      message: "Banner fatch successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Banner failed to fatch" });
  }
};

const deleteSingleBanner = async (req, res) => {
  try {
    const data = await Banner.findByIdAndDelete(req.params.id);

    if (!data) {
      res.status(400).json({ success: false, message: "Banner not found" });
    }

    res
      .status(201)
      .json({ success: true, message: "Banner deleleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Banner failed to delete" });
  }
};

const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Banner ID",
      });
    }

    const updateData = req.body;

    const files = req.files || {};

    if (files.banner_bg?.length > 0) {
      const bgUrl = await uploadToImageBB(
        files.banner_bg[0].buffer,
        IMAGEBB_API_KEY,
      );
      updateData.banner_bg = bgUrl;
    }

    if (files.banner_image?.length > 0) {
      const imgUrl = await uploadToImageBB(
        files.banner_image[0].buffer,
        IMAGEBB_API_KEY,
      );
      updateData.banner_image = imgUrl;
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedBanner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: updatedBanner,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Banner failed to update",
    });
  }
};

module.exports = {
  createBanner,
  getAllBanner,
  getSingleBanner,
  deleteSingleBanner,
  updateBanner,
};
