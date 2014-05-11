/**
 * Created by chenshj on 14-1-27.
 */
$(function() {
    //$('#wrapper').scroll();
    //var myScroll = new IScroll('#wrapper');
    $('#listview1').on('toolButtonClick', function(event, sender) {
        alert($(sender).closest('a').attr('id'));
    })
});