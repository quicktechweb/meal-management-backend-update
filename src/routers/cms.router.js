const express = require("express");
const Cms = require("../models/cms.model");
const Banner = require("../models/banner.model");
const ChooseImage = require("../models/chooseImage.model");
const ChooseUs = require("../models/chooseus.model");
const App = require("../models/app.modal");

const router = express.Router();

router.get("/cms", async (req, res) => {
  try {
    const banner = await Banner.find();
    const chooseImage = await ChooseImage.findOne();
    const chooseUs = await ChooseUs.find();
    const app = await App.findOne();

    let cms = await Cms.findOne();

    if (cms) {
      cms.banner = banner.map((item) => item._id);
      cms.chooseImage = chooseImage?._id;
      cms.chooseUs = chooseUs.map((item) => item._id);
      cms.app = app?._id;

      await cms.save();
    } else {
      cms = new Cms({
        banner: banner?._id,
        chooseImage: chooseImage?._id,
        chooseUs: chooseUs?._id,
        app: app?._id,
      });

      await cms.save();
    }

    const populatedCms = await Cms.findById(cms._id)
      .populate("banner")
      .populate("chooseImage")
      .populate("chooseUs")
      .populate("app");

    res.json({
      success: true,
      message: "CMS fetched successfully",
      data: populatedCms,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
