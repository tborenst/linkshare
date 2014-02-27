/* ---------- IMPORTS ------------------------------------------------------- */

var path = require("path");
var express = require("express");
var app = express();

/* ---------- CONFIGURATION ------------------------------------------------- */

app.configure(function(){ 
  app.use(express.bodyParser());
  app.use(express.static(path.join(__dirname, '/static')));
  app.set("port", process.env.PORT || 8000);
});

/* ---------- ROUTES -------------------------------------------------------- */

// Home Route
app.get('/', function(req, res) {
  res.sendfile('static/index.html');
});

/* ---------- RUN SERVER ---------------------------------------------------- */

app.listen(app.get("port"));
console.log("Listening on " + app.get("port"));