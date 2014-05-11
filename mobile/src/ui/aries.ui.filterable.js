/**
 * Created by chenshj on 2014/5/10.
 */
(function($, aries) {
    'use strict';

    var beforeFilter = 'beforeFilter',
        filter = 'filter',
        defaultFilterCallback = function(index, searchValue) {
            return (( "" + ( this.getAttribute("filtertext") || $(this).text()))
                .toLowerCase().indexOf(searchValue) === -1 );
        };

    aries.ui("aries.ui.pfilterable", aries.ui.Default, {

        initSelector: "[data-filter='true']",

        options: {

            filterReveal: false,

            filterCallback: defaultFilterCallback,

            enhanced: false,

            input: null,

            children: ">a, > li, > option, > optgroup option, > tbody tr"
        },

        _create: function() {
            var opts = this.options;

            $.extend(this, {
                _search: null,
                _timer: 0
            });

            this._setInput(opts.input);
            if (!opts.enhanced) {
                this._filterItems(( ( this._search && this._search.val() ) || "" ).toLowerCase());
            }
        },

        /**
         * 键盘事件响应方法，该方法中判断是否需要响应键盘事件进行过滤。
         * @private
         */
        _onKeyUp: function() {
            var val, lastValue,
                search = this._search, self = this;
            if (search) {
                val = search.val().toLowerCase();
                lastValue = search[0].getAttribute('data-lastval') + '';
                //仅在值发生变化后才执行后面的处理方法。
                if (lastValue && lastValue === val) {
                    return;
                }

                if (this._timer) {
                    window.clearTimeout(this._timer);
                    this._timer = 0;
                }

                this._timer = setTimeout(function() {
                    self.element.trigger(beforeFilter, {input: search});
                    // 将当前值保存入data-lastval属性，用于判断下次事件处理方法中是否需要执行过滤方法。
                    search[0].setAttribute("data-lastval", val);
                    self._filterItems(val);
                    self._timer = 0;
                }, 250);
            }
        },

        /**
         * 获取可过滤的子元素。
         * @returns {{length: number}}
         * @private
         */
        _getFilterableItems: function() {
            var children = this.options.children,
                items = !children ? { length: 0 } :
                    $.isFunction(children) ? children() :
                        children.nodeName ? $(children) :
                            children.jquery ? children : this.element.find(children);

            if (items.length === 0) {
                items = this.element;
            }

            return items;
        },

        /**
         * 过滤方法
         * @param val 待过滤的值
         * @private
         */
        _filterItems: function(val) {
            var idx, callback, length, dst,
                show = [],
                hide = [],
                opts = this.options,
                filterItems = this._getFilterableItems();

            if (val !== null) {
                callback = opts.filterCallback || defaultFilterCallback;
                length = filterItems.length;

                // Partition the items into those to be hidden and those to be shown
                for (idx = 0; idx < length; idx++) {
                    dst = ( callback.call(filterItems[ idx ], idx, val) ) ? hide : show;
                    dst.push(filterItems[ idx ]);
                }
            }

            // If nothing is hidden, then the decision whether to hide or show the items
            // is based on the "filterReveal" option.
            if (hide.length === 0) {
                filterItems[ opts.filterReveal ? "addClass" : "removeClass" ]("ui-screen-hidden");
            } else {
                $(hide).addClass("ui-screen-hidden");
                $(show).removeClass("ui-screen-hidden");
            }

            this._refreshChildWidget();

            this.element.trigger(filter, {items: filterItems});
        },

        /**
         * 刷新子插件，调用指定插件中的refresh方法。
         * @private
         */
        _refreshChildWidget: function() {
            var widget, idx,
                recognizedWidgets = [ "collapsibleset", "selectmenu", "controlgroup", "listview" ];

            for (idx = recognizedWidgets.length - 1; idx > -1; idx--) {
                widget = recognizedWidgets[ idx ];
                if (aries.ui[widget]) {
                    widget = this.element.data("aries_ui_"+widget);
                    if (widget && $.isFunction(widget.refresh)) {
                        widget.refresh();
                    }
                }
            }
        },

        _setInput: function(selector) {
            var search = this._search;

            // Stop a pending filter operation
            if (this._timer) {
                window.clearTimeout(this._timer);
                this._timer = 0;
            }

            if (search) {
                search.off("keyup change input");
                search = null;
            }

            if (selector) {
                search = selector.jquery ? selector : (selector.nodeName ? $(selector) : $(document).find(selector));
                search.on('keyup chang input', $.proxy(this._onKeyUp, this));
            }

            this._search = search;
        },

        _destroy: function() {
            var opts = this.options,
                items = this._getFilterableItems();

            if (opts.enhanced) {
                items.toggleClass("ui-screen-hidden", opts.filterReveal);
            } else {
                items.removeClass("ui-screen-hidden");
            }
        },

        refresh: function() {
            if (this._timer) {
                window.clearTimeout(this._timer);
                this._timer = 0;
            }
            this._filterItems(((this._search && this._search.val()) || "" ).toLowerCase());
        }
    });

})(jQuery, window.aries);