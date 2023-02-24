const express = require("express");
const router = express.Router();
const User = require("../models/user");

// Returned alle User
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Returned alle Parkingspots von allen Usern
router.get("/parkingspots/", async (req, res) => {
  try {
    const users = await User.find();
    let retval = [];
    users.forEach((user) => {
      user.up_parkingspots.forEach((parkingspot) => {
        retval.push(parkingspot);
      });
    });
    res.json(retval);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Returned einen User anhand der OID
router.get("/getUser", getUser, (req, res) => {
  res.send(res.user);
});

// Registriert einen User
router.post("/register", async (req, res) => {
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
      res
        .status(201)
        .json({ message: "User registered succesfully.", user: returnedUser });
    } else {
      res.status(400).json({ message: "Username already exists." });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Returned einen User anhand von Username und Password
router.post("/login", async (req, res) => {
    let user;
    if (req.session.u_id) {
      res.status(200).json({ message: "User already logged in." });
    } else {
      try {
        user = await User.findOne({
          u_username: req.body.u_username,
          u_password: req.body.u_password,
        });
        if (user == null) {
          return res.status(404).json({ message: "Cannot find User." });
        }
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
      req.session.u_id = user._id;
      res.status(200).json({ message: "User logged in successfully.", user: user });
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
      .status(200)
      .json({ message: "User updated successfully.", user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Löscht einen User
router.delete("/delete", getUser, async (req, res) => {
  try {
    await res.user.remove();
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
      .status(200)
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
            .json({ message: "Car updated successfully.", user: updatedUser });
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

// Returned alle Autos von einem User
router.get("/getCars", getUser, async (req, res) => {
    res.send(res.user.uc_cars);
});


// Ist die Middleware für die Funktionen, in denen ein User benötigt wird
// Gibt den User zurück, der in der Session gespeichert ist
async function getUser(req, res, next) {
  let user;
  try {
    user = await User.findById(req.session.u_id);
    console.log(user);
    if (user == null) {
      return res.status(404).json({ message: "Cannot find User." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
  res.user = user;
  next();
}

// Ist die Middleware für die Funktionen, bei denen ein Auto benötigt wird
// Gibt das Auto zurück, das der mitgegeben id entspricht
async function getCar(req, res, next) {
  let car;
  try {
    console.log(req.body.c_car.c_id);
    console.log(res.user.uc_cars);
    res.user.uc_cars.forEach((c) => {
      if (c._id == req.body.c_car.c_id) {
        car = c;
      }
    });
    if (car == null) {
      return res.status(404).json({ message: "Cannot find Car." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
  res.car = car;
  next();
}

module.exports = router;
