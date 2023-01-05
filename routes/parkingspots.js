const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Parkingspot = require('../models/parkingspot')
const User = require('../models/user')

// Returned alle Parkingspots
router.get('/', async (req, res) => {
    try {
        const parkingspots = await Parkingspot.find()
        res.json(parkingspots)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

module.exports = router