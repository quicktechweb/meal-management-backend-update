const ChooseUs = require("../models/chooseus.model");

const createChooseUs = async (req, res) => {
  try {
    const newData = new ChooseUs({
      title: req.body.title,
      description: req.body.description,
    });

    await newData.save();

    res.status(201).json({
      success: true,
      message: "Created Successfully",
      data: newData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const allChooseUs = async (req, res) => {
  try {
    const data = await ChooseUs.find();
    res
      .status(201)
      .json({ success: true, message: "Fatch successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const singleChooseUs = async (req, res) => {
  try {
    const data = await ChooseUs.findById(req.params.id);

    if (!data) {
      res.status(400).json({ success: false, message: "Data not found" });
    }

    res
      .status(201)
      .json({ success: true, message: "Data fetch successfully", data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteChooseUs = async (req, res) => {
  try {
    const data = await ChooseUs.findByIdAndDelete(req.params.id);

    if (!data) {
      res.status(400).json({ success: false, message: "data not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Data Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createChooseUs,
  allChooseUs,
  deleteChooseUs,
  singleChooseUs,
};
