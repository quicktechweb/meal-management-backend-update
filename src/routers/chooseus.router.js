const express = require("express");

const router = express.Router();

const {
  createChooseUs,
  allChooseUs,
  deleteChooseUs,
  singleChooseUs,
} = require("../controllers/chooseus.controller");
const upload = require("../utilities/multer");

router.post("/create-chooseus", upload.none(), createChooseUs);

router.get("/all-chooseus", allChooseUs);

router.get("/single-chooseus/:id", singleChooseUs);

router.delete("/delete-chooseus/:id", deleteChooseUs);

module.exports = router;
