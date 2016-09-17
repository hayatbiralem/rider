// Rider
(function(global){
    'use strict';

    var Rider = function(element, options){
        if(!element) Rider.error('Missing selector.');

        for (var i = 0; i < elementPool.length; i++) {
            if (elementPool[i] === element) {
                Rider.error('An instance of Rider with this selector already exists.');
            }
        }
        elementPool.push(element);

        this.options = Rider.extend({
            blockClass: 'rider',
            itemClass: 'rider__item',
            visibleCount: 1,
            page: 1,
            reverseHideDirection: false
        }, options || {});

        this.events = {};

        this.element = element;
        this.items = Rider.$('.' + this.options.itemClass, element);
        this.items.forEach(function(item, index){
            item.setAttribute('data-rider-index', index.toString());
        });
        this.itemClassTemplate = Rider.format('{0}--{status} {0}--{status}--{index} {0}--{status}--{direction} {0}--{status}--{direction}--{index}', this.options.itemClass);
        this.itemClassRemovePattern = new RegExp( Rider.format('{0}--(show|hide)(--)?(next|prev|init)?(--)?(\\d+)?', this.options.itemClass), 'g');
        this.elementClassTemplate = Rider.format('{0}--page-count--{total} {0}--current-page--{current} {0}--visible-count--{visible}', this.options.blockClass);
        this.elementClassRemovePattern = new RegExp( Rider.format('{0}--(page-count|current-page|visible-count)(--\\d+)?', this.options.blockClass), 'g');

        this.sliding = null;
        this.animationEndEvent = Rider.getAnimationEndEvent();

        this.render(null, null, 'init');
        Rider.on(global, 'RiderResize', this.resize.bind(this));
        Rider.on(this.element, this.animationEndEvent, this.animationEnd.bind(this));
    };

    Rider.error = function(error){
        throw new Error(error);
    };

    Rider.on = function (element, eventName, callback) {
        if(element) element.addEventListener(eventName, callback, false);
    };

    Rider.off = function (element, eventName, callback) {
        if(element) element.removeEventListener(eventName, callback, false);
    };


    Rider.addClass = function(element, className){
        if (!element) { return; }
        element.className = (element.className + ' ' + className).trim();
    };

    Rider.removeClass = function(element, className){
        if (!element) { return; }
        element.className = element.className.replace(className, '').replace(/\s\s+/g, ' ').trim();
    };

    Rider.hasClass = function(element, className){
        if (!element) { return; }
        if (element.classList){
            return element.classList.contains(className);
        }
        return new RegExp('(^| )' + className + '( |$)', 'gi').test(element.className);
    };

    Rider.isObject = function (any) {
        return Object.prototype.toString.call(any) === '[object Object]';
    };

    Rider.isFunction = function(any){
        return any && Object.prototype.toString.call(any) === '[object Function]';
    };

    Rider.template =  function (template, info) {
        if (typeof template === "string") {
            var result = template;
            if(this.isObject(info)) {
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
        return Array.prototype.slice.call((parent || document).querySelectorAll(selector));
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

    Rider.getAnimationEndEvent = function(){
        var t,
            el = document.createElement("rider");
        var animations = {
            "animation"      : "animationend",
            "OAnimation"     : "oAnimationEnd",
            "MozAnimation"   : "animationend",
            "WebkitAnimation": "webkitAnimationEnd"
        };
        for (t in animations){
            if (el.style[t] !== undefined){
                return animations[t];
            }
        }
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

    var elementPool = [];

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

            this.element.dispatchEvent( this.getCustomEvent(eventName) );
        },

        on: function (eventName, callback) {
            Rider.on(this.element, eventName, callback);
        },

        off: function (eventName, callback) {
            Rider.on(this.element, eventName, callback);
        },

        setCustomEvent: function (eventName) {
            var that = this;
            this.events[eventName] = new CustomEvent(eventName, {
                detail: {
                    rider: that
                },
                bubbles: true,
                cancelable: true
            });
        },

        getCustomEvent: function (eventName) {
            if(eventName in this.events) {
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

        animationEnd: function (e) {
            if(this.sliding && ( Rider.hasClass(e.target, this.options.itemClass + '--show') || Rider.hasClass(e.target, this.options.itemClass + '--hide') )) {
                this.onEnd();
            }
        },

        onRender: function () {
            this.runCallback('render');
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
            this.visibleItems = Rider.$( Rider.format('.{0}--show', this.options.itemClass) );
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
        }
    };

    // Exports to multiple environments
    if(typeof define === 'function' && define.amd){
        // AMD
        define(function () { return Rider; });
    } else if (typeof module !== 'undefined' && module.exports){
        // Node
        module.exports = Rider;
    } else {
        // Browser
        global.Rider = Rider;
    }

})(this);
