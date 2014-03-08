/* ---------- IMPORTS ------------------------------------------------------- */

var constants = require("./constants.js");
var mongo = require("mongodb");

/* ---------- SETUP --------------------------------------------------------- */

var host = constants.DB_HOST;
var port = mongo.Connection.DEFAULT_PORT;

var options = {w: 1}; // enable write access
var dbName = "linkshareDb";

var client = new mongo.Db(
    dbName,
    new mongo.Server(host, port),
    options
);
var dbOpen = false;

/* ---------- UTILITIES ----------------------------------------------------- */

/**
 * openDb:
 * - callback takes arguments (error)
 * - make sure to call closeDb() at the end of your callback
 ***/
var openDb = function(callback){
    callback = (callback === undefined) ? function(){} : callback;
    client.open(function(error){
        if(error){
            callback(error);
        } else {
            dbOpen = true;
            callback(null);
        }
    });
}

var closeDb = function(callback){
    callback = (callback === undefined) ? function(){} : callback;
    client.close(function(){
        dbOpen = false;
        callback();
    });
}

/**
 * getCollection:
 * Waits until the database is opened and then gets a collection.
 * - callback takes arguments (error, collection)
 * - veto is an optional parameter - set to true, this function will do nothing
 ***/
var getCollection = function(name, callback, veto){
    // function to open a collection
    var openCollection = function(){
        client.collection(name, function(error, collection){
            if(error){
                callback(error, null);
            } else {
                callback(null, collection);
            }
        });
    }

    // wait until the database is open before you open the collection
    if(dbOpen){
        openCollection();
    } else {
        setTimeout(function(){
            getCollection(name, callback);
        }, 0);
    }
}

/* ---------- USER METHODS -------------------------------------------------- */

/**
 * findUser:
 * - callback takes arguments (error, userObject)
 * - userObject will be null if no user exists
 ***/
var findUser = function(username, callback){
    getCollection(constants.DB_USERS, function(error, collection){
        if(error){
            callback(constants.ERR_INTERNAL, null);
        } else {
            // find a user with this username
            var query = {username: username};
            collection.findOne(query, function(error, result){
                if(error){
                    callback(constants.ERR_INTERNAL, null);
                } else {
                    if(result && result.username === username){
                        callback(null, result);
                    } else {
                        callback(null, null);
                    }
                }
            });
        }
    });
}

/**
 * addUser:
 * - callback takes arguments (error)
 * - error will be null if operation successful
 * - passwords are stored as PLAIN TEXT (do not do this IRL!)
 ***/
var addUser = function(username, password, callback){
    findUser(username, function(error, user){
        if(error){
            callback(error);
        } else if(user !== null){
            callback(constants.ERR_USER_EXISTS);
        } else {
            // add the user to the database
            getCollection(constants.DB_USERS, function(error, collection){
                if(error){
                    callback(constants.ERR_INTERNAL);
                } else {
                    var user = {username: username, password: password};
                    collection.insert(user, function(error){
                        if(error){
                            callback(constants.ERR_INTERNAL);
                        } else {
                            callback(null);
                        }
                    });
                }
            });
        }
    });
}

/**
 * validateUserPassword:
 * Determines whether a username/password pair is valid.
 * - callback takes arguments (error, valid)
 * - valid: true if username/password pair valid, false otherwise or if error
 * TODO: hash passwords
 ***/
var validateUserPassword = function(username, password, callback){
    findUser(username, function(error, userObject){
        if(error){
            callback(constants.ERR_INTERNAL, false);
        } else {
            if(userObject.password == password){
                callback(null, true);
            } else {
                callback(null, false);
            }
        }
    });
}

/**
 * deserializeUser:
 * Method to help with Passport authentication.
 * - callback takes arguments (error, userObject)
 ***/
var deserializeUser = function(userString, callback){
    var username = userString;
    findUser(username, function(error, userObject){
        if(error){
            callback(constants.ERR_INTERNAL, null);
        } else {
            callback(null, userObject);
        }
    });
}

/**
 * serializeUser:
 * Method to help with Passport authentication.
 * - callback takes arguments (error, userString)
 ***/
var serializeUser = function(userObject, callback){
    var userString = userObject.username;
    callback(null, userString);
}

/**
 * deleteAllUsers:
 * - callback takes arguments (error)
 * - error will be null if operation successful
 ***/
var deleteAllUsers = function(callback){
    getCollection(constants.DB_USERS, function(error, collection){
        if(error){
            callback(constants.ERR_INTERNAL);
        } else {
            collection.drop(function(error){
                if(error){
                    callback(constants.ERR_INTERNAL);
                } else {
                    callback(null);
                }
            });
        }
    });
}

/* ---------- LINK METHODS -------------------------------------------------- */

var makeRandomId = function(length){
    var alphabet = "1234567890abcdefghijklmnopqrstuvABCDEFGHIJKLMNOP";
    var id = "";
    for(var i = 0; i < length; i++){
        var randomIndex = Math.round((Math.random()*alphabet.length));
        id += alphabet[randomIndex];
    }
    return id;
}

/**
 * makeLinkObject:
 * Helper method. Creates a linkObject with all required fields and a random
 * linkId.
 ***/
var makeLinkObject = function(username, url, title, location){
    var date = new Date();
    var dateStr = date.toDateString();
    var linkId = makeRandomId(10);
    return {
        username: username,
        url: url,
        title: title,
        location: location,
        date: dateStr,
        score: 1,
        upvotes: [username],
        downvotes: [],
        linkId: linkId
    };
}

/**
 * addLink:
 * - callback takes arguments (error)
 * - error will be null if operation successful
 ***/
var addLink = function(username, url, title, location, callback){
    getCollection(constants.DB_LINKS, function(error, collection){
        if(error){
            callback(constants.ERR_INTERNAL);
        } else {
            var linkObject = makeLinkObject(username, url, title, location);
            collection.insert(linkObject, function(error){
                if(error){
                    callback(constants.ERR_INTERNAL);
                } else {
                    callback(null);
                }
            });
        }
    });
}

/**
 * findLink:
 * - callback takes arguments (error, linkObject)
 * - linkObject will be null if no link exists
 ***/
var findLink = function(linkId, callback){
    getCollection(constants.DB_LINKS, function(error, collection){
        if(error){
            callback(constants.ERR_INTERNAL, null);
        } else {
            var query = {linkId: linkId}
            collection.findOne(query, function(error, result){
                if(error){
                    callback(constants.ERR_INTERNAL, null);
                } else {
                    callback(null, result);
                }
            });
        }
    });
}

/**
 * getTopNLinks:
 * - callback takes arguments (error, results)
 * - results is an array of max-length n of linkObjects sorted by score in 
 *   descending order. 
 ***/
var getTopNLinks = function(n, callback){
    getCollection(constants.DB_LINKS, function(error, collection){
        if(error){
            callback(constants.ERR_INTERNAL, null);
        } else {
            var cursor = collection.find().limit(n).sort({score: -1});
            cursor.toArray(function(error, results){
                if(error){
                    callback(constants.ERR_INTERNAL, null);
                } else {
                    callback(null, results);
                }
            });
        }
    });
}

/**
 * upvoteLink:
 * Move username from downvote list to upvote list (if user downvoted link) or
 * insert username into upvote list (if user not downvoted link before). Compute
 * new score of the link.
 * - callback takes arguments (error)
 * - error will be null operation is successful
 ***/
var upvoteLink = function(linkId, username, callback){
    findLink(linkId, function(error, linkObject){
        if(error){ 
            callback(constants.ERR_INTERNAL);
        } else {
            // update upvote and downvote lists
            var upvotes = linkObject.upvotes;
            var downvotes = linkObject.downvotes;
            if(upvotes.indexOf(username) !== -1){
                // user already upvoted
                callback(null);
                return;
            } else if(downvotes.indexOf(username) !== -1){
                // move user from downvote to upvote
                var userIndex = downvotes.indexOf(username);
                downvotes.splice(userIndex, 1);
                upvotes.push(username);
            } else {
                // user upvotes for the first time
                upvotes.push(username);
            }
            // update object
            linkObject.upvotes = upvotes;
            linkObject.downvotes = downvotes;
            linkObject.score = upvotes.length - downvotes.length;
            // save object in the links collection
            getCollection(constants.DB_LINKS, function(error, collection){
                if(error){
                    callback(constants.ERR_INTERNAL);
                } else {
                    collection.save(linkObject, {safe: true}, function(error){
                        if(error){
                            callback(constants.ERR_INTERNAL);
                        } else {
                            callback(null);
                        }
                    });
                }
            });
        }
    });
}

/**
 * downvoteLink:
 * Move username from upvote list to downvote list (if user upvoted link) or
 * insert username into downvoted list (if user not upvoted link before). 
 * Compute new score of the link.
 * - callback takes arguments (error)
 * - error will be null operation is successful
 ***/
var downvoteLink = function(linkId, username, callback){
    findLink(linkId, function(error, linkObject){
        if(error){ 
            callback(constants.ERR_INTERNAL);
        } else {
            // update upvote and downvote lists
            var upvotes = linkObject.upvotes;
            var downvotes = linkObject.downvotes;
            if(downvotes.indexOf(username) !== -1){
                // user already downvoted
                callback(null);
                return;
            } else if(upvotes.indexOf(username) !== -1){
                // move user from upvote to downvote
                var userIndex = upvotes.indexOf(username);
                upvotes.splice(userIndex, 1);
                downvotes.push(username);
            } else {
                // user downvotes for the first time
                downvotes.push(username);
            }
            // update object
            linkObject.upvotes = upvotes;
            linkObject.downvotes = downvotes;
            linkObject.score = upvotes.length - downvotes.length;
            // save object in the links collection
            getCollection(constants.DB_LINKS, function(error, collection){
                if(error){
                    callback(constants.ERR_INTERNAL);
                } else {
                    collection.save(linkObject, {safe: true}, function(error){
                        if(error){
                            callback(constants.ERR_INTERNAL);
                        } else {
                            callback(null);
                        }
                    });
                }
            });
        }
    });
}

var deleteAllLinks = function(callback){
    getCollection(constants.DB_LINKS, function(error, collection){
        if(error){
            callback(constants.ERR_INTERNAL);
        } else {
            collection.drop(function(error){
                if(error){
                    callback(constants.ERR_INTERNAL);
                } else {
                    callback(null);
                }
            });
        }
    });
}

/* ---------- EXPORTS ------------------------------------------------------- */

openDb();

module.exports = {
    // User Methods
    findUser: findUser,
    addUser: addUser,
    validateUserPassword: validateUserPassword,
    deserializeUser: deserializeUser,
    serializeUser: serializeUser,
    deleteAllUsers: deleteAllUsers,
    // Link Methods
    addLink: addLink,
    findLink: findLink,
    getTopNLinks: getTopNLinks,
    upvoteLink: upvoteLink,
    downvoteLink: downvoteLink,
    deleteAllLinks: deleteAllLinks
};








