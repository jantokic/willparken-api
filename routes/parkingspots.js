const express = require("express");
const router = express.Router();
const { format, parse, isWithinInterval, differenceInMinutes } = require('date-fns');
const axios = require('axios');
const { body } = require("express-validator");


const Parkingspot = require("../models/parkingspot");
const User = require("../models/user");


const {
  getUser,
  checkLogin,
  validateParkingspotInput,
} = require("./middleware");

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

// returns single parkingspot by id
router.post("/getParkingspot", async (req, res) => {
  try {
    const parkingspot = await Parkingspot.findById(req.body.p_id);
    if (!parkingspot) {
      return res.status(404).json({ message: "Parkingspot not found." });
    }
    res.send({
      message: "Parkingspot found:",
      content: parkingspot,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// returns all parkingspots of a user
router.get("/getParkingspots", checkLogin, async (req, res) => {
  res.send({
    message: "User's parkingspots:",
    content: await Parkingspot.find({ p_owner: req.session.u_id }),
  });
});

// adds a parkingspot to user
router.post("/add", checkLogin, async (req, res) => {
  // check if parkingspot is located in austria or germany
  if (
    req.body.pa_address.a_country != "Austria" &&
    req.body.pa_address.a_country != "Germany"
  ) {
    return res.status(400).json({
      message: "Parkingspot must be located in Austria or Germany.",
    });
  }

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
      .json({ message: "Parkingspot added.", content: "" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// update a parkingspot
router.patch(
  "/update",
  checkLogin,
  validateParkingspotInput,
  async (req, res) => {
    try {
      const parkingspot = await Parkingspot.findById(req.body.p_id);
      if (!parkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }

      let status = parkingspot.p_status;
      // Update the parkingspot
      const updatedParkingspot = await Parkingspot.findByIdAndUpdate(
        req.body.p_id,
        req.body,
        { new: true }
      );

      // check if the parkingspot was set to inactive
      if (status == "active" && updatedParkingspot.p_status == "inactive") {
        const response = await setParkingspotInactive(req, res);
        return res.status(response.status).json({ message: response.message });
      }

      res.status(200).json({
        message: 'Parkingspot updated.',
        content: updatedParkingspot,
      });
    }
    catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// set a parkingspot to inactive
setParkingspotInactive = async (req, res) => {
  let cancelledCount = 0;
  let remainingCount = 0;
  let activeReservations = [];
  let furthestEnd = new Date();
  try {
    // call the cancelPossibleReservations function, which cancels all reservations of the parkingspot
    // returns the number of cancelled and remaining reservations and an array of the active remaining reservations
    const response = await cancelPossibleReservations(req, res);
    cancelledCount = response.cancelledCount;
    remainingCount = response.remainingCount;
    activeReservations = response.activeReservations;

    // check if there are remaining reservations
    if (activeReservations) {
      // find the reservation, that is the furthest in the future
      let furthestReservation = activeReservations[0];

      for (const reservation of activeReservations) {
        const endTimeMinutes = reservation.rt_timeframe.t_timeuntil;
        const endTime = format(parse(`${reservation.rt_timeframe.t_dayuntil} ${Math.floor(endTimeMinutes / 60)}:${endTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');
        const end = new Date(endTime);

        const furthestEndTimeMinutes = furthestReservation.rt_timeframe.t_timeuntil;
        const furthestEndTime = format(parse(`${furthestReservation.rt_timeframe.t_dayuntil} ${Math.floor(furthestEndTimeMinutes / 60)}:${furthestEndTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');
        furthestEnd = new Date(furthestEndTime);

        if (end > furthestEnd) {
          furthestReservation = reservation;
        }
      }

      // format furthestEnd
      furthestEnd = format(furthestEnd, 'yyyy-MM-dd HH:mm');
      return { status: 200, message: "Parkingspot set to inactive. Cancelled " + cancelledCount + " reservations and " + remainingCount + " reservations remain active until " + furthestEnd + "." };
    }

    return { status: 200, message: "Parkingspot set to inactive. Cancelled " + cancelledCount + " reservations." };

  } catch (err) {
    return { status: 500, message: err.message };
  }
}

cancelPossibleReservations = async (req, res) => {
  let cancelledCount = 0;
  let remainingCount = 0;
  let activeReservations = [];

  try {
    // get the parkingspot
    const parkingspot = await Parkingspot.findById(req.body.p_id);

    // go through all reservations of the parkingspot and cancel them by calling the cancelReservation route
    for (const reservation of parkingspot.pr_reservations) {
      try {
        // add pr_reservation to the request body
        req.body.pr_reservation = { r_id: reservation._id };
        const response = await cancelReservationFunc(req, res);
        if (response.message === "Reservation cancelled succesfully.") {
          cancelledCount++;
        } else {
          remainingCount++;
          activeReservations.push(reservation);
        }
      } catch (err) {
        console.error(err);
        remainingCount++;
      }
    }
    return { cancelledCount, remainingCount, activeReservations };
  } catch (err) {
    return { status: 500, message: err.message}
  }
};

// delete a parkingspot
router.delete(
  "/delete",
  checkLogin,
  validateParkingspotInput,
  async (req, res) => {
    let cancelledCount = 0;
    let remainingCount = 0;
    let activeReservations = [];
    furthestEnd = new Date();
    try {
      // set the parkingspot status to deleted
      const updatedParkingspot = await Parkingspot.findByIdAndUpdate(
        req.body.p_id,
        { p_status: "deleted" },
        { new: true }
      );
      if (!updatedParkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }

      // call the cancelPossibleReservations function, which cancels all reservations of the parkingspot
      response = await cancelPossibleReservations(req, res);
      cancelledCount = response.cancelledCount;
      remainingCount = response.remainingCount;
      activeReservations = response.activeReservations;

      // check if there are remaining reservations
      if (activeReservations) {
        // find the reservation, that is the furthest in the future
        let furthestReservation = activeReservations[0];

        for (const reservation of activeReservations) {
          const endTimeMinutes = reservation.rt_timeframe.t_timeuntil;
          const endTime = format(parse(`${reservation.rt_timeframe.t_dayuntil} ${Math.floor(endTimeMinutes / 60)}:${endTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');
          const end = new Date(endTime);

          const furthestEndTimeMinutes = furthestReservation.rt_timeframe.t_timeuntil;
          const furthestEndTime = format(parse(`${furthestReservation.rt_timeframe.t_dayuntil} ${Math.floor(furthestEndTimeMinutes / 60)}:${furthestEndTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');
          furthestEnd = new Date(furthestEndTime);

          if (end > furthestEnd) {
            furthestReservation = reservation;
          }
        }

        // format furthestEnd
        furthestEnd = format(furthestEnd, 'yyyy-MM-dd HH:mm');

        return res.status(200).json({
          message: "Parkingspot will be deleted on: " + furthestEnd + " .Cancelled " + cancelledCount + " reservations and " + remainingCount + " reservations remain active.",
        });
      }
      return res.status(200).json({
        message: "Parkingspot has been deleted. Cancelled " + cancelledCount + " reservations.",
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

// make a reservation
router.post(
  "/makeReservation",
  checkLogin,
  validateParkingspotInput,
  getUser,
  async (req, res) => {
    try {
      const parkingspot = await Parkingspot.findById(req.body.p_id);
      // check if the parkingspot exists
      if (!parkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }
      if (!parkingspot.p_status == "active") {
        return res.status(400).json({ message: "Parkingspot is not active." });
      }
      // create a reservation
      req.body.pr_reservation.ru_user = req.session.u_id;
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

      // get all of the user's reservations that aren't cancelled
      let reservations = [];
      for (const r of res.user.ur_reservations) {
        const p = await Parkingspot.findById(r.parkingspotid);
        if (p) {
          for (const pRes of p.pr_reservations) {
            if (pRes.r_cancelled == false) {
              if (pRes._id.toString() === r.reservationid.toString()) {
                if (pRes.rc_car.toString() === reservation.rc_car.toString()) {
                  reservations.push(pRes);
                }
              }
            }
          }
        }
      }

      // iterate over the found reservations and check if at that time the car is already reserved
      for (const r of reservations) {

        // convert start and end times to valid time strings using date-fns
        const startTimeMinutes = r.rt_timeframe.t_timefrom;
        const startTime = format(parse(`${r.rt_timeframe.t_dayfrom} ${Math.floor(startTimeMinutes / 60)}:${startTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');

        const endTimeMinutes = r.rt_timeframe.t_timeuntil;
        const endTime = format(parse(`${r.rt_timeframe.t_dayuntil} ${Math.floor(endTimeMinutes / 60)}:${endTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');

        // create Date objects from start and end times
        const rStart = new Date(startTime);
        const rEnd = new Date(endTime);

        // convert start and end times to valid time strings using date-fns
        const resStartTimeMinutes = reservation.rt_timeframe.t_timefrom;
        const resStartTime = format(parse(`${reservation.rt_timeframe.t_dayfrom} ${Math.floor(resStartTimeMinutes / 60)}:${resStartTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');

        const resEndTimeMinutes = reservation.rt_timeframe.t_timeuntil;
        const resEndTime = format(parse(`${reservation.rt_timeframe.t_dayuntil} ${Math.floor(resEndTimeMinutes / 60)}:${resEndTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');
        const resStart = new Date(resStartTime);
        const resEnd = new Date(resEndTime);


        if (
          isWithinInterval(resStart, { start: rStart, end: rEnd }) ||
          isWithinInterval(resEnd, { start: rStart, end: rEnd }) ||
          isWithinInterval(rStart, { start: resStart, end: resEnd }) ||
          isWithinInterval(rEnd, { start: resStart, end: resEnd })
        ) {
          return res.status(400).json({
            message: "Car is already reserved at that time.",
          });
        }
      }

      // check how much time is left until the reservation starts
      const startTimeMinutes = reservation.rt_timeframe.t_timefrom;
      const startTime = format(parse(`${reservation.rt_timeframe.t_dayfrom} ${Math.floor(startTimeMinutes / 60)}:${startTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');
      const start = new Date(startTime);
      const now = new Date();
      const timeLeft = differenceInMinutes(start, now);

      // if the reservation is in the next 24 hours, set reservation.r_critcanceltime to "h"
      if (timeLeft <= 1440) {
        reservation.r_critcanceltime = "h";
      }

      // if the reservation is in less than a month, set reservation.r_critcanceltime to "d"
      if (timeLeft <= 43200 && timeLeft > 1440) {
        reservation.r_critcanceltime = "d";
      }

      // if the reservation is in 1 to 3 months, set reservation.r_critcanceltime to "w"
      if (timeLeft > 43200 && timeLeft <= 129600) {
        reservation.r_critcanceltime = "w";
      }

      // if the reservation is in more than 3 months, set reservation.r_critcanceltime to "m"
      if (timeLeft > 129600) {
        reservation.r_critcanceltime = "m";
      }
      // add the reservation to the parkingspot
      parkingspot.pr_reservations.push(reservation);
      await parkingspot.save();

      // fetch the updated parkingspot
      const updatedParkingspot = await Parkingspot.findById(parkingspot._id);

      let newReservationId;
      // get the reservation id of the reservation that was just added
      for (const res of updatedParkingspot.pr_reservations) {
        if (res.rc_car.toString() === reservation.rc_car.toString() && res.rt_timeframe.t_dayfrom === reservation.rt_timeframe.t_dayfrom && res.rt_timeframe.t_dayuntil === reservation.rt_timeframe.t_dayuntil && res.rt_timeframe.t_timefrom === reservation.rt_timeframe.t_timefrom && res.rt_timeframe.t_timeuntil === reservation.rt_timeframe.t_timeuntil) {
          newReservationId = res._id;
        }
      }

      // add reservation to user array
      res.user.ur_reservations.push({
        parkingspotid: parkingspot._id,
        reservationid: newReservationId,
      });

      // set the car to reserved
      car.c_isreserved = true;
      // save the user
      await res.user.save();

      res.status(201).json({
        message: "Reservation added succesfully.",
        content: "",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Cancel a reservation
router.patch(
  "/cancelReservation",
  validateParkingspotInput,
  checkLogin,
  async (req, res) => {
    try {
      const response = await cancelReservationFunc(req, res);
      res.status(response.status).json({ message: response.message });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Cancel a reservation
cancelReservationFunc = async (req, res) => {
  // check if the parkingspot exists
  const parkingspot = await Parkingspot.findById(req.body.p_id);
  if (!parkingspot) {
    console.log("Parkingspot not found.");
    return { status: 404, message: "Parkingspot not found." };
  }

  // Check if the reservation exists in the parkingspot
  const reservation = parkingspot.pr_reservations.find(
    (r) => r._id.toString() === req.body.pr_reservation.r_id.toString()
  );

  if (!reservation) {
    console.log("Reservation not found.");
    return { status: 404, message: "Reservation not found." };
  }

  // check if the reservation is already cancelled
  if (reservation.r_cancelled) {
    console.log("Reservation is already cancelled.");
    return { status: 400, message: "Reservation is already cancelled." };
    }

  // check if the cancellation time has passed
  const startTimeMinutes = reservation.rt_timeframe.t_timefrom;
  const startTime = format(parse(`${reservation.rt_timeframe.t_dayfrom} ${Math.floor(startTimeMinutes / 60)}:${startTimeMinutes % 60}`, 'yyyyMMdd H:mm', new Date()), 'yyyy-MM-dd HH:mm');
  const start = new Date(startTime);
  const now = new Date();
  const timeLeft = differenceInMinutes(start, now);

  // one hour left
  if (reservation.r_critcanceltime === "h" && timeLeft <= 60) {
    console.log("Cancellation time has passed.");
    return { status: 401, message: "Cancellation time has passed."}
  }

  // one day left
  if (reservation.r_critcanceltime === "d" && timeLeft <= 1440) {
    console.log("Cancellation time has passed.");
    return { status: 401, message: "Cancellation time has passed."}
  }

  // one week left
  if (reservation.r_critcanceltime === "w" && timeLeft <= 10080) {
    console.log("Cancellation time has passed.");
    return { status: 401, message: "Cancellation time has passed."}
  }

  // one month left
  if (reservation.r_critcanceltime === "m" && timeLeft <= 43200) {
    console.log("Cancellation time has passed.");
    return { status: 401, message: "Cancellation time has passed."}
  }


  //  update the parkingspot's reservations, dont' delete the reservation, just set it to cancelled
  await Parkingspot.updateOne(
    { _id: parkingspot._id },
    { $set: { "pr_reservations.$[element].r_cancelled": true } },
    { arrayFilters: [{ "element._id": reservation._id }] }
  );


  // find user with reservation.ru_user
  const user = await User.findById(reservation.ru_user);

  // go through the user's reservations that are not cancelled and check if the car has other reservations
  // if the car doesn't have other reservations, set c_isreserved to false
  let car;
  user.uc_cars.forEach((c) => {
    if (c._id.toString() === reservation.rc_car.toString()) {
      car = c;
    }
  });

  let hasOtherReservations = false;
  user.ur_reservations.forEach((userReservation) => {
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
  await user.save();

  // return message and content, not as res but as variables
  return { status: 200, message: "Reservation cancelled succesfully.", content: reservation };
};



// get a single reservation by id
router.get(
  "/getReservation",
  checkLogin,
  getUser,
  async (req, res) => {
    try {
      // get the reservation of the user
      let reservation;
      for (const r of res.user.ur_reservations) {
        if (r.reservationid == req.body.r_id) {
          reservation = r;
        }
      }
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found." });
      }
      // find the reservation in the parkingspot
      const parkingspot = await Parkingspot.findById(reservation.parkingspotid);
      if (!parkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }
      let reservationFound;
      for (const r of parkingspot.pr_reservations) {
        if (r._id == reservation.reservationid) {
          reservationFound = r;
        }
      }
      if (!reservationFound) {
        return res.status(404).json({ message: "Reservation not found." });
      }
      res.status(200).json({
        message: "Reservation found: ",
        content: reservationFound,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

// get all reservations of a parkingspot
router.post(
  "/getParkingspotReservations",
  checkLogin,
  getUser,
  async (req, res) => {
    try {
      // get the parkingspot 
      const parkingspot = await Parkingspot.findById(req.body.p_id);
      if (!parkingspot) {
        return res.status(404).json({ message: "Parkingspot not found." });
      }
      // get all of the parkingspot's reservations
      let reservations = [];
      for (const r of parkingspot.pr_reservations) {
        reservations.push(r);
      }
      if (reservations.length === 0) {
        return res.status(404).json({ message: "No reservations found." });
      }
      res.status(200).json({
        message: "Reservations found: ",
        content: reservations,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


// Get all reservations of a user
router.get("/getReservations", checkLogin, getUser, async (req, res) => {
  try {
    // get all of the user's reservations
    let reservations = [];
    for (const r of res.user.ur_reservations) {
      const p = await Parkingspot.findById(r.parkingspotid);
      if (p) {
        for (const pRes of p.pr_reservations) {
          if (pRes._id.toString() === r.reservationid.toString()) {
            reservations.push(pRes);
          }
        }
      }
    }
    if (reservations.length === 0) {
      return res.status(404).json({ message: "No reservations found." });
    }
    res.status(200).json({
      message: "Reservations found: ",
      content: reservations,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
