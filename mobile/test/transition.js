/**
 * Created by chenshj on 14-1-27.
 */
(function() {
    'use strict';
    var aries = window.aries;

    function log (message) {
        $('#log').append(message).append('<br>');
        window.console.log(message);
    }

    $('#listview1').on('click', function(event, sender) {
        aries.changePage($('#page2'));
    });

    $('#page2content  .tab-content').on('click', function(event, sender) {
        aries.changePage('page.html');
    });

    $('#page1')
        .on('pageBeforeCreate', function() {
            log('before page1 create.');
        })
        .on('pageCreate', function() {
            log('page1 is created.');
        })
        .on('pageBeforeHide', function() {
            log('before page1 is hiding.');
        })
        .on('pageHide', function() {
            log('page1 is hided.');
        })
        .on('pageBeforeShow', function() {
            log('before page1 is showing.');
        })
        .on('pageShow', function() {
            log('page1 is shown.');
        })
        .on('init', function() {
            log('page1 has initialized.');
        });

    $('#page2')
        .on('pageBeforeCreate', function() {
            log('before page2 create.');
        })
        .on('pageCreate', function() {
            log('page2 is created.');
        })
        .on('pageBeforeHide', function() {
            log('before page2 is hiding.');
        })
        .on('pageHide', function() {
            log('page2 is hided.');
        })
        .on('pageBeforeShow', function() {
            log('before page2 is showing.');
        })
        .on('pageShow', function() {
            log('page2 is shown.');
        })
        .on('init', function() {
            log('page2 has initialized.');
        });

    $('body')
        .on('pageBeforeChange', function(event, data) {
            var fromPageId = data.options.fromPage ? data.options.fromPage[0].id : '',
                toPageId = $.type(data.toPage) === 'string' ? data.toPage : data.toPage[0].id;
            log('before ' + (fromPageId ? fromPageId + ' ' : '') + 'change to ' + toPageId);
        })
        .on('pageChange', function(event, data) {
            var fromPageId = data.options.fromPage ? data.options.fromPage[0].id : '',
                toPageId = $.type(data.toPage) === 'string' ? data.toPage : data.toPage[0].id;
            log((fromPageId ? fromPageId + ' ' : '') + 'has changed to ' + toPageId);
        });
})();