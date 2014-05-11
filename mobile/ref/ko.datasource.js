ko.bindingHandlers['datasource'] = {

    dataSourceReserved: {'name': true, 'table': true},

    makeDataSourceValueAccessor: function(dataSource, bindingString, bindingKey) {
        var bindingDataSource = dataSource,
            bindingValuePathString = ko.utils.stringTrim(bindingString),
            fieldName, tableName, valuePathToken, templateName;

        if (!bindingValuePathString.length) {
            throw new Error('Making data source value accessor error, the binding should not be empty.');
        }

        if (bindingKey === 'template') {
            valuePathToken = bindingValuePathString.match(/(?:foreach|data):(\w+)/);
            if (valuePathToken && valuePathToken.length) {
                tableName = valuePathToken[1];
            }
            valuePathToken = bindingValuePathString.match(/name:'(\S+)'/);
            if (valuePathToken && valuePathToken.length) {
                templateName = valuePathToken[1];
            }
        }
        else {
            valuePathToken = ko.utils.stringTokenize(bindingValuePathString, '.');
            if (valuePathToken && valuePathToken.length) {
                tableName = valuePathToken[0];
                fieldName = valuePathToken[1];
            }
        }

        if (tableName && fieldName) {
            return function() {
                var currentItem = bindingDataSource.tables(tableName).defaultView().currentItem;
                return currentItem ? currentItem[fieldName] : null;
            };
        }
        else if (tableName) {
            return function() {
                if (bindingKey === 'foreach') {
                    return  ko.observableArray(bindingDataSource.tables(tableName).peek());
                }
                else if (bindingKey === 'template') {
                    return {name: templateName, foreach: bindingDataSource.tables(tableName).peek()};
                }
                return bindingDataSource.tables(tableName).defaultView();
            };
        }
        else {
            throw new Error('Making data source value accessor error, the binding string should be given a table name at least.')
        }
    },

    makeDataSourceViewModel: function(dataSource, bindingString, bindingKey) {
        var bindingDataSource = dataSource,
            bindingValuePathString = ko.utils.stringTrim(bindingString),
            valuePathToken,
            viewModel,
            tableName;

        if (!bindingValuePathString.length) {
            throw new Error('Making data source value accessor error, the binding should not be empty.');
        }

        if (bindingKey === 'template') {
            valuePathToken = bindingValuePathString.match(/(?:foreach|data):(\w+)/);
            if (valuePathToken && valuePathToken.length) {
                tableName = valuePathToken[1];
            }
        }
        else {
            valuePathToken = ko.utils.stringTokenize(bindingValuePathString, '.');
            if (valuePathToken && valuePathToken.length) {
                tableName = valuePathToken[0];
            }
        }

        if (tableName !== null && tableName !== undefined && tableName.length) {
            if (bindingKey === 'foreach' || bindingKey === 'template') {
                viewModel = {};
                viewModel[tableName] = ko.observableArray(bindingDataSource.tables(tableName).peek());
                return viewModel;
            }
            return bindingDataSource.tables(tableName).defaultView();
        }
        else {
            throw new Error('Making data source value accessor error, could not find the table name.')
        }
    },

    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var dataSource = viewModel,
            dataSourceBindingHandler = ko.bindingHandlers['datasource'],
            dataSourceReserved = dataSourceBindingHandler['dataSourceReserved'],
            $grid, $gridOptions, options = valueAccessor(), table;

        if ('dataSourceName' in options) {
            dataSource = bindingContext[options['dataSourceName']];
        }

        if ('table' in options) {
            $grid = $(element);
            table = dataSource.tables(options['table'])
                .off()//todo:对象的自定义事件需要支持命名空间，此处需要修改为使用命名空间注销事件。
                .on('fieldValueChanged', function(event, args) {
                    var gridSelectedStyle = 'datagrid-row-selected',
                        gridFinder = $.data(element, 'datagrid').options.finder,
                        rawRow = args.row.peek(),
                        rowIndex = $(element).datagrid('getRowIndex', rawRow[table.primaryKey] || rawRow/*[table.primaryKey]*/);

                    $grid.datagrid('refreshRow', rowIndex);
                    if ($grid.datagrid('getSelectedIndex') == rowIndex) {
                        gridFinder.getTr(element, rowIndex).addClass(gridSelectedStyle);
                    }
                }, this)
                .on('rowAdded', function(event, args) {
                    var rawRow = args.row.peek(),
                        rowIndex;
                    $grid.datagrid('loadData', {
                        total: event.target.defaultView().totalRecordsCount(),
                        rows: event.target.peek()
                    });
                    rowIndex = $grid.datagrid('getRowIndex', rawRow[table.primaryKey] || rawRow/*[table.primaryKey]*/);
                    $grid.datagrid('selectRow', rowIndex);
                }, this)
                .on('rowDeleting', function(event, args) {
                    var rawRow = args.row.peek();
                    args['deletingRowIndexInGrid'] = $grid.datagrid('getRowIndex', rawRow[table.primaryKey] || rawRow/*[table.primaryKey]*/);
                })
                .on('rowDeleted', function(event, args) {
                    var rowIndex = -1,
                        table = event.target, totalRowCount;

                    $grid.datagrid('loadData', event.target.peek());

                    totalRowCount = $grid.datagrid('getRows').length;
                    if (args.hasOwnProperty('deletingRowIndexInGrid')) {
                        rowIndex = args['deletingRowIndexInGrid'];
                    }
                    rowIndex = rowIndex > totalRowCount - 1 ? totalRowCount - 1 : rowIndex;

                    if (rowIndex >= 0) {
                        $grid.datagrid('selectRow', rowIndex);
                    }

                    if (totalRowCount === 0) {
                        table.off();//todo:对象的自定义事件需要支持命名空间，此处需要修改为使用命名空间注销事件。
                    }
                }, this);

            table.defaultView().off('refresh')
                .on('refresh', function(event) {
                    $grid.datagrid('loadData', {
                        total: event.target.totalRecordsCount(),
                        rows: event.target.table().peek()
                    });
                    $grid.datagrid('getPager').pagination('refresh', {	// change options and refresh pager bar information
                        total: event.target.totalRecordsCount(),
                        pageNumber: event.target.pageIndex()
                    });

                    if (event.target.table().rowCount()) {
                        $grid.datagrid('selectRow', 0);
                    }
                });

            $grid.datagrid('loadData', {
                total: table.defaultView().totalRecordsCount(),
                rows: table.peek()
            });
            $gridOptions = $grid.datagrid('options');
            if ($gridOptions['pagination']) {
                $grid.datagrid('getPager').pagination({
                    onSelectPage: function(pageNumber, pageSize) {
                        table.defaultView().pageSize(pageSize).moveToPage(pageNumber);
                    }
                });
            }

            $grid.off('.binding');
            if (table.peek().length) {
                $grid.datagrid('selectRow', 0);
            }
            $grid.on('onBeforeSelect.binding', function(event, rowIndex, rowData) {
                var tableView = table.defaultView(),
                    focusedItem = tableView.find(rowData[table.primaryKey] || rowData/*[table.primaryKey]*/);
                tableView.moveCurrentToPosition(focusedItem.index());
            })
                .on('onAfterEdit.binding', function(event, rowIndex, rowData, changes) {
                    var tableView = table.defaultView();
                    for (var changedField in changes) {
                        if (changes.hasOwnProperty(changedField)) {
                            tableView.currentItem.row()(changedField, changes[changedField], true);
                            //                            tableView.currentItem[changedField](changes[changedField]);
                        }
                    }
                })
                .on('appendRow.binding', function(event, rowIndex) {
                    var tableView = table.defaultView(),
                        newRow = table.newRow(),
                        newRowData = newRow.peek();
                    tableView.add(newRowData);
                })
                .on('deleteRow.binding', function(event, args) {
                    var tableView = table.defaultView(),
                        primaryKey = table.primaryKey,
                        deleteItem = tableView.find(args.rowData[primaryKey] || args.rowData);
                    tableView.remove(deleteItem);
                });
        }
        else {
            ko.utils.objectForEach(options, function(bindingKey, bindingString) {
                var dataSourceValueAccessor, dataSourceViewModel;
                if (!(bindingKey in dataSourceReserved) && ko.bindingHandlers[bindingKey]) {
                    dataSourceValueAccessor = dataSourceBindingHandler.makeDataSourceValueAccessor(dataSource, bindingString, bindingKey);
                    dataSourceViewModel = dataSourceBindingHandler.makeDataSourceViewModel(dataSource, bindingString, bindingKey);
                    ko.bindingHandlers[bindingKey].init(element, dataSourceValueAccessor, allBindings, dataSourceViewModel, bindingContext);
                }
            });
        }
    },

    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var options = valueAccessor(),
            dataSource = viewModel,
            dataSourceBindingHandler = ko.bindingHandlers['datasource'],
            dataSourceReserved = dataSourceBindingHandler['dataSourceReserved'];

        ko.utils.objectForEach(options, function(bindingKey, bindingString) {
            var dataSourceValueAccessor, dataSourceViewModel;
            if (!(bindingKey in dataSourceReserved) && ko.bindingHandlers[bindingKey]) {
                dataSourceValueAccessor = dataSourceBindingHandler.makeDataSourceValueAccessor(dataSource, bindingString, bindingKey);
                dataSourceViewModel = dataSourceBindingHandler.makeDataSourceViewModel(dataSource, bindingString, bindingKey);
                ko.bindingHandlers[bindingKey].update(element, dataSourceValueAccessor, allBindings, dataSourceViewModel, bindingContext);
            }
        });
    }
};

ko.bindingContext['extension'].makeExtendCallback = function(dataItemOrAccessor) {
    return function(bindingContext) {
        if (hasPrototype(dataItemOrAccessor, dataSource)) {

            bindingContext[dataItemOrAccessor.name()] = dataItemOrAccessor;

            bindingContext['shouldApplyBindingsCallback'] = function(bindingContext, nodeVerified) {
                var bindingString,
                    bindingStringMatchReg = /dataSourceName:'(\w+)'/,
                    bindingStringToken,
                    instanceName;

                if (nodeVerified.nodeType === 1 &&
                    ko.bindingProvider['instance']['nodeHasBindings'](nodeVerified) &&
                    hasPrototype(bindingContext['$rawData'], dataSource)) {
                    bindingString = ko.bindingProvider['instance']['getBindingsString'](nodeVerified, bindingContext);
                    bindingStringToken = bindingString.match(bindingStringMatchReg);
                    if (bindingStringToken && bindingStringToken.length) {
                        instanceName = bindingStringToken[1];
                        if (instanceName && bindingContext['$rawData'].name() !== instanceName) {
                            return false;
                        }
                    }
                }
                return true;
            };
        }
    }
};
