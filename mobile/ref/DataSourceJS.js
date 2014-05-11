(function() {
    'use strict';
    var exportObject = window,
        eventSplitter = /\s+/,//eventSplitter指定处理多个事件时, 事件名称的解析规则
        eventTypeNamespace = /^([^.]*)(?:\.(.+)|)$/,//事件命名空间
        added = 'added',
        current = 'current',
        deleted = 'deleted',
        detached = 'detached',
        fieldValueChanging = 'fieldValueChanging',
        fieldValueChanged = 'fieldValueChanged',
        loaded = 'loaded',
        modified = 'modified',
        original = 'original',
        pageChange = 'pageChange',
        proposed = 'proposed',
        refresh = 'refresh',
        rowAdded = 'rowAdded',
        rowDeleting = 'rowDeleting',
        rowDeleted = 'rowDeleted',
        rowSelected = 'rowSelected',
        rowViewDeleted = 'rowViewDeleted',
        unchanged = 'unchanged',
        each = _.each,
        extend = _.extend,
        extendType = function(target, type) {
            extend(target, type['fn']);
            target['__prototype__'] = type['fn'];
            return target;
        },
        find = _.find,
        hasPrototype = function(target, type) {
            return !!(target.hasOwnProperty('__prototype__') && target['__prototype__'] === type['fn']);
        },
        indexOf = _.indexOf,
        isArray = _.isArray,
        isFunction = _.isFunction,
        isNumber = _['isNumber'],
        isPlainObject = jQuery.isPlainObject,
        isString = _.isString,
        keys = _.keys,
        uniqueID = _.uniqueId,
        values = _.values;

    /**
     * 支持自定义事件对象的原型对象
     * @type {{on: Function, off: Function, trigger: Function}}
     */
    var eventObjectPrototype = {
        /**
         * 将自定义事件(events)和回调函数(callback)绑定到当前对象,
         * 回调函数中的上下文对象为指定的context,
         * 如果没有设置context则上下文对象默认为当前绑定事件的对象,
         * 该方法类似与DOM Level2中的addEventListener方法,
         * events允许指定多个事件名称, 通过空白字符进行分隔(如空格, 制表符等)当事件名称为'all'时,
         * 在调用trigger方法触发任何事件时, 均会调用'all'事件中绑定的所有回调函数
         * @param events
         * @param data
         * @param callback
         * @param context
         * @returns {*}
         */
        'on': function(events, data, callback, context) {
            // 定义一些函数中使用到的局部变量
            var calls, event, node, tail, list, tmp, origType, namespaces;
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
                tmp = eventTypeNamespace.exec(event) || [];
                event = origType = tmp[1];
                namespaces = ( tmp[2] || '' ).split('.').sort();
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
                node.namespaces = namespaces.join('.');
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
            var event, calls, node, tail, cb, ctx, data, namespace, ns;

            // 传入一个参数，该参数非字符串时，判断参数类型是否为Function，
            // 如果参数为Function类型，则赋值给callback，否则赋值给context。
            if (arguments.length === 1 && !isString(events)) {
                if (isFunction(events)) {
                    callback = events;
                }
                else {
                    context = events;
                }
                events = undefined;
            }
            // 传入两个参数时
            else if (arguments.length === 2) {
                // 第一个参数为字符串时，判断第二给参数的类型，
                // 如果为Function类型则赋值给callback，否则赋值给context。
                if (isString(events)) {
                    if (!isFunction(callback)) {
                        context = callback;
                        callback = undefined;
                    }
                }
                else {
                    callback = events;
                    context = callback;
                    events = undefined;
                }
            }

            // 未绑定事件
            if (!( calls = this._callbacks)) {
                return this;
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
                if (calls.hasOwnProperty(event)) {
                    node = calls[event];
                    delete calls[event];
                    // 如果不存在当前事件对象(或没有指定移除过滤条件,
                    // 则认为将移除当前事件及所有回调函数),
                    // 则终止此次操作(事件对象在上一步已经移除)
                    if (!callback && !context) {
                        continue;
                    }

                    // Create a new list, omitting the indicated callbacks.
                    // 根据回调函数或上下文过滤条件, 组装一个新的事件对象并重新绑定
                    tail = node.tail;
                    // 遍历事件中的所有回调对象
                    while (( node = node.next) !== tail) {
                        cb = node.callback;
                        ctx = node.context;
                        data = node.data;
                        ns = node.namespaces;
                        // 根据参数中的回调函数和上下文, 对回调函数进行过滤, 将不符合过滤条件的回调函数重新绑定到事件中(因为事件中的所有回调函数在上面已经被移除)
                        if ((callback && cb !== callback) || (context && ctx !== context)) {
                            this.on(ns ? event + '.' + ns : event, data, cb, ctx);
                        }
                    }
                }
                else {
                    namespace = event;
                    each(calls, function(node, eventType) {
                        delete calls[eventType];
                        // Create a new list, omitting the indicated callbacks.
                        // 根据回调函数或上下文过滤条件, 组装一个新的事件对象并重新绑定
                        tail = node.tail;
                        // 遍历事件中的所有回调对象
                        while (( node = node.next) !== tail) {
                            cb = node.callback;
                            ctx = node.context;
                            data = node.data;
                            ns = node.namespaces;
                            // 根据参数中的回调函数和上下文, 对回调函数进行过滤,
                            // 将不符合过滤条件的回调函数重新绑定到事件中(因为事件中的所有回调函数在上面已经被移除)
                            if (ns) {
                                if (ns != namespace) {
                                    this.on(ns ? eventType + '.' + ns : eventType, data, cb, ctx);
                                }
                            }
                            else {
                                this.on(eventType, data, cb, ctx);
                            }
                        }
                    }, this);
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
                        args.shift();
                    }
                }
            }
            return this;
        }
    };

    function makeEventObject () {
        return makeSubscribable({});
    }

    function makeSubscribable (target) {
        return extend(target, eventObjectPrototype);
    }

    function collection () {
        /**
         * @return {null}
         */
        function collectionInstance (nameOrIndex) {
            if (nameOrIndex === undefined || nameOrIndex === null || nameOrIndex === '') {
                return null;
            }
            if (isNumber(nameOrIndex)) {
                return collectionInstance.iterator[nameOrIndex];
            }
            if (isString(nameOrIndex)) {
                var foundIndex = -1;
                each(collectionInstance.iterator, function(item, index) {
                    if (item.name() === nameOrIndex) {
                        foundIndex = index;
                        return true;
                    }
                    return false;
                });
                if (foundIndex >= 0) {
                    return collectionInstance.iterator[foundIndex];
                }
            }
            return null;
        }

        collectionInstance.iterator = [];

        return extendType(collectionInstance, collection);
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

        'each': function(callback, context) {
            each(this.iterator, callback, context);
        },

        'find': function(filter, context) {
            return find(this.iterator, filter, context);
        },

        'indexOf': function(item) {
            return indexOf(this.iterator, item);
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
                foundIndex = indexOf(this.iterator, nameOrIndexOrItem);
                if (foundIndex > -1) {
                    this.iterator.splice(foundIndex, 1);
                }
            }
            return this;
        }
    };

    function dynamicCollection (source, itemFactory) {
        /**
         * @return {null}
         */
        function dynamicCollectionInstance (nameOrIndex) {
            if (nameOrIndex === undefined || nameOrIndex === null || nameOrIndex === '') {
                return null;
            }
            return itemFactory(dynamicCollectionInstance.source(nameOrIndex));
        }

        dynamicCollectionInstance.source = source || collection();

        dynamicCollectionInstance.itemFactory = itemFactory;

        dynamicCollectionInstance.iterator = [];

        return extendType(dynamicCollectionInstance, dynamicCollection);
    }

    dynamicCollection['fn'] = {

        'count': function() {
            return this.source.count();
        },

        'each': function(callback, context) {
            each(this.source.iterator, function(sourceItem) {
                callback.call(context, this.itemFactory(sourceItem));
            }, this);
        },

        'find': function(filter, context) {
            return this.itemFactory(find(this.source.iterator, filter, context));
        },

        'indexOf': function(item) {
            return indexOf(this.iterator, item);
        }
    };

    function dataColumn (columnNameOrOptions) {

        if (columnNameOrOptions === undefined || columnNameOrOptions === null || columnNameOrOptions === '') {
            throw new Error('A column must have an column name.You can instantiate a column with a name or options.');
        }

        var options = extend({}, dataColumn['fn'].defaultOptions);

        if (isString(columnNameOrOptions)) {
            options.name = columnNameOrOptions;
        }
        else if (isPlainObject(columnNameOrOptions)) {
            extend(options, columnNameOrOptions);
        }

        var columnInstance = {

            allowNull: function() {
                return options.allowNull;
            },

            caption: function() {
                return options.caption;
            },

            defaultValue: function(value) {
                if (arguments.length) {
                    options.defaultValue = value;
                    return this;
                }
                return options.defaultValue;
            },

            name: function() {
                return options.name;
            },

            type: function() {
                return options.type;
            },

            unique: function() {
                return options.unique;
            }
        };
        makeSubscribable(columnInstance);
        return extendType(columnInstance, dataColumn);
    }

    dataColumn['fn'] = {
        /**
         * 列默认配置项
         */
        defaultOptions: {
            /**
             * 是否允许空值
             */
            allowNull: false,
            /**
             * 列标题
             */
            caption: '',
            /**
             * 字段名
             */
            name: '',
            /**
             * 默认值
             */
            defaultValue: '',
            /**
             * 数据类型
             */
            type: 'unknown',
            /**
             * 是否要求值唯一
             */
            unique: false
        }
    };

    function dataRow (table, data) {

        var index = -1,
            innerViews = collection(),
            rawData = data,
            originalData = extend({}, data),
            rowState = detached; //rowState的值包含:detached,added,deleted,modified,unchanged

        function getFieldIndex (table, columnNameOrIndex) {
            var column,
                columns = table.columns,
                fieldIndex;

            if (isNumber(columnNameOrIndex)) {
                fieldIndex = columnNameOrIndex;
            }
            else if (isString(columnNameOrIndex)) {
                column = columns(columnNameOrIndex);
                if (column) {
                    fieldIndex = columns.indexOf(column);
                }
                else {
                    throw new Error('Could not find the column named ' + columnNameOrIndex);
                }
            }
            else {
                throw new Error('The first param of getValue must be a number or a string.');
            }
            return fieldIndex;
        }

        function getFieldName (table, columnNameOrIndex) {
            var column,
                columns = table.columns,
                fieldName;

            if (isString(columnNameOrIndex)) {
                fieldName = columnNameOrIndex;
            }
            else if (isNumber(columnNameOrIndex)) {
                column = columns(columnNameOrIndex);
                if (column) {
                    fieldName = column.name();
                }
                else {
                    throw new Error('Could not find the column named ' + columnNameOrIndex);
                }
            }
            else {
                throw new Error('The first param of getValue must be a number or a string.');
            }
            return fieldName;
        }

        function setValue (row, fieldName, value) {
            var preValue;
            if (rowState === 'unchanged') {
                row.table().getChanges().add({originalData: originalData, raw: rawData, row: row, state: 'modified'});
                row.setModified();
            }
            preValue = rawData[fieldName];
            rawData[fieldName] = value;
            row.trigger(fieldValueChanged, {'fieldName': fieldName, 'preValue': preValue, 'newValue': value});
        }

        function row (columnNameOrIndex, value, forceToUpdate) {
            var action, fieldIndex, fieldName, values = null;

            if (!arguments.length) {
                throw new Error('You must pass at least one param.');
            }
            else if (arguments.length === 1) {
                if (isArray(columnNameOrIndex)) {
                    action = 'setValues';
                    fieldName = null;
                    values = columnNameOrIndex;
                }
                else {
                    action = 'getValue';
                    fieldName = getFieldName(row.table(), columnNameOrIndex);
                }
            }
            else {
                action = 'setValue';
                fieldName = getFieldName(row.table(), columnNameOrIndex);
            }

            if (action === 'getValue') {
                return rawData[fieldName];
            }
            else {
                //                originalData = originalData || extend({}, rawData);

                if (action === 'setValue') {
                    if (forceToUpdate || rawData[fieldName] !== value) {
                        setValue(row, fieldName, value);
                    }
                }
                else if (action === 'setValues') {
                    each(rawData, function(value, key) {
                        if (rawData.hasOwnProperty(key)) {
                            fieldIndex = getFieldIndex(this.table(), key);
                            if (forceToUpdate || rawData[key] !== values[fieldIndex]) {
                                setValue(this, key, values[fieldIndex]);
                            }
                        }
                    }, row);
                }
            }
            return row;
        }

        extend(row, {

            createRowView: function() {
                var rowView = dataRowView(this)
                    .on(rowViewDeleted, function(event) {
                        innerViews.remove(event.target);
                    }, this);
                innerViews.add(rowView);
                return rowView;
            },

            dispose: function() {
                innerViews.each(function(rowView) {
                    rowView.detach();
                });
                innerViews.clear();
                this.off();
            },

            index: function(value) {
                if (arguments.length > 0) {

                    if (index === -1 || rowState === detached || this.table().isUpdating()) {
                        index = value;
                        return this;
                    }
                    else {
                        throw new Error('You can\'t set row index of the data array again, after initialized.');
                    }
                }
                return index;
            },

            inEditMode: false,

            isLocked: false,

            isSelected: false,

            getRowState: function() {
                return rowState;
            },

            getValue: function(columnNameOrIndex) {
                return row(columnNameOrIndex);
            },

            peek: function() {
                return data;
            },

            rowErrors: collection(),

            setAdded: function() {
                return this.setRowState(added);
            },

            setModified: function() {
                return this.setRowState(modified);
            },

            setRowState: function(state) {
                switch (state) {
                    case added:
                        if (rowState !== detached && rowState !== added) {
                            throw new Error('The row state only can be changed to added from detached.');
                        }
                        break;
                    case deleted:
                        if (rowState !== unchanged && rowState !== modified && rowState !== deleted) {
                            throw new Error('The row state only can be changed to deleted from unchanged or modified.');
                        }
                        break;
                    case detached:
                        break;
                    case modified:
                        if (rowState !== unchanged && rowState !== modified) {
                            throw new Error('The row state only can be changed to modified from unchanged.');
                        }
                        break;
                    case unchanged:
                        //                        if (rowState === detached) {
                        //                            throw new Error('The row state only can be changed to unchanged from added, deleted or modified.');
                        //                        }
                        break;
                }
                rowState = state;
                return this;
            },

            setValue: function(columnNameOrIndex, value) {
                row(columnNameOrIndex, value);
                return this;
            },

            setValues: function(values) {
                row(values);
                return this;
            },

            /**
             * 返回该row所在的DataTable对象。todo:需要在row中存储table对象的引用
             */
            table: function() {
                return table;
            }
        });

        if (hasPrototype(table, dataTable)) {
            if (table.columns.count() === 0) {
                each(data, function(value, propertyName) {
                    table.columns.add(dataColumn(propertyName));
                });
            }
            else if (table.columns.count() !== keys(data).length) {
                throw new Error('The data dose not match table columns.');
            }
        }

        makeSubscribable(row);
        return extendType(row, dataRow);
    }

    dataRow['fn'] = {

        beginEdit: function() {
            var rowState = this.getRowState();
            if (!this['inEditMode']) {
                this['inEditMode'] = true;

                if (rowState === unchanged) {
                    this.setModified();
                }
            }
            return this;
        },

        cancelEdit: function() {
            //TODO 需评估一下是否需要实现cancelEdit方法。
            //        this.fields.each(function(field) {
            //            field.cancelEdit();
            //        });
            this['inEditMode'] = false;
            return this;
        },

        deleteRow: function(physicalDelete) {
            var rowState = this.getRowState();
            if (physicalDelete) {
                this.trigger(rowDeleted);
            }
            else {
                //noinspection FallthroughInSwitchStatementJS
                switch (rowState) {
                    case added:
                        this.detach();
                        break;
                    case detached:
                    case deleted:
                        this.setRowState(deleted);
                        break;
                    default:
                        this.setRowState(deleted);
                        break;
                }
            }
            return this;
        },

        detach: function() {
            this.trigger(rowDeleted);
        },

        endEdit: function() {
            //TODO：需评估一下是否需要实现endEdit方法。
            //        this.fields.each(function(field) {
            //            field.endEdit();
            //        });
            this['inEditMode'] = false;
            return this;
        },

        hasChanges: function() {
            var rowState = this.getRowState();
            return (rowState === added || rowState === deleted || rowState === modified);
        },

        hasErrors: function() {
            return this.rowErrors.length > 0;
        },

        hasNoError: function() {
            return this.rowErrors.length === 0;
        },

        recalculateErrors: function() {
            var rowErrors = this.rowErrors.clear();
            this.fields.each(function(field) {
                if (field.hasErrors()) {
                    rowErrors.push(field);
                }
            });
            return this;
        }
    };

    function dataRowView (row) {
        var table = row.table(),
            columns = table.columns,
            index = row.index();

        var rowView = {

            dispose: function() {
                each(this, function(property) {
                    var i, subscriptions;
                    if (ko.isObservable(property) && property._subscriptions.change) {
                        subscriptions = property._subscriptions.change;
                        for (i = subscriptions.length - 1; i >= 0; --i) {
                            subscriptions[i].dispose();
                        }
                    }
                });
                this.off();
            },

            index: function(value) {
                if (arguments.length > 0) {
                    index = value;
                    return this;
                }
                return index;
            },

            row: function() {
                return row;
            }
        };

        columns.each(function(column, index) {
            rowView[column.name()] = observableField(row, index, column.name());
        });

        makeSubscribable(rowView);
        return extendType(rowView, dataRowView);
    }

    dataRowView['fn'] = {

        detach: function() {
            this.trigger(rowViewDeleted);
        },

        setValue: function(columnNameOrIndex, value) {

            if (isNumber(columnNameOrIndex)) {
                var fields = this.row().fields;
                if (columnNameOrIndex < 0 || columnNameOrIndex > fields.count()) {
                    throw new Error('The param columnNameOrIndex is out of range.');
                }
                columnNameOrIndex = fields(columnNameOrIndex).name();
            }
            if (!this.hasOwnProperty(columnNameOrIndex)) {
                throw new Error('The data row view dose not have the field ' + columnNameOrIndex + '.');
            }
            this[columnNameOrIndex](value);
            return this;
        },

        setValues: function(valueArrayOrObject) {
            var fieldName,
                fields = this.row().fields,
                rowView = this;

            if (isArray(valueArrayOrObject)) {
                if (valueArrayOrObject.length !== fields.count()) {
                    throw new Error('The value array\'s length dose not match the data row view.');
                }
                fields.each(function(field, index) {
                    fieldName = field.name();
                    rowView[fieldName](valueArrayOrObject[index]);
                });
            }
            else if (isPlainObject(valueArrayOrObject)) {
                fields.each(function(field) {
                    fieldName = field.name();
                    if (valueArrayOrObject.hasOwnProperty(fieldName)) {
                        rowView[fieldName](valueArrayOrObject[fieldName]);
                    }
                    else {
                        throw new Error('The value object\' property dose not match the data row view.')
                    }
                });
            }
        }
    };

    /**
     * dataSource构造方法
     * @param data 初始数据
     * {
     *  tableName1:[
     *      {field1:'value1',field2:'value2'}
     *      {field1:'value1',field2:'value2'}
     *   ],
     *   tableName2:[
     *      {field1:'value1',field2:'value2'}
     *      {field1:'value1',field2:'value2'}
     *   ]
     * }
     * @param options dataSource初始化选项。
     * {
     *      name:'dataSourceName',
     *      schema: [
     *                      {
     *                       tableName:'tableName1',
     *                       primaryKey:''idField',
     *                       columns:[
     *                           {allowNull: false, caption: '标识列', defaultValue: '', name: 'ID', type: 'String', unique: false}
     *                       ]
     *                     }
     *                  ]
     * }
     * @returns {}
     */
    function dataSource (data, options) {

        var source = {
                /**
                 * 为dataSource加载新数据
                 * @param data 新加载数据
                 */
                load: function(data) {
                    each(data, function(tableData, tableName) {
                        if (tableName && isArray(tableData)) {
                            this.tables(tableName).load(tableData);
                        }
                    }, this);
                    sourceData = data;
                    return this;
                },

                /**
                 * 获取dataSource 标识名
                 * @returns {String}
                 */
                name: function() {
                    return sourceName;
                },

                /**
                 * 获取datasource中所有table的原始数据。
                 * 返回的原始数据并非构造datasource时传入的数据。
                 * 构造datasource后，data table可以通过load方法自由刷新数据，
                 * datasource中不保留初始化datasource时数据的引用。
                 * @returns {Object}
                 */
                peek: function() {
                    var rawData = null,
                        rawTable;
                    source.tables.each(function(table) {
                        rawTable = table.peek() || null;
                        if (rawTable) {
                            rawData = rawData || {};
                            rawData[table.name()] = table.peek();
                        }
                    });
                    return rawData;
                },

                /**
                 * dataTable集合
                 */
                tables: collection()
            },
            schema = {},
            sourceData = data || null,
            sourceName,
            tables = source.tables;

        if (!options) {
            sourceName = uniqueID('dataSource');
        }
        else if (isString(options)) {
            sourceName = options;
        }
        else {
            sourceName = options['name'] || uniqueID('dataSource');
        }

        if (options && options['schema']) {
            each(options['schema'], function(tableSchema) {
                var columns,
                    schemaColumns = tableSchema['columns'],
                    tableName = tableSchema['tableName'];
                //要求数据结构中必须指定表名。
                if (!tableName) {
                    return;
                }
                //创建结构对象。
                schema[tableName] = {
                    'columns': collection(),
                    'primaryKey': tableSchema['primaryKey']
                };
                //填充结构对象中的列信息。
                columns = schema[tableName]['columns'];
                each(schemaColumns, function(columnSchema) {
                    columns.add(dataColumn(columnSchema));
                });
            });
        }

        //遍历原始数据，初始化dataTable。
        each(data, function(tableData, tableName) {
            if (tableName && isArray(tableData)) {
                tables.add(dataTable(tableName, tableData, schema[tableName] || {}));
            }
        });

        makeSubscribable(source);
        return extendType(source, dataSource);
    }

    /**
     * datasource原型对象
     * @type {{acceptChanges: Function, getChanges: Function, getRawChanges: Function}}
     */
    dataSource['fn'] = {

        /**
         * 保存dataSource中每个dataTable的变更。
         */
        acceptChanges: function() {
            this.tables.each(function(table) {
                table.acceptChanges();
            });
            return this;
        },

        /**
         * 获取dataSource的变更数据集。
         * @returns {{}}
         * {
         *      tableName1:collection of {raw: rawRow, state: added/deleted}
         * }
         */
        getChanges: function() {
            var changeSet = {},
                rowChangeSet,
                tableName;
            this.tables.each(function(table) {
                tableName = table.name();
                rowChangeSet = table.getChanges();
                if (rowChangeSet && rowChangeSet.length) {
                    changeSet[tableName] = rowChangeSet;
                }
            });
            return changeSet;
        },

        /**
         * 获取datasource的原始变更数据
         * @param changeStates 数据变更状态，支持单个字符串和状态数组。
         *                                      'added'  or ['added','deleted']
         * @returns {{}}
         */
        getRawChanges: function(changeStates) {
            var changes = this.getChanges(),
                rawChanges = {},
                statesFilter = {};

            if (isArray(changeStates)) {
                each(changeStates, function(state) {
                    statesFilter[state] = true;
                })
            }
            else if (isString(changeStates)) {
                statesFilter[changeStates] = true;
            }

            each(changes, function(changeSet, tableName) {
                rawChanges[tableName] = [];
                changeSet.each(function(change) {
                    if (statesFilter[change['state']]) {
                        rawChanges[tableName].push(change['raw']);
                    }
                })
            });
            return rawChanges;
        },

        rejectChanges: function() {
            this.tables.each(function(table) {
                table.rejectChanges();
            });
            return this;
        }
    };

    function fieldValueChangingHandler (event, args) {
        var field = args.field, row = event.target;
        if (field && row) {
            this.trigger(fieldValueChanging, {'table': this, 'row': row, 'field': field});
        }
    }

    function fieldValueChangedHandler (event, args) {
        var field = args.field, row = event.target;
        this.trigger(fieldValueChanged, {'table': this, 'row': row, 'field': field});
    }

    function dataTable (name, tableData, schema) {

        function beginUpdate () {
            innerUpdating = true;
        }

        function endUpdate () {
            innerUpdating = false;
        }

        var changes = collection(),
            defaultView,
            initializing = true,
            innerRawData = [],
            innerUpdating = false,
            table = {

                addRow: function(row) {
                    var changes = this.getChanges(),
                        columns = this.columns,
                        updating = this.isUpdating(),
                        primaryKey = this.primaryKey,
                        rows = this.rows,
                        rawRow;

                    if (!row) {
                        throw new Error('The row adding to table could not be null, empty string, zero, or undefined.');
                    }

                    if (!hasPrototype(row, dataRow)) {
                        row = dataRow(this, row);
                    }
                    rawRow = row.peek();

                    if (columns.count() !== keys(rawRow).length) {
                        throw new Error('The data dose not match table columns.')
                    }
                    columns.each(function(column) {
                        if (!rawRow.hasOwnProperty(column.name())) {
                            throw new Error('The data dose not match table columns.');
                        }
                    });

                    //todo:有性能风险，待优化。先注释掉，主键约束判断不适合批量新增的场景。
                    //                    if (primaryKey) {
                    //                        rows.each(function(addedRow) {
                    //                            if (addedRow.getValue(primaryKey) && addedRow.getValue(primaryKey) === row.getValue(primaryKey)) {
                    //                                throw new Error('Add row error, the table already have a record with the same primary key.');
                    //                            }
                    //                        })
                    //                    }

                    row.index(rows.count())
                        .endEdit()
                        .on(fieldValueChanging, fieldValueChangingHandler, this)
                        .on(fieldValueChanged, fieldValueChangedHandler, this)
                        .setRowState(updating ? unchanged : added);
                    rows.add(row);
                    innerRawData.push(rawRow);
                    if (!updating) {
                        changes.add({raw: rawRow, row: row, state: added});
                        this.trigger(rowAdded, {'row': row});
                    }
                    return this;
                },

                /**
                 * 创建dataTable的视图对象
                 * @param name 视图别名
                 * @returns {*}
                 */
                createView: function(name) {
                    return dataView(name, this);
                },

                /**
                 * dataColumn集合
                 */
                columns: schema.columns || collection(),

                /**
                 * 获取dataTable默认视图
                 * @returns {*}
                 */
                defaultView: function() {
                    defaultView = defaultView || table.createView('defaultView');
                    return defaultView;
                },

                /**
                 * 获取dataTable变更集
                 * @returns {*}
                 */
                getChanges: function() {
                    return changes;
                },

                /**
                 * 获取dataTable初始化状态
                 * @returns {boolean}
                 */
                isUpdating: function() {
                    return innerUpdating;
                },

                /**
                 * 加载新数据
                 * @param data 新的原始数据源：[{field1:'',field2:''},{field1:'',field2:''}]。
                 */
                load: function(data) {
                    var columns = this.columns,
                        rows = this.rows,
                        loadingData = data,
                        tableName = this.name();

                    if (!loadingData) {
                        return this;
                    }

                    if (isArray(loadingData) && loadingData[0] && isArray(values(loadingData[0])[0])) {
                        var matched = false;
                        each(data, function(dataItem) {
                            if (dataItem.hasOwnProperty(tableName)) {
                                loadingData = dataItem[tableName];
                                matched = true;
                            }
                        });
                        if (!matched) {
                            throw new Error('Load data error. The table name does not match.');
                        }
                    }

                    if (isPlainObject(loadingData)) {
                        if (tableName && !loadingData.hasOwnProperty(tableName)) {
                            throw new Error('Load data error. The table name does not match.');
                        }
                        loadingData = loadingData[tableName];
                    }

                    if (!loadingData) {
                        return this;
                    }

                    beginUpdate();

                    //初始化列结构
                    if (columns.count() === 0) {
                        each(loadingData[0], function(value, propertyName) {
                            columns.add(dataColumn(propertyName));
                        });
                    }

                    //清空内部数据。
                    innerRawData = innerRawData || [];
                    innerRawData.splice(0, innerRawData.length);
                    rows.clear();
                    //重新加载行数据
                    //为数组中的每一条数据创建dataRow并添加至row数组
                    //同时将原始数据添加到内部原始数据中
                    each(loadingData, function(dataItem) {
                        this.addRow(dataItem);
                    }, this);
                    //重新初始化默认视图
                    if (defaultView) {
                        defaultView.refresh();
                    }

                    endUpdate();
                    this.trigger(loaded);
                    return this;
                },

                /**
                 * 获取dataTable名称
                 * @returns {*}
                 */
                name: function() {
                    return name;
                },

                /**
                 * 主键字段
                 */
                primaryKey: schema.primaryKey || '',

                /**
                 * 获取dataTable内部原始数据
                 * @returns {Array}
                 */
                peek: function() {
                    return innerRawData;
                    //                    var rawCopy = [];
                    //                    each(innerRawData,function(raw){
                    //                        rawCopy.push(clone(raw));
                    //                    });
                    //                    return rawCopy;
                },

                remove: function(row) {
                    if (!row) {
                        return this;
                    }
                    var changedRecord,
                        changes,
                        deletedRowIndex = row.index(),
                        rawRow = row.peek(),
                        rowDeletingEventArgs = {'row': row},
                        rowState = row.getRowState();

                    beginUpdate();
                    this.trigger(rowDeleting, rowDeletingEventArgs)
                        .rows
                        .remove(deletedRowIndex)
                        .each(function(row, index) {
                            if (index >= deletedRowIndex) {
                                row.index(index);
                            }
                        });
                    endUpdate();
                    innerRawData.splice(deletedRowIndex, 1);
                    changes = this.getChanges();
                    if (rowState === unchanged) {
                        changes.add({raw: rawRow, row: row, state: deleted});
                    }
                    else {
                        changedRecord = changes.find(function(item) {
                            return item.row === row;
                        });
                        if (changedRecord) {
                            changes.remove(changedRecord);
                        }
                    }
                    row.setRowState(detached).dispose();
                    this.trigger(rowDeleted, rowDeletingEventArgs);
                    return this;
                },

                /**
                 * dataRow集合
                 */
                rows: collection()
            };

        makeSubscribable(table);
        extendType(table, dataTable);

        if (tableData) {
            table.load(tableData);
        }
        initializing = false;
        return table;
    }

    /**
     * dataTable原型对象
     * @type {{
     *  acceptChanges: Function,
     *  addRow: Function,
     *  clear: Function,
     *  hasChanges: Function,
     *  hasErrors: Function,
     *  itemCount: Function,
     *  newRow: Function,
     *  remove: Function,
     *  removeAt: Function,
     *  rejectChanges: Function,
     *  setValue: Function
     *  }}
     */
    dataTable['fn'] = {

        acceptChanges: function() {
            var changeSet = this.getChanges();
            changeSet.each(function(item) {
                item['row'].setRowState(unchanged);
            });
            this.getChanges().clear();
            return this;
        },

        clear: function() {
            var rawData = this.peek(),
                rows = this.rows;
            rows.each(function(row) {
                row.dispose();
            });
            rows.clear();
            rawData.splice(0, rawData.length);
            return this;
        },

        getValue: function(rowIndex, columnNameOrIndex) {
            if (rowIndex >= 0 && rowIndex < this.rows.count()) {
                return this.rows(rowIndex)(columnNameOrIndex);
            }
            else {
                throw new Error('The param rowIndex is out of range.')
            }
        },

        hasChanges: function() {
            var changeSet = this.getChanges();
            return changeSet.count() > 0;
        },

        hasErrors: function() {
            var rows = this.rows,
                hasErrors = false;
            rows.each(function(row) {
                if (row.hasErrors()) {
                    hasErrors = true;
                    return false;
                }
                return true;
            });
            return hasErrors;
        },

        newRow: function(autoGenerateUniqueID) {
            var columns = this.columns,
                data = {},
                primaryField;

            columns.each(function(column) {
                data[column.name()] = column.defaultValue();
            });
            if (autoGenerateUniqueID && this.primaryKey) {
                primaryField = columns(this.primaryKey);
                if (!primaryField) {
                    throw new Error('The primary key field does not exist.')
                }
                data[primaryField.name()] = uniqueID(this.name());
            }
            return dataRow(this, data).setRowState(detached);
        },

        removeAt: function(rowIndex) {
            var rows = this.rows;
            if (!isNumber(rowIndex)) {
                throw new Error('The param rowIndex must be number.');
            }

            if (rowIndex < 0 || rowIndex > rows.count()) {
                throw new Error('The param rowIndex is out of range.');
            }

            this.remove(rows(rowIndex));
            return this;
        },

        rejectChanges: function() {
            var changeSet = this.getChanges(), i, item;
            for (i = changeSet.count() - 1; i >= 0; --i) {
                item = changeSet(i);
                if (item['state'] === added) {
                    this.remove(item['row']);
                    item['row'].setRowState(detached);
                }
                else if (item['state'] === deleted) {
                    this.addRow(item['row']);
                    item['row'].setRowState(unchanged);
                }
                else if (item['state'] === modified) {
                    each(item['originalData'], function(value, key) {
                        item['row'](key, value);
                    });
                    item['row'].setRowState(unchanged);
                }
            }
            this.getChanges().clear();
            return this;
        },

        rowCount: function() {
            return this.rows.count();
        },

        setValue: function(rowIndex, columnNameOrIndex, value) {
            var rows = this.rows;
            if (!isNumber(rowIndex)) {
                throw new Error('The param rowIndex must be number.');
            }

            if (rowIndex < 0 || rowIndex > rows.count() - 1) {
                throw new Error('The param rowIndex is out of range.');
            }

            rows(rowIndex).setValue(columnNameOrIndex, value);
            return this;
        }
    };

    function isBindingSubscription (subscription) {
        return !!subscription.context;
    }

    function detachBindings (rowView) {
        var detachedSubscriptions = {},
            i, subscriptions;
        each(rowView, function(observable, fieldName) {
            if (!ko.isObservable(observable)) {
                return;
            }
            subscriptions = observable._subscriptions['change'];
            if (subscriptions) {
                for (i = subscriptions.length - 1; i >= 0; --i) {
                    if (isBindingSubscription(subscriptions[i])) {
                        detachedSubscriptions[fieldName] = subscriptions[i];
                        //                        detachedSubscriptions.push({fieldName: fieldName, subscription: subscriptions[i]});
                        subscriptions.splice(i, 1);
                    }
                }
            }
        });
        return detachedSubscriptions;
    }

    function attachBindings (rowView, bindingSubscriptions) {
        if (!bindingSubscriptions) {
            return;
        }
        each(rowView, function(property, fieldName) {
            if (ko.isObservable(property) && bindingSubscriptions.hasOwnProperty(fieldName)) {
                property._subscriptions.change = property._subscriptions.change || [];
                bindingSubscriptions[fieldName].target = property;
                bindingSubscriptions[fieldName].disposeCallback.bind(property);
                property._subscriptions.change.push(bindingSubscriptions[fieldName]);
                ko.dependencyDetection.ignore(property.valueHasMutated);
            }
        });
        //        each(rowView, function(property) {
        //            if(ko.isObservable(property)){
        //                ko.dependencyDetection.ignore(property.valueHasMutated);
        //            }
        //        });
    }

    function changeCurrentBindings (dataView, targetItem) {
        var detachedBindings = detachBindings(dataView.currentItem);
        dataView.currentItem = targetItem;
        attachBindings(targetItem, detachedBindings);
    }

    function disposeBindings (dataView) {
        var rowView = dataView.currentItem;
        dataView.currentItem = undefined;
        each(rowView, function(observable) {
            var bindingSubscription = null,
                i, subscription, subscriptions;
            if (ko.isObservable(observable) && observable._subscriptions.change) {
                subscriptions = observable._subscriptions.change;
                for (i = subscriptions.length - 1; i >= 0; --i) {
                    subscription = subscriptions[i];
                    bindingSubscription = subscription.context ? subscription : bindingSubscription;
                    if (!subscription.context) {
                        subscription.dispose();
                    }
                }
                if (bindingSubscription) {
                    observable.notifySubscribers(null);
                    bindingSubscription.dispose();
                }
            }
        });
    }

    function dataView (name, dataTable) {
        var detachedBindings,
            initializing = false,
            isAllowChangePage = false,
            isAllowEdit = false,
            isAllowNew = false,
            isAllowFilter = false,
            isAllowGroup = false,
            isAllowRemove = false,
            isAllowSort = false,
            pageCount = 0,
            pageIndex = -1,
            pageSize = 0,
            totalRecordsCount = 0;

        function beginInit () {
            initializing = true;
        }

        function endInit () {
            initializing = false;
        }

        var view = {

            allowChangePage: function() {
                if (arguments.length > 0) {
                    isAllowChangePage = !!(arguments[0]);
                    return this;
                }
                return isAllowChangePage;
            },

            allowEdit: function() {
                if (arguments.length > 0) {
                    isAllowEdit = !!(arguments[0]);
                    return this;
                }
                return isAllowEdit;
            },

            allowNew: function() {
                if (arguments.length > 0) {
                    isAllowNew = !!(arguments[0]);
                    return this;
                }
                return isAllowNew;
            },

            allowFilter: function() {
                if (arguments.length > 0) {
                    isAllowFilter = !!(arguments[0]);
                    return this;
                }
                return isAllowFilter;
            },

            allowGroup: function() {
                if (arguments.length > 0) {
                    isAllowGroup = !!(arguments[0]);
                    return this;
                }
                return isAllowGroup;
            },

            allowRemove: function() {
                if (arguments.length > 0) {
                    isAllowRemove = !!(arguments[0]);
                    return this;
                }
                return isAllowRemove;
            },

            allowSort: function() {
                if (arguments.length > 0) {
                    isAllowSort = !!(arguments[0]);
                    return this;
                }
                return isAllowSort;
            },

            currentItem: null,

            currentPosition: function() {
                return this.currentItem ? this.currentItem.index() : -1;
            },

            dispose: function() {
                this.off();
            },

            items: dynamicCollection(dataTable.rows, function(row) {
                return row.createRowView();
            }),

            name: function() {
                return name;
            },

            table: function() {
                return dataTable;
            },

            pageCount: function() {
                return pageCount;
            },

            pageIndex: function() {
                return pageIndex;
            },

            pageSize: function(value) {
                if (value) {
                    pageSize = value;
                    return this;
                }
                return pageSize;
            },

            refresh: function() {
                var currentItem, hasItem, preItem;

                //                // 清空当前dataView中的记录。
                //                this.items.clear();
                //
                //                // 遍历dataTable，创建新的dataView。
                //                dataTable.rows.each(function(row) {
                //                    this.add(row.createRowView());
                //                }, this);

                // 更新后数据不为空
                if (this.items.count() > 0) {
                    // 判断更新的数据集中是否包含当前记录
                    hasItem = this.currentItem ?
                        this.table().rows.indexOf(this.currentItem.row()) > -1
                        : false;
                    // 获取数据集更新后的当前记录。
                    // 更新数据集中包含当前记录时通过row对象定位到更新后的当前记录；
                    // 更新数据集中不包含当前记录时，当前记录指向数据集中的第一条数据。
                    currentItem = hasItem ?
                        this.items.find(function(item) {
                            return item.row() === this.currentItem.row();
                        }, this)
                        : this.items(0);

                    // 刷新前dataView中有数据，currentItem不为空时，
                    // 调用changeCurrentBinding方法，改变当前绑定记录。
                    if (this.currentItem) {
                        preItem = this.currentItem;
                        changeCurrentBindings(this, currentItem);
                        preItem.dispose();
                    }
                    // 刷新钱dataView中数据为空，
                    // 如果dataView中保存有之前数据的绑定信息，
                    // 则将绑定附加到新的当前记录中。
                    else {
                        attachBindings(currentItem, detachedBindings);
                    }
                    // 更新当前记录及当前索引
                    this.currentItem = currentItem;
                }
                // 更新后数据为空，如果存在刷新前的当前记录，则清除其上的数据绑定。
                else if (this.currentItem) {
                    disposeBindings(this);
                }

                if (!initializing) {
                    this.trigger(refresh);
                }
            },

            setPagination: function(pagination) {
                if (pagination) {
                    pageCount = parseInt(pagination['pageCount']);
                    pageIndex = parseInt(pagination['pageIndex']);
                    pageSize = parseInt(pagination['pageSize']);
                    totalRecordsCount = parseInt(pagination['recordsCount']);
                }
                return this;
            },

            totalRecordsCount: function() {
                return totalRecordsCount;
            }
        };

        makeSubscribable(view);
        extendType(view, dataView);

        beginInit();
        view.refresh();
        endInit();

        return view;
    }

    dataView['fn'] = {
        add: function(dataOrRowView) {
            var addingRawData = !hasPrototype(dataOrRowView, dataRowView),
                row, rowView;
            if (addingRawData) {
                row = dataRow(this.table(), dataOrRowView);
                //                rowView = row.createRowView();
            }
            else {
                //                rowView = dataOrRowView;
                row = dataOrRowView.row;
            }
            //            rowView.index(this.items.count());
            //            this.items.add(rowView);
            if (addingRawData) {
                this.table().addRow(row);
            }
            return this;
        },

        find: function(filter) {
            var keyField = this.table().primaryKey;

            if (isString(filter)) {
                if (!keyField) {
                    throw new Error('To use find, should define a primary key first.')
                }
                return this['items'].find(function(item) {
                    return  item(keyField) === filter;
                });
            }
            else if (hasPrototype(filter, dataRow)) {
                return this['items'].find(function(item) {
                    return item === filter;
                });
            }
            else if (hasPrototype(filter, dataRowView)) {
                return this['items'].find(function(item) {
                    return item === filter.row();
                });
            }
            else {
                return this['items'].find(function(item) {
                    return item.peek() === filter;
                });
            }
        },

        remove: function(item) {
            if (!item) {
                return this;
            }

            var items = this.items,
                itemsCountBeforeRemoved = items.count(),
                deletedItemIndex = item.index();

            if (itemsCountBeforeRemoved === 1) {
                disposeBindings(this);
            }
            else if (deletedItemIndex === itemsCountBeforeRemoved - 1) {
                this.moveCurrentToPrevious();
            }
            else {
                this.moveCurrentToNext();
            }

            //                    items.remove(item)
            //                        .each(function(item, index) {
            //                            if (index >= deletedItemIndex) {
            //                                item.index(index);
            //                            }
            //                        });
            this.table().remove(item.row());
            item.dispose();
            this.trigger(rowViewDeleted, {'rowView': item});
            return this;
        },

        removeAt: function(position) {
            var items = this.items;
            if (!isNumber(position)) {
                throw new Error('The param position must be number.');
            }

            if (position < 0 || position > items.count()) {
                throw new Error('The param position is out of range.');
            }

            this.remove(items(position));
            return this;
        },

        moveCurrentToFirst: function() {
            if (this.items.count() > 0) {
                this.moveCurrentToPosition(0);
            }
            return this;
        },

        moveCurrentToLast: function() {
            if (this.items.count() > 0) {
                this.moveCurrentToPosition(this.items.count() - 1);
            }
            return this;
        },

        moveCurrentToNext: function() {
            var currentIndex = this.currentItem.index();
            if (this.items.count() > 0 && currentIndex < this.items.count() - 1) {
                this.moveCurrentToPosition(currentIndex + 1);
            }
            return this;
        },

        moveCurrentToPosition: function(position) {
            var nextPositionItem = this.items(position);

            if (nextPositionItem) {
                changeCurrentBindings(this, nextPositionItem);
                this.currentItem = nextPositionItem;

                each(this.currentItem, function(property) {
                    if (ko.isObservable(property)) {
                        ko.dependencyDetection.ignore(property.valueHasMutated);
                    }
                })
            }
            return this;
        },

        moveCurrentToPrevious: function() {
            var currentIndex = this.currentItem.index();
            if (this.items.count() > 0 && currentIndex >= 1) {
                this.moveCurrentToPosition(currentIndex - 1);
            }
            return this;
        },

        moveToFirstPage: function() {
            this.trigger(pageChange, {'pageIndex': 1, 'pageSize': this.pageSize()});
        },

        moveToLastPage: function() {
            this.trigger(pageChange, {'pageIndex': this.pageCount(), 'pageSize': this.pageSize()});
        },

        moveToNextPage: function() {
            var pageCount = this.pageCount(),
                currentPageIndex = this.pageIndex(),
                nextPageIndex = currentPageIndex >= pageCount ? pageCount : currentPageIndex + 1;
            this.trigger(pageChange, {'pageIndex': nextPageIndex, 'pageSize': this.pageSize()});
        },

        moveToPage: function(pageIndex) {
            var pageCount = this.pageCount(),
                nextPageIndex;
            pageIndex = pageIndex > 0 ? pageIndex : 1;
            nextPageIndex = pageIndex >= pageCount ? pageCount : pageIndex;
            this.trigger(pageChange, {'pageIndex': nextPageIndex, 'pageSize': this.pageSize()});
        },

        moveToPreviousPage: function() {
            var currentPageIndex = this.pageIndex(),
                nextPageIndex = currentPageIndex <= 1 ? 1 : currentPageIndex - 1;
            this.trigger(pageChange, {'pageIndex': nextPageIndex, 'pageSize': this.pageSize()});
        }
    };

    /**
     * 生成监听字段。监听字段用于数据源与UI绑定的双向同步
     * @param row row对象
     * @param fieldIndex row中的字段索引
     * @param fieldName row中的字段名称
     * @returns 监听字段{Function}（监听字段为Function类型，可获取或设置监听字段的值）
     */
    function observableField (row, fieldIndex, fieldName) {

        var observable = ko.observable(row(fieldIndex));
        observable.subscribe(function(newValue) {
            if (row(fieldIndex) !== newValue) {
                row(fieldIndex, newValue);
            }
        });

        row.on('fieldValueChanged', function(event, args) {
            if (fieldName === args['fieldName']/* && observable() !== args['newValue']*/) {
                observable(args.newValue);
            }
        });

        return observable;
    }

    exportObject['collection'] = collection;
    exportObject['dataRow'] = dataRow;
    exportObject['dataRowView'] = dataRowView;
    exportObject['dataSource'] = dataSource;
    exportObject['dataTable'] = dataTable;
    exportObject['dataView'] = dataView;
    exportObject['hasPrototype'] = hasPrototype;
    exportObject['makeEventObject'] = makeEventObject;
    exportObject['makeSubscribable'] = makeSubscribable;
    window.gsp = window.gsp || {};
    window.gsp.dataSource = dataSource;
})();