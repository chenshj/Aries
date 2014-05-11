/**
 * Created by chenshj on 2014/5/4.
 */
(function(gsp, $) {
    'use strict';
    gsp.module('EmployeeList').view('Main', function() {
        return {
            render: function() {

            },

            onInitializing: function() {

            },

            initWidgets: function() {

            },

            afterWidgetsInit: function() {

            },

            onInitialized: function() {
                this.context.invoke({target: 'EmployeeListController', methodName: 'onLoad'});
            }
        };
    });
})(window.gsp, window.jQuery);