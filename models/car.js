const mongoose = require('mongoose')

const carSchema = new mongoose.Schema({
    c_brand: {
        type: String,
        required: true
    },
    c_model: {
        type: String,
        required: true
    },
    c_licenceplate: {
        type: String,
        required: true
    },
})

module.exports = carSchema