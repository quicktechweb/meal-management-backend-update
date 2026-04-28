const express = require("express");
const InventoryGlobalAmount = require("../models/inventoryglobalamount.model");

const router = express.Router();

// POST
router.post("/inventory-global-amount", async (req, res) => {
  try {
    const { global_amount } = req.body;

    let record = await InventoryGlobalAmount.findOne();

    if (!record) {
      record = await InventoryGlobalAmount.create({ global_amount });
    } else {
      record.global_amount = global_amount;
      await record.save();
    }

    res.status(200).json({
      success: true,
      message: "Amount Created Successfully",
      data: record,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET
router.get("/inventory-global-amount", async (req, res) => {
  try {
    const record = await InventoryGlobalAmount.findOne();

    if (!record) {
      return res.status(404).json({ message: "No record found" });
    }

    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
