const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["superadmin", "admin", "user", "institute"],
      default: "user",
    },
    firebaseId: {
      type: String,
      unique: true,
    },
    websiteAccesstype: {
      type: String,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid email address"],
    },

    password: {
      type: String,
    },

    phoneNumber: {
      type: String,
    },
    name: {
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
      type: [String],
      default: [],
    },

    institute_image: {
      type: [String],
      default: [],
    },

    address: {
      type: String,
    },

    image: {
      type: String,
    },
    country: String,
    state: String,
    city: String,
    dateOfBirth: Date,
    occupation: String,
    nationality: String,
    religion: String,
    gender: String,

    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
    },

    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hall",
    },

    mess: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
    },
  },
  { timestamps: true },
);

userSchema.statics.signUp = async function (data) {
  const {
    email,
    password,
    username,
    websiteAccesstype,
    role,
    phoneNumber,
    name,
    fatherName,
    motherName,
    instituteName,
    institute_image,
    nid_image,
    nid_number,
    userType,
    address,
    country,
    state,
    city,
  } = data;

  if (
    !email ||
    !password ||
    !username ||
    !websiteAccesstype ||
    !name ||
    !fatherName ||
    !motherName
  ) {
    throw new Error("All required fields must be filled");
  }

  // if (!country || !state || !city) {
  //   throw new Error("country,state,city fields must be filled");
  // }

  if (!validator.isEmail(email)) {
    throw new Error("Invalid email address");
  }

  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
  ) {
    throw new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number and symbol",
    );
  }

  const emailExists = await this.findOne({ email });
  if (emailExists) {
    throw new Error("Email already in use");
  }

  const usernameExists = await this.findOne({ username });
  if (usernameExists) {
    throw new Error("Username already in use");
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  if (!userType || !phoneNumber) {
    throw new Error("User Type and phoneNumber are required");
  }
  if (userType === "user") {
    if (!nid_number || !nid_image) {
      throw new Error("Nid Number and Nid Image are required");
    }
  }

  if (userType === "institute") {
    if (!instituteName || !institute_image) {
      throw new Error("Institute Name and Institute Image are required");
    }
  }

  const user = await this.create({
    email,
    password: hash,
    username,
    websiteAccesstype,
    role: role || "user",
    phoneNumber,
    name,
    userType,
    instituteName,
    institute_image,
    fatherName,
    motherName,
    nid_number,
    nid_image,
    address,
    country,
    state,
    city,
  });

  return user;
};

userSchema.statics.login = async function (email, password) {
  if (!email || !password) {
    throw new Error("All fields must be filled");
  }

  const user = await this.findOne({ email });
  if (!user) {
    throw new Error("Incorrect email");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error("Incorrect password");
  }

  return user;
};

module.exports = mongoose.model("User", userSchema);
