const mongoose = require("mongoose");

const websiteSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, required: true },
    tagline: { type: String },
    logoUrl: { type: String },
    faviconUrl: { type: String },

    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    socialLinks: {
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      linkedin: { type: String },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WebsiteSettings", websiteSettingsSchema);
