const mongoose = require("mongoose");
const slugify = require("slugify");

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
    },

    content: {
      type: String,
      required: true,
    },

    metaTitle: String,
    metaDescription: String,

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true },
);

pageSchema.pre("save", async function (next) {
  if (this.title) {
    this.slug = await slugify(this.title, { lower: true, strict: true });
  }
});

module.exports = mongoose.model("Page", pageSchema);
