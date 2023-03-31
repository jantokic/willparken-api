const mongoose = require('mongoose')

const addressSchema = require('./address.js')
const reservationSchema = require('./reservation.js')
const timeframeSchema = require('./timeframe.js')

/** 
 * p_status:
 *    possible values: 'active', 'inactive', 'deleted'
 *    'active' 
 *         parkingspot is available for reservations
 *    'inactive' 
 *         parkingspot is not available for more reservations
 *         possible reservations will be canceled
 *    'deleted' 
 *         parkingspot is not available for reservations
 *         possible reservations will be canceled
 *         will be deleted after the last reservation what coudn't be canceled is over
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
    p_status: {
        type: String,
        required: false,
        default: 'active',
    },
    pt_availability: timeframeSchema,
    pr_reservations: [reservationSchema],
    pa_address: addressSchema
})

module.exports = mongoose.model('Parkingspot', parkingspotSchema)