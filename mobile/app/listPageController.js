/**
 * Created by chenshj on 2014/5/4.
 */
(function(gsp, ko) {
    'use strict';
    gsp.module('EmployeeList').controller('EmployeeListController', function() {
        return {
            onLoad: function() {
                var EmployeeModel = this.context.model('Employee'),
                    self = this;
                ko.applyBindings(EmployeeModel.getData(), document.body);
                $('#listview1').listview('refresh');
                //                EmployeeModel.getData()
                //                    .then(function(result) {
                //                        ko.applyBindings(result.data, document.body);
                //                    });
            }
        };
    });
})(window.gsp, window.ko);