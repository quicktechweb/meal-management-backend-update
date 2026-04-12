const UserMeal = require("../models/user.meal.model");

const createUserMeal = async (req, res) => {
  try {
    const meal_data = req.body;

    let result;

    if (Array.isArray(meal_data)) {
      for (const meal of meal_data) {
        if (meal.type === "day-wise") {
          result = await UserMeal.insertMany(meal_data);
          res.status(201).json({
            success: true,
            message: "Meal Created Successfully",
            data: result,
          });
        }
        if (meal.type === "show-all") {
          const results = [];

          for (const meal of meal_data) {
            const updatedMeal = await UserMeal.findOneAndUpdate(
              {
                meal_type: meal.meal_type,
                type: "show-all",
              },
              { $set: meal },
              {
                new: true,
                upsert: true,
              },
            );

            results.push(updatedMeal);
          }

          return res.status(200).json({
            success: true,
            message: "Meals Created Successfully",
            data: results,
          });
        }
      }
    } else {
      result = await UserMeal.create(meal_data);
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  createUserMeal,
};
