//>>excludeStart("ariesBuildExclude", pragmas.ariesBuildExclude);
//>>description: UI插件
//>>description: 根据ui插件的命名空间，原型对象构造方法，原型扩展属性构造一个ui插件
//>>label: aries.ui: 创建ui插件
//>>group: Forms
//>>css.structure: ../css/structure/jquery.mobile.button.css
//>>css.theme: ../css/themes/default/jquery.mobile.theme.css
//define(["jquery"], function ($) {
//>>excludeEnd("ariesBuildExclude");
(function($, window, undefined) {
    'use strict';
    window.aries = window.aries || {};

    /**
     * 创建ui插件
     * @param name 控件名称，包括命名空间
     * @param Base 原型对象构造方法
     * @param prototype 原型扩展属性
     */
    window.aries.ui = function(name, Base, prototype) {
        var basePrototype,
            constructor,
            nameObject = this.parseWidgetName(name),
            namespace = nameObject.namespace,
            fullName = nameObject.fullName;

        name = nameObject.name;
        //传入两个参数时，第二个参数作为prototype，使用this.Default作为继承基类
        if (!prototype) {
            prototype = Base;
            Base = this.ui.Default;
        }

        if (typeof prototype === "function") {
            prototype = prototype.call();
        }

        constructor = namespace[ name ] = function(options, element) {
            if (arguments.length) {
                this['_construct'](options, element);
            }
        };

        basePrototype = new Base();

        basePrototype.options = this.extend({}, basePrototype.options);

        $.each(prototype, function(prop, value) {
            if ($.isFunction(value)) {
                prototype[ prop ] = (function() {
                    var _super = function() {
                            var params = Array.prototype.slice.call(arguments);
                            return Base.prototype[ prop ].apply(this, params);
                        },
                        _superApply = function(args) {
                            return Base.prototype[ prop ].apply(this, args);
                        };
                    return function() {
                        var __super = this['_super'],
                            __superApply = this['_superApply'],
                            returnValue;

                        this._super = _super;
                        this['_superApply'] = _superApply;

                        returnValue = value.apply(this, arguments);

                        this._super = __super;
                        this['_superApply'] = __superApply;

                        return returnValue;
                    };
                })();
            }
        });

        constructor.prototype = this.extend(basePrototype, prototype, {
            constructor: constructor,
            parentConstructor: Base,
            uiName: name,
            uiFullName: fullName,
            initSelector: prototype.initSelector || "[data-role='" + name + "']"
        });

        this.bridge(name, constructor);
    };

    $.extend(window.aries, {

        /**
         * 注册命名空间
         * @param name 包含命名空间的完整名称
         * @return {Object} 返回名称对象。
         *      包括namespace:命名空间；fullName:完整名称；name:插件名称。
         */
        parseWidgetName: function(name) {
            var nameParts = name.split("."),
                root = window, fullName = "";

            name = nameParts[nameParts.length - 1];

            for (var i = 0; i < nameParts.length - 1; i++) {
                if (!root[nameParts[i]]) {
                    root[nameParts[i]] = {};
                }
                root = root[nameParts[i]];

                if (fullName.length) {
                    fullName += "_";
                }
                fullName += nameParts[i];
            }
            fullName += "_" + name;

            return {
                namespace: root,
                fullName: fullName,
                name: name
            };
        },

        /**
         * 根据命名空间，查找并返回UI插件
         * @param namespace 命名空间
         * @return {*}
         */
        getUIByNamespace: function(namespace) {
            var nameParts = namespace.split("."), root = window;
            for (var i = 0; i < nameParts.length; i++) {
                if (!root[nameParts[i]]) {
                    return undefined;
                }
                root = root[nameParts[i]];
            }
            return root;
        },

        /**
         * 将插件桥接到jQuery对象上
         * @param name 插件名称
         * @param constructor 插件构造方法
         */
        bridge: function(name, constructor) {
            var combination = constructor.prototype.combination || [],
                fullName = constructor.prototype.uiFullName || name,
                self = this;

            if (combination.length) {
                $.each(combination, function(key, namespace) {
                    var plugTarget = self.getUIByNamespace(namespace);
                    if (!plugTarget) {
                        return;
                    }

                    var plugins = plugTarget.prototype.plugins = plugTarget.prototype.plugins || {};
                    plugins[name] = function(options, element) {
                        new constructor(options, element);
                    };
                });
            }
            else {
                $.fn[name] = function(options) {
                    var isMethodCall = typeof options === "string",
                    //获取调用方法名称
                        methodName = isMethodCall ? options : "",
                    //获取方法调用参数
                        args = isMethodCall ? Array.prototype.slice.call(arguments, 1) : [],
                        returnValue = this;

                    this.each(function() {
                        var instance = $.data(this, fullName);
                        if (isMethodCall) {
                            if (!instance) {
                                return $.error("插件'" + name + "'未初始化前不能调用'" + methodName + "'方法。");
                            }
                            if (!$.isFunction(instance[methodName]) || methodName.charAt(0) === "_") {
                                return $.error("在插件对象上未找到'" + methodName + "'方法。");
                            }
                            var methodResult = instance[methodName].apply(instance, args);
                            if (methodResult !== instance && methodResult !== undefined) {
                                returnValue = methodResult && methodResult.jquery ?
                                    returnValue.pushStack(methodResult.get()) : methodResult;
                            }
                        }
                        else {
                            if (instance) {
                                instance.setOption(options || {}, undefined);
                            }
                            else {
                                new constructor(options, this);
                            }
                        }
                        return this;
                    });
                    return returnValue;
                };
            }
        },

        /**
         * 通用扩展方法
         * @param target
         * @return {*}t
         */
        extend: function(target) {
            var input = Array.prototype.slice.call(arguments, 1),
                inputIndex = 0, inputLength = input.length, key, value;

            for (; inputIndex < inputLength; inputIndex++) {
                for (key in input[ inputIndex ]) {
                    if (input[ inputIndex ].hasOwnProperty(key)) {
                        value = input[ inputIndex ][ key ];
                        if (value !== undefined) {
                            // Clone objects
                            if ($.isPlainObject(value)) {
                                target[ key ] = $.isPlainObject(target[ key ]) ?
                                    this.extend({}, target[ key ], value) :
                                    // Don't extend strings, arrays, etc. with objects
                                    this.extend({}, value);
                                // Copy everything else by reference
                            }
                            else {
                                target[ key ] = value;
                            }
                        }
                    }
                }
            }
            return target;
        },

        protoProperty: "_aries_prototype_"
    });

})(window['jQuery'], window);
//>>excludeStart("ariesBuildExclude", pragmas.ariesBuildExclude);
//});
//>>excludeEnd("ariesBuildExclude");