const mongoose = require("mongoose");

const instituteUserMealSchema = new mongoose.Schema(
  {
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
    },
    meal_lists: [
      {
        meal_type: {
          type: String,
        },
        start_time: {
          type: String,
        },         
        end_time: {
          type: String,
        },
        items: [{ title: String, price: Number }],
        status: {
          type: String,
          enum: ["active", "inactive"],
          default: "inactive",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("InstituteUserMeal", instituteUserMealSchema);
