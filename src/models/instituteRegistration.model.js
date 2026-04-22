const mongoose = require("mongoose");

const instituteRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
    },

    role: {
      type: String,
    },
    routine_type: String,
    institute_id: String,
    uid: Number,
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
      user_type: String,

      kitchen_type: String,
      utility_service: [{ name: String }],
      service_feature: [{ name: String }],
      service: String,
      total_amount: Number,
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
