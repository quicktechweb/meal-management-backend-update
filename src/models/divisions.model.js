const mongoose = require("mongoose");

const divisionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Division", divisionSchema);
