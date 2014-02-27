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

        var nextPage = $(e.target.hash);
        transition(nextPage, "crossfade");
    });

    /* bind all other panel links */
    $("#panels").on("click", "a.panel_link", function(e){
        e.preventDefault();

        var nextPage = $(e.target.hash);
        transition(nextPage, "push");
    });

    /* bind back button click event */
    $("#panels").on("click", ".back", function(e){
        /* find the last panel in history, and transition to it, if possible */
        e.preventDefault();
        var lastPage = visits.back();
        if(lastPage) {
            transition(lastPage, "push", true);
        }
    });

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
        .one("webkitAnimationEnd", function(){
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