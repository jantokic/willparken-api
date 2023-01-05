require('dotenv').config()

const express = require('express')
const app = express()


const mongoose = require ('mongoose')
mongoose.connect(
    process.env.DATABASE_URL, 
    {
        authSource: "admin",
        user: process.env.DATABASE_USR,
        pass: process.env.DATABASE_PWD,
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
)


const db = mongoose.connection

db.on('error', (error) => console.error(error))
db.once('open', () => console.log('Connected to Database.'))

app.use(express.json())
const usersRouter = require('./routes/users')
const parkingspotsRouter = require('./routes/parkingspots')
app.use('/users', usersRouter)
app.use('/parkingspots', parkingspotsRouter)


app.listen(process.env.API_PORT, () => console.log('Server Started.'))

