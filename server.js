var express = require("express");
var app = express();

app.use("/static", express.static(__dirname + "/static"));

app.listen(8000);