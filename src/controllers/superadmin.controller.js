const User = require("../models/user.model");
const sendEmail = require("../utilities/sendEmail");
const crypto = require("crypto");

const createAdmin = async (req, res) => {
  try {
    const { name, email, username } = req.body;

    const generatedPassword = crypto.randomBytes(4).toString("hex");

    const newAdmin = await User.create({
      name,
      email,
      username,
      password: generatedPassword,
      role: "admin",
      firebaseId: `admin-${Date.now()}`,
    });

    const message = `হ্যালো ${name},\n\nআপনাকে আমাদের সিস্টেমে অ্যাডমিন হিসেবে যুক্ত করা হয়েছে।\n\nআপনার লগইন ডিটেইলস:\nইমেইল: ${email}\nপাসওয়ার্ড: ${generatedPassword}\n\nঅনুগ্রহ করে লগইন করার পর পাসওয়ার্ড পরিবর্তন করে নিন।`;

    try {
      await sendEmail({
        email: newAdmin.email,
        subject: "Welcome to Meal Management - Admin Access",
        message: message,
      });

      res.status(201).json({
        success: true,
        message: "Admin created and email sent successfully!",
      });
    } catch (err) {
      res.status(201).json({
        success: true,
        message: "Admin created but email could not be sent.",
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = createAdmin;
