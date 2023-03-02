const mongoose = require('mongoose')

const addressSchema = require('./address.js')
const reservationSchema = require('./reservation.js')
const timeframeSchema = require('./timeframe.js')

/**
 * p_critcanceltime: 
 *      time in minutes before reservation start time, after which the reservation can no longer be cancelled
 *      can be one of the following values: "h" (hour), "d" (day), "w" (week), "m" (month)
 *      default value is "h"
 *      e.g. if p_critcanceltime equals "h", then 1 hour before reservation start time the reservation can no longer be cancelled
 */

const parkingspotSchema = new mongoose.Schema({
    p_owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    p_number: {
        type: String,
        required: false
    },
    p_priceperhour: {
        type: Number,
        required: true
    },
    p_tags: [{
        type: String,
        required: false
    }],
    p_critcanceltime: {
        type: String,
        required: false,
        default: "h"
    },
    pt_availability: timeframeSchema,
    pr_reservations: [reservationSchema],
    pa_address: addressSchema
})

module.exports = mongoose.model('Parkingspot', parkingspotSchema)