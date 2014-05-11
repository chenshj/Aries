/**
 * Created by chenshj on 2014/4/3.
 */
(function($, aries) {
    'use strict';
    $(document).on('click.checkbox.data-api', '[data-toggle^=checkbox], .checkbox', function(e) {
        var $checkbox = $(e.target);
        if (e.target.tagName !== "A") {
            if (e && e.preventDefault()) {
                e.stopPropagation();
            }

            if (!$checkbox.hasClass('checkbox')) {
                $checkbox = $checkbox.closest('.checkbox');
            }
            $checkbox.find(':checkbox').checkbox('toggle');
        }
    });

    aries.ui('aries.ui.checkbox', aries.ui.Default, {

        options: {
            template: '<span class="icons"><span class="first-icon fa fa-square-o"></span><span class="second-icon fa fa-check-square-o"></span></span>'
        },

        _create: function() {
            this.element.before(this.options.template);
            this.setState();
        },

        setState: function() {
            var $element = this.element,
                $parent = $element.closest('.checkbox');

            if ($element.prop('disabled')) {
                $parent.addClass('disabled');
            }

            if ($element.prop('checked')) {
                $parent.addClass('checked');
            }
        },

        toggle: function() {
            var ch = 'checked',
                $element = this.element,
                $parent = $element.closest('.checkbox'),
                checked = $element.prop(ch),
                e = $.Event('toggle');
            if ($element.prop('disabled') === false) {
                if ($parent.toggleClass(ch) && checked) {
                    $element.removeAttr(ch);
                }
                else {
                    $element.prop(ch, ch);
                }
                $element.trigger(e).trigger('change');
            }
        },

        setCheck: function(option) {
            var //d = 'disabled',
                ch = 'checked',
                $element = this.element,
                $parent = $element.closest('.checkbox'),
                checkAction = (option === 'check'),
                e = $.Event(option);

            if ($parent[checkAction ? 'addClass' : 'removeClass' ](ch) && checkAction) {
                $element.prop(ch, ch);
            }
            else {
                $element.removeAttr(ch);
            }
            $element.trigger(e).trigger('change');
        }
    });
})(jQuery, window['aries']);