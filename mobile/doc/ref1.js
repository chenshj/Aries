KISSY.add("utils/tool", function(a) {
    function b () {
        return "webkitTransition" in document.body.style ||
            "MozTransition" in document.body.style ||
            "msTransition" in document.body.style ||
            "oTransition" in document.body.style;
    }

    function c () {
        return a.UA.ie && a.UA.ie < 7 ? !0 : !1;
    }

    function d () {
        return a.UA.mobile ? !0 : !1;
    }

    function e () {
        return a.UA.ipad ? !0 : !1;
    }

    function f () {
        return a.UA.ios ? !0 : !1;
    }

    function g () {
        return a.UA.android ? !0 : !1;
    }

    var h = a.Node.all,
        i = {
            isCSS3Support: b(),
            isMobile: d(),
            isAndroid: g(),
            isIos: f(),
            isIpad: e(),
            isIE6: c(),
            initCxt: function() {
                var a = this, b = h("html");
                a.isCSS3Support ? b.addClass("ks-css3") : b.addClass("ks-not-css3"), a.isMobile && b.addClass("ks-mobile")
            },
            browserUpdate: function() {
                var a = this;
                a.isIE6 && alert("\u6dd8\u5b9dUED\u535a\u5ba2\u5e76\u672a\u9488\u5bf9\u4f4e\u7248\u672c\u6d4f\u89c8\u5668\u505a\u517c\u5bb9\uff0c\u4e3a\u4e86\u66f4\u597d\u7684\u4f53\u9a8c\uff0c\u8bf7\u5347\u7ea7\u60a8\u7684\u6d4f\u89c8\u5668\uff01")
            },
            promot: function(b) {
                var c = this, d = h("#J_Promot");
                d.length || (d = h('<div id="J_Promot" class="promot"><span class="promot-bd"></span></div>'), h("body").append(d));
                var e = d.one(".promot-bd");
                e.html(b), c.blinkIn(d, "promot-show"), a.later(function() {
                    c.blinkOut(d, "promot-show")
                }, 3e3)
            },
            blinkIn: function(b, c) {
                var d = this;
                d.isCSS3Support ? (b.show(), a.later(function() {
                    b.addClass(c)
                }, 20)) : b.fadeIn(.3)
            },
            blinkOut: function(b, c) {
                var d = this;
                d.isCSS3Support ? (b.removeClass(c), a.later(function() {
                    b.hide()
                }, 300)) : b.fadeOut(.3)
            }
        };
    return i;
}, {requires: ["core"]}),
    KISSY.add("public/page/mods/main", function(a, b) {
        function c () {
            var a = this;
            a.init();
        }

        var d = a.Node.all, e = "like-posts";
        return c.prototype = {
            isInit: null,
            navNode: null,
            labelNode: null,
            backTopNode: null,
            loginNode: null,
            init: function() {
                var a = this;
                b.browserUpdate(),
                    b.initCxt(),
                    a.initCxt(),
                    a.watchWindow(),
                    a.addEvent(),
                    a.dropDownNav(),
                    a.initLikedPosts();
            },
            initCxt: function() {
                var a = this;
                a.isInit = !1, a.navNode = d("#J_Nav"), a.labelNode = d("#J_NavLabel"), a.backTopNode = d("#J_BackTop"), a.loginNode = d("#J_Login")
            },
            getLikedPosts: function() {
                var b = a.Cookie.get(e);
                return b ? postArr = b.split("@") : null
            },
            setLikedPost: function(b) {
                var c = a.Cookie.get(e), d = "@" + b + "@";
                return a.isUndefined(c) ? (a.Cookie.set(e, d, 365), void 0) : (-1 == c.indexOf(d) && (c += b + "@"), a.Cookie.set(e, c, 365), void 0)
            },
            initLikedPosts: function() {
                var a = this, b = a.getLikedPosts();
                if (b)
                    for (var c = 0; c < b.length; c++)
                        if (!isNaN(parseInt(b[c]))) {
                            var e = d(".post-" + b[c]);
                            e.length && e.all(".like").addClass("liked")
                        }
                a.isInit = !0
            },
            menuHover: function(b) {
                var c = this;
                if (b) {
                    var d = c.navNode.one("#menu-primary").offset().top,
                        e = b.offset().top - d;
                    "none" == c.labelNode.css("display") ? c.labelNode.css("top", e).show() :
                        (a.Anim.stop(c.labelNode, !1, !1, "topAnim"), new a.Anim(c.labelNode, {top: e}, {duration: .2, easing: "ease-out", queue: "topAnim", useTransition: !0}).run())
                } else
                    c.labelNode.fadeOut(.3)
            },
            resetLabel: function() {
                var b = this, c = b.navNode.one(".current-menu-item"), d = b.navNode.one("#menu-primary").offset().top;
                if (a.Anim.stop(b.labelNode, !0, !1, "topAnim"), c) {
                    var e = c.offset().top - d;
                    b.labelNode.css("top", e).fadeIn(.3)
                } else
                    b.labelNode.fadeOut(.3)
            },
            dropDownNav: function() {
                var b = this, c = parseInt(b.navNode.css("top"));
                d("body").hasClass("home") ? c > 0 ? (b.navNode.show(), b.resetLabel()) : (b.navNode.css("top", "-500px").show(), new a.Anim(b.navNode, {top: parseInt(d("body").offset().top)}, {duration: 1, easing: "easeOutStrong", queue: "topAnim", complete: function() {
                    b.resetLabel()
                }}).run()) : b.resetLabel()
            },
            windowChangeCB: function() {
                var c = this, e = document.documentElement && document.documentElement.scrollTop || document.body.scrollTop;
                if (e > 500 ? c.backTopNode.fadeIn(.3) : c.backTopNode.fadeOut(.3), !b.isMobile) {
                    var f = (d("body").offset().top, c.navNode.outerHeight()), g = d("#content").outerHeight(), h = g - f - 100;
                    e >= h ? c.navNode.hasClass("nav-abs") || (c.navNode.addClass("nav-abs"), a.Anim.stop(c.navNode, !0, !1, "topAnim"), h = 0 > h ? 0 : h, c.navNode.css("top", h)) : c.navNode.hasClass("nav-abs") && (c.navNode.removeClass("nav-abs"), c.navNode.css("top", "auto"))
                }
            },
            watchWindow: function() {
                var a = this;
                d(window).on("scroll resize", function() {
                    a.windowChangeCB()
                }), a.windowChangeCB()
            },
            addEvent: function() {
                var c = this, e = c.loginNode.one(".J_LoginEntry");
                e && (e.on("click", function(b) {
                    b.stopPropagation();
                    var d = c.loginNode.one(".J_FormWrapper");
                    a.Anim.stop(d, !0, !0), d.slideToggle(.3)
                }), d("body").on("mousedown", function(b) {
                    if (!d(b.target).parent("#J_Login")) {
                        var e = c.loginNode.one(".J_FormWrapper");
                        a.Anim.stop(e, !0, !0), e.slideUp(.3)
                    }
                })), b.isMobile ? c.backTopNode.all("a").on("tap", function() {
                    window.scrollTo(window.scrollX, 0)
                }) : (d("#menu-primary").all("li").on("mouseover", function(a) {
                    a.stopPropagation(), c.menuHover(d(this))
                }), d("#menu-primary").on("mouseleave", function() {
                    c.menuHover(c.navNode.one(".current-menu-item"))
                }), c.backTopNode.all("a").on("click", function() {
                    return new a.Anim(window, {scrollTop: 0}, {duration: 1, easing: "easeOutStrong", queue: "scrollTopAnim"}).run(), !1
                })), d("#J_MoreLink").on("click", function() {
                    var a = d(this), b = d("#J_LinksWrapper");
                    b.hasClass("closed") ? (a.html("^^"), b.removeClass("closed")) : (a.html("MORE..."), b.addClass("closed"))
                }), d(".post").all(".like").on("click", function() {
                    var a = d(this);
                    c.likePost(a)
                })
            },
            likePost: function(c) {
                var e = this;
                if (!e.isInit)
                    return b.promot("\u6b63\u5728\u521d\u59cb\u5316\uff0c\u8bf7\u7a0d\u5019\u518d\u8bd5\uff01"), !1;
                if (c.hasClass("liked") || c.hasClass("liking"))
                    return !1;
                c.addClass("liking");
                var f = c.parent(".post").attr("data-id"), g = d("#J_Home").val(), h = {action: "likePost", postId: f};
                return a.io({url: g, type: "GET", data: h, timeout: 10, dataType: "json", success: function(a) {
                    if (a.status) {
                        e.setLikedPost(a.postId), c.removeClass("liking").addClass("liked");
                        var d = c.one("em");
                        d ? d.html(a.likeCount) : c.html(a.likeCount)
                    } else
                        c.removeClass("liking"), b.promot(a.msg)
                }, error: function() {
                    c.removeClass("liking"), b.promot("\u64cd\u4f5c\u5931\u8d25\uff0c\u8bf7\u7a0d\u5019\u518d\u8bd5\uff01")
                }}), !1
            }},
            c
    }, {requires: ["utils/tool", "core"]}),
    KISSY.config({
        combine: !0,
        packages: {"public": {base: "./wp-content/themes/taobaoued/assets/build/pages/public/", charset: "utf-8"}}}),
    KISSY.add("public/page/init", function(a, b) {
        a.ready(function() {
            new b
        })
    }, {requires: ["./mods/main"]}),
    KISSY.use("public/page/init");
