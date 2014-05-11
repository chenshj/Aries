/**
 * Created by chenshj on 14-2-11.
 */
(function($) {

    var clickEvent;

    aries.ui('aries.ui.widget', {
        options: {

            buttonsHidden: false,

            toggleButton: false,

            toggleClass: 'fa-minus | fa-plus',

            toggleSpeed: 200,

            onToggle: $.noop,

            deleteButton: false,

            deleteClass: 'fa-times',

            deleteSpeed: 200,

            onDelete: $.noop,

            fullscreenButton: false,

            fullscreenClass: 'fa-expand | fa-compress',

            fullscreenDiff: 3,

            onFullscreen: $.noop,

            customButton: false,

            customClass: 'fa-cog',

            customStart: $.noop,

            customEnd: $.noop,

            buttonOrder: "%refresh% %custom% %toggle% %fullscreen% %delete%",

            opacity: 1,

            dragHandle: "> header",

            indicator: true,

            indicatorTime: 600,

            ajax: true,

            loadingLabel: "loading...",

            timestampPlaceholder: ".widget-timestamp",

            timestampFormat: "Last update: %m%/%d%/%y% %h%:%i%:%s%",

            refreshButton: false,

            refreshButtonClass: 'fa-refresh',

            labelError: "Sorry but there was a error:",

            labelUpdated: "Last Update:",

            labelRefresh: "Refresh",

            labelDelete: "Delete widget:",

            afterLoad: $.noop,

            onChange: $.noop,

            onSave: $.noop,

            ajaxnav: true,

            hidden: false,

            collapsed: false,

            load: ''
        },

        classes: {
            alignRight: 'pull-right',
            controlGroup: 'btn-group',
            collapsed: 'widget-collapsed',
            customButton: 'widget-custom-btn',
            deleteButton: 'widget-delete-btn',
            fullScreenButton: 'widget-fullScreen-btn',
            headerButton: 'btn btn-primary',
            headerLoader: 'widget-loader',
            headerLoaderIcon: 'fa-refresh fa-spin',
            icon:'fa',
            noOverflow: 'no-overflow',
            refreshButton: 'widget-refresh-btn',
            toggleButton: 'widget-toggle-btn',
            visible: 'jarviswidget-visible',
            widget: 'widget panel panel-primary',
            widgetBodyLoading: 'widget-body-ajax-loading',
            widgetContent: 'panel-body',
            widgetHeader: 'panel-heading',
            widgetIcon: 'widget-icon',
            widgetTitle: 'panel-title'
        },

        _clickEvents: function() {
            var self = this,
                options = this.options,
                classes = this.classes,
                collapsedClass = classes.collapsed,
                customButtonClass = classes.customButton,
                deleteButtonClass = classes.deleteButton,
                fullScreenButtonClass = classes.fullScreenButton,
                refreshButtonClass = classes.refreshButton,
                toggleButtonClass = classes.toggleButton,
                visibleClass = classes.visible,
                widgetBodyLoadingClass = classes.widgetBodyLoading;

            this.element.on(clickEvent, "." + toggleButtonClass, function(e) {
                var buttonElement = $(this),
                    widgetElement = self.element;

                self._runLoaderWidget(widgetElement);

                if (widgetElement.hasClass(collapsedClass)) {
                    buttonElement.children()
                        .removeClass(self.toggleClass[1])
                        .addClass(self.toggleClass[0]);
                    widgetElement.removeClass(collapsedClass)
                        .children("[role=content]")
                        .slideDown(options.toggleSpeed);
                }
                else {
                    buttonElement.children()
                        .removeClass(self.toggleClass[0])
                        .addClass(self.toggleClass[1]);
                    widgetElement.addClass(collapsedClass)
                        .children("[role=content]")
                        .slideUp(options.toggleSpeed);
                }
                if (typeof options.onToggle === "function") {
                    options.onToggle.call(this, widgetElement)
                }
                e.preventDefault()
            });

            function heightFullScreen () {
                var fullScreenElement = $("#widget-full-screen-mode");
                if (fullScreenElement.length) {
                    var heightWindow = $(window).height(),
                        widgetElement = self.element,
                        heightHeader = widgetElement.children("header").height();
                    widgetElement.children("div").height(heightWindow - heightHeader - 15);
                }
            }

            //            $(window).resize(function() {
            //                heightFullScreen()
            //            });

            this.element.on(clickEvent, "." + fullScreenButtonClass, function(e) {
                var buttonElement = $(this),
                    fullScreenElement = $("#widget-full-screen-mode"),
                    widgetElement = self.element,
                    widgetContentElement = widgetElement.children("div");

                if (fullScreenElement.length) {
                    $("." + classes.noOverflow).removeClass(classes.noOverflow);
                    widgetElement.unwrap("<div>").children("div").removeAttr("style");
                    buttonElement.children().removeClass(self.fullscreenClass[1])
                        .addClass(self.fullscreenClass[0]).parents(classes.controlGroup).children("a").show();

                    if (widgetContentElement.hasClass(visibleClass)) {
                        widgetContentElement.hide().removeClass(visibleClass);
                    }
                    $(window).off('.fullScreen');
                }
                else {
                    $("body").addClass(classes.noOverflow);
                    widgetElement.wrap('<div id="widget-full-screen-mode"></div>');
                    buttonElement.children().removeClass(self.fullscreenClass[0])
                        .addClass(self.fullscreenClass[1]).parents(classes.controlGroup)
                        .children('a:not(.' + fullScreenButtonClass + ')').hide();

                    if (widgetContentElement.is(":hidden")) {
                        widgetContentElement.show().addClass(visibleClass);
                    }

                    $(window).on('resize.fullScreen', function() {
                        heightFullScreen()
                    });
                }

                heightFullScreen();

                if (typeof options.onFullscreen == "function") {
                    options.onFullscreen.call(this, widgetElement)
                }
                e.preventDefault()
            })
                .on(clickEvent, "." + customButtonClass, function(e) {
                    var widgetElement = self.element;

                    if ($(this).children("." + self.customClass[0]).length) {
                        $(this).children().removeClass(self.customClass[0]).addClass(self.customClass[1]);
                        if (typeof options.customStart == "function") {
                            options.customStart.call(this, widgetElement)
                        }
                    }
                    else {
                        $(this).children().removeClass(self.customClass[1]).addClass(self.customClass[0]);
                        if (typeof options.customEnd === "function") {
                            options.customEnd.call(this, widgetElement)
                        }
                    }
                    e.preventDefault()
                })
                .on(clickEvent, "." + deleteButtonClass, function(e) {
                    var widgetElement = self.element,
                        removeId = widgetElement.attr("id"),
                        widTitle = widgetElement.children("header").children("h2").text();

                    $.SmartMessageBox(
                        {
                            title: "<i class='fa fa-times' style='color:#ed1c24'></i> " + options.labelDelete + ' "' + widTitle + '"',
                            content: "Warning: This action cannot be undone",
                            buttons: "[No][Yes]"
                        },
                        function(ButtonPressed) {
                            if (ButtonPressed == "Yes") {
                                $("#" + removeId).fadeOut(options.deleteSpeed, function() {
                                    $(this).remove();
                                    if (typeof options.onDelete == "function") {
                                        options.onDelete.call(this, widgetElement)
                                    }
                                })
                            }
                        });
                    e.preventDefault()
                })
                .on(clickEvent, "." + refreshButtonClass, function(e) {
                    var widgetElement = self.element,
                        pathToFile = options.load,
                        ajaxLoader = widgetElement.children(),
                        buttonElement = $(this);

                    buttonElement.button("loading");
                    ajaxLoader.addClass(widgetBodyLoadingClass);
                    setTimeout(function() {
                        buttonElement.button("reset");
                        ajaxLoader.removeClass(widgetBodyLoadingClass);
                        self._loadAjaxFile(widgetElement, pathToFile, ajaxLoader)
                    }, 1000);
                    e.preventDefault();
                })
        },

        _create: function() {
            var options = this.options,
                classes = this.classes,
                collapsedClass = classes.collapsed,
                headerButtonClass = classes.headerButton,
                iconClass = classes.icon;

            this.element.addClass(classes.widget)
                .children('div:first').addClass(classes.widgetContent);

            this.toggleClass = options.toggleClass.split("|");

            this.fullscreenClass = options.fullscreenClass.split("|");

            this.customClass = options.customClass.split("|");

            var self = this;

            var headerElement = this.element.children("header").addClass(classes.widgetHeader),
                controlGroupElement;
            var customBtn, deleteBtn, fullScreenBtn, refreshBtn, toggleBtn;

            if (!this.element.attr("role")) {

                if (options.hidden) {
                    this.element.hide();
                }

                if (options.collapsed) {
                    this.element.addClass(collapsedClass).children("div").hide();
                }

                customBtn = options.customButton ?
                    '<a href="javascript:void(0);" class="' + headerButtonClass + ' ' + classes.customButton + '">' +
                        '<i class="' + iconClass+' '+options.customClass + '"></i></a>' : '';

                deleteBtn = options.deleteButton ?
                    '<a href="javascript:void(0);" class="' + headerButtonClass + ' ' + classes.deleteButton + '" rel="tooltip" title="Delete" data-placement="bottom">' +
                        '<i class="' + iconClass+' '+options.deleteClass + '"></i></a>' : '';

                fullScreenBtn = options.fullscreenButton ?
                    '<a href="javascript:void(0);" class="' + headerButtonClass + ' ' + classes.fullScreenButton + '" rel="tooltip" title="Fullscreen" data-placement="bottom">' +
                        '<i class="' +iconClass+' '+ self.fullscreenClass[0] + '"></i></a>' : '';

                toggleBtn = options.toggleButton ?
                    '<a href="javascript:void(0);" class="' + headerButtonClass + ' ' + classes.toggleButton + '" rel="tooltip" title="Collapse" data-placement="bottom">' +
                        '<i class="' + iconClass+' '+((options.collapsed || this.element.hasClass(collapsedClass)) ?
                        self.toggleClass[1] : self.toggleClass[0]) + '"></i></a>' : '';

                refreshBtn = (options.refreshButton && options.load) ?
                    '<a href="#" class="' + headerButtonClass + ' ' + classes.refreshButton + '" data-loading-text="&nbsp;&nbsp;Loading...&nbsp;" rel="tooltip" title="Refresh" data-placement="bottom">' +
                        '<i class="' + iconClass+' '+options.refreshButtonClass + '"></i></a>' : '';

                var formatButtons = options.buttonOrder
                    .replace(/%refresh%/g, refreshBtn)
                    .replace(/%delete%/g, deleteBtn)
                    .replace(/%custom%/g, customBtn)
                    .replace(/%fullscreen%/g, fullScreenBtn)
                    .replace(/%toggle%/g, toggleBtn);

                headerElement.find('h2').addClass(classes.widgetTitle).end()
                    .children('span:first').addClass(classes.widgetIcon);

                if (refreshBtn || deleteBtn || customBtn || fullScreenBtn || toggleBtn) {
                    headerElement.prepend('<div class="' + classes.controlGroup + ' ' + classes.alignRight + '">' + formatButtons + "</div>");
                }
                controlGroupElement = this.element.find(classes.controlGroup);

                headerElement.append('<span class="' + classes.headerLoader + '">' +
                    '<i class="' + classes.headerLoaderIcon + '"></i></span>');

                this.element.attr("role", "widget")
                    .children("div").attr("role", "content")
                    .prev("header").attr("role", "heading")
                    .children("div").attr("role", "menu");
            }

            if (options.buttonsHidden) {
                controlGroupElement.hide();
            }

            headerElement.find('header [rel=tooltip]').tooltip();

            this.element.find("[data-widget-load]").each(function() {
                var thisItem = $(this),
                    thisItemHeader = thisItem.children(),
                    pathToFile = thisItem.data("widget-load"),
                    reloadTime = thisItem.data("widget-refresh") * 1000,
                    ajaxLoader = thisItem.children();

                if (!thisItem.find(".jarviswidget-ajax-placeholder").length) {
                    thisItem.children("widget-body")
                        .append('<div class="jarviswidget-ajax-placeholder">' + options.loadingLabel + "</div>");
                    if (thisItem.data("widget-refresh") > 0) {
                        self._loadAjaxFile(thisItem, pathToFile, thisItemHeader);
                        setInterval(function() {
                            self._loadAjaxFile(thisItem, pathToFile, thisItemHeader);
                        }, reloadTime)
                    }
                    else {
                        self._loadAjaxFile(thisItem, pathToFile, thisItemHeader);
                    }
                }
            });

            if (options.buttonsHidden) {
                headerElement.hover(function() {
                    controlGroupElement.stop(true, true).fadeTo(100, 1);
                }, function() {
                    controlGroupElement.stop(true, true).fadeTo(100, 0);
                });
            }

            if (("ontouchstart" in window) || window['DocumentTouch'] && document instanceof window['DocumentTouch']) {
                clickEvent = "click touchstart";
            }
            else {
                clickEvent = "click";
            }

            this._clickEvents();
        },

        _getPastTimestamp: function(timestamp) {
            var date = new Date(timestamp),
                tsMonth = date.getMonth() + 1,
                tsDay = date.getDate(),
                tsYear = date.getFullYear(),
                tsHours = date.getHours(),
                tsMinutes = date.getMinutes(),
                tsSeconds = date.getUTCSeconds();

            tsMonth = tsMonth < 10 ? '0' + tsMonth : tsMonth;
            tsDay = tsDay < 10 ? '0' + tsDay : tsDay;
            tsHours = tsHours < 10 ? '0' + tsHours : tsHours;
            tsMinutes = tsMinutes < 10 ? '0' + tsMinutes : tsMinutes;
            tsSeconds = tsSeconds < 10 ? '0' + tsSeconds : tsSeconds;

            return this.options.timestampFormat
                .replace(/%d%/g, tsDay)
                .replace(/%m%/g, tsMonth)
                .replace(/%y%/g, tsYear)
                .replace(/%h%/g, tsHours)
                .replace(/%i%/g, tsMinutes)
                .replace(/%s%/g, tsSeconds);
        },

        _loadAjaxFile: function(awidget, file, loader) {
            var self = this,
                options = this.options,
                placeholder;
            awidget.find("." + this.classes.widgetContent)
                .load(file, function(response, status, xhr) {
                    var $this = $(this);
                    if (status === "error") {
                        $this.html('<h4 class="alert alert-danger">' +
                            options.labelError +
                            "<b> " + xhr.status + " " + xhr.statusText + "</b>" +
                            "</h4>");
                    }
                    else if (status === "success") {
                        placeholder = awidget.find(options.timestampPlaceholder);
                        if (placeholder.length) {
                            placeholder.html(self._getPastTimestamp(new Date()));
                        }

                        if (typeof options.afterLoad === "function") {
                            options.afterLoad.call(this, awidget)
                        }
                    }
                });
            self._runLoaderWidget(loader)
        },

        _runLoaderWidget: function(widgetElement) {
            var options = this.options;
            if (options.indicator) {
                widgetElement.find("." + this.classes.headerLoader)
                    .stop(true, true).fadeIn(100)
                    .delay(options.indicatorTime).fadeOut(100);
            }
        }
    });

})(jQuery);