const InstituteUserMeal = require("../models/instituteUserMeal.modal");

const InstituteRegistration = require("../models/instituteRegistration.model");

const getMealTypeLists = async (req, res) => {
  try {
    const user = req.user;

    console.log(user, "user");

    const instituteAdmin = await InstituteRegistration.findOne({
      _id: user.institute_id,
    });

    console.log(instituteAdmin, "institute admin");

    const data = await InstituteUserMeal.create({
      institute_id: user.institute_id,
      meal_lists: instituteAdmin.routine.meal_type_lists,
    });

    res.status(201).json({
      success: true,
      message: "Meal type lists fatch successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getMealTypeLists;
