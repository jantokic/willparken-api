const mongoose = require('mongoose')

/**
 * t_dayfrom, t_dayuntil integers
 *      z.B.: 2023-08-30 = 20230830
 * t_timefrom, t_timeuntil integers (minutes)
 *     z.B.: 13:30 = 810
*/

const timeframeSchema = new mongoose.Schema({
    t_weekday: {
        type: [Number],
        required: false
    },
    t_dayfrom: {
        type: Number,
        required: false
    },
    t_dayuntil: {
        type: Number,
        required: false
    },
    t_timefrom: {
        type: Number,
        required: true
    },
    t_timeuntil: {
        type: Number,
        required: true
    }
})

module.exports = timeframeSchema