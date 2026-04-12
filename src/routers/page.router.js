const express = require("express");
const router = express.Router();
const {
  createPage,
  getAllPages,
  getSinglePage,
  updatePage,
  deletePage,
} = require("../controllers/page.controller");
const upload = require("../utilities/multer");

router.post("/create-page", upload.none(), createPage);
router.get("/all-page", getAllPages);
router.get("/single-page/:slug", getSinglePage);
router.put("/single-page/:id", upload.none(), updatePage);
router.delete("/single-page/:id", deletePage);

module.exports = router;
