const express = require("express");
const { createUserMeal } = require("../controllers/user.meal.controller");

const router = express.Router();

router.post("/create-user-meal", createUserMeal);

module.exports = router;
