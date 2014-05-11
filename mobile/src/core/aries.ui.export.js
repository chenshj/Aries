//>>excludeStart("ariesBuildExclude", pragmas.ariesBuildExclude);
//>>description: UI插件
//>>description: 根据ui插件的命名空间，原型对象构造方法，原型扩展属性构造一个ui插件
//>>label: aries.ui: 创建ui插件
//>>group: Forms
//>>css.structure: ../css/structure/jquery.mobile.button.css
//>>css.theme: ../css/themes/default/jquery.mobile.theme.css
//define(["aries_ui"], function ($) {
//>>excludeEnd("ariesBuildExclude");
(function($, aries, undefined) {
    'use strict';
    var widgetKeyName = "aries_ui";

    $.fn.getInstance = function() {
        var instance = null,
            widgetKey;
        this.each(function() {
            widgetKey = this[widgetKeyName];
            if (widgetKey) {
                instance = $.data(this, widgetKey);
            }
        });
        if (!instance) {
            $.error("未定义UI插件。");
        }
        return instance;
    };

    $.fn.instanceInvoke = function(methodName) {
        var args = Array.prototype.slice.call(arguments, 1) || [],
            widgetKey,
            returnValue = null;
        this.each(function() {
            widgetKey = this[widgetKeyName];
            if (widgetKey) {
                var instance = $.data(this, widgetKey);
                if (!instance) {
                    $.error("插件'" + instance.uiName + "'未初始化前不能调用'" + methodName + "'方法。");
                }
                if (!$.isFunction(instance[methodName]) || methodName.charAt(0) === "_") {
                    $.error("在插件对象上未找到'" + methodName + "'方法。");
                }
                returnValue = instance[methodName].apply(instance, args);
            }
        });
        return returnValue;
    };

    //    function createInstanceAccessor (instance) {
    //        var exportObject = {},
    //            prototype = instance.constructor.prototype;
    //
    //        attachPropertyOrFunctionToAccessor(exportObject, instance, instance);
    //        while (prototype) {
    //            attachPropertyOrFunctionToAccessor(exportObject, prototype, instance);
    //            var parentConstructor = prototype.parentConstructor;
    //            prototype = parentConstructor ? parentConstructor.prototype : undefined;
    //        }
    //        return exportObject;
    //    }

    //    function attachPropertyOrFunctionToAccessor (accessor, instanceOrPrototype, instance) {
    //        accessor = accessor || {};
    //        $.each(instanceOrPrototype, function(prop, value) {
    //            if (prop.charAt(0) !== "_") {
    //                if ($.isPlainObject(value)) {
    //                    accessor[prop] = accessor[prop] || value;
    //                }
    //                else if ($.isFunction(value)) {
    //                    accessor[prop] = accessor[prop] || (function() {
    //                        var methodOwner = instanceOrPrototype, methodCaller = instance;
    //                        return function() {
    //                            var params = Array.prototype.slice.call(arguments);
    //                            return methodOwner[prop].apply(methodCaller, params);
    //                        };
    //                    })();
    //                }
    //            }
    //        });
    //    }

    function exportInstanceToDom (instance) {
        //        var instanceAccessor = createInstanceAccessor(instance);
        var element = instance.element[0];

        element[widgetKeyName] = instance.uiFullName || instance.uiName;
        $.data(element, instance.uiFullName, instance);
    }

    aries.exportable = function() {
        aries.extend(this, aries.exportable["fn"]);
        this.protoProperty = this.protoProperty || {};
        this.protoProperty["exportable"] = aries.exportable;
    };

    aries.exportable["fn"] = {
        "_exportInstanceToDom": exportInstanceToDom
    };

    var protoProperty = aries.protoProperty;
    aries.exportable["fn"][aries.protoProperty] = aries.exportable;

    aries.hasPrototype = function(instance, prototype) {
        if ((instance === null) || (instance === undefined) || (instance[protoProperty] === undefined)) {
            return false;
        }
        if (instance[protoProperty] === prototype) {
            return true;
        }
        return aries.hasPrototype(instance[protoProperty], prototype); // Walk the prototype chain
    };

    aries.exportSymbol = function(namespace, object) {
        var tokens = namespace.split(".");

        var target = aries;
        if (tokens.length > 0 && tokens[0] === "aries") {
            target = window;
        }

        for (var i = 0; i < tokens.length - 1; i++) {
            target = target[tokens[i]];
        }
        target[tokens[tokens.length - 1]] = object;
    };

    aries.exportProperty = function(owner, publicName, object) {
        owner[publicName] = object;
    };

})(window.jQuery, window.aries);
//>>excludeStart("ariesBuildExclude", pragmas.ariesBuildExclude);
//});
//>>excludeEnd("ariesBuildExclude");