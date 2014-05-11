/**
 * Created by chenshj on 14-1-27.
 */
(function($, aries) {
    "use strict";
    aries.ui('aries.ui.page', aries.ui.Default, {

        initSelector: '[data-role="page"]',

        events: {
            pageBeforeCreate: 'pageBeforeCreate',
            init: 'init'
        },

        _create: function() {
            // 如果返回值为False，则取消page创建。
            if (this.element.trigger(this.events.pageBeforeCreate) === false) {
                return;
            }

            this.contentElement = this.element.children('[data-role="content"]');

            if (this.contentElement.data('scrollable')) {
                this.contentElement.scroll({click: true});
            }
        },

        _init: function() {
            this._super();
            this.element.enhanceWithin()
                .trigger(this.events.init);
        }
    });

})(window.jQuery, window.aries);