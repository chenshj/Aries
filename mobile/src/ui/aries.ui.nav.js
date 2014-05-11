/**
 * Created by chenshj on 14-2-11.
 */
(function($, aries) {
    'use strict';
    aries.ui('aries.ui.nav', aries.ui.Default, {

        options: {
            accordion: true,
            speed: 200,
            showCollapseSign:true,
            closedSign: '<em class="fa fa-plus-square-o"></em>',
            openedSign: '<em class="fa fa-minus-square-o"></em>'
        },

        classes: {
            collapseSign: 'collapse-sign'
        },

        _create: function() {
            var self = this,
                collapseSignClass = this.classes.collapseSign,
                options = this.options,
                accordion = options.accordion,
                closedSign = options.closedSign,
                openedSign = options.openedSign,
                speed = options.speed;

            // 初始化多级展开标志。
            this.element.find('li').each(function() {
                var currentItem = $(this),
                    currentItemLink = currentItem.find('a:first'),
                    subItems = currentItem.find('ul');

                // 当前节点下有子节点。
                if (subItems.length) {
                    // 添加多级展开标志。
                    currentItemLink.append('<b class="' + collapseSignClass + '">' + closedSign + '</b>');

                    // 当链接的href属性为#时，避免跳转的页面顶部。
                    if (currentItemLink.attr('href') === "#") {
                        currentItemLink.click(function() {
                            return false;
                        });
                    }
                }
            });

            // 初始化当前活动项。
            this.element.find("li.active").each(function() {
                var currentItemContainer = $(this).parents('ul'),
                    parentItem = currentItemContainer.parent('li');
                currentItemContainer.slideDown(speed);
                parentItem.find("b:first").html(openedSign);
                parentItem.addClass("open");
            });

            this.element.find("li a").click(function() {
                var currentItemLink = $(this),
                    currentItem = currentItemLink.parent(),
                    subItems = currentItem.find('ul'),
                    firstSubItems = currentItem.find('ul:first'),
                    parents, visible;
                // 当前节点下有子节点。
                if (subItems.length) {
                    // 仅处理未展开的节点
                    if (accordion && !subItems.is(':visible')) {
                        parents = currentItem.parents("ul");
                        visible = self.element.find("ul:visible");
                        visible.each(function(visibleIndex) {
                            var close = true;
                            parents.each(function(parentIndex) {
                                if (parents[parentIndex] === visible[visibleIndex]) {
                                    close = false;
                                    return false;
                                }
                                return true;
                            });
                            if (close) {
                                if (subItems !== visible[visibleIndex]) {
                                    $(visible[visibleIndex]).slideUp(options.speed, function() {
                                        currentItem.find("b:first").html(options.closedSign);
                                        currentItem.removeClass("open");
                                    });
                                }
                            }
                        });
                    }

                    if (firstSubItems.is(":visible") && !firstSubItems.hasClass("active")) {
                        firstSubItems.slideUp(options.speed, function() {
                            currentItem.removeClass("open");
                            currentItem.find("b:first").delay(options.speed).html(options.closedSign);
                        });
                    } else {
                        firstSubItems.slideDown(options.speed, function() {
                            /*$(this).effect("highlight", {color : '#616161'}, 500); - disabled due to CPU clocking on phones*/
                            currentItem.addClass("open");
                            currentItem.find("b:first").delay(options.speed).html(options.openedSign);
                        });
                    }
                }
            });
        }

    });
})(window['jQuery'], window.aries);