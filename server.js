var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var shortid = require("shortid");
var database_uri = require("dotenv").config();

var app = express();
var port = process.env.PORT || 3000;

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC

const { request } = require("express");
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json"
  );
  next();
});
//app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/timestamp", function (req, res) {
  res.sendFile(__dirname + "/views/timestamp.html");
});

app.get("/requestHeaderParser", function (req, res) {
  res.sendFile(__dirname + "/views/requestHeaderParser.html");
});
app.get("/urlShortenerMicroservice", function (req, res) {
  res.sendFile(__dirname + "/views/urlShortenerMicroservice.html");
});
app.get("/exercise-tracker", function (req, res) {
  res.sendFile(__dirname + "/views/exercise-tracker.html");
});

//  your first API endpoint...

// Header Request
app.get("/api/whoami", function (req, res) {
  res.json({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

app.get("/api/hello", function (req, res) {
  console.log({ greeting: "hello API" });
  res.json({ greeting: "hello API" });
});

//Timestamp Project
app.get("/api/timestamp", (req, res) => {
  var now = new Date();
  res.json({ unix: now.getTime(), utc: now.toUTCString() });
});

app.get("/api/:date_string", (req, res) => {
  let dateString = req.params.date_string;

  if (parseInt(dateString) > 10000) {
    let unixTime = new Date(parseInt(dateString));

    res.json({
      unix: unixTime.getTime(),
      utc: unixTime.toUTCString(),
    });
  }

  let passedInValue = new Date(dateString);

  if (passedInValue == "Invalid Date") {
    res.json({ error: "Invalid Date" });
  } else {
    res.json({
      unix: passedInValue.getTime(),
      utc: passedInValue.toUTCString(),
    });

    app.get("/api", (req, res) => {
      var now = new Date();
      res.json({ unix: now.getTime(), utc: now.toUTCString() });
    });
  }
});

//Urls Shortening Service

//Build a schema and model to store saved URLs

let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number,
});

let Url = mongoose.model("Url", urlSchema);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

let responseObject = {};
app.post("/api/shorturl", (request, response) => {
  let inputUrl = request.body["url"];

  let urlRegex = new RegExp(
    /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi
  );

  if (!inputUrl.match(urlRegex)) {
    response.json({ error: "Invalid URL" });
    return;
  }

  responseObject["original_url"] = inputUrl;

  let inputShort = 1;

  Url.findOne({})
    .sort({ short: "desc" })
    .exec((error, result) => {
      if (!error && result != undefined) {
        inputShort = result.short + 1;
      }
      if (!error) {
        Url.findOneAndUpdate(
          { original: inputUrl },
          { original: inputUrl, short: inputShort },
          { new: true, upsert: true },
          (error, savedUrl) => {
            if (!error) {
              responseObject["short_url"] = savedUrl.short;
              response.json(responseObject);
            }
          }
        );
      }
    });
});

app.get("/api/shorturl/:input", (request, response) => {
  let input = request.params.input;

  Url.findOne({ short: input }, (error, result) => {
    if (!error && result != undefined) {
      response.redirect(result.original);
    } else {
      response.json({ error: "invalid url" });
    }
  });
});

//Exercise Tracker
let ExerciseUser = mongoose.model(
  "ExerciseUser",
  new mongoose.Schema({
    _id: String,
    username: String,
  })
);

app.post("/api/users", (req, res) => {
  let mongooseGenerateID = mongoose.Types.ObjectId();
  let exerciseUser = new ExerciseUser({
    username: req.body.username,
    _id: mongooseGenerateID,
  });
  exerciseUser.save((err, doc) => {
    if (err) return console.error(err);
    res.json({
      saved: true,
      username: exerciseUser.username,
      _id: exerciseUser["_id"],
    });
  });
});

// listen for requests :)
var listener = app.listen(port, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
