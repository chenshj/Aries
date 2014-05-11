/**
 * Created by chenshj on 14-2-8.
 */
(function($, aries, undefined) {
    'use strict';
    aries.ui('aries.ui.switch', aries.ui.Default, {

        options: {
            state: true,
            size: null,
            animate: true,
            disabled: false,
            readonly: false,
            onColor: "primary",
            offColor: "default",
            onText: "ON",
            offText: "OFF",
            labelText: "&nbsp;",
            baseClass: "bootstrap-switch",
            wrapperClass: "wrapper",
            onInit: function() {
            },
            onSwitchChange: function() {
            }
        },

        _create: function() {
            var element = this.element;
            this.$wrapper = $("<div>", {
                "class": (function(_this) {
                    return function() {
                        var classes;
                        classes = ["" + _this.options.baseClass].concat(_this._getClasses(_this.options.wrapperClass));
                        classes.push(_this.options.state ? "" + _this.options.baseClass + "-on" : "" + _this.options.baseClass + "-off");
                        if (_this.options.size !== null) {
                            classes.push("" + _this.options.baseClass + "-" + _this.options.size);
                        }
                        if (_this.options.animate) {
                            classes.push("" + _this.options.baseClass + "-animate");
                        }
                        if (_this.options.disabled) {
                            classes.push("" + _this.options.baseClass + "-disabled");
                        }
                        if (_this.options.readonly) {
                            classes.push("" + _this.options.baseClass + "-readonly");
                        }
                        if (_this.element.attr("id")) {
                            classes.push("" + _this.options.baseClass + "-id-" + (_this.element.attr("id")));
                        }
                        return classes.join(" ");
                    };
                })(this)()
            });
            this.$container = $("<div>", {
                "class": "" + this.options.baseClass + "-container"
            });
            this.$on = $("<span>", {
                html: this.options.onText,
                "class": "" + this.options.baseClass + "-handle-on " + this.options.baseClass + "-" + this.options.onColor
            });
            this.$off = $("<span>", {
                html: this.options.offText,
                "class": "" + this.options.baseClass + "-handle-off " + this.options.baseClass + "-" + this.options.offColor
            });
            this.$label = $("<span>", {
                "for": this.element.attr("id"),
                html: this.options.labelText,
                "class": "" + this.options.baseClass + "-label"
            });
            this.element.on("init.bootstrapSwitch", (function(_this) {
                return function() {
                    return _this.options.onInit.apply(element, arguments);
                };
            })(this));
            this.element.on("switchChange.bootstrapSwitch", (function(_this) {
                return function() {
                    return _this.options.onSwitchChange.apply(element, arguments);
                };
            })(this));
            this.$container = this.element.wrap(this.$container).parent();
            this.$wrapper = this.$container.wrap(this.$wrapper).parent();
            this.element.before(this.$on).before(this.$label).before(this.$off).trigger("init.bootstrapSwitch");
            this._elementHandlers();
            this._handleHandlers();
            this._labelHandlers();
            this._formHandler();
        },

        state: function(value, skip) {
            if (typeof value === "undefined") {
                return this.options.state;
            }
            if (this.options.disabled || this.options.readonly) {
                return this.element;
            }
            value = !!value;
            this.element.prop("checked", value).trigger("change.bootstrapSwitch", skip);
            return this.element;
        },

        toggleState: function(skip) {
            if (this.options.disabled || this.options.readonly) {
                return this.element;
            }
            return this.element.prop("checked", !this.options.state).trigger("change.bootstrapSwitch", skip);
        },

        size: function(value) {
            if (typeof value === "undefined") {
                return this.options.size;
            }
            if (this.options.size !== null) {
                this.$wrapper.removeClass("" + this.options.baseClass + "-" + this.options.size);
            }
            if (value) {
                this.$wrapper.addClass("" + this.options.baseClass + "-" + value);
            }
            this.options.size = value;
            return this.element;
        },

        animate: function(value) {
            if (typeof value === "undefined") {
                return this.options.animate;
            }
            value = !!value;
            this.$wrapper[value ? "addClass" : "removeClass"]("" + this.options.baseClass + "-animate");
            this.options.animate = value;
            return this.element;
        },

        disabled: function(value) {
            if (typeof value === "undefined") {
                return this.options.disabled;
            }
            value = !!value;
            this.$wrapper[value ? "addClass" : "removeClass"]("" + this.options.baseClass + "-disabled");
            this.element.prop("disabled", value);
            this.options.disabled = value;
            return this.element;
        },

        toggleDisabled: function() {
            this.element.prop("disabled", !this.options.disabled);
            this.$wrapper.toggleClass("" + this.options.baseClass + "-disabled");
            this.options.disabled = !this.options.disabled;
            return this.element;
        },

        readonly: function(value) {
            if (typeof value === "undefined") {
                return this.options.readonly;
            }
            value = !!value;
            this.$wrapper[value ? "addClass" : "removeClass"]("" + this.options.baseClass + "-readonly");
            this.element.prop("readonly", value);
            this.options.readonly = value;
            return this.element;
        },

        toggleReadonly: function() {
            this.element.prop("readonly", !this.options.readonly);
            this.$wrapper.toggleClass("" + this.options.baseClass + "-readonly");
            this.options.readonly = !this.options.readonly;
            return this.element;
        },

        onColor: function(value) {
            var color;
            color = this.options.onColor;
            if (typeof value === "undefined") {
                return color;
            }
            if (color !== null) {
                this.$on.removeClass("" + this.options.baseClass + "-" + color);
            }
            this.$on.addClass("" + this.options.baseClass + "-" + value);
            this.options.onColor = value;
            return this.element;
        },

        offColor: function(value) {
            var color;
            color = this.options.offColor;
            if (typeof value === "undefined") {
                return color;
            }
            if (color !== null) {
                this.$off.removeClass("" + this.options.baseClass + "-" + color);
            }
            this.$off.addClass("" + this.options.baseClass + "-" + value);
            this.options.offColor = value;
            return this.element;
        },

        onText: function(value) {
            if (typeof value === "undefined") {
                return this.options.onText;
            }
            this.$on.html(value);
            this.options.onText = value;
            return this.element;
        },

        offText: function(value) {
            if (typeof value === "undefined") {
                return this.options.offText;
            }
            this.$off.html(value);
            this.options.offText = value;
            return this.element;
        },

        labelText: function(value) {
            if (typeof value === "undefined") {
                return this.options.labelText;
            }
            this.$label.html(value);
            this.options.labelText = value;
            return this.element;
        },

        baseClass: function() {
            return this.options.baseClass;
        },

        wrapperClass: function(value) {
            if (typeof value === "undefined") {
                return this.options.wrapperClass;
            }
            if (!value) {
                value = $.fn.bootstrapSwitch.defaults.wrapperClass;
            }
            this.$wrapper.removeClass(this._getClasses(this.options.wrapperClass).join(" "));
            this.$wrapper.addClass(this._getClasses(value).join(" "));
            this.options.wrapperClass = value;
            return this.element;
        },

        destroy: function() {
            var $form;
            $form = this.element.closest("form");
            if ($form.length) {
                $form.off("reset.bootstrapSwitch").removeData("bootstrap-switch");
            }
            this.$container.children().not(this.element).remove();
            this.element.unwrap().unwrap().off(".bootstrapSwitch").removeData("bootstrap-switch");
            return this.element;
        },

        _elementHandlers: function() {
            return this.element.on({
                "change.bootstrapSwitch": (function(_this) {
                    return function(e, skip) {
                        var checked;
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        checked = _this.element.is(":checked");
                        if (checked === _this.options.state) {
                            return;
                        }
                        _this.options.state = checked;
                        _this.$wrapper.removeClass(checked ? "" + _this.options.baseClass + "-off" : "" + _this.options.baseClass + "-on").addClass(checked ? "" + _this.options.baseClass + "-on" : "" + _this.options.baseClass + "-off");
                        if (!skip) {
                            if (_this.element.is(":radio")) {
                                $("[name='" + (_this.element.attr('name')) + "']").not(_this.element).prop("checked", false).trigger("change.bootstrapSwitch", true);
                            }
                            return _this.element.trigger("switchChange.bootstrapSwitch", [checked]);
                        }
                    };
                })(this),
                "focus.bootstrapSwitch": (function(_this) {
                    return function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return _this.$wrapper.addClass("" + _this.options.baseClass + "-focused");
                    };
                })(this),
                "blur.bootstrapSwitch": (function(_this) {
                    return function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return _this.$wrapper.removeClass("" + _this.options.baseClass + "-focused");
                    };
                })(this),
                "keydown.bootstrapSwitch": (function(_this) {
                    return function(e) {
                        if (!e.which || _this.options.disabled || _this.options.readonly) {
                            return;
                        }
                        switch (e.which) {
                            case 32:
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                return _this.toggleState();
                            case 37:
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                return _this.state(false);
                            case 39:
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                return _this.state(true);
                        }
                    };
                })(this)
            });
        },

        _handleHandlers: function() {
            this.$on.on("click.bootstrapSwitch", (function(_this) {
                return function() {
                    _this.state(false);
                    return _this.element.trigger("focus.bootstrapSwitch");
                };
            })(this));
            this.$label.on("click.bootstrapSwitch",(function(_this){
                return function(){
                    _this.toggleState();
                    return _this.element.trigger("focus.bootstrapSwitch");
                };
            })(this));
            return this.$off.on("click.bootstrapSwitch", (function(_this) {
                return function() {
                    _this.state(true);
                    return _this.element.trigger("focus.bootstrapSwitch");
                };
            })(this));
        },

        _labelHandlers: function() {
            return this.$label.on({
                "mousemove.bootstrapSwitch touchmove.bootstrapSwitch": (function(_this) {
                    return function(e) {
                        var left, percent, right;
                        if (!_this.drag) {
                            return;
                        }
                        e.preventDefault();
                        percent = (((e.pageX || e.originalEvent['touches'][0].pageX) - _this.$wrapper.offset().left) / _this.$wrapper.width()) * 100;
                        left = 25;
                        right = 75;
                        if (percent < left) {
                            percent = left;
                        } else if (percent > right) {
                            percent = right;
                        }
                        _this.$container.css("margin-left", "" + (percent - right) + "%");
                        return _this.element.trigger("focus.bootstrapSwitch");
                    };
                })(this),
                "mousedown.bootstrapSwitch touchstart.bootstrapSwitch": (function(_this) {
                    return function(e) {
                        if (_this.drag || _this.options.disabled || _this.options.readonly) {
                            return;
                        }
                        e.preventDefault();
                        _this.drag = true;
                        if (_this.options.animate) {
                            _this.$wrapper.removeClass("" + _this.options.baseClass + "-animate");
                        }
                        return _this.element.trigger("focus.bootstrapSwitch");
                    };
                })(this),
                "mouseup.bootstrapSwitch touchend.bootstrapSwitch": (function(_this) {
                    return function(e) {
                        if (!_this.drag) {
                            return;
                        }
                        e.preventDefault();
                        _this.drag = false;
                        _this.element.prop("checked", parseInt(_this.$container.css("margin-left"), 10) > -(_this.$container.width() / 6)).trigger("change.bootstrapSwitch");
                        _this.$container.css("margin-left", "");
                        if (_this.options.animate) {
                            return _this.$wrapper.addClass("" + _this.options.baseClass + "-animate");
                        }
                    };
                })(this),
                "mouseleave.bootstrapSwitch": (function(_this) {
                    return function() {
                        return _this.$label.trigger("mouseup.bootstrapSwitch");
                    };
                })(this)
            });
        },

        _formHandler: function() {
            var $form;
            $form = this.element.closest("form");
            if ($form.data("bootstrap-switch")) {
                return;
            }
            return $form.on("reset.bootstrapSwitch", function() {
                return window.setTimeout(function() {
                    return $form.find("input").filter(function() {
                        return $(this).data("bootstrap-switch");
                    }).each(function() {
                        return $(this).bootstrapSwitch("state", this.checked);
                    });
                }, 1);
            }).data("bootstrap-switch", true);
        },

        _getClasses: function(classes) {
            var c, cls, _i, _len;
            if (!$.isArray(classes)) {
                return ["" + this.options.baseClass + "-" + classes];
            }
            cls = [];
            for (_i = 0, _len = classes.length; _i < _len; _i++) {
                c = classes[_i];
                cls.push("" + this.options.baseClass + "-" + c);
            }
            return cls;
        }

    });

})(jQuery, window['aries']);