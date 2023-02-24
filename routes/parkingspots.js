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

// Returned alle Parkingspots eines Users
router.get('/:oid/parkingspots', (req, res) => {
    res.send(res.user.up_parkingspots)
})

// Fügt einem User einen Parkplatz hinzu
router.post('/:oid/parkingspots/create', async (req, res) => {
    const parkingspotToAdd = {
        p_number: req.body.p_number,
        p_availablefrom: req.body.p_availablefrom,
        p_availableuntil: req.body.p_availableuntil,
        p_priceperhour: req.body.p_priceperhour,
        pa_address: {
            a_country: req.body.pa_address.a_country,
            a_city: req.body.pa_address.a_city,
            a_zip: req.body.pa_address.a_zip,
            a_address1: req.body.pa_address.a_address1,
            a_address2: req.body.pa_address.a_address2
        }
    }
    // nimmt alle Parkplätze raus, mit der selben Adresse
    let parkingspotswithsameaddress = res.user.up_parkingspots.filter(parkingspot => {
        return parkingspot.pa_address.a_country == parkingspotToAdd.pa_address.a_country &&
            parkingspot.pa_address.a_city == parkingspotToAdd.pa_address.a_city &&
            parkingspot.pa_address.a_zip == parkingspotToAdd.pa_address.a_zip &&
            parkingspot.pa_address.a_address1 == parkingspotToAdd.pa_address.a_address1 &&
            parkingspot.pa_address.a_address2 == parkingspotToAdd.pa_address.a_address2
    })
    if (parkingspotswithsameaddress.length > 0){
        // von den Parkplätzem, die die selbe Adresse haben
        // wird geprüft, ob es einen Parkplatz mit der selben Nummer gibt
        let parkingspotwithsamenumber = parkingspotswithsameaddress.filter(parkingspot => {
            return parkingspot.p_number == parkingspotToAdd.p_number
        })
        if (parkingspotwithsamenumber.length > 0){
            console.log('Parkingspot already exists - Count: ' + parkingspotwithsamenumber.length)
            return res.status(400).json({ message: "Parkingspot already exists." })
        }
    }
    res.user.up_parkingspots.push(parkingspotToAdd)
    try {
        const updatedUser = await res.user.save()
        res.json(updatedUser)
    } catch (err) {
        res.status(400).json({ message: err.message })
    }
})
