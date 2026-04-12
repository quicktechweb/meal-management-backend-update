const mongoose = require("mongoose");
require("@dotenvx/dotenvx").config();

const Division = require("../models/divisions.model");
const District = require("../models/districts.model");
const Upazila = require("../models/upazila.model");

const data = require("../config/bd-data.json");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(" MongoDB Connected");

    await Division.deleteMany({});
    await District.deleteMany({});
    await Upazila.deleteMany({});
    console.log(" Old data cleared");

    const divisionMap = {};

    // ================== DIVISIONS ==================
    for (const div of data.divisions) {
      const divisionDoc = await Division.create({ name: div.name });
      divisionMap[div.name] = divisionDoc._id;
    }
    console.log(`${data.divisions.length} Divisions Seeded`);

    // ================== DISTRICTS + UPAZILAS ==================
    let totalDistricts = 0;
    let totalUpazilas = 0;

    for (const div of data.divisions) {
      const divisionId = divisionMap[div.name];

      for (const dist of div.districts) {
        const districtDoc = await District.create({
          name: dist.name,
          division_id: divisionId,
        });

        totalDistricts++;

        // Upazilas
        if (dist.upazilas && dist.upazilas.length > 0) {
          const upazilaDocs = dist.upazilas.map((up) => {
            const upName = typeof up === "string" ? up : up.name || up;
            return {
              name: upName,
              district_id: districtDoc._id,
            };
          });

          await Upazila.insertMany(upazilaDocs);
          totalUpazilas += upazilaDocs.length;
        }
      }
    }

    console.log(` ${totalDistricts} Districts Seeded`);
    console.log(`${totalUpazilas} Upazilas Seeded`);
    console.log("Full Bangladesh Data Seeded Successfully!");
  } catch (error) {
    console.error(" Seed Error:", error.message);
  } finally {
    process.exit();
  }
};

seed();
