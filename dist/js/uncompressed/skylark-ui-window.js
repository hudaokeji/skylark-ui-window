/**
 * skylark-ui-window - The skylark window widget
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-ui-window/
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
  	  require = globals.require,
  	  isAmd = (typeof define === 'function' && define.amd),
  	  isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");    
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                exports: null
            };
            require(id);
        } else {
            resolved[id] = factory;
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.exports) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(window, args);
        }
        return module.exports;
    };
  }

  factory(define,require);

  if (!isAmd) { 
    if (isCmd) {
      exports = require("skylark-ui-repeater/main");
    } else {
      if (!globals.skylarkjs) {
         globals.skylarkjs = require("skylark-langx/skylark");
      }

    }
  }

})(function(define,require) {

define('skylark-utils-interact/interact',[
    "skylark-utils/skylark",
    "skylark-utils/langx"
], function(skylark, langx) {
	
	var interact = skylark.interact = {
	};

	return interact;
});


define('skylark-utils-interact/mover',[
    "./interact",
    "skylark-utils/langx",
    "skylark-utils/noder",
    "skylark-utils/datax",
    "skylark-utils/geom",
    "skylark-utils/eventer",
    "skylark-utils/styler"
],function(interact, langx,noder,datax,geom,eventer,styler){
    var on = eventer.on,
        off = eventer.off,
        attr = datax.attr,
        removeAttr = datax.removeAttr,
        offset = geom.pagePosition,
        addClass = styler.addClass,
        height = geom.height,
        some = Array.prototype.some,
        map = Array.prototype.map;

    function _place(/*DomNode*/ node, choices, layoutNode, aroundNodeCoords){
        // summary:
        //      Given a list of spots to put node, put it at the first spot where it fits,
        //      of if it doesn't fit anywhere then the place with the least overflow
        // choices: Array
        //      Array of elements like: {corner: 'TL', pos: {x: 10, y: 20} }
        //      Above example says to put the top-left corner of the node at (10,20)
        // layoutNode: Function(node, aroundNodeCorner, nodeCorner, size)
        //      for things like tooltip, they are displayed differently (and have different dimensions)
        //      based on their orientation relative to the parent.   This adjusts the popup based on orientation.
        //      It also passes in the available size for the popup, which is useful for tooltips to
        //      tell them that their width is limited to a certain amount.   layoutNode() may return a value expressing
        //      how much the popup had to be modified to fit into the available space.   This is used to determine
        //      what the best placement is.
        // aroundNodeCoords: Object
        //      Size of aroundNode, ex: {w: 200, h: 50}

        // get {x: 10, y: 10, w: 100, h:100} type obj representing position of
        // viewport over document

        var doc = noder.ownerDoc(node),
            win = noder.ownerWindow(doc),
            view = geom.size(win);

        view.left = 0;
        view.top = 0;

        if(!node.parentNode || String(node.parentNode.tagName).toLowerCase() != "body"){
            doc.body.appendChild(node);
        }

        var best = null;

        some.apply(choices, function(choice){
            var corner = choice.corner;
            var pos = choice.pos;
            var overflow = 0;

            // calculate amount of space available given specified position of node
            var spaceAvailable = {
                w: {
                    'L': view.left + view.width - pos.x,
                    'R': pos.x - view.left,
                    'M': view.width
                }[corner.charAt(1)],

                h: {
                    'T': view.top + view.height - pos.y,
                    'B': pos.y - view.top,
                    'M': view.height
                }[corner.charAt(0)]
            };

            if(layoutNode){
                var res = layoutNode(node, choice.aroundCorner, corner, spaceAvailable, aroundNodeCoords);
                overflow = typeof res == "undefined" ? 0 : res;
            }

            var bb = geom.size(node);

            // coordinates and size of node with specified corner placed at pos,
            // and clipped by viewport
            var
                startXpos = {
                    'L': pos.x,
                    'R': pos.x - bb.width,
                    'M': Math.max(view.left, Math.min(view.left + view.width, pos.x + (bb.width >> 1)) - bb.width) // M orientation is more flexible
                }[corner.charAt(1)],

                startYpos = {
                    'T': pos.y,
                    'B': pos.y - bb.height,
                    'M': Math.max(view.top, Math.min(view.top + view.height, pos.y + (bb.height >> 1)) - bb.height)
                }[corner.charAt(0)],

                startX = Math.max(view.left, startXpos),
                startY = Math.max(view.top, startYpos),
                endX = Math.min(view.left + view.width, startXpos + bb.width),
                endY = Math.min(view.top + view.height, startYpos + bb.height),
                width = endX - startX,
                height = endY - startY;

            overflow += (bb.width - width) + (bb.height - height);

            if(best == null || overflow < best.overflow){
                best = {
                    corner: corner,
                    aroundCorner: choice.aroundCorner,
                    left: startX,
                    top: startY,
                    width: width,
                    height: height,
                    overflow: overflow,
                    spaceAvailable: spaceAvailable
                };
            }

            return !overflow;
        });

        // In case the best position is not the last one we checked, need to call
        // layoutNode() again.
        if(best.overflow && layoutNode){
            layoutNode(node, best.aroundCorner, best.corner, best.spaceAvailable, aroundNodeCoords);
        }


        geom.boundingPosition(node,best);

        return best;
    }

    function at(node, pos, corners, padding, layoutNode){
        var choices = map.apply(corners, function(corner){
            var c = {
                corner: corner,
                aroundCorner: reverse[corner],  // so TooltipDialog.orient() gets aroundCorner argument set
                pos: {x: pos.x,y: pos.y}
            };
            if(padding){
                c.pos.x += corner.charAt(1) == 'L' ? padding.x : -padding.x;
                c.pos.y += corner.charAt(0) == 'T' ? padding.y : -padding.y;
            }
            return c;
        });

        return _place(node, choices, layoutNode);
    }

    function around(
        /*DomNode*/     node,
        /*DomNode|__Rectangle*/ anchor,
        /*String[]*/    positions,
        /*Boolean*/     leftToRight,
        /*Function?*/   layoutNode){

        // summary:
        //      Position node adjacent or kitty-corner to anchor
        //      such that it's fully visible in viewport.
        // description:
        //      Place node such that corner of node touches a corner of
        //      aroundNode, and that node is fully visible.
        // anchor:
        //      Either a DOMNode or a rectangle (object with x, y, width, height).
        // positions:
        //      Ordered list of positions to try matching up.
        //
        //      - before: places drop down to the left of the anchor node/widget, or to the right in the case
        //          of RTL scripts like Hebrew and Arabic; aligns either the top of the drop down
        //          with the top of the anchor, or the bottom of the drop down with bottom of the anchor.
        //      - after: places drop down to the right of the anchor node/widget, or to the left in the case
        //          of RTL scripts like Hebrew and Arabic; aligns either the top of the drop down
        //          with the top of the anchor, or the bottom of the drop down with bottom of the anchor.
        //      - before-centered: centers drop down to the left of the anchor node/widget, or to the right
        //          in the case of RTL scripts like Hebrew and Arabic
        //      - after-centered: centers drop down to the right of the anchor node/widget, or to the left
        //          in the case of RTL scripts like Hebrew and Arabic
        //      - above-centered: drop down is centered above anchor node
        //      - above: drop down goes above anchor node, left sides aligned
        //      - above-alt: drop down goes above anchor node, right sides aligned
        //      - below-centered: drop down is centered above anchor node
        //      - below: drop down goes below anchor node
        //      - below-alt: drop down goes below anchor node, right sides aligned
        // layoutNode: Function(node, aroundNodeCorner, nodeCorner)
        //      For things like tooltip, they are displayed differently (and have different dimensions)
        //      based on their orientation relative to the parent.   This adjusts the popup based on orientation.
        // leftToRight:
        //      True if widget is LTR, false if widget is RTL.   Affects the behavior of "above" and "below"
        //      positions slightly.
        // example:
        //  |   placeAroundNode(node, aroundNode, {'BL':'TL', 'TR':'BR'});
        //      This will try to position node such that node's top-left corner is at the same position
        //      as the bottom left corner of the aroundNode (ie, put node below
        //      aroundNode, with left edges aligned).   If that fails it will try to put
        //      the bottom-right corner of node where the top right corner of aroundNode is
        //      (ie, put node above aroundNode, with right edges aligned)
        //

        // If around is a DOMNode (or DOMNode id), convert to coordinates.
        var aroundNodePos;
        if(typeof anchor == "string" || "offsetWidth" in anchor || "ownerSVGElement" in anchor){
            aroundNodePos = domGeometry.position(anchor, true);

            // For above and below dropdowns, subtract width of border so that popup and aroundNode borders
            // overlap, preventing a double-border effect.  Unfortunately, difficult to measure the border
            // width of either anchor or popup because in both cases the border may be on an inner node.
            if(/^(above|below)/.test(positions[0])){
                var anchorBorder = domGeometry.getBorderExtents(anchor),
                    anchorChildBorder = anchor.firstChild ? domGeometry.getBorderExtents(anchor.firstChild) : {t:0,l:0,b:0,r:0},
                    nodeBorder =  domGeometry.getBorderExtents(node),
                    nodeChildBorder = node.firstChild ? domGeometry.getBorderExtents(node.firstChild) : {t:0,l:0,b:0,r:0};
                aroundNodePos.y += Math.min(anchorBorder.t + anchorChildBorder.t, nodeBorder.t + nodeChildBorder.t);
                aroundNodePos.h -=  Math.min(anchorBorder.t + anchorChildBorder.t, nodeBorder.t+ nodeChildBorder.t) +
                    Math.min(anchorBorder.b + anchorChildBorder.b, nodeBorder.b + nodeChildBorder.b);
            }
        }else{
            aroundNodePos = anchor;
        }

        // Compute position and size of visible part of anchor (it may be partially hidden by ancestor nodes w/scrollbars)
        if(anchor.parentNode){
            // ignore nodes between position:relative and position:absolute
            var sawPosAbsolute = domStyle.getComputedStyle(anchor).position == "absolute";
            var parent = anchor.parentNode;
            while(parent && parent.nodeType == 1 && parent.nodeName != "BODY"){  //ignoring the body will help performance
                var parentPos = domGeometry.position(parent, true),
                    pcs = domStyle.getComputedStyle(parent);
                if(/relative|absolute/.test(pcs.position)){
                    sawPosAbsolute = false;
                }
                if(!sawPosAbsolute && /hidden|auto|scroll/.test(pcs.overflow)){
                    var bottomYCoord = Math.min(aroundNodePos.y + aroundNodePos.h, parentPos.y + parentPos.h);
                    var rightXCoord = Math.min(aroundNodePos.x + aroundNodePos.w, parentPos.x + parentPos.w);
                    aroundNodePos.x = Math.max(aroundNodePos.x, parentPos.x);
                    aroundNodePos.y = Math.max(aroundNodePos.y, parentPos.y);
                    aroundNodePos.h = bottomYCoord - aroundNodePos.y;
                    aroundNodePos.w = rightXCoord - aroundNodePos.x;
                }
                if(pcs.position == "absolute"){
                    sawPosAbsolute = true;
                }
                parent = parent.parentNode;
            }
        }           

        var x = aroundNodePos.x,
            y = aroundNodePos.y,
            width = "w" in aroundNodePos ? aroundNodePos.w : (aroundNodePos.w = aroundNodePos.width),
            height = "h" in aroundNodePos ? aroundNodePos.h : (kernel.deprecated("place.around: dijit/place.__Rectangle: { x:"+x+", y:"+y+", height:"+aroundNodePos.height+", width:"+width+" } has been deprecated.  Please use { x:"+x+", y:"+y+", h:"+aroundNodePos.height+", w:"+width+" }", "", "2.0"), aroundNodePos.h = aroundNodePos.height);

        // Convert positions arguments into choices argument for _place()
        var choices = [];
        function push(aroundCorner, corner){
            choices.push({
                aroundCorner: aroundCorner,
                corner: corner,
                pos: {
                    x: {
                        'L': x,
                        'R': x + width,
                        'M': x + (width >> 1)
                    }[aroundCorner.charAt(1)],
                    y: {
                        'T': y,
                        'B': y + height,
                        'M': y + (height >> 1)
                    }[aroundCorner.charAt(0)]
                }
            })
        }
        array.forEach(positions, function(pos){
            var ltr =  leftToRight;
            switch(pos){
                case "above-centered":
                    push("TM", "BM");
                    break;
                case "below-centered":
                    push("BM", "TM");
                    break;
                case "after-centered":
                    ltr = !ltr;
                    // fall through
                case "before-centered":
                    push(ltr ? "ML" : "MR", ltr ? "MR" : "ML");
                    break;
                case "after":
                    ltr = !ltr;
                    // fall through
                case "before":
                    push(ltr ? "TL" : "TR", ltr ? "TR" : "TL");
                    push(ltr ? "BL" : "BR", ltr ? "BR" : "BL");
                    break;
                case "below-alt":
                    ltr = !ltr;
                    // fall through
                case "below":
                    // first try to align left borders, next try to align right borders (or reverse for RTL mode)
                    push(ltr ? "BL" : "BR", ltr ? "TL" : "TR");
                    push(ltr ? "BR" : "BL", ltr ? "TR" : "TL");
                    break;
                case "above-alt":
                    ltr = !ltr;
                    // fall through
                case "above":
                    // first try to align left borders, next try to align right borders (or reverse for RTL mode)
                    push(ltr ? "TL" : "TR", ltr ? "BL" : "BR");
                    push(ltr ? "TR" : "TL", ltr ? "BR" : "BL");
                    break;
                default:
                    // To assist dijit/_base/place, accept arguments of type {aroundCorner: "BL", corner: "TL"}.
                    // Not meant to be used directly.  Remove for 2.0.
                    push(pos.aroundCorner, pos.corner);
            }
        });

        var position = _place(node, choices, layoutNode, {w: width, h: height});
        position.aroundNodePos = aroundNodePos;

        return position;
    }

    function movable(elm, params) {
        function updateWithTouchData(e) {
            var keys, i;

            if (e.changedTouches) {
                keys = "screenX screenY pageX pageY clientX clientY".split(' ');
                for (i = 0; i < keys.length; i++) {
                    e[keys[i]] = e.changedTouches[0][keys[i]];
                }
            }
        }

        params = params || {};
        var handleEl = params.handle || elm,
            auto = params.auto === false ? false : true,
            constraints = params.constraints,
            overlayDiv,
            doc = params.document || document,
            downButton,
            start,
            stop,
            drag,
            startX,
            startY,
            originalPos,
            size,
            startedCallback = params.started,
            movingCallback = params.moving,
            stoppedCallback = params.stopped,

            start = function(e) {
                var docSize = geom.getDocumentSize(doc),
                    cursor;

                updateWithTouchData(e);

                e.preventDefault();
                downButton = e.button;
                //handleEl = getHandleEl();
                startX = e.screenX;
                startY = e.screenY;

                originalPos = geom.relativePosition(elm);
                size = geom.size(elm);

                // Grab cursor from handle so we can place it on overlay
                cursor = styler.css(handleEl, "curosr");

                overlayDiv = noder.createElement("div");
                styler.css(overlayDiv, {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: docSize.width,
                    height: docSize.height,
                    zIndex: 0x7FFFFFFF,
                    opacity: 0.0001,
                    cursor: cursor
                });
                noder.append(doc.body, overlayDiv);

                eventer.on(doc, "mousemove touchmove", move).on(doc, "mouseup touchend", stop);

                if (startedCallback) {
                    startedCallback(e);
                }
            },

            move = function(e) {
                updateWithTouchData(e);

                if (e.button !== 0) {
                    return stop(e);
                }

                e.deltaX = e.screenX - startX;
                e.deltaY = e.screenY - startY;

                if (auto) {
                    var l = originalPos.left + e.deltaX,
                        t = originalPos.top + e.deltaY;
                    if (constraints) {

                        if (l < constraints.minX) {
                            l = constraints.minX;
                        }

                        if (l > constraints.maxX) {
                            l = constraints.maxX;
                        }

                        if (t < constraints.minY) {
                            t = constraints.minY;
                        }

                        if (t > constraints.maxY) {
                            t = constraints.maxY;
                        }
                    }
                }

                geom.relativePosition(elm, {
                    left: l,
                    top: t
                })

                e.preventDefault();
                if (movingCallback) {
                    movingCallback(e);
                }
            },

            stop = function(e) {
                updateWithTouchData(e);

                eventer.off(doc, "mousemove touchmove", move).off(doc, "mouseup touchend", stop);

                noder.remove(overlayDiv);

                if (stoppedCallback) {
                    stoppedCallback(e);
                }
            };

        eventer.on(handleEl, "mousedown touchstart", start);

        return {
            // destroys the dragger.
            remove: function() {
                eventer.off(handleEl);
            }
        }
    }

    function mover(){
      return mover;
    }

    langx.mixin(mover, {
        around : around,

        at: at, 

        movable: movable

    });

    return interact.mover = mover;
});

/**
 * skylark-ui-swt - The skylark standard widget tookit
 * @author Hudaokeji, Inc.
 * @version v0.9.2.beta
 * @link https://github.com/skylarkui/skylark-ui-swt/
 * @license MIT
 */
define('skylark-ui-swt/sbswt',[
  "skylark-utils/skylark",
  "skylark-utils/langx",
  "skylark-utils/browser",
  "skylark-utils/eventer",
  "skylark-utils/noder",
  "skylark-utils/geom",
  "skylark-utils/query",
  "skylark-utils/widgets"
],function(skylark,langx,browser,eventer,noder,geom,$,widgets){
	var ui = skylark.ui = skylark.ui || {}, 
		sbswt = ui.sbswt = {};

/*---------------------------------------------------------------------------------*/
	/*
	 * Fuel UX utilities.js
	 * https://github.com/ExactTarget/fuelux
	 *
	 * Copyright (c) 2014 ExactTarget
	 * Licensed under the BSD New license.
	 */
	var CONST = {
		BACKSPACE_KEYCODE: 8,
		COMMA_KEYCODE: 188, // `,` & `<`
		DELETE_KEYCODE: 46,
		DOWN_ARROW_KEYCODE: 40,
		ENTER_KEYCODE: 13,
		TAB_KEYCODE: 9,
		UP_ARROW_KEYCODE: 38
	};

	var isShiftHeld = function isShiftHeld (e) { return e.shiftKey === true; };

	var isKey = function isKey (keyCode) {
		return function compareKeycodes (e) {
			return e.keyCode === keyCode;
		};
	};

	var isBackspaceKey = isKey(CONST.BACKSPACE_KEYCODE);
	var isDeleteKey = isKey(CONST.DELETE_KEYCODE);
	var isTabKey = isKey(CONST.TAB_KEYCODE);
	var isUpArrow = isKey(CONST.UP_ARROW_KEYCODE);
	var isDownArrow = isKey(CONST.DOWN_ARROW_KEYCODE);

	var ENCODED_REGEX = /&[^\s]*;/;
	/*
	 * to prevent double encoding decodes content in loop until content is encoding free
	 */
	var cleanInput = function cleanInput (questionableMarkup) {
		// check for encoding and decode
		while (ENCODED_REGEX.test(questionableMarkup)) {
			questionableMarkup = $('<i>').html(questionableMarkup).text();
		}

		// string completely decoded now encode it
		return $('<i>').text(questionableMarkup).html();
	};




	langx.mixin(sbswt, {
		CONST: CONST,
		cleanInput: cleanInput,
		isBackspaceKey: isBackspaceKey,
		isDeleteKey: isDeleteKey,
		isShiftHeld: isShiftHeld,
		isTabKey: isTabKey,
		isUpArrow: isUpArrow,
		isDownArrow: isDownArrow
	});

/*---------------------------------------------------------------------------------*/

	var WidgetBase = widgets.Widget.inherit({
        klassName: "WidgetBase",
    });


	langx.mixin(sbswt, {
		WidgetBase : WidgetBase
	});

	return sbswt;
});

define('skylark-ui-window/window',[
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
define('skylark-ui-window/main',[
    "skylark-utils/query",
    "./window"
], function($) {
    return $;
});
define('skylark-ui-window', ['skylark-ui-window/main'], function (main) { return main; });


},this);