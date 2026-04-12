require("@dotenvx/dotenvx").config();

const cors = require("cors");

const express = require("express");
const morgan = require("morgan");

const mongoose = require("mongoose");

const authRoute = require("./routers/user.router");
const firebaseauthRoute = require("./routers/user.firebase.router");
const scheduleRoute = require("./routers/schedule.router");
const kitchenRoute = require("./routers/kitchen.router");
const utilityRoute = require("./routers/utility.router");
const serviceRoute = require("./routers/service.router");
const featureRoute = require("./routers/feature.router");
const superAdminRoute = require("./routers/superadmin.router");
const hallRoute = require("./routers/hall.router");
const messRoute = require("./routers/mess.router");
const instituteRoute = require("./routers/institute.router");
const noticeRoute = require("./routers/notices.router");
const kitchenVideoRoute = require("./routers/kitchenvideo.router");
const bannerRoute = require("./routers/banner.router");
const reviewRoute = require("./routers/review.router");
const chooseusRoute = require("./routers/chooseus.router");
const appRoute = require("./routers/app.router");
const chooseImageRoute = require("./routers/chooseImage.router");
const pageRoute = require("./routers/page.router");
const cmsRoute = require("./routers/cms.router");
const faqRoute = require("./routers/faq.router");
const websiteSettingRoute = require("./routers/websiteSettings.router");
const itemRoute = require("./routers/item.router");

const instituteRegistrationRoute = require("./routers/instituteRegistration.router");

const costRoute = require("./routers/cost.router");

const instituteUserMealRoute = require("./routers/instituteUserMeal.router");

const mealInstituteRegistrationTypeRoute = require("./routers/mealInstituteRegistrationType.router");

const serviceTypeRoute = require("./routers/serviceType.router");

const userMealRoute = require("./routers/user.meal.router");

const HomeReviewRoute = require("./routers/home.review.router");

const PackageRoute = require("./routers/package.router");

const locationRoute = require("./routers/location.router");

const rolesRoute = require("./routers/role.router");

const permissionsRoute = require("./routers/permission.router");
const connectDB = require("./connectdb");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
connectDB();
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to our server" });
});

app.use("/api/auth", authRoute);

app.use("/api", scheduleRoute);
app.use("/api", kitchenRoute);
app.use("/api", utilityRoute);
app.use("/api", serviceRoute);
app.use("/api", featureRoute);
app.use("/api", hallRoute);
app.use("/api", messRoute);
app.use("/api", instituteRoute);
app.use("/api", noticeRoute);
app.use("/api", kitchenVideoRoute);
app.use("/api", reviewRoute);
app.use("/api", HomeReviewRoute);

// cms
app.use("/api", bannerRoute);
app.use("/api", chooseusRoute);
app.use("/api", appRoute);
app.use("/api", chooseImageRoute);
app.use("/api", pageRoute);
app.use("/api", cmsRoute);
app.use("/api", faqRoute);

app.use("/api", superAdminRoute);

app.use("/api", websiteSettingRoute);

app.use("/api", itemRoute);

app.use("/api", costRoute);

app.use("/api", instituteRegistrationRoute);

app.use("/api", instituteUserMealRoute);

app.use("/api", mealInstituteRegistrationTypeRoute);

app.use("/api", serviceTypeRoute);

app.use("/api", userMealRoute);

app.use("/api", PackageRoute);

app.use("/api", locationRoute);

app.use("/api", rolesRoute);

app.use("/api", permissionsRoute);

// firebase auth
app.use("/api/firebaseAuth", firebaseauthRoute);

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size too large! Maximum size is 5MB.",
    });
  }

  if (err.message === "Only image files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// mongoose
//   .connect(process.env.MONGO_URL)
//   .then(() => {
//     app.listen(5000, "0.0.0.0", () => {
//       console.log("Server running on port 5000");
//     });
//   })
//   .catch((err) => {
//     console.error("MongoDB connection failed:", err);
//   });
