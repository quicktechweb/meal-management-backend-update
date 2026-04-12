const mongoose = require("mongoose");

const upazilaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "District",
    required: true,
  },
});

module.exports = mongoose.model("Upazila", upazilaSchema);
