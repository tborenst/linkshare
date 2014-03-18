Modernizr.addTest('standalone', function(){
    return window.navigator.standalone;
});

if(navigator.standalone != undefined && !!!navigator.standalone){
    // TODO: show notification telling users to install app as standalone
    return;
}

$(document).ready(function(){
    /* bind tab change links */
    $("#tab_bar a").click(function(e){
        e.preventDefault();

        var nextPanel = $(e.target.hash);

        /* fetch data for whatever page we're loading */
        loadContentForPanel(nextPanel);
        transition(nextPanel, "crossfade");
    });

    /* bind all other panel links */
    $("#panels").on("click", "a.panel_link", function(e){
        e.preventDefault();

        var nextPanel = $(e.target.hash);
        transition(nextPanel, "push");
    });

    /* bind back button click event */
    $("#panels").on("click", ".back", function(e){
        /* find the last panel in history, and transition to it, if possible */
        e.preventDefault();
        var lastPanel = visits.back();
        if(lastPanel) {
            transition(lastPanel, "push", true);
        }
    });

    $("form[name=new_post_form]").submit(function(e){
        e.preventDefault();
        var form = $(this);
        var data = form.jsonSerializeForm();

        $.ajax({
            type: "POST",
            url: "/link",
            contentType: "application/json",
            data: data,
            dataType: "json",
            success: function(response, statusText, jqXHR){
                if(jqXHR.status == "200"){
                    console.log(response);
                    showNotification("Link posted!");
                    form.clearForm();
                    visits.clear();
                    loadContentForPanel($("#feed_panel"));
                    transition($("#feed_panel"), "crossfade");
                }
            },
            error: function(jqXHR, exception){
                var errorMsg = $.parseJSON(jqXHR.responseText).message;
                console.log(errorMsg);
                showNotification(errorMsg, "bad");
            }
        });
    });

    $("form[name=create_account_form]").submit(function(e){
        e.preventDefault();
        var data = $(this).jsonSerializeForm();

        $.ajax({
            type: "POST",
            url: "/user",
            contentType: "application/json",
            data: data,
            dataType: "json",
            success: function(response, statusText, jqXHR){
                if(jqXHR.status == "200"){
                    console.log(response);
                    showNotification("Account created!");
                    //TODO: Auto-login and go to feed panel instead?
                    transition($("#login_panel"), "push", true);
                }
            },
            error: function(jqXHR, exception){
                var errorMsg = $.parseJSON(jqXHR.responseText).message;
                console.log(errorMsg);
                showNotification(errorMsg, "bad"); 
            }
        });
    });

    $("form[name=login_form]").submit(function(e){
        e.preventDefault();
        var data = $(this).jsonSerializeForm();

        $.ajax({
            type: "POST",
            url: "/session",
            contentType: "application/json",
            data: data,
            dataType: "json",
            success: function(response, status, jqXHR){
                console.log(jqXHR);
                if(jqXHR.status == "200"){
                    console.log(response.message);
                    showNotification("Logged in successfully!")
                    visits.clear();
                    showTabBar();
                    loadContentForPanel($("#feed_panel"));
                    transition($("#feed_panel"), "crossfade");
                }
            },
            error: function(jqXHR, exception){
                var errorMsg = $.parseJSON(jqXHR.responseText).message;
                console.log(errorMsg);
                showNotification(errorMsg, "bad");
            }
        });
    })


    //TODO: detect if user already logged in and go straight to feed?
    loadContentForPanel($("#login_panel"));
    visits.add($("#login_panel"));

});

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

/* a load function to simulate responses from a server */
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
                        console.log(response.message);
                        //TODO: Show success message
                        html = getHTML("link_posts_template", response.links);
                        loadTarget = nextPanel.find(".content_wrapper");
                        loadTarget.html(html);
                    }
                },
                error: function(jqXHR, exception){
                    var errorMsg = $.parseJSON(jqXHR.responseText).message;
                    console.log(errorMsg);
                    //TODO: Show error message
                }
            });

            break;
        default:
            console.log("no data to load");
    }
}

function showTabBar(){
    $("#tab_bar").addClass("tab_bar_show");
}

function hideTabBar(){
    $("#tab_bar").removeClass("tab_bar_show");
}


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

// TODO Handle case where multiple notifications need to be queued
function showNotification(msg, type){
    type = type ? type : "good";

    var notif = $(".notif.notif_" + type);
    console.log(notif);
    $(".notif_content", notif).html(msg);
    notif.addClass("show_notif");
    setTimeout(function(){
        notif.removeClass("show_notif");
    }, 3000)
}

/* ---------- HANDLEBARS NONSENSE ------------------------------------------- */

/* Helper function to compile and render a handlebars template into html */
function getHTML(templateID, context){
    var source = $("#" + templateID).html();
    var template = Handlebars.compile(source);
    var html = template(context);
    return html;
}

/* ---------- DATA ---------------------------------------------------------- */

/* SAMPLE DATA FOR FRONT-END TESTING, NOT INTENDED FOR PRODUCTION USE */

var LinkShare = {
    posts: [
    ]
};

/* ---------- OTHER UTILS --------------------------------------------------- */

/* Given a form object, returns a stringified JSON object of all form elements
 * with name attributes. There are lots of ways to accomplish this, and this
 * one isn't perfect, but it seems good enough for our purposes
 */
(function ($) {
    jQuery.fn.jsonSerializeForm = function(){
        var obj = {};
        var form = this[0];
        $(form.elements).each(function(){
            if(this.name){
                obj[this.name] = $(this).val();
            }
        });
        return JSON.stringify(obj);
    }
}(jQuery));

(function ($) {
    jQuery.fn.clearForm = function(){
        var form = this[0];
        $(form.elements).each(function(){
            $(this).val("");
        });
        return $(form);
    }
}(jQuery));