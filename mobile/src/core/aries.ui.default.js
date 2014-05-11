//>>excludeStart("ariesBuildExclude", pragmas.ariesBuildExclude);
//>>description: UI插件默认基类
//define(["aries_ui", "aries_ui_export"], function ($) {
//>>excludeEnd("ariesBuildExclude");
(function($, aries, undefined) {
    'use strict';
    var uuid = 0;

    /**
     * 加载UI插件
     * @param widget 插件对象实例
     * @param plugins UI插件的子插件集合
     */
    function loadPlugins (widget, plugins) {
        if (plugins) {
            for (var key in plugins) {
                if (plugins.hasOwnProperty(key)) {
                    plugins[key].call(widget, widget.options, widget.element[0]);
                }
            }
        }
    }

    /**
     * UI插件默认基类
     * @constructor
     */
    aries.ui.Default = function() {
    };

    aries.ui.Default.prototype = {

        /**
         * 初始化选择器，如果没有特别指定，默认的初始化选择器为"[data-role=''widgetName]"
         */
        initSelector: "",

        /**
         * 组合目标数组，该数组的值是父插件的命名空间字符串，用来标记该插件
         * 是另一插件的子插件。该插件将被连接到combination数组中标记的父插
         * 件中，随父插件一起初始化，不再被赋值到jQuery.fn对象中。
         */
        combination: [],

        refreshHandler: {},

        /**
         * 初始化标记，与DOM中Html标签上的自定义属性data-role配合使用。
         * 页面初始化时，由统一的事件处理DOM元素的初始化，自定义属性data-role
         * 与该属性相同的DOM元素将被引用该插件。
         */
        role: null,

        /**
         * 插件初始化配置选项
         * 该对象将做为可识别的Html自定义属性的标准接口，可与Html标签中同名的
         * 自定义属性合并，不在该对象范围的Html自定义属性将不被识别。
         */
        options: {
            /**
             * 是否可用
             */
            enabled: true,
            /**
             * 是否可见
             */
            visible: true
        },

        /**
         * 插件CSS类对象，该对象用来标记插件中使用的样式，对象的属性名应使用
         * 易于理解的语义化的名称，对象的属性值为CSS样式中的类名，可以是缩写
         * 或者被压缩的类名，也可以是多个类名的组合，中间用空格隔开。
         */
        classes: null,

        /**
         * 对外提供事件对象
         */
        events: {
            create: "create"
        },

        /**
         * 插件内部元素选择器对象
         * 用于定义访问插件内部DOM结构时的通用选择器，该选择器已插件DOM元素
         * 的根节点（this.root）为根书写，可供this._find(select)方法调用。
         */
        selectors: null,

        /**
         * UI插件名称
         */
        uiName: "default",

        /**
         * UI插件默认Dom元素
         */
        defaultElement: "<div></div>",

        /**
         * UI插件构造方法，初始化配置信息，调用插件创建方法
         * @param options 配置信息
         * @param element UI控件Dom元素
         * @private
         */
        _construct: function(options, element) {
            element = $(element || this.defaultElement)[ 0 ];
            this.element = $(element);
            this._events = {};
            this.root = this._getRoot();
            this.uuid = uuid++;
            this.id = this.element.attr("id") ? this.element.attr("id") : this.uiName + this.uuid;
            this.eventNamespace = "." + this.uiName + this.uuid;
            this.options = aries.extend({},
                this.options,
                this._getCreateOptions(),
                options);

            if (this._create() === false) {
                return;
            }

            this._exportInstanceToDom(this);
            loadPlugins.call(this, this, this.plugins);
            this.element
                .on("remove", $.proxy(function(event) {
                    if (event.target === element) {
                        this.destroy();
                    }
                }, this))
                .trigger(this.events.create, this._getCreateEventData());
            this._init();
        },

        /**
         * UI控件创建方法，在_construct方法中调用，用于创建或修改Dom以及绑定事件
         */
        _create: $.noop,

        /**
         * UI控件初始化方法，在_create方法之后调用
         */
        _init: function() {
            //            $.each(this.options, $.proxy(this.refresh, this));
        },

        /**
         * UI插件create事件附件数据扩展
         * 抛出插件create事件时，会调用该方法获取需要附件在事件参数中的数据
         */
        _getCreateEventData: $.noop,

        /**
         *UI插件构造时，配置信息扩展方法
         * 初始化配置信息时，该方法返回的配置信息，会附件到插件的全局配置中
         * 默认实现里，该方法仅返回与options中的属性同名的HtmlDom标签上的属性。
         */
        _getCreateOptions: function() {
            var options = {}, self = this;
            $.each(this.options, function(key) {
                var value = self.element.data(key) || self.element.data(String(key).toLowerCase());
                if (value !== undefined) {
                    options[key] = value;
                }
            });
            return options;
        },

        /**
         * 定义插件根节点DOM，默认值为this.Element。
         * 该方法将在插件初始化时，由_constructor方法调用，可以在子类中复写。
         * @returns {*}
         * @private
         */
        _getRoot: function() {
            return this.element;
        },

        /**
         * UI插件销毁方法，在插件对应的DOM节点被移除时调用
         * 该方法负责释放插件占用的资源，以及恢复插件创建时，修改的DOM元素
         */
        _destroy: $.noop,

        /**
         * UI插件销毁方法
         */
        destroy: function() {

        },

        /**
         * 根据key获取配置属性
         * @param key 属性名称
         * @returns {*}
         */
        getOption: function(key) {
            if (arguments.length === 0) {
                // don't return a reference to the internal hash
                return aries.ui.extend({}, this.options);
            }
            if (this.options.hasOwnProperty(key)) {
                return this.options[key];
            }
            else {
                return $.error("插件'" + this.uiName + "'未提供'" + key + "'配置属性");
            }
        },

        /**
         * 设置插件的配置属性，可以通过key/value形式设置，也可以通过属性对象
         * 的形式设置。当key为字符串形式时，也可以支持嵌套属性，key值使用“.”
         * 分割，例如："foo.bar" => { foo: { bar: ___ } }
         * @param key 属性名
         * @param value 属性值
         * @returns {*}
         */
        setOption: function(key, value) {
            var options = key, parts, curOption, i;
            //如果传入的key为字符串形式，仅表示为单个配置属性。
            if (typeof key === "string") {
                // handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
                options = {};
                //使用"."分割key字符串，以便支持嵌套属性。
                parts = key.split(".");
                key = parts.shift();
                if (parts.length) {
                    curOption = options[ key ] = aries.ui.extend({}, this.options[ key ]);
                    for (i = 0; i < parts.length - 1; i++) {
                        curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
                        curOption = curOption[ parts[ i ] ];
                    }
                    key = parts.pop();
                    if (value === undefined) {
                        return curOption[ key ] === undefined ? null : curOption[ key ];
                    }
                    curOption[ key ] = value;
                }
                else {
                    if (value === undefined) {
                        return this.options[ key ] === undefined ? null : this.options[ key ];
                    }
                    options[ key ] = value;
                }
            }

            this._setOptions(options);

            return this;
        },

        /**
         * 更新配置属性私有方法，更新插件options对象的同时，调用属性对应的更新方法
         * @param options 配置属性对象
         * @private
         */
        _setOptions: function(options) {
            var key, previousValue;
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    previousValue = this.options[key];
                    this.options[key] = options[key];
                    this.refresh(key, previousValue);
                }
            }
        },

        /**
         * 返回option对应属性的刷新对象，该对象的格式为：
         * {
         *     optionName：function(optionValue){}
         * }
         * @private
         */
        _getRefreshHandler: function() {

        },

        /**
         * 自插件DOM根节点向下查找插件各组成部分，必须配合插件Selectors对象
         * 使用。该方法使用插件的Selectors对象上事先定义好的选择器进行查找，方
         * 法的参数为Selectors对象中属性的Key。
         * @param name Selectors对象上定义的选择器名称
         * @returns {*} 插件内部组成部件
         * @private
         */
        _find: function(name) {
            if (this.selectors[name]) {
                var selector = this.selectors[name];
                if ($.isFunction(this.selectors[name])) {
                    selector = this.selectors[name].call(this);
                }
                return this.root.find(selector);
            }
        },

        /**
         * 插件刷新方法，该方法由具体插件实现，并调用插件属性各自对应的刷新处理函数
         * @param propToRefresh 待刷新属性名称
         * @param previousValue 刷新前的值
         */
        refresh: function(propToRefresh, previousValue) {
            var parent = this.parentConstructor,
                latestValue = this.options[propToRefresh],
                refreshHandler = this._getRefreshHandler();

            if (!refreshHandler || !refreshHandler.hasOwnProperty(propToRefresh)) {
                while (parent) {
                    if (parent.prototype.hasOwnProperty("_getRefreshHandler")) {
                        refreshHandler = parent.prototype["_getRefreshHandler"].call(this);
                        if (refreshHandler && refreshHandler.hasOwnProperty(propToRefresh)) {
                            break;
                        }
                    }
                    parent = parent.prototype.parentConstructor;
                }
            }

            if (refreshHandler && refreshHandler.hasOwnProperty(propToRefresh) &&
                latestValue !== undefined && latestValue !== null) {
                refreshHandler[propToRefresh].call(this, latestValue, previousValue);
            }
        },

        bind: function(eventName, handlers, one) {
            var idx,
                eventNames = typeof eventName === "string" ? [eventName] : eventName,
                length,
                original,
                handler,
                handlersIsFunction = typeof handlers === "function",
                events;

            function makeNewHandler () {
                return function() {
                    this.unbind(eventName, handler);
                    original.apply(this, arguments);
                };
            }

            for (idx = 0, length = eventNames.length; idx < length; idx++) {
                eventName = eventNames[idx];

                handler = handlersIsFunction ? handlers : handlers[eventName];

                if (handler) {
                    if (one) {
                        original = handler;
                        handler = makeNewHandler();
                    }
                    events = this._events[eventName] = this._events[eventName] || [];
                    events.push(handler);
                }
            }

            return this;
        },

        one: function(eventNames, handlers) {
            return this.bind(eventNames, handlers, true);
        },

        first: function(eventName, handlers) {
            var idx,
                eventNames = typeof eventName === "string" ? [eventName] : eventName,
                length,
                handler,
                handlersIsFunction = typeof handlers === "function",
                events;

            for (idx = 0, length = eventNames.length; idx < length; idx++) {
                eventName = eventNames[idx];

                handler = handlersIsFunction ? handlers : handlers[eventName];

                if (handler) {
                    events = this._events[eventName] = this._events[eventName] || [];
                    events.unshift(handler);
                }
            }

            return this;
        },

        trigger: function(eventName, e) {
            var events = this._events[eventName],
                idx,
                length,
                isDefaultPrevented = false;

            if (events) {
                e = e || {};

                e.sender = this;

                e.preventDefault = function() {
                    isDefaultPrevented = true;
                };

                e.isDefaultPrevented = function() {
                    return isDefaultPrevented;
                };

                events = events.slice();

                //Do not cache the length of the events array as removing events attached through one will fail
                for (idx = 0, length = events.length; idx < length; idx++) {
                    events[idx].call(this, e);
                }
            }

            return isDefaultPrevented;
        },

        unbind: function(eventName, handler) {
            var events = this._events[eventName],
                idx,
                length;

            if (eventName === undefined) {
                this._events = {};
            } else if (events) {
                if (handler) {
                    for (idx = 0, length = events.length; idx < length; idx++) {
                        if (events[idx] === handler) {
                            events.splice(idx, 1);
                        }
                    }
                } else {
                    this._events[eventName] = [];
                }
            }

            return this;
        }
    };

    aries.exportable.call(aries.ui.Default.prototype);

})(window.jQuery, window.aries);
//>>excludeStart("ariesBuildExclude", pragmas.ariesBuildExclude);
//});
//>>excludeEnd("ariesBuildExclude");
