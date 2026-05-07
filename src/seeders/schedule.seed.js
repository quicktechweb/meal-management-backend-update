require("@dotenvx/dotenvx").config();

const mongoose = require("mongoose");
const Schedule = require("../models/schedule.model");
const scheduleData = require("../data/schedule.data");

mongoose.connect(process.env.MONGO_URL).then(async () => {
  try {
    await Schedule.deleteMany();

    await Schedule.insertMany(scheduleData);

    process.exit();
  } catch (error) {
    process.exit(1);
  }
});
