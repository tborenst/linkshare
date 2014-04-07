/* ---------- EXPORTS ------------------------------------------------------- */

module.exports = {
    // names
    DB_HOST: "localhost",
    DB_USERS: "users",
    DB_LINKS: "links",
    // errors
    ERR_INTERNAL: "internal server error",
    ERR_USER_DOESNT_EXIST: "the user does not exist",
    ERR_USER_EXISTS: "username already exists",
    ERR_NOT_MATCH: "the username/password combination does not match",
    ERR_TIMEOUT: "the request has timed out",
    // auth
    AUTH_SUCCESS: "authentication successful",
    AUTH_FAILURE: "authentication failed",
    SESSION_SECRET: "thesessionsecret",
    // status messages
    MSG_INTERNAL: "There was an error with the server, please try again later.",
    MSG_USER_EXISTS: "This username is already in use, please pick another username.",
    MSG_CREDENTIALS: "The username/password pair you have entered is incorrect.",
    MSG_INVALID_URL: "The submitted url isn't valid",
    MSG_OK: "OK",
    // regular expressions
    REGEX_URL: new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/),
    REGEX_HTTP_HTTPS: new RegExp(/^https?:\/\//),
    // other constants
    CONST_DB_TIMEOUT: 5000,
}