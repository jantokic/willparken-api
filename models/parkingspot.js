const mongoose = require('mongoose')

const addressSchema = require('./address.js')
const reservationSchema = require('./reservation.js')
const timeframeSchema = require('./timeframe.js')

const parkingspotSchema = new mongoose.Schema({
    p_owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    p_number: {
        type: Number,
        required: false
    },
    p_priceperhour: {
        type: String,
        required: true
    },
    p_tags: [{
        type: String,
        required: false
    }],
    pt_availability: timeframeSchema,
    pr_reservations: [reservationSchema],
    pa_address: addressSchema
})

module.exports = mongoose.model('Parkingspot', parkingspotSchema)