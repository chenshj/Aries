(function($, aries) {
    'use strict';
    // TODO consider queueing navigation activity until previous activities have completed
    //      so that end users don't have to think about it. Punting for now
    // TODO !! move the event bindings into callbacks on the navigate event
    aries.navigate = function(url, data, noEvents) {
        aries.navigate.navigator.go(url, data, noEvents);
    };

    // expose the history on the navigate method in anticipation of full integration with
    // existing navigation functionalty that is tightly coupled to the history information
    aries.navigate.history = new aries.History();

    // instantiate an instance of the navigator for use within the $.navigate method
    aries.navigate.navigator = new aries.Navigator(aries.navigate.history);

    var loc = aries.path.parseLocation();
    aries.navigate.history.add(loc.href, {hash: loc.hash});
})(jQuery, window.aries);
