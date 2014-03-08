var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var database = require("./database.js");
var constants = require("./constants");

// set up Passport's auth methods
passport.use(new LocalStrategy({
        usernameField: "username",
        passwordField: "password"
    },
    function(username, password, done){
        database.findUser(username, function(error, user){
            if(error){
                return done(error, null, {message: constants.ERR_INTERNAL});
            } else {
                database.validateUserPassword(username, password, function(error, valid){
                    if(error){
                        return done(error, null, {message: constants.ERR_INTERNAL});
                    } else if(valid){
                        return done(null, user, {message: constants.AUTH_SUCCESS});
                    } else {
                        return done(null, false, {message: constants.AUTH_FAILURE});
                    }
                });
            }
        });
    }
));

passport.serializeUser(function(user, done){
    database.serializeUser(user, done);
});

passport.deserializeUser(function(userString, done){
    database.deserializeUser(userString, done);
});

// express middleware
// sends a 401 status if not authenticated
var authSession = function(req, res, next){
    if(req.isAuthenticated()){
        next();
    } else {
        res.status(401).send({message: constants.AUTH_FAILURE});
    }   
}

module.exports = {
  passport: passport,
  authSession: authSession
}