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
        loadContentForPanel(nextPanel);
        transition(nextPanel, "push");
    });

    /* bind back button click event */
    $("#panels").on("click", ".back", function(e){
        /* find the last panel in history, and transition to it, if possible */
        e.preventDefault();
        var lastPanel = visits.back();
        if(lastPanel) {
            //TODO: Load content for panel here?
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
                    showNotification("Link posted!");
                    form.clearForm();
                    visits.clear();
                    loadContentForPanel($("#feed_panel"));
                    transition($("#feed_panel"), "crossfade");
                }
            },
            error: function(jqXHR, exception){
                var errorMsg = $.parseJSON(jqXHR.responseText).message;
                showNotification(errorMsg, "bad");
            }
        });
    });

    //TODO: This should probably be a PUT not a POST
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
                    showNotification("Account created!");
                    //TODO: Auto-login and go to feed panel instead?
                    transition($("#login_panel"), "push", true);
                }
            },
            error: function(jqXHR, exception){
                var errorMsg = $.parseJSON(jqXHR.responseText).message;
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
                if(jqXHR.status == "200"){
                    showNotification("Logged in successfully!")
                    visits.clear();
                    showTabBar();
                    loadContentForPanel($("#feed_panel"));
                    transition($("#feed_panel"), "crossfade");
                }
            },
            error: function(jqXHR, exception){
                var errorMsg = $.parseJSON(jqXHR.responseText).message;
                showNotification(errorMsg, "bad");
            }
        });
    });

    //TODO: Change this to touchstart
    $(".logout_link").on("click", function(e){
        e.preventDefault();

        $.ajax({
            type: "DELETE",
            url: "/session",
            dataTabe: "json",
            success: function(response, status, jqXHR){
                if(jqXHR.status == "200"){
                    showNotification("Logged out successfully!");
                    visits.clear();
                    hideTabBar();
                    loadContentForPanel($("#login_panel"));
                    transition($("#login_panel"), "crossfade");
                }
            },
            error: function(jqXHR, exception){
                var errorMsg = $.parseJSON(jqXHR.responseText).message;
                showNotification(errorMsg, "bad");
            }
        })
    });

    //TODO: Change this to touchstart
    /* Need to attach this handler to the #feed_panel and have .upvote delegate
     * to it because .upvote doesn't exist on page load
     */
    $("#feed_panel").on("click", ".upvote", function(e){
        e.preventDefault();
        var id = $(this).closest(".link_post").data().id;
        voteOnLink(id, 1);
    });

    //TODO: Change this to touchstart
    /* Need to attach this handler to the #feed_panel and have .downvote 
     * delegate to it because .downvote doesn't exist on page load
     */
    $("#feed_panel").on("click", ".downvote", function(e){
        e.preventDefault();
        var id = $(this).closest(".link_post").data().id;
        voteOnLink(id, -1);
    });


    //TODO: detect if user already logged in and go straight to feed?
    loadContentForPanel($("#login_panel"));
    visits.add($("#login_panel"));

});

//TODO: This should probably be a POST, not a PUT
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
            console.log(response);
            if(jqXHR.status == "200"){
                showNotification("Link voted on");
                //TODO: change class on upvote/downvote arrows
            }
        },
        error: function(jqXHR, exception){
            var errorMsg = $.parseJSON(jqXHR.responseText).message;
            showNotification(errorMsg, "bad");
        }

    });
}

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
                        // Probably don't need to show success message here
                        console.log(response.links);
                        html = getHTML("link_posts_template", response.links);
                        loadTarget = nextPanel.find(".content_wrapper");
                        loadTarget.html(html);
                    }
                },
                error: function(jqXHR, exception){
                    var errorMsg = $.parseJSON(jqXHR.responseText).message;
                    showNotification(errorMsg, "bad");
                }
            });

            break;
        default:
            console.log(panelToLoad + ": no data to load");
    }
}

function showTabBar(){
    $("#tab_bar").addClass("tab_bar_show");
}

function hideTabBar(){
    $("#tab_bar").removeClass("tab_bar_show");
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

// TODO Handle case where multiple notifications need to be queued
function showNotification(msg, type){
    type = type ? type : "good";

    var notif = $(".notif.notif_" + type);
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

/* Given a form object, iterates through all it's elements, and clears them */
(function ($) {
    jQuery.fn.clearForm = function(){
        var form = this[0];
        $(form.elements).each(function(){
            $(this).val("");
        });
        return $(form);
    }
}(jQuery));