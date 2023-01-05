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
    a_address1: {
        type: String,
        required: true
    },
    a_address2: {
        type: String,
        required: false
    }
})

const parkingspotSchema = new mongoose.Schema({
    p_owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    p_number: {
        type: Number,
        required: false
    },
    p_availablefrom: {
        type: String,
        required: true
    },
    p_availableuntil: {
        type: String,
        required: true
    },
    p_priceperhour: {
        type: String,
        required: true
    },
    pa_address: addressSchema
})

module.exports = mongoose.model('Parkingspot', parkingspotSchema)