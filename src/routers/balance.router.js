const express = require("express");
const mongoose = require("mongoose");
const Balance = require("../models/balance.model");
const InstituteRegistration = require("../models/instituteRegistration.model");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

// ─────────────────────────────────────────────
// POST /balance/add-balance
// ─────────────────────────────────────────────
// router.post("/add-balance", instituteRequireAuth, async (req, res) => {
//   try {
//     const added_by = req.user._id;
//     const institute_id = req.user._id;

//     console.log(institute_id);

//     const { user, amount, note } = req.body;

//     // ── Validation ──
//     if (!user || !amount) {
//       return res.status(400).json({
//         success: false,
//         message: "user and amount are required",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(user)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user id",
//       });
//     }

//     const parsedAmount = Number(amount);
//     if (isNaN(parsedAmount) || parsedAmount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Amount must be a positive number",
//       });
//     }

//     const targetUser = await InstituteRegistration.findOne({
//       _id: user,
//       institute_id,
//     });

//     console.log(targetUser);

//     if (!targetUser) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found in this institute",
//       });
//     }

//     // ── Save balance record ──
//     const newBalance = await Balance.create({
//       user,
//       added_by,
//       institute_id,
//       amount: parsedAmount,
//       note: note?.trim() ?? "",
//     });

//     await newBalance.populate([
//       { path: "user", select: "email phone information.full_name uid" },
//       { path: "added_by", select: "email information.full_name" },
//     ]);

//     return res.status(201).json({
//       success: true,
//       message: "Balance added successfully",
//       data: newBalance,
//     });
//   } catch (error) {
//     console.error("Add balance error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

router.post("/add-balance", instituteRequireAuth, async (req, res) => {
  try {
    const added_by = req.user._id;
    const institute_id = req.user._id;

    const { user, amount, note } = req.body;

    console.log(user);

    if (!user || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "user and amount are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(user)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user id" });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be a positive number" });
    }

    console.log(parsedAmount);

    const targetUser = await InstituteRegistration.findOne({
      _id: user,
      institute_id,
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found in this institute" });
    }

    // ── Transaction record save ──
    const newBalance = await Balance.create({
      user,
      added_by,
      institute_id,
      amount: parsedAmount,
      note: note?.trim() ?? "",
    });

    // ── User er balance update ──
    await InstituteRegistration.findByIdAndUpdate(user, {
      $inc: { balance: parsedAmount },
    });

    await newBalance.populate([
      { path: "user", select: "email phone information.full_name uid balance" },
      { path: "added_by", select: "email information.full_name" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Balance added successfully",
      data: newBalance,
    });
  } catch (error) {
    console.error("Add balance error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────
// GET /balance/history/:userId
// ─────────────────────────────────────────────
router.get("/history/:userId", instituteRequireAuth, async (req, res) => {
  try {
    const institute_id = req.user.institute_id;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const history = await Balance.find({ user: userId, institute_id })
      .populate("added_by", "email information.full_name")
      .sort({ createdAt: -1 });

    const totalBalance = history.reduce((sum, b) => sum + b.amount, 0);

    return res.status(200).json({
      success: true,
      data: {
        history,
        totalBalance,
        count: history.length,
      },
    });
  } catch (error) {
    console.error("Balance history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
