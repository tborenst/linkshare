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

        /* reset visit history on new tab */
        visits.clear();

        /* not yet sure if ill need this for styling reasons */
        $("#tab_bar").attr("class", e.target.hash.slice(1));

        /* remove selected class from all tabs... */
        $("#tab_bar li").each(function(){
            $(this).removeClass("tab_selected");
        })

        /* ..and add it back to the one that was just clicked */
        $(e.target).parent().addClass("tab_selected");

        var nextPanel = $(e.target.hash);

        /* fetch data for whatever page we're loading */
        loadContent(nextPanel);

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
        var data = $(this).jsonSerializeForm();
        //TODO: Submit data to server
    });

    //TODO: detect if user already logged in and go straight to feed?
    loadContent($("#login_panel"));

});

function transition(toPanel, type, reverse) {
    var toPanel = $(toPanel)
    var fromPanel = $("#panels .current");
    reverse = reverse ? "reverse" : "";

    visits.add(toPanel);

    if(visits.hasBack()){
        toPanel.find(".back").addClass("hasBack");
    }

    if(toPanel.hasClass("current") || toPanel === fromPanel){
        return;
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
function loadContent(nextPanel){
    var panelToLoad = nextPanel.attr("id");
    var loadTarget;
    var content;

    switch(panelToLoad){
        case "feed_panel":
            content = getHTML("link_posts_template", LinkShare.posts);
            loadTarget = nextPanel.find(".content_wrapper");
            break;
        default:
            console.log("no data to load");
    }

    if(content){
        $(loadTarget).html(content);
    }
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
    posts: [{
        title: "Bouncer fights off gunman",
        url: "i.imgur.com",
        dateStr: "10:24 PM",
        username: "tomer",
        score: 4178
    },
    {
        title: "GTA IV with mods... super photo-realistic",
        url: "i.imgur.com",
        dateStr: "10:17 PM",
        username: "HuntingPandas",
        score: 2186
    },
    {
        title: "The cutest puppy came in my work last night.",
        url: "i.imgur.com",
        dateStr: "8:45 PM",
        username: "t",
        score: 278
    },
    {
        title: "Bouncer fights off gunman",
        url: "i.imgur.com",
        dateStr: "10:24 PM",
        username: "tomer",
        score: 4178
    },
    {
        title: "GTA IV with mods... super photo-realistic",
        url: "i.imgur.com",
        dateStr: "10:17 PM",
        username: "HuntingPandas",
        score: 2186
    },
    {
        title: "The cutest puppy came in my work last night.",
        url: "i.imgur.com",
        dateStr: "8:45 PM",
        username: "t",
        score: 278
    },
    {
        title: "Bouncer fights off gunman",
        url: "i.imgur.com",
        dateStr: "10:24 PM",
        username: "tomer",
        score: 4178
    },
    {
        title: "GTA IV with mods... super photo-realistic",
        url: "i.imgur.com",
        dateStr: "10:17 PM",
        username: "HuntingPandas",
        score: 2186
    },
    {
        title: "The cutest puppy came in my work last night.",
        url: "i.imgur.com",
        dateStr: "8:45 PM",
        username: "t",
        score: 278
    },
    {
        title: "Bouncer fights off gunman",
        url: "i.imgur.com",
        dateStr: "10:24 PM",
        username: "tomer",
        score: 4178
    },
    {
        title: "GTA IV with mods... super photo-realistic",
        url: "i.imgur.com",
        dateStr: "10:17 PM",
        username: "HuntingPandas",
        score: 2186
    },
    {
        title: "The cutest puppy came in my work last night.",
        url: "i.imgur.com",
        dateStr: "8:45 PM",
        username: "t",
        score: 278
    },
    {
        title: "Bouncer fights off gunman",
        url: "i.imgur.com",
        dateStr: "10:24 PM",
        username: "tomer",
        score: 4178
    },
    {
        title: "GTA IV with mods... super photo-realistic",
        url: "i.imgur.com",
        dateStr: "10:17 PM",
        username: "HuntingPandas",
        score: 2186
    },
    {
        title: "The cutest puppy came in my work last night.",
        url: "i.imgur.com",
        dateStr: "8:45 PM",
        username: "t",
        score: 278
    },
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