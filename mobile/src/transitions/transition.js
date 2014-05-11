(function($, aries, undefined) {
    'use strict';
    aries.undefined = undefined;

    function Transition () {
        this.init.apply(this, arguments);
    }

    $.extend(Transition.prototype, {
        toPreClass: " ui-page-pre-in",

        init: function(name, reverse, $to, $from) {
            $.extend(this, {
                name: name,
                reverse: reverse,
                $to: $to,
                $from: $from,
                deferred: new $.Deferred()
            });
        },

        cleanFrom: function() {
            this.$from.removeClass(aries.activePageClass + " out in reverse " + this.name)
                .height("");
        },

        beforeDoneIn: $.noop,

        beforeDoneOut: $.noop,

        beforeStartOut: function(screenHeight, reverseClass, none) {
        },

        doneIn: function() {
            this.beforeDoneIn();

            this.$to.removeClass("out in reverse " + this.name).height("");

            this.toggleViewportClass();

            // 在某些浏览器中（iOS5），迁移过程中的3D变换会阻碍滚动条滚动到期望
            // 的位置。这里确保如果我们不在期望的位置时，可以在迁移后跳转到那里。
            if (aries.window.scrollTop() !== this.toScroll) {
                this.scrollPage();
            }
            if (!this.sequential) {
                this.$to.addClass(aries.activePageClass);
            }
            this.deferred.resolve(this.name, this.reverse, this.$to, this.$from, true);
        },

        doneOut: function(screenHeight, reverseClass, none, preventFocus) {
            this.beforeDoneOut();
            this.startIn(screenHeight, reverseClass, none, preventFocus);
        },

        hideIn: function(callback) {
            // Prevent flickering in phonegap container: see comments at #4024 regarding iOS
            this.$to.css("z-index", -10);
            callback.call(this);
            this.$to.css("z-index", "");
        },

        scrollPage: function() {
            // By using scrollTo instead of silentScroll, we can keep things better in order
            // Just to be precautios, disable scrollstart listening like silentScroll would
            $.event.special.scrollstart.enabled = false;
            //if we are hiding the url bar or the page was previously scrolled scroll to hide or return to position
            if (aries.hideUrlBar || this.toScroll !== aries.defaultHomeScroll) {
                window.scrollTo(0, this.toScroll);
            }

            // reenable scrollstart listening like silentScroll would
            setTimeout(function() {
                $.event.special.scrollstart.enabled = true;
            }, 150);
        },

        startIn: function(screenHeight, reverseClass, none, preventFocus) {
            this.hideIn(function() {
                this.$to.addClass(aries.activePageClass + this.toPreClass);

                // Send focus to page as it is now display: block
                if (!preventFocus) {
                    aries.focusPage(this.$to);
                }

                // Set to page height
                //this.$to.height(screenHeight + this.toScroll);

                if (!none) {
                    this.scrollPage();
                }
            });

            if (!none) {
                this.$to.animationComplete($.proxy(function() {
                    this.doneIn();
                }, this));
            }

            this.$to.removeClass(this.toPreClass)
                .addClass(this.name + " in " + reverseClass);

            if (none) {
                this.doneIn();
            }

        },

        startOut: function(screenHeight, reverseClass, none) {
            this.beforeStartOut(screenHeight, reverseClass, none);

            // Set the from page's height and start it transitioning out
            // Note: setting an explicit height helps eliminate tiling in the transitions
            this.$from
                //.height(screenHeight + aries.window.scrollTop())
                .addClass(this.name + " out" + reverseClass);
        },

        toggleViewportClass: function() {
            aries.pageContainer.toggleClass("ui-mobile-viewport-transitioning viewport-" + this.name);
        },

        transition: function() {
            // NOTE many of these could be calculated/recorded in the constructor, it's my
            //      opinion that binding them as late as possible has value with regards to
            //      better transitions with fewer bugs. Ie, it's not guaranteed that the
            //      object will be created and transition will be run immediately after as
            //      it is today. So we wait until transition is invoked to gather the following
            var reverseClass = this.reverse ? " reverse" : "",
                screenHeight = (window.innerHeight || aries.window.height()),
                maxTransitionOverride = aries.maxTransitionWidth !== false && aries.window.width() > aries.maxTransitionWidth,
                none = !$.support.cssTransitions || !$.support.cssAnimations || maxTransitionOverride || !this.name || this.name === "none" || Math.max(aries.window.scrollTop(), this.toScroll) > aries.getMaxScrollForTransition();

            this.toScroll = aries.navigate.history.getActive().lastScroll || aries.defaultHomeScroll;
            this.toggleViewportClass();

            if (this.$from && !none) {
                this.startOut(screenHeight, reverseClass, none);
            } else {
                this.doneOut(screenHeight, reverseClass, none, true);
            }

            return this.deferred.promise();
        }
    });

    function ConcurrentTransition () {
        this.init.apply(this, arguments);
    }

    $.extend(ConcurrentTransition.prototype, Transition.prototype, {
        sequential: false,

        beforeDoneIn: function() {
            if (this.$from) {
                this.cleanFrom();
            }
        },

        beforeStartOut: function(screenHeight, reverseClass, none) {
            this.doneOut(screenHeight, reverseClass, none);
        }
    });

    function SerialTransition () {
        this.init.apply(this, arguments);
    }

    $.extend(SerialTransition.prototype, Transition.prototype, {
        sequential: true,

        beforeDoneOut: function() {
            if (this.$from) {
                this.cleanFrom();
            }
        },

        beforeStartOut: function(screenHeight, reverseClass, none) {
            this.$from.animationComplete($.proxy(function() {
                this.doneOut(screenHeight, reverseClass, none);
            }, this));
        }
    });

    // 迁移方式字典，可供扩展第三方迁移。
    aries.transitionHandlers = {
        "sequential": SerialTransition,
        "simultaneous": ConcurrentTransition,
        "slide": ConcurrentTransition
    };

    // 默认迁移方式为序列迁移。
    aries.defaultTransitionHandler = SerialTransition;

    aries.transitionFallbacks = {
        flip: 'fade',
        flow: 'fade',
        pop: 'fade',
        slide: 'fade',
        slidedown: 'fade',
        slideup: 'fade',
        turn: 'fade'
    };

    // 定义了迁移之后，检查是否支持CSS 3D变换，如果不支持，
    // 检查后被迁移中是否存在备选方案，如果存在使用备选方案。
    aries._maybeDegradeTransition = function(transition) {
        if (transition && !$.support.cssTransform3d && aries.transitionFallbacks[transition]) {
            transition = aries.transitionFallbacks[transition];
        }
        return transition;
    };

    // generate the handlers from the above
    var defaultGetMaxScrollForTransition = function() {
        return (window.innerHeight || aries.window.height()) * 3;
    };
    // Set the getMaxScrollForTransition to default if no implementation was set by user
    aries.getMaxScrollForTransition = aries.getMaxScrollForTransition || defaultGetMaxScrollForTransition;
})(jQuery, window.aries);
