//Source: https://mongoosejs.com/docs/subdocs.html#altsyntax

const mongoose = require('mongoose')


const carSchema = require('./car.js')
const reservationSchema = require('./reservation.js')

const userSchema = new mongoose.Schema({
    u_email: {
        type: String,
        required: true
    },
    u_username: {
        type: String,
        required: true
    },
    u_firstname: {
        type: String,
        required: true
    },
    u_lastname: {
        type: String,
        required: true
    },
    u_password: {
        type: String,
        required: true
    },
    u_balance: {
        type: Number,
        required: false
    },
    uc_cars: [carSchema],
    up_parkingspots: [{type: mongoose.Schema.Types.ObjectId, ref: 'Parkingspot'}],
    ur_reservations: [reservationSchema]
})

module.exports = mongoose.model('User', userSchema)