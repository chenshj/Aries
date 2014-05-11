/**
 * Created by chenshj on 14-1-31.
 */
(function($, undefined) {

    $(document).on('mouseover mouseup mousedown click', function(e) { // Prevent standard behaviour on body click
        if (tap) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    });

    function testProperties (properties) {
        var prop;
        for (prop in properties) {
            if (properties.hasOwnProperty(prop) &&
                modernizrElement[properties[prop]] !== undefined) {
                return true;
            }
        }
        return false;
    }

    function getPrefix () {
        var prefixes = ['Webkit', 'Moz', 'O', 'ms'], index;

        for (index = 0; index < prefixes.length; index++) {
            if (testProperties([prefixes[index] + 'Transform'])) {
                return '-' + prefixes[index].toLowerCase() + '-';
            }
        }
        return '';
    }

    function getCoord (event, c) {
        var org = event.originalEvent,
            changedTouches = event.changedTouches;
        return changedTouches || (org && org.changedTouches) ? (org ? org.changedTouches[0]['page' + c] : changedTouches[0]['page' + c]) : event['page' + c];
    }

    function testTouch (e) {
        if (e.type == 'touchstart') {
            touches[e.target] = true;
        } else if (touches[e.target]) {
            delete touches[e.target];
            return false;
        }
        return true;
    }

    function setTap () {
        tap = true;
        setTimeout(function() {
            tap = false;
        }, 300);
    }

    function constrain (val, min, max) {
        return Math.max(min, Math.min(val, max));
    }

    function convert (wheel) {
        var convertedWheel = {
            values: [],
            keys: []
        };
        $.each(wheel, function(key, value) {
            convertedWheel.keys.push(key);
            convertedWheel.values.push(value);
        });
        return convertedWheel;
    }

    function prevdef (e) {
        e.preventDefault();
    }

    var touches = {},
        extend = $.extend,
        proxy = $.proxy,
        modernizrElement = document.createElement('modernizr').style,
        has3d = testProperties(['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective']),
        prefix = getPrefix(),
        pr = prefix.replace(/^\-/, '').replace(/\-$/, '').replace('moz', 'Moz');

    var lock, timer, move, tap,
        START_EVENT = 'touchstart mousedown',
        MOVE_EVENT = 'touchmove mousemove',
        END_EVENT = 'touchend mouseup';

    var mobiscroll = {
        presets: {}
    };

    aries.ui('aries.ui.scroller', {

        options: {
            width: 70,
            height: 40,
            rows: 3,
            delay: 300,
            disabled: false,
            readonly: false,
            closeOnOverlay: true,
            showOnFocus: true,
            showOnTap: true,
            showLabel: true,
            wheels: [],
            theme: '',
            display: 'modal',
            mode: 'scroller',
            preset: '',
            lang: 'en-US',
            context: 'body',
            scrollLock: true,
            tap: true,
            btnWidth: true,
            speedUnit: 0.0012,
            timeUnit: 0.1,
            setText: 'set',
            cancelText: 'cancel'
        },

        classes: {
            animateIn:'dw-in',
            animateOut:'dw-out',
            animatePrefix:'dw-',
            dialWheel:'dw',
            dialWheelBottomButtonGroup:'btn-group btn-group-justified',
            dialWheelContent:'dwc',
            dialWheelHeader:'panel-heading',
            overlay:'dwo',
            tempDisabled:'dwtd',
            transform:'dw-trans',
            wheel:'dwwl',
            wheelButton:'btn',
            wheelButtonCancel: 'btn-c',
            wheelButtonClear: 'btn-cl',
            wheelButtonSet: 'btn-s',
            wheelButtonStyle:'btn-default',
            wheelHideLabel:'dw-hl',
            wheelItem: 'dw-li',
            wheelItemContent:'dw-i',
            wheelItemList:'dw-ul',
            wheelItemListWrapper:'dww',
            wheelItemSelected:'dw-sel',
            wheelLabel:'dwl',
            wheelScrolling:'dwa',
            wheelValueButton:'dwwb',
            wheelValueUpButton:'dwwbp',
            wheelValueDownButton:'dwwbm',
            wheelWrapper:'dwwr',
            validWheelItem:'dw-validIndex'
        },

        events: {
            animationStart: 'onAnimStart',
            beforeShow: 'onBeforeShow',
            cancel: 'onCancel',
            clear: 'onClear',
            close: 'onClose',
            change: 'onChange',
            destroy: 'onDestroy',
            markupReady: 'onMarkupReady',
            markupInserted: 'onMarkupInserted',
            position: 'onPosition',
            select: 'onSelect',
            show: 'onShow',
            themeLoad: 'onThemeLoad',
            validate: 'validate',
            valueTap: 'onValueTap',
            valueFill: 'onValueFill'
        },

        _attachPosition: function(ev, checkLock) {
            var debounce, self = this;
            this.$window.on(ev, function(e) {
                clearTimeout(debounce);
                debounce = setTimeout(function() {
                    if ((lock && checkLock) || !checkLock) {
                        self.position(!checkLock);
                    }
                }, 200);
            });
        },

        _calc: function(t, val, dir, anim, orig) {
            val = constrain(val, this.min, this.max);

            var self = this,
                wheelItemClass = this.classes.wheelItem,
                cell = $('.' + wheelItemClass, t).eq(val),
                o = orig === undefined ? val : orig,
                active = orig !== undefined,
                idx = this.index,
                time = anim ? (val == o ? 0.1 : Math.abs((val - o) * this.options.timeUnit)) : 0;

            // Set selected scroller value
            self.temp[idx] = cell.attr('data-val');

            this._scroll(t, idx, val, time, active);

            setTimeout(function() {
                // Validate
                self._scrollToPos(time, idx, true, dir, active);
            }, 10);
        },

        _create: function() {
            var preset,
                presetOptions,
                self = this,
                classes = this.classes,
                events = this.events,
                options = this.options,
                setText = options.setText,
                cancelText = options.cancelText,
                clearText = options.clearText,
                closeText = options.closeText,
                wheelButtonSetClass = classes.wheelButtonSet,
                wheelButtonCancelClass = classes.wheelButtonCancel,
                wheelButtonClearClass = classes.wheelButtonClear;

            this.iv = {};
            this.pos = {};
            this.pixels = {};
            this.values = null;
            this.val = null;
            this.temp = null;
            this.buttons = {};
            this._selectedValues = {};
            this.isInput = this.element.is('input');
            this.visible = false;
            this.wheels = [];
            this.elementList = [];
            this.move = null;

            // 获取默认主题，优先使用初始化时指定的主题。
            //theme = mobiscroll.themes[this.options.theme || defaultOptions.theme];

            // 触发onThemeLoad事件。
            this.element.trigger(events.themeLoad, [options]);

            // 添加缺按钮，如果为定义按钮，按钮默认为"set"和"cancel"。
            options.buttons = options.buttons || ['set', 'cancel'];

            // 在"inline"模式下默认隐藏header text。
            options.headerText = options.headerText === undefined ?
                (options.display !== 'inline' ? '{value}' : false) : options.headerText;

            // 重新绑定所有时候，用于多次初始化时，避免事件重复注册。
            this.element.off('.mobiscroll');

            preset = mobiscroll.presets[options.preset];

            if (preset) {
                presetOptions = preset.call(this.element, this);
                extend(options, presetOptions); // Load preset settings
            }

            // Set private members
            this.m = Math.floor(options.rows / 2);
            this.height = options.height;
            this.anim = options.animate;
            this.modal = options.display !== 'inline';
            this.$window = $(options.context == 'body' ? window : options.context);
            this.$document = $(options.context)[0];

            if (!setText) {
                options.buttons.splice($.inArray('set', options.buttons), 1);
            }
            if (!cancelText) {
                options.buttons.splice($.inArray('cancel', options.buttons), 1);
            }
            if (options.button3) {
                options.buttons.splice($.inArray('set', options.buttons) + 1, 0, { text: options.button3Text, handler: options.button3 });
            }

            this.context = this.$window;
            this.live = !this.modal || ($.inArray('set', options.buttons) === -1);
            this.buttons = {
                set: {
                    text: setText,
                    css: wheelButtonSetClass,
                    handler: this.select
                },
                cancel: {
                    text: (this.live) ? closeText : cancelText,
                    css: wheelButtonCancelClass,
                    handler: this.cancel
                },
                clear: {
                    text: clearText,
                    css: wheelButtonClearClass,
                    handler: function() {
                        self.trigger(events.clear, [self.dialWheel]);
                        self.element.val('');
                        if (!self.live) {
                            self.hide(false, 'clear');
                        }
                    }}
            };

            this.hasButtons = options.buttons.length > 0;

            if (this.visible) {
                this.hide(true, false, true);
            }

            if (this.modal) {
                this._read();
                if (this.isInput) {
                    // Set element readonly, save original state
                    if (this.readOnly === undefined) {
                        this.readOnly = this.element[0].readOnly;
                    }
                    this.element[0].readOnly = true;
                }
                this.attachShow(this.element);
            } else {
                this.show();
            }

            if (this.isInput) {
                this.element.on('change.mobiscroll', function() {
                    if (!self.preventChange) {
                        self.setValue(self.element.val(), false, 0.2);
                    }
                    self.preventChange = false;
                });
            }

            // Prevent re-show on window focus
            $(window).on('focus', function() {
                if (self.activeElement) {
                    self.preventShow = true;
                }
            });
        },

        _formatHeader: function(value) {
            var text = this.options.headerText;
            return text ? (typeof text === 'function' ? text.call(this.element, value) : text.replace(/\{value\}/i, value)) : '';
        },

        _generateWheelItems: function(wheelIndex) {
            var html = '<div>',
                origWheel = this.wheels[wheelIndex],
                //如果origWheel是键值对的形式，将其转换为values和keys形式。
                wheel = origWheel.values ? origWheel : convert(origWheel),
                wheelItemCount = 1,
                labels = wheel.labels || [],
                values = wheel.values,
                keys = wheel.keys || values,
                classes = this.classes,
                wheelItemClass = classes.wheelItem,
                wheelItemContentClass = classes.wheelItemContent,
                validWheelItemClass = classes.validWheelItem,
                self=this;

            $.each(values, function(index, value) {
                //20个Item一组，多于20个时使用新的div包装下一组。
                if (wheelItemCount % 20 == 0) {
                    html += '</div><div>';
                }
                html += '<div role="option" aria-selected="false" class="'+wheelItemClass+' '+validWheelItemClass+'"' +
                    //在Dom上保存实际值。
                    ' data-val="' + keys[index] + '"' +
                    (labels[index] ? ' aria-label="' + labels[index] + '"' : '') +
                    //设置选择项的行高。
                    ' style="height:' + self.height + 'px;line-height:' + self.height + 'px;">' +
                    //添加选择项显示文本。
                    '<div class="'+wheelItemContentClass+'">' + value + '</div>' +
                    '</div>';
                wheelItemCount++;
            });

            html += '</div>';
            return html;
        },

        _getCurrentPosition: function(scrollTarget) {
            var style = window.getComputedStyle ? getComputedStyle(scrollTarget[0]) : scrollTarget[0].style,
                matrix='',
                px;

            if (has3d) {
                $.each(['t', 'webkitT', 'MozT', 'OT', 'msT'], function(index, value) {
                    if (style[value + 'ransform'] !== undefined) {
                        matrix = style[value + 'ransform'];
                        return false;
                    }
                });
                matrix = matrix.split(')')[0].split(', ');
                px = matrix[13] || matrix[5];
            } else {
                px = style.top.replace('px', '');
            }

            return Math.round(this.m - (px / this.height));
        },

        _getValid: function(val, itemList, dir) {
            var classes = this.classes,
                wheelItemClass = classes.wheelItem,
                validWheelItemClass = classes.validWheelItem,
                cell = $('.'+wheelItemClass+'[data-val="' + val + '"]', itemList),
                cells = $('.'+wheelItemClass, itemList),
                validIndex = cells.index(cell),
                length = cells.length;

            // Scroll to a valid cell
            if (!cell.hasClass(validWheelItemClass)) {
                var cell1 = cell, cell2 = cell,
                    dist1 = 0, dist2 = 0;

                while (validIndex - dist1 >= 0 && !cell1.hasClass(validWheelItemClass)) {
                    dist1++;
                    cell1 = cells.eq(validIndex - dist1);
                }

                while (validIndex + dist2 < length && !cell2.hasClass(validWheelItemClass)) {
                    dist2++;
                    cell2 = cells.eq(validIndex + dist2);
                }

                // If we have direction (+/- or mouse wheel), the distance does not count
                if (((dist2 < dist1 && dist2 && dir !== 2) || !dist1 || (validIndex - dist1 < 0) || dir == 1) && cell2.hasClass(validWheelItemClass)) {
                    cell = cell2;
                    validIndex = validIndex + dist2;
                } else {
                    cell = cell1;
                    validIndex = validIndex - dist1;
                }
            }

            return {
                cell: cell,
                validIndex: validIndex,
                val: cell.hasClass(validWheelItemClass) ? cell.attr('data-val') : null
            };
        },

        _isReadOnly: function(wheel) {
            if ($.isArray(this.options.readonly)) {
                var i = $('.'+this.classes.wheel, this.dialWheel).index(wheel);
                return this.options.readonly[i];
            }
            return this.options.readonly;
        },

        _minus: function(t) {
            var val = this.pos[this.index] - 1;
            this._calc(t, val < this.min ? this.max : val, 2, true);
        },

        _onStart: function(event) {
            // Scroll start
            if (testTouch(event) && !move && !this.click && !this.btn && !this._isReadOnly(event.currentTarget)) {
                var classes = this.classes,
                    wheelClass = classes.wheel,
                    wheelItemListClass = classes.wheelItemList,
                    wheelScrollingClass = classes.wheelScrolling;

                // Prevent touch highlight
                event.preventDefault();

                move = true;
                this.scrollable = this.options.mode != 'clickpick';
                this.scrollTarget = $('.'+wheelItemListClass, event.currentTarget);
                this._setGlobals(this.scrollTarget);
                this.moved = this.iv[this.index] !== undefined; // Don't allow tap, if still moving
                this.startPosition = this.moved ? this._getCurrentPosition(this.scrollTarget) : this.pos[this.index];
                this.start = getCoord(event, 'Y');
                this.startTime = new Date();
                this.stop = this.start;
                this._scroll(this.scrollTarget, this.index, this.startPosition, 0.001);

                if (this.scrollable) {
                    this.scrollTarget.closest('.'+wheelClass).addClass(wheelScrollingClass);
                }

                $(document).on(MOVE_EVENT, proxy(this._onMove, this)).on(END_EVENT, proxy(this._onEnd, this));
            }
        },

        _onMove: function(event) {
            if (this.scrollable) {
                // Prevent scroll
                event.preventDefault();
                event.stopPropagation();
                this.stop = getCoord(event, 'Y');
                this._scroll(this.scrollTarget, this.index, constrain(this.startPosition + (this.start - this.stop) / this.height, this.min - 1, this.max + 1));
            }
            if (this.start !== this.stop) {
                this.moved = true;
            }
        },

        _onEnd: function(event) {
            var time = new Date() - this.startTime,
                val = constrain(this.startPosition + (this.start - this.stop) / this.height, this.min - 1, this.max + 1),
                speed,
                dist,
                tindex,
                ttop = this.scrollTarget.offset().top,
                classes = this.classes,
                wheelItemClass = classes.wheelItem,
                wheelItemHightClass = classes.wheelHideLabel;

            if (time < 300) {
                speed = (this.stop - this.start) / time;
                dist = (speed * speed) / this.options.speedUnit;
                if (this.stop - this.start < 0) {
                    dist = -dist;
                }
            } else {
                dist = this.stop - this.start;
            }

            tindex = Math.round(this.startPosition - dist / this.height);

            if (!dist && !this.moved) { // this is a "tap"
                var idx = Math.floor((this.stop - ttop) / this.height),
                    li = $($('.'+wheelItemClass, this.scrollTarget)[idx]),
                    hl = this.scrollable,
                    valueTapEvent = new $.Event(this.events.valueTap);
                this.element.trigger(valueTapEvent, [li]);
                if (!valueTapEvent.isDefaultPrevented()) {
                    tindex = idx;
                } else {
                    hl = true;
                }

                if (hl) {
                    li.addClass(wheelItemHightClass); // Highlight
                    setTimeout(function() {
                        li.removeClass(wheelItemHightClass);
                    }, 200);
                }
            }

            if (this.scrollable) {
                this._calc(this.scrollTarget, tindex, 0, true, Math.round(val));
            }

            move = false;
            this.scrollTarget = null;

            $(document).off(MOVE_EVENT, proxy(this._onMove, this))
                .off(END_EVENT, proxy(this._onEnd, this));
        },

        _onBtnStart: function(event) {
            var classes = this.classes,
                wheelClass = classes.wheel,
                wheelValueButtonClass = classes.wheelValueButton,
                wheelValueUpButtonClass = classes.wheelValueUpButton;

            this.btn = $(event.target);
            $(document).on(END_EVENT, proxy(this._onBtnEnd, this));
            // +/- buttons
            if (this.btn.hasClass(wheelValueButtonClass)) {
                if (testTouch(event)) {
                    this._step(event, this.btn.closest('.'+wheelClass), this.btn.hasClass(wheelValueUpButtonClass) ? this._plus : this._minus);
                }
            }
        },

        _onBtnEnd: function(event) {
            if (this.click) {
                clearInterval(timer);
                this.click = false;
            }
            if (this.btn) {
                this.btn = null;
            }
            $(document).off(END_EVENT, proxy(this._onBtnEnd, this));
        },

        _onKeyDown: function(event) {
            if (event.keyCode == 38) { // up
                this._step(event, $(event.target), this._minus);
            } else if (event.keyCode == 40) { // down
                this._step(event, $(event.target), this._plus);
            }
        },

        _onKeyUp: function(event) {
            if (this.click) {
                clearInterval(timer);
                this.click = false;
            }
        },

        _onScroll: function(event) {
            if (!this._isReadOnly(event.currentTarget)) {
                event.preventDefault();
                event = event.originalEvent || event;
                var delta = event.wheelDelta ? (event.wheelDelta / 120) : (event.detail ? (-event.detail / 3) : 0),
                    t = $('.'+this.classes.wheelItemList, event.currentTarget);

                this._setGlobals(t);
                this._calc(t, Math.round(this.pos[this.index] - delta), delta < 0 ? 1 : 2);
            }
        },

        _plus: function(t) {
            var val = this.pos[this.index] + 1;
            this._calc(t, val > this.max ? this.min : val, 1, true);
        },

        _read: function() {
            this.temp = this.values ? this.values.slice(0) : this.parseValue(this.element.val() || '', this);
            this._setVal();
        },

        _ready: function(itemList, index) {
            clearTimeout(this.iv[index]);
            delete this.iv[index];
            itemList.closest('.'+this.classes.wheel);
        },

        _scroll: function(itemList, index, val, time, active) {
            var px = (this.m - val) * this.height,
                self = this,
                style = itemList[0].style,
                i;

            if (px === this.pixels[index] && this.iv[index]) {
                return;
            }

            if (time && px != this.pixels[index]) {
                // Trigger animation start event
                this.element.trigger(this.events.animationStart, [this.dialWheel, index, time]);
            }

            this.pixels[index] = px;

            style[pr + 'Transition'] = 'all ' + (time ? time.toFixed(3) : 0) + 's ease-out';

            if (has3d) {
                style[pr + 'Transform'] = 'translate3d(0,' + px + 'px,0)';
            } else {
                style.top = px + 'px';
            }

            if (this.iv[index]) {
                this._ready(itemList, index);
            }

            if (time && active) {
                this.iv[index] = setTimeout(function() {
                    self._ready(itemList, index);
                }, time * 1000);
            }

            this.pos[index] = val;
        },

        _scrollToPos: function(time, index, manual, dir, active) {
            // Call validation event
            var self = this,
                validateEvent = $.Event(this.events.validate),
                classes = this.classes,
                dialWheelHeaderClass = classes.dialWheelHeader,
                wheelItemListClass = classes.wheelItemList,
                wheelItemSelectedClass = classes.wheelItemSelected;

            this.element.trigger(validateEvent, [this.dialWheel, index, time, dir]);
            if (validateEvent.isDefaultPrevented())
                return;

            // Set scrollers to position
            $('.'+wheelItemListClass, this.dialWheel).each(function(itemListIndex) {
                var itemList = $(this),
                    sc = itemListIndex == index || index === undefined,
                    result = self._getValid(self.temp[itemListIndex], itemList, dir),
                    cell = result.cell;

                if (!(cell.hasClass(wheelItemSelectedClass)) || sc) {
                    // Set valid value
                    self.temp[itemListIndex] = result.val;

                    if (!self.options.multiple) {
                        $('.'+wheelItemSelectedClass, itemList).removeAttr('aria-selected');
                        cell.attr('aria-selected', 'true');
                    }

                    // Add selected class to cell
                    $('.'+wheelItemSelectedClass, itemList).removeClass(wheelItemSelectedClass);
                    cell.addClass(wheelItemSelectedClass);

                    // Scroll to position
                    self._scroll(itemList, itemListIndex, result.validIndex, sc ? time : 0.1, sc ? active : false);
                }
            });

            // Reformat value if validation changed something
            this.formattedValue = this.formatResult(self.temp);
            if (this.live) {
                this._setVal(manual, manual, 0, true);
            }

            $('.'+dialWheelHeaderClass, this.dialWheel).html(this._formatHeader(this.formattedValue));

            if (manual) {
                this.element.trigger(this.events.change, [this.formattedValue]);
            }
        },

        _setGlobals: function(t) {
            var classes = this.classes,
                wheelItemClass = classes.wheelItem,
                wheelItemListClass = classes.wheelItemList,
                validWheelItemClass = classes.validWheelItem;

            this.min = $('.'+wheelItemClass, t).index($('.'+validWheelItemClass, t).eq(0));
            this.max = $('.'+wheelItemClass, t).index($('.'+validWheelItemClass, t).eq(-1));
            this.index = $('.'+wheelItemListClass, this.dialWheel).index(t);
        },

        _setVal: function(fill, change, time, noscroll, temp) {
            if (this.visible && !noscroll) {
                this._scrollToPos(time);
            }

            this.formattedValue = this.formatResult(this.temp);

            if (!temp) {
                this.values = this.temp.slice(0);
                this.val = this.formattedValue;
            }

            if (fill) {
                if (this.isInput) {
                    this.element.val(this.formattedValue);
                    if (change) {
                        this.preventChange = true;
                        this.element.change();
                    }
                }
                this.element.trigger(this.events.valueFill, [this.formattedValue, change]);
            }
        },

        _step: function(e, w, func) {
            e.stopPropagation();
            e.preventDefault();
            if (!this.click && !this._isReadOnly(w)) {
                this.click = true;
                // + Button
                var t = w.find('.'+this.classes.wheelItemList);

                this._setGlobals(t);
                clearInterval(timer);
                timer = setInterval(function() {
                    func(t);
                }, this.options.delay);
                func(t);
            }
        },

        /**
         * Show mobiscroll on focus and click event of the parameter.
         * @param {jQuery} element - Events will be attached to this element.
         * @param {Function} [beforeShow=undefined] - Optional function to execute before showing mobiscroll.
         */
        attachShow: function(element, beforeShow) {
            var self = this;
            this.elementList.push(element);
            if (this.options.display !== 'inline') {
                element.on((this.options.showOnFocus ? 'focus.dw' : '') + (this.options.showOnTap ? ' click.dw' : ''),
                    function(event) {
                        if ((event.type !== 'focus' || (event.type === 'focus' && !self.preventShow)) && !tap) {
                            if (beforeShow) {
                                beforeShow();
                            }
                            self.activeElement = element;
                            self.show();
                        }
                        setTimeout(function() {
                            self.preventShow = false;
                        }, 300); // With jQuery < 1.9 focus is fired twice in IE
                    });
            }
        },

        /**
         * Cancel and hide the scroller instance.
         */
        cancel: function() {
            if (this.hide(false, 'cancel') !== false) {
                this.element.trigger(this.events.cancel, [this.val]);
            }
        },

        /**
         * Changes the values of a wheel, and scrolls to the correct position
         * @param {Array} idx Indexes of the wheels to change.
         * @param {Number} [time=0] Animation time when scrolling to the selected value on the new wheel.
         * @param {Boolean} [manual=false] Indicates that the change was triggered by the user or from code.
         */
        changeWheel: function(idx, time, manual) {
            if (this.dialWheel) {
                var wheelIndex = 0, nr = idx.length, self = this;

                $.each(this.options.wheels, function(j, wheelGroup) {
                    $.each(wheelGroup, function(k, wheel) {
                        if ($.inArray(wheelIndex, idx) > -1) {
                            self.wheels[wheelIndex] = wheel;
                            $('.'+self.classes.wheelItemList, self.dialWheel).eq(wheelIndex).html(self._generateWheelItems(wheelIndex));
                            nr--;
                            if (!nr) {
                                self.position();
                                self._scrollToPos(time, undefined, manual);
                                return false;
                            }
                        }
                        wheelIndex++;
                    });
                    if (!nr) {
                        return false;
                    }
                });
            }
        },

        /**
         * Destroys the mobiscroll instance.
         */
        destroy: function() {
            this.hide(true, false, true);
            // Remove all events from elements
            $.each(this.elementList, function(i, v) {
                v.off('.dw');
            });
            // Remove events from window
            $(window).off('.dwa');
            // Reset original readonly state
            if (this.isInput) {
                this.element[0].readOnly = this.readOnly;
            }
            this.element.trigger(this.events.destroy);
        },

        /**
         * Disables the scroller and the associated input.
         */
        disable: function() {
            this.options.disabled = true;
            if (this.isInput) {
                this.element.prop('disabled', true);
            }
        },

        /**
         * Enables the scroller and the associated input.
         */
        enable: function() {
            this.options.disabled = false;
            if (this.isInput) {
                this.element.prop('disabled', false);
            }
        },

        formatResult: function(d) {
            return d.join(' ');
        },

        /**
         * Returns the closest valid cell.
         */
        getValidCell: this._getValid,

        /**
         * Return the selected wheel values.
         */
        getValue: function() {
            return this.values;
        },

        /**
         * Return selected values, if in multiselect mode.
         */
        getValues: function() {
            var returnValues = [],
                index;

            for (index in this._selectedValues) {
                returnValues.push(this._selectedValues[index]);
            }
            return returnValues;
        },

        /**
         * Hides the scroller instance.
         */
        hide: function(prevAnim, btn, force) {
            var closeEvent,
                self = this,
                classes=this.classes,
                animatePrefix = classes.animatePrefix,
                animateOutClass = classes.animateOut,
                dialWheelClass = classes.dialWheel,
                tempDisabledClass = classes.tempDisabled,
                transformClass = classes.transform;

            // If onClose handler returns false, prevent hide
            closeEvent = new $.Event(this.events.close);
            this.element.trigger(closeEvent, [this.formattedValue, btn]);
            if (!this.visible || (!force && closeEvent.isDefaultPrevented())) {
                return false;
            }

            // Re-enable temporary disabled fields
            $('.'+tempDisabledClass, this.$document).each(function() {
                $(this).prop('disabled', false).removeClass(tempDisabledClass);
                if ($(this).data('autocomplete')) {
                    $(this).attr('autocomplete', $(this).data('autocomplete'));
                } else {
                    $(this).removeAttr('autocomplete');
                }
            });

            // Hide wheels and overlay
            if (this.dialWheel) {
                var doAnim = this.modal && this.animation && !prevAnim;
                if (doAnim) {
                    this.dialWheel.addClass(transformClass).find('.'+dialWheelClass).addClass(animatePrefix + this.animation + ' '+animateOutClass);
                }
                if (prevAnim) {
                    this.dialWheel.remove();
                } else {
                    setTimeout(function() {
                        self.dialWheel.remove();
                        if (self.activeElement) {
                            self.preventShow = true;
                            self.activeElement.focus();
                        }
                    }, doAnim ? 350 : 1);
                }

                // Stop positioning on window resize
                this.$window.off('.dw');
            }

            this.pixels = {};
            this.visible = false;
        },

        /**
         * Return true if the scroller is currently visible.
         */
        isVisible: function() {
            return this.visible;
        },

        parseValue: function(value, inst) {
            var val = value.split(' '),
                ret = [],
                i = 0,
                keys;

            $.each(inst.options.wheels, function(j, wg) {
                $.each(wg, function(k, w) {
                    w = w.values ? w : convert(w);
                    keys = w.keys || w.values;
                    if ($.inArray(val[i], keys) !== -1) {
                        ret.push(val[i]);
                    } else {
                        ret.push(keys[0]);
                    }
                    i++;
                });
            });
            return ret;
        },

        /**
         * Positions the scroller on the screen.
         */
        position: function(check) {

            var nw = this.persp.width(), // To get the width without scrollbar
                nh = this.$window[0].innerHeight || this.$window.innerHeight(),
                positionEvent = new $.Event(this.events.position);

            this.element.trigger(positionEvent, [this.dialWheel, nw, nh]);

            if (!(this.windowWidth === nw && this.windowHeight === nh && check) && !this.preventPos && this.modal && !positionEvent.isDefaultPrevented()) {
                var w,
                    l,
                    t,
                    dh,
                    scroll,
                    totalw = 0,
                    minw = 0,
                    classes = this.classes,
                    dialWheelClass = classes.dialWheel,
                    dialWheelContentClass = classes.dialWheelContent,
                    wheelWrapperClass = classes.wheelWrapper,
                    sl = this.$window.scrollLeft(),
                    st = this.$window.scrollTop(),
                    wr = $('.'+wheelWrapperClass, this.dialWheel),
                    d = $('.'+dialWheelClass, this.dialWheel),
                    css = {};

                if (/modal/.test(this.options.display)) {
                    $('.'+dialWheelContentClass, this.dialWheel).each(function() {
                        w = $(this).outerWidth(true);
                        totalw += w;
                        minw = (w > minw) ? w : minw;
                    });
                    w = totalw > nw ? minw : totalw;
                    wr.width(w).css('white-space', totalw > nw ? '' : 'nowrap');
                }

                this.modelWidth = d.outerWidth();
                this.modelHeight = d.outerHeight(true);
                lock = this.modelHeight <= nh && this.modelWidth <= nw;

                this.scrollLock = lock;

                if (this.options.display == 'modal') {
                    l = (nw - this.modelWidth) / 2;
                    t = st + (nh - this.modelHeight) / 2;
                } else {
                    if (this.options.display == 'top') {
                        t = st;
                    } else if (this.options.display == 'bottom') {
                        t = st + nh - this.modelHeight;
                    }
                }

                css.top = t < 0 ? 0 : t;
                css.left = l;
                d.css(css);

                // If top + modal height > doc height, increase doc height
                this.persp.height(0);
                dh = Math.max(t + this.modelHeight, this.options.context == 'body' ? $(document).height() : this.$document.scrollHeight);
                this.persp.css({ height: dh, left: sl });

                // Scroll needed
                if (scroll && (t + this.modelHeight > st + nh)) {
                    this.preventPos = true;
                    setTimeout(function() {
                        self.preventPos = false;
                    }, 300);
                    this.$window.scrollTop(Math.min(t + this.modelHeight - nh, dh - nh));
                }
            }

            this.windowWidth = nw;
            this.windowHeight = nh;
        },

        /**
         * Set button handler.
         */
        select: function() {
            if (this.hide(false, 'set') !== false) {
                this._setVal(true, true, 0, true);
                this.element.trigger(this.events.select, [this.val]);
            }
        },

        /**
         * Gets the selected wheel values, formats it, and set the value of the scroller instance.
         * If input parameter is true, populates the associated input element.
         * @param {Array} values Wheel values.
         * @param {Boolean} [fill=false] Also set the value of the associated input element.
         * @param {Number} [time=0] Animation time
         * @param {Boolean} [temp=false] If true, then only set the temporary value.(only scroll there but not set the value)
         */
        setValue: function(values, fill, time, temp, change) {
            this.temp = $.isArray(values) ? values.slice(0) : this.parseValue.call(this.element[0], values + '', this);
            this._setVal(fill, change === undefined ? fill : change, time, false, temp);
        },

        /**
         * Shows the scroller instance.
         * @param {Boolean} prevAnim - Prevent animation if true
         */
        show: function(prevAnim) {
            // Create wheels
            var label,
                options = this.options,
                classes = this.classes,
                animatePrefix = classes.animatePrefix,
                animateInClass = classes.animateIn,
                dialWheelClass = classes.dialWheel,
                dialWheelBottomButtonGroupClass = classes.dialWheelBottomButtonGroup,
                dialWheelContentClass = classes.dialWheelContent,
                dialWheelHeaderClass = classes.dialWheelHeader,
                overlayClass = classes.overlay,
                transformClass = classes.transform,
                wheelClass = classes.wheel,
                wheelButtonClass = classes.wheelButton,
                wheelButtonStyleClass = classes.wheelButtonStyle,
                wheelLabelClass = classes.wheelLabel,
                wheelHideLabelClass = classes.wheelHideLabel,
                wheelItemListClass = classes.wheelItemList,
                wheelItemListWrapperClass = classes.wheelItemListWrapper,
                wheelWrapperClass = classes.wheelWrapper,
                wheelIndex = 0,
                mAnim = '', self = this;

            if (options.disabled || this.visible) {
                return;
            }

            if (options.display == 'top') {
                this.animation = 'slidedown';
            }

            if (options.display == 'bottom') {
                this.animation = 'slideup';
            }

            // Parse value from input
            this._read();

            this.element.trigger(this.events.beforeShow);

            if (this.animation && !prevAnim) {
                mAnim = animatePrefix + this.animation + ' '+animateInClass;
            }

            // Create wheels containers
            var html = '<div role="dialog" class="' + options.theme +' dw-' + options.display +
                    (prefix ? ' dw' + prefix.replace(/\-$/, '') : '') + (this.hasButtons ? '' : ' dw-nobtn') + '">' +
                    '<div class="dw-persp">' +
                    (!this.modal ? '<div class="dw panel panel-default">' : '<div class="dwo"></div><div class="dw panel panel-default ' + mAnim + '" style="margin-bottom:auto">') +
                (this.options.headerText?'<div aria-live="assertive" class="'+dialWheelHeaderClass + ' text-center"></div>':'')+
                    '<div class="'+wheelWrapperClass+'">',
                isMinw = $.isArray(options.minWidth),
                isMaxw = $.isArray(options.maxWidth),
                isFixw = $.isArray(options.fixedWidth);

            $.each(this.options.wheels, function(i, wheelGroup) { // Wheel groups
                html += '<div class="' +dialWheelContentClass+ (options.showLabel ? '' : ' '+wheelHideLabelClass) +'">' +
                    '<table cellpadding="0" cellspacing="0"><tr>';

                $.each(wheelGroup, function(j, wheel) { // Wheels
                    self.wheels[wheelIndex] = wheel;
                    label = wheel.label !== undefined ? wheel.label : j;
                    html += '<td><div class="'+wheelClass+' '+wheelClass + wheelIndex + '">' +
                        '<div class="'+wheelLabelClass+'">' + label + '</div>' +
                        '<div tabindex="0" aria-live="off" aria-label="' + label + '" role="listbox">' +
                        '<div class="'+wheelItemListWrapperClass+'" style="height:' + (options.rows * self.height) + 'px;' +
                        (options.fixedWidth ?
                            ('width:' + (isFixw ? options.fixedWidth[wheelIndex] : options.fixedWidth) + 'px;') :
                            (options.minWidth ?
                                ('min-width:' + (isMinw ? options.minWidth[wheelIndex] : options.minWidth) + 'px;') :
                                'min-width:' + options.width + 'px;'
                            ) +
                            (options.maxWidth ? ('max-width:' + (isMaxw ? options.maxWidth[wheelIndex] : options.maxWidth) + 'px;') : '')
                        ) + '"><div class="'+wheelItemListClass+'">';
                    // Create wheel values
                    html += self._generateWheelItems(wheelIndex);
                    html += '</div></div><div class="dwwo" style="background: linear-gradient(#fff 0%,rgba(44,44,44,0) 52%, rgba(44,44,44,0) 48%, #fff 100%)"><div></div></div></td>';
                    wheelIndex++;
                });

                html += '</tr></table></div>';
            });

//           html += '</div>';

            if (this.modal && this.hasButtons) {
                html += '<div class="'+dialWheelBottomButtonGroupClass+'">';
                $.each(this.options.buttons, function(i, b) {
                    b = (typeof b === 'string') ? self.buttons[b] : b;
                    html += '<a class="' + wheelButtonClass+' '+wheelButtonStyleClass +' '+wheelButtonClass+i+ '" role="button">' +
                        b.text + '</a>';
                });
                html += '</div>';
            }
            html += '</div></div></div></div>';

            this.dialWheel = $(html);
            this.persp = $('.dw-persp', this.dialWheel);
            this.overlay = $('.'+overlayClass, this.dialWheel);

            this.visible = true;

            this._scrollToPos();

            this.element.trigger(this.events.markupReady, [this.dialWheel]);

            // Show
            if (this.modal) {

                this.dialWheel.appendTo(options.context);
                if (this.animation && !prevAnim) {
                    this.dialWheel.addClass(transformClass);
                    // Remove animation class
                    setTimeout(function() {
                        self.dialWheel.removeClass(transformClass).find('.'+dialWheelClass).removeClass(mAnim);
                    }, 350);
                }
            } else if (this.element.is('div')) {
                this.element.html(this.dialWheel);
            } else {
                this.dialWheel.insertAfter(this.element);
            }

            this.element.trigger(this.events.markupInserted);

            if (this.modal) {
                // Enter / ESC
                $(window).on('keydown.dw', function(e) {
                    if (e.keyCode == 13) {
                        self.select();
                    } else if (e.keyCode == 27) {
                        self.cancel();
                    }
                });

                // Prevent scroll if not specified otherwise
                if (options.scrollLock) {
                    this.dialWheel.on('touchmove', function(e) {
                        if (lock) {
                            e.preventDefault();
                        }
                    });
                }

                // Disable inputs to prevent bleed through (Android bug) and set autocomplete to off (for Firefox)
                $('input,select,button', this.$document).each(function() {
                    if (!this.disabled) {
                        if ($(this).attr('autocomplete')) {
                            $(this).data('autocomplete', $(this).attr('autocomplete'));
                        }
                        $(this).addClass('dwtd').prop('disabled', true).attr('autocomplete', 'off');
                    }
                });

                this._attachPosition('scroll.dw', true);
            }

            // Set position
            this.position();
            this._attachPosition('orientationchange.dw resize.dw', false);

            // Events
            this.dialWheel.on('DOMMouseScroll mousewheel', '.dwwl', proxy(this._onScroll, this))
                .on('keydown', proxy(this._onKeyDown, this))
                .on('keyup', proxy(this._onKeyUp, this))
                .on('selectstart mousedown', prevdef) // Prevents blue highlight on Android and text selection in IE
                .on('click', '.dwb-e', null, prevdef)
                .on('touchend', function() {
                    if (options.tap) {
                        setTap();
                    }
                })
                .on('keydown', '.dwb-e', null, function(e) {
                    if (e.keyCode == 32) { // Space
                        e.preventDefault();
                        e.stopPropagation();
                        $(this).click();
                    }
                });

            setTimeout(function() {
                // Init buttons
                $.each(self.options.buttons, function(i, b) {
                    self.tap($('.'+wheelButtonClass + i, self.dialWheel), function(e) {
                        b = (typeof b === 'string') ? self.buttons[b] : b;
                        b.handler.call(self, e, self);
                    });
                });

                if (options.closeOnOverlay) {
                    self.tap(self.overlay, function() {
                        self.cancel();
                    });
                }

                self.dialWheel.on(START_EVENT, '.dwwl', proxy(self._onStart, self))
                    .on(START_EVENT, '.dwb-e', proxy(self._onBtnStart, self));

            }, 300);

            this.element.trigger(this.events.show, [this.dialWheel, this.formattedValue])
        },

        /**
         * Attach tap event to the given element.
         */
        tap: function(element, handler) {
            var startX,
                startY;

            if (this.options.tap) {
                element.on('touchstart.dw mousedown.dw',function(e) {
                    e.preventDefault();
                    startX = getCoord(e, 'X');
                    startY = getCoord(e, 'Y');
                }).on('touchend.dw', function(e) {
                        // If movement is less than 20px, fire the click event handler
                        if (Math.abs(getCoord(e, 'X') - startX) < 20 && Math.abs(getCoord(e, 'Y') - startY) < 20) {
                            handler.call(this, e);
                        }
                        setTap();
                    });
            }

            element.on('click.dw', function(e) {
                if (!tap) {
                    // If handler was not called on touchend, call it on click;
                    handler.call(this, e);
                }
                e.preventDefault();
            });

        }
    });

})(jQuery);