Modernizr.addTest('standalone', function(){
    return window.navigator.standalone;
});

if(navigator.standalone != undefined && !!!navigator.standalone){
    // TODO: show notification telling users to install app as standalone
    //return;
}

//TODO: Where's the best place to put this?
var connected = true;

/* For devices that are touch-enabled, use touchstart instead of click, in order
 * to get rid of 300ms delay normally associated with click on touch devices
 */
var clickEvent = Modernizr.touch ? "touchstart" : "click";

$(document).ready(function(){
    attachAjaxSetupHandlers();
    attachUIHandlers();
    attachFormSubmissionHandlers();
    attachVoteHandlers();

    /* show the geolocation checkbox if geolocation is available */
    if(Modernizr.geolocation){
        $(".geolocation_checkbox").show();
    }

    //TODO: detect if user already logged in and go straight to feed?
    loadContentForPanel($("#login_panel"));
    visits.add($("#login_panel"));

    registerHandlebarsPartials();

});

/* ---------- EVENT HANDLERS ------------------------------------------------ */

function attachAjaxSetupHandlers(){
    /* Provide an error function for all ajax requests henceforth */
    $.ajaxSetup({
        timeout: 3000, //TODO: Make this a parameter
        error: function(jqXHR, textStatus, errorThrown){
            handleAjaxError(jqXHR, textStatus, errorThrown);
        }
    });

    /* Whenever we have an ajaxSuccess, we can safely assume that we're connected */
    $(document).ajaxSuccess(function(){
        setAppConnected();
    });
}

function attachUIHandlers(){
    /* bind tab change links */
    $("#tab_bar a").on(clickEvent, function(e){
        e.preventDefault();

        var nextPanel = $(e.target.hash);

        /* fetch data for whatever page we're loading */
        loadContentForPanel(nextPanel);
        transition(nextPanel, "crossfade");
    });

    /* bind all other panel links */
    $("#panels").on(clickEvent, "a.panel_link", function(e){
        e.preventDefault();

        var nextPanel = $(e.target.hash);
        loadContentForPanel(nextPanel);
        transition(nextPanel, "push");
    });

    /* bind back button click event */
    $("#panels").on(clickEvent, ".back", function(e){
        /* find the last panel in history, and transition to it, if possible */
        e.preventDefault();
        var lastPanel = visits.back();
        if(lastPanel) {
            //TODO: Load content for panel here?
            transition(lastPanel, "push", true);
        }
    });

    //TODO: Comment on event delegation here
    $(document).on(clickEvent, ".logout_link", function(e){
        e.preventDefault();

        $.ajax({
            type: "DELETE",
            url: "/session",
            dataType: "json",
            success: function(response, status, jqXHR){
                if(jqXHR.status == "200"){
                    showNotification("Logged out successfully!");
                    visits.clear();
                    hideTabBar();
                    loadContentForPanel($("#login_panel"));
                    transition($("#login_panel"), "crossfade");
                }
            }
        })
    });
}

function attachFormSubmissionHandlers(){
    $("form[name=new_post_form]").submit(function(e){
        e.preventDefault();
        var form = $(this);
        var data = JSON.stringify(form.jsonizeForm());

        $.ajax({
            type: "POST",
            url: "/link",
            contentType: "application/json",
            data: data,
            dataType: "json",
            success: function(response, statusText, jqXHR){
                if(jqXHR.status == "200"){
                    showNotification("Link posted!");
                    form.clearForm();
                    visits.clear();
                    loadContentForPanel($("#feed_panel"));
                    transition($("#feed_panel"), "crossfade");
                }
            }
        });
    });

    //TODO: This should probably be a PUT not a POST
    $("form[name=create_account_form]").submit(function(e){
        e.preventDefault();
        var form = $(this);
        var formObj = form.jsonizeForm();

        if( $(".geolocation_checkbox input", form).is(":checked")){
            showSpinner();

            getLocation(function(position){
                hideSpinner();

                var location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                }

                formObj.location = location;
                var data = JSON.stringify(formObj);
                sendCreateAccountRequest(data, form);
                
            }, function(){
                hideSpinner();
                showNotification("Couldn't obtain location", "bad");
            }, function(){
                hideSpinner();
                showNotification("Your device doesn't support geolocation", "bad");
            });

        } else {

            var data = JSON.stringify(form.jsonizeForm());
            sendCreateAccountRequest(data, form);
        }
    });

    $("form[name=login_form]").submit(function(e){
        e.preventDefault();
        var form = $(this);
        var data = JSON.stringify(form.jsonizeForm());

        $.ajax({
            type: "POST",
            url: "/session",
            contentType: "application/json",
            data: data,
            dataType: "json",
            success: function(response, status, jqXHR){
                if(jqXHR.status == "200"){
                    //Probably don't need to show a message here
                    visits.clear();
                    showTabBar();
                    loadContentForPanel($("#feed_panel"));
                    transition($("#feed_panel"), "crossfade");
                }
            },
            complete: function(jqXHR, statusText){
                form.clearForm(["username"]);
            }
        });
    });
}

function attachVoteHandlers(){
    /* Need to attach this handler to the #feed_panel and have .upvote delegate
     * to it because .upvote doesn't exist on page load
     */
    $(document).on(clickEvent, ".upvote", function(e){
        e.preventDefault();
        var id = $(this).closest(".link_post").data().id;
        voteOnLink(id, 1);
    });

    /* Need to attach this handler to the #feed_panel and have .downvote 
     * delegate to it because .downvote doesn't exist on page load
     */
    $(document).on(clickEvent, ".downvote", function(e){
        e.preventDefault();
        var id = $(this).closest(".link_post").data().id;
        voteOnLink(id, -1);
    });
}

/* ---------- PRIMARY UI FUNCTIONS ------------------------------------------ */

/* Transitions to a new app panel using the specified animation name, and
 * (if needed) updates the tab bar to be consistent with what's displayed.
 * Also takes care of back/forward logic/animations via the history object
 */
function transition(toPanel, type, reverse) {
    var toPanel = $(toPanel)
    var fromPanel = $("#panels .current");
    reverse = reverse ? "reverse" : "";

    /* if toPanel is already the current panel, or toPanel is same as fromPanel,
     * don't do anything
     */
    if(toPanel.hasClass("current") || toPanel === fromPanel){
        return;
    }

    /* if this panel has a tab bar button, update it */
    if(toPanel.hasClass("tab_bar_panel")){
        /* not yet sure if ill need this for styling reasons */
        //$("#tab_bar").attr("class", e.target.hash.slice(1));

        /* remove selected class from all tabs... */
        $("#tab_bar li").each(function(){
            $(this).removeClass("tab_selected");
        })

        /* ..and add it back to the one that was just clicked */
        $("#tab_bar a[href=#" + toPanel.attr("id") + "]").parent().addClass("tab_selected");
    }

    /* if the panel wants us to clear history, clear history */
    if(toPanel.hasClass("clear_history")){
        /* reset visit history on new tab */
        visits.clear();
    }

    /* add the new panel to our visit history */
    visits.add(toPanel);

    if(visits.hasBack()){
        toPanel.find(".back").addClass("hasBack");
    }

    toPanel
        .addClass("current " + type + " in " + reverse)
        .one ("webkitAnimationEnd", function(){
            fromPanel.removeClass("current " + type + " out " + reverse);
            toPanel.removeClass(type + " in " + reverse);
        });
        fromPanel.addClass(type + " out " + reverse);

    // for non webkit browsers
    if(!("WebKitTransitionEvent" in window)){
        toPanel.addClass("current");
        fromPanel.removeClass("current");
        return;
    }
}

/* Fetches data for the nextPanel, renders it into a handlebars template, and 
 * places it into the DOM
 */
function loadContentForPanel(nextPanel){
    var panelToLoad = nextPanel.attr("id");
    var loadTarget;
    var html;

    switch(panelToLoad){
        case "feed_panel":
            var links;

            $.ajax({
                type: "GET",
                url: "/link",
                dataType: "json",
                data: {"num": 20 }, //TODO: Make this a parameter
                success: function(response, status, jqXHR){
                    if(jqXHR.status == "200"){
                        // Probably don't need to show success message here
                        html = getHTML("link_posts_template", response.links);
                        loadTarget = nextPanel.find(".content_wrapper");
                        loadTarget.html(html);

                        /* init timeago */
                        $(".timeago").timeago();
                        /* NOTE: we could actually just do this on the server
                         * and send back the timeago string but then we'd lose
                         * the nifty autoupdating that timeago does if you do it
                         * clientside
                         */
                    }
                }
            });

            break;
        case "profile_panel":
            $.ajax({
                type: "GET",
                url: "/user",
                dataType: "json",
                data: {"num": 3}, //TODO: Make this a parameter
                success: function(response, status, jqXHR){
                    if(jqXHR.status == "200"){
                        // Probably don't need to show a success message here
                        html = getHTML("user_profile_template", response.info);
                        loadTarget = nextPanel.find(".profile_content");
                        loadTarget.html(html);
                    }
                }
            });

            break;
        default:
            console.log(panelToLoad + ": no data to load");
    }
}

/* ---------- GEOLOCATION --------------------------------------------------- */

/* A wrapper for getCurrentPosition which defines geolocation options, and has
 * a little bit more utility when it comes to error handling and such
 */
function getLocation(success_callback, error_callback, not_supported_callback){

    var geolocation_options = {
        timeout: 10000
    }

    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(success_callback, 
            error_callback, geolocation_options);
    } else {
        if(not_supported_callback){
            not_supported_callback();
        } else {
            showNotification("Your device doesn't support geolocation", "bad");
        }
    }
}

/* ---------- HISTORY ------------------------------------------------------- */

var visits = {
    history: [],
    add: function(panel) {
        this.history.push(panel);
    },
    hasBack: function() {
        return this.history.length > 1;
    },
    back: function() {
        if(!this.hasBack()){
            return;
        }
        var curPage = this.history.pop();
        return this.history.pop();
    },
    clear: function() {
        this.history = [];
    }
}

/* ---------- NOTIFICATIONS ------------------------------------------------- */

function showNotification(msg, type){

    // queue up a notification
    $(document).queue("notificationsQueue", function(){
        type = type ? type : "good";

        var notif = $(".notif.notif_" + type);
        $(".notif_content", notif).html(msg);
        notif.addClass("show_notif");

        setTimeout(function(){
            notif.removeClass("show_notif");
        }, 3000);

        /*
         * these operations under a longer setTimeout to give time for the
         * previous notification to CSS transition back to it's hidden state
         */
        setTimeout(function(){
            // remove this notification from the queue
            $(document).queue("notificationsQueue").shift();

            // see if there is stuff left in the queue
            if($(document).queue("notificationsQueue").length > 0){
                // if so, run it
                $(document).queue("notificationsQueue")[0]();
            }
        }, 3500);
    });

    // if the queue only has one notification in it, run it immediately
    if($(document).queue("notificationsQueue").length == 1){
        $(document).queue("notificationsQueue")[0]();
    }

}

/* ---------- SPINNER ------------------------------------------------------- */

$(document).bind("ajaxSend", function(){
    if(connected){
        showSpinner();
    }
}).bind("ajaxComplete", function(){
    hideSpinner();
});

function showSpinner(){
    $(".spinner").show();
}

function hideSpinner(){
    $(".spinner").hide();
}

/* ---------- APP CONNECTION STATE ------------------------------------------ */

function setAppConnected(){
    connected = true;
    $(".disconnected").hide();
}

function setAppDisconnected(){
    /* If already disconnected, pop the disconnected label to remind the user
     * that they are disconnected! 
     */
    if(!connected){
        $(".disconnected").addClass("pop");
        setTimeout(function(){
            $(".disconnected").removeClass("pop");
        }, 100);
    }

    connected = false;
    $(".disconnected").show();
}

/* ---------- OTHER UI UTILITY FUNCTIONS ------------------------------------ */

function showTabBar(){
    $("#tab_bar").addClass("tab_bar_show");
}

function hideTabBar(){
    $("#tab_bar").removeClass("tab_bar_show");
}

function updateLinkAppearance(id, vote, score){
    var link = $(".link_post[data-id=" + id +"]");

    link.removeClass("upvoted downvoted");

    if(vote > 0){
        link.addClass("upvoted");
    } else if (vote < 0){
        link.addClass("downvoted");
    }

    $(".score", link).html(score);
}

/* ---------- AJAX ERROR HANDLER -------------------------------------------- */

// TODO: The logic here can probably be reorganized */
function handleAjaxError(jqXHR, textStatus, errorThrown){

    /* Attempt to parse out a returned error message */
    try {
        var errorMsg = $.parseJSON(jqXHR.responseText).message;
    } catch (err) {
        // do nothing
    }

    /* If the server returned an error message, show a notif with it */
    if(errorMsg !== undefined){
        /* if the server returned an error message, we can also safely
         * assume that we're connected again
         */
        setAppConnected();
        showNotification(errorMsg, "bad");
    } else { /* ...if not, see why the error occurred */
        if(textStatus == "timeout"){
            /* if it was a timeout just display a message saying so */
            setAppConnected();
            var errorMsg = "Connection timeout";
        } else {

            /* If it's a 404, 0 or 502, it means that either our server is down 
             * or the client is disconnected from the internet. In this 
             * case, we don't want to keep spamming them with error 
             * messages, we just want to put the app in a "disconnected" 
             * state.
             */
            if((jqXHR.status == 404) || (jqXHR.status == 0) || (jqXHR.status == 502)){

                var errorMsg = "Couldn't reach server (error " + jqXHR.status + ")";

                /* if the app still thinks we're connected, show one
                 * error message and set us to disconnected. This should
                 * run the *first* time an error occurs, but not
                 * subsequently until we've had at least one ajaxSuccess
                 */
                if(connected){
                    showNotification(errorMsg, "bad");
                }

                setAppDisconnected();
            } else {
                /* if not, create an error message with w/e the error was */
                setAppConnected();
                var errorMsg = jqXHR.status + ": " + errorThrown
            }
        }

        /* Again, as long as we're connected, feel free to show
         * whatever the error message is
         */
        if(connected){
            showNotification(errorMsg, "bad");
        }

    }

}

/* ---------- AJAX HELPERS -------------------------------------------------- */

/* Helper function for the create account form submission handler */
function sendCreateAccountRequest(data, form){

    $.ajax({
        type: "POST",
        url: "/user",
        contentType: "application/json",
        data: data,
        dataType: "json",
        success: function(response, statusText, jqXHR){
            if(jqXHR.status == "200"){
                showNotification("Account created!");
                form.clearForm();
                //TODO: Auto-login and go to feed panel instead?
                transition($("#login_panel"), "push", true);
            }
        }
    });
}

/* Helper function for the vote handlers */
function voteOnLink(linkID, voteType){
    var obj = {
        id: linkID,
        vote: voteType
    }

    var data = JSON.stringify(obj);

    $.ajax({
        type: "PUT",
        url: "/link",
        contentType: "application/json",
        dataType: "json",
        data: data,
        success: function(response, status, jqXHR){
            if(jqXHR.status == "200"){
                //Probably don't need to show a success message here
                updateLinkAppearance(linkID, response.vote, response.score);
            }
        }
    });
}

/* ---------- HANDLEBARS NONSENSE ------------------------------------------- */

/* templates that are called in *other* templates must be registered with
 * Handlebars as partials
 */
function registerHandlebarsPartials(){
    Handlebars.registerPartial("link", $("#link_template").html());
}

/* Helper function to compile and render a handlebars template into html */
function getHTML(templateID, context){
    var source = $("#" + templateID).html();
    var template = Handlebars.compile(source);
    var html = template(context);
    return html;
}

/* Given the vote attr of the link object, determines the correct class to add
 * to the existing upvote/downvote links
 */
Handlebars.registerHelper('voteClass', function(vote) {
  if(vote == 1){
    return "upvoted"
  } else if (vote == -1){
    return "downvoted"
  } else {
    return ""
  }
});

/* Given a location object, return a url to a static map of that location
 * (using the Google Maps static maps API)
 */
Handlebars.registerHelper("getMapUrl", function(location){
    return "http://maps.googleapis.com/maps/api/staticmap?center=" 
           + location.lat +"," + location.lon
           + "&zoom=11"
           + "&size=400x300"
           + "&sensor=false"
           + "&markers=" 
               + "color:0x019BC6" + "%7C"
               + "label:You" + "%7C" + 
               + location.lat + "," + location.lon;
});

/* Given a url, return the domain associated with that url. This method uses
 * jquery to create a link element with the href set as the url, then takes
 * advantage of the browsers built-in url parser to get the hostname back out
 */
Handlebars.registerHelper("getDomain", function(url){
    return $("<a>").prop("href", url).prop("hostname");
});

/* ---------- OTHER UTILS --------------------------------------------------- */

/* Given a form object, returns a stringified JSON object of all form elements
 * with name attributes. There are lots of ways to accomplish this, and this
 * one isn't perfect, but it seems good enough for our purposes
 */
(function ($) {
    jQuery.fn.jsonizeForm = function(){
        var obj = {};
        var form = this[0];
        $(form.elements).each(function(){
            if(this.name){
                obj[this.name] = $(this).val();
            }
        });
        return obj;
    }
}(jQuery));

/* Given a form object, iterates through all it's elements, and clears them,
 * provided they are not in the array of exceptions
 */
(function ($) {
    jQuery.fn.clearForm = function(exceptions){
        var form = this[0];
        exceptions = exceptions instanceof Array ? exceptions : []; 
        $(form.elements).each(function(){
            if(exceptions.indexOf(this.name) < 0){
                $(this).val("");
            }
        });
        return $(form);
    }
}(jQuery));