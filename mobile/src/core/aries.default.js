/**
 * Created by chenshj on 14-1-28.
 */
(function($) {
    'use strict';
    var aries = window.aries = window.aries || {};

    $.extend(aries, {
        activePageClass: 'page-active',

        // Automatically load and show pages based on location.hash
        hashListeningEnabled: true,

        window: $(window),

        document: $(document),

        // disable the alteration of the dynamic base tag or links in the case
        // that a dynamic base tag isn't supported
        dynamicBaseEnabled: true,

        // Deprecated and no longer used in 1.4 remove in 1.5
        // Define the url parameter used for referencing widget-generated sub-pages.
        // Translates to example.html&ui-page=subpageIdentifier
        // hash segment before &ui-page= is used to make Ajax request
        subPageUrlKey: "ui-page",

        hideUrlBar: true,

        // Keepnative Selector
        keepNative: ":jqmData(role='none'), :jqmData(role='nojs')",

        // Automatically handle clicks and form submissions through Ajax, when same-domain
        ajaxEnabled: true,

        // disable to prevent jquery from bothering with links
        linkBindingEnabled: true,

        // Set default page transition - 'none' for no transitions
        defaultPageTransition: "slide",

        // Set maximum window width for transitions to apply - 'false' for no limit
        maxTransitionWidth: false,

        // Error response message - appears when an Ajax page request fails
        pageLoadErrorMessage: "Error Loading Page",

        // replace calls to window.history.back with phonegaps navigation helper
        // where it is provided on the window object
        phonegapNavigationEnabled: false,

        //automatically initialize the DOM when it's ready
        autoInitializePage: true,

        pushStateEnabled: true,

        // allows users to opt in to ignoring content by marking a parent element as
        // data-ignored
        ignoreContentEnabled: false,

        // default the property to remove dependency on assignment in init module
        pageContainer: $(),

        //enable cross-domain page support
        allowCrossDomainPages: false
    });

    $.extend(aries, {
        getClosestBaseUrl: function(ele) {
            // Find the closest page and extract out its url.
            var url = $(ele).closest(".page").data("url"),
                base = aries.path.documentBase.hrefNoHash;

            if (!aries.dynamicBaseEnabled || !url || !aries.path.isPath(url)) {
                url = base;
            }

            return aries.path.makeUrlAbsolute(url, base);
        },

        //direct focus to the page title, or otherwise first focusable element
        focusPage: function(page) {
            var autofocus = page.find("[autofocus]"),
                pageTitle = page.find(".ui-title:eq(0)");

            if (autofocus.length) {
                autofocus.focus();
                return;
            }

            if (pageTitle.length) {
                pageTitle.focus();
            } else {
                page.focus();
            }
        },

        // TODO 实现loading
        loading: function() {
            return {};
        },

        enhanceWithin: function() {

        }
    });

    $.fn.extend({
        /**
         *  初始化子元素插件
         * @returns {*}
         */
        enhanceWithin: function() {
            var self = this, widgetElements = {}, widgetName;
            $.each(aries.ui, function(name, constructor) {
                var initSelector = constructor.prototype.initSelector,
                    elements;
                // If initSelector not false find elements
                if (initSelector) {

                    // Filter elements that should not be enhanced based on parents
                    elements = self.find(initSelector);

                    // Enhance whatever is left
                    if (elements.length > 0) {
                        widgetElements[constructor.prototype.uiName] = elements;
                    }
                }
            });

            for (widgetName in widgetElements) {
                if (widgetElements.hasOwnProperty(widgetName)) {
                    widgetElements[widgetName][widgetName]();
                }
            }
            return this;
        }
    });

    aries.changePage = function(to, options) {
        aries.pageContainer.pagecontainer("change", to, options);
    };

    //animation complete callback
    $.fn.animationComplete = function(callback) {
        if ($.support.cssTransitions) {
            return $(this).one("webkitAnimationEnd animationend", callback);
        }
        else {
            // defer execution for consistency between webkit/non webkit
            setTimeout(callback, 0);
            return $(this);
        }
    };
})(jQuery);