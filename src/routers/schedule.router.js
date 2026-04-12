const express = require("express");
const router = express.Router();
const { getAllSchedule } = require("../controllers/schedule.controller");

const { createSchedule } = require("../controllers/schedule.controller");

const { getScheduleById } = require("../controllers/schedule.controller");

const { updateSchedule } = require("../controllers/schedule.controller");

const { deleteSchedule } = require("../controllers/schedule.controller");

router.get("/schedule", getAllSchedule);

router.post("/create-schedule", createSchedule);

router.get("/schedule/:id", getScheduleById);

router.put("/update-schedule/:id", updateSchedule);

router.delete("/delete-schedule/:id", deleteSchedule);

module.exports = router;
