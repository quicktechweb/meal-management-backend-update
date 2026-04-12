const mongoose = require("mongoose");

const kitchenSchema = new mongoose.Schema({
  title: { type: String, required: true },
});



module.exports = mongoose.model("Kitchen", kitchenSchema);
