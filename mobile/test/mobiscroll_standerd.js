/**
 * Created by chenshj on 14-2-2.
 */
$(function() {
        $('.demo-test-select').scroller({
            preset: 'select',
            theme: 'default',
            mode: 'scroller',
            display: 'modal',
            animate: 'fade'
        });

    $('.demo-test-date').scroller({
        preset: 'date',
        dateOrder: 'd Dmmyy',
        invalid: { daysOfWeek: [0, 6], daysOfMonth: ['5/1', '12/24', '12/25'] },
        theme: 'default',
        mode: 'scroller',
        display: 'modal',
        animate: 'fade'
    });
});