const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseId: { type: String, required: true, unique: true },
    name: String,
    email: { type: String, required: true },
    image: String,
    phoneNumber: {
      type: String,
    },
   

    fatherName: {
      type: String,
      
    },

    motherName: {
      type: String,
      
    },

    userType: {
      type: String,
     
    },

    nid_number: {
      type: Number,
    },

    nid_image: {
      type: String,
    },

    instituteName: {
      type: String,
    },

    institute_image: {
      type: String,
    },

    address: {
      type: String,
    },

    dateOfBirth: Date,
    occupation: String,
    nationality: String,
    religion: String,
    gender: String,
  },

  { timestamps: true },
);

module.exports = mongoose.model("firebaseUser", userSchema);
