(function($, aries) {
    'use strict';
    // thx Modernizr
    function propExists (prop) {
        var uc_prop = prop.charAt(0).toUpperCase() + prop.substr(1),
            props = ( prop + " " + vendors.join(uc_prop + " ") + uc_prop ).split(" "),
            v;

        for (v in props) {
            if (fbCSS[ props[ v ] ] !== undefined) {
                return true;
            }
        }
    }

    var fakeBody = $("<body>").prependTo("html"),
        fbCSS = fakeBody[ 0 ].style,
        vendors = [ "Webkit", "Moz", "O" ],
        webos = "palmGetResource" in window, //only used to rule out scrollTop
        opera = window.opera,
        operamini = window.operamini && ({}).toString.call(window.operamini) === "[object OperaMini]",
        bb = window.blackberry && !propExists("-webkit-transform"); //only used to rule out box shadow, as it's filled opaque on BB 5 and lower

    function validStyle (prop, value, check_vend) {
        var div = document.createElement("div"),
            uc = function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1);
            },
            vend_pref = function(vend) {
                if (vend === "") {
                    return "";
                } else {
                    return  "-" + vend.charAt(0).toLowerCase() + vend.substr(1) + "-";
                }
            },
            check_style = function(vend) {
                var vend_prop = vend_pref(vend) + prop + ": " + value + ";",
                    uc_vend = uc(vend),
                    propStyle = uc_vend + ( uc_vend === "" ? prop : uc(prop) );

                div.setAttribute("style", vend_prop);

                if (!!div.style[ propStyle ]) {
                    ret = true;
                }
            },
            check_vends = check_vend ? check_vend : vendors,
            i, ret;

        for (i = 0; i < check_vends.length; i++) {
            check_style(check_vends[i]);
        }
        return !!ret;
    }

    // inline SVG support test
    function inlineSVG () {
        // Thanks Modernizr & Erik Dahlstrom
        var w = window,
            svg = !!w.document.createElementNS && !!w.document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGRect && !( w.opera && navigator.userAgent.indexOf("Chrome") === -1 ),
            support = function(data) {
                if (!( data && svg )) {
                    $("html").addClass("ui-nosvg");
                }
            },
            img = new w.Image();

        img.onerror = function() {
            support(false);
        };
        img.onload = function() {
            support(img.width === 1 && img.height === 1);
        };
        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    }

    function transform3dTest () {
        var mqProp = "transform-3d",
        // Because the `translate3d` test below throws false positives in Android:
            ret = aries.media("(-" + vendors.join("-" + mqProp + "),(-") + "-" + mqProp + "),(" + mqProp + ")"),
            el, transforms, t;

        if (ret) {
            return !!ret;
        }

        el = document.createElement("div");
        transforms = {
            // We’re omitting Opera for the time being; MS uses unprefixed.
            "MozTransform": "-moz-transform",
            "transform": "transform"
        };

        fakeBody.append(el);

        for (t in transforms) {
            if (el.style[ t ] !== undefined) {
                el.style[ t ] = "translate3d( 100px, 1px, 1px )";
                ret = window.getComputedStyle(el).getPropertyValue(transforms[ t ]);
            }
        }
        return ( !!ret && ret !== "none" );
    }

    // Test for dynamic-updating base tag support ( allows us to avoid href,src attr rewriting )
    function baseTagTest () {
        var fauxBase = location.protocol + "//" + location.host + location.pathname + "ui-dir/",
            base = $("head base"),
            fauxEle = null,
            href = "",
            link, rebase;

        if (!base.length) {
            base = fauxEle = $("<base>", { "href": fauxBase }).appendTo("head");
        } else {
            href = base.attr("href");
        }

        link = $("<a href='testurl' />").prependTo(fakeBody);
        rebase = link[ 0 ].href;
        base[ 0 ].href = href || location.pathname;

        if (fauxEle) {
            fauxEle.remove();
        }
        return rebase.indexOf(fauxBase) === 0;
    }

    // Thanks Modernizr
    function cssPointerEventsTest () {
        var element = document.createElement("x"),
            documentElement = document.documentElement,
            getComputedStyle = window.getComputedStyle,
            supports;

        if (!( "pointerEvents" in element.style )) {
            return false;
        }

        element.style.pointerEvents = "auto";
        element.style.pointerEvents = "x";
        documentElement.appendChild(element);
        supports = getComputedStyle &&
            getComputedStyle(element, "").pointerEvents === "auto";
        documentElement.removeChild(element);
        return !!supports;
    }

    function boundingRect () {
        var div = document.createElement("div");
        return typeof div.getBoundingClientRect !== "undefined";
    }

    // non-UA-based IE version check by James Padolsey, modified by jdalton - from http://gist.github.com/527683
    // allows for inclusion of IE 6+, including Windows Mobile 7
    $.extend(aries, { browser: {} });
    aries.browser.oldIE = (function() {
        var v = 3,
            div = document.createElement("div"),
            a = div.all || [];

        do {
            div.innerHTML = "<!--[if gt IE " + ( ++v ) + "]><br><![endif]-->";
        } while (a[0]);

        return v > 4 ? v : !v;
    })();

    function fixedPosition () {
        var w = window,
            ua = navigator.userAgent,
            platform = navigator.platform,
        // Rendering engine is Webkit, and capture major version
            wkmatch = ua.match(/AppleWebKit\/([0-9]+)/),
            wkversion = !!wkmatch && wkmatch[ 1 ],
            ffmatch = ua.match(/Fennec\/([0-9]+)/),
            ffversion = !!ffmatch && ffmatch[ 1 ],
            operammobilematch = ua.match(/Opera Mobi\/([0-9]+)/),
            omversion = !!operammobilematch && operammobilematch[ 1 ];

        if (
        // iOS 4.3 and older : Platform is iPhone/Pad/Touch and Webkit version is less than 534 (ios5)
            ( ( platform.indexOf("iPhone") > -1 || platform.indexOf("iPad") > -1 || platform.indexOf("iPod") > -1 ) && wkversion && wkversion < 534 ) ||
            // Opera Mini
            ( w.operamini && ({}).toString.call(w.operamini) === "[object OperaMini]" ) ||
            ( operammobilematch && omversion < 7458 ) ||
            //Android lte 2.1: Platform is Android and Webkit version is less than 533 (Android 2.2)
            ( ua.indexOf("Android") > -1 && wkversion && wkversion < 533 ) ||
            // Firefox Mobile before 6.0 -
            ( ffversion && ffversion < 6 ) ||
            // WebOS less than 3
            ( "palmGetResource" in window && wkversion && wkversion < 534 ) ||
            // MeeGo
            ( ua.indexOf("MeeGo") > -1 && ua.indexOf("NokiaBrowser/8.5.0") > -1 )) {
            return false;
        }

        return true;
    }

    $.extend($.support, {
        cssTransitions: "WebKitTransitionEvent" in window ||
            validStyle("transition", "height 100ms linear", [ "Webkit", "Moz", "" ]) && !aries.browser.oldIE && !opera,

        // Note, Chrome for iOS has an extremely quirky implementation of popstate.
        // We've chosen to take the shortest path to a bug fix here for issue #5426
        // See the following link for information about the regex chosen
        // https://developers.google.com/chrome/mobile/docs/user-agent#chrome_for_ios_user-agent
        pushState: "pushState" in history &&
            "replaceState" in history &&
            // When running inside a FF iframe, calling replaceState causes an error
            !( window.navigator.userAgent.indexOf("Firefox") >= 0 && window.top !== window ) &&
            ( window.navigator.userAgent.search(/CriOS/) === -1 ),

        mediaquery: aries.media("only all"),
        cssPseudoElement: !!propExists("content"),
        touchOverflow: !!propExists("overflowScrolling"),
        cssTransform3d: transform3dTest(),
        cssAnimations: !!propExists("animationName"),
        boxShadow: !!propExists("boxShadow") && !bb,
        fixedPosition: fixedPosition(),
        scrollTop: ("pageXOffset" in window ||
            "scrollTop" in document.documentElement ||
            "scrollTop" in fakeBody[ 0 ]) && !webos && !operamini,

        dynamicBaseTag: baseTagTest(),
        cssPointerEvents: cssPointerEventsTest(),
        boundingRect: boundingRect(),
        inlineSVG: inlineSVG
    });

    fakeBody.remove();

    // Support conditions that must be met in order to proceed
    // default enhanced qualifications are media query support OR IE 7+
    aries.gradeA = function() {
        return (($.support.mediaquery && $.support.cssPseudoElement) || aries.browser.oldIE && aries.browser.oldIE >= 8 ) &&
            ( $.support.boundingRect || $.fn.jquery.match(/1\.[0-7+]\.[0-9+]?/) !== null );
    };

    // For ruling out shadows via css
    if (!$.support.boxShadow) {
        $("html").addClass("ui-noboxshadow");
    }

})(jQuery, window.aries);