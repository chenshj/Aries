(function(factory) {
    // Support four module loading scenarios
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        // [1] CommonJS/Node.js
        var target = module['exports'] || exports; // module.exports is for Node.js
        factory(target);
    }
    else if (typeof define === 'function' && define['amd']) {
        // [2] AMD anonymous module
        define(['exports'], factory);
    }
    else if (typeof require === 'function' && typeof module === 'function') {
        //[3] GSP module
        module(['exports'], factory);
    }
    else {
        // [4] No module loader (plain <script> tag) - put directly in global namespace
        factory(window['gsp'] = window['gsp'] || {});
    }
})(function(exports) {
    var eventSplitter = /\s+/,//eventSplitter指定处理多个事件时, 事件名称的解析规则
        each = _.each,
        extend = _.extend,
        extendType = function(target, type) {
            extend(target, type['fn']);
            target['__prototype__'] = type['fn'];
            return target;
        },
        find = _.find,
        isFunction = _.isFunction,
        isNumber = _.isNumber,
        isString = _.isString,
        keys = _.keys;

    /**
     * 支持自定义事件对象的原型对象
     * @type {{on: Function, off: Function, trigger: Function}}
     */
    var eventPrototype = {
        /**
         * 将自定义事件(events)和回调函数(callback)绑定到当前对象,
         * 回调函数中的上下文对象为指定的context,
         * 如果没有设置context则上下文对象默认为当前绑定事件的对象,
         * 该方法类似与DOM Level2中的addEventListener方法,
         * events允许指定多个事件名称, 通过空白字符进行分隔(如空格, 制表符等)当事件名称为"all"时,
         * 在调用trigger方法触发任何事件时, 均会调用"all"事件中绑定的所有回调函数
         * @param events
         * @param data
         * @param callback
         * @param context
         * @returns {*}
         */
        'on': function(events, data, callback, context) {
            // 定义一些函数中使用到的局部变量
            var calls, event, node, tail, list;
            // 仅传入三个参数的情况。
            if (!context) {
                //第二个参数为Function类型对象，认为未传入data对象，此时data为null。
                if (typeof data === 'function') {
                    context = callback;
                    callback = data;
                    data = null;
                }
                // 其他情况认为未传入context。
            }
            // 必须设置callback回调函数
            if (!callback) {
                return this;
            }

            // 通过eventSplitter对事件名称进行解析, 使用split将多个事件名拆分为一个数组
            // 一般使用空白字符指定多个事件名称
            events = events.split(eventSplitter);
            // calls记录了当前对象中已绑定的事件与回调函数列表
            calls = this._callbacks || (this._callbacks = {});

            // 循环事件名列表, 从头至尾依次将事件名存放至event变量
            while ((event = events.shift())) {
                // 获取已经绑定event事件的回调函数
                // list存储单个事件名中绑定的callback回调函数列表
                // 函数列表并没有通过数组方式存储, 而是通过多个对象的next属性进行依次关联
                /** 数据格式如:
                 * {
                 *     tail: {Object},
                 *     next: {
                 *         callback: {Function},
                 *         context: {Object},
                 *         data: {Object}
                 *         next: {
                 *             callback: {Function},
                 *             context: {Object},
                 *             data: {Object}
                 *             next: {Object}
                 *         }
                 *     }
                 * }
                 */
                    // 列表每一层next对象存储了一次回调事件相关信息(函数体, 上下文和下一次回调事件)
                    // 事件列表最顶层存储了一个tail对象, 它存储了最后一次绑定回调事件的标识(与最后一次回调事件的next指向同一个对象)
                    // 通过tail标识, 可以在遍历回调列表时得知已经到达最后一个回调函数
                list = calls[event];
                // node变量用于记录本次回调函数的相关信息
                // tail只存储最后一次绑定回调函数的标识
                // 因此如果之前已经绑定过回调函数, 则将之前的tail指定给node作为一个对象使用, 然后创建一个新的对象标识给tail
                // 这里之所以要将本次回调事件添加到上一次回调的tail对象, 是为了让回调函数列表的对象层次关系按照绑定顺序排列(最新绑定的事件将被放到最底层)
                node = list ? list.tail : {};
                node.next = tail = {};
                // 记录本次回调的函数体及上下文信息
                node.context = context;
                node.data = data || {};
                node.callback = callback;
                // 重新组装当前事件的回调列表, 列表中已经加入了本次回调事件
                calls[event] = {
                    tail: tail,
                    next: list ? list.next : node
                };
            }
            // 返回当前对象, 方便进行方法链调用
            return this;
        },

        /**
         * 移除对象中已绑定的事件或回调函数, 可以通过events, callback和context
         * 对需要删除的事件或回调函数进行过滤.
         * - 如果context为空, 则移除所有的callback指定的函数
         * - 如果callback为空, 则移除事件中所有的回调函数
         * - 如果events为空, 但指定了callback或context, 则移除callback或context指定的回调函数(不区分事件名称)
         * - 如果没有传递任何参数, 则移除对象中绑定的所有事件和回调函数
         * @param events
         * @param callback
         * @param context
         * @returns {*}
         */
        'off': function(events, callback, context) {
            var event, calls, node, tail, cb, ctx;

            // No events, or removing *all* events.
            // 当前对象没有绑定任何事件
            if (!( calls = this._callbacks)) {
                return;
            }
            // 如果没有指定任何参数, 则移除所有事件和回调函数(删除_callbacks属性)
            if (!(events || callback || context)) {
                delete this._callbacks;
                return this;
            }

            // 解析需要移除的事件列表
            // - 如果指定了events, 则按照eventSplitter对事件名进行解析
            // - 如果没有指定events, 则解析已绑定所有事件的名称列表
            events = events ? events.split(eventSplitter) : keys(calls);

            // 循环事件名列表
            while ((event = events.shift())) {
                // 将当前事件对象从列表中移除, 并缓存到node变量中
                node = calls[event];
                delete calls[event];
                // 如果不存在当前事件对象(或没有指定移除过滤条件, 则认为将移除当前事件及所有回调函数), 则终止此次操作(事件对象在上一步已经移除)
                if (!node || !(callback || context)) {
                    continue;
                }

                // Create a new list, omitting the indicated callbacks.
                // 根据回调函数或上下文过滤条件, 组装一个新的事件对象并重新绑定
                tail = node.tail;
                // 遍历事件中的所有回调对象
                while (( node = node.next) !== tail) {
                    cb = node.callback;
                    ctx = node.context;
                    // 根据参数中的回调函数和上下文, 对回调函数进行过滤, 将不符合过滤条件的回调函数重新绑定到事件中(因为事件中的所有回调函数在上面已经被移除)
                    if ((callback && cb !== callback) || (context && ctx !== context)) {
                        this.on(event, cb, ctx);
                    }
                }
            }

            return this;
        },

        /**
         * 触发已经定义的一个或多个事件, 依次执行绑定的回调函数列表
         * @param events
         * @returns {*}
         */
        'trigger': function(events) {
            var event, node, calls, tail,
                args = Array.prototype.splice.call(arguments, 1, arguments.length - 1);
            // 当前对象没有绑定任何事件
            if (!( calls = this._callbacks)) {
                return this;
            }

            // 将需要触发的事件名称, 按照eventSplitter规则解析为一个数组
            events = events.split(eventSplitter);

            // 循环需要触发的事件列表
            while ((event = events.shift())) {
                // 此处的node变量记录了当前事件的所有回调函数列表
                if ((node = calls[event])) {
                    // tail变量记录最后一次绑定事件的对象标识
                    tail = node.tail;
                    // node变量的值, 按照事件的绑定顺序, 被依次赋值为绑定的单个回调事件对象
                    // 最后一次绑定的事件next属性, 与tail引用同一个对象, 以此作为是否到达列表末尾的判断依据
                    while (( node = node.next) !== tail) {
                        // 执行所有绑定的事件, 并将调用trigger时的参数传递给回调函数
                        var eventArgs = {
                            'target': this,
                            'data': extend({}, node.data)
                        };
                        args.unshift(eventArgs);
                        node.callback.apply(node.context || this, args);
                    }
                }
            }
            return this;
        }
    };

    function supportEvent (object) {
        return extend(object, eventPrototype);
    }

    function collection () {
        /**
         * @return {null}
         */
        function collectionObject (nameOrIndex) {
            if (nameOrIndex === undefined || nameOrIndex === null || nameOrIndex === '') {
                return null;
            }
            if (isNumber(nameOrIndex)) {
                return collectionObject.iterator[nameOrIndex];
            }
            if (isString(nameOrIndex)) {
                var foundIndex = -1;
                each(collectionObject.iterator, function(item, index) {
                    if (item.name() === nameOrIndex) {
                        foundIndex = index;
                        return true;
                    }
                    return false;
                });
                if (foundIndex >= 0) {
                    return collectionObject.iterator[foundIndex];
                }
            }
            return null;
        }

        collectionObject.iterator = [];

        return extendType(collectionObject, collection);
    }

    collection['fn'] = {
        'add': function(item) {
            this.iterator.push(item);
            return this;
        },

        'clear': function() {
            this.iterator = [];
            return this;
        },

        'count': function() {
            return this.iterator.length;
        },

        'each': function(callback) {
            each(this.iterator, callback);
        },

        'find': function(filter) {
            return find(this.iterator, filter);
        },

        'indexOf': function(item) {
            return this.iterator.indexOf(item);
        },

        'remove': function(nameOrIndexOrItem) {
            var foundIndex = -1;
            if (nameOrIndexOrItem === undefined || nameOrIndexOrItem === null || nameOrIndexOrItem === '') {
                return this;
            }
            if (isNumber(nameOrIndexOrItem)) {
                this.iterator.splice(nameOrIndexOrItem, 1);
            }
            else if (isString(nameOrIndexOrItem)) {
                each(this.iterator, function(item, index) {
                    if (item.name() === nameOrIndexOrItem) {
                        foundIndex = index;
                        return true;
                    }
                    return false;
                });
                if (foundIndex > -1) {
                    this.iterator.splice(foundIndex, 1);
                }
            }
            else {
                foundIndex = this.iterator.indexOf(nameOrIndexOrItem);
                if (foundIndex > -1) {
                    this.iterator.splice(foundIndex, 1);
                }
            }
            return this;
        }
    };

    function Class () {
    }

    Class.extend = function(prototype) {

        var parentPrototype = this.prototype;

        this.suspendInit = true;
        var currentPrototype = new this();
        this.suspendInit = false;

        if (typeof prototype == "function") {
            prototype = prototype();
        }

        prototype = prototype || {};

        each(prototype, function(value, prop) {
            if (isFunction(value)) {
                prototype[prop] = (function() {
                    var _super = function() {
                            var params = Array.prototype.slice.call(arguments);
                            return parentPrototype[prop].apply(this, params);
                        },
                        _superApply = function(args) {
                            return parentPrototype[prop].apply(this, args);
                        };

                    return function() {
                        var __super = this._super,
                            __superApply = this._superApply,
                            returnValue;

                        this._super = _super;
                        this._superApply = _superApply;

                        returnValue = value.apply(this, arguments);

                        this._super = __super;
                        this._superApply = __superApply;

                        return returnValue;
                    };
                })();
            }
        });

        function Constructor () {
            if (!this.constructor.suspendInit && this.init) {
                this.init.apply(this, arguments)
            }
        }

        Constructor.prototype = extend(currentPrototype, prototype, {
            constructor: Constructor,
            parentConstructor: this
        }, eventPrototype);

        Constructor.extend = arguments.callee;

        return Constructor;
    };

    exports['Class'] = Class;
    exports['collection'] = collection;
    exports['eventPrototype'] = eventPrototype;
    exports['supportEvent'] = supportEvent;
});

(function(global) {

    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m,//查找function形参的正则表达式
        FN_ARG_SPLIT = /,/,//function的形参分割符
        FN_ARG = /^\s*(_?)(\S+?)\1\s*$/,//todo:待确定该正则表达式
        INSTANTIATING = {},
        STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,//方法体中查找注释文本的正则表达式
        exports = global || window,
        instanceCache = {},
        instanceInjector,
        modules = {},
        path = [],
        providerCache = {
            $provide: {
                provider: supportObject(provider),
                factory: supportObject(factory),
                service: supportObject(service),
                value: supportObject(value),
                constant: supportObject(constant),
                decorator: decorator
            }
        },
        providerInjector,
        providerSuffix = 'Provider',
        uid = ['0', '0', '0'],
        assertArg = function(arg, name, reason) {
            if (!arg) {
                throw new Error("Argument '" + (name || '?') + "' is " + (reason || "required"));
            }
            return arg;
        },
        assertArgFn = function(arg, name, acceptArrayAnnotation) {
            if (acceptArrayAnnotation && $.isArray(arg)) {
                arg = arg[arg.length - 1];
            }

            assertArg(typeof arg == "function", name, 'not a function, got ' +
                (arg && typeof arg == 'object' ? arg.constructor.name || 'Object' : typeof arg));
            return arg;
        },
        each = _.each,
        extend = function(target) {
            var input = Array.prototype.slice.call(arguments, 1),
                inputIndex = 0,
                inputLength = input.length,
                key, value;

            for (; inputIndex < inputLength; inputIndex++) {
                var currentInput = input[inputIndex];
                for (key in currentInput) {
                    if (key === "__proto_name__") continue;
                    if (currentInput.hasOwnProperty(key)) {
                        value = currentInput[ key ];
                        if (value !== undefined) {
                            // Clone objects
                            if (jQuery.isPlainObject(value)) {
                                target[ key ] = jQuery.isPlainObject(target[ key ]) ?
                                    extend({}, target[ key ], value) :
                                    // Don't extend strings, arrays, etc. with objects
                                    extend({}, value);
                                // Copy everything else by reference
                            }
                            else {
                                target[ key ] = value;
                            }
                        }
                    }
                }

                if (currentInput.hasOwnProperty("__proto_name__")) {
                    var protoName = currentInput["__proto_name__"];
                    target[protoName] = currentInput[protoName];
                }
            }

            return target;
        },
        hashKey = function(obj) {
            var objType = typeof obj,
                key;

            if (objType == 'object' && obj !== null) {
                if (typeof (key = obj.$$hashKey) == 'function') {
                    // must invoke on object to keep the right this
                    key = obj.$$hashKey();
                } else if (key === undefined) {
                    key = obj.$$hashKey = nextUid();
                }
            } else {
                key = obj;
            }

            return objType + ':' + key;
        },
        isArray = _.isArray,
        isArrayLike = function(obj) {
            if (!obj || (typeof obj.length !== 'number')) return false;

            // We have on object which has length property. Should we treat it as array?
            if (typeof obj.hasOwnProperty != 'function' &&
                typeof obj.constructor != 'function') {
                // This is here for IE8: it is a bogus object treat it as array;
                return true;
            } else {
                return (window.jQuery && obj instanceof jQuery) ||          // jQuery
                    (Object.prototype.toString.call(obj) !== '[object Object]') ||   // some browser native object
                    (obj.callee && typeof obj.callee === 'function');              // arguments (on IE8 looks like regular obj)
            }
        },
        isFunction = _.isFunction,
        isObject = _.isObject,
        isString = _.isString,
        nextUid = function() {
            var index = uid.length;
            var digit;

            while (index) {
                index--;
                digit = uid[index].charCodeAt(0);
                if (digit == 57 /*'9'*/) {
                    uid[index] = 'A';
                    return uid.join('');
                }
                if (digit == 90  /*'Z'*/) {
                    uid[index] = '0';
                } else {
                    uid[index] = String.fromCharCode(digit + 1);
                    return uid.join('');
                }
            }
            uid.unshift('0');
            return uid.join('');
        },
        forEach = function(obj, iterator, context) {
            var key;
            if (obj) {
                if (isFunction(obj)) {
                    for (key in obj) {
                        if (key != 'prototype' && key != 'length' && key != 'name' && obj.hasOwnProperty(key)) {
                            iterator.call(context, obj[key], key);
                        }
                    }
                } else if (obj.forEach && obj.forEach !== forEach) {
                    obj.forEach(iterator, context);
                } else if (isArrayLike(obj)) {
                    for (key = 0; key < obj.length; key++)
                        iterator.call(context, obj[key], key);
                } else {
                    for (key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            iterator.call(context, obj[key], key);
                        }
                    }
                }
            }
            return obj;
        };

    /**
     * HashMap which can use objects as keys
     */
    function HashMap (array) {
        forEach(array, this.put, this);
    }

    HashMap.prototype = {
        /**
         * Store key value pair
         * @param key key to store can be any type
         * @param value value to store can be any type
         */
        put: function(key, value) {
            this[hashKey(key)] = value;
        },

        /**
         * @param key
         * @returns the value for the key
         */
        get: function(key) {
            return this[hashKey(key)];
        },

        /**
         * Remove the key/value pair
         * @param key
         */
        remove: function(key) {
            var value = this[key = hashKey(key)];
            delete this[key];
            return value;
        }
    };

    /**
     * A function that performs no operations. This function can be useful when writing code in the
     * functional style.
     */
    function noop () {
    }

    noop.$inject = [];

    function valueFn (value) {
        return function() {
            return value;
        };
    }

    /**
     * when using forEach the params are value, key, but it is often useful to have key, value.
     * @param {function(string, *)} iteratorFn
     * @returns {function(*, string)}
     */
    function reverseParams (iteratorFn) {
        return function(value, key) {
            iteratorFn(key, value)
        };
    }

    /**
     * 构造支持以Object的key，value作为参数的方法。
     * @param delegate 包装前的原方法
     * @returns {Function} 包装后支持Object参数的方法
     */
    function supportObject (delegate) {
        return function(key, value) {
            if (isObject(key)) {
                forEach(key, reverseParams(delegate));
                return null;
            } else {
                return delegate(key, value);
            }
        }
    }

    function module (name, requires, configFn) {

        //新定义模块：如果已存在重名的模块，先将其清空。
        if (requires && modules.hasOwnProperty(name)) {
            modules[name] = null;
        }

        function createNewModule () {
            /**构造延迟执行的方法，执行该包装后的方法时，被包装的方法不会立即执行，而是添加到模块的执行队列中。
             * @param {string} provider 服务名称
             * @param {string} method  服务的方法名
             * @param {String=} insertMethod 向队列中添加对象的方法，执行队列的为数组，该参数默认为push。（可选参数）
             * @returns {*} 包装后的方法，该方法仅将方法的调用增加到模块执行队列中，而不立即执行。
             */
            function invokeLater (provider, method, insertMethod) {
                return function() {
                    invokeQueue[insertMethod || 'push']([provider, method, arguments]);
                    return moduleInstance;
                }
            }

            var config = invokeLater('$injector', 'invoke'),
                invokeQueue = [],//私有变量，执行队列，该队列中描述的方法将在获取模块时逐一执行。
                moduleInstance,
                runBlocks = [];

            if (configFn) {
                config(configFn);
            }

            //模块对象实例
            return moduleInstance = extend({
                // 执行队列
                _invokeQueue: invokeQueue,

                _runBlocks: runBlocks,

                //依赖模块名称数组
                requires: requires,

                //模块名称
                name: name,

                /**
                 * 可以延迟执行的$provide.provider方法，
                 * 调用该法时不立即执行$provide.provider，
                 * 而是将调用信息存入该模块的执行队列。
                 * @param {string} name service name 服务名称。
                 * @param {Function} providerType Construction function for creating
                 *                           new instance of the service. 服务实例构造方法。
                 */
                provider: invokeLater('$provide', 'provider'),

                /**
                 * 可以延迟执行的$provide.factory方法，
                 * 调用该法时不立即执行$provide.factory，
                 * 而是将调用信息存入该模块的执行队列。
                 * @param {string} name service name
                 * @param {Function} providerFunction Function for creating new instance of the service.
                 */
                factory: invokeLater('$provide', 'factory'),

                /**
                 * 可以延迟执行的$provide.service方法，
                 * 调用该法时不立即执行$provide.service，
                 * 而是将调用信息存入该模块的执行队列。
                 * @param {string} name service name
                 * @param {Function} constructor A constructor function that will be instantiated.
                 */
                service: invokeLater('$provide', 'service'),

                /**
                 * 可以延迟执行的$provide.value方法，
                 * 调用该法时不立即执行$provide.value，
                 * 而是将调用信息存入该模块的执行队列。
                 * @param {string} name service name
                 * @param {*} object Service instance object.
                 */
                value: invokeLater('$provide', 'value'),

                /**
                 * 可以延迟执行的$provide.constant方法，
                 * 调用该法时不立即执行$provide.constant，
                 * 而是将调用信息存入该模块的执行队列。
                 * @param {string} name constant name
                 * @param {*} object Constant value.
                 * @description
                 * Because the constant are fixed, they get applied before other provide methods.
                 */
                constant: invokeLater('$provide', 'constant', 'unshift'),

                model: invokeLater("$modelProvider", "$extend"),

                view: invokeLater("$viewProvider", "$extend"),

                /**
                 * 可以延迟执行的$controllerProvider.register方法，
                 * 调用该法时不立即执行$controllerProvider.register，
                 * 而是将调用信息存入该模块的执行队列。
                 * @param {string} name Controller name.
                 * @param {Function} constructor Controller constructor function.
                 */
                controller: invokeLater('$controllerProvider', '$extend'),

                /**
                 * 可以延迟执行的$injector.invoke方法，
                 * 调用该法时不立即执行$injector.invoke，
                 * 而是将调用信息存入该模块的执行队列。
                 * @param {Function} configFn Execute this function on module load. Useful for service
                 *    configuration.
                 * @description
                 * Use this method to register work which needs to be performed on module loading.
                 */
                config: config,

                /**
                 * Useful for application initialization.
                 * @description
                 * Use this method to register work which should be performed when the injector is done
                 * loading all modules.
                 * @param {Function} block Execute this function after injector creation.
                 */
                run: function(block) {
                    runBlocks.push(block);
                    return this;
                }
            }, module['extension']);
        }

        modules[name] = modules[name] || createNewModule();
        return modules[name];
    }

    module['extension'] = {};

    var injectorPrototype = {
        /**
         * 在缓存对象上查找方法依赖的对象，以实参的方式将依赖对象注入到该方法，并执行。
         * @param fn 待执行方法
         * @param context 待执行方法的调用着（该方法调用时this指针指向的对象）
         * @param locals 本地参数列表，如果指定了该参数，将在执行依赖注入中，
         *                  优先在该对象上查找依赖对象。
         * @returns {*}
         */
        invoke: function(fn, context, locals) {
            var args = [],//fn方法执行时的实参数组。
                $inject = getInjection(fn),//查找fn方法的依赖项，返回fn方法依赖服务名称的数组。
                length, i,
                key;

            for (i = 0, length = $inject.length; i < length; i++) {
                //依赖服务的名称
                key = $inject[i];
                //查找依赖服务的实例，构造fn方法的实参数组
                args.push(
                    //优先在locals上查找依赖服务的实例
                    locals && locals.hasOwnProperty(key)
                        ? locals[key]
                        : this.get(key)
                );
            }

            //如果fn不包括$inject对象，说明fn为数组形式。
            //fn可以支持三种形式：
            // 1、function对象，通过解析形参构造依赖服务的名称数组$inject。
            // 2、function对象，给function上增加$inject对象，显示声明依赖服务的名称数组。
            // 3、内联形式，fn为一数组（["service1","service2",function]），
            // 最后一个参数为实际调用方法，前几个参数为依赖服务的名称。
            // 前三种形式的fn在执行完annotate方法后，均会确保fn对象上存在$inject对象。
            // 而第三种内联数组的形式则不会创建$inject对象。
            if (!fn.$inject) {
                // this means that we must be an array.
                fn = fn[length];
            }

            // 优化调用性能，经性能对比，直接invoke方法的性能优于call，call方式调用方法的性能优于apply。
            switch (context ? -1 : args.length) {
                case  0:
                    return fn();
                case  1:
                    return fn(args[0]);
                case  2:
                    return fn(args[0], args[1]);
                case  3:
                    return fn(args[0], args[1], args[2]);
                case  4:
                    return fn(args[0], args[1], args[2], args[3]);
                case  5:
                    return fn(args[0], args[1], args[2], args[3], args[4]);
                case  6:
                    return fn(args[0], args[1], args[2], args[3], args[4], args[5]);
                case  7:
                    return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
                case  8:
                    return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
                case  9:
                    return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
                case 10:
                    return fn(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
                default:
                    return fn.apply(context, args);
            }
        },
        /**
         * 创建某构造方法类型的实例
         * @param Type 构造类型，支持依赖注入，可以是function，带$inject的function，
         *                  以及内联形式依赖数组和function。
         * @param locals 参数列表，如果指定了该参数，在使用依赖注入机制执行构造方法时，
         *                  将在执行依赖注入的查找前，优先在该对象上查找是否存在依赖的服务实例。
         * @returns {*}
         */
        instantiate: function(Type, locals) {
            // 新的实例构造方法。将根据Type参数的形式，为Constructor方法构造原型对象。
            // 这里不直接使用Type中指定的原始构造方法创建实例化对象，
            // 主要是想支持Type中指定的构造方法，为工厂方法的情况。
            var Constructor = function() {
                },
                instance, returnedValue;

            //构造Constructor的prototype，如果Type参数为数组类型，则数组的最后一个元素为实际的类型方法，
            // Constructor的prototype指向数组最后一个元素的prototype。否则Type应为function对象，
            // Constructor的prototype直接指向Type对象的prototype。
            Constructor.prototype = (isArray(Type) ? Type[Type.length - 1] : Type).prototype;
            //使用Constructor构造方法构造对象。
            instance = new Constructor();
            //以新构造的对象instance为调用着，使用依赖注入机制执行传入的原始构造方法，
            // 执行该方法后，新构造的对象instance将具有原始构造方法中为this指针赋值的属性。
            returnedValue = this.invoke(Type, instance, locals);

            //如果Type中指定的构造方法为工厂方法，则调用Type中的方法后，returnedValue为工厂方法构造的对象，
            // 此时返回returnedValue作为创建的实例。如果Type中指定的构造方法不是工厂方法，
            // 则一般构造方法无返回值，此时返回使用Constructor构造instance作为创建的实例。
            return isObject(returnedValue) ? returnedValue : instance;
        },
        /**
         * 在缓存对象上查找指定名称的对象，如果缓存中未存在该名称的对象，则调用factory方法创建该对象并返回。
         * @param serviceName 服务名称
         * @returns {*} 缓存中的实例对象
         */
        get: function(serviceName) {
            var cache = this.cache;
            //验证服务名称，要求必须为字符串。
            if (typeof serviceName !== 'string') {
                throw Error('Service name expected');
            }

            //优先查找缓存对象，如果缓存中存在已创建的服务实例，
            // 则返回缓存中的服务实例，不知重新创建。
            if (cache.hasOwnProperty(serviceName)) {
                //查找循环依赖，如果有循环依赖，抛出异常，提示获取失败。
                if (cache[serviceName] === INSTANTIATING) {
                    throw Error('Circular dependency: ' + path.join(' <- '));
                }
                //返回缓存中的服务实例。
                return cache[serviceName];
            }
            //缓存中不存在已创建的该服务实例的情况
            else {
                try {
                    //压栈，将服务名插入path数据的顶部。
                    path.unshift(serviceName);
                    //在缓存对象中标记该服务的实例对象正在实例化，该标记用来判断是否存在循环引用，
                    // 如果该服务的依赖项循环依赖该服务自己，当在实例化栈中，逐次获取依赖的服务，
                    // 再次获取到该服务自身时，将获取到缓存对象中的“正在实例化标记”，
                    // 从而发现循环引用并抛出异常提示。
                    cache[serviceName] = INSTANTIATING;
                    //调用创建服务实例的工程方法，创建该服务的实例。
                    return cache[serviceName] = this.factory(serviceName);
                }
                finally {
                    //出栈，移除path数组最顶部的服务名称。
                    path.shift();
                }
            }
        },
        annotate: getInjection
    };

    providerCache.$injector = providerInjector = extend({

        cache: providerCache,

        factory: function() {
            //未找到provider对象时提示异常。
            throw Error("Unknown provider: " + path.join(' <- '));
        }
    }, injectorPrototype);

    instanceCache.$injector = instanceInjector = extend({

        cache: instanceCache,

        factory: function(servicename) {
            //在对象实例缓存中未查找到指定名称的服务对象时，查找对应的服务提供者，并创建具体服务对象。
            var provider = providerInjector.get(servicename + providerSuffix);
            //以provider作为执行上下文，调用provider.$get方法创建具体服务对象。
            return instanceInjector.invoke(provider.$get, provider);
        }
    }, injectorPrototype);

    function injector (modules) {
        var loadedModules = new HashMap();

        function loadModules (modules) {
            var runBlocks = [];
            //变量待加载模块数组，加载模块。
            each(modules, function(module) {
                //检查已加载模块HashTable，如果存在已加载的模块，直接返回。
                if (loadedModules.get(module)) {
                    return;
                }
                //项目已加载模块哈希表中记录当前模块已加载。
                loadedModules.put(module, true);

                if (isString(module)) {
                    //待加载模块列表中提供模块名称的情况，
                    //根据模块名称获取模块实例。
                    var moduleFn = exports.module(module);

                    //加载模块中标记的，加载模块前必须先加载的依赖模块，
                    //并将依赖模块与模块定义本身的运行块合并。
                    runBlocks = runBlocks.concat(loadModules(moduleFn.requires))
                        .concat(moduleFn._runBlocks);

                    try {
                        //遍历模块实例对象的执行队列，逐一执行加入队列中延迟执行的方法。
                        for (var invokeQueue = moduleFn._invokeQueue, i = 0, ii = invokeQueue.length; i < ii; i++) {
                            //获取执行队列中，待执行方法的描述。
                            var invokeObjectInQueue = invokeQueue[i],
                                providerName = invokeObjectInQueue[0],
                                methodName = invokeObjectInQueue[1],
                                params = invokeObjectInQueue[2],
                                provider = providerInjector.get(providerName),//invokeArgs中第一个参数描述服务名，使用providerInjector获取服务的provider对象。
                                method = provider[methodName];

                            if (isArray(method)) {
                                method = instanceInjector.invoke(method);
                            }
                            method.apply(provider, params);
                        }
                    }
                    catch (e) {
                        if (e.message) e.message += ' from ' + module;
                        throw e;
                    }
                }
                else if (isFunction(module)) {
                    // 待加载模块是function的情况，
                    // 使用依赖注入机制执行模块工厂方法，将返回值加入返回结果中。
                    try {
                        runBlocks.push(providerInjector.invoke(module));
                    }
                    catch (e) {
                        if (e.message) e.message += ' from ' + module;
                        throw e;
                    }
                }
                else if (isArray(module)) {
                    // 待加载模块是数组描述的情况，
                    // 数据为模块工厂方法依赖的服务以及模块工厂方法，
                    // 例如：（["service1","service2",moduleFactory(a,b){..}]）
                    try {
                        //使用依赖注入执行执行包括模块工厂方法依赖及模块工厂方法的数组，将返回值加入返回结果中。
                        runBlocks.push(providerInjector.invoke(module));
                    }
                    catch (e) {
                        if (e.message) e.message += ' from ' + String(module[module.length - 1]);
                        throw e;
                    }
                }
                else {
                    // 其他情况，提示module类型不正确，不是Function类型对象。
                    assertArgFn(module, 'module');
                }
            });
            return runBlocks;
        }

        var runBlocks = loadModules(modules);
        each(runBlocks, function(fn) {
            instanceInjector.invoke(fn || noop);
        });
        return instanceInjector;
    }

    /**
     *  注册服务提供者
     *  第二个参数"provider_"有固定的格式，"provider_"可以为方法、说明依赖关系并且包含方法的数组或者对象，
     *  但都要求必须实现"$get"工厂方法，"$get"方法用来创建一个具体的服务。
     * @example <caption>注册一个服务提供者方法</caption>
     * module('customModule').provider('myService',function(){
     *      var innerMessage = 'Hello World!';
     *      function speak(){
     *          alert(innerMessage);
     *      }
     *      this.$get = function(){
     *          return {
     *               sayHello:speak
     *          };
     *      };
     * });
     * @example <caption>在注册服务提供者方法的时候使用依赖注入<caption>
     *  module('customModule').provider('myService',function(){
     *      this.$get = ['mySpeakService',function(speakService){
     *          return {
     *              sayHello: function(){
     *                  speakService.speak('Hello World!');
     *              }
     *          }
     *      }];
     *  })
     *  @example <caption>注册服务提供者对象<caption>
     *  module('customModule').provider('myService',{
     *      $get: function(){
     *          return {
     *               sayHello:function(){
     *                  alert('Hello World!');
     *               }
     *          };
     *      }
     *  });
     * @param name 服务名
     * @param provider_ 服务提供者构造方法或者服务提供者对象
     * @returns {*} 服务提供者对象
     */
    function provider (name, provider_) {
        //检查服务提供者，如果服务提供者为方法或者保护依赖关系的数组，则使用服务提供者注入器实例化服务提供者对象。
        if (isFunction(provider_) || isArray(provider_)) {
            provider_ = providerInjector.instantiate(provider_);
        }
        if (!provider_.$get) {
            throw Error('Provider ' + name + ' must define $get factory method.');
        }
        //缓存创建的服务提供者对象，key值为服务名加后缀'Provider';
        return providerCache[name + providerSuffix] = provider_;
    }

    /**
     * 注册服务工厂
     * 该方法为provider方法的简化调用，在该方法里，将要注册的服务工厂方法包装为一个服务提供者并注册。
     * @param name
     * @param factoryFn
     * @returns {*}
     */
    function factory (name, factoryFn) {
        return provider(name, { $get: factoryFn });
    }

    function service (name, constructor) {
        return factory(name, ['$injector', function($injector) {
            return $injector.instantiate(constructor);
        }]);
    }

    function value (name, value) {
        return factory(name, valueFn(value));
    }

    function constant (name, value) {
        providerCache[name] = value;
        instanceCache[name] = value;
    }

    function decorator (serviceName, decorFn) {
        var origProvider = providerInjector.get(serviceName + providerSuffix),
            orig$get = origProvider.$get;

        origProvider.$get = function() {
            var origInstance = instanceInjector.invoke(orig$get, origProvider);
            return instanceInjector.invoke(decorFn, null, {$delegate: origInstance});
        };
    }

    function getInjection (fn) {
        var $inject,//待注入服务名称数组
            fnText,//方法文本function（arg1，arg2...）{}
            argDeclared,//分割后参数数组
            last;//参数数组中，标记最后一个依赖参数的索引

        //fn为function的情况
        if (typeof fn == 'function') {
            //$inject为fn.$inject的引用，减少对变量的查找层数。
            //如果fn上没有配置依赖服务数组，则分析fn参数列表，构造依赖服务数组。
            if (!($inject = fn.$inject)) {
                //初始化依赖服务数组为空数组
                $inject = [];
                //将方法fn转换为方法文本，并清空方法中的注释。
                fnText = fn.toString().replace(STRIP_COMMENTS, '');
                //使用正则表达式查找方法文本中的参数列表
                argDeclared = fnText.match(FN_ARGS);
                //使用参数分隔符分割形参列表，构造形参数组，形参的名字为依赖服务的名字
                //遍历参数列表，将依赖服务压入依赖服务数组
                forEach(argDeclared[1].split(FN_ARG_SPLIT), function(arg) {
                    arg.replace(FN_ARG, function(all, underscore, name) {
                        $inject.push(name);
                    });
                });
                //在fn方法上记录依赖服务数组，该数组缓存在fn.$inject中
                fn.$inject = $inject;
            }
        }
        //fn为数组的情况，ex.['dep1','dep2','dep3',function(arg1,arg2,arg3){}]
        else if (isArray(fn)) {
            //计算最后一个依赖服务名在数组中的索引，数组的最后一个元素为实际的方法
            last = fn.length - 1;
            //判定数组的最后一个参数为方法。
            assertArgFn(fn[last], 'fn');
            //分割数组元素，0~length-1为依赖方法名
            $inject = fn.slice(0, last);
        }
        else {
            assertArgFn(fn, 'fn', true);
        }
        return $inject;
    }

    exports.module = module;

    exports.injector = injector;

    if (window.jasmine || window.mocha) {
        exports.mock = {};
        var currentSpec = null,
            isSpecRunning = function() {
                return currentSpec && (window.mocha || currentSpec.queue.running);
            };

        beforeEach(function() {
            currentSpec = this;
        });

        afterEach(function() {
            var injector = currentSpec.$injector;

            currentSpec.$injector = null;
            currentSpec.$modules = null;
            currentSpec = null;

            if (injector) {
                //                injector.get('$rootElement').off();
            }
        });

        /**
         * @ngdoc function
         * @name angular.mock.module
         * @description
         *
         * *NOTE*: This function is also published on window for easy access.<br>
         *
         * This function registers a module configuration code. It collects the configuration information
         * which will be used when the injector is created by {@link angular.mock.inject inject}.
         *
         * See {@link angular.mock.inject inject} for usage example
         *
         * @param {...(string|Function|Object)} fns any number of modules which are represented as string
         *        aliases or as anonymous module initialization functions. The modules are used to
         *        configure the injector. The 'ng' and 'ngMock' modules are automatically loaded. If an
         *        object literal is passed they will be register as values in the module, the key being
         *        the module name and the value being what is returned.
         */
        window.module = exports.mock.module = function() {
            var moduleFns = Array.prototype.slice.call(arguments, 0);
            return isSpecRunning() ? workFn() : workFn;
            /////////////////////
            function workFn () {
                if (currentSpec.$injector) {
                    throw new Error('Injector already created, can not register a module!');
                } else {
                    var modules = currentSpec.$modules || (currentSpec.$modules = []);
                    each(moduleFns, function(module) {
                        if (isFunction(module)) {
                            modules.push(module);
                        }
                        else if (isObject(module) && !isArray(module)) {
                            modules.push(function($provide) {
                                each(module, function(value, key) {
                                    $provide.value(key, value);
                                });
                            });
                        } else {
                            modules.push(module);
                        }
                    });
                }
            }
        };

        /**
         * @ngdoc function
         * @name angular.mock.inject
         * @description
         *
         * *NOTE*: This function is also published on window for easy access.<br>
         *
         * The inject function wraps a function into an injectable function. The inject() creates new
         * instance of {@link AUTO.$injector $injector} per test, which is then used for
         * resolving references.
         *
         *
         * ## Resolving References (Underscore Wrapping)
         * Often, we would like to inject a reference once, in a `beforeEach()` block and reuse this
         * in multiple `it()` clauses. To be able to do this we must assign the reference to a variable
         * that is declared in the scope of the `describe()` block. Since we would, most likely, want
         * the variable to have the same name of the reference we have a problem, since the parameter
         * to the `inject()` function would hide the outer variable.
         *
         * To help with this, the injected parameters can, optionally, be enclosed with underscores.
         * These are ignored by the injector when the reference name is resolved.
         *
         * For example, the parameter `_myService_` would be resolved as the reference `myService`.
         * Since it is available in the function body as _myService_, we can then assign it to a variable
         * defined in an outer scope.
         *
         * ```
         * // Defined out reference variable outside
         * var myService;
         *
         * // Wrap the parameter in underscores
         * beforeEach( inject( function(_myService_){
   *   myService = _myService_;
   * }));
         *
         * // Use myService in a series of tests.
         * it('makes use of myService', function() {
   *   myService.doStuff();
   * });
         *
         * ```
         *
         * See also {@link angular.mock.module angular.mock.module}
         *
         * ## Example
         * Example of what a typical jasmine tests looks like with the inject method.
         * <pre>
         *
         *   angular.module('myApplicationModule', [])
         *       .value('mode', 'app')
         *       .value('version', 'v1.0.1');
         *
         *
         *   describe('MyApp', function() {
   *
   *     // You need to load modules that you want to test,
   *     // it loads only the "ng" module by default.
   *     beforeEach(module('myApplicationModule'));
   *
   *
   *     // inject() is used to inject arguments of all given functions
   *     it('should provide a version', inject(function(mode, version) {
   *       expect(version).toEqual('v1.0.1');
   *       expect(mode).toEqual('app');
   *     }));
   *
   *
   *     // The inject and module method can also be used inside of the it or beforeEach
   *     it('should override a version and test the new version is injected', function() {
   *       // module() takes functions or strings (module aliases)
   *       module(function($provide) {
   *         $provide.value('version', 'overridden'); // override version here
   *       });
   *
   *       inject(function(version) {
   *         expect(version).toEqual('overridden');
   *       });
   *     });
   *   });
         *
         * </pre>
         *
         * @param {...Function} fns any number of functions which will be injected using the injector.
         */
        window.inject = exports.mock.inject = function() {
            var blockFns = Array.prototype.slice.call(arguments, 0);
            var errorForStack = new Error('Declaration Location');
            return isSpecRunning() ? workFn() : workFn;
            /////////////////////
            function workFn () {
                var modules = currentSpec.$modules || [];

                //                modules.unshift('ngMock');
                //                modules.unshift('ng');
                var injector = currentSpec.$injector;
                if (!injector) {
                    for (var key in instanceCache) {
                        if (Object.prototype.hasOwnProperty.call(instanceCache, key)) {
                            delete instanceCache[key];
                        }
                    }
                    injector = currentSpec.$injector = exports.injector(modules);
                }
                for (var i = 0, ii = blockFns.length; i < ii; i++) {
                    try {
                        /* jshint -W040 */
                        /* Jasmine explicitly provides a `this` object when calling functions */
                        injector.invoke(blockFns[i] || noop, this);
                        /* jshint +W040 */
                    } catch (e) {
                        if (e.stack && errorForStack) e.stack += '\n' + errorForStack.stack;
                        throw e;
                    } finally {
                        errorForStack = null;
                    }
                }
            }
        };
    }

})(window.gsp || (window.gsp = {}));

(function(global) {

    var exports = global || window,
        each = _.each,
        findWhere = _.findWhere,
        isArray = _.isArray,
        isFunction = _.isFunction,
        isString = _.isString;

    function internalExtend (name, baseType, extendPrototype, $injector, cache, nestedOption) {

        if (isFunction(extendPrototype))
            extendPrototype = extendPrototype();

        if (isArray(extendPrototype)) {
            extendPrototype = $injector.invoke(extendPrototype);
        }

        extendPrototype = extendPrototype || {};

        var type = exports.Class;
        if (typeof baseType == "function") {
            type = baseType;
        }
        else if (cache.hasOwnProperty(baseType)) {
            type = cache[baseType];
        }

        var ExtendedType = cache[name] = type.extend(extendPrototype);

        if (nestedOption && nestedOption["nestedObject"]) {
            var isExtendParentProto = nestedOption["extendParentProto"],
                nestedObjectKey = nestedOption["nestedObject"],
                nestedObject = extendPrototype[nestedObjectKey],
                nestedPrototype, key, nestedBaseType;

            if (!nestedObject)
                return;

            for (key in nestedObject) {
                if (nestedObject.hasOwnProperty(key)) {
                    nestedBaseType = isExtendParentProto ? ExtendedType : type;
                    nestedPrototype = nestedObject[key];
                    internalExtend(key, nestedBaseType, nestedPrototype, $injector, cache, nestedOption);
                }
            }

        }
    }

    /**
     * 应用程序上下文Provider
     */
    function $contextProvider () {
        this.$get = ["$messageService", "$variableService", function($messageService, $variableService) {

            function excuteMethod (methodObject, context) {
                var providerName = methodObject.provider || "$controller",
                    instanceName = methodObject.target,
                    methodName = methodObject.methodName,
                    params = methodObject.params,
                    caller = methodObject.caller,
                    controllerFactory,
                    instance,
                    method,
                    invokeResult;

                if (instanceName && typeof instanceName == "string") {
                    if (!context.controllers[instanceName]) {
                        controllerFactory = context.injector.get(providerName);
                        context.controllers[instanceName] = controllerFactory(instanceName, {"$context": context});
                    }
                    instance = context.controllers[instanceName];
                    method = instance[methodName];
                    params = params || [];

                    $variableService.parse(params, context);

                    switch (caller ? -1 : params.length) {
                        case  0:
                            invokeResult = method.call(instance);
                            break;
                        case  1:
                            invokeResult = method.call(instance, params[0]);
                            break;
                        case  2:
                            invokeResult = method.call(instance, params[0], params[1]);
                            break;
                        case  3:
                            invokeResult = method.call(instance, params[0], params[1], params[2]);
                            break;
                        case  4:
                            invokeResult = method.call(instance, params[0], params[1], params[2], params[3]);
                            break;
                        case  5:
                            invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4]);
                            break;
                        case  6:
                            invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5]);
                            break;
                        case  7:
                            invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6]);
                            break;
                        case  8:
                            invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7]);
                            break;
                        case  9:
                            invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8]);
                            break;
                        case 10:
                            invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9]);
                            break;
                        default:
                            invokeResult = method.apply(context, params);
                    }
                }
                return invokeResult;
            }

            var Context = exports.Class.extend({

                init: function(options) {
                    this.id = _.uniqueId("context");
                    //指向上下文树顶端的应用程序上下文。
                    this.root = this;
                    this.params = {};
                    this.controllers = {};
                },

                /**
                 * 创建新的上下文对象，不指定isolate参数时，
                 * 创建的上下文对象为当前上下文对象的子对象。
                 * @param element 视图元素
                 * @param isolate 是否隔离父上下文对象，当该属性为true时，
                 *                  新创建的上下文对象与父上下问对象隔离，不可以方法父上下文对象上的资源。
                 * @returns {*}
                 */
                newContext: function(element, isolate) {
                    var ChildContextConstructor,
                        childContext;

                    if (isolate) {
                        childContext = new Context();
                        childContext.constructor = Context;
                        //修正root，执行应用程序上下文。
                        childContext.root = this.root;
                        childContext.element = element;
                    }
                    else {
                        ChildContextConstructor = this.constructor.extend();
                        childContext = new ChildContextConstructor();
                        childContext.constructor = ChildContextConstructor;
                        childContext.id = _.uniqueId("context");
                        childContext.parent = this;
                        childContext.element = element;
                        childContext.injector = this.injector;
                    }
                    return childContext;
                },

                view: function() {
                    return this.element.data("viewInstance");
                },

                model: function(modelName) {
                    var modelProvider = this.injector.get("$model");
                    return modelProvider(modelName);
                },

                controller: function(controllerName) {
                    var controllerProvider = this.injector.get("$controller");
                    return controllerProvider(controllerName);
                },

                getParam: function(key) {
                    var param = this.params[key];
                    if (param === null || param === undefined) {
                        param = (this.parent ? this.parent.getParam(key) : null);
                    }
                    return param;
                    //                    return this.params[key];
                    //                    var parsedParamObject = this.parseParamExpression(key);
                    //                    if (parsedParamObject.type == "context") {
                    //                        var param = this.params[parsedParamObject.key];
                    //                        param || (this._super ? this._super(key) : undefined);
                    //                        return param;
                    //                    }
                    //todo 缺少与其他类型变量服务的集成。
                    //                    return undefined;
                },

                setParam: function(key, value) {
                    this.params[key] = value;
                    return this;
                },

                evaluateExpression: function(expression) {
                    return $variableService.evaluateExpression(expression, this);
                },

                parseParamExpression: function(paramExpression) {
                    //todo 缺少使用正则表达式解析paramExpression
                    return $variableService.parse(paramExpression, this);
                    //                    return {
                    //                        type: "context",
                    //                        key: ""
                    //                    }
                },

                invoke: function(methodObjectOrArray) {
                    var invokeArray = [],
                        invokeResult,
                        self = this;

                    if (isArray(methodObjectOrArray)) {
                        invokeArray = methodObjectOrArray;
                    }
                    else {
                        invokeArray.push(methodObjectOrArray);
                    }

                    var methodObject = invokeArray.shift();
                    if (methodObject) {
                        invokeResult = excuteMethod(methodObject, this);
                        if (invokeArray.length === 0) {
                            return invokeResult;
                        }
                        if (invokeResult && invokeResult['then']) {
                            return invokeResult.then(function() {
                                return self.invoke(methodObjectOrArray);
                            });
                        }
                        else {
                            return this.invoke(methodObjectOrArray);
                        }
                    }
                    //
                    //                    each(invokeArray, function(methodObject) {
                    //                        var providerName = methodObject.provider || "$controller",
                    //                            instanceName = methodObject.target,
                    //                            methodName = methodObject.methodName,
                    //                            params = methodObject.params,
                    //                            caller = methodObject.caller,
                    //                            controllerFactory,
                    //                            instance,
                    //                            method;
                    //
                    //                        if (instanceName && typeof instanceName == "string") {
                    //                            if (!this.controllers[instanceName]) {
                    //                                controllerFactory = this.injector.get(providerName);
                    //                                this.controllers[instanceName] = controllerFactory(instanceName, {"$context": this});
                    //                            }
                    //                            instance = this.controllers[instanceName];
                    //                            method = instance[methodName];
                    //                            params = params || [];
                    //
                    //                            $variableService.parse(params, this);
                    //
                    //                            switch (caller ? -1 : params.length) {
                    //                                case  0:
                    //                                    invokeResult = method.call(instance);
                    //                                    break;
                    //                                case  1:
                    //                                    invokeResult = method.call(instance, params[0]);
                    //                                    break;
                    //                                case  2:
                    //                                    invokeResult = method.call(instance, params[0], params[1]);
                    //                                    break;
                    //                                case  3:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2]);
                    //                                    break;
                    //                                case  4:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2], params[3]);
                    //                                    break;
                    //                                case  5:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4]);
                    //                                    break;
                    //                                case  6:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5]);
                    //                                    break;
                    //                                case  7:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6]);
                    //                                    break;
                    //                                case  8:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7]);
                    //                                    break;
                    //                                case  9:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8]);
                    //                                    break;
                    //                                case 10:
                    //                                    invokeResult = method.call(instance, params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9]);
                    //                                    break;
                    //                                default:
                    //                                    invokeResult = method.apply(self, params);
                    //                            }
                    //                        }
                    //                    }, this);
                    //
                    //                    if (invokeResult !== undefined) {
                    //                        return invokeResult;
                    //                    }
                    return this;
                }
            });

            var applicationContext = new Context();
            applicationContext.constructor = Context;

            function instantiate (name, element, parent, options, context) {
                var viewFactory = context.injector.get("$view");
                var instance = viewFactory(name, {
                        "element": element,
                        "parent": parent,
                        "options": options,
                        "$context": context
                    }
                );
                $(element).data("viewInstance", instance);

                var childrenElement = $("[data-view]", element);
                childrenElement.each(function() {
                    var name = $(this).attr("data-view");
                    instantiate(name, this, element, options, context.newContext($(this)));
                });
            }

            applicationContext.run = function(rootElement, injector) {
                this.injector = injector;
                var viewElements = $("[data-view]", rootElement);
                if (!viewElements.length || $(rootElement).attr('data-view')) {
                    viewElements = viewElements.add(rootElement);
                }
                viewElements.each(function() {
                    var name = $(this).attr("data-view");
                    if (!$(this).data("viewInstance")) {
                        instantiate(name, this, null, null, applicationContext.newContext($(this)));
                    }
                });
            };

            return applicationContext;
        }]
    }

    /**
     * 模型对象Provider
     */
    function $modelProvider () {
        var models = {}, modelCache = {},
            model_REG = /^(\w+)(\s+as\s+(\w+))?$/;

        this.$extend = ["$injector", function($injector) {
            return function(name, base, extendPrototype) {
                if (!extendPrototype) {
                    extendPrototype = base;
                    base = "GSPModel";
                }

                internalExtend(name, base, extendPrototype, $injector, models, {'nestedObject': 'instances', 'extendParentProto': true});
            }
        }];

        this.$get = ['$injector', function($injector) {
            return function(model, locals) {
                var instance, match, constructor, identifier;

                if (typeof model == "string") {
                    match = model.match(model_REG);
                    constructor = match[1];
                    identifier = match[3];

                    model = models[constructor];

                    //                    gsp.utils.assertArgFn(model, constructor, true);
                }

                if (modelCache.hasOwnProperty(constructor)) {
                    return modelCache[constructor];
                }
                modelCache[constructor] = instance = $injector.instantiate(model, locals);
                return instance;
            };
        }];
    }

    /**
     * 视图对象Provider
     */
    function $viewProvider () {
        var views = {},
            view_REG = /^(\w+)(\s+as\s+(\w+))?$/;

        this.$get = ['$injector', function($injector) {

            return function(view, locals) {
                var instance, match, constructor, identifier;

                if (typeof view == "string") {
                    match = view.match(view_REG);
                    constructor = match[1];
                    identifier = match[3];

                    view = views[constructor];
                    //                    gsp.utils.assertArgFn(view, constructor, true);
                }

                view.$inject = ["element", "parent", "options", "$context"];

                instance = $injector.instantiate(view, locals);
                return instance;
            };
        }];

        this.$extend = ["$injector", function($injector) {
            return function(name, base, extendPrototype) {

                if (!extendPrototype) {
                    extendPrototype = base;
                    base = "View";
                }

                internalExtend(name, base, extendPrototype, $injector, views);
            }
        }];
    }

    /**
     *控制器对象Provider
     */
    function $controllerProvider () {
        var controllers = {},
            controller_REG = /^(\w+)(\s+as\s+(\w+))?$/;

        function extend (dst, src) {
            _.each(arguments, function(obj) {
                if (obj !== dst) {
                    _.each(obj, function(value, key) {
                        dst[key] = value;
                    });
                }
            });
            return dst;
        }

        /**
         * @ngdoc function
         * @name ng.$controllerProvider#register
         * @methodOf ng.$controllerProvider
         * @param {string} name Controller name
         * @param {Function|Array} constructor Controller constructor fn (optionally decorated with DI
         *    annotations in the array notation).
         */
        this.register = function(name, constructor) {
            if (name && typeof name == "object") {
                extend(controllers, name)
            } else {
                controllers[name] = constructor;
            }
        };

        this.$extend = ["$injector", function($injector) {
            return function(name, base, extendPrototype) {
                if (!extendPrototype) {
                    extendPrototype = base;
                    base = "Controller";
                }

                internalExtend(name, base, extendPrototype, $injector, controllers);
            }
        }];

        this.$get = ['$injector', function($injector) {

            return function(controller, locals) {
                var instance, match, constructor, identifier;

                if (typeof controller == "string") {
                    match = controller.match(controller_REG);
                    constructor = match[1];
                    identifier = match[3];

                    controller = controllers[constructor];

                    //                    gsp.utils.assertArgFn(controller, constructor, true);
                }

                controller.$inject = ["$context"];
                instance = $injector.instantiate(controller, locals);

                return instance;
            };
        }];
    }

    /**
     * 消息提示对象Provider
     */
    function $messageServiceProvider () {
        this.$get = function() {
            return {

                confirm: function(message, confirmCallback) {
                    if (confirm(message)) {
                        confirmCallback();
                    }
                    return this;
                },

                error: function(error) {
                    var errorMessage;
                    if (isString(error)) {
                        errorMessage = error;
                    }
                    else {
                        if (error['Message'] || error['message']) {
                            errorMessage = error['Message'] || error['message'];
                        }
                        if (error && error['StackTrace']) {
                            errorMessage = errorMessage + ':\r\n' + error['StackTrace'];
                        }
                    }
                    alert(errorMessage);
                    return this;
                },

                notify: function(message) {
                    alert(message);
                    return this;
                }
            }
        }
    }

    /**
     * 参数验证对象Provider
     */
    function $validateServiceProvider () {
        this.$get = ["$messageService", function($messageService) {

            return {
                checkParamForNoneBlank: function(param, paramName) {
                    if (param === undefined || param === "") {
                        $messageService.notify("方法实参验证失败：\"" + paramName + "\"不应为undefined或着blank。");
                    }
                    return this;
                },

                checkParamForNoneBlankNull: function(param, paramName) {
                    if (param === undefined || param === "" || param === null) {
                        $messageService.notify("方法实参验证失败：\"" + paramName + "\"不应为undefined、blank或者null。");
                    }
                    return this;
                }
            }
        }]
    }

    /**
     * 环境变量解析对象Provider
     */
    function $variableServiceProvider () {
        this.$get = ["$injector", function(injector) {

            var variableParserRegisterOptions = [
                {
                    type: "session",

                    matchExpression: /\{SESSION~(\w+)\}/,

                    parser: "$sessionVariableParser"
                },

                {
                    type: "data",

                    matchExpression: /\{data:(\w+).(\w+).(\w+)\}/,

                    parser: "$dataVariableParser"
                },

                {
                    type: "formState",

                    matchExpression: /\{formState~(\w+)\}/,

                    parser: "$formStateVariableParser"
                }
            ];

            function getVariableParser (variable) {
                var matchedParser = null, matchResult;
                each(variableParserRegisterOptions, function(parser) {
                    matchResult = variable.match(parser.matchExpression)
                    if (matchResult && matchResult.length) {
                        matchedParser = injector.get(parser.parser);
                    }
                });
                return matchedParser;
            }

            function parseVariableExpression (variable, context) {
                var variableParser = getVariableParser(variable),
                    parsedVariable;
                if (variableParser) {
                    parsedVariable = variableParser.parse(variable, context);
                    return parseVariableExpression(parsedVariable, context);
                }
                else {
                    return variable;
                }
            }

            return {

                /**
                 * 计算变量表达式
                 * @param target 表达式。
                 * @param context 变量解析上下文即应用程序上下文对象。
                 * @returns {*}
                 */
                evaluateExpression: function(target, context) {
                    var parseTarget = this.parse(target, context);
                    return (new Function("return " + parseTarget))();
                },

                /**
                 * 解析变量
                 * @param target 支持变量对象，变量字符串，变量数组。
                 * @param context 变量解析上下文即应用程序上下文对象。
                 * @return {*}
                 */
                parse: function(target, context) {

                    if (typeof target === "string" && target.length > 0) {
                        return parseVariableExpression(target, context);
                    }
                    else if (isArray(target)) {
                        each(target, function(itemInArray, index) {
                            if (typeof itemInArray === "string") {
                                target[index] = this.parse(itemInArray, context);
                            }
                            else {
                                this.parse(itemInArray, context);
                            }
                        }, this)
                    }
                    else if (typeof target === "object") {
                        each(target, function(propertyValue, propertyName) {
                            target[propertyName] = this.parse(propertyValue, context);
                        }, this)
                    }
                    return target;
                },

                registerVariableParser: function(registerOption) {
                    if (typeof registerOption !== "object") {
                        throw new Error("The variableParser to register should be an object.");
                    }

                    if (!registerOption.hasOwnProperty("matchExpression")) {
                        throw new Error("The variableParser object must have a property named 'matchExpression' in order to find out the right variable. The matchExpression is Regex Expression.");
                    }

                    if (!registerOption.hasOwnProperty("parser")) {
                        throw new Error("The variableParser object must have a property named 'parser' to indicate which service to load to parse the variable.");
                    }

                    variableParserRegisterOptions.push(registerOption);
                }
            }
        }]
    }

    /**
     * 状态机对象Provider
     */
    function $stateMachineProvider () {
        this.$get = ["$injector", function($injector) {

            /**
             * 获取视图状态渲染服务
             * @param name 视图状态渲染服务名称
             * @returns {*}
             */
            function getRenderService (name) {
                return $injector.get(name);
            }

            /**
             * 工厂方法，创建状态机迁移服务。
             * @returns {状态机迁移服务}
             */
            function makeStateTransitService () {
                var actions = [], currentState, states;

                /**
                 * 渲染视图的某个状态
                 * @param view 待渲染视图
                 * @param state 视图状态
                 * @returns {this}
                 */
                function render (view, state) {
                    if (!states) {
                        throw new Error("StateMachine must be loaded First.");
                    }

                    if (states.hasOwnProperty(state)) {
                        throw new Error("The StateMachine is not have the state named '" + state + "'.");
                    }

                    var actionValidStates = {}, //当前状态下，所有动作有效状态列表。
                        renderServiceNames = states[state].renders,
                        transitions = states[state].transitions,
                        renderService;

                    //初始化当前状态下，所有动作的有效状态，初始值为false。
                    each(actions, function(action) {
                        //标记当前状态下所有动作均不可用。
                        actionValidStates[action] = false;
                    })

                    //遍历当前状态下有效状态迁移的集合，其中每一项的迁移动作，即为当前状态下可以执行的动作。
                    if (transitions && transitions.length) {
                        each(transitions, function(transition) {
                            //更新当状态下，所有动作有效状态列表，可执行的动作标记为true。
                            actionValidStates[transition["action"]] = true;
                        })
                    }

                    //如果当前状态定义了render，则使用相应的renderServe渲染视图的当前状态。
                    if (renderServiceNames && renderServiceNames.length) {
                        each(renderServiceNames, function(name) {
                            renderService = getRenderService(name);
                            renderService.render(view, state, actionValidStates);
                        })
                    }
                }

                function transitable () {
                    extend(this, transitable["fn"]);
                    return this;
                }

                transitable["fn"] = {

                    /**
                     * 判断某前置状态下是否可以执行某个动作进行状态变迁
                     * @param preState 前置状态
                     * @param transitAction 迁移动作
                     * @returns {boolean} 判断结果（ture/false）
                     */
                    canTransit: function(preState, transitAction) {
                        var state = states[preState],
                            transitions,
                            transitResult;

                        if (!state) {
                            return false;
                        }

                        transitions = state.transitions;
                        if (!transitions || !transitions.length) {
                            return false;
                        }

                        transitResult = findWhere(transitions, {action: transitAction});
                        return !!transitResult;
                    },

                    /**
                     * 进行状态迁移，并重新渲染迁移后的视图状态。
                     * @param view 待变更状态的视图，状态迁移后，重新渲染该视图。
                     * @param preState 前置状态。
                     * @param transitAction 触发状态迁移的动作。
                     * @returns {this}
                     */
                    transit: function(view, preState, transitAction) {
                        var nextState, transition;
                        if (this.canTransit(preState, transitAction)) {
                            transition = findWhere(states[preState].transitions, {action: transitAction});
                            currentState = nextState = transition.nextState;
                            render(view, currentState);
                        }
                        return this;
                    }
                };

                /**
                 *  状态机构造方法
                 * @param stateSource
                 * {
             *      init:{
             *          transitions:[{action:"add",nextState:"added"}],
             *          render:["defaultBar","customRender"]
             *      },
             *
             *      added:{
             *          transitions:[{action:"save",nextState:"init"}],
             *          render:["defaultBar","customRender"]
             *      }
             * }
                 * @returns {*}
                 */
                function stateMachine (stateSource) {
                    actions = [];//初始化状态机时将actions置空。
                    states = stateSource;

                    //遍历stateMachine中所有状态的状态迁移，构造所有动作的集合。
                    each(states, function(state) {
                        //如果当前状态定义了状态迁移，并且迁移的个数大于0，则遍历每个状态迁移。
                        if (state.hasOwnProperty("transitions") && isArray(state["transitions"]) && state["transitions"].length) {
                            each(state["transitions"], function(transition) {
                                //如果该动作未加入到所有动作集合，则将其加入。
                                if (actions.index(transition.action) === -1) {
                                    actions.push(transition.action);
                                }
                            })
                        }
                    });
                    return transitable.call(this);
                }
            }

            return makeStateTransitService();
        }]
    }

    /**
     * rest通信服务Provider
     */
    function $restServiceProvider () {
        this.$get = ['rest', '$deferred', function(restService, $deferred) {
            return {

                getParam: function(resource) {
                    return {
                        "Resource": resource,
                        "Parameter": [],
                        add: function(key, value) {
                            this["Parameter"].push([key, value]);
                        }
                    }
                },

                param: function(options) {
                    return restService.Param(options);
                },

                GetUrl: restService.GetUrl,

                BuildJsonParam: restService.BuildJsonParam,

                get: function(param, success, error) {
                    var deferred = $deferred();
                    restService.get(param, function(data) {
                        if (success) {
                            success(data);
                        }
                        deferred.resolve(data);
                    }, function(e) {
                        if (error) {
                            error(e);
                        }
                        deferred.reject(e);
                    });
                    return deferred;
                },

                put: function(param, success, error) {
                    var deferred = $deferred();
                    restService.put(param, function(data) {
                        if (success) {
                            success(data);
                        }
                        deferred.resolve(data);
                    }, function() {
                        if (error) {
                            error();
                        }
                        deferred.reject();
                    });
                    return deferred;
                },

                post: function(param, success, error) {
                    var deferred = $deferred();
                    restService.post(param, function(data) {
                        if (success) {
                            success(data);
                        }
                        deferred.resolve(data);
                    }, function() {
                        if (error) {
                            error();
                        }
                        deferred.reject();
                    });
                    return deferred;
                },

                del: function(param, success, error) {
                    var deferred = $deferred();
                    restService.del(param, function(data) {
                        if (success) {
                            success(data);
                        }
                        deferred.resolve(data);
                    }, function() {
                        if (error) {
                            error();
                        }
                        deferred.reject();
                    });
                    return deferred;
                },

                toDo: function(param, success, error) {
                    var deferred = $deferred();
                    restService.toDo(param, function(data) {
                        if (success) {
                            success(data);
                        }
                        deferred.resolve(data);
                    }, function() {
                        if (error) {
                            error();
                        }
                        deferred.reject();
                    });
                    return deferred;
                }
            }
        }];
    }

    exports.module('app')
        .provider({
            $context: $contextProvider,
            $controller: $controllerProvider,
            $messageService: $messageServiceProvider,
            $model: $modelProvider,
            $restService: $restServiceProvider,
            $stateMachine: $stateMachineProvider,
            $validateService: $validateServiceProvider,
            $variableService: $variableServiceProvider,
            $view: $viewProvider
        })
        .value('rest', gsp.rtf ? gsp.rtf.rest : {})
        .value('$deferred', $.Deferred);

    exports.application = (function() {
        var dependentModules = [];
        return {
            addDependency: function(modules) {
                if (isArray(modules)) {
                    each(modules, function(module) {
                        if (typeof module === "string" || isArray(module)) {
                            dependentModules.push(module);
                        }
                        else if (name in module) {
                            dependentModules.push(module.name);
                        }
                        else {
                            throw new Error("Failure to add dependent modules. The item of modules should be typeof string, array or an object with a property 'name'.")
                        }
                    })
                }
                else {
                    throw new Error("The dependent modules to add should be an array. ");
                }
            },

            requires: [],

            run: function(element, modules, options) {
                if (!options) {
                    options = modules ? modules : {};
                    modules = element;
                    element = "body";
                }

                element = $(element);
                modules = modules || [];
                for (var index = 0; index < modules.length; index++) {
                    if (typeof modules[index] == "object") {
                        modules[index] = modules[index].name;
                    }
                }

                modules.unshift(['$provide', function($provide) {
                    $provide.value('$rootElement', element);
                }]);

                for (index = dependentModules.length - 1; index >= 0; index--) {
                    modules.unshift(dependentModules[index]);
                }

                for (index = this.requires.length - 1; index >= 0; index--) {
                    modules.unshift(this.requires[index]);
                }
                modules.unshift("app");
                var injector = exports.injector(modules);
                injector.invoke(['$context',
                    function(appContext) {
                        for (var key in options) {
                            if (options.hasOwnProperty(key))
                                appContext.setParam(key, options[key])
                        }
                        appContext.run(element, injector);
                    }]
                );
                return injector;
            }
        };
    })();

})(window.gsp || (window.gsp = {}));

(function(global) {
    var extend = _.extend,
        exports = global || window,
        each = _.each,
        findWhere = _.findWhere,
        isArray = _.isArray,
        isFunction = _.isFunction,
        isObject = _.isObject,
        isString = _.isString,
        uniqueID = _.uniqueId;

    function $dataServiceProxyProvider () {
        this.$get = ["$restService", "$messageService", function($restService, $messageService) {
            return {
                invokeMethod: function(dataUri, methodName, params, successCallback, errorCallback) {
                    var restParameter = $restService.getParam("BizComponentRESTService"),
                        parameterIndex, jsonParameter = [];

                    restParameter.add("BizComponentURI", dataUri);
                    restParameter.add("MethodName", methodName);

                    for (var index = 0; index < params.length; index++) {
                        jsonParameter.push(JSON.stringify(params[index]));
                    }

                    var strParameters = JSON.stringify(jsonParameter);
                    restParameter.add("Parameters", strParameters);
                    return $restService.get(restParameter)
                        .then(function(strReturnValues) {
                            var returnValues = JSON.parse(strReturnValues),
                                returnValue = JSON.parse(returnValues[0]),
                                outValueIndexArr = JSON.parse(returnValues[1]),
                                outValuesArr = JSON.parse(returnValues[2]),
                                outParams;

                            if (outValuesArr.length > 0) {
                                outParams = JSON.parse(outValuesArr[0]);
                            }

                            if (successCallback != null) {
                                successCallback(returnValue, outParams);
                            }
                            return {'data': returnValue, 'outParams': outParams}
                        }, function(error) {
                            $messageService.error(error);
                            if (window['console']) {
                                console.error(error.Message);
                                console.error(error.StackTrace);
                            }
                            if (errorCallback != null) {
                                errorCallback(error);
                            }
                        });
                },

                removeObject: function(dataUri, dataModelID, objectID, successCallback, errorCallback) {
                    var parameters = [dataModelID, objectID];
                    return this.invokeMethod(dataUri, "RemoveObject", parameters, successCallback, errorCallback);
                },

                removeObjects: function(dataUri, dataModelId, condition, callBack, errCallBack) {
                    var parameters = [dataModelId, condition];
                    return this.invokeMethod(dataUri, "RemoveObjectsByFilter", parameters, callBack, errCallBack);
                },

                addObject: function(dataUri, dataModelID, data, callBack, errCallBack) {
                    var parameters = [dataModelID, data];
                    return this.invokeMethod(dataUri, "AddObject", parameters, callBack, errCallBack);
                },

                saveObject: function(dataUri, dataModelID, data, callBack, errCallBack) {
                    var parameters = [dataModelID, data];
                    return this.invokeMethod(dataUri, "SaveObject", parameters, callBack, errCallBack);
                },

                saveObjects: function(dataUri, dataModelID, data, callBack, errorCallBack) {
                    var parameters = [dataModelID, data];
                    return this.invokeMethod(dataUri, "SaveObjects", parameters, callBack, errorCallBack);
                },

                getObjectXml: function(dataUri, dataModelID, objectID, queryType, callBack, errorCallBack) {
                    var parameters = [dataModelID, objectID, queryType];
                    return this.invokeMethod(dataUri, "GetObjectXml", parameters, callBack, errorCallBack);
                },

                getObjectsXml: function(dataUri, dataModelID, filter, queryType, policy, callBack, errorCallBack) {
                    var parameters = [dataModelID, filter, queryType, policy];
                    return this.invokeMethod(dataUri, "GetObjectsXml", parameters, callBack, errorCallBack);
                },

                newObjectWithDefault: function(dataUri, dataModelID, formDefinitionID, userID, callBack, errorCallBack) {
                    var parameters = [dataModelID, formDefinitionID, userID];
                    return this.invokeMethod(dataUri, "NewObjectWithDefault", parameters, callBack, errorCallBack);
                }
            }
        }];
    }

    function $filterHelperProvider () {

        /**
         * "{
         *      filterCondition:\"[{Field:'OrgID_Code',Compare:' = ',Value:'00010002'}]\",
         *      orderByCondition:'',
         *      fiscalYear:'',
         *      pagination:{pageIndex:1,pageSize:2,totalCount:0},
         *      topSize:0
         *  }"
         */

        this.$get = function() {
            return {

                mergeExpressionToFilter: function(filterObject, condition, sort, pagination) {
                    var filterCondition = filterObject.filterCondition || [],
                        expressIndex = 0, firstExpress, lastExpress,
                        expressionArrayToMerge,
                        sourceExpressionArray,
                        mergedExpressionArray;

                    condition = condition || [];

                    expressionArrayToMerge = $.isArray(condition) ? condition : JSON.parse(condition);
                    sourceExpressionArray = $.isArray(filterCondition) ? filterCondition : JSON.parse(filterCondition);

                    if (!$.isPlainObject(filterObject)) {
                        throw new Error("The param filterObject should be a plain object.")
                    }

                    mergedExpressionArray = sourceExpressionArray.length > 0 ? sourceExpressionArray : [];

                    if (mergedExpressionArray.length) {
                        firstExpress = mergedExpressionArray[0];
                        lastExpress = mergedExpressionArray[mergedExpressionArray.length - 1];

                        firstExpress["Lbracket"] = firstExpress["Lbracket"] ? firstExpress["Lbracket"] + "(" : "(";
                        lastExpress["Rbracket"] = lastExpress["Rbracket"] ? lastExpress["Rbracket"] + ")" : ")";
                    }

                    if (expressionArrayToMerge.length) {
                        firstExpress = expressionArrayToMerge[0];
                        lastExpress = expressionArrayToMerge[expressionArrayToMerge.length - 1];
                        firstExpress["Lbracket"] = firstExpress["Lbracket"] ? firstExpress["Lbracket"] + "(" : "(";
                        lastExpress["Rbracket"] = lastExpress["Rbracket"] ? lastExpress["Rbracket"] + ")" : ")";

                        for (; expressIndex < expressionArrayToMerge.length; expressIndex++) {
                            mergedExpressionArray.push(expressionArrayToMerge[expressIndex]);
                        }
                    }

                    filterObject.filterCondition = JSON.stringify(mergedExpressionArray);
                    filterObject.orderByCondition = filterObject.orderByCondition ? filterObject.orderByCondition + " " + sort : "";
                    if (pagination) {
                        filterObject.pagination = pagination;
                    }
                    return filterObject;
                },

                mergeExpression: function(filterObject) {
                    var filterCondition = filterObject.filterCondition,
                        inputExpressionArraysToMerge = Array.prototype.slice.call(arguments, 1),
                        index = 0,
                        expressionArrayToMerge,
                        inputArraysLength = inputExpressionArraysToMerge.length,
                        expressIndex = 0,
                        mergedExpressionArray,
                        first, last;

                    if (!inputArraysLength)
                        return filterObject;

                    if ($.isPlainObject(filterObject)) {
                        var targetExpressionArray;
                        if (filterObject.filterCondition && typeof filterObject.filterConditon === "string") {
                            targetExpressionArray = JSON.parse(filterObject.filterCondition);
                        }
                        else {
                            targetExpressionArray = [];
                        }
                        mergedExpressionArray = targetExpressionArray.length > 0 ? targetExpressionArray : [];
                        if (mergedExpressionArray.length) {
                            first = filterCondition[0];
                            last = filterCondition[filterCondition.length - 1];

                            first["Lbracket"] = first["Lbracket"] ? first["Lbracket"] + "(" : "(";
                            last["Rbracket"] = last["Rbracket"] ? last["Rbracket"] + ")" : ")";
                        }

                        for (; index < inputArraysLength; index++) {
                            expressionArrayToMerge = inputExpressionArraysToMerge[index];
                            if (expressionArrayToMerge) {
                                expressionArrayToMerge = typeof expressionArrayToMerge == "string" ? JSON.parse(expressionArrayToMerge) : expressionArrayToMerge;
                            }
                            else {
                                expressionArrayToMerge = [];
                            }

                            if ($.isArray(expressionArrayToMerge) && expressionArrayToMerge.length) {
                                first = expressionArrayToMerge[0];
                                last = expressionArrayToMerge[inputExpressionArraysToMerge.length - 1];
                                first["Lbracket"] = first["Lbracket"] ? first["Lbracket"] + "(" : "(";
                                last["Rbracket"] = last["Rbracket"] ? last["Rbracket"] + ")" : ")";

                                for (; expressIndex < expressionArrayToMerge.length; expressIndex++) {
                                    mergedExpressionArray.push(expressionArrayToMerge[expressIndex]);
                                }
                            }
                        }
                        filterObject.filterCondition = JSON.stringify(mergedExpressionArray);
                    }
                    return filterObject;
                },

                parseVariable: function(filter) {

                },

                createFilter: function(filterCondition, orderByCondition, pagination) {
                    return {
                        filterCondition: filterCondition || "",
                        orderByCondition: orderByCondition || "",
                        fiscalYear: "",
                        topSize: -1,
                        pagination: pagination || {
                            pageIndex: 1,
                            pageSize: 999,
                            totalCount: 0
                        }
                    };
                },

                createExpression: function(field, compare, value, relation, leftBracket, rightBracket, isFilterExpression) {
                    var express = {
                        Field: field,
                        Compare: compare,
                        Value: value
                    };

                    if (relation) {
                        express["Relation"] = relation;
                    }

                    if (leftBracket) {
                        express["Lbracket"] = leftBracket;
                    }

                    if (rightBracket) {
                        express["Rbracket"] = rightBracket;
                    }

                    if (isFilterExpression) {
                        express["Expresstype"] = "Expression";
                    }
                    return express;
                },

                createPagination: function() {
                    return {
                        pageIndex: 1,
                        pageSize: 999,
                        totalCount: 0
                    };
                },

                toJSON: function(filterObject) {
                    JSON.stringify(filterObject);
                },

                parseExpressionArray: function(expressionString) {
                    return JSON.parse(expressionString);
                },

                parseFilter: function(filterString) {
                    return JSON.parse(filterString);
                },

                filterNull: function(filterCondition) {

                    var jsonObj = JSON.parse(filterCondition);

                    var ExpressType = {
                        Value: 0,//值类型
                        Expression: 1 //表达式类型
                    };

                    //遍历所有的行
                    var count = jsonObj.length;
                    for (var i = count - 1; i >= 0; i--) {
                        var expression = jsonObj[i];
                        var isNull = false;
                        //操作符为‘=’ and （（值类型 and 值为空）|| （表达式类型 and 值为‘’）），符合上述条件，则进行空值处理
                        if ($.trim(expression.Compare).indexOf("=") == 0) {
                            if ((expression.Expresstype == ExpressType.Value && $.trim(expression.Value) == '')
                                || (expression.Expresstype == ExpressType.Expression && (($.trim(expression.Value) == "''") || ($.trim(expression.Value) == "\'\'")))) {
                                isNull = true;
                            }
                        }

                        if (isNull) {
                            var hasLeftBracket = ($.trim(expression.Lbracket) != '');
                            var hasRightBracket = ($.trim(expression.Rbracket) != '');

                            while (hasLeftBracket && hasRightBracket) {
                                //成对去除左右括号
                                var index = expression.Lbracket.indexOf('(');
                                expression.Lbracket = expression.Lbracket.slice(index + 1);
                                index = expression.Rbracket.indexOf(')');
                                expression.Rbracket = expression.Rbracket.slice(index + 1);
                                hasLeftBracket = ($.trim(expression.Lbracket) != '');
                                hasRightBracket = ($.trim(expression.Rbracket) != '');
                            }
                            if (hasLeftBracket) {
                                //有左括号，则移到下一个过滤条件上
                                if (i < jsonObj.length - 1) {
                                    var nextExpression = jsonObj[i + 1];
                                    nextExpression.Lbracket = ((nextExpression.Lbracket != undefined) ? nextExpression.Lbracket : '') + $.trim(expression.Lbracket);
                                }
                            }
                            else {
                                //有右括号，则移到前一个过滤条件上
                                if (i > 0) {
                                    var previousExpression = jsonObj[i - 1];
                                    previousExpression.Relation = expression.Relation;
                                    if (hasRightBracket) {
                                        previousExpression.Rbracket = ((previousExpression.Rbracket != undefined) ? previousExpression.Rbracket : '') + $.trim(expression.Rbracket);
                                    }
                                }
                            }
                            //移除
                            jsonObj.splice(i, 1);
                        }
                    }
                    return JSON.stringify(jsonObj);
                }
            }
        }
    }

    function $sessionVariableParserProvider () {
        this.$get = function() {
            var matchExpression = /\{SESSION~(\w+)\}/;
            return {
                parse: function(variable) {
                    var matchKeys, sessionKey;
                    if (typeof variable === "string") {
                        matchKeys = variable.match(matchExpression);
                        if (matchKeys && matchKeys.length === 2) {
                            sessionKey = matchKeys[1];
                            return gsp.rtf.context.get(sessionKey);
                        }
                    }
                }
            }
        }
    }

    function $dataVariableParserProvider () {
        this.$get = ["$context", function(applicationContext) {
            var matchExpression = /\{data:(\w+).(\w+).(\w+)\}/;
            return {
                parse: function(variable) {
                    var matchKeys,
                        dataSource,
                        instance,
                        instanceName,
                        tableName,
                        fieldName,
                        parsedResult = variable;

                    if (typeof variable === "string") {
                        matchKeys = variable.match(matchExpression);
                        if (matchKeys && matchKeys.length === 4) {
                            instanceName = matchKeys[1];
                            tableName = matchKeys[2];
                            fieldName = matchKeys[3];
                            instance = applicationContext.model(instanceName);
                            if (instance) {
                                dataSource = instance.dataSource;
                                if (dataSource && tableName) {
                                    parsedResult = variable.replace(matchExpression, dataSource.tables(tableName).defaultView().currentItem[fieldName]());
                                }
                            }
                        }
                    }
                    return parsedResult;
                }
            }
        }]
    }

    function $formStateVariableParserProvider () {
        this.$get = function() {
            var matchExpression = /\{formState~(\w+)\}/;
            return {
                parse: function(variable, context) {
                    var matchKeys, formStateKey;
                    if (typeof variable === "string") {
                        matchKeys = variable.match(matchExpression);
                        if (matchKeys && matchKeys.length === 2) {
                            formStateKey = matchKeys[1];
                            return context.getParam(formStateKey);
                        }
                    }
                }
            }
        }
    }

    exports.module('gsp.app').provider({
        '$dataServiceProxy': $dataServiceProxyProvider,
        '$dataVariableParser': $dataVariableParserProvider,
        '$filterHelper': $filterHelperProvider,
        "$formStateVariableParser": $formStateVariableParserProvider,
        '$sessionVariableParser': $sessionVariableParserProvider
    });

    exports.module('gsp.app').model('GSPModel', ['$restService', '$dataServiceProxy', '$filterHelper', '$variableService', '$model', '$deferred',
        function($restService, $dataServiceProxy, $filter, $variableService, $model, $deferred) {

            return {

                init: function() {
                    this.dataUri = this.dataUri || "";
                    this.dataModelID = this.dataModelID || "";
                    this.primaryKey = this.primaryKey || "";
                    this.instances = this.instances || {};
                    this.dataSource = null;
                    this.dataSourceName = this.dataSourceName || '';
                    this.defalutInstance = ""//todo 模型增加默认实例
                    this.restService = $restService;
                },

                getDefaultListViewInstance: function() {
                    var instance, instanceName;
                    for (instanceName in this.instances) {
                        if (this.instances.hasOwnProperty(instanceName)) {
                            instance = this.instances[instanceName];
                            if (instance && instance['view'] == 3) {
                                return $model(instance['dataSourceName']);
                            }
                        }
                    }
                    return null;
                },

                getDefaultCardViewInstance: function() {
                    var instance, instanceName;
                    for (instanceName in this.instances) {
                        if (this.instances.hasOwnProperty(instanceName)) {
                            instance = this.instances[instanceName];
                            if (instance && instance["view"] == 1) {
                                return $model(instance['dataSourceName']);
                            }
                        }
                    }
                    return null;
                },

                addItemWithDefaultValue: function(formID, callback) {
                    var self = this;
                    return $dataServiceProxy.newObjectWithDefault(this.dataUri, this.dataModelID, formID, '')
                        .then(function(context) {
                            $variableService.parse(context.data);
                            self.dataSource.tables(0).addRow(_.values(context.data)[0][0]);
                            self.dataSource.tables(0).defaultView().moveCurrentToLast();
                            //                            self.dataSource.tables(0).defaultView()
                            //                                .add(_.values(context.data)[0][0])
                            //                                .moveCurrentToLast();
                            //                            self.dataSource = exports.dataSource(data, self.dataSourceName);
                            if (callback) {
                                callback(self.dataSource);
                            }
                            return self.dataSource;
                        });
                },

                /**
                 * 新增一条记录并返回默认值
                 * @param formID 数据绑定范围
                 * @param callback 回调对象
                 */
                createInstanceWithDefaultValue: function(formID, callback) {
                    var relationTableNameRgx = /List$/,
                        self = this;
                    return $dataServiceProxy.newObjectWithDefault(this.dataUri, this.dataModelID, formID, '')
                        .then(function(context) {
                            $variableService.parse(context.data);
                            self.dataSource = exports.dataSource(context.data, self.dataSourceName);
                            self.dataSource.tables.each(function(table, index) {
                                if (index === 0 || table.rows.count() === 0 || table.name().match(relationTableNameRgx))
                                    return;
                                var row = table.rows(0);
                                table.columns.each(function(column) {
                                    column.defaultValue(row(column.name()));
                                });
                                table.clear();
                            });
                            if (callback) {
                                callback(self.dataSource);
                            }
                            return self.dataSource;
                        });
                },

                getDataPosition: function(dataUri) {
                    var dataModelID = this.dataModelID,
                        filterCondition = dataUri && dataUri['filterCondition'] ? dataUri['filterCondition'] : this.filter,
                        orderBy = dataUri && dataUri['orderBy'] ? dataUri['orderBy'] : this.sort,
                        pagination = dataUri && dataUri['pagination'] ? dataUri['pagination'] : this.pagination,
                        dataID = dataUri ? dataUri['dataID'] : '';
                    return $dataServiceProxy.invokeMethod('FormDataAccess.Web', 'GetDataPosition', [
                            {
                                dataID: dataID,
                                filter: $filter.createFilter(filterCondition, orderBy, pagination),
                                modelID: dataModelID
                            }
                        ])
                        .then(function(result) {
                            if (window['console']) {
                                console.log(result);
                            }
                            return result;
                        })
                },

                load: function(dataUri) {
                    var self = this,
                        view = this.view,
                        filterCondition = dataUri && dataUri['filterCondition'] ? dataUri['filterCondition'] : this.filter,
                        orderBy = dataUri && dataUri['orderBy'] ? dataUri['orderBy'] : this.sort,
                        pagination = dataUri && dataUri['pagination'] ? dataUri['pagination'] : this.pagination,
                        dataID = dataUri ? dataUri['dataID'] : '',
                        formID = dataUri ? dataUri['formID'] : '';

                    function loadData () {
                        switch (view) {
                            case '1':
                                return self.loadWithDataID(dataID, null);
                            case '3':
                                return self.loadWithFilter($filter.createFilter(filterCondition, orderBy, pagination), null);
                        }
                        return $deferred().resolve();
                    }

                    if (formID) {
                        return this.loadSchema(formID).then(loadData);
                    }
                    return loadData();
                },

                loadSchema: function(formID) {
                    var dataModelID = this.dataModelID,
                        self = this,
                        view = this.view;
                    return $dataServiceProxy.invokeMethod('FormDataAccess.Web', 'GetDataSourceSchema', [
                            {
                                formID: formID,
                                userID: '',
                                modelID: dataModelID,
                                view: view
                            }
                        ])
                        .then(function(result) {
                            $variableService.parse(result);
                            if (window['console']) {
                                console.log(result.data['schemas']);
                            }
                            self.schema = result.data['schemas'];
                        })
                },

                /**
                 * 根据过滤条件加载数据
                 * @param filter GSPFilter过滤条件
                 * @param callback 回调对象
                 */
                loadWithFilter: function(filter, callback) {
                    var pagination,
                        self = this;
                    return $dataServiceProxy.getObjectsXml(this.dataUri, this.dataModelID, filter, 3, null)
                        .then(function(context) {
                            if (!self.dataSource) {
                                self.dataSource = exports.dataSource(context.data, {name: self.dataSourceName, schema: self.schema});
                                self.dataSource.tables(0).primaryKey = self.primaryKey;
                                if (context.outParams && context.outParams['Pagination']) {
                                    pagination = context.outParams['Pagination'];
                                    self.dataSource.tables(0).defaultView()
                                        .setPagination({
                                            'pageCount': pagination['PageCount'],
                                            'pageIndex': pagination['PageIndex'],
                                            'pageSize': pagination['PageSize'],
                                            'recordsCount': pagination['TotalCount']
                                        });
                                }
                            }
                            else {
                                if (context.outParams && context.outParams['Pagination']) {
                                    pagination = context.outParams['Pagination'];
                                    self.dataSource.tables(0).defaultView()
                                        .setPagination({
                                            'pageCount': pagination['PageCount'],
                                            'pageIndex': pagination['PageIndex'],
                                            'pageSize': pagination['PageSize'],
                                            'recordsCount': pagination['TotalCount']
                                        });
                                }
                                self.dataSource.load(context.data);
                            }
                            if (context.outParams && context.outParams['Pagination']) {
                                pagination = context.outParams['Pagination'];
                                self.dataSource.tables(0).defaultView()
                                    .off('pageChange')
                                    .on('pageChange', function(event, args) {
                                        filter.pagination.pageIndex = args.pageIndex;
                                        filter.pagination.pageSize = args.pageSize;
                                        self.loadWithFilter(filter, callback);
                                    });
                            }
                            if (callback) {
                                callback(self.dataSource, context.outParams);
                            }
                            return self.dataSource;
                        });
                },

                /**
                 * 根据过滤条件和模型取数视图加载数据
                 * @param filter 过滤条件
                 * @param modelView 模型视图
                 * @param callback 回调对象
                 */
                loadWithFilterAndView: function(filter, modelView, callback) {
                    var self = this;
                    return $dataServiceProxy.getObjectsXml(this.dataUri, this.dataModelID, filter, modelView, null)
                        .then(function(context) {
                            if (!self.dataSource) {
                                self.dataSource = exports.dataSource(context.data, {name: self.dataSourceName, schema: self.schema});
                                self.dataSource.tables(0).primaryKey = self.primaryKey;
                            }
                            else {
                                self.dataSource.load(context.data);
                            }
                            if (callback) {
                                callback(self.dataSource, context.outParams);
                            }
                            return self.dataSource;
                        });
                },

                /**
                 * 根据过滤条件和数据权限加载数据
                 * @param filter 过滤条件
                 * @param modelView 模型视图
                 * @param policy 数据权限取数策略
                 * @param callback 回调对象
                 */
                loadWithQueryPolicy: function(filter, modelView, policy, callback) {
                    var self = this;
                    return $dataServiceProxy.getObjectsXml(this.dataUri, this.dataModelID, filter, modelView, policy)
                        .then(function(context) {
                            if (!this.dataSource) {
                                self.dataSource = exports.dataSource(context.data, {name: self.dataSourceName, schema: self.schema});
                                self.dataSource.tables(0).primaryKey = self.primaryKey;
                            }
                            else {
                                self.dataSource.load(context.data);
                            }
                            if (callback) {
                                callback(self.dataSource, context.outParams);
                            }
                            return self.dataSource;
                        });
                },

                /**
                 * 根据数据ID加载某一条数据
                 * @param dataID 数据ID
                 * @param callback 回调对象
                 */
                loadWithDataID: function(dataID, callback) {
                    if (!dataID) {
                        return $deferred().resolve();
                    }
                    var self = this;

                    function loadWithDataID () {
                        return $dataServiceProxy.getObjectXml(self.dataUri, self.dataModelID, dataID, 1)
                            .then(function(context) {
                                $variableService.parse(context.data);
                                if (!this.dataSource) {
                                    self.dataSource = exports.dataSource(context.data, {name: self.dataSourceName, schema: self.schema});
                                    self.dataSource.tables(0).primaryKey = self.primaryKey;
                                }
                                else {
                                    self.dataSource.load(context.data);
                                }
                                if (callback) {
                                    callback(self.dataSource, context.outParams);
                                }
                                return self.dataSource;
                            });
                    }

                    if (!this.schema && this.formID) {
                        return this.loadSchema(this.formID).then(loadWithDataID);
                    }
                    return loadWithDataID();
                },

                /**
                 * 根据数据ID和模型取数视图加载数据
                 * @param dataID 数据ID
                 * @param modelView 模型取数视图
                 * @param callback 回调对象
                 */
                loadWithDataIDAndView: function(dataID, modelView, callback) {
                    var self = this;
                    return $dataServiceProxy.getObjectXml(this.dataUri, this.dataModelID, dataID, modelView)
                        .then(function(context) {
                            $variableService.parse(context.data);
                            if (!this.dataSource) {
                                self.dataSource = exports.dataSource(context.data, {name: self.dataSourceName, schema: self.schema});
                                self.dataSource.tables(0).primaryKey = self.primaryKey;
                            }
                            else {
                                self.dataSource.load(context.data);
                            }
                            if (callback) {
                                callback(self.dataSource, context.outParams);
                            }
                            return self.dataSource;
                        });
                },

                /**
                 * 删除一条记录
                 * @param dataID 数据ID
                 * @param callback 删除完成后回调方法
                 */
                remove: function(dataID, callback) {
                    return $dataServiceProxy.removeObject(this.dataUri, this.dataModelID, dataID)
                        .then(function(context) {
                            if (callback) {
                                callback.call(context.data);
                            }
                        });
                },

                /**
                 * 提交数据
                 * @param callback 回调对象
                 */
                submit: function(callback) {
                    if (this.view && this.view === '3') {
                        return this.submitForListView(callback);
                    }
                    return this.submitForCardView(callback);
                },

                submitForCardView: function(callback) {
                    var currentDataSource = this.dataSource,
                        data = currentDataSource.peek(),
                        self = this;

                    _.each(data, function(rows, tableName) {
                        if (rows.length === 0) {
                            delete data[tableName];
                        }
                    });
                    if (window['console']) {
                        console.log(data);
                    }
                    return $dataServiceProxy.saveObject(this.dataUri, this.dataModelID, data)
                        .then(function(savedContext) {
                            var rawRow, updatingRow;
                            currentDataSource.acceptChanges();
                            if (self.primaryKey && savedContext && savedContext.data.length) {
                                rawRow = _.values(data)[0][0];
                                rawRow[self.primaryKey] = savedContext.data;
                                updatingRow = currentDataSource.tables(0).rows(0);
                                updatingRow(self.primaryKey, savedContext.data, true)
                                    .table().acceptChanges();
                            }
                            if (callback) {
                                callback(savedContext);
                            }
                            return savedContext;
                        });
                },

                submitForListView: function(callback) {
                    var currentDataSource = this.dataSource,
                        rawChanges = currentDataSource.getRawChanges(['added', 'modified']),
                        rawDeletedChanges = currentDataSource.getRawChanges('deleted'),
                        deleteDeferred,
                        deleteExpresses = [],
                        deleteFilter,
                        deleteIDs = [],
                        self = this;

                    each(_.values(rawDeletedChanges)[0], function(rawDeletedRow) {
                        deleteIDs.push('\'' + rawDeletedRow[self.primaryKey] + '\'');
                    });

                    function applyDeleteChanges (dataUri, dataModelID, deleteIDs) {
                        if (deleteIDs.length) {
                            deleteExpresses.push($filter.createExpression(self.primaryKey, ' in ', '(' + deleteIDs.join(',') + ')'));
                            deleteFilter = $filter.mergeExpressionToFilter($filter.createFilter(), deleteExpresses);
                            return $dataServiceProxy.removeObjects(dataUri, dataModelID, deleteFilter);
                        }
                        return null;
                    }

                    function applyAddedAndModifiedChanges (dataUri, dataModelID, rawChanges) {
                        if (window['console']) {
                            console.log(rawChanges);
                        }
                        return $dataServiceProxy.saveObjects(dataUri, dataModelID, rawChanges)
                            .then(function(savedContext) {
                                currentDataSource.acceptChanges();
                                if (self.primaryKey && savedContext && savedContext.data.length) {
                                    each(_.values(rawChanges)[0], function(rawRow, index) {
                                        var updatingRow;
                                        rawRow[self.primaryKey] = savedContext.data[index];
                                        updatingRow = currentDataSource.tables(0).rows.find(function(row) {
                                            return row.getValue(self.primaryKey) === savedContext.data[index];
                                        });
                                        if (updatingRow) {
                                            updatingRow(self.primaryKey, savedContext.data[index], true)
                                                .table().acceptChanges();
                                        }
                                    });
                                }
                                if (callback) {
                                    callback(savedContext);
                                }
                                return savedContext;
                            });
                    }

                    deleteDeferred = applyDeleteChanges(this.dataUri, this.dataModelID, deleteIDs);
                    if (deleteDeferred) {
                        return deleteDeferred.then(applyAddedAndModifiedChanges(this.dataUri, this.dataModelID, rawChanges));
                    }
                    else {
                        return applyAddedAndModifiedChanges(this.dataUri, this.dataModelID, rawChanges);
                    }
                }
            }
        }
    ]);

    exports.module('gsp.app').view('View', function() {
        $.expr[":"]["setReadOnly"] = function(element) {
            return $.data(element, "setReadOnly");
        };

        return {
            /**
             * 事件命名空间
             */
            eventPrefix: ".viewEvent",

            /**
             * 用于解析events参数中事件名称和元素的正则表达式
             */
            delegateEventSplitter: /^(\S+)\s*(.*)$/,

            options: {},

            init: function(elementOrElementID, parent, options, context) {
                this.uid = uniqueID("view");

                this.context = context;

                if (options) {
                    this.options = extend({}, this.options, options);
                }

                this['parentView'] = parent;

                var rootElement = typeof elementOrElementID !== "string" ?
                    $(elementOrElementID) : $("#" + elementOrElementID, parent);

                this.setRoot(rootElement);
                this.render();
                this.onInitializing();
                this.initWidgets();
                this.afterWidgetsInit();
                this.onInitialized();
            },

            initWidgets: function() {

            },

            afterWidgetsInit: function() {

            },

            find: function(selector) {
                return this.$element.find(selector);
            },

            getRoot: function() {
                return this.$element;
            },

            onInitialized: function() {

            },

            onInitializing: function() {

            },

            setRoot: function(element) {
                // 如果已经存在了$el属性(可能是手动调用了setElement方法切换视图的元素), 则取消之前对$el绑定的events事件(详细参考undelegateEvents方法)
                if (this.$element)
                    this.$element.off();

                // 将元素创建为jQuery或Zepto对象, 并存放在$el属性中
                this.$element = ( element instanceof jQuery) ? element : $(element);
                // this.el存放标准的DOM对象
                this.element = this.$element[0];

                this.$element.data("viewInstance", this);

                this._bindEvents();

                return this;
            },

            setFormInputReadOnly: function(formOrContainerID, readOnly) {
                var formSelector = (arguments.length == 1) ? "" : "#" + formOrContainerID + " ",
                    selectContext = this.element;

                if (arguments.length == 1) {
                    readOnly = formOrContainerID;
                }

                if (readOnly) {
                    //仅更改初始状态为非只读的输入控件，并记录由运行时为其设置只读状态。
                    $(formSelector + "input[data-readonly='false']", selectContext)
                        .add(formSelector + "select[data-readonly='false']", selectContext)
                        .add(formSelector + "textarea[data-readonly='false']", selectContext)
                        .each(function(index, element) {
                            $(element).data("setReadOnly", true)
                                .instanceInvoke("setOption", "readOnly", true);
                        })
                }
                else {
                    //仅更改标记为setReadOnlyInRuntime的输入控件的只读状态。
                    $(formSelector + "input:setReadOnly", selectContext)
                        .add(formSelector + "select[data-readonly='false']", selectContext)
                        .add(formSelector + "textarea:setReadOnly", selectContext)
                        .each(function(index, element) {
                            $(element).data("setReadOnly", undefined)
                                .instanceInvoke("setOption", "readOnly", false);
                        }
                    )
                }
                return this;
            },

            setFocusOnFirstInput: function(formOrContainerID) {
                var formSelector = arguments.length ? "#" + formOrContainerID + " " : "",
                    selectContext = this.element;
                var inputElement = $(formSelector + "input[data-readonly!='true']:first", selectContext);
                if (inputElement.length) {
                    inputElement[0].focus();
                }
                else {
                    inputElement = $(formSelector + "textarea[data-readonly!='true']:first", selectContext);
                    if (inputElement.length) {
                        inputElement[0].focus();
                    }
                }
                return this;
            },

            _bindEvents: function() {
                var events = this.options.events || {};

                for (var key in events) {
                    if (events.hasOwnProperty(key)) {

                        var method = events[key];
                        if (!isFunction(method))
                            method = this[events[key]];
                        if (!method)
                            throw new Error('Method "' + events[key] + '" does not exist');

                        // 解析事件表达式(key), 从表达式中解析出事件的名字和需要操作的元素
                        // 例如 'click #title'将被解析为 'click' 和 '#title' 两部分, 均存放在match数组中
                        var match = key.match(this.delegateEventSplitter);
                        var eventName = match[1],
                            selector = match[2];

                        eventName += this.eventPrefix + this.uid;

                        if (selector === "") {
                            this.$element.on(eventName, $.proxy(method, this));
                        } else {
                            this.$element.on(eventName, selector, $.proxy(method, this));
                        }
                    }
                }
            },

            render: function() {

            },

            destroy: function() {
                this.$element.off();
                this.element = undefined;
                this.$element.remove();
            },

            bindData: function(dataSource, scope) {
                var bindingScope = scope ? this.$element.find(scope) : this.element;
                ko.applyBindings(dataSource, bindingScope);
                dataSource.binded = true;
                return this;
            },

            transitInvoke: function(action, proposedFunction) {
                if (isObject(action) || isArray(action)) {
                    proposedFunction = action;
                    action = null;
                }

                if (action) {
                    if (!this.stateMachine) {
                        throw new Error('To transit an action must define a state machine first.');
                    }
                    this.stateMachine.transitInvoke(action, proposedFunction);
                }
                else {
                    this.context.invoke(proposedFunction);
                }
            }
        };
    });

    exports.module('gsp.app').controller("Controller", ["$messageService", function(messageService) {
        return {
            init: function(context) {
                if (!context)
                    return this;
                this.context = context;
                this.view = context.view();
                this.messageService = messageService;
                return this;
            },

            showMessage: function(message) {
                this.messageService.notify(message);
                return this;
            },

            confirm: function(message, confirmCallback) {
                this.messageService.confirm(message, confirmCallback);
                return this;
            },

            notify: function(message) {
                this.messageService.notify(message);
                return this;
            },

            checkForNoneBlank: function(param, paramName) {
                if (param === undefined || param === "") {
                    this.notify("方法实参验证失败：\"" + paramName + "\"不应为undefined或着Blank。");
                }
                return this;
            }
        }
    }]);

    exports.application.requires.push('gsp.app');

})(window.gsp || (window.gsp = {}));

(function(global) {
    var extend = _.extend,
        exports = global || window,
        each = _.each,
        findWhere = _.findWhere,
        isArray = _.isArray,
        isFunction = _.isFunction,
        isObject = _.isObject,
        isString = _.isString,
        uniqueID = _.uniqueId;

    function $stateMachineProvider () {
        this.$get = function() {

            function StateMachine (options) {
                var stateMachine = FSM(options);

                return extend({

                    'beginTransit': options['beginTransit'] || function(transitAction) {
                    },

                    'context': options.context,

                    'current': function() {
                        return stateMachine;
                    },

                    'endTransit': options['endTransit'] || function(transitAction) {
                    },

                    'options': function() {
                        return options;
                    }
                }, StateMachine['fn']);
            }

            StateMachine['fn'] = {

                currentState: function() {

                },

                transitInvoke: function(transitAction, functionOrInvokeObject) {
                    var invokeObjectArray,
                        invokeResult,
                        self = this;
                    if (isArray(functionOrInvokeObject)) {
                        invokeObjectArray = functionOrInvokeObject;
                    }
                    else if (isObject(functionOrInvokeObject)) {
                        invokeObjectArray = invokeObjectArray || [];
                        invokeObjectArray.push(functionOrInvokeObject);
                    }

                    try {
                        self.beginTransit(transitAction);
                        invokeResult = self.context.invoke(invokeObjectArray);
                    }
                    catch (error) {
                        if (window['console']) {
                            console.error(error);
                            console.trace();
                        }
                        self.endTransit(transitAction);
                        return this;
                    }

                    if (invokeResult && invokeResult['then'] && isFunction(invokeResult['then'])) {
                        invokeResult['then'](function(transitResult) {
                            self.endTransit(transitAction);

                            if (transitResult === false) {
                                return self;
                            }

                            if (self.context.getParam('cancelTransit') === true) {
                                self.context.setParam('cancelTransit', undefined);
                                return self;
                            }
                            self.current()['Transition'](transitAction);
                        });
                        invokeResult['fail'](function(transitResult) {
                            self.endTransit(transitAction);
                        });
                        return this;
                    }
                    else if (invokeResult === false) {
                        self.endTransit(transitAction);
                        return this;
                    }
                    else if (self.context.getParam('cancelTransit') === true) {
                        self.context.setParam('cancelTransit', undefined);
                        self.endTransit(transitAction);
                        return this;
                    }
                    self.endTransit(transitAction);
                    this.current()['Transition'](transitAction);
                    return this;
                }
            };

            return StateMachine;
        }
    }

    exports.module('app').provider({
        '$stateMachine': $stateMachineProvider
    });
})(window.gsp || (window.gsp = {}));
