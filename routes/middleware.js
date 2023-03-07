const User = require("../models/user");
const { body, validationResult } = require('express-validator');


// Middleware for functions, where a user is needed
// Returns the user that is currently logged in
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.u_id);
    if (user) {
      res.user = user;
      next();
    } else {
      res.status(404).json({ message: "Cannot find User." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Middleware for functions, where a car is needed
// Returns the car with the corresponding id
const getCar = async (req, res, next) => {
  let car;
  try {
    await res.user.uc_cars.forEach((c) => {
      if (c._id == req.body.c_car.c_id) {
        car = c;
      }
    });
    if (car) {
        console.log(car);
        res.car = car;
        next();
    }
    else {
        res.status(404).json({ message: "Cannot find Car." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// Middleware for functions, to check if a user is logged in
const checkLogin = async (req, res, next) => {
  if (req.session.u_id) {
    next();
  } else {
    res.status(401).json({ message: "You are not logged in." });
  }
};

// Middelware to validate Inputs for Parkingspots
const validateParkingspotInput = [
  body("p_id").exists().withMessage("Parkingspot id is required."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];
module.exports = { getUser, getCar, checkLogin, validateParkingspotInput};
