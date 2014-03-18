/* ---------- IMPORTS ------------------------------------------------------- */

var path = require("path");
var express = require("express");
var app = express();
var auth = require("./auth.js");
var database = require("./database.js");
var constants = require("./constants.js");

/* ---------- CONFIGURATION ------------------------------------------------- */

app.configure(function(){ 
	app.use(express.static(path.join(__dirname, "/static")));
	app.set("port", process.env.PORT || 8000);
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.session({secret: constants.SESSION_SECRET}));
	app.use(auth.passport.initialize());
	app.use(auth.passport.session());
});

/* ---------- ROUTES -------------------------------------------------------- */

//====================//
// AUTH + USER ROUTES //
//====================//

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
			req.logIn(user, function(error){
				if(error){
					res.status(424).send({message: constants.MSG_INTERNAL});
				} else {
					res.status(200).send({message: constants.MSG_OK});
				}
			});
		}
	})(req, res, next);
});

/**
 * Logout Route:
 * Deletes the user's current session and logs them out.
 ***/
app.delete("/session", function(req, res){
	req.logout();
	res.status(200).send({message: constants.MSG_OK});
});

//=============//
// LINK ROUTES //
//=============//

/**
 * Post Link Route:
 * Posts a new link on behalf of the logged in user (login required).
 * - request should include "url", "title", and "location" fields
 * - response has a status field (401, 424, 200)
 ***/
app.post("/link", auth.authSession, function(req, res){
	var username = req.user.username;
	var url = req.body.url;
	var title = req.body.title;
	var location = req.body.location;
	database.addLink(username, url, title, location, function(error){
		if(error){
			res.status(424).send({message: constants.MSG_INTERNAL});
		} else {
			res.status(200).send({message: constants.MSG_OK});
		}
	});
});

/**
 * Get Links Route:
 * Returns an array of the N top links. 
 * - request should include "num" field to specify a max number of links
 * - response has status field (424, 200)
 * Each object in the array has the form:
 * {username, url, location, date, score, vote}
 * - username: username of the link poster
 * - url: url of the link
 * - location: string describing the location the link was posted from
 * - date: string describing time/date (server time) when the link was posted
 * - score: #upvotes - #downvotes
 * - vote: 1 if the user has upvoted this link, -1 if the user has downvoted 
 *   this link, and 0 otherwise or if the user is not logged in
 ***/
app.get("/link", function(req, res){
	var num = parseInt(req.query.num);
	database.getTopNLinks(num, function(error, results){
		if(error){
			res.status(424).send({message: constants.MSG_INTERNAL});
		} else {
			results = linkCleanup(req, results);
			res.status(200).send({message: constants.MSG_OK, links: results});
		}
	});
});

/**
 * linkCleanup:
 * Helper method for the GET "/link" route which cleans the link results from
 * the database and prepares them for the client.
 ***/
var linkCleanup = function(req, links){
	for(var i = 0; i < links.length; i++){
		var link = links[i];
		var upvotes = link.upvotes;
		var downvotes = link.downvotes;
		// prep link
		delete link.upvotes;
		delete link.downvotes;
		delete link._id;
		link.vote = 0;
		// calculate vote
		if(req.user){
			var username = req.user.username;
			if(upvotes.indexOf(username) !== -1){
				link.vote += 1;
			} else if(downvotes.indexOf(username) !== -1){
				link.vote -= 1;
			}
		}
		// save link in results
		links[i] = link;
	}
	return links;
}

/**
 * Upvote/Downvote Link Route:
 * Lets a logged in user upvote or downvote a particular link (login required).
 * - request should have fields id (for link id) and vote (1 or -1)
 * - response has a status field (401, 424, 200)
 ***/
app.put("/link", auth.authSession, function(req, res){
	var id = req.body.id;
	var vote = parseInt(req.body.vote);
	if(vote > 0){
		database.upvoteLink(id, req.user.username, function(error){
			if(error){
				res.status(424).send({message: constants.MSG_INTERNAL});
			} else {
				res.status(200).send({message: constants.MSG_OK})
			}
		});
	} else if(vote < 0){
		database.downvoteLink(id, req.user.username, function(error){
			if(error){
				res.status(424).send({message: constants.MSG_INTERNAL});
			} else {
				res.status(200).send({message: constants.MSG_OK})
			}
		});
	} else {
		res.status(200).send({message: constants.MSG_OK})
	}
});

//==================//
// DEBUGGING ROUTES //
//==================//

// user info (debugging)
app.get("/user", auth.authSession, function(req, res){
	res.status(200).send(req.user);
});

// debugging Route (debugging)
app.get("/debug", function(req, res){
	res.sendfile("static/debugging.html");
});

//==============//
// OTHER ROUTES //
//==============//

// Home Route
app.get('/', function(req, res) {
	res.sendfile('static/index.html');
});

/* ---------- RUN SERVER ---------------------------------------------------- */

app.listen(app.get("port"));
console.log("Listening on " + app.get("port"));