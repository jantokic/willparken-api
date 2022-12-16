const express = require('express')
const router = express.Router()
const User = require('../models/user')

// Returned alle User
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
        res.json(users)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Returned alle Parkingspots von allen Usern
router.get('/parkingspots/', async (req, res) => {
    try {
        const users = await User.find()
        let retval = [];
        users.forEach(user => {
            user.up_parkingspots.forEach(parkingspot => {
                retval.push(parkingspot);
            });
        });
        res.json(retval)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})


// Returned einen User anhand der OID
router.get('/:oid', getUserByOID, (req, res) => {
    res.send(res.user)
})

// Returned einen User anhand von Username und Password
router.post('/login', getUser, (req, res) => {
    res.send(res.user)
})

// Registriert einen User
router.post('/register', async (req, res) => {
    const newUser = new User({
        u_email: req.body.u_email,
        u_username: req.body.u_username,
        u_firstname: req.body.u_firstname,
        u_lastname: req.body.u_lastname,
        u_password: req.body.u_password
    })
    try {
        user = await User.findOne({
            u_username: newUser.u_username
        })
        if (!user){
            // Speichert den User in die DB und wenn erfolgreich, 
            // gibt es den User zurück
            const returnedUser = await newUser.save()
            res.status(201).json(returnedUser)
        }else{
            res.status(400).json({ message: "Username already exists." })
        }
    }catch(err){
        res.status(400).json({ message: err.message })
    }
})

// Fügt einem User einen Parkplatz hinzu
router.post('/:oid/parkingspots/create', getUserByOID, async (req, res) => {
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

// Returned alle Parkingspots eines Users
router.get('/:oid/parkingspots', getUserByOID, (req, res) => {
    res.send(res.user.up_parkingspots)
})

// Erstellt einen User
router.post('/', async (req, res) => {
    const user = new User({
        u_email: req.body.u_email,
        u_username: req.body.u_username,
        u_firstname: req.body.u_firstname,
        u_lastname: req.body.u_lastname,
        u_password: req.body.u_password,
        uc_cars: req.body.uc_cars,
        up_parkingspots: req.body.up_parkingspots
    })
    try {
        // Speichert den User in die DB und wenn erfolgreich, 
        // gibt es den User zurück
        const newUser = await user.save()
        res.status(201).json(newUser)
    }catch(err){
        res.status(400).json({ message: err.message })
    }
})

// Aktualisiert einen User
router.patch('/:oid', getUserByOID, async (req, res) => {
    if(req.body.u_email != null) {
        res.user.u_email = req.body.u_email
    }
    if(req.body.u_firstname != null) {
        res.user.u_firstname = req.body.u_firstname
    }
    if(req.body.u_lastname != null) {
        res.user.u_lastname = req.body.u_lastname
    }
    if(req.body.u_password != null) {
        res.user.u_password = req.body.u_password
    }
    try {
        const updatedUser = await res.user.save()
        res.json(updatedUser)
    }
    catch (err) {
        res.status(400).json({ message: err.message })
    }
})

// Löscht einen User
router.delete('/:oid', getUserByOID, async (req, res) => {
    try{
        await res.user.remove()
        res.json({ message: 'Deleted User.' })
    }catch(err){
        res.status(500).json({ message: err.message })
    }
})

// Ist die Middleware für die Funktionen, in denen ein User benötigt wird
async function getUserByOID (req, res, next) { 
    let user
    try {
        user = await User.findById(req.params.oid)
        if (user == null) {
            return res.status(404).json ({ message: 'Cannot find User.' })
        }
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
    res.user = user
    next()
}

// Ist die Middleware für die Funktionen, in denen ein User eingeloggt wird
async function getUser (req, res, next) { 
    let user
    try {
        user = await User.findOne({
            u_username: req.body.u_username,
            u_password: req.body.u_password
        })
        if (user == null) {
            return res.status(404).json ({ message: 'Cannot find User.' })
        }
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
    res.user = user
    next()
}

module.exports = router
