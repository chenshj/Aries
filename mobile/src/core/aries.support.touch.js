(function($, aries) {
    'use strict';
    var support = {
        touch: "ontouchend" in document
    };

    aries.support = aries.support || {};
    $.extend($.support, support);
    $.extend(aries.support, support);
}(jQuery, window.aries));