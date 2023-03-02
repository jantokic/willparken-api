const mongoose = require("mongoose");

const timeframeSchema = require("./timeframe.js");
const carSchema = require("./car.js");

const reservationSchema = new mongoose.Schema({
  ru_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rc_car: carSchema,
  rt_timeframe: timeframeSchema,
});

module.exports = reservationSchema;
