const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const User = require("../models/user");
const Parkingspot = require("../models/parkingspot");

const { getUser, getCar, checkLogin } = require("./middleware");

// define the middleware function
const allowCrossDomain = function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
};

const app = express();
// use the middleware function
app.use(allowCrossDomain);


// returns all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ message: "All users:", content: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// returns the currently logged in user
router.get("/getUser", checkLogin, getUser, (req, res) => {
  res.send({ message: "Currently logged in user:", content: res.user });
});

// register a user
router.post(
  "/register",
  [
    body("u_email").isEmail(),
    body("u_username").isLength({ min: 3 }),
    body("u_firstname").isLength({ min: 2 }),
    body("u_lastname").isLength({ min: 2 }),
    body("u_password").isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }

    // check if user is already logged in
    let user;
    if (req.session.u_id) {
      return res.status(409).json({ message: "User already logged in." });
    }
    // create new user
    const newUser = new User({
      u_email: req.body.u_email,
      u_username: req.body.u_username,
      u_firstname: req.body.u_firstname,
      u_lastname: req.body.u_lastname,
      u_password: req.body.u_password,
    });
    try {
      // checks if the user name already exists
      user = await User.findOne({
        u_username: newUser.u_username,
      });
      if (user) {
        return res.status(400).json({ message: "Username already exists." });
      }

      // save the user in the database
      const returnedUser = await newUser.save();
      req.session.u_id = returnedUser._id;
      res.status(201).json({
        message: "User registered and logged in succesfully.",
        content: returnedUser,
      });

    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// logs a user in via username and password
router.post(
  "/login",
  [
    body("u_username").isLength({ min: 3 }),
    body("u_password").isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }

    // check if user is already logged in
    let user;
    if (req.session.u_id) {
      return res.status(409).json({ message: "User already logged in." });
    }

    // find user in db
    try {
      user = await User.findOne({
        u_username: req.body.u_username,
        u_password: req.body.u_password,
      });
      // if user exists, create session and return user
      if (user) {
        req.session.u_id = user._id;
        res.status(200).json({
          message: "User logged in successfully.",
          content: user,
        });
      } else {
        res.status(400).json({ message: "Wrong username or password." });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// log out user
router.get("/logout", (req, res) => {
  // check if user is logged in
  if (req.session.u_id) {
    // delete session
    req.session.destroy();
    res.status(200).json({ message: "User logged out successfully." });
  } else {
    res.status(200).json({ message: "User already logged out." });
  }
});

// updates a user
router.patch("/update", checkLogin, getUser, async (req, res) => {
  try {
    // find user by id and update only the fields that are in the request body
    const updatedUser = await User.findByIdAndUpdate(
      req.session.u_id,
      req.body,
      { new: true }
    );
    res
      .status(201)
      .json({ message: "User updated successfully.", content: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// delete a user
router.delete("/delete", checkLogin, getUser, async (req, res) => {
  try {
    // check if user has parkingspots
    if (res.user.up_parkingspots.length > 0) {
      // delete user's parkingspots
      for (let i = 0; i < res.user.up_parkingspots.length; i++) {
        await Parkingspot.findByIdAndDelete(res.user.up_parkingspots[i]._id);
      }
    }

    // delete user
    await res.user.remove();

    // delete session
    req.session.destroy();

    res.json({ message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// adds a car to the currently logged in user
router.post("/addCar", checkLogin, getUser, async (req, res) => {
  // create car
  let car = req.body.c_car;

  // add car to user's array
  res.user.uc_cars.push(car);
  try {
    // save changes in mongodb
    const updatedUser = await res.user.save();
    res
      .status(201)
      .json({ message: "Car added successfully.", content: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// updates a car of the currently logged in user
router.patch("/updateCar", getUser, getCar, async (req, res) => {
  try {
    if (res.car.c_isreserved) {
      return res.status(409).json({ message: "Car is currently reserved." });
    }

    // only update properties that have been passed in the request body
    for (let prop in req.body.c_car) {
      if (req.body.c_car[prop] !== null) {
        res.car[prop] = req.body.c_car[prop];
      }
    }

    // update car in user's array
    res.user.uc_cars[res.user.uc_cars.indexOf(res.car)] = res.car;

    // save changes in mongodb
    await res.user.save();
    res
      .status(200)
      .json({ message: "Car updated successfully.", content: res.car });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// deletes a car that is passed in the request body
router.delete("/deleteCar", checkLogin, getUser, getCar, async (req, res) => {
  try {
    // check if the car is currently reserved
    if (res.car.c_isreserved) {
      return res.status(409).json({ message: "Car is currently reserved." });
    }

    // otherwise, delete car out of user's array
    res.user.uc_cars.splice(res.user.uc_cars.indexOf(res.car), 1);

    // save changes in mongodb
    const updatedUser = await res.user.save();
    res
      .status(200)
      .json({ message: "Car deleted successfully.", content: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// return a car that is passed in the request body
router.post("/getCar", checkLogin, getUser, getCar, async (req, res) => {
  res.status(201).json({ message: "Requested car:", content: res.car });
});

// return all cars of the currently logged in user
router.get("/getCars", getUser, async (req, res) => {
  res.status(200).json({ message: "User's cars:", content: await res.user.uc_cars });
});

module.exports = router;
