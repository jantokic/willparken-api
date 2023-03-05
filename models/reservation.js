const mongoose = require("mongoose");

const timeframeSchema = require("./timeframe.js");
const carSchema = require("./car.js");

/**
 * r_critcanceltime: 
 *      time before reservation start time, after which the reservation can no longer be cancelled
 *      can be one of the following values: "h" (hour), "d" (day), "w" (week), "m" (month)
 *      default value is "h"
 *      e.g. if r_critcanceltime equals "h", then 1 hour before reservation start time the reservation can no longer be cancelled
 */

const reservationSchema = new mongoose.Schema({
  ru_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rc_car: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  rt_timeframe: timeframeSchema,
  r_critcanceltime: {
    type: String,
    required: true,
  },
  r_cancelled: {
    type: Boolean,
    required: false,
    default: false,
  },
});

module.exports = reservationSchema;
