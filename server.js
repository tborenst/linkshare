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
	var username = req.body.username;
	var password = req.body.password;
	var location = req.body.location;

	database.addUser(username, password, location, function(error, success){
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

	/* it's important that this goes before isValidUrl. isValidUrl will fail
	 * if the submitted url doesn't include a http/https. So we want to add this
	 * (if needed) to the url before we check if it's valid
	 */
	url = formatUrl(url);

	if(isValidUrl(url)){
		var title = req.body.title;
		var location = req.body.location;
		database.addLink(username, url, title, location, function(error){
			if(error){
				res.status(424).send({message: constants.MSG_INTERNAL});
			} else {
				res.status(200).send({message: constants.MSG_OK});
			}
		});
	} else {
		res.status(424).send({message: constants.MSG_INVALID_URL});
	}
});

/**
 * Get Links Route:
 * Returns an array of the N top links. 
 * - request should include "num" field to specify a max number of links, which
 *   otherwise defaults to 10.
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
	var num = (req.query.num) ? (parseInt(req.query.num)) : 10;
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
 * Upvote/Downvote Link Route:
 * Lets a logged in user upvote or downvote a particular link (login required).
 * - request should have fields id (for link id) and vote (1 or -1)
 * - response has a status field (401, 424, 200) and the following format:
 *   {message, vote, score}, where vote is either 1, 0, or -1 depending on what
 *   the users current vote on the link is and score is the new score after the
 *   the vote has been cast
 ***/
 
app.put("/link", auth.authSession, function(req, res){
	var id = req.body.id;
	var vote = parseInt(req.body.vote);
	if(vote > 0){
		database.upvoteLink(id, req.user.username, function(error, userVote, newScore){
			if(error){
				res.status(424).send({message: constants.MSG_INTERNAL});
			} else {
				res.status(200).send({message: constants.MSG_OK, vote: userVote, score: newScore});
			}
		});
	} else if(vote < 0){
		database.downvoteLink(id, req.user.username, function(error, userVote, newScore){
			if(error){
				res.status(424).send({message: constants.MSG_INTERNAL});
			} else {
				res.status(200).send({message: constants.MSG_OK, vote: userVote, score: newScore});
			}
		});
	}
});


/**
 * Get User Route:
 * Returns basic user info in the format {count, score, links}.
 * - count: number of posts this user has posted
 * - score: sum of all scores of links this user has posted
 * - links: an array of max-length N top links from this user
 * - request may contain optional parameter "num" to specify N, which otherwise
 *   defaults to 10.
 ***/
app.get("/user", auth.authSession, function(req, res){
	var num = (req.query.num) ? (parseInt(req.query.num)) : 10;
	database.getUserInfo(req.user.username, num, function(error, info){
		if(error){
			res.status(424).send({message: constants.MSG_INTERNAL});
		} else {
			info.links = linkCleanup(req, info.links);
			res.status(200).send({message: constants.MSG_OK, info: info})
		}
	});
});

//================//
// HELPER METHODS //
//================//

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
 * formatUrl:
 * Helper method to add "http://" to a url if it's not there already
 ***/
var formatUrl = function(url){
	var hasScheme = (url.match(constants.REGEX_HTTP_HTTPS) !== null);
	if(hasScheme){
		return url;
	} else {
		return "http://" + url;
	}
}

/**
 * isValidUrl:
 * Helper method to see if a url is valid by testing it against a URL regex
 ***/
var isValidUrl = function(url){
	return (url.match(constants.REGEX_URL)!== null);
}

//==================//
// DEBUGGING ROUTES //
//==================//

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