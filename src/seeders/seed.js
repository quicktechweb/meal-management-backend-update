require("@dotenvx/dotenvx").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    const existingAdmin = await User.findOne({ role: "superadmin" });
    if (existingAdmin) {
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("admin123456", 12);

    const superAdminData = {
      name: "Super Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "superadmin",
      username: "superadmin",
      phoneNumber: "01700000000",
    };

    await User.create(superAdminData);

    process.exit();
  } catch (error) {
    console.error("Error seeding superadmin:", error);
    process.exit(1);
  }
};

seedSuperAdmin();
