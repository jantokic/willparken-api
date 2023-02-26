const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Parkingspot = require("../models/parkingspot");
const User = require("../models/user");

const { body, validationResult } = require("express-validator");
const { getUser, getCar } = require("./middleware");

// Returned alle Parkingspots
router.get("/", async (req, res) => {
  try {
    const parkingspots = await Parkingspot.find();
    res.json(parkingspots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Returned alle Parkingspots von allen Usern
router.get("/parkingspots/", async (req, res) => {
  try {
    const users = await User.find();
    let parkingspots = [];
    users.forEach((user) => {
      user.up_parkingspots.forEach((parkingspot) => {
        parkingspots.push(parkingspot);
      });
    });
    res.json({ message: "All parkingspots:", parkingspots: parkingspots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Returned alle Parkingspots eines Users
router.get("/parkingspots", getUser, (req, res) => {
  res.send(res.user.up_parkingspots);
});

// Fügt einem User einen Parkplatz hinzu
router.post("/parkingspots/add", async (req, res) => {
  if (req.session.u_id) {
    const newParkingspot = new Parkingspot({
      p_owner: req.session.u_id,
      p_number: req.body.p_number,
      p_priceperhour: req.body.p_priceperhour,
      p_tags: req.body.p_tags,
      pt_availability: req.body.pt_availability,
      pr_reservations: [],
      pa_address: req.body.pa_address,
    });
    try {
      const savedParkingspot = await newParkingspot.save();
      await User.updateOne(
        { _id: req.session.u_id },
        { $push: { up_parkingspots: savedParkingspot } }
      );
      res
        .status(201)
        .json({ message: "Parkingspot added.", parkingspot: savedParkingspot });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  } else {
    res.status(400).json({ message: "User not logged in." });
  }
});

module.exports = router;
