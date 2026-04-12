const express = require("express");
const uploadToImageBB = require("../utilities/uploadToImageBB");
const ChooseImage = require("../models/chooseImage.model");
const IMAGEBB_API_KEY = process.env.imagbbKey;
const router = express.Router();
const mongoose = require("mongoose");
const upload = require("../utilities/multer");

router.post(
  "/create-choose-banner",
  upload.fields([{ name: "banner_image", maxCount: 10 }]),
  async (req, res) => {
    const files = req.files || {};
    let bannerUrl = null;
    if (files.banner_image?.length > 0) {
      bannerUrl = await uploadToImageBB(
        files.banner_image[0].buffer,
        IMAGEBB_API_KEY,
      );
    }

    let existing = await ChooseImage.findOne();

    if (existing) {
      existing.banner_image = bannerUrl || existing.banner_image;

      return res.status(200).json({
        success: true,
        message: "Updated Successfully",
        data: existing,
      });
    }

    const newData = ChooseImage({
      banner_image: bannerUrl,
    });

    await newData.save();

    res.status(201).json({
      success: true,
      message: "Created Successfully",
      data: newData,
    });
  },
);

router.put(
  "/update-choose-banner/:id",
  upload.fields([{ name: "banner_image", maxCount: 10 }]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Banner ID",
        });
      }

      const files = req.files || {};
      if (files.banner_image?.length > 0) {
        const bgUrl = await uploadToImageBB(
          files.banner_image[0].buffer,
          IMAGEBB_API_KEY,
        );
        updateData.banner_image = bgUrl;
      }

      const updatedBanner = await ChooseImage.findByIdAndUpdate(
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
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

router.get("/get-choose-image", async (req, res) => {
  try {
    const data = await ChooseImage.find();

    if (!data) {
      res.status(400).json({ success: false, message: "Data not found" });
    }

    res.status(201).json({
      success: true,
      message: "Data fetch successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({ success: true, message: err.message });
  }
});

router.delete("/delete-choose-image/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await ChooseImage.findByIdAndDelete(id);

    if (!data) {
      res.status(400).json({ success: false, message: "Data not found" });
    }

    res.status(200).json({ success: true, message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete" });
  }
});

module.exports = router;
