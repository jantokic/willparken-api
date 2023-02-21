const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
    a_country: {
        type: String,
        required: true
    },
    a_city: {
        type: String,
        required: true
    },
    a_zip: {
        type: String,
        required: true
    },
    a_street: {
        type: String,
        required: true
    },
    a_houseno: {
        type: String,
        required: false
    }
})

module.exports = addressSchema