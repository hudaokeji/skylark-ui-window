/**
 * skylark-ui-window - The skylark window widget
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-ui-window/
 * @license MIT
 */
define([
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/datax",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/velm",
  "skylark-utils/query",
  "skylark-utils-interact/mover",
  "skylark-ui-swt/sbswt"
],function(langx,browser,datax,eventer,noder,geom,velm,$,mover,sbswt){


/*----------------------------------------------------------------------*/
    /*
    https://github.com/earmbrust/bootstrap-window

    Copyright (c) 2013-2015 Elden Armbrust

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
    */
    var namespace = 'bsw';

    var Window = sbswt.Window = sbswt.WidgetBase.inherit({
        klassName: "Window",

        init : function(element,options) {
            options = options || {};
            var defaults = {
                selectors: {
                    handle: '.window-header',
                    title: '.window-title',
                    body: '.window-body',
                    footer: '.window-footer'
                },
                elements: {
                    handle: null,
                    title: null,
                    body: null,
                    footer: null
                },
                references: {
                    body: $('body'),
                    window: $(window)
                },
                effect: 'fade',
                parseHandleForTitle: true,
                maximized: false,
                maximizable: false,
                title: 'No Title',
                bodyContent: '',
                footerContent: ''
            };
            options = this.options = langx.mixin({}, defaults, options,true);

            var _this = this;

            this.$el = $(element);

            if (!this.$el.hasClass('window')) {
                this.$el.addClass('window');
            }
            this.$el.data('window', this);

            if (this.$el.find(options.selectors.handle).length <= 0) {
                this.$el.prepend('<div class="window-header"><h4 class="window-title"></h4></div>');
            }

            options.elements.handle = this.$el.find(options.selectors.handle);
            options.elements.title = this.$el.find(options.selectors.title);
            options.elements.body = this.$el.find(options.selectors.body);
            options.elements.footer = this.$el.find(options.selectors.footer);
            options.elements.title.html(options.title);

            if (options.maximizable) {
                options.elements.buttons = {};
                options.elements.buttons.maximize = $('<button data-maximize="window"><i class="glyphicon glyphicon-chevron-up"></i></button>');
                options.elements.handle.prepend(options.elements.buttons.maximize);
                options.elements.buttons.restore = $('<button data-restore="window"><i class="glyphicon glyphicon-modal-window"></i></button>');
                options.elements.handle.prepend(options.elements.buttons.restore);

            }
            if (_this.$el.find('[data-dismiss=window]').length <= 0) {
                options.elements.handle.prepend('<button type="button" class="close" data-dismiss="window" aria-hidden="true"><i class="glyphicon glyphicon-remove"></i></button>');
            }
            options.elements.body.html(options.bodyContent);
            options.elements.footer.html(options.footerContent);

            this.undock();

            this.setSticky(options.sticky);

            return this;
        },

        undock : function() {
            var _this = this;
            this.$el.css('visibility', 'hidden');
            this.$el.appendTo('body');
            this.centerWindow();
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                this.options.references.window.bind('orientationchange resize', function(event) {
                    _this.centerWindow();
                });
            }

            this.$el.on('touchmove', function(e) {
                e.stopPropagation();
            });

            this.initHandlers();
            this.$el.hide();
            if (this.options.id) {
                this.id = this.options.id;
            } else {
                this.id = '';
            }
            this.show();
        },

        maximize : function() {
            this.$el.removeClass('minimized');
            this.$el.addClass('maximized');
            this.state = "maximized";
            var bottomOffset = 0;
            if (this.options.window_manager) {
                bottomOffset = this.options.window_manager.getContainer().height();
            }
            this.$el.css({
                top: parseInt($('body').css('padding-top'), 10),
                left: 0,
                right: 0,
                bottom: bottomOffset,
                maxWidth: 'none',
                width: 'auto',
                height: 'auto'
            });
            this.$el.trigger(namespace + '.maximize');
        },


        restore : function() {
            this.$el.removeClass('minimized');
            this.$el.removeClass('maximized');
            this.$el.removeAttr('style');
            this.state = undefined;
            this.$el.css({
                top: this.window_info.top,
                left: this.window_info.left,
                width: this.window_info.width,
                height: this.window_info.height
            });
            this.$el.removeProp('style');
            this.$el.trigger(namespace + '.restore');
        },

        show : function(cb) {
            var _this = this;
            this.$el.css('visibility', 'visible');
            var callbackHandler = function() {
                _this.$el.trigger(namespace + '.show');
                if (cb) {
                    cb.call(_this, arguments);
                }
            };
            if (this.options.effect === 'fade') {
                this.$el.fadeIn(undefined, undefined, callbackHandler);
            } else {
                callbackHandler.call(this.$el);
            }
        },

        setEffect : function(effect) {
            this.options.effect = effect;
        },

        getEffect : function() {
            return this.options.effect;
        },

        centerWindow : function() {
            var top, left,
                bodyTop = parseInt(this.options.references.body.position().top, 10) + parseInt(this.options.references.body.css('paddingTop'), 10),
                maxHeight;
            if (!this.options.sticky) {
                left = (this.options.references.window.width() / 2) - (this.$el.width() / 2);
                top = (this.options.references.window.height() / 2) - (this.$el.height() / 2);
            } else {
                left = (this.options.references.window.width() / 2) - (this.$el.width() / 2);
                top = (this.options.references.window.height() / 2) - (this.$el.height() / 2);
            }

            if (top < bodyTop) {
                top = bodyTop;
            }
            maxHeight = ((this.options.references.window.height() - bodyTop) - (parseInt(this.options.elements.handle.css('height'), 10) + parseInt(this.options.elements.footer.css('height'), 10))) - 45;
            this.options.elements.body.css('maxHeight', maxHeight);

            this.$el.css('left', left);
            this.$el.css('top', top);
            if (this.$el && this.$el.length > 0) {
                this.window_info = {
                    top: this.$el.position().top,
                    left: this.$el.position().left,
                    width: this.$el.outerWidth(),
                    height: this.$el.outerHeight()
                };
            }
            this.$el.trigger(namespace + '.centerWindow');
        },

        close : function(cb) {
            var _this = this;
            if (this.options.parent) {
                this.options.parent.clearBlocker();
                if (this.options.window_manager) {
                    this.options.window_manager.setFocused(this.options.parent);
                }
            } else if (this.options.window_manager && this.options.window_manager.windows.length > 0) {
                this.options.window_manager.setNextFocused();
            }

            var closeFn = function() {
                _this.$el.trigger(namespace + '.close');
                _this.$el.remove();
                if (cb) {
                    cb.call(_this);
                }
            };

            if (this.options.effect === 'fade') {
                this.$el.fadeOut(closeFn);
            } else {
                closeFn.call(_this.$el);
            }

            if (this.$windowTab) {
                if (this.options.effect === 'fade') {
                    this.$windowTab.fadeOut(400, function() {
                        _this.$windowTab.remove();
                    });
                } else {
                    this.$windowTab.hide();
                    this.$windowTab.remove();
                }

            }
        },

        on : function() {
            this.$el.on.apply(this.$el, arguments);
        },

        sendToBack : function () {
            var returnVal = false;
            if (this.options.window_manager) {
                returnVal = this.options.window_manager.sendToBack(this);
            }
            return returnVal;
        },

        setActive : function(active) {
            if (active) {
                this.$el.addClass('active');
                if (this.$windowTab) {
                    this.$windowTab.addClass('label-primary');
                }
                this.$el.trigger('active');
            } else {
                this.$el.removeClass('active');
                if (this.$windowTab) {
                    this.$windowTab.removeClass('label-primary');
                    this.$windowTab.addClass('label-default');
                }
                this.$el.trigger('inactive');
            }
        },

        setIndex : function(index) {
            this.$el.css('zIndex', index);
        },

        setWindowTab : function(windowTab) {
            this.$windowTab = windowTab;
        },

        getWindowTab : function() {
            return this.$windowTab;
        },

        getTitle : function() {
            return this.options.title;
        },

        getElement : function() {
            return this.$el;
        },

        setSticky : function(sticky) {
            this.options.sticky = sticky;
            if (sticky === false) {
                this.$el.css({
                    'position': 'absolute'
                });
            } else {
                this.$el.css({
                    'position': 'fixed'
                });
            }
        },

        getSticky : function() {
            return this.options.sticky;
        },

        setManager : function(window_manager) {
            this.options.window_manager = window_manager;
        },

        initHandlers : function() {
            var _this = this;
            var title_buttons;

            this.$el.find('[data-dismiss=window]').on('click', function(event) {
                event.stopPropagation();
                event.preventDefault();
                if (_this.options.blocker) {
                    return;
                }
                _this.close();
            });

            this.$el.find('[data-maximize=window]').on('click', function(event) {
                event.stopPropagation();
                event.preventDefault();
                if (_this.options.blocker) {
                    return;
                }
                _this.maximize();
            });

            this.$el.find('[data-restore=window]').on('click', function(event) {
                if (_this.options.blocker) {
                    return;
                }
                _this.restore();
            });

            this.moveable = mover.movable(this.$el[0],{
                handle : this.options.elements.title[0]
            });

            /*

 
            this.$el.off('mousedown');
            this.$el.on('mousedown', function() {
                if (_this.options.blocker) {
                    _this.options.blocker.getElement().trigger('focused');
                    _this.options.blocker.blink();
                    return;
                } else {
                    _this.$el.trigger('focused');
                }

                if (_this.$el.hasClass('ns-resize') || _this.$el.hasClass('ew-resize')) {
                    $('body > *').addClass('disable-select');
                    _this.resizing = true;
                    _this.offset = {};
                    _this.offset.x = event.pageX;
                    _this.offset.y = event.pageY;
                    _this.window_info = {
                        top: _this.$el.position().top,
                        left: _this.$el.position().left,
                        width: _this.$el.outerWidth(),
                        height: _this.$el.outerHeight()
                    };

                    if (event.offsetY < 5) {
                        _this.$el.addClass('north');
                    }
                    if (event.offsetY > (_this.$el.height() - 5)) {
                        _this.$el.addClass('south');
                    }
                    if (event.offsetX < 5) {
                        _this.$el.addClass('west');
                    }
                    if (event.offsetX > (_this.$el.width() - 5)) {
                        _this.$el.addClass('east');
                    }
                }
            });


            _this.options.references.body.on('mouseup', function() {
                _this.resizing = false;
                $('body > *').removeClass('disable-select');
                _this.$el.removeClass('west');
                _this.$el.removeClass('east');
                _this.$el.removeClass('north');
                _this.$el.removeClass('south');

            });
            _this.options.elements.handle.off('mousedown');
            _this.options.elements.handle.on('mousedown', function(event) {
                if (_this.options.blocker) {
                    return;
                }
                _this.moving = true;
                _this.offset = {};
                _this.offset.x = event.pageX - _this.$el.position().left;
                _this.offset.y = event.pageY - _this.$el.position().top;
                $('body > *').addClass('disable-select');
            });
            _this.options.elements.handle.on('mouseup', function(event) {
                _this.moving = false;
                $('body > *').removeClass('disable-select');
            });


            _this.options.references.body.on('mousemove', _this.$el, function(event) {
                if (_this.moving && _this.state !== "maximized" &&
                    (
                        $(event.toElement).hasClass(_this.options.selectors.handle.replace('.', '')) ||
                        $(event.toElement).hasClass(_this.options.selectors.title.replace('.', ''))
                    )) {


                    var top = _this.options.elements.handle.position().top,
                        left = _this.options.elements.handle.position().left;
                    _this.$el.css('top', event.pageY - _this.offset.y);
                    _this.window_info.top = event.pageY - _this.offset.y;
                    _this.$el.css('left', event.pageX - _this.offset.x);
                    _this.window_info.left = event.pageX - _this.offset.x;
                    _this.window_info.width = _this.$el.outerWidth();
                    _this.window_info.height = _this.$el.outerHeight();
                }
                if (_this.options.resizable && _this.resizing) {
                    if (_this.$el.hasClass("east")) {
                        _this.$el.css('width', event.pageX - _this.window_info.left);
                    }
                    if (_this.$el.hasClass("west")) {

                        _this.$el.css('left', event.pageX);
                        _this.$el.css('width', _this.window_info.width + (_this.window_info.left - event.pageX));
                    }
                    if (_this.$el.hasClass("south")) {
                        _this.$el.css('height', event.pageY - _this.window_info.top);
                    }
                    if (_this.$el.hasClass("north")) {
                        _this.$el.css('top', event.pageY);
                        _this.$el.css('height', _this.window_info.height + (_this.window_info.top - event.pageY));
                    }
                }
            });

            this.$el.on('mousemove', function(event) {
                if (_this.options.blocker) {
                    return;
                }
                if (_this.options.resizable) {
                    if (event.offsetY > (_this.$el.height() - 5) || event.offsetY < 5) {
                        _this.$el.addClass('ns-resize');
                    } else {
                        _this.$el.removeClass('ns-resize');
                    }
                    if (event.offsetX > (_this.$el.width() - 5) || event.offsetX < 5) {
                        _this.$el.addClass('ew-resize');

                    } else {
                        _this.$el.removeClass('ew-resize');
                    }
                }

            });
            */
        },

        resize : function(options) {
            options = options || {};
            if (options.top) {
                this.$el.css('top', options.top);
            }
            if (options.left) {
                this.$el.css('left', options.left);
            }
            if (options.height) {
                this.$el.css('height', options.height);
            }
            if (options.width) {
                this.$el.css('width', options.width);
            }
            this.$el.trigger(namespace + '.resize');
        },

        setBlocker : function(window_handle) {
            this.options.blocker = window_handle;
            this.$el.find('.disable-shade').remove();
            var shade = '<div class="disable-shade"></div>';
            this.options.elements.body.append(shade);
            this.options.elements.body.addClass('disable-scroll');
            this.options.elements.footer.append(shade);
            if (this.options.effect === 'fade') {
                this.$el.find('.disable-shade').fadeIn();
            } else {
                this.$el.find('.disable-shade').show();
            }

            if (!this.options.blocker.getParent()) {
                this.options.blocker.setParent(this);
            }
        },


        getBlocker : function() {
            return this.options.blocker;
        },

        clearBlocker : function() {
            this.options.elements.body.removeClass('disable-scroll');
            if (this.options.effect === 'fade') {
                this.$el.find('.disable-shade').fadeOut(function() {
                    this.remove();
                });
            } else {
                this.$el.find('.disable-shade').hide();
                this.remove();
            }

            delete this.options.blocker;
        },

        setParent : function(window_handle) {
            this.options.parent = window_handle;
            if (!this.options.parent.getBlocker()) {
                this.options.parent.setBlocker(this);
            }
        },

        getParent : function() {
            return this.options.parent;
        },

        blink : function() {
            var _this = this,
                active = this.$el.hasClass('active'),

                windowTab = this.getWindowTab(),
                focused = windowTab ? windowTab.hasClass('label-primary') : undefined,

                blinkInterval = setInterval(function() {
                    _this.$el.toggleClass('active');
                    if (windowTab) {
                        windowTab.toggleClass('label-primary');
                    }

                }, 250),
                blinkTimeout = setTimeout(function() {
                    clearInterval(blinkInterval);
                    if (active) {
                        _this.$el.addClass('active');
                    }
                    if (windowTab && focused) {
                        windowTab.addClass('label-primary');
                    }

                }, 1000);
        }

    });


    datax.window = function(elm,options) {
      var wgt  = this.data(elm,'sbswt.window');

      if (!wgt) {
        this.data(elm,'sbswt.window', (wgt = new Window(elm)));
      }
      if (typeof option == 'string') {
        wgt[options]();
      } 
   };


    $.fn.window = function(options) {
        return this.each(function() {
            datax.window(this,options);          
        });
    };

    velm.partial("window",function(options){
        datax.window(this.domNode,options);
    });

    $('[data-window-target]').off('click');
    $('[data-window-target]').on('click', function() {
        var $this = $(this),
            opts = {
                selectors: {}
            };
        if ($this.data('windowTitle')) {
            opts.title = $this.data('windowTitle');
        }

        if ($this.data('titleHandle')) {
            opts.selectors.title = $this.data('titleHandle');
        }

        if ($this.data('windowHandle')) {
            opts.selectors.handle = $this.data('windowHandle');
        }
        if ($this.data('clone')) {
            opts.clone = $this.data('windowHandle');
        }

        $($this.data('windowTarget')).window(opts);
    });


    var WindowManager = sbswt.WindowManager = sbswt.WidgetBase.inherit({
        klassName: "WindowManager",

        init : function(options) {
            this.windows = [];
            options = options || {};
            this.initialize(options);
            return this;
        },

        findWindowByID : function(id) {
            var returnValue = null;
            langx.each(this.windows, function(index, window) {
                console.log(arguments);
                if (window.id === id) {
                    returnValue = window;
                }
            });
            return returnValue;
        },

        destroyWindow : function(window_handle) {
            var _this = this;
            var returnVal = false;
            langx.each(this.windows, function(index, window) {
                if (window === window_handle) {
                    window_handle.close();
                    _this.windows.splice(index, 1);
                    _this.resortWindows();
                    returnVal = true;
                }
            });
            return returnVal;
        },

        closeWindow : function(window_handle) {
            this.destroyWindow(window_handle);
        },

        resortWindows : function() {
            var startZIndex = 900;
            langx.each(this.windows, function(index, window) {

                window.setIndex(startZIndex + index);
            });
        },

        setFocused : function(focused_window) {
            var focusedWindowIndex;
            while (focused_window.getBlocker()) {
                focused_window = focused_window.getBlocker();
            }
            langx.each(this.windows, function(index, windowHandle) {
                windowHandle.setActive(false);
                if (windowHandle === focused_window) {
                    focusedWindowIndex = index;
                }
            });
            this.windows.push(this.windows.splice(focusedWindowIndex, 1)[0]);
            focused_window.setActive(true);
            this.resortWindows();

        },

        sendToBack : function(window) {
            var windowHandle = this.windows.splice(this.windows.indexOf(window), 1)[0];
            this.windows.unshift(windowHandle);
            this.resortWindows();
            return true;
        },


        initialize : function(options) {
            this.options = options;
            this.elements = {};

            if (this.options.container) {
                this.elements.container = $(this.options.container);
                this.elements.container.addClass('window-pane');
            }
        },

        getContainer : function() {
            var returnVal;
            if (this.elements && this.elements.container) {
                returnVal = this.elements.container;
            }
            return returnVal;
        },

        setNextFocused : function() {
            this.setFocused(this.windows[this.windows.length - 1]);
        },

        addWindow : function(window_object) {
            var _this = this;
            window_object.getElement().on('focused', function(event) {
                _this.setFocused(window_object);
            });
            window_object.getElement().on('close', function() {
                _this.destroyWindow(window_object);
                if (window_object.getWindowTab()) {
                    window_object.getWindowTab().remove();
                }

            });

            window_object.on('bsw.restore', function() {
                _this.resortWindows();
            });

            if (this.options.container) {
                window_object.setWindowTab($('<span class="label label-default">' + window_object.getTitle() + '<button class="close">x</button></span>'));
                window_object.getWindowTab().find('.close').on('click', function(event) {
                    var blocker = window_object.getBlocker();
                    if (!blocker) {
                        window_object.close();
                    } else {
                        blocker.blink();
                    }

                });
                window_object.getWindowTab().on('click', function(event) {
                    var blocker = window_object.getBlocker();
                    if (!blocker) {
                        _this.setFocused(window_object);
                        if (window_object.getSticky()) {
                            window.scrollTo(0, window_object.getElement().position().top);
                        }
                    } else {
                        blocker.blink();
                    }
                });

                $(this.options.container).append(window_object.getWindowTab());
            }

            this.windows.push(window_object);
            window_object.setManager(this);
            this.setFocused(window_object);
            return window_object;
        },

        createWindow : function(window_options) {
            var _this = this;
            var final_options = langx.mixin({},window_options);
            if (this.options.windowTemplate && !final_options.template) {
                final_options.template = this.options.windowTemplate;
            }

            var newWindow = new Window(final_options.template,final_options);


            return this.addWindow(newWindow);
        }

    });


/*----------------------------------------------------------------------*/
    langx.mixin(sbswt,{
        Window : Window,
        WindowManager : WindowManager
    });

    return $.fn.window;
});