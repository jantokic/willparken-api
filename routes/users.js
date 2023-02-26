const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const User = require("../models/user");

const { getUser, getCar } = require("./middleware");

// your route code here

// Returned alle User
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ message: "All users:", users: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Returned alle Parkingspots von allen Usern
router.get("/parkingspots", async (req, res) => {
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

// Returned derzeit eingeloggten User
router.get("/getUser", getUser, (req, res) => {
  res.send({ message: "Currently logged in user:", user: res.user });
});

// Registriert einen User
router.post(
  "/register",
  [
    body("u_email").isEmail(),
    body("u_username").isLength({ min: 3 }),
    body("u_firstname").isLength({ min: 2 }),
    body("u_lastname").isLength({ min: 2 }),
    body("u_password").isLength({ min: 8 }),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let user;
    if (req.session.u_id) {
      res.status(409).json({ message: "User already logged in." });
    } else {
      const newUser = new User({
        u_email: req.body.u_email,
        u_username: req.body.u_username,
        u_firstname: req.body.u_firstname,
        u_lastname: req.body.u_lastname,
        u_password: req.body.u_password,
      });
      try {
        user = await User.findOne({
          u_username: newUser.u_username,
        });
        if (!user) {
          // Speichert den User in die DB und wenn erfolgreich,
          // gibt es den User zurück
          const returnedUser = await newUser.save();
          req.session.u_id = returnedUser._id;
          res.status(201).json({
            message: "User registered and logged in succesfully.",
            user: returnedUser,
          });
        } else {
          res.status(400).json({ message: "Username already exists." });
        }
      } catch (err) {
        res.status(400).json({ message: err.message });
      }
    }
  }
);

// Returned einen User anhand von Username und Password
router.post(
  "/login",
  [
    body("u_username").isLength({ min: 3 }),
    body("u_password").isLength({ min: 8 }),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let user;
    if (req.session.u_id) {
      res.status(409).json({ message: "User already logged in." });
    } else {
      try {
        user = await User.findOne({
          u_username: req.body.u_username,
          u_password: req.body.u_password,
        });
        if (user == null) {
          res.status(404).json({ message: "Cannot find User." });
        }
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
      req.session.u_id = user._id;
      res
        .status(200)
        .json({ message: "User logged in successfully.", user: user });
    }
  }
);

// User ausloggen
router.get("/logout", (req, res) => {
  if (req.session.u_id) {
    req.session.destroy();
    res.status(200).json({ message: "User logged out successfully." });
  } else {
    res.status(200).json({ message: "User already logged out." });
  }
});

// Aktualisiert einen User
router.patch("/update", getUser, async (req, res) => {
  if (req.body.u_email != null) {
    res.user.u_email = req.body.u_email;
  }
  if (req.body.u_firstname != null) {
    res.user.u_firstname = req.body.u_firstname;
  }
  if (req.body.u_lastname != null) {
    res.user.u_lastname = req.body.u_lastname;
  }
  if (req.body.u_password != null) {
    res.user.u_password = req.body.u_password;
  }
  try {
    const updatedUser = await res.user.save();
    res
      .status(204)
      .json({ message: "User updated successfully.", user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Löscht einen User
router.delete("/delete", getUser, async (req, res) => {
  try {
    await res.user.remove();
    req.session.destroy();
    res.json({ message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fügt dem eingeloggten User ein Auto hinzu
router.post("/addCar", getUser, async (req, res) => {
  let car = req.body.c_car;
  res.user.uc_cars.push(car);
  try {
    const updatedUser = await res.user.save();
    res
      .status(201)
      .json({ message: "Car added successfully.", user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Aktualisiert ein Auto des eingeloggten Users
router.patch("/updateCar", getUser, getCar, async (req, res) => {
  if (req.body.c_car.c_brand != null) {
    res.car.c_brand = req.body.c_car.c_brand;
  }
  if (req.body.c_car.c_model != null) {
    res.car.c_model = req.body.c_car.c_model;
  }
  if (req.body.c_car.c_licenceplate != null) {
    res.car.c_licenceplate = req.body.c_car.c_licenceplate;
  }
  try {
    // aktualisiert das Auto im Array
    res.user.uc_cars[res.user.uc_cars.indexOf(res.car)] = res.car;
    const updatedUser = await res.user.save();
    res
      .status(200)
      .json({ message: "Car updated successfully.", car: res.car });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Löscht ein Auto des eingeloggten Users
router.delete("/deleteCar", getUser, getCar, async (req, res) => {
  // Löscht das von getCar zurückgegebene Auto aus dem Array
  res.user.uc_cars.splice(res.user.uc_cars.indexOf(res.car), 1);
  try {
    const updatedUser = await res.user.save();
    res
      .status(200)
      .json({ message: "Car deleted successfully.", user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Returned das Auto mit der mitgegebenen id
router.get("/getCar", getUser, getCar, async (req, res) => {
  res.send({ message: "Requested car:", car: res.car });
});

// Returned alle Autos von einem User
router.get("/getCars", getUser, async (req, res) => {
  res.send({ message: "User's cars:", cars: await res.user.uc_cars });
});

module.exports = router;
