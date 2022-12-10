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
