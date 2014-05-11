/**
 * Created by chenshj on 14-1-1.
 */
(function($, aries, template) {
    'use strict';
    var defaultOptions = {
        searchPanelTemplate: '<form class="form-inline">' +
            '<div class="input-group" style="margin: 5px">' +
            '<input placeholder="搜索..." class="form-control" type="search"/>' +
            '<div class="input-group-btn">' +
            '<button class="btn btn-primary "><i class="fa fa-search"></i></button>' +
            '</div></div></form>',

        customPanelTemplate: '<div class="well well-sm clearfix"></div>'
    };

    aries.ui('aries.ui.listview', aries.ui.Default, {
        role: 'listview',

        options: {

            afterRefresh: $.noop,

            beforeRefresh: $.noop,

            customPanelHeight: '52px',

            customPanelTemplate: '',

            fill: false,

            multiSelect: false,

            pagination: {
                pageSize: 0,
                pageIndex: -1
            },

            scrollable: false,

            searchable: false,

            showCustomPanel: false,

            searchFieldHeight: '48px',

            searchPanelTemplate: ''
        },

        classes: {
            listviewScrollerWrapper: 'listview-scroller-wrapper',
            selected: 'active'
        },

        selectors: {

        },

        _applyListItems: function() {
            if (!this.selectedElement) {
                this.selectItem(this.element.children('a:first')[0]);
            }
        },

        _applyScroll: function() {
            var options = this.options,
                self = this,
                topPosition = options.searchable ? options.searchFieldHeight : (options.showCustomPanel ? options.customPanelHeight : 0);

            //包装生成滑动容器。
            this.element.wrap('<div class="' + this.classes.listviewScrollerWrapper + '" style="top:' + topPosition + ';bottom:0;"></div>');
            //应用scroll插件。
            this.scollWrapper = this.element.parent()
                .scroll({
                    onScrollMove: function() {
                        if (this.y > 60 && !self._shouldReload()) {
                            self._showReload();
                        }
                        else if (this.y <= 60 && self._shouldReload()) {
                            self._resetReloadElement();
                        }
                        else if (this.y < (this.maxScrollY - 60 ) && !self._shouldLoadMore()) {
                            self._showLoadMore();
                        }
                        else if (this.y > (this.maxScrollY - 60) && self._shouldLoadMore()) {
                            self._resetLoadMoreElement();
                        }
                    }
                })
                .on('scrollEnd', function() {
                    if (self._shouldReload()) {
                        self.element.trigger('reload', options.pagination);
                        self._resetReloadElement();
                    }
                    else if (self._shouldLoadMore()) {
                        self.element.trigger('loadMore', options.pagination);
                        self._resetLoadMoreElement();
                    }
                })
                .on('refresh', function() {
                    self._resetReloadElement();
                    self._resetLoadMoreElement();
                });
            this.element.on('click.listview','.list-group-item',function(){
                self.selectItem(this);
            });
            //向scroll容器内插入刷新和加载更多提示。
            this.element.before('<p id="' + this.id + '_reload" class="text-center listview-underground" style="position: absolute;width: 100%;margin:5px"><i id="iconDown" class="rotate fa fa-arrow-down fa-border"></i><span>  下拉刷新数据</span></p>')
                .before('<p id="' + this.id + '_loadmore" class="text-center listview-underground" style="position: absolute;width: 100%;bottom: 0; margin:5px"><i class="rotate fa fa-arrow-up fa-border"></i><span>  向上拖动加载更多数据</span></p>');
            this.reloadElement = this.scollWrapper.find('#' + this.id + '_reload');
            this.loadMoreElement = this.scollWrapper.find('#' + this.id + '_loadmore');
        },

        _create: function() {
            var searchPanelFragment, customPanelFragment,
                options = this.options,
                searchPanelTemplate = options.searchPanelTemplate;

            if (options.searchable) {
                searchPanelFragment = searchPanelTemplate ?
                    template.render(searchPanelTemplate) :
                    template.compile(defaultOptions.searchPanelTemplate)();
                this.element.before(searchPanelFragment);
            }

            if (options.showCustomPanel) {
                customPanelFragment = searchPanelTemplate ?
                    template.render(searchPanelTemplate) :
                    template.compile(defaultOptions.searchPanelTemplate)();
                this.element.before(customPanelFragment);
            }

            //应用listview每一项的样式。
            this._applyListItems();

            //如果启用了scroll滑动，应用scroll插件。
            if (options.scrollable && options.fill) {
                this._applyScroll();
            }
        },

        _resetLoadMoreElement: function() {
            this.loadMoreElement.removeClass('flip')
                .children('i').removeClass('rotate-down').end()
                .children('span').html('  持续上移加载更多...');
        },

        _resetReloadElement: function() {
            this.reloadElement.removeClass('flip')
                .children('i').removeClass('rotate-up').end()
                .children('span').html('  持续下拉刷新...');
        },

        _shouldLoadMore: function() {
            if (this.loadMoreElement && this.loadMoreElement.length) {
                return this.loadMoreElement.hasClass('flip');
            }
            return false;
        },

        _shouldReload: function() {
            if (this.reloadElement && this.reloadElement.length) {
                return this.reloadElement.hasClass('flip');
            }
            return false;
        },

        _showLoadMore: function() {
            this.loadMoreElement.addClass('flip')
                .children('i').addClass('rotate-down').end()
                .children('span').html('  释放立即加载更多...');
        },

        _showReload: function() {
            this.reloadElement.addClass('flip')
                .children('i').addClass('rotate-up').end()
                .children('span').html('  释放立即刷新...');
        },

        refresh: function() {
            //刷新前事件。
            this.options.beforeRefresh();
            //应用listview每一项的样式。
            this._applyListItems();
            //如果启用了scroll滑动，刷新scroll插件，更新内部维护的滚动内容高度。
            if (this.options.scrollable && this.scollWrapper) {
                this.scollWrapper.scroll('refresh');
            }
            //刷新后事件。
            this.options.afterRefresh();
        },

        selectItem: function(itemElementOrIndexOrID) {
            var multiSelect = this.options.multiSelect,
                selectedClass = this.classes.selected,
                selectedElement = this.selectedElement;

            if (itemElementOrIndexOrID && itemElementOrIndexOrID['nodeType'] === 1) {
                if (!multiSelect && selectedElement) {
                    selectedElement.removeClass(selectedClass);
                }
                this.selectedElement = $(itemElementOrIndexOrID).addClass(selectedClass);
                this.element.trigger('selectChanged');
            }
        }
    });

})(window['jQuery'], window.aries, window.template);