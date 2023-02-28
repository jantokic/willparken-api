const express = require("express");
const session = require("express-session");
const router = express.Router();
const { ObjectId } = require("mongoose").Types;

const Parkingspot = require("../models/parkingspot");
const User = require("../models/user");

const {
  getUser,
  checkLogin,
  validateParkingspotInput,
  getCar,
} = require("./middleware");

// Returned alle Parkingspots
router.get("/", async (req, res) => {
  try {
    const parkingspots = await Parkingspot.find();
    res.json(parkingspots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Returned alle Parkingspots eines Users
router.get("/getUserParkingspots", checkLogin, getUser, async (req, res) => {
  res.send({
    message: "User's parkingspots:",
    parkingspots: await Parkingspot.find({ p_owner: req.session.u_id }),
  });
});

// Fügt einem User einen Parkplatz hinzu
router.post("/add", checkLogin, async (req, res) => {
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

      console.log(parkingspot.p_owner != req.session.u_id);
      // check if the parkingspot belongs to the user
      if (parkingspot.p_owner != req.session.u_id) {
        return res
          .status(401)
          .json({ message: "Parkingspot does not belong to user." });
      }
      // if the parking spot has reservations, the parking spot cannot be deleted
      if (parkingspot.pr_reservations.length > 0) {
        return res
          .status(401)
          .json({ message: "Parkingspot has reservations." });
      }

      // remove the parkingspot from mongodb
      const deletedParkingspot = await parkingspot.remove();
      // Remove the parkingspot ID from the user's up_parkingspots array
      await User.updateOne(
        { _id: req.session.u_id },
        { $pull: { up_parkingspots: req.params.p_id } }
      );
      res.status(200).json({
        message: "Parkingspot deleted.",
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
      .json({ message: "Parkingspots found:", parkingspots: parkingspots });
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
        let car;
        // get the car from the passed car ID
        await res.user.uc_cars.forEach((c) => {
          if (c._id == req.body.pr_reservation.rc_car.c_id) {
            car = c;
          }
        });
        if (!car) {
          return res.status(404).json({ message: "Cannot find Car." });
        }
        res.car = car;

        // create reservation
        let reservation = req.body.pr_reservation;
        reservation.ru_user = res.user._id;
        reservation.rc_car = res.car;

        // add the reservation to the user
        res.user.ur_reservations.push(reservation);
        await res.user.save();

        // add the reservation to the parkingspot
        parkingspot.pr_reservations.push(reservation);
        await parkingspot.save();
        res.status(201).json({
          message: "Reservation added.",
          content: reservation,
        });

        /*// send a notification to the owner of the parkingspot
        const notification = new Notification({
          n_user: parkingspot.p_owner,
          n_content: `User ${req.user.u_username} has reserved your parkingspot ${parkingspot.p_number}.`,
        });
        await notification.save();
        */
      } else {
        res.status(404).json({ message: "Parkingspot not found." });
      }
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
      let reservation;
      parkingspot.pr_reservations.forEach((r) => {
        if (r._id == req.body.pr_reservation.r_id) {
          reservation = r;
        }
      });

      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found." });
      }

      // Check if the reservation belongs to the user
      if (reservation.ru_user != req.session.u_id) {
        return res
          .status(401)
          .json({ message: "Reservation does not belong to user." });
      }

      // Remove the reservation from the parkingspot
      await Parkingspot.updateOne(
        { _id: req.body.p_id },
        { $pull: { pr_reservations: reservation } }
      );

      // remove the reservation from the user's ur_reservations array
      await User.updateOne(
        { _id: req.session.u_id },
        { $pull: { ur_reservations: reservation } }
      );
      res.status(200).json({ message: "Reservation cancelled." });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
