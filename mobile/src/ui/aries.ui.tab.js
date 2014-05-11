/**
 * Created by chenshj on 14-1-30.
 */
(function($, aries) {
    "use strict";

    aries.ui('aries.ui.tab', aries.ui.Default, {

        role: 'tab',

        options: {
            fill: false
        },

        _create: function() {
        },

        activate: function(element, container, callback) {
            var $active = container.find('> .active'),
                transition = callback && $.support.transition && $active.hasClass('fade');

            function next () {
                $active.removeClass('active')
                    .find('> .dropdown-menu > .active')
                    .removeClass('active');

                element.addClass('active');

                if (transition) {
                    //element[0].offsetWidth // reflow for transition
                    element.addClass('in');
                } else {
                    element.removeClass('fade');
                }

                if (element.parent('.dropdown-menu')) {
                    element.closest('li.dropdown').addClass('active');
                }

                if (callback) {
                    callback();
                }
            }

            if (transition) {
                $active.one($.support.transition.end, next).emulateTransitionEnd(150);
            }
            else {
                next();
            }

            $active.removeClass('in');
        },

        show: function() {
            var $this = this.element,
                $ul = $this.closest('ul:not(.dropdown-menu)'),
                selector = $this.data('target'),
                previous,
                e,
                $target;

            if (!selector) {
                selector = $this.attr('href');
                selector = selector && selector.replace(/.*(?=#[^\s]*$)/, ''); //strip for ie7
            }

            if ($this.parent('li').hasClass('active')) {
                return;
            }

            previous = $ul.find('.active:last a')[0];
            e = $.Event('show.bs.tab', {
                relatedTarget: previous
            });

            $this.trigger(e);

            if (e.isDefaultPrevented()) {
                return;
            }

            $target = $(selector);

            this.activate($this.parent('li'), $ul);
            this.activate($target, $target.parent(), function() {
                $this.trigger({
                    type: 'shown.bs.tab', relatedTarget: previous
                });
            });
        }

    });

})(jQuery, window.aries);