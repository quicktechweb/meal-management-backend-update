const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  module: { type: String, required: true },
});

module.exports = mongoose.model("Permission", permissionSchema);
