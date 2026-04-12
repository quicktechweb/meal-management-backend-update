const mongoose = require("mongoose");

const mealInstituteRegistrationTypeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "MealInstituteRegistrationType",
  mealInstituteRegistrationTypeSchema,
);
