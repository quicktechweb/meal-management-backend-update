const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const Institute = require("../models/instititute.model.js");
const Hall = require("../models/hall.model.js");
const Mess = require("../models/mess.model.js");
const Blacklist = require("../models/blacklist.model");
const jwt = require("jsonwebtoken");
const uploadToImageBB = require("../utilities/uploadToImageBB.js");
const createToken = (id) => {
  return jwt.sign({ id, source: "local" }, process.env.Secret, {
    expiresIn: "7d",
  });
};

const IMAGEBB_API_KEY = process.env.imagbbKey;

const signupUser = async (req, res) => {
  try {
    let data = { ...req.body };

    if (req.files?.nid_image) {
      const nidFiles = req.files.nid_image.map((f) => f.buffer);

      data.nid_image = await uploadToImageBB(nidFiles, IMAGEBB_API_KEY);
    }

    if (req.files?.institute_image) {
      const instituteFiles = req.files.institute_image.map((f) => f.buffer);
      data.institute_image = await uploadToImageBB(
        instituteFiles,
        IMAGEBB_API_KEY,
      );
    }

    const user = await User.signUp(data);
    const token = createToken(user._id);

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        mother_name: user.motherName,
        father_name: user.fatherName,
        nid_number: user.nid_number,
        institute_name: user.instituteName,
        type: user.userType,
        name: user.name,
        nid_image: user.nid_image ? user.nid_image : null,
        institute_image: user.institute_image ? user.institute_image : null,
        address: user.address,
        country: user.country,
        state: user.state,
        city: user.city,
      },
      token,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};


const loginUser = async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    let user;

    // 🔍 login by email
    if (email) {
      user = await User.findOne({ email }).select("+password");
    }

    // 🔍 login by phone
    else if (phone) {
      user = await User.findOne({
        phoneNumber: phone,
      }).select("+password");
    }

    // ❌ user not found
    if (!user) {
      return res.status(400).json({
        success: false,
        error: "User not found",
      });
    }

    let isMatch = false;

    // 🔐 if bcrypt hash
    if (user.password.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(
        password,
        user.password
      );
    }

    // 🔓 plain text password
    else {
      isMatch = password === user.password;
    }

    // ❌ wrong password
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Incorrect password",
      });
    }

    // 🔑 token
    const token = createToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login Successfully",

      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        mother_name: user.motherName,
        father_name: user.fatherName,
        nid_number: user.nid_number,
        institute_name: user.instituteName,
        type: user.userType,
        name: user.name,
        nid_image: user.nid_image || null,
        institute_image: user.institute_image || null,
        address: user.address,
      },

      token,
    });

  } catch (err) {
    console.log(err);

    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

const updatePasswordByEmail = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 🔍 find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔐 hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // ✅ update password
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserData = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch user data",
    });
  }
};

 const getallUserData = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      success: true,
      totalUsers: users.length,
      users,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

const instituteSignupUser = async (req, res) => {
  try {
    let data = { ...req.body };

    if (req.files?.institute_document) {
      const file = req.files.institute_document[0].buffer;
      data.institute_document = await uploadToImageBB(file, IMAGEBB_API_KEY);
    }

    if (req.files?.nid_image) {
      const file = req.files.nid_image[0].buffer;
      data.nid_image = await uploadToImageBB(file, IMAGEBB_API_KEY);
    }

    const {
      username,
      email,
      password,
      phoneNumber,
      name,
      institute_name,
      institute_image,
      institute_address,
      hall_name,
      mess_name,
    } = data;

    if (
      !username ||
      !institute_name ||
      !institute_address ||
      !email ||
      !password
    ) {
      throw new Error("All required fields must be filled");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const institute = await Institute.create({
      name: institute_name,
      institute_image,
      institute_address,
    });

    console.log("hall name", hall_name);

    console.log("institue", institute);

    let hall = null;
    if (hall_name) {
      console.log("inside hall institute", institute);

      hall = await Hall.create({
        name: hall_name,
        institute: institute._id,
      });
    }

    let mess = null;
    if (mess_name) {
      mess = await Mess.create({
        name: mess_name,
        institute: institute._id,
      });
    }

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      name,
      institute: institute._id,
      hall: hall?._id,
      mess: mess?._id,
      role: "institute",
    });

    console.log(user, "user");

    institute.createdBy = user._id;
    await institute.save();

    return res.status(201).json({
      success: true,
      message: "Institute signup successful",
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(400).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.decode(token);

    await Blacklist.create({
      token,
      expiresAt: new Date(decoded.exp * 1000),
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  signupUser,
  loginUser,
  getUserData,
  createToken,
  instituteSignupUser,
  logout,
  getallUserData,
  updatePasswordByEmail,
};
