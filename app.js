const config =  require('./config.js');

const express = require('express')
const app = express()
var bodyParser = require('body-parser')
const cors = require("cors");
require('dotenv').config()

// Login tokens and session cookies are signed with these keys. Refuse to run with
// missing or placeholder values, or with the key published in this repository's history.
const publishedKeyHash = 'a7b7fb7c3ec77e84faedbfd99338e41466d0d5866e74cdf4d68b943b6d7281e3';
for (const name of ['COOKIE_KEY', 'COOKIE_KEY2']) {
  const value = (process.env[name] || '').trim();
  const hash = require('crypto').createHash('sha256').update(value).digest('hex');
  if (value.length < 32 || hash === publishedKeyHash) {
    console.error(`${name} must be set to its own random value, generate one with: openssl rand -hex 32`);
    process.exit(1);
  }
}
const path = require('path');
var session = require('cookie-session')
var compression = require('compression')
app.use(compression())

var expiryDate = new Date(Date.now() + 60 * 60 * (1000 * 12 * 30)) // 30 day
app.use(session({
  name: 'session',
  keys: [process.env.COOKIE_KEY, process.env.COOKIE_KEY2],
  cookie: {
    secure: true,
    httpOnly: true,
    expires: expiryDate
  }
}))

let setCache = function (req, res, next) {
  const period = 60 * 60 * 24
  // API responses are per-user and must not be cached by shared caches
  if (req.method == 'GET' && !req.path.startsWith('/api/')) {
    res.set('Cache-control', `public, max-age=${period}`)
  } else {
    res.set('Cache-control', `no-store`)
  }
  next()
}
app.use(setCache)

var rateLimit = require('express-rate-limit');
const helmet = require("helmet");
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'", "sdk.twilio.com", "wss:", "ws:", "eventgw.twilio.com"],
        "object-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"]
      },
    },
  })
);
app.disable('x-powered-by');
app.set('trust proxy', 1)
const server = require('http').createServer(app);

global.io = require('socket.io')(server,{ cors: { origin: ['http://localhost:8080'] } });

var mongoose = require('./config/db.config');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('database connected successfully!');
});

//app.use(cors());
app.use(cors({ origin: ['http://localhost:8080'], }))

var limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: "Slow down your requests!",
  legacyHeaders: false
});
  
// apply rate limiter to all requests
app.use(limiter);
// sockets must present a full login token and may only join their own user's channel
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  try {
    const decoded = jwt.verify(socket.handshake.auth.token, process.env.COOKIE_KEY);
    if (decoded.pending) {
      return next(new Error('Unauthorized Access!'));
    }
    socket.data.userId = String(decoded.id);
    next();
  } catch (e) {
    next(new Error('Unauthorized Access!'));
  }
});
io.on('connection', socket => {
  console.log('a user connected');
  const joinOwnChannel = (channel) => {
    if (String(channel) === socket.data.userId) {
      socket.join(socket.data.userId);
    }
  };
  socket.on('join_channel', joinOwnChannel);
  socket.on('join_profile_channel', joinOwnChannel);
});

app.use('/frontend/dist/index.html', express.static('frontend/dist/index.html'));
app.use('/version.md', express.static('version.md'));
// app.enable('trust proxy')
if( (process.env.HTTPS || '').trim() === 'true'){
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https'){
      if(req.url == '/get-base-url'){
        next()
        // res.status(200).json({url: process.env.BASE_URL.trim()});
      }else{
        res.sendFile(path.join(__dirname, './error/index.html'));
      }
    } else {
      next()
    }
  })

  /* app.use((req, res, next) => {
    console.log(req.url)
    console.log(req.secure)
    if (req.secure || req.url === '/error') {
      next()
    } else if(req.url == '/get-base-url'){
      res.status(200).json({url: process.env.BASE_URL.trim()});
    }else{
      // res.sendFile(path.join(__dirname, './error/index.html'));
    }
  }) */
}
// parse requests of content-type - application/json
// keep the raw body, webhook signatures are computed over it
const keepRawBody = (req, res, buf) => { req.rawBody = buf; };
app.use(bodyParser.json({limit: '10mb', verify: keepRawBody}));

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb', verify: keepRawBody }));
app.use('/uploads', express.static('uploads'));
app.use('/src', express.static('src'));
app.use('/frontend', express.static('frontend'));
// app.use('/frontend', express.static('frontend'));
app.use('/frontend/dist/static/', express.static('frontend/dist/static'));
app.get(`/error`, function (req, res) {
  res.sendFile(path.join(__dirname, './error/index.html'));
})
app.get(`/:id`, function (req, res) {
  res.sendFile(path.join(__dirname, './frontend/dist/index.html'));
})
app.get(`/:id/:name`, function (req, res) {
  res.sendFile(path.join(__dirname, './frontend/dist/index.html'));
})
app.use(express.static(path.join(__dirname, './frontend/dist')));

require("./app/routes/auth.route")(app);
require("./app/routes/setting.route")(app);
require("./app/routes/profile.route")(app);
require("./app/routes/media.route")(app);
require("./app/routes/contact.route")(app);
require("./app/routes/email.route")(app);
require("./app/routes/call.route")(app);
require("./app/routes/hardwarekey.route")(app);


app.get('/api/users/', function (req, res) {
  res.status(200).json({message: 'success'});
})

app.get('/get-base-url', function(req, res) {
  res.status(200).json({url: process.env.BASE_URL.trim()});
});
server.listen(process.env.PORT)