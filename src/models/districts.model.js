const mongoose = require("mongoose");

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  division_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Division",
    required: true,
  },
});

module.exports = mongoose.model("District", districtSchema);
