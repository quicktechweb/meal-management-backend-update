const express = require("express");
const Division = require("../models/divisions.model");
const District = require("../models/districts.model");
const Upazila = require("../models/upazila.model");

const router = express.Router();

router.get("/divisions", async (req, res) => {
  try {
    const data = await Division.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/districts", async (req, res) => {
  try {
    const { division_id } = req.query;
    const data = await District.find({ division_id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get upazilas by district
router.get("/upazilas", async (req, res) => {
  try {
    const { district_id } = req.query;
    const data = await Upazila.find({ district_id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/all-location", async (req, res) => {
  try {
    const divisions = await Division.find();

    const result = await Promise.all(
      divisions.map(async (division) => {
        const districts = await District.find({ division_id: division._id });

        const districtsWithUpazilas = await Promise.all(
          districts.map(async (district) => {
            const upazilas = await Upazila.find({ district_id: district._id });
            return {
              ...district.toObject(),
              upazilas: upazilas,
            };
          }),
        );

        return {
          ...division.toObject(),
          districts: districtsWithUpazilas,
        };
      }),
    );

    res.json({
      success: true,
      totalDivisions: result.length,
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
