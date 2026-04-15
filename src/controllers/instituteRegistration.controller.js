const InstituteRegistration = require("../models/instituteRegistration.model");
const Role = require("../models/role.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const createToken = (id) => {
  return jwt.sign({ id }, process.env.Secret, { expiresIn: "7d" });
};

const instituteRegistration = async (req, res) => {
  try {
    const data = req.body;

    console.log(data);

    // update step 2 ,step 3 ,step 4
    if (data.userId) {
      const updateData = {
        information: data.information,
        services: data.services,
        routine: data.routine,
        packages: data.packages,
        admin_info: data.admin_info,
        registration_step: data.registration_step,
      };

      if (data.registration_step === 1) {
        if (data.email) updateData.email = data.email;
        if (data.phone) updateData.phone = data.phone;
        if (data.role) updateData.role = data.role;
        if (data?.information?.password) {
          const salt = await bcrypt.genSalt(10);
          updateData.information = {
            ...data.information,
            password: await bcrypt.hash(data.information.password, salt),
          };
        }
      }

      // approval on the step 4
      if (data.registration_step === 4) {
        updateData.approval_status = "pending";

        try {
          const createdRoles = await Promise.all(
            data?.roles?.map((roleName) =>
              Role.create({ name: roleName, institute_id: data.userId }),
            ),
          );

          const roleIds = createdRoles.map((role) => role._id);

          updateData.roles = roleIds;
        } catch (roleError) {
          console.error("Error creating roles:", roleError);
        }
      }

      if (data.registration_step === 3) {
        updateData.routine_type = data?.routine_type;
      }

      const updatedUser = await InstituteRegistration.findByIdAndUpdate(
        data.userId,
        { $set: updateData },
        { new: true },
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User Not Found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Data Updated Successfully",
        user: updatedUser,
      });
    }

    // new registration step 1
    if (!data.email && !data.phone) {
      return res.status(400).json({
        success: false,
        message: "Email or Phone number required",
      });
    }

    const query = [];
    if (data.email) query.push({ email: data.email });
    if (data.phone) query.push({ phone: data.phone });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data?.information?.password, salt);

    const user = await InstituteRegistration.findOneAndUpdate(
      {
        $or: query,
        approval_status: { $ne: "pending" },
        registration_step: { $lt: 4 },
      },
      {
        $set: {
          ...(data.email && { email: data.email }),
          ...(data.phone && { phone: data.phone }),
          ...(data.role && { role: data.role }),
          information: {
            ...data.information,
            password: hashedPassword,
          },
          services: data.services || {},
          routine: data.routine || {},
          admin_info: data.admin_info || {},
          registration_step: 1,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This email and phone number already have an account.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Step 1 added Successfully",
      userId: user._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} have already Registered`,
      });
    }

    console.log(updatedUser);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//  Login (Approval Check)
const instituteLogin = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    let query = [];

    if (email) query.push({ email: email });
    if (phone) query.push({ phone: phone });

    const user = await InstituteRegistration.findOne({
      $or: query,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.information.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    //  Approval Check
    if (user.approval_status === "pending") {
      return res.status(403).json({
        success: false,
        message: `Your account is waiting for ${user?.role === "institute_admin" ? "Admin" : "Institute admin"}  approval`,
      });
    }

    if (user.approval_status === "rejected") {
      return res.status(403).json({
        success: false,
        message: `Your account has been rejected by ${user?.role === "institute_admin" ? "Admin" : "Institute admin"}`,
      });
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//  Admin Approve / Reject

const approveInstitute = async (req, res) => {
  try {
    const { userId, status, rejected_reason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updateData = {
      approval_status: status,
    };

    if (status === "approved") {
      updateData.approved_at = new Date();
    }

    if (status === "rejected") {
      updateData.rejected_reason = rejected_reason || "";
    }

    const user = await InstituteRegistration.findByIdAndUpdate(
      userId,
      updateData,
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Pending Institutes

const getPendingInstitutes = async (req, res) => {
  try {
    const users = await InstituteRegistration.find({
      role: "institute",
      approval_status: { $in: ["pending", "approved", "rejected"] },
    }).populate();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get approved institute

const getApprovedInstitutes = async (req, res) => {
  try {
    const users = await InstituteRegistration.find({
      approval_status: "approved",
      role: "institute",
    });

    return res.status(200).json({
      success: true,
      data: users?.map((user) => ({
        instituteType: user.information.instituteType,
        name_of_institute: user.information.name_of_institute,
        number_of_member: user.information.number_of_member,
        name_of_hall: user.information.name_of_hall
          ? user.information.name_of_hall
          : null,
        name_of_mess: user.information.name_of_mess
          ? user.information.name_of_mess
          : null,

        _id: user._id,
        role: user?.role,
        email: user?.email,
        phone: user?.phone,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// institute user

const instituteUserRegistration = async (req, res) => {
  try {
    const data = req.body;

    if (!data.email && !data.phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const exists = await InstituteRegistration.findOne({
      $or: [{ email: data.email }, { phone: data.phone }],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or phone",
      });
    }

    // password hash
    const hashedPassword = await bcrypt.hash(data.password, 10);

    //  determine added_by
    const addedBy = data.added_by || "self";

    // approval logic
    const approvalStatus = addedBy === "admin" ? "approved" : "pending";

    const newUser = await InstituteRegistration.create({
      email: data.email || null,
      phone: data.phone || null,
      role: "user",
      added_by: addedBy,
      approval_status: approvalStatus,
      approved_at: addedBy === "admin" ? new Date() : null,
      institute_id: data.institute_id,

      information: {
        full_name: data.full_name,
        nickname: data.nickname,
        username: data.username,
        father_name: data.father_name,
        mother_name: data.mother_name,
        guardian_name: data.guardian_name,
        relation_with_guardian: data.relation_with_guardian,
        guardian_contact_number: data.guardian_contact_number,
        gender: data.gender,
        religion: data.religion,
        date_of_birth: data.date_of_birth,
        country: data.country,
        division: data.division,
        district: data.district,
        village: data.village,
        location: data.location,
        occupation: data.occupation,
        company: data.company,
        designation: data.designation,
        year: data.year,
        name_of_the_institute: data.name_of_the_institute,
        name_of_the_mess: data.name_of_the_mess,
        name_of_the_hall: data.name_of_the_hall,
        password: hashedPassword,
        documents: data.documents,
      },
    });

    res.status(201).json({
      success: true,
      message:
        addedBy === "admin"
          ? "User created and approved by admin"
          : "Registered successfully, waiting for admin approval",

      data: newUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPendingInstituteUser = async (req, res) => {
  const user = req.user;

  try {
    const users = await InstituteRegistration.find({
      institute_id: user._id,
    }).populate();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getApprovedInstituteUser = async (req, res) => {
  const user = req.user;

  try {
    const users = await InstituteRegistration.find({
      institute_id: user._id,
      approval_status: "approved",
    }).populate();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const approveInstituteUser = async (req, res) => {
  try {
    const { userId, status, rejected_reason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updateData = {
      approval_status: status,
    };

    if (status === "approved") {
      updateData.approved_at = new Date();
    }

    if (status === "rejected") {
      updateData.rejected_reason = rejected_reason || "";
    }

    const user = await InstituteRegistration.findByIdAndUpdate(
      userId,
      updateData,
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getInsituteUserData = async (req, res) => {
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

const updateInstituteUserData = async (req, res) => {
  try {
    const { id } = req.params;

    const instituteUser = await InstituteRegistration.findById(id);

    if (!instituteUser) {
      return res.status(404).json({
        success: false,
        message: "Institute user not found",
      });
    }

    const updatedUser = await InstituteRegistration.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Institute user updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update institute user",
      error: error.message,
    });
  }
};

const userInstituteAdminData = async (req, res) => {
  try {
    const { id } = req.params;
    const instituteAdminUser = await InstituteRegistration.findById(id);

    if (!instituteAdminUser) {
      return res.status(404).json({
        success: false,
        message: "Institute user not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Institute Admin data fatch successfully",
      data: instituteAdminUser,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fatch data",
      error: err.message,
    });
  }
};

const deleteInstituteUser = async (req, res) => {
  try {
    const user = req.user;

    const { user_ids, institute_id } = req.body;

    if (institute_id !== user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized action",
      });
    }

    if (!user_ids) {
      return res
        .status(400)
        .json({ message: "user_ids and role are required" });
    }

    const ids = Array.isArray(user_ids) ? user_ids : [user_ids];

    const result = await InstituteRegistration.deleteMany({
      _id: { $in: ids },
    });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} Users deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  instituteRegistration,
  instituteLogin,
  approveInstitute,
  getPendingInstitutes,
  getApprovedInstitutes,
  instituteUserRegistration,
  getPendingInstituteUser,
  approveInstituteUser,
  getInsituteUserData,
  updateInstituteUserData,
  userInstituteAdminData,
  getApprovedInstituteUser,
  deleteInstituteUser,
};
