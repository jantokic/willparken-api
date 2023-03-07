const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');

const Parkingspot = require("../models/parkingspot");
const User = require("../models/user");
const { body, validationResult } = require("express-validator");


const {
  getUser,
  checkLogin,
  validateParkingspotInput,
} = require("./middleware");

// returns all parkingspots
router.get("/", async (req, res) => {
  try {
    res.send({
      message: "All parkingspots:",
      content: await Parkingspot.find(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Returned alle Parkingspots eines Users
router.get("/getUserParkingspots", checkLogin, getUser, async (req, res) => {
  res.send({
    message: "User's parkingspots:",
    content: await Parkingspot.find({ p_owner: req.session.u_id }),
  });
});

// adds a parkingspot to user
router.post("/add", [
  body("u_email").isEmail(),
  body("u_username").isLength({ min: 3 }),
  body("u_firstname").isLength({ min: 2 }),
  body("u_lastname").isLength({ min: 2 }),
  body("u_password").isLength({ min: 8 }),
], checkLogin, async (req, res) => {
  // create a new parkingspot
  const newParkingspot = new Parkingspot({
    p_owner: req.session.u_id,
    p_number: req.body.p_number,
    p_priceperhour: req.body.p_priceperhour,
    p_tags: req.body.p_tags,
    pt_availability: req.body.pt_availability,
    pr_reservations: req.body.pr_reservations,
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
      .json({ message: "Parkingspot added.", content: savedParkingspot });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Parkplatz aktualisieren
router.patch(
  "/update",
  checkLogin,
  validateParkingspotInput,
  async (req, res) => {
    try {
      const parkingspot = await Parkingspot.findById(req.body.p_id);
      if (parkingspot) {
        // Update the parkingspot
        const parkingspotFields = ["p_number", "p_priceperhour", "p_tags"];
        const availabilityFields = [
          "t_dayfrom",
          "t_dayuntil",
          "t_timefrom",
          "t_timeuntil",
        ];
        const addressFields = [
          "a_country",
          "a_city",
          "a_zip",
          "a_street",
          "a_houseno",
        ];
        for (const field of parkingspotFields) {
          if (req.body[field] !== undefined) {
            parkingspot[field] = req.body[field];
          }
        }
        if (req.body.pa_address) {
          for (const field of addressFields) {
            if (req.body.pa_address[field] !== undefined) {
              parkingspot.pa_address[field] = req.body.pa_address[field];
            }
          }
        }
        if (req.body.pt_availability) {
          for (const field of availabilityFields) {
            if (req.body.pt_availability[field] !== undefined) {
              parkingspot.pt_availability[field] =
                req.body.pt_availability[field];
            }
          }
        }
        const updatedParkingspot = await parkingspot.save();
        res.status(200).json({
          message: "Parkingspot updated.",
          content: updatedParkingspot,
        });
      } else {
        res.status(404).json({ message: "Parkingspot not found." });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Parkplatz löschen
router.delete(
  "/delete",
  checkLogin,
  validateParkingspotInput,
  async (req, res) => {
    try {
      // check if the parkingspot exists
      const parkingspot = await Parkingspot.findById(req.body.p_id);
      if (!parkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }
      // check if the parkingspot belongs to the user
      if (parkingspot.p_owner != req.session.u_id) {
        return res
          .status(401)
          .json({ message: "Parkingspot does not belong to user." });
      }

      // if the parking spot has reservations that aren't cancelled, the parking spot cannot be deleted
      if (parkingspot.pr_reservations.length > 0) {
        for (const reservation of parkingspot.pr_reservations) {
          if (reservation.r_status != "cancelled") {
            return res.status(400).json({
              message:
                "Parkingspot cannot be deleted because it has active reservations.",
            });
          }
        }
      }

      res.status(200).json({
        message: "Parkingspot deleted succesfully.",
        content: deletedParkingspot._id,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Find a parkingspot via address
router.post("/search", async (req, res) => {
  try {
    const parkingspots = await Parkingspot.find({
      "pa_address.a_country": req.body.pa_adress.a_country,
      "pa_address.a_city": req.body.pa_adress.a_city,
      "pa_address.a_zip": req.body.pa_adress.a_zip,
      "pa_address.a_street": req.body.pa_adress.a_street,
      "pa_address.a_houseno": req.body.pa_adress.a_houseno,
    });
    res
      .status(200)
      .json({ message: "Parkingspots found:", content: parkingspots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// reserve a parkingspot
router.post(
  "/makeReservation",
  checkLogin,
  validateParkingspotInput,
  getUser,
  async (req, res) => {
    try {
      const parkingspot = await Parkingspot.findById(req.body.p_id);
      // check if the parkingspot exists
      if (parkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }
      // create a reservation
      req.body.pr_reservation.ru_user = req.session.u_id;
      req.body.pr_reservation._id = mongoose.Types.ObjectId();
      const reservation = req.body.pr_reservation;

      // check if the car exists
      let car;
      res.user.uc_cars.forEach((c) => {
        if (c._id == reservation.rc_car) {
          car = c;
        }
      });
      if (!car) {
        return res.status(404).json({ message: "Car not found." });
      }

      // add the reservation to the parkingspot
      parkingspot.pr_reservations.push(reservation);
      await parkingspot.save();

      // add reservation to user array
      res.user.ur_reservations.push(reservation);

      // set the car to reserved
      car.c_isreserved = true;

      // save the user
      await res.user.save();

      res.status(201).json({
        message: "Reservation added succesfully.",
        content: reservation,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Cancel a reservation
router.delete(
  "/cancelReservation",
  checkLogin,
  validateParkingspotInput,
  getUser,
  async (req, res) => {
    try {

      // check if the parkingspot exists
      const parkingspot = await Parkingspot.findById(req.body.p_id);
      if (!parkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }

      // Check if the reservation exists in the parkingspot
      const reservation = parkingspot.pr_reservations.find(
        (reservation) => reservation._id == req.body.pr_reservation.r_id
      );

      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found." });
      }

      // Check if the reservation belongs to the user
      if (reservation.ru_user != req.session.u_id) {
        return res
          .status(401)
          .json({ message: "Reservation does not belong to user." });
      }

      // check if the reservation is already cancelled
      if (reservation.r_cancelled) {
        return res.status(401).json({ message: "Reservation already cancelled." });
      }

      //  update the parkingspot's reservations, dont' delete the reservation, just set it to cancelled
      await Parkingspot.updateOne(
        { _id: parkingspot._id },
        { $set: { "pr_reservations.$[element].r_cancelled": true } },
        { arrayFilters: [{ "element._id": reservation._id }] }
      );

      // go through the user's reservations that are not cancelled and check if the car has other reservations
      // if the car doesn't have other reservations, set c_isreserved to false

      const car = res.user.uc_cars.find((c) => c._id == reservation.rc_car);
      let hasOtherReservations = false;
      res.user.ur_reservations.forEach((userReservation) => {
        if (
          userReservation.rc_car == car._id &&
          !userReservation.r_cancelled
        ) {
          hasOtherReservations = true;
        }
      });
      if (!hasOtherReservations) {
        car.c_isreserved = false;
      }

      // save the user
      await res.user.save();

      res.status(200).json({ message: "Reservation cancelled successfully." });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
