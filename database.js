/* ---------- IMPORTS ------------------------------------------------------ */

var constants = require("./constants.js");
var mongo = require("mongodb");

/* ---------- SETUP -------------------------------------------------------- */

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

// open linkshare database when this module is activated
openDb();

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
                    callback(null, result);
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