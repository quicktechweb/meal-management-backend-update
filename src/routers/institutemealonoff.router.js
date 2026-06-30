const express = require("express");

const router = express.Router();

const Institutemealonofftime = require("../models/institutemealonoff.model");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

router.post("/meal-on-off-time", instituteRequireAuth, async (req, res) => {
  console.log("\n🔥🔥🔥 [API HIT] /meal-on-off-time endpoint called! 🔥🔥🔥");
  console.log("[API HIT] Method:", req.method, "| URL:", req.originalUrl);
  console.log("[API HIT] Time:", new Date().toString());

  try {
    console.log("\n========== [START] POST /meal-on-off-time ==========");
    console.log("[STEP 1] RAW req.body:", JSON.stringify(req.body, null, 2));

    const { meal_on_off_time } = req.body;
    const institute_id = req.user._id;

    console.log("[STEP 1] meal_on_off_time (incoming):", meal_on_off_time);
    console.log("[STEP 2] req.user:", JSON.stringify(req.user, null, 2));
    console.log("[STEP 2] institute_id:", institute_id);

    if (!meal_on_off_time) {
      console.log("[STEP 3] ❌ VALIDATION FAILED — meal_on_off_time missing/falsy");
      console.log("[STEP 3] meal_on_off_time value was:", meal_on_off_time, "| typeof:", typeof meal_on_off_time);
      return res.status(400).json({
        success: false,
        message: "meal_on_off_time is required",
      });
    }

    console.log("[STEP 3] ✅ validation passed — meal_on_off_time present:", meal_on_off_time);

    console.log("[STEP 4] Update filter:", JSON.stringify({ institute_id }, null, 2));
    console.log("[STEP 4] Update $set payload:", JSON.stringify({ meal_on_off_time }, null, 2));
    console.log("[STEP 4] Options:", JSON.stringify({ upsert: true, new: true, runValidators: true }, null, 2));

    const data = await Institutemealonofftime.findOneAndUpdate(
      { institute_id },
      { $set: { meal_on_off_time } },
      { upsert: true, new: true, runValidators: true },
    );

    console.log("[STEP 5] ✅ DB write complete. Returned doc from Mongo:");
    console.log(JSON.stringify(data, null, 2));
    console.log("[STEP 5] data._id:", data?._id);
    console.log("[STEP 5] data.institute_id:", data?.institute_id);
    console.log("[STEP 5] data.meal_on_off_time (AFTER update):", data?.meal_on_off_time);

    console.log("[STEP 6] Sending 200 response — success: true");
    console.log("========== [END] POST /meal-on-off-time — SUCCESS ==========\n");

    res.status(200).json({
      success: true,
      message: "Saved Successfully",
      data,
    });
  } catch (error) {
    console.log("\n[FATAL ERROR] POST /meal-on-off-time threw an exception:");
    console.log(error);
    console.log("========== [END] POST /meal-on-off-time — ERROR ==========\n");
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// router.post("/meal-on-off-time", async (req, res) => {
//   try {
//     const { meal_on_off_time, institute_id } = req.body;

//     if (!meal_on_off_time) {
//       return res.status(400).json({
//         success: false,
//         message: "meal_on_off_time is required",
//       });
//     }

//     const data = await Institutemealonofftime.findOneAndUpdate(
//       { institute_id },
//       { $set: { meal_on_off_time } },
//       { upsert: true, new: true, runValidators: true },
//     );

//     res.status(200).json({
//       success: true,
//       message: "Saved Successfully",
//       data,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

router.get("/meal-on-off-time", instituteRequireAuth, async (req, res) => {
  const user = req.user;

  try {
    const data = await Institutemealonofftime.findOne({
      institute_id: user.institute_id,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get(
  "/institute-meal-on-off-time",
  instituteRequireAuth,
  async (req, res) => {
    const user = req.user;

    try {
      const data = await Institutemealonofftime.findOne({
        institute_id: user._id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

module.exports = router;
