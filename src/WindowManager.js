define([
  "skylark-langx/skylark",
  "skylark-langx/langx",
  "skylark-domx-browser",
  "skylark-domx-data",
  "skylark-domx-eventer",
  "skylark-domx-noder",
  "skylark-domx-geom",
  "skylark-domx-velm",
  "skylark-domx-query",
  "skylark-domx-plugins",
  "./windows",
  "./Window"
],function(skylark,langx,browser,datax,eventer,noder,geom,velm,$,plugins,windows,Window){


    var WindowManager = langx.Emitter.inherit({
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

    Window.WindowManager = WindowManager;

    return windows.WindowManager = WindowManager;
});