/* ---------- IMPORTS ------------------------------------------------------- */

var path = require("path");
var express = require("express");
var app = express();
var auth = require("./auth.js");
var database = require("./database.js");
var constants = require("./constants.js");

/* ---------- CONFIGURATION ------------------------------------------------- */

app.configure(function(){ 
	app.use(express.bodyParser());
	app.use(express.static(path.join(__dirname, "/static")));
	app.set("port", process.env.PORT || 8000);
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.session({secret: constants.SESSION_SECRET}));
	app.use(auth.passport.initialize());
	app.use(auth.passport.session());
});

/* ---------- ROUTES -------------------------------------------------------- */

/**
 * Register Route:
 * Attempts to add a user to the database.
 * - request should contain fields "username" and "password"
 * - response sends back data {message: str} and has a status field (424/409/200)
 ***/
app.post("/user", function(req, res){
	database.addUser(req.body.username, req.body.password, function(error, success){
		if(error === constants.ERR_INTERNAL){
			res.status(424).send({message: constants.MSG_INTERNAL});
		} else if(error === constants.ERR_USER_EXISTS){
			res.status(409).send({message: constants.MSG_USER_EXISTS});
		} else if(error === null){
			res.status(200).send({message: constants.MSG_OK});
		} else {
			res.status(424).send({message: constants.internal});
		}
	});
});

/**
 * Login Route:
 * Attempts to log a user into a session.
 * - request should contain fields "username" and "password"
 * - response sends back data {message: str} and has a status field (424, 401, 200)
 ***/
app.post("/session", function(req, res, next){
	auth.passport.authenticate("local", function(error, user, info){
		if(error){
			res.status(424).send({message: constants.MSG_INTERNAL});
		} else if(!user){
			res.status(401).send({message: constants.MSG_CREDENTIALS});
		} else {
			req.logIn(user, function(ERROR){
				if(error){
					res.status(424).send({message: constants.MSG_INTERNAL});
				} else {
					res.status(200).send({message: constants.MSG_OK});
				}
			});
		}
	})(req, res, next);
});

// Debugging Route
app.get("/debug", function(req, res){
	res.sendfile("static/debugging.html");
});

// Home Route
app.get('/', function(req, res) {
	res.sendfile('static/index.html');
});

/* ---------- RUN SERVER ---------------------------------------------------- */

app.listen(app.get("port"));
console.log("Listening on " + app.get("port"));