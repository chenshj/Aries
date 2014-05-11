/**
 * Created by chenshj on 2014/4/3.
 */
(function($, aries) {
    'use strict';

    $(document).on('click.radio.data-api', '[data-toggle^=radio], .radio', function(e) {
        var $radio = $(e.target);
        if (e && e.preventDefault()) {
            e.stopPropagation();
        }
        if (!$radio.hasClass('radio')) {
            $radio = $radio.closest('.radio');
        }
        $radio.find(':radio').radio('toggle');
    });

    aries.ui('aries.ui.radio', aries.ui.Default, {

        options: {
            template: '<span class="icons"><span class="first-icon fa fa-circle-o"></span><span class="second-icon fa fa-dot-circle-o"></span></span>'
        },

        _create: function() {
            this.element.before(this.options.template);
            this.setState();
        },

        setState: function() {
            var $element = this.element,
                $parent = $element.closest('.radio');

            if ($element.prop('disabled')) {
                $parent.addClass('disabled');
            }
            if ($element.prop('checked')) {
                $parent.addClass('checked');
            }
        },

        toggle: function() {
            var d = 'disabled',
                ch = 'checked',
                $element = this.element,
                checked = $element.prop(ch),
                $parent = $element.closest('.radio'),
                $parentWrap = $element.closest('form').length ? $element.closest('form') : $element.closest('body'),
                $radioGroup = $parentWrap.find(':radio[name="' + $element.attr('name') + '"]'),
                e = $.Event('toggle');

            $radioGroup.not($element).each(function() {
                var $radio = $(this);

                if ($radio.prop(d) === false) {
                    $radio.closest('.radio').removeClass(ch);
                    $radio.removeAttr(ch).trigger('change');
                }
            });

            if ($element.prop(d) === false) {
                if (checked === false) {
                    $parent.addClass(ch);
                    $element.prop(ch, true);
                }
                $element.trigger(e);

                if (checked !== $element.prop(ch)) {
                    $element.trigger('change');
                }
            }
        },

        setCheck: function(option) {
            var ch = 'checked' ,
                $element = this.element,
                $parent = $element.closest('.radio'),
                checkAction = (option === 'check'),
                checked = $element.prop(ch),
                $parentWrap = $element.closest('form').length ? $element.closest('form') : $element.closest('body'),
                $radioGroup = $parentWrap.find(':radio[name="' + $element['attr']('name') + '"]'),
                e = $.Event(option);

            $radioGroup.not($element).each(function() {
                var $radio = $(this);

                if ($parent.removeClass(ch)) {
                    $radio.closest('.radio').removeAttr(ch);
                }
            });

            if ($parent[checkAction ? 'addClass' : 'removeClass'](ch) && checkAction) {
                $element.prop(ch, ch);
            }
            else {
                $element.removeAttr(ch);
            }
            $element.trigger(e);

            if (checked !== $element.prop(ch)) {
                $element.trigger('change');
            }
        }
    });
})(jQuery, window['aries']);