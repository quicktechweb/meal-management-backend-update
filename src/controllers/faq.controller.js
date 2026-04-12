const FAQ = require("../models/faq.model");

const createFAQ = async (req, res) => {
  try {
    const { question, answer, status, order } = req.body;

    const newFAQ = new FAQ({
      question,
      answer,
      status,
      order,
    });

    await newFAQ.save();

    res.status(201).json({
      success: true,
      message: "FAQ Created Successfully",
      data: newFAQ,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllFAQ = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: faqs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedFAQ = await FAQ.findByIdAndUpdate(id, req.body, { new: true });

    res.status(200).json({
      success: true,
      message: "FAQ Updated Successfully",
      data: updatedFAQ,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    await FAQ.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "FAQ Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFAQ,
  getAllFAQ,
  updateFAQ,
  updateFAQ,
  deleteFAQ,
};
