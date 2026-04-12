const mongoose = require("mongoose");

const serviceTypeSchema = new mongoose.Schema({
  title: { type: String, required: true },
});

module.exports = mongoose.model("ServiceType", serviceTypeSchema);
