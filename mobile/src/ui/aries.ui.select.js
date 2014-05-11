/**
 * Created by chenshj on 14-2-2.
 */
(function($){
    var proxy = $.proxy,
        timer;

    aries.ui('aries.ui.select', aries.ui.scroller, {

        role:'select',

        options: {
            inputClass: '',
            invalid: [],
            rtl: false,
            showInput: true,
            group: false,
            groupLabel: 'Groups'
        },

        _create: function() {
            var self = this;

            this.multiple = this.element.prop('multiple');
            this.option = this.multiple ? (this.element.val() ? this.element.val()[0] : $('option', this.element).attr('value')) : this.element.val();
            this.group = this.element.find('option[value="' + this.option + '"]').parent();
            this.invalid = [];
            this.origValues = [];
            this.main = {};
            this.prevent = null;
            this.readOnlyPre = this.options.readonly;
            this.prev = this.group.index() + '';
            this.gr = this.prev;

            var id = this.element[0].id + '_dummy',
                l1=$('label[for="' + this.element[0].id + '"]').attr('for', id),
                l2 = $('label[for="' + id + '"]');
            this.label = this.options.label !== undefined ? this.options.label : (l2.length ? l2.text() : this.element.attr('name'));
            this.input = $('<input type="text" id="' + id + '" class="' + this.options.inputClass + '" readonly />');


            // if groups is true and there are no groups fall back to no grouping
            if (this.options.group && !$('optgroup', this.element).length) {
                this.options.group = false;
            }

            if (!this.options.invalid.length) {
                this.options.invalid = this.invalid;
            }

            if (this.options.group) {
                if (this.options.rtl) {
                    this.grIdx = 1;
                    this.optIdx = 0;
                } else {
                    this.grIdx = 0;
                    this.optIdx = 1;
                }
            } else {
                this.grIdx = -1;
                this.optIdx = 0;
            }

            $('#' + id).remove();

            this.input = $('<input type="text" id="' + id + '" class="' + this.options.inputClass + '" readonly />');

            if (this.options.showInput) {
                this.input.insertBefore(this.element);
            }

            $('option', this.element).each(function() {
                self.main[$(this).attr('value')] = $(this).text();
            });

            this._super();

            this.attachShow(this.input);

            var v = this.element.val() || [],
                i = 0;

            for (i; i < v.length; i++) {
                this._selectedValues[v[i]] = v[i];
            }

            this._setSelectVal(this.main[this.option]);

            this.element.off('.dwsel').on('change.dwsel',function() {
                if (!self.prevent) {
                    self.setValue(self.multiple ? self.element.val() || [] : [self.element.val()], true);
                }
                self.prevent = false;
            }).addClass('dw-hsel').attr('tabindex', -1).closest('.ui-field-contain').trigger('create');

            // Extended methods
            // ---

            if (!this._setValue) {
                this._setValue = this.setValue;
            }

            this.element.on(this.events.beforeShow, proxy(this._onBeforeShow, this))
                .on(this.events.clear, proxy(this._onClear, this))
                .on(this.events.markupReady, proxy(this._onMarkupReady, this))
                .on(this.events.valueTap, proxy(this._onValueTap, this))
                .on(this.events.select, proxy(this._onSelect, this))
                .on(this.events.cancel, proxy(this._onCancel, this))
                .on(this.events.change, proxy(this._onChange, this))
                .on(this.events.destroy, proxy(this._onDestroy, this));
        },

        _genWheels: function() {
            var cont,
                wg = 0,
                values = [],
                keys = [],
                w = [
                    []
                ],
                self = this;

            if (this.options.group) {
                if (this.options.rtl) {
                    wg = 1;
                }

                $('optgroup', this.element).each(function(i) {
                    values.push($(this).attr('label'));
                    keys.push(i);
                });

                w[wg] = [
                    {
                        values: values,
                        keys: keys,
                        label: this.options.groupLabel
                    }
                ];

                cont = this.group;
                wg += (this.options.rtl ? -1 : 1);

            } else {
                cont = this.element;
            }

            values = [];
            keys = [];

            $('option', cont).each(function() {
                var v = $(this).attr('value');
                values.push($(this).text());
                keys.push(v);
                if ($(this).prop('disabled')) {
                    self.invalid.push(v);
                }
            });

            w[wg] = [
                {
                    values: values,
                    keys: keys,
                    label: this.label
                }
            ];

            return w;
        },

        _onBeforeShow: function(event) {
            var self = this;
            if (this.multiple && this.options.counter) {
                this.options.headerText = function() {
                    var length = 0;
                    $.each(self._selectedValues, function() {
                        length++;
                    });
                    return length + " " + self.options.selectedText;
                };
            }
            this.options.wheels = this._genWheels();
            if (this.options.group) {
                this.temp = this.options.rtl ? [this.option, this.group.index()] : [this.group.index(), this.option];
            }
        },

        _onCancel: function() {
            if (this.options.group) {
                this.values = null;
            }
            if (!this.live && this.multiple) {
                this._selectedValues = $.extend({}, this.origValues);
            }
        },

        _onChange: function(event, v) {
            if (this.live && !this.multiple) {
                this.input.val(v);
                this.prevent = true;
                this.element.val(this.temp[this.optIdx]).change();
            }
        },

        _onClear: function(event, dw) {
            this._selectedValues = {};
            this.input.val('');
            $('.dwwl' + this.optIdx + ' .dw-li', dw).removeClass('dw-msel').removeAttr('aria-selected');
        },

        _onDestroy: function() {
            this.input.remove();
            this.element.removeClass('dw-hsel').removeAttr('tabindex');
        },

        _onMarkupReady: function(event, dw) {
            dw.addClass('dw-select');
            $('.dwwl' + this.grIdx, dw).on('mousedown touchstart', function() {
                clearTimeout(timer);
            });
            if (this.multiple) {
                dw.addClass('dwms');
                $('.dwwl', dw).eq(this.optIdx).addClass('dwwms').attr('aria-multiselectable', 'true');
                $('.dwwl', dw).on('keydown', function(e) {
                    if (e.keyCode == 32) { // Space
                        e.preventDefault();
                        e.stopPropagation();
                        onTap($('.dw-sel', this));
                    }
                });
                this.origValues = $.extend({}, this._selectedValues);
            }
        },

        _onValueTap: function(event, li) {
            if (this.multiple && li.hasClass('dw-v') && li.closest('.dw').find('.dw-ul').index(li.closest('.dw-ul')) == this.optIdx) {
                var val = li.attr('data-val'),
                    selected = li.hasClass('dw-msel');

                if (selected) {
                    li.removeClass('dw-msel').removeAttr('aria-selected');
                    delete this._selectedValues[val];
                } else {
                    li.addClass('dw-msel').attr('aria-selected', 'true');
                    this._selectedValues[val] = val;
                }

                if (this.live) {
                    this._setSelectVal(val, true, true);
                }
                return false;
            }
        },

        _onSelect: function(event,v) {
            this._setSelectVal(v, true, true);
            if (this.options.group) {
                this.values = null;
            }
        },

        _setSelectVal: function(v, fill, change) {
        var value = [];

        if (this.multiple) {
            var sel = [],
                i = 0;

            for (i in this._selectedValues) {
                sel.push(this.main[i]);
                value.push(i);
            }

            this.input.val(sel.join(', '));
        } else {
            this.input.val(v);
            value = fill ? this.values[this.optIdx] : null;
        }

        if (fill) {
            this.element.val(value);
            if (change) {
                this.prevent = true;
                this.element.change();
            }
        }
    },

        formatResult: function(d) {
            return this.main[d[this.optIdx]];
        },

        getValue : function(temp) {
            var val = temp ? this.temp : this.values;
            return val[this.optIdx];
        },

        parseValue: function() {
            var v = this.element.val() || [],
                i = 0;

            if (this.multiple) {
                this._selectedValues = {};
                for (i; i < v.length; i++) {
                    this._selectedValues[v[i]] = v[i];
                }
            }

            this.option = this.multiple ? (this.element.val() ? this.element.val()[0] : $('option', this.element).attr('value')) : this.element.val();

            this.group = this.element.find('option[value="' + this.option + '"]').parent();
            this.gr = this.group.index();
            this.prev = this.gr + '';
            return this.options.group && this.options.rtl ? [this.option, this.gr] : this.options.group ? [this.gr, this.option] : [this.option];
        },

        setValue : function(d, fill, time, temp, change) {
            var value,
                v = $.isArray(d) ? d[0] : d;

            this.option = v !== undefined ? v : $('option', this.element).attr('value');

            if (this.multiple) {
                this._selectedValues = {};
                var i = 0;
                for (i; i < d.length; i++) {
                    this._selectedValues[d[i]] = d[i];
                }
            }

            if (this.options.group) {
                this.group = this.element.find('option[value="' + this.option + '"]').parent();
                this.gr = this.group.index();
                value = this.options.rtl ? [this.option, this.group.index()] : [this.group.index(), this.option];
                if (this.gr !== this.prev) { // Need to regenerate wheels, if group changed
                    this.options.wheels = this._genWheels();
                    this.changeWheel([this.optIdx]);
                    this.prev = this.gr + '';
                }
            } else {
                value = [this.option];
            }

            this._setValue(value, fill, time, temp, change);

            // Set input/select values
            if (fill) {
                var changed = this.multiple ? true : this.option !== this.element.val();
                this._setSelectVal(this.main[this.option], changed, change);
            }
        },

        validate: function(dw, i, time) {
            var self = this;
            if (i === undefined && this.multiple) {
                var v = this._selectedValues,
                    j = 0;

                $('.dwwl' + this.optIdx + ' .dw-li', dw).removeClass('dw-msel').removeAttr('aria-selected');

                for (j in v) {
                    $('.dwwl' + this.optIdx + ' .dw-li[data-val="' + v[j] + '"]', dw).addClass('dw-msel').attr('aria-selected', 'true');
                }
            }

            if (i === this.grIdx) {
                this.gr = this.temp[this.grIdx];
                if (this.gr !== this.prev) {
                    this.group = this.element.find('optgroup').eq(this.gr);
                    this.gr = this.group.index();
                    this.option = this.group.find('option').eq(0).val();
                    this.option = this.option || this.element.val();
                    this.options.wheels = this._genWheels();
                    if (this.options.group) {
                        this.temp = this.options.rtl ? [this.option, this.gr] : [this.gr, this.option];
                        this.options.readonly = [this.options.rtl, !this.options.rtl];
                        clearTimeout(timer);
                        timer = setTimeout(function() {
                            self.changeWheel([self.optIdx], undefined, true);
                            self.options.readonly = self.readOnlyPre;
                            self.prev = self.gr + '';
                        }, time * 1000);
                        return false;
                    }
                } else {
                    this.options.readonly = this.readOnlyPre;
                }
            } else {
                this.option = this.temp[this.optIdx];
            }
            var t = $('.dw-ul', dw).eq(this.optIdx);
            $.each(this.options.invalid, function(i, v) {
                $('.dw-li[data-val="' + v + '"]', t).removeClass('dw-v');
            });
        }
    });
})(jQuery);