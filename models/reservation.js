const mongoose = require("mongoose");

const timeframeSchema = require("./timeframe.js");

/**
 * r_critcanceltime: 
 *    possible values: "h" (hour), "d" (day), "w" (week), "m" (month)
 *    time before reservation start time, after which the reservation can no longer be cancelled     
 *    default value: "h"
 *    e.g. if r_critcanceltime equals "h", then 1 hour before reservation start time the reservation can no longer be cancelled
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
