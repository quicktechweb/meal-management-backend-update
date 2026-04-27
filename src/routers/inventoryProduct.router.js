const express = require("express");

const router = express.Router();

const upload = require("../utilities/multer");
const uploadToImageBB = require("../utilities/uploadToImageBB");

const InventoryProduct = require("../models/inventoryProduct.model");

const IMAGEBB_API_KEY = process.env.imagbbKey;

// GET -
router.get("/inventory-product", async (req, res) => {
  try {
    const items = await InventoryProduct.find();

    return res.status(200).json({
      success: true,
      message: "Items fetched successfully",
      data: items,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post(
  "/inventory-product",
  upload.fields([{ name: "image", maxCount: 10 }]),
  async (req, res) => {
    try {
      const data = req.body;
      const files = req.files || {};

      console.log(files);

      if (!data) {
        return res
          .status(400)
          .json({ success: false, message: "All fields required" });
      }

      if (!data?.title) {
        return res
          .status(400)
          .json({ success: false, message: "Title field required" });
      }

      const imageFile = files.image ? files.image[0] : null;

      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadToImageBB(imageFile.buffer, IMAGEBB_API_KEY);
      }

      const itemData = await InventoryProduct.create({
        title: data.title,
        image: imageUrl,
      });

      return res.status(201).json({
        success: true,
        message: "Item Created Successfully",
        data: itemData,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

router.patch(
  "/inventory-product/:id",
  upload.fields([{ name: "image", maxCount: 10 }]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const files = req.files || {};

      const existingItem = await InventoryProduct.findById(id);
      if (!existingItem) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      const updateData = { ...data };

      const imageFile = files.image ? files.image[0] : null;
      if (imageFile) {
        updateData.image = await uploadToImageBB(
          imageFile.buffer,
          IMAGEBB_API_KEY,
        );
      }

      const updatedItem = await InventoryProduct.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true },
      );

      return res.status(200).json({
        success: true,
        message: "Item updated successfully",
        data: updatedItem,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// DELETE
router.delete("/inventory-product/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedItem = await InventoryProduct.findByIdAndDelete(id);

    if (!deletedItem) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
      data: deletedItem,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
