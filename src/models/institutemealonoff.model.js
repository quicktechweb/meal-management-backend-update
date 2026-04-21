const mongoose = require("mongoose");

const institutemealonofftimeSchema = new mongoose.Schema(
  {
    institute_id: String,
    meal_on_off_time: {
      type: Number,
      default: 6,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "Institutemealonofftime",
  institutemealonofftimeSchema,
);
