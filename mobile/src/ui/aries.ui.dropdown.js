/**
 * Created by chenshj on 14-1-29.
 */
(function($) {
    "use strict";

    var aries = window.aries,
        backdrop = '.dropdown-backdrop',
        toggle = '[data-toggle=dropdown]';

    function getParent ($this) {
        var selector = $this.attr('data-target');

        if (!selector) {
            selector = $this.attr('href');
            selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, ''); //strip for ie7
        }

        var $parent = selector && $(selector);

        return $parent && $parent.length ? $parent : $this.parent();
    }

    aries.ui('aries.ui.dropdown', {

        options: {

        },

        classes: {

        },

        events: {

        },

        _create: function() {
            this.element.addClass('dropdown-toggle')
                .on('click.bs.dropdown', $.proxy(this.toggle, this));
            aries.document.on('click.bs.dropdown.data-api', $.proxy(this.clearMenus, this));
        },

        clearMenus: function() {
            $(backdrop).remove();

            var e, $parent = getParent(this.element);

            if (!$parent.hasClass('open'))
                return;

            $parent.trigger(e = $.Event('hide.bs.dropdown'));
            if (e.isDefaultPrevented())
                return;
            $parent.removeClass('open').trigger('hidden.bs.dropdown')

        },

        toggle: function() {
            var $parent, $this = this.element,
                isActive, showEvent;

            if ($this.is('.disabled, :disabled'))
                return;

            $parent = getParent($this);
            isActive = $parent.hasClass('open');

            this.clearMenus();

            if (!isActive) {
                if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
                    // if mobile we use a backdrop because click events don't delegate
                    $('<div class="dropdown-backdrop"/>').insertAfter($this).on('click', $.proxy(this.clearMenus, this));
                }

                showEvent = $.Event('show.bs.dropdown');
                $parent.trigger(showEvent);

                if (showEvent.isDefaultPrevented())
                    return;

                $parent.toggleClass('open').trigger('shown.bs.dropdown');

                $this.focus();
            }
            return false;
        }
    });

})(jQuery);