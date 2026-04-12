const Notices = require("../models/notices.model");

// CREATE Notice
const createNotice = async (req, res) => {
  try {
    if (!req.body.title || !req.body.notice_expire_date) {
      return res.status(400).json({
        success: false,
        message: "Title and expire date required",
      });
    }

    // Expire date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expireDate = new Date(req.body.notice_expire_date);

    if (expireDate < today) {
      return res.status(400).json({
        success: false,
        message: "Expire date cannot be before today",
      });
    }

    const notice = await Notices.create({
      title: req.body.title,
      notice_expire_date: expireDate,
    });

    res.status(201).json({
      success: true,
      message: "Notice Created Successfully",
      data: notice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET All Notices
const getAllNotices = async (req, res) => {
  try {
    const notices = await Notices.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET Single Notice
const getSingleNotice = async (req, res) => {
  try {
    const notice = await Notices.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE Notice
const updateNotice = async (req, res) => {
  try {
    if (req.body.notice_expire_date) {
      const expireDate = new Date(req.body.notice_expire_date);
      req.body.notice_expire_date = expireDate;
    }

    const notice = await Notices.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notice Updated Successfully",
      data: notice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE Notice
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notices.findByIdAndDelete(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createNotice,
  getAllNotices,
  getSingleNotice,
  updateNotice,
  deleteNotice,
};
