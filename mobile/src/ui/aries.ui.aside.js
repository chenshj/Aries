/**
 * Created by chenshj on 14-3-25.
 */
(function($, aries) {
    'use strict';
    aries.ui('aside', aries.ui.Default, {
        role: 'aside',

        options: {
            collapseIcon: 'fa-arrow-circle-left',

            showIcon: 'fa-arrow-circle-right',

            miniWidth: '48px',

            fullWidth: '220px'
        },

        _create: function() {
            var self = this;
            this.element.append('<span id="minify" class="minifyme"><i class="fa fa-arrow-circle-left hit"></i></span>');
            this.minify = this.element.find('#minify').click(function() {
                return self.minify.data('collapsed') ? self.showAside.call(self) : self.collapseAside.call(self);
            });
            this.collapseableElements = this.element.find('.menu-item-parent,.collapse-sign');
            this.options.fullWidth = this.element.width();
        },

        collapseAside: function() {
            var options = this.options,
                collapseIcon = options.collapseIcon,
                showIcon = options.showIcon;
            this.minify.data('collapsed', true).find('i').removeClass(collapseIcon).addClass(showIcon);
            this.collapseableElements.hide();
            this.element.width(options.miniWidth);
        },

        showAside: function() {
            var options = this.options,
                collapseIcon = options.collapseIcon,
                showIcon = options.showIcon;
            this.minify.data('collapsed', false).find('i').removeClass(showIcon).addClass(collapseIcon);
            this.collapseableElements.show();
            this.element.width(options.fullWidth);
        }
    });

})(window['jQuery'], window.aries);