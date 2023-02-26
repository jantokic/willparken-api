const User = require('../models/user');

 // Ist die Middleware für die Funktionen, in denen ein User benötigt wird
  // Gibt den User zurück, der in der Session gespeichert ist
  const getUser = async (req, res, next) =>{
    try {
      const user = await User.findById(req.session.u_id);
      if (!user) {
        return res.status(404).json({ message: "Cannot find user." });
      }
      res.user = user;
      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error." });
    }
  }

  // Ist die Middleware für die Funktionen, bei denen ein Auto benötigt wird
  // Gibt das Auto zurück, das der mitgegeben id entspricht
  const getCar = async (req, res, next) => {
    let car;
    try {
        await res.user.uc_cars.forEach((c) => {
        if (c._id == req.body.c_car.c_id) {
          car = c;
        }
      });
      if (car == null) {
          return res.status(404).json({ message: "Cannot find Car." });
      }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
    res.car = car;
    next();
  }

  module.exports = { getUser , getCar };