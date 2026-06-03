const mongoose = require("mongoose");

const instituteRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: false,
      sparse: true,
    },

    phone: {
      type: String,
      unique: false,
      sparse: true,
    },
 isRegister: {
  type: Boolean,
  default: false,
},
    role: {
      type: String,
    },
    routine_type: String,
    institute_id: String,
    uid: Number,
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance_history: [
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balance_before: {
      type: Number,
      required: true,
    },
    balance_after: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: "Balance updated",
    },
    ref: {
      type: String,
    },
    updated_by: {
      type: String,
      default: "system",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],
    //  Admin Approval System
    approval_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },

    approved_at: Date,
    rejected_reason: String,

    information: {
      // intitute user
      full_name: String,
      nickname: String,
      father_name: String,
      mother_name: String,
      guardian_name: String,
      relation_with_guardian: String,
      guardian_contact_number: String,
      gender: String,
      room_number: Number,
      religion: String,
      date_of_birth: String,
      occupation: String,
      company: String,
      designation: String,
      year: String,
      name_of_the_mess: String,
      name_of_the_hall: String,
      marital_status: String,
      salary: String,
      experience: String,
      certificates: [
        { degreeName: String, result: String, certificateImage: String },
      ],
      references: [
        {
          name: String,
          nid: String,
          nidImage: String,
          phone: String,
          occupation: String,
        },
      ],
      organization_type: String,
      instituteType: String,
      name_of_institute: String,
      number_of_member: Number,
      username: String,
      name_of_hall: String,
      name_of_mess: String,
      country: String,
      state: String,
      division: String,
      district: String,
      village: String,
      location: String,
      password: String,
      documents: [
        {
          document_type: String,
          document_number: String,
          document_files: String,
        },
      ],
    },

    services: {
      user_type: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceType" },
        title: String, // "user" or "client"
      },

      kitchen_type: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "Kitchen" },
        title: String,
      },

      utility_bills: [
        {
          utility_id: { type: mongoose.Schema.Types.ObjectId, ref: "Utility" },
          name: String,
          bear_the_cost: {
            id: mongoose.Schema.Types.ObjectId,
            title: String,
          },
        },
      ],

      service_features: [
        {
          feature_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceFeature",
          },
          name: String,
        },
      ],

      charges: [
        {
          charge_id: { type: mongoose.Schema.Types.ObjectId, ref: "Charge" },
          name: String,
          type: { type: String, enum: ["Per User", "Per Meal"] },
          charge_generate: String,
          price: Number,
          ranges: [
            {
              min: Number,
              max: Number,
              price: Number,
            },
          ],
        },
      ],

      total_amount: { type: Number, default: 0 },
    },

    routine: {
      meal_type_lists: [
        {
          day: String,
          meal_type: String,
          start_time: String,
          end_time: String,
          items: [
            {
              title: String,
              price: Number,
              image: {
                type: String,
              },
              video: {
                type: String,
              },
              ingridents: {
                type: String,
              },
            },
          ],

          status: {
            type: String,
            enum: ["active", "inactive"],
            default: "inactive",
          },
        },
      ],
      schedule_lists: [
        {
          day: String,
          meal_type: String,
          start_time: String,
          end_time: String,
          items: [
            {
              title: String,
              price: Number,
              image: {
                type: String,
              },
              video: {
                type: String,
              },
              ingridents: {
                type: String,
              },
            },
          ],
          alternative_items: [
            [
              {
                title: String,
                price: Number,
                image: {
                  type: String,
                },
                video: {
                  type: String,
                },
                ingridents: {
                  type: String,
                },
              },
            ],
          ],
        },
      ],
    },

    packages: {
      package_type_lists: [
        {
          package_type: String,
          start_time: String,
          end_time: String,
        },
      ],
      package_routine: [
        {
          day: String,
          package_title: String,
          package_price: Number,
          start_time: String,
          end_time: String,
          package_item: [
            {
              title: String,
            },
          ],
          alternative_items: [
            {
              title: String,
            },
          ],
        },
      ],
    },

    admin_info: {
      email_admin: String,
      phone_admin: String,
      date_of_birth: String,
      country_admin: String,
      state_admin: String,
      division_admin: String,
      district_admin: String,
      village_admin: String,
      location_admin: String,
      documents_admin: [
        {
          document_type: String,
          document_number: String,
          document_files: String,
        },
      ],
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    registration_step: {
      type: Number,
      default: 1,
    },

    added_by: {
      type: String,
      enum: ["self", "admin"],
      default: "self",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "InstituteRegistration",
  instituteRegistrationSchema,
);
