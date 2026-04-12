const express = require("express");
const uploadToImageBB = require("../utilities/uploadToImageBB");
const App = require("../models/app.modal");
const upload = require("../utilities/multer");
const router = express.Router();
const IMAGEBB_API_KEY = process.env.imagbbKey;

router.post(
  "/create-app",
  upload.fields([
    { name: "bg_app", maxCount: 10 },
    { name: "img_app", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const files = req.files;
      let bg_app_url = null;
      let img_app_url = null;

      const bg_app_file = files["bg_app"] ? files["bg_app"][0].buffer : null;

      const img_app_file = files["img_app"] ? files["img_app"][0].buffer : null;

      if (!bg_app_file) {
        res
          .status(400)
          .json({ success: false, message: "Background Required" });
      }

      if (!img_app_file) {
        res.status(400).json({ success: false, message: "Image Required" });
      }

      if (bg_app_file) {
        bg_app_url = await uploadToImageBB(bg_app_file, IMAGEBB_API_KEY);
      }

      if (img_app_file) {
        img_app_url = await uploadToImageBB(img_app_file, IMAGEBB_API_KEY);
      }

      let existing = await App.findOne();

      if (existing) {
        existing.title = req.body.title || existing.title;
        existing.description = req.body.description || existing.description;
        existing.bg_app = bg_app_url || existing.bg_app;
        existing.img_app = img_app_url || existing.img_app;
        existing.play_store_url =
          req.body.play_store_url || existing.play_store_url;
        existing.apple_store_url =
          req.body.apple_store_url || existing.apple_store_url;
        await existing.save();

        return res.status(200).json({
          success: true,
          message: "Updated Successfully",
          data: existing,
        });
      }

      const newData = new App({
        title: req.body.title,
        description: req.body.description,
        bg_app: bg_app_url,
        img_app: img_app_url,
        play_store_url: req.body.play_store_url,
        apple_store_url: req.body.apple_store_url,
      });

      await newData.save();

      // const data = await App.create({
      //   title: req.body.title,
      //   description: req.body.description,
      //   bg_app: bg_app_url,
      //   img_app: img_app_url,
      // });

      res.status(201).json({
        success: true,
        message: "Created successfully",
        data: newData,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

router.put(
  "/update-app/:id",
  upload.fields([
    { name: "bg_app", maxCount: 1 },
    { name: "img_app", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const updateData = req.body;

      if (files.bg_app?.length > 0) {
        const bgUrl = await uploadToImageBB(
          files.bg_app[0].buffer,
          IMAGEBB_API_KEY,
        );
        updateData.bg_app = bgUrl;
      }

      if (files.img_app?.length > 0) {
        const imgUrl = await uploadToImageBB(
          files.img_app[0].buffer,
          IMAGEBB_API_KEY,
        );
        updateData.img_app = imgUrl;
      }

      const updatedData = await App.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true },
      );

      return res.status(200).json({
        success: true,
        message: "Updated successfully",
        data: updatedData,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

router.get("/all-app", async (req, res) => {
  try {
    const data = await App.find();

    if (!data) {
      res.status(400).json({
        success: false,
        message: "Data not found",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Data fatch successfully", data: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/all-app-delete/:id", async (req, res) => {
  try {
    const data = await App.findByIdAndDelete(req.params.id);

    if (!data) {
      res.status(400).json({ success: false, message: "Data not found" });
    }
    res.status(200).json({
      success: true,
      message: "Data deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
