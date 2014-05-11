/**
 * Created by chenshj on 14-2-8.
 */
(function($) {
    "use strict";
    var initMaps = [
        {role: 'dropdown', widget: 'dropdown'},
        {role: 'page', widget: 'page'},
        {role: 'tab', widget: 'tab'},
        {role: 'listview', widget: 'listview'},
        {role: 'scroll', widget: 'scroll'},
        {role: 'datetime', widget: 'datetime'},
        {role: 'select', widget: 'select'},
        {role: 'switch', widget: 'switch'},
        {role: 'radio', widget: 'radio'},
        {role: 'checkbox', widget: 'checkbox'},
        {role: 'nav', widget: 'nav'},
        {role: 'aside', widget: 'aside'}
    ];

    $(function() {
        $.each(initMaps, function(index, initConfig) {
            var widgetName = initConfig.widget;
            if ($.fn[widgetName]) {
                $("[data-role='" + initConfig.role + "']")[widgetName]();
            }
        });
    });

})(window['jQuery']);