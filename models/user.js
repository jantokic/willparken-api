//Source: https://mongoosejs.com/docs/subdocs.html#altsyntax

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


// const addressSchema = new mongoose.Schema({
//     a_country: {
//         type: String,
//         required: true
//     },
//     a_city: {
//         type: String,
//         required: true
//     },
//     a_zip: {
//         type: String,
//         required: true
//     },
//     a_address1: {
//         type: String,
//         required: true
//     },
//     a_address2: {
//         type: String,
//         required: false
//     }
// })


// const parkingspotSchema = new mongoose.Schema({
//     p_number: {
//         type: Number,
//         required: false
//     },
//     p_availablefrom: {
//         type: String,
//         required: true
//     },
//     p_availableuntil: {
//         type: String,
//         required: true
//     },
//     p_priceperhour: {
//         type: String,
//         required: true
//     },
//     pa_address: addressSchema
// })



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
    uc_cars: [carSchema],
    up_parkingspots: [{type: mongoose.Schema.Types.ObjectId, ref: 'Parkingspot'}]
})

module.exports = mongoose.model('User', userSchema)