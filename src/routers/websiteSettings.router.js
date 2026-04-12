const express = require("express");
const WebsiteSettings = require("../models/website.settings.model");
const upload = require("../utilities/multer");
const uploadToImageBB = require("../utilities/uploadToImageBB");
const IMAGEBB_API_KEY = process.env.imagbbKey;

const router = express.Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await WebsiteSettings.findOne();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  "/settings",
  upload.fields([
    { name: "logoUrl", maxCount: 1 },
    { name: "faviconUrl", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const data = req.body;

      const logo_file = files.logoUrl ? files.logoUrl[0] : null;
      const fav_file = files.faviconUrl ? files.faviconUrl[0] : null;

      let logo_url = null;
      let fav_url = null;

      if (logo_file) {
        logo_url = await uploadToImageBB(logo_file.buffer, IMAGEBB_API_KEY);
      }

      if (fav_file) {
        fav_url = await uploadToImageBB(fav_file.buffer, IMAGEBB_API_KEY);
      }

      const existing = await WebsiteSettings.findOne();

      if (existing) {
        existing.logoUrl = logo_url || existing.logoUrl;
        existing.faviconUrl = fav_url || existing.faviconUrl;

        Object.assign(existing, data);

        await existing.save();

        return res.status(200).json({
          success: true,
          message: "Updated Successfully",
          data: existing,
        });
      }

      const updatedData = {
        ...data,
        logoUrl: logo_url,
        faviconUrl: fav_url,
      };

      const settings = await WebsiteSettings.create(updatedData);

      res.status(201).json({
        success: true,
        message: "Created Successfully",
        data: settings,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// router.put(
//   "/settings",
//   upload.fields([
//     { name: "logoUrl", maxCount: 10 },
//     { name: "faviconUrl", maxCount: 10 },
//   ]),
//   async (req, res) => {
//     try {
//       const data = req.body;
//       const files = req.files || {};

//       if (files.logoUrl?.length > 0) {
//         const logoUrl = await uploadToImageBB(
//           files.logoUrl[0].buffer,
//           IMAGEBB_API_KEY,
//         );
//         data.logoUrl = logoUrl;
//       }

//       if (files.faviconUrl?.length > 0) {
//         const favUrl = await uploadToImageBB(
//           files.faviconUrl[0].buffer,
//           IMAGEBB_API_KEY,
//         );
//         data.faviconUrl = favUrl;
//       }

//       let settings = await WebsiteSettings.findOne();

//       if (settings) {
//         settings = await WebsiteSettings.findOneAndUpdate({}, data, {
//           new: true,
//         });
//       } else {
//         settings = await WebsiteSettings.create(data);
//       }

//       res.json({ success: true, data: settings });
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   },
// );

module.exports = router;
