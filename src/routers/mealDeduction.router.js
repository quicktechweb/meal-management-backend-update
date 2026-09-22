// routers/mealDeduction.router.js
// 🧾 Meal এর টাকা কাটার history — User / Institute / Super Admin তিন জায়গার জন্য।
//
//   GET /api/meal-deductions/my         → user নিজের কাটা টাকার history
//   GET /api/meal-deductions/institute  → institute panel (ওই institute এর সব student)
//   GET /api/meal-deductions/admin      → super admin (সব institute, ?instituteId= দিয়ে filter)
//
// Query (সবগুলোতে optional):
//   from=YYYY-MM-DD  to=YYYY-MM-DD  meal_type=Breakfast|Lunch|Dinner|all
//   search=নাম/uid/phone/email   page=1   limit=20
const express = require("express");
const mongoose = require("mongoose");

const MealDeduction = require("../models/mealDeduction.model");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");
const superAdminAuth = require("../middlewares/superAdminAuth.middleware");

const router = express.Router();

// ─────────────────────────── helpers ───────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toObjectId = (id) =>
  id && mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : null;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// আজকের তারিখ (Bangladesh, UTC+6) "YYYY-MM-DD"
const getBDDateString = () =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

// query থেকে Mongo filter বানায়
function buildMatch(base, q, { ignoreInstitute = false } = {}) {
  const match = { ...base };
  if (ignoreInstitute) delete match.institute_id;

  const from = DATE_RE.test(q.from || "") ? q.from : null;
  const to = DATE_RE.test(q.to || "") ? q.to : null;
  if (from || to) {
    match.meal_date = {};
    if (from) match.meal_date.$gte = from;
    if (to) match.meal_date.$lte = to;
  }

  if (q.meal_type && q.meal_type !== "all") {
    match.meal_type = new RegExp(`^${escapeRegex(q.meal_type.trim())}$`, "i");
  }

  if (q.search && q.search.trim()) {
    const s = q.search.trim();
    const rx = new RegExp(escapeRegex(s), "i");
    const or = [{ user_name: rx }, { user_phone: rx }, { user_email: rx }];
    if (/^\d+$/.test(s)) or.push({ user_uid: Number(s) });
    match.$or = or;
  }

  return match;
}

const sumGroup = { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } };
const pickSum = (agg) => ({
  totalAmount: agg?.[0]?.total || 0,
  totalCount: agg?.[0]?.count || 0,
});

async function listDeductions(
  req,
  res,
  baseMatch,
  { withInstituteBreakdown = false, extra = {} } = {},
) {
  const q = req.query;
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);

  const match = buildMatch(baseMatch, q);
  const today = getBDDateString();

  const tasks = [
    MealDeduction.find(match)
      .sort({ meal_date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(), // 0: rows
    MealDeduction.countDocuments(match), // 1: total rows
    MealDeduction.aggregate([{ $match: match }, sumGroup]), // 2: filtered sum
    MealDeduction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $toLower: "$meal_type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]), // 3: meal type wise
    MealDeduction.aggregate([{ $match: baseMatch }, sumGroup]), // 4: all-time (no filters)
    MealDeduction.aggregate([
      { $match: { ...baseMatch, meal_date: today } },
      sumGroup,
    ]), // 5: today
    MealDeduction.aggregate([
      { $match: match },
      { $group: { _id: "$user" } },
      { $count: "n" },
    ]), // 6: unique students
  ];

  if (withInstituteBreakdown) {
    // institute filter বাদ দিয়ে — যাতে সব institute এর card দেখা যায়
    const matchNoInstitute = buildMatch(baseMatch, q, { ignoreInstitute: true });
    tasks.push(
      MealDeduction.aggregate([
        { $match: matchNoInstitute },
        {
          $group: {
            _id: "$institute_id",
            institute_name: { $last: "$institute_name" },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ); // 7
  }

  const results = await Promise.all(tasks);

  const payload = {
    success: true,
    ...extra,
    summary: {
      ...pickSum(results[2]),
      uniqueStudents: results[6]?.[0]?.n || 0,
    },
    byMealType: results[3].map((r) => ({
      meal_type: r._id,
      total: r.total,
      count: r.count,
    })),
    overall: pickSum(results[4]),
    today: { date: today, ...pickSum(results[5]) },
    data: results[0],
    pagination: {
      page,
      limit,
      total: results[1],
      pages: Math.ceil(results[1] / limit) || 1,
    },
  };

  if (withInstituteBreakdown) {
    payload.byInstitute = results[7].map((r) => ({
      institute_id: r._id,
      institute_name: r.institute_name || "—",
      total: r.total,
      count: r.count,
    }));
  }

  return res.status(200).json(payload);
}

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error("Meal deduction list error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ─────────────────────────── 1) User নিজের ───────────────────────────
router.get(
  "/meal-deductions/my",
  instituteRequireAuth,
  handle(async (req, res) => {
    // currentBalance ও সাথে পাঠাচ্ছি যাতে frontend এ আলাদা call লাগে না
    await listDeductions(
      req,
      res,
      { user: req.user._id },
      { extra: { currentBalance: req.user.balance || 0 } },
    );
  }),
);

// ─────────────────────────── 2) Institute panel ───────────────────────────
router.get(
  "/meal-deductions/institute",
  instituteRequireAuth,
  handle(async (req, res) => {
    // student (role: "user") এই route এ ঢুকতে পারবে না
    if (req.user.role === "user") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const instituteId =
      req.user.role === "institute"
        ? req.user._id
        : toObjectId(req.user.institute_id);

    if (!instituteId) {
      return res
        .status(400)
        .json({ success: false, message: "Institute not found for this account" });
    }

    await listDeductions(req, res, { institute_id: instituteId });
  }),
);

// ─────────────────────────── 3) Super Admin ───────────────────────────
router.get(
  "/meal-deductions/admin",
  superAdminAuth,
  handle(async (req, res) => {
    const base = {};
    if (req.query.instituteId) {
      const id = toObjectId(req.query.instituteId);
      if (!id) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid instituteId" });
      }
      base.institute_id = id;
    }
    await listDeductions(req, res, base, { withInstituteBreakdown: true });
  }),
);

module.exports = router;
