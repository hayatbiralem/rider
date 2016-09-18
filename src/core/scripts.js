// Rider
(function(global){
    'use strict';

    var elementPool = [];
    var Rider = function(element, options){
        if(!element) Rider.error('Missing selector.');

        if(Rider.isString(element)) element = Rider.$(element);
        if(!element) Rider.error('Element not found.');

        if(elementPool.indexOf(element) !== -1) Rider.error('An instance of Rider with this selector already exists.');
        elementPool.push(element);

        this.options = Rider.extend({
            blockClass: 'rider',
            itemClass: 'rider__item',
            visibleCount: 1,
            page: 1,
            reverseHideDirection: false
        }, options || {});

        this.events = {
            start: null,
            render: null,
            end: null
        };

        this.element = element;
        this.items = Rider.$$('.' + this.options.itemClass, element);
        this.items.forEach(function(item, index){
            item.setAttribute('data-rider-index', index.toString());
        });
        this.itemClassTemplate = Rider.format('{0}--{status} {0}--{status}--{index} {0}--{status}--{direction} {0}--{status}--{direction}--{index}', this.options.itemClass);
        this.itemClassRemovePattern = new RegExp( Rider.format('{0}--(show|hide)(--)?(next|prev|init)?(--)?(\\d+)?', this.options.itemClass), 'g');
        this.elementClassTemplate = Rider.format('{0}--page-count--{total} {0}--current-page--{current} {0}--visible-count--{visible}', this.options.blockClass);
        this.elementClassRemovePattern = new RegExp( Rider.format('{0}--(page-count|current-page|visible-count)(--\\d+)?', this.options.blockClass), 'g');

        this.sliding = null;
        this.animationEvents = Rider.getAnimationEvents();

        this.render(null, null, 'init');
        Rider.on(global, 'RiderResize', this.resize.bind(this));

        // animations
        this.hasAnimation = false;
        Rider.on(this.element, this.animationEvents.start, this.animationStart.bind(this));
        Rider.on(this.element, this.animationEvents.end, this.animationEnd.bind(this));

        // init plugins
        this.plugins = {};
        this.initPlugins();
    };

    // prototype
    Rider.prototype = {
        resize: function(e) {
            this.render();
        },

        render: function(outItems, nextItems, direction) {
            var that = this;
            this.calculateValues();
            direction = direction || 'next';
            nextItems = nextItems || this.visibleItems;
            if(outItems) {
                this.hide(outItems, direction);
            } else {
                this.reset();
            }
            if(nextItems) this.show(nextItems, direction);

            this.calculateValues();
            this.outItems = outItems;
            this.nextItems = nextItems;
            this.direction = direction;

            Rider.removeClass(this.element, this.elementClassRemovePattern);
            Rider.addClass(this.element, Rider.format(this.elementClassTemplate, {
                total: this.pageCount,
                current: this.currentPage,
                visible: this.visibleCount
            }));

            setTimeout(function(){
                that.onRender();
            }, 0);
        },

        runCallback: function (eventName) {
            var eventKey = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
            if( Rider.isFunction(this.options[eventKey]) ) {
                this.options[eventKey].call(this);
            }

            var event = this.getCustomEvent(eventName);
            if(event) this.element.dispatchEvent( event );
        },

        on: function (eventName, callback) {
            Rider.on(this.element, eventName, callback);
        },

        off: function (eventName, callback) {
            Rider.on(this.element, eventName, callback);
        },

        setCustomEvent: function (eventName) {
            this.events[eventName] = new CustomEvent(eventName, {
                detail: {
                    rider: this
                },
                bubbles: true,
                cancelable: true
            });
        },

        getCustomEvent: function (eventName) {
            // if(eventName in this.events) {
            if(eventName in this.events && this.events[eventName]) {
                this.events[eventName].detail.rider = this;
            } else {
                this.setCustomEvent(eventName);
            }

            return this.events[eventName];
        },

        show: function (items, direction) {
            this.update(items, 'show', direction);
        },

        hide: function (items, direction) {
            this.reset();
            if(direction && this.options.reverseHideDirection) direction = direction === 'prev' ? 'next' : 'prev';
            this.update(items, 'hide', direction);
        },

        reset: function () {
            var that = this;
            this.items.forEach(function(item){
                Rider.removeClass(item, that.itemClassRemovePattern);
            });
        },

        update: function (items, status, direction) {
            var that = this;
            items.forEach(function(item, index){
                Rider.addClass(item, Rider.format(that.itemClassTemplate, {
                    status: status,
                    direction: direction || 'next',
                    index: index + 1
                }));
            });
        },

        animationStart: function (e) {
            if(!this.hasAnimation) {
                this.hasAnimation = true;
            }
        },

        animationEnd: function (e) {
            if(this.sliding && ( Rider.hasClass(e.target, this.options.itemClass + '--show') || Rider.hasClass(e.target, this.options.itemClass + '--hide') )) {
                this.onEnd();
            }
        },

        onRender: function () {
            this.runCallback('render');
            if(this.sliding && !this.hasAnimation){
                this.onEnd();
            }
        },

        onStart: function () {
            this.sliding = true;
            this.runCallback('start');
        },

        onEnd: function () {
            this.sliding = false;
            this.runCallback('end');
        },

        calculateValues: function () {
            this.itemCount = this.items.length;
            this.visibleCount = this.getVisibleCount();
            this.visibleItems = Rider.$$( Rider.format('.{0}--show', this.options.itemClass) );
            if(this.visibleItems.length === 0) {
                this.visibleItems = this.items.slice(0, this.visibleCount);
                this.show(this.visibleItems, 'next');
            }
            this.pageCount = Math.ceil(this.itemCount / this.visibleCount);
            this.firstVisibleIndex = parseInt(this.visibleItems[0].getAttribute('data-rider-index'));
            this.currentPage = Math.ceil(this.firstVisibleIndex / this.visibleCount) + 1;
            if (this.visibleItems.length !== this.visibleCount){
                this.visibleItems = this.items.slice(this.firstVisibleIndex, this.visibleCount);
                this.reset();
                this.show(this.visibleItems, 'next');
            }
        },

        getNextItemsForDirection: function(direction, page){
            this.calculateValues();
            if(this.pageCount === 1){
                return this.$item;
            }
            var nextItems;
            var delta = direction == 'prev' ? -1 : 1;
            page = page ? parseInt(page) : false;
            var itemIndex = page ? (direction == 'next' ? page - 2 : page) * this.visibleCount : this.firstVisibleIndex;
            var start = itemIndex + delta * this.visibleCount;
            page = page ? (page - delta) : this.currentPage;
            if (direction === 'prev' && page === this.pageCount) {
                start = this.visibleCount * (page - 2);
            }
            nextItems = this.items.slice(start, start + this.visibleCount);
            if ((direction === 'next' && page === this.pageCount) || (direction === 'prev' && page === 2)) {
                nextItems = this.items.slice(0, this.visibleCount);
            }
            if ((direction === 'next' && page === this.pageCount - 1) || (direction === 'prev' && page === 1)) {
                nextItems = this.items.slice(-this.visibleCount);
            }
            return nextItems;
        },

        getVisibleCount: function(){
            if(Rider.isFunction( this.options.visibleCount )){
                return this.options.visibleCount.call(this);
            }

            return parseInt(this.options.visibleCount);
        },

        slide: function(to){
            if (this.sliding) return;
            this.onStart();
            this.calculateValues();
            var outItems;
            var nextItems;
            var direction;
            if(to === 'next' || to === 'prev') {
                direction = to;
                nextItems = this.getNextItemsForDirection(to);
            } else {
                direction = to > this.currentPage ? 'next' : 'prev';
                nextItems = this.getNextItemsForDirection(direction, to);
            }

            outItems = Rider.arrayDiff(this.visibleItems, nextItems);
            this.render(outItems, nextItems, direction);
        },

        next: function(){
            return this.slide('next');
        },

        prev: function(){
            return this.slide('prev');
        },

        initPlugins: function(){
            var that = this;
            Rider.each(Rider.plugins, function(plugin){
                if(!Rider.isFunction(plugin) || !plugin.key) return;

                // Set plugin for using via Rider instance
                that.plugins[plugin.key] = function(){
                    plugin.apply(that, [that].concat(Array.prototype.slice.call(arguments)));
                };

                // Run plugin via options if exists
                if(Rider.isObject(that.options.plugins) && Rider.isArray(that.options.plugins[plugin.key])) {
                    that.plugins[plugin.key].apply(that, that.options.plugins[plugin.key]);
                }
            });
        }
    };


    // helper functions
    Rider.error = function(error){
        throw new Error(error);
    };

    Rider.on = function (selector, eventName, callback) {
        Rider.each(selector, function(el, index){
            el.addEventListener(eventName, callback, false);
        });
    };

    Rider.off = function (selector, eventName, callback) {
        Rider.each(selector, function(el, index){
            el.removeEventListener(eventName, callback, false);
        });
    };

    Rider.addClass = function(selector, className){
        Rider.each(selector, function(el){
            el.className = (el.className + ' ' + className).trim();
        });
    };

    Rider.removeClass = function(selector, className){
        Rider.each(selector, function(el){
            el.className = el.className.replace(className, '').replace(/\s\s+/g, ' ').trim();
        });
    };

    Rider.hasClass = function(element, className){
        if (!element) { return; }
        if (element.classList){
            return element.classList.contains(className);
        }
        return new RegExp('(^| )' + className + '( |$)', 'gi').test(element.className);
    };

    Rider.isString = function (any) {
        return typeof any === 'string';
    };

    Rider.isArray = function (any) {
        return Array.isArray(any);
    };

    Rider.isObject = function (any) {
        return Object.prototype.toString.call(any) === '[object Object]';
    };

    Rider.isFunction = function(any){
        return any && Object.prototype.toString.call(any) === '[object Function]';
    };

    Rider.template =  function (template, info) {
        if (Rider.isString(template)) {
            var result = template;
            if(Rider.isObject(info)) {
                for (var key in info) {
                    var val = info[key];
                    result = result.split('{' + key + '}').join(val === null ? '' : val);
                }
            } else {
                var args = Array.prototype.slice.call(arguments, 1);
                result = result.replace(/{(\d+)}/g, function(match, number) {
                    return typeof args[number] !== 'undefined' ? args[number] : match;
                });
            }
            return result;
        } else return template(info);
    };

    Rider.format = function(){
        return Rider.template.apply(Rider, arguments);
    };

    Rider.extend = function(defaults, options){
        var extended = {};
        var key;
        for (key in defaults) { extended[key] = defaults[key]; }
        for (key in options) { extended[key] = options[key]; }
        return extended;
    };

    Rider.$ = function(selector, parent){
        if(!selector) return null;
        if(Rider.isString(selector)) return (parent || document).querySelector(selector);
        return selector;
    };

    Rider.$$ = function(selector, parent){
        if(!selector) return [];
        if(Rider.isString(selector)) return Array.prototype.slice.call((parent || document).querySelectorAll(selector));
        return Rider.isArray(selector) ? selector : [selector];
    };

    Rider.each = function (selector, callback) {
        if(!selector || !Rider.isFunction(callback)) return false;
        Rider.$$(selector).forEach(function(el, index){
            callback.apply(el, [el, index]);
        });
    };

    Rider.index = function (node, parent) {
        if(!node) return null;
        if(Rider.isString(node)) node = (parent || document).querySelector(node);
        return node ? Array.prototype.indexOf.call(node.parentNode.children, node) : null;
    };

    Rider.arrayDiff = function(a, b){
        return a.filter(function(i) {return b.indexOf(i) < 0;});
    };

    // Rider.getTransitionEndEvent = function(){
    //     var t;
    //     var el = document.createElement("rider");
    //     var transitions = {
    //         "transition"      : "transitionend",
    //         "OTransition"     : "oTransitionEnd",
    //         "MozTransition"   : "transitionend",
    //         "WebkitTransition": "webkitTransitionEnd"
    //     };
    //     for (t in transitions){
    //         if (el.style[t] !== undefined){
    //             return transitions[t];
    //         }
    //     }
    // };

    Rider.getAnimationEvents = function(){
        var t,
            animations = {},
            el = document.createElement("rider");

        var startAnimations = {
            "animation"      : "animationstart",
            "OAnimation"     : "oAnimationStart",
            "MozAnimation"   : "animationstart",
            "WebkitAnimation": "webkitAnimationStart"
        };

        var endAnimations = {
            "animation"      : "animationend",
            "OAnimation"     : "oAnimationEnd",
            "MozAnimation"   : "animationend",
            "WebkitAnimation": "webkitAnimationEnd"
        };

        for (t in startAnimations){
            if (el.style[t] !== undefined){
                animations.start = startAnimations[t];
                break;
            }
        }

        for (t in endAnimations){
            if (el.style[t] !== undefined){
                animations.end = endAnimations[t];
                break;
            }
        }

        return animations;
    };

    Rider.throttle = function(type, name, obj) {
        obj = obj || window;
        var running = false;
        var func = function() {
            if (running) { return; }
            running = true;
            requestAnimationFrame(function() {
                obj.dispatchEvent(new CustomEvent(name));
                running = false;
            });
        };
        Rider.on(obj, type, func);
    };

    // init RiderResize event
    Rider.throttle("resize", "RiderResize");

    // plugins
    Rider.plugins = [];
    Rider.addPlugin = function (key, Plugin) {
        Plugin.key = key;
        Rider[key] = Plugin;
        Rider.plugins.push(Rider[key]);
    };

    // returns version of IE or false, if browser is not Internet Explorer
    Rider.detectIE = function () {
        var ua = window.navigator.userAgent;

        // Test values; Uncomment to check result …

        // IE 10
        // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';

        // IE 11
        // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';

        // Edge 12 (Spartan)
        // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';

        // Edge 13
        // ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';

        var msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        }

        var trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            var rv = ua.indexOf('rv:');
            return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }

        var edge = ua.indexOf('Edge/');
        if (edge > 0) {
            // Edge (IE 12+) => return version number
            return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
        }

        // other browser
        return false;
    };

    if(Rider.detectIE()){
        // Pollyfill for CustomEvent() Constructor - thanks to Internet Explorer
        // https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent#Polyfill
        var CustomEvent = function (event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        CustomEvent.prototype = global.CustomEvent ? global.CustomEvent.prototype : {};
        global.CustomEvent = CustomEvent;
    }

    global.Rider = Rider;

})(this);
