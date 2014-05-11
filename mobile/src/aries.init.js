(function($, aries) {
    'use strict';
    $.extend(aries, {
        /**
         * 在DOM中查找并初始化page插件，同时切换到第一个page。
         */
        initializePage: function() {
            var path = aries.path,
                $pages = $("[data-role='page']"),
                hash = path.stripHash(path.stripQueryParams(path.parseLocation().hash)),
                hashPage = document.getElementById(hash);

            // 如果未找到标记为page的插件，在body内创建一个默认page。
            if (!$pages.length) {
                $pages = $("body").wrapInner("<div data-role='page'></div>").children(0);
            }

            $pages.each(function() {
                var $this = $(this);
                // unless the data url is already set set it to the pathname
                if (!$this[0].getAttribute("data-url")) {
                    $this.attr("data-url", $this.attr("id") || location.pathname + location.search);
                }
            });

            // define first page in dom case one backs out to the directory root
            // (not always the first page visited, but defined as fallback)
            aries.firstPage = $pages.first();

            // define page container
            aries.pageContainer = aries.firstPage.parent()
                .addClass("ui-mobile-viewport").pagecontainer();

            // if hash change listening is disabled, there's no hash deep link,
            // the hash is not valid (contains more than one # or does not start with #)
            // or there is no page with that hash, change to the first page in the DOM
            // Remember, however, that the hash can also be a path!
            if (!( aries.hashListeningEnabled && aries.path.isHashValid(location.hash) &&
                ($(hashPage).is("[data-role='page']") || aries.path.isPath(hash)))) {
                // Store the initial destination
                if (aries.path.isHashValid(location.hash)) {
                    aries.navigate.history.initialDst = hash.replace("#", "");
                }
                // make sure to set initial pop state state if it exists
                // so that navigation back to the initial page works properly
                if ($.event.special.navigate.isPushStateEnabled()) {
                    aries.navigate.navigator.squash(path.parseLocation().href);
                }

                aries.changePage(aries.firstPage, {
                    transition: "none",
                    reverse: true,
                    changeHash: false,
                    fromHashChange: true
                });
            } else {
                // trigger hash change or navigate to squash and record the correct
                // history entry for an initial hash path
                if (!$.event.special.navigate.isPushStateEnabled()) {
                    $(window).trigger("hashchange", [true]);
                } else {
                    // TODO figure out how to simplify this interaction with the initial history entry
                    // at the bottom js/navigate/navigate.js
                    aries.navigate.history.stack = [];
                    aries.navigate(aries.path.isPath(location.hash) ? location.hash : location.href);
                }
            }
        }
    });

    //dom-ready inits
    if (aries.autoInitializePage) {
        aries.initializePage();
    }

}(jQuery, window.aries));
