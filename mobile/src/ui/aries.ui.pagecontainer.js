/**
 * Created by chenshj on 2014/5/5.
 */
(function($, aries) {
    'use strict';
    var changePageDefaults = {
            transition: undefined,
            reverse: false,
            changeHash: true,
            fromHashChange: false,
            role: undefined, // By default we rely on the role defined by the @data-role attribute.
            duplicateCachedPage: undefined,
            pageContainer: undefined,
            showLoadMsg: true, //loading message shows by default when pages are being fetched during changePage
            dataUrl: undefined,
            fromPage: undefined,
            allowSamePageTransition: false
        },
        loadDefaults = {

            /**
             * ajax请求类型
             */
            type: "get",

            data: undefined,

            reload: false,

            // By default we rely on the role defined by the @data-role attribute.
            role: undefined,

            showLoadMsg: false,

            // This delay allows loads that pull from browser cache to
            // occur without showing the loading message.
            loadMsgDelay: 50
        },
        pageBeforeChange = 'pageBeforeChange',
        pageChange = 'pageChange',
        pageChangeFailed = 'pageChangeFailed',
        pageBeforeHide = 'pageBeforeHide',
        pageHide = 'pageHide',
        pageBeforeShow = 'pageBeforeShow',
        pageShow = 'pageShow',
        pageBeforeLoad = 'pageBeforeLoad',
        pageLoad = 'pageLoad',
        pageLoadFailed = 'pageLoadFailed',
        allowCrossDomainPages = aries.allowCrossDomainPages,
        hashListeningEnabled = aries.hashListeningEnabled,
        isPageTransitioning = false,
        pageTransitionQueue = [],
        pageLoadErrorMessage = aries.pageLoadErrorMessage,
        navigate = aries.navigate,
        history = navigate.history,
        path = aries.path,
        addSearchParams = path.addSearchParams,
        createDataUrl = path.convertUrlToDataUrl,
        createFileUrl = path.getFilePath,
        convertUrlToDataUrl = path.convertUrlToDataUrl,
        documentBase = path.documentBase,
        documentUrl = path.documentUrl,
        getFilePath = path.getFilePath,
        hashToSelector = path.hashToSelector,
        makeUrlAbsolute = path.makeUrlAbsolute,
        isEmbeddedPage = path.isEmbeddedPage,
        isFirstPageUrl = path.isFirstPageUrl,
        isPath = path.isPath,
        isSameDomain = path.isSameDomain,
        parseLocation = path.parseLocation,
        stripHash = path.stripHash,
        loadMessage;

    function getHash () {
        return parseLocation().hash;
    }

    function getLoader () {
        return aries.loading();
    }

    /**
     * 释放迁移锁定状态
     */
    function releaseTransitionLock () {
        isPageTransitioning = false;
        if (pageTransitionQueue.length > 0) {
            aries.changePage.apply(null, pageTransitionQueue.pop());
        }
    }

    function showError () {
        // make sure to remove the current loading message
        hideLoading();
        // show the error message
        showLoading(0, pageLoadErrorMessage, true);
        // hide the error message after a delay
        // TODO configuration
        setTimeout(hideLoading, 1500);
    }

    function showLoading (delay, msg, textonly) {
        // This configurable timeout allows cached pages a brief
        // delay to load without showing a message
        if (loadMessage) {
            return;
        }

        loadMessage = setTimeout(function() {
            //            getLoader().loader("show", msg, textonly);
            loadMessage = 0;
        }, delay);
    }

    function hideLoading () {
        // Stop message show timer
        clearTimeout(loadMessage);
        loadMessage = 0;
        // Hide loading message
        //        getLoader().loader("hide");
    }

    aries.ui("aries.ui.pagecontainer", aries.ui.Default, {

        _create: function() {
            this.setLastScrollEnabled = true;
            $(window).on('navigate', $.proxy(this._filterNavigateEvents, this));
        },

        /**
         * 后退
         */
        back: function() {
            this.go(-1);
        },

        /**
         * 前进
         */
        forward: function() {
            this.go(1);
        },

        /**
         * 跳转到指定历史记录
         * @param steps 指示历史记录的整数，大于0为前进，小于0为后退。
         */
        go: function(steps) {
            // 如果hash变化监听可用，使用原生history对象方法。
            if (hashListeningEnabled) {
                window.history.go(steps);
            }
            else {
                // 如果我们未监听hash的变化，则内部处理历史记录。
                var activeIndex = history.activeIndex,
                    url = history.stack[activeIndex + parseInt(steps, 10)].url,
                    direction = ( steps >= 1 ) ? "forward" : "back";

                // 更新历史记录对象。
                history.activeIndex = activeIndex + parseInt(steps, 10);
                history.previousIndex = activeIndex;
                // 切换页面。
                this.change(url, { direction: direction, changeHash: false, fromHashChange: true });
            }
        },

        /**
         * 页面切换
         * @param to 目标页面
         * @param options 配置选项
         */
        change: function(to, options) {
            // 如果我们正处在页面迁移过程中，则将新的页面切换请求排入队列。
            // 我们将在当前迁移结束后，再调用一次changePage来处理排队的请求。
            if (isPageTransitioning) {
                pageTransitionQueue.unshift(arguments);
                return;
            }

            var settings = $.extend({}, changePageDefaults, options),
                triggerData = {};

            // 确保页面切换的起始页。
            settings.fromPage = settings.fromPage || this.activePage;

            // 抛出页面切换前事件，如果取消了页面切换则终止change方法。
            if (!this._triggerPageBeforeChange(to, triggerData, settings)) {
                return;
            }
            // 我们允许调用者在"PageBeforeChange"事件中修改模板页面，以便实现
            // 重定向，这里确保目标页面被更新了。这里还需要重新解析URL是字符串
            // 还是对象，以为中事件扩展中，允许调用者将目标页面的jQuery对象替换
            // 为URL字符串。
            to = triggerData.toPage;

            // 如果调用者传递了一个URL参数，需要调用loadPage方法确保该页面已被加载入DOM中。
            if ($.type(to) === "string") {
                // 设置isPageTransitioning为true，锁定页面切换状态。
                isPageTransitioning = true;

                this.load(to, $.extend(settings, {

                    target: to,

                    deferred: $.Deferred()
                        .done($.proxy(function(url, options, content) {
                            isPageTransitioning = false;
                            // 保存原始绝对UR，一般在之后调用changePage方法时提供给事件参数。
                            options.absUrl = triggerData.absUrl;
                            this.transition(content, triggerData, options);
                        }, this))
                        .fail($.proxy(function(/* url, options */) {
                            // 释放迁移锁定状态。
                            releaseTransitionLock();
                            // 抛出页面迁移失败事件。
                            this._triggerEvent(pageChangeFailed, triggerData);
                        }, this))
                }));
            } else {
                this.transition(to, triggerData, settings);
            }
        },

        load: function(url, options) {
            var deferred = ( options && options.deferred ) || $.Deferred(),
                settings = $.extend({}, loadDefaults, options),
                absUrl = makeUrlAbsolute(url, this._findBaseWithDefault()),
                content, fileUrl, dataUrl, eventObject, triggerData;

            // 如果调用者提供了调用附加数据，并且当前使用"get"方式请求，则附加数据至URL之后。
            if (settings.data && settings.type === "get") {
                absUrl = addSearchParams(absUrl, settings.data);
                settings.data = undefined;
            }

            // 如果调用者食用"post"方式请求，reload属性必须设置为true。
            if (settings.data && settings.type === "post") {
                settings.reload = true;
            }

            // 去掉参数信息的Url，即实际加载页面的Url。
            fileUrl = createFileUrl(absUrl);

            // 保存在页面data-url属性中的Url。
            // 嵌入式页面：页面的ID；
            // 相同域内容的页面：该页面相对站点的相对路径；
            // 跨域页面（Phone Gsp）：加载页面的完整绝对路径。
            dataUrl = createDataUrl(absUrl);

            content = this._find(absUrl);

            // If it isn't a reference to the first content and refers to missing
            // embedded content reject the deferred and return
            if (content.length === 0 &&
                isEmbeddedPage(fileUrl) && !isFirstPageUrl(fileUrl)) {
                deferred.reject(absUrl, settings);
                return;
            }

            // 如果请求的内容已在DOM中，并且调用者为指定要强制重新加载，
            // 则直接渲染该DOM元素，并且标记调用成功结束加载过程。
            if (content.length && !settings.reload) {
                this._enhance(content, settings.role);
                deferred.resolve(absUrl, settings, content);
                return;
            }

            triggerData = {url: url, absUrl: absUrl, dataUrl: dataUrl, deferred: deferred, options: settings};

            // 抛出页面加载前事件
            eventObject = this._triggerEvent(pageBeforeLoad, triggerData);

            // 如果阻止了页面加载前事件，则终止页面加载。
            if (eventObject.isDefaultPrevented()) {
                return;
            }

            if (settings.showLoadMsg) {
                showLoading(settings.loadMsgDelay);
            }

            if (!(allowCrossDomainPages || isSameDomain(documentUrl, absUrl) )) {
                deferred.reject(absUrl, settings);
                return;
            }

            $.ajax({
                url: fileUrl,
                type: settings.type,
                data: settings.data,
                contentType: settings.contentType,
                dataType: "html",
                success: this._loadSuccess(absUrl, triggerData, settings, deferred),
                error: this._loadError(absUrl, triggerData, settings, deferred)
            });
        },

        _loadSuccess: function(absUrl, triggerData, settings, deferred) {
            var fileUrl = createFileUrl(absUrl);

            return $.proxy(function(html, textStatus, xhr) {
                //pre-parse html to check for a data-url,use it as the new fileUrl, base path, etc
                var content,
                    pageElemRegex = new RegExp("(<[^>]+\\bdata-role=[\"']?page[\"']?[^>]*>)"),
                    dataUrlRegex = new RegExp("\\bdata-url=[\"']?([^\"'>]*)[\"']?");

                // data-url must be provided for the base tag so resource requests
                // can be directed to the correct url. loading into a temprorary
                // element makes these requests immediately
                if (pageElemRegex.test(html) && RegExp.$1 &&
                    dataUrlRegex.test(RegExp.$1) && RegExp.$1) {
                    fileUrl = getFilePath($("<div>" + RegExp.$1 + "</div>").text());
                }

                content = this._parse(html, fileUrl);

                this._triggerEvent(pageLoad,
                    $.extend(triggerData, {
                        xhr: xhr,
                        textStatus: textStatus,
                        content: content
                    })
                );

                this._include(content, settings);

                if (settings.showLoadMsg) {
                    hideLoading();
                }

                deferred.resolve(absUrl, settings, content);
            }, this);
        },

        _loadError: function(absUrl, triggerData, settings, deferred) {
            return $.proxy(function(xhr, textStatus, errorThrown) {
                var eventObject = this._triggerEvent(pageLoadFailed,
                    $.extend(triggerData, {
                        xhr: xhr,
                        textStatus: textStatus,
                        errorThrown: errorThrown
                    })
                );

                if (eventObject.isDefaultPrevented()) {
                    return;
                }

                if (settings.showLoadMsg) {
                    showError();
                }

                deferred.reject(absUrl, settings);
            }, this);
        },

        transition: function(toPage, triggerData, settings) {
            var fromPage, url, pageUrl, active, activeIsInitialPage,
                historyDir, pageTitle, alreadyThere,
                params, cssTransitionDeferred, beforeTransition;

            if (isPageTransitioning) {
                pageTransitionQueue.unshift([toPage, settings]);
                return;
            }

            isPageTransitioning = true;

            // If we are going to the first-page of the application, we need to make
            // sure settings.dataUrl is set to the application document url. This allows
            // us to avoid generating a document url with an id hash in the case where the
            // first-page of the document has an id attribute specified.
            if (toPage[0] === aries.firstPage[0] && !settings.dataUrl) {
                settings.dataUrl = documentUrl.hrefNoHash;
            }

            // The caller passed us a real page DOM element. Update our
            // internal state and then trigger a transition to the page.
            fromPage = settings.fromPage;
            url = (settings.dataUrl && convertUrlToDataUrl(settings.dataUrl)) || toPage.attr("id");

            // The pageUrl var is usually the same as url, except when url is obscured
            // as a dialog url. pageUrl always contains the file path
            pageUrl = url;
            active = history.getActive();
            activeIsInitialPage = history.activeIndex === 0;
            historyDir = 0;
            pageTitle = document.title;

            if (fromPage && fromPage[0] === toPage[0] && !settings.allowSamePageTransition) {

                isPageTransitioning = false;
                this.element.trigger(pageChange, triggerData);

                // Even if there is no page change to be done, we should keep the
                // urlHistory in sync with the hash changes
                if (settings.fromHashChange) {
                    history.direct({ url: url });
                }
                return;
            }

            // We need to make sure the page we are given has already been enhanced.
            toPage.page({ role: settings.role });

            // If the changePage request was sent from a hashChange event, check to
            // see if the page is already within the urlHistory stack. If so, we'll
            // assume the user hit the forward/back button and will try to match the
            // transition accordingly.
            if (settings.fromHashChange) {
                historyDir = settings.direction === "back" ? -1 : 1;
            }

            // Kill the keyboard.
            // XXX_jblas: We need to stop crawling the entire document to kill focus.
            //            Instead, we should be tracking focus with a delegate()
            //            handler so we already have the element in hand at this
            //            point.
            // Wrap this in a try/catch block since IE9 throw "Unspecified error" if
            // document.activeElement is undefined when we are in an IFrame.
            try {
                if (document.activeElement && document.activeElement.nodeName.toLowerCase() !== "body") {
                    $(document.activeElement).blur();
                } else {
                    $("input:focus, textarea:focus, select:focus").blur();
                }
            } catch (e) {
            }

            // Record whether we are at a place in history where a dialog used to be -
            // if so, do not add a new history entry and do not change the hash either
            alreadyThere = false;

            // Make sure we have a transition defined.
            settings.transition = settings.transition ||
                ((historyDir && !activeIsInitialPage) ? active.transition : undefined) ||
                aries.defaultPageTransition;

            // 如果不是后退或者前进，将目标页面压入历史记录栈。
            if (!historyDir && alreadyThere) {
                history.getActive().pageUrl = pageUrl;
            }

            // Set the location hash.
            if (url && !settings.fromHashChange) {
                // rebuilding the hash here since we loose it earlier on
                // TODO preserve the originally passed in path
                if (!isPath(url) && url.indexOf("#") < 0) {
                    url = "#" + url;
                }

                // TODO the property names here are just silly
                params = {
                    transition: settings.transition,
                    title: pageTitle,
                    pageUrl: pageUrl,
                    role: settings.role
                };

                if (settings.changeHash !== false && aries.hashListeningEnabled) {
                    navigate(url, params, true);
                } else if (toPage[0] !== aries.firstPage[0]) {
                    history.add(url, params);
                }
            }

            //new way to handle activePage
            this.activePage = toPage;
            // If we're navigating back in the URL history, set reverse accordingly.
            settings.reverse = settings.reverse || historyDir < 0;

            this._cssTransition(toPage, fromPage, {

                transition: settings.transition,

                reverse: settings.reverse,

                deferred: $.Deferred()
                    .done($.proxy(function(/*name, reverse, $to, $from, alreadyFocused*/) {
                        //if there's a duplicateCachedPage, remove it from the DOM now that it's hidden
                        if (settings.duplicateCachedPage) {
                            settings.duplicateCachedPage.remove();
                        }
                        releaseTransitionLock();
                        this._triggerEvent(pageChange, triggerData);
                    }, this))
            });
        },

        _cssTransition: function(to, from, options) {
            var transition = options.transition,
                reverse = options.reverse,
                deferred = options.deferred,
                TransitionHandler,
                promise;

            this._triggerCssTransitionEvents(to, from, "before");

            hideLoading();

            TransitionHandler = this._getTransitionHandler(transition);

            promise = (new TransitionHandler(transition, reverse, to, from)).transition();

            promise.done(function() {
                deferred.resolve.apply(deferred, arguments);
            });

            promise.done($.proxy(function() {
                this._triggerCssTransitionEvents(to, from);
            }, this));
        },

        _filterNavigateEvents: function(e, data) {
            var url;

            if (e.originalEvent && e.originalEvent.isDefaultPrevented()) {
                return;
            }

            url = e.originalEvent.type.indexOf("hashchange") > -1 ? data.state.hash : data.state.url;

            if (!url) {
                url = getHash();
            }

            if (!url || url === "#" || url.indexOf("#" + path.uiStateKey) === 0) {
                url = location.href;
            }

            this._handleNavigate(url, data.state);
        },

        _handleNavigate: function(url, data) {
            //find first page via hash
            // TODO stripping the hash twice with handleUrl
            var to = stripHash(url),

            // transition is false if it's the first page, undefined
            // otherwise (and may be overridden by default)
                transition = history.stack.length === 0 ? "none" : undefined,

            // default options for the changPage calls made after examining
            // the current state of the page and the hash, NOTE that the
            // transition is derived from the previous history entry
                changePageOptions = {
                    changeHash: false,
                    fromHashChange: true,
                    reverse: data.direction ? data.direction === "back" : (history.stack.length && history.stack[history.stack.length - 2].hash === data.hash)
                };

            $.extend(changePageOptions, data, {
                transition: (history.getLast() || {}).transition || transition
            });

            this.change(this._handleDestination(to), changePageOptions);
        },

        _handleDestination: function(to) {
            // clean the hash for comparison if it's a url
            if ($.type(to) === "string") {
                to = stripHash(to);
            }

            if (to) {

                // At this point, 'to' can be one of 3 things, a cached page
                // element from a history stack entry, an id, or site-relative /
                // absolute URL. If 'to' is an id, we need to resolve it against
                // the documentBase, not the location.href, since the hashchange
                // could've been the result of a forward/backward navigation
                // that crosses from an external page/dialog to an internal
                // page/dialog.
                //
                // TODO move check to history object or path object?
                to = !isPath(to) ? (makeUrlAbsolute("#" + to, documentBase) ) : to;

                // If we're about to go to an initial URL that contains a
                // reference to a non-existent internal page, go to the first
                // page instead. We know that the initial hash refers to a
                // non-existent page, because the initial hash did not end
                // up in the initial history entry
                // TODO move check to history object?
                if (to === makeUrlAbsolute("#" + history.initialDst, documentBase) &&
                    history.stack.length &&
                    history.stack[0].url !== history.initialDst) {
                    to = aries.firstPage;
                }
            }
            return to || aries.firstPage;
        },

        _enhance: function(content, role) {
            return content.page({ role: role });
        },

        _include: function(page, settings) {
            // append to page and enhance
            page.appendTo(this.element);
            // use the page widget to enhance
            this._enhance(page, settings.role);
        },

        _parse: function(html, fileUrl) {
            // TODO consider allowing customization of this method. It's very JQM specific
            var page, all = $("<div></div>");

            //workaround to allow scripts to execute when included in page divs
            all.get(0).innerHTML = html;

            page = all.find("[data-role='page']").first();

            //if page elem couldn't be found, create one and insert the body element's contents
            if (!page.length) {
                page = $("<div data-role='page'>" + (html.split(/<\/?body[^>]*>/gmi)[1] || "" ) + "</div>");
            }

            return page.attr("data-url", convertUrlToDataUrl(fileUrl))
                .attr("data-external-page", true);
        },

        /**
         *  获取指定迁移类型的迁移处理对象。如果未找到则使用的默认迁移对象。
         * @param transition 迁移类型
         * @returns {*|aries.defaultTransitionHandler}
         * @private
         */
        _getTransitionHandler: function(transition) {
            transition = aries._maybeDegradeTransition(transition);
            return aries.transitionHandlers[transition] || aries.defaultTransitionHandler;
        },

        _triggerEvent: function(name, data, page) {
            var eventObject = $.Event(name);

            (page || this.element).trigger(eventObject, data);

            return eventObject;
        },

        /**
         * 触发页面切换前事件。
         * @param to 目标页面（url或者jQuery对象）。
         * @param triggerData 事件附加参数。
         * @param settings 附件配置。
         * @returns {boolean} 如果时间被阻止返回false，否则返回true
         * @private
         */
        _triggerPageBeforeChange: function(to, triggerData, settings) {
            var pageBeforeChangeEvent = this._triggerEvent(pageBeforeChange,
                $.extend(triggerData, {

                    toPage: to,

                    options: settings,

                    /**
                     * 如果目标页面参数是字符串格式则将其转换为绝对地址URL。
                     * 如果目标页面参数是jQuery对象，并且在loadPage回调方法中，
                     * 在setting象上保存过绝对地址URL的话，则获取该值。
                     */
                    absUrl: $.type(to) === "string" ?
                        makeUrlAbsolute(to, this._findBaseWithDefault()) :
                        settings.absUrl
                })
            );
            return !pageBeforeChangeEvent.isDefaultPrevented();
        },

        _triggerCssTransitionEvents: function(to, from, prefix) {
            prefix = prefix || "";
            if (from) {
                this._triggerEvent(prefix ? pageBeforeHide : pageHide, null, from);
            }
            this._triggerEvent(prefix ? pageBeforeShow : pageShow, null, to);
        },

        // determine the current base url
        _findBaseWithDefault: function() {
            var closestBase = (this.activePage && aries.getClosestBaseUrl(this.activePage));
            return closestBase || aries.path.documentBase.hrefNoHash;
        },

        /**
         * 查找指定URL的页面
         * @param absUrl
         * @returns {*}
         * @private
         */
        _find: function(absUrl) {
            // TODO consider supporting a custom callback
            var fileUrl = createFileUrl(absUrl),
                dataUrl = createDataUrl(absUrl),
                page;

            // 检查指定URL的页面是否已加载入DOM中。
            page = this.element
                .children("[data-url='" + dataUrl + "']");

            // If we failed to find the page, check to see if the url is a
            // reference to an embedded page. If so, it may have been dynamically
            // injected by a developer, in which case it would be lacking a
            // data-url attribute and in need of enhancement.
            if (page.length === 0 && dataUrl && isPath(dataUrl)) {
                page = this.element.children(hashToSelector("#" + dataUrl))
                    .attr("data-url", dataUrl);
            }

            // If we failed to find a page in the DOM, check the URL to see if it
            // refers to the first page in the application. Also check to make sure
            // our cached-first-page is actually in the DOM. Some user deployed
            // apps are pruning the first page from the DOM for various reasons.
            // We check for this case here because we don't want a first-page with
            // an id falling through to the non-existent embedded page error case.
            if (page.length === 0 && isFirstPageUrl(fileUrl) && aries.firstPage &&
                aries.firstPage.parent().length) {
                page = $(aries.firstPage);
            }

            return page;
        }
    });
})(jQuery, window.aries);