(function($, undefined) {

    // existing base tag?
    var baseElement = $("head").children("base"),

    // base element management, defined depending on dynamic base tag support
    // TODO move to external widget
        base = {

            // define base element, for use in routing asset urls that are referenced
            // in Ajax-requested markup
            element: ( baseElement.length ? baseElement :
                $("<base>", { href: aries.path.documentBase.hrefNoHash }).prependTo($("head")) ),

            linkSelector: "[src], link[href], a[rel='external'], [ajax='false'], a[target]",

            // set the generated BASE element's href to a new page's base path
            set: function(href) {

                // we should do nothing if the user wants to manage their url base
                // manually
                if (!aries.dynamicBaseEnabled) {
                    return;
                }

                // we should use the base tag if we can manipulate it dynamically
                if (aries.support.dynamicBaseTag) {
                    base.element.attr("href",
                        aries.path.makeUrlAbsolute(href, aries.path.documentBase));
                }
            },

            rewrite: function(href, page) {
                var newPath = aries.path.get(href);

                page.find(base.linkSelector).each(function(i, link) {
                    var thisAttr = $(link).is("[href]") ? "href" :
                            $(link).is("[src]") ? "src" : "action",
                        thisUrl = $(link).attr(thisAttr);

                    // XXX_jblas: We need to fix this so that it removes the document
                    //            base URL, and then prepends with the new page URL.
                    // if full path exists and is same, chop it - helps IE out
                    thisUrl = thisUrl.replace(location.protocol + "//" +
                        location.host + location.pathname, "");

                    if (!/^(\w+:|#|\/)/.test(thisUrl)) {
                        $(link).attr(thisAttr, newPath + thisUrl);
                    }
                });
            },

            // set the generated BASE element's href to a new page's base path
            reset: function(/* href */) {
                base.element.attr("href", aries.path.documentBase.hrefNoSearch);
            }
        };

    aries.base = base;

})(jQuery);