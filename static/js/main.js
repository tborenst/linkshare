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

        var next_panel = $(e.target.hash);

        /* fetch data for whatever page we're loading */
        load_content(next_panel);

        transition(next_panel, "crossfade");
    });

    /* bind all other panel links */
    $("#panels").on("click", "a.panel_link", function(e){
        e.preventDefault();

        var next_panel = $(e.target.hash);
        transition(next_panel, "push");
    });

    /* bind back button click event */
    $("#panels").on("click", ".back", function(e){
        /* find the last panel in history, and transition to it, if possible */
        e.preventDefault();
        var last_panel = visits.back();
        if(last_panel) {
            transition(last_panel, "push", true);
        }
    });

    load_content($("#feed_panel"));

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
function load_content(next_panel){
    var panel_to_load = next_panel.attr("id");
    var load_target;
    var content;

    switch(panel_to_load){
        case "feed_panel":
            content = get_html("link_posts_template", LinkShare.posts);
            console.log("content", content);
            load_target = next_panel.find(".content_wrapper");
            break;
        default:
            console.log("no data to load");
    }

    if(content){
        $(load_target).html(content);
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
function get_html(templateID, context){
    var source = $("#" + templateID).html();
    var template = Handlebars.compile(source);
    var html = template(context);
    return html;
}

/* ---------- DATA ---------------------------------------------------------- */

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
    ]
}