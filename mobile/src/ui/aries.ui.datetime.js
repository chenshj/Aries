/**
 * Created by chenshj on 14-2-3.
 */
(function($) {
    var date = new Date(),
        proxy = $.proxy,
        format,
        o = {};

    aries.ui('aries.ui.datetime', aries.ui.scroller, {

        role:'datetime',

        options: {
            dateFormat: 'mm/dd/yy',
            dateOrder: 'mmddy',
            timeWheels: 'hhiiA',
            timeFormat: 'hh:ii A',
            monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            monthText: 'Month',
            dayText: 'Day',
            yearText: 'Year',
            hourText: 'Hours',
            minuteText: 'Minutes',
            secText: 'Seconds',
            amText: 'am',
            pmText: 'pm',
            nowText: 'Now',
            startYear: date.getFullYear() - 100,
            endYear: date.getFullYear() + 1,
            shortYearCutoff: '+10',
            showNow: false,
            stepHour: 1,
            stepMinute: 1,
            stepSecond: 1,
            separator: ' ',
            ampmText: '&nbsp;'
        },

        _addWheel: function(wg, k, v, lbl) {
            wg.push({
                values: v,
                keys: k,
                label: lbl
            });
        },

        _create: function() {
            var format,
                html5def = {};
            // Force format for html5 date inputs (experimental)
            if (this.element.is('input')) {
                switch (this.element.attr('type')) {
                    case 'date':
                        format = 'yy-mm-dd';
                        break;
                    case 'datetime':
                        format = 'yy-mm-ddTHH:ii:ssZ';
                        break;
                    case 'datetime-local':
                        format = 'yy-mm-ddTHH:ii:ss';
                        break;
                    case 'month':
                        format = 'yy-mm';
                        html5def.dateOrder = 'mmyy';
                        break;
                    case 'time':
                        format = 'HH:ii:ss';
                        break;
                }
                // Check for min/max attributes
                var min = this.element.attr('min'),
                    max = this.element.attr('max');
                if (min) {
                    html5def.minDate = this.parseDate(format, min);
                }
                if (max) {
                    html5def.maxDate = this.parseDate(format, max);
                }
            }
            $.extend(this.options, html5def);

            var i, k,
                offset = 0,
                self = this,
                start,
                end,
                keys,
                values,
                wheelGroup,
                options = this.options,
                preset = options.preset,
                hformat = (preset == 'datetime') ? options.dateFormat + options.separator + options.timeFormat :
                    preset == 'time' ? options.timeFormat : options.dateFormat;


            this.dateOrder = options.dateOrder;
            this.timeOrder = options.timeWheels;
            this.regen = this.dateOrder.match(/D/);
            this.amPm = this.timeOrder.match(/a/i);
            this.hourAmPm = this.timeOrder.match(/h/);

            this.defaultDate = new Date();
            this.minDate = options.minDate || new Date(options.startYear, 0, 1);
            this.maxDate = options.maxDate || new Date(options.endYear, 11, 31, 23, 59, 59);
            this.stepHour = options.stepHour;
            this.stepMinute = options.stepMinute;
            this.stepSecond = options.stepSecond;

            this.formatter = {
                y: 'getFullYear',
                m: 'getMonth',
                d: 'getDate',
                h: proxy(this._getHour, this),
                i: proxy(this._getMinute, this),
                s: proxy(this._getSecond, this),
                a: proxy(this._getAmPm, this)
            };
            this.order = [];
            this.options.wheels = [];

            //format = format || hformat;

            if (preset.match(/date/i)) {

                // Determine the order of year, month, day wheels
                $.each(['y', 'm', 'd'], function(j, v) {
                    i = self.dateOrder.search(new RegExp(v, 'i'));
                    if (i > -1) {
                        self.order.push({ o: i, v: v });
                    }
                });
                self.order.sort(function(a, b) {
                    return a.o > b.o ? 1 : -1;
                });
                $.each(self.order, function(i, v) {
                    o[v.v] = i;
                });

                wheelGroup = [];
                for (k = 0; k < 3; k++) {
                    if (k == o.y) {
                        offset++;
                        values = [];
                        keys = [];
                        start = this.minDate.getFullYear();
                        end = this.maxDate.getFullYear();
                        for (i = start; i <= end; i++) {
                            keys.push(i);
                            values.push(this.dateOrder.match(/yy/i) ? i : (i + '').substr(2, 2));
                        }
                        this._addWheel(wheelGroup, keys, values, options.yearText);
                    } else if (k == o.m) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < 12; i++) {
                            var str = this.dateOrder.replace(/[dy]/gi, '').replace(/mm/, i < 9 ? '0' + (i + 1) : i + 1).replace(/m/, (i + 1));
                            keys.push(i);
                            values.push(str.match(/MM/) ? str.replace(/MM/, '<span class="dw-mon">' + options.monthNames[i] + '</span>') : str.replace(/M/, '<span class="dw-mon">' + options.monthNamesShort[i] + '</span>'));
                        }
                        this._addWheel(wheelGroup, keys, values, options.monthText);
                    } else if (k == o.d) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 1; i < 32; i++) {
                            keys.push(i);
                            values.push(this.dateOrder.match(/dd/i) && i < 10 ? '0' + i : i);
                        }
                        this._addWheel(wheelGroup, keys, values, options.dayText);
                    }
                }
                this.options.wheels.push(wheelGroup);
            }

            if (preset.match(/time/i)) {
                this.hasTime = true;

                // Determine the order of hours, minutes, seconds wheels
                this.order = [];
                $.each(['h', 'i', 's', 'a'], function(i, v) {
                    i = self.timeOrder.search(new RegExp(v, 'i'));
                    if (i > -1) {
                        self.order.push({ o: i, v: v });
                    }
                });
                this.order.sort(function(a, b) {
                    return a.o > b.o ? 1 : -1;
                });
                $.each(this.order, function(i, v) {
                    o[v.v] = offset + i;
                });

                wheelGroup = [];
                for (k = offset; k < offset + 4; k++) {
                    if (k == o.h) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < (this.hourAmPm ? 12 : 24); i += this.stepHour) {
                            keys.push(i);
                            values.push(this.hourAmPm && i == 0 ? 12 : this.timeOrder.match(/hh/i) && i < 10 ? '0' + i : i);
                        }
                        this._addWheel(wheelGroup, keys, values, options.hourText);
                    } else if (k == o.i) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < 60; i += this.stepMinute) {
                            keys.push(i);
                            values.push(this.timeOrder.match(/ii/) && i < 10 ? '0' + i : i);
                        }
                        this._addWheel(wheelGroup, keys, values, options.minuteText);
                    } else if (k == o.s) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < 60; i += this.stepSecond) {
                            keys.push(i);
                            values.push(this.timeOrder.match(/ss/) && i < 10 ? '0' + i : i);
                        }
                        this._addWheel(wheelGroup, keys, values, options.secText);
                    } else if (k == o.a) {
                        offset++;
                        var upper = this.timeOrder.match(/A/);
                        this._addWheel(wheelGroup, [0, 1], upper ? [options.amText.toUpperCase(), options.pmText.toUpperCase()] : [options.amText, options.pmText], options.ampmText);
                    }
                }

                this.options.wheels.push(wheelGroup);
            }

            this.format = format || hformat;

            this._super();

            this.buttons.now = { text: this.options.nowText, css: 'dwb-n', handler: function() {
                self.setDate(new Date(), false, 0.3, true, true);
            } };

            if (options.showNow) {
                options.buttons.splice($.inArray('set', options.buttons) + 1, 0, 'now');
            }

            this.invalid = options.invalid ? this.convert(options.invalid) : false;
        },

        _get: function(d, i, def) {
            if (o[i] !== undefined) {
                return +d[o[i]];
            }
            if (def !== undefined) {
                return def;
            }
            return this.defaultDate[this.formatter[i]] ? this.defaultDate[this.formatter[i]]() : this.formatter[i](this.defaultDate);
        },

        _getDate: function(d) {
            var hour = this._get(d, 'h', 0);
            return new Date(this._get(d, 'y'), this._get(d, 'm'), this._get(d, 'd', 1), this._get(d, 'a', 0) ? hour + 12 : hour, this._get(d, 'i', 0), this._get(d, 's', 0));
        },

        _getHour: function(d) {
            var hour = d.getHours();
            hour = this.hourAmPm && hour >= 12 ? hour - 12 : hour;
            return this._step(hour, this.stepHour);
        },

        _getMinute: function(d) {
            return this._step(d.getMinutes(), this.stepMinute);
        },

        _getSecond: function(d) {
            return this._step(d.getSeconds(), this.stepSecond);
        },

        _getAmPm: function(d) {
            return this.amPm && d.getHours() > 11 ? 1 : 0;
        },

        _getIndex: function(t, v) {
            return $('.dw-li', t).index($('.dw-li[data-val="' + v + '"]', t));
        },

        _getValidIndex: function(t, v, max, add) {
            if (v < 0) {
                return 0;
            }
            if (v > max) {
                return $('.dw-li', t).length;
            }
            return this._getIndex(t, v) + add;
        },

        _step: function(v, st) {
            return Math.floor(v / st) * st;
        },

        convert: function(obj) {
            var x = obj;

            if (!$.isArray(obj)) { // Convert from old format
                x = [];
                $.each(obj, function(i, o) {
                    $.each(o, function(j, o) {
                        if (i === 'daysOfWeek') {
                            if (o.d) {
                                o.d = 'w' + o.d;
                            } else {
                                o = 'w' + o;
                            }
                        }
                        x.push(o);
                    });
                });
            }

            return x;
        },

        formatDate: function(format, date) {
            if (!date) {
                return null;
            }
            var options = this.options,
                look = function(m) { // Check whether a format character is doubled
                    var n = 0;
                    while (i + 1 < format.length && format.charAt(i + 1) == m) {
                        n++;
                        i++;
                    }
                    return n;
                },
                f1 = function(m, val, len) { // Format a number, with leading zero if necessary
                    var n = '' + val;
                    if (look(m)) {
                        while (n.length < len) {
                            n = '0' + n;
                        }
                    }
                    return n;
                },
                f2 = function(m, val, s, l) { // Format a name, short or long as requested
                    return (look(m) ? l[val] : s[val]);
                },
                i,
                output = '',
                literal = false;

            for (i = 0; i < format.length; i++) {
                if (literal) {
                    if (format.charAt(i) == "'" && !look("'")) {
                        literal = false;
                    } else {
                        output += format.charAt(i);
                    }
                } else {
                    switch (format.charAt(i)) {
                        case 'd':
                            output += f1('d', date.getDate(), 2);
                            break;
                        case 'D':
                            output += f2('D', date.getDay(), options.dayNamesShort, options.dayNames);
                            break;
                        case 'o':
                            output += f1('o', (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000, 3);
                            break;
                        case 'm':
                            output += f1('m', date.getMonth() + 1, 2);
                            break;
                        case 'M':
                            output += f2('M', date.getMonth(), options.monthNamesShort, options.monthNames);
                            break;
                        case 'y':
                            output += (look('y') ? date.getFullYear() : (date.getYear() % 100 < 10 ? '0' : '') + date.getYear() % 100);
                            break;
                        case 'h':
                            var h = date.getHours();
                            output += f1('h', (h > 12 ? (h - 12) : (h == 0 ? 12 : h)), 2);
                            break;
                        case 'H':
                            output += f1('H', date.getHours(), 2);
                            break;
                        case 'i':
                            output += f1('i', date.getMinutes(), 2);
                            break;
                        case 's':
                            output += f1('s', date.getSeconds(), 2);
                            break;
                        case 'a':
                            output += date.getHours() > 11 ? options.pmText : options.amText;
                            break;
                        case 'A':
                            output += date.getHours() > 11 ? options.pmText.toUpperCase() : options.amText.toUpperCase();
                            break;
                        case "'":
                            if (look("'")) {
                                output += "'";
                            } else {
                                literal = true;
                            }
                            break;
                        default:
                            output += format.charAt(i);
                    }
                }
            }
            return output;
        },

        formatResult: function(d) {
            return this.formatDate(this.format, this.getDate(d));
        },

        getDate: function(temp) {
            return this._getDate(temp ? this.temp : this.values);
        },

        parseDate: function(format, value) {
            var options = this.options,
                defaultValue = options.defaultValue || new Date();

            if (!format || !value) {
                return defaultValue;
            }

            value = (typeof value == 'object' ? value.toString() : value + '');

            var shortYearCutoff = options.shortYearCutoff,
                year = defaultValue.getFullYear(),
                month = defaultValue.getMonth() + 1,
                day = defaultValue.getDate(),
                doy = -1,
                hours = defaultValue.getHours(),
                minutes = defaultValue.getMinutes(),
                seconds = 0, //def.getSeconds(),
                ampm = -1,
                literal = false, // Check whether a format character is doubled
                lookAhead = function(match) {
                    var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) == match);
                    if (matches) {
                        iFormat++;
                    }
                    return matches;
                },
                getNumber = function(match) { // Extract a number from the string value
                    lookAhead(match);
                    var size = (match == '@' ? 14 : (match == '!' ? 20 : (match == 'y' ? 4 : (match == 'o' ? 3 : 2)))),
                        digits = new RegExp('^\\d{1,' + size + '}'),
                        num = value.substr(iValue).match(digits);

                    if (!num) {
                        return 0;
                    }
                    iValue += num[0].length;
                    return parseInt(num[0], 10);
                },
                getName = function(match, s, l) { // Extract a name from the string value and convert to an index
                    var names = (lookAhead(match) ? l : s),
                        i;

                    for (i = 0; i < names.length; i++) {
                        if (value.substr(iValue, names[i].length).toLowerCase() == names[i].toLowerCase()) {
                            iValue += names[i].length;
                            return i + 1;
                        }
                    }
                    return 0;
                },
                checkLiteral = function() {
                    iValue++;
                },
                iValue = 0,
                iFormat;

            for (iFormat = 0; iFormat < format.length; iFormat++) {
                if (literal) {
                    if (format.charAt(iFormat) == "'" && !lookAhead("'")) {
                        literal = false;
                    } else {
                        checkLiteral();
                    }
                } else {
                    switch (format.charAt(iFormat)) {
                        case 'd':
                            day = getNumber('d');
                            break;
                        case 'D':
                            getName('D', options.dayNamesShort, options.dayNames);
                            break;
                        case 'o':
                            doy = getNumber('o');
                            break;
                        case 'm':
                            month = getNumber('m');
                            break;
                        case 'M':
                            month = getName('M', options.monthNamesShort, options.monthNames);
                            break;
                        case 'y':
                            year = getNumber('y');
                            break;
                        case 'H':
                            hours = getNumber('H');
                            break;
                        case 'h':
                            hours = getNumber('h');
                            break;
                        case 'i':
                            minutes = getNumber('i');
                            break;
                        case 's':
                            seconds = getNumber('s');
                            break;
                        case 'a':
                            ampm = getName('a', [options.amText, options.pmText], [options.amText, options.pmText]) - 1;
                            break;
                        case 'A':
                            ampm = getName('A', [options.amText, options.pmText], [options.amText, options.pmText]) - 1;
                            break;
                        case "'":
                            if (lookAhead("'")) {
                                checkLiteral();
                            } else {
                                literal = true;
                            }
                            break;
                        default:
                            checkLiteral();
                    }
                }
            }
            if (year < 100) {
                year += new Date().getFullYear() - new Date().getFullYear() % 100 +
                    (year <= (typeof shortYearCutoff != 'string' ? shortYearCutoff : new Date().getFullYear() % 100 + parseInt(shortYearCutoff, 10)) ? 0 : -100);
            }
            if (doy > -1) {
                month = 1;
                day = doy;
                do {
                    var dim = 32 - new Date(year, month - 1, 32).getDate();
                    if (day <= dim) {
                        break;
                    }
                    month++;
                    day -= dim;
                } while (true);
            }
            hours = (ampm == -1) ? hours : ((ampm && hours < 12) ? (hours + 12) : (!ampm && hours == 12 ? 0 : hours));
            var date = new Date(year, month - 1, day, hours, minutes, seconds);
            if (date.getFullYear() != year || date.getMonth() + 1 != month || date.getDate() != day) {
                return defaultValue; // Invalid date
            }
            return date;
        },

        parseValue: function(val) {
            var d = this.parseDate(this.format, val),
                i,
                result = [];

            // Set wheels
            for (i in o) {
                result[o[i]] = d[this.formatter[i]] ? d[this.formatter[i]]() : this.formatter[i](d);
            }
            return result;
        },

        setDate: function(d, fill, time, temp, change) {
            var i;

            // Set wheels
            for (i in o) {
                this.temp[o[i]] = d[this.formatter[i]] ? d[this.formatter[i]]() : this.formatter[i](d);
            }
            this.setValue(this.temp, fill, time, temp, change);
        },

        validate: function(dw, i, time, dir) {
            var self = this,
                options = this.options,
                temp = this.temp, //.slice(0),
                mins = { y: this.minDate.getFullYear(), m: 0, d: 1, h: 0, i: 0, s: 0, a: 0 },
                maxs = { y: this.maxDate.getFullYear(), m: 11, d: 31, h: this._step(this.hourAmPm ? 11 : 23, this.stepHour), i: this._step(59, this.stepMinute), s: this._step(59, this.stepSecond), a: 1 },
                steps = { h: this.stepHour, i: this.stepMinute, s: this.stepSecond, a: 1 },
                y = this._get(temp, 'y'),
                m = this._get(temp, 'm'),
                minprop = true,
                maxprop = true;

            $.each(['y', 'm', 'd', 'a', 'h', 'i', 's'], function(x, i) {
                if (o[i] !== undefined) {
                    var min = mins[i],
                        max = maxs[i],
                        maxdays = 31,
                        val = self._get(temp, i),
                        t = $('.dw-ul', dw).eq(o[i]);

                    if (i == 'd') {
                        maxdays = 32 - new Date(y, m, 32).getDate();
                        max = maxdays;
                        if (self.regen) {
                            $('.dw-li', t).each(function() {
                                var that = $(this),
                                    d = that.data('val'),
                                    w = new Date(y, m, d).getDay(),
                                    str = self.dateOrder.replace(/[my]/gi, '').replace(/dd/, d < 10 ? '0' + d : d).replace(/d/, d);
                                $('.dw-i', that).html(str.match(/DD/) ? str.replace(/DD/, '<span class="dw-day">' + options.dayNames[w] + '</span>') : str.replace(/D/, '<span class="dw-day">' + options.dayNamesShort[w] + '</span>'));
                            });
                        }
                    }
                    if (minprop && self.minDate) {
                        min = self.minDate[self.formatter[i]] ? self.minDate[self.formatter[i]]() : self.formatter[i](self.minDate);
                    }
                    if (maxprop && self.maxDate) {
                        max = self.maxDate[self.formatter[i]] ? self.maxDate[self.formatter[i]]() : self.formatter[i](self.maxDate);
                    }
                    if (i != 'y') {
                        var i1 = self._getIndex(t, min),
                            i2 = self._getIndex(t, max);
                        $('.dw-li', t).removeClass('dw-v').slice(i1, i2 + 1).addClass('dw-v');
                        if (i == 'd') { // Hide days not in month
                            $('.dw-li', t).removeClass('dw-h').slice(maxdays).addClass('dw-h');
                        }
                    }
                    if (val < min) {
                        val = min;
                    }
                    if (val > max) {
                        val = max;
                    }
                    if (minprop) {
                        minprop = val == min;
                    }
                    if (maxprop) {
                        maxprop = val == max;
                    }
                    // Disable some days
                    if (self.invalid && i == 'd') {
                        var d, j, k, v,
                            first = new Date(y, m, 1).getDay(),
                            idx = [];

                        for (j = 0; j < self.invalid.length; j++) {
                            d = self.invalid[j];
                            v = d + '';
                            if (!d.start) {
                                if (d.getTime) { // Exact date
                                    if (d.getFullYear() == y && d.getMonth() == m) {
                                        idx.push(d.getDate() - 1);
                                    }
                                } else if (!v.match(/w/i)) { // Day of month
                                    v = v.split('/');
                                    if (v[1]) {
                                        if (v[0] - 1 == m) {
                                            idx.push(v[1] - 1);
                                        }
                                    } else {
                                        idx.push(v[0] - 1);
                                    }
                                } else { // Day of week
                                    v = +v.replace('w', '');
                                    for (k = v - first; k < maxdays; k += 7) {
                                        if (k >= 0) {
                                            idx.push(k);
                                        }
                                    }
                                }
                            }
                        }
                        $.each(idx, function(i, v) {
                            $('.dw-li', t).eq(v).removeClass('dw-v');
                        });

                        val = self.getValidCell(val, t, dir).val;
                    }

                    // Set modified value
                    temp[o[i]] = val;
                }
            });

            // Invalid times
            if (this.hasTime && this.invalid) {

                var dd, v, val, str, parts1, parts2, j, v1, v2, i1, i2, prop1, prop2, target, add, remove,
                    spec = {},
                    d = this._get(temp, 'd'),
                    day = new Date(y, m, d),
                    w = ['a', 'h', 'i', 's'];

                $.each(this.invalid, function(i, obj) {
                    if (obj.start) {
                        obj.apply = false;
                        dd = obj.d;
                        v = dd + '';
                        str = v.split('/');
                        if (dd && ((dd.getTime && y == dd.getFullYear() && m == dd.getMonth() && d == dd.getDate()) || // Exact date
                            (!v.match(/w/i) && ((str[1] && d == str[1] && m == str[0] - 1) || (!str[1] && d == str[0]))) || // Day of month
                            (v.match(/w/i) && day.getDay() == +v.replace('w', '')) // Day of week
                            )) {
                            obj.apply = true;
                            spec[day] = true; // Prevent applying generic rule on day, if specific exists
                        }
                    }
                });

                $.each(this.invalid, function(i, obj) {
                    if (obj.start && (obj.apply || (!obj.d && !spec[day]))) {

                        parts1 = obj.start.split(':');
                        parts2 = obj.end.split(':');

                        for (j = 0; j < 3; j++) {
                            if (parts1[j] === undefined) {
                                parts1[j] = 0;
                            }
                            if (parts2[j] === undefined) {
                                parts2[j] = 59;
                            }
                            parts1[j] = +parts1[j];
                            parts2[j] = +parts2[j];
                        }

                        parts1.unshift(parts1[0] > 11 ? 1 : 0);
                        parts2.unshift(parts2[0] > 11 ? 1 : 0);

                        if (self.hourAmPm) {
                            if (parts1[1] >= 12) {
                                parts1[1] = parts1[1] - 12;
                            }

                            if (parts2[1] >= 12) {
                                parts2[1] = parts2[1] - 12;
                            }
                        }

                        prop1 = true;
                        prop2 = true;
                        $.each(w, function(i, v) {
                            if (o[v] !== undefined) {
                                val = self._get(temp, v);
                                add = 0;
                                remove = 0;
                                i1 = 0;
                                i2 = undefined;
                                target = $('.dw-ul', dw).eq(o[v]);

                                // Look ahead if next wheels should be disabled completely
                                for (j = i + 1; j < 4; j++) {
                                    if (parts1[j] > 0) {
                                        add = steps[v];
                                    }
                                    if (parts2[j] < maxs[w[j]]) {
                                        remove = steps[v];
                                    }
                                }

                                // Calculate min and max values
                                v1 = self._step(parts1[i] + add, steps[v]);
                                v2 = self._step(parts2[i] - remove, steps[v]);

                                if (prop1) {
                                    i1 = self._getValidIndex(target, v1, maxs[v], 0);
                                }

                                if (prop2) {
                                    i2 = self._getValidIndex(target, v2, maxs[v], 1);
                                }

                                // Disable values
                                if (prop1 || prop2) {
                                    $('.dw-li', target).slice(i1, i2).removeClass('dw-v');
                                }

                                // Get valid value
                                val = self.getValidCell(val, target, dir).val;

                                prop1 = prop1 && val == self._step(parts1[i], steps[v]);
                                prop2 = prop2 && val == self._step(parts2[i], steps[v]);

                                // Set modified value
                                temp[o[v]] = val;
                            }
                        });
                    }
                });
            }
        }
    });

})(jQuery);