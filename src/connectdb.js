const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const MONGO_URI =
      "mongodb+srv://meal-management:2IvCMhzyqzqz7Bw8@cluster0.y0s4gwr.mongodb.net/meal-management?retryWrites=true&w=majority";
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
