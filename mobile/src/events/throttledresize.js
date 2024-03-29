(function($) {
    'use strict';
    $.event.special.throttledresize = {
        setup: function() {
            $(this).bind("resize", handler);
        },
        teardown: function() {
            $(this).unbind("resize", handler);
        }
    };

    var throttle = 250,
        handler = function() {
            curr = ( new Date() ).getTime();
            diff = curr - lastCall;

            if (diff >= throttle) {

                lastCall = curr;
                $(this).trigger("throttledresize");

            } else {

                if (heldCall) {
                    clearTimeout(heldCall);
                }

                // Promise a held call will still execute
                heldCall = setTimeout(handler, throttle - diff);
            }
        },
        lastCall = 0,
        heldCall,
        curr,
        diff;
})(jQuery);