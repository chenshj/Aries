/**
 * Created by chenshj on 14-1-26.
 */
$(function() {
    $('#listview1').on('toolButtonClick', function(event, sender) {
        alert($(sender).closest('a').attr('id'));
    })
})