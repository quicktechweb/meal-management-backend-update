const Schedule = require("../models/schedule.model");

const dayOrder = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };

// Get all schedules
const getAllSchedule = async (req, res) => {
  try {
    const data = await Schedule.find().sort({ dayNumber: 1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new schedule

const createSchedule = async (req, res) => {
  try {
    const { day, meals } = req.body;

    if (!day) {
      return res
        .status(400)
        .json({ success: false, message: "Day is required" });
    }

    if (!dayOrder.hasOwnProperty(day)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid day value" });
    }

    const exist = await Schedule.findOne({ day });
    if (exist) {
      return res.status(400).json({
        success: false,
        message: "Schedule already exists for this day",
      });
    }

    const scheduleData = {
      day,
      dayNumber: dayOrder[day],
      meals: Array.isArray(meals)
        ? meals.map((meal) => ({
            mealType: meal.mealType,
            items: Array.isArray(meal.items) ? meal.items : [],
          }))
        : [],
    };

    const schedule = await Schedule.create(scheduleData);

    res.status(201).json({
      success: true,
      message: "Schedule Created Successfully",
      data: schedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET all schedules
exports.getAllSchedule = async (req, res) => {
  try {
    const data = await Schedule.find();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  single schedule
const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule)
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });

    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// update schecule controller
const updateSchedule = async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.day) {
      body.dayNumber = dayOrder[body.day];
    }

    const updated = await Schedule.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Schedule Data Updated Successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const deleted = await Schedule.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Schedule not found" });

    res
      .status(200)
      .json({ success: true, message: "Schedule deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllSchedule,
  createSchedule,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};
