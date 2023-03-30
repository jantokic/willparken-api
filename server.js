require('dotenv').config()

const express = require('express')
const session = require('express-session')
const store = new session.MemoryStore()
const crypto = require('crypto')
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express()

const logger = require('morgan');

const mongoose = require('mongoose')
mongoose.connect(
    "mongodb+srv://cluster0.6ichmiz.mongodb.net/willparken",
    {
        authSource: "admin",
        user: "admin",
        pass: "admin",
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
)


const db = mongoose.connection

db.on('error', (error) => console.error(error))
db.once('open', () => console.log('Connected to Database.'))

app.use(cookieParser());
app.use(cors({
    origin: [
        'http://localhost:8080',
        'https://localhost:8080',
        'http://localhost:3000',
        'https://localhost:3000',
        'https://seal-app-jk939.ondigitalocean.app',
        'https://seal-app-jk939.ondigitalocean.app/',
        'https://willparken.live',
        'https://willparken.live/',
    ],
    credentials: true,
    exposedHeaders: ['set-cookie']
}));
app.use(bodyParser.json());

app.use(logger('dev'));
app.use(express.json())
app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}))
const usersRouter = require('./routes/users')
const parkingspotsRouter = require('./routes/parkingspots')
app.use('/users', usersRouter)
app.use('/parkingspots', parkingspotsRouter)


app.listen(3000, () => console.log('Server Started.'))

