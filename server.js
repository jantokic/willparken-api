require('dotenv').config()

const express = require('express')
const session = require('express-session')
const store = new session.MemoryStore()
const app = express()
const crypto = require('crypto')

const logger = require('morgan');

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

app.use(logger('dev'));
app.use(express.json())
app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    store
}))
const usersRouter = require('./routes/users')
const parkingspotsRouter = require('./routes/parkingspots')
app.use('/users', usersRouter)
app.use('/parkingspots', parkingspotsRouter)


app.listen(process.env.API_PORT, () => console.log('Server Started.'))

