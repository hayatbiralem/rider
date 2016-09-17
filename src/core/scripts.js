// RiderHelper
(function(global){
    'use strict';

    global.RiderHelper = {

        addClass: function(element, className){
            if (!element) { return; }
            element.className = (element.className + ' ' + className).trim();
        },

        removeClass: function(element, className){
            if (!element) { return; }
            element.className = element.className.replace(className, '').replace(/\s\s+/g, ' ').trim();
        },

        hasClass: function(element, className){
            if (!element) { return; }
            if (element.classList){
                return element.classList.contains(className);
            }
            return new RegExp('(^| )' + className + '( |$)', 'gi').test(element.className);
        },

        isEmptyObject:  function (obj) {
            var name;
            for ( name in obj ) {
                return false;
            }
            return true;
        },

        isArray:  function (any) {
            return Array.isArray(any);
        },

        isObject:  function (any) {
            return Object.prototype.toString.call(any) === '[object Object]';
        },

        isFunction: function(any){
            return any && Object.prototype.toString.call(any) === '[object Function]';
        },

        template:  function (template, info) {
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
        },

        format: function(){
            return this.template.apply(this, arguments);
        },

        extend: function(defaults, options){
            var extended = {};
            var key;
            for (key in defaults) { extended[key] = defaults[key]; }
            for (key in options) { extended[key] = options[key]; }
            return extended;
        },

        $: function(selector, parent){
            return Array.prototype.slice.call((parent || document).querySelectorAll(selector));
        },

        arrayDiff: function(a, b){
            return a.filter(function(i) {return b.indexOf(i) < 0;});
        },

        // getTransitionEndEvent: function(){
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
        // },

        getAnimationEndEvent: function(){
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
        },

        // Source: http://stackoverflow.com/a/2970667/1227926
        camelize: function(str) {
            return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
                if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
                return index == 0 ? match.toLowerCase() : match.toUpperCase();
            });
        }
    };

})(this);

// RiderResize
(function() {
    var throttle = function(type, name, obj) {
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
        obj.addEventListener(type, func);
    };

    /* init - you can init any event */
    throttle("resize", "RiderResize");
})();

// RiderData (taken from jQuery)
(function(global, helper){
    var rnotwhite = ( /\S+/g );
    var rmsPrefix = /^-ms-/;
    var rdashAlpha = /-([a-z])/g;
    var fcamelCase = function( all, letter ) {
        return letter.toUpperCase();
    };

    function RiderData() {
        this.expando = 'RiderData' + RiderData.uid++;
    }

    function acceptData(owner) {
        return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
    }

    function camelCase(string) {
        return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
    }

    RiderData.uid = 1;

    RiderData.prototype = {

        cache: function( owner ) {
            var value = owner[ this.expando ];
            if ( !value ) {
                value = {};
                if ( acceptData( owner ) ) {
                    if ( owner.nodeType ) {
                        owner[ this.expando ] = value;
                    } else {
                        Object.defineProperty( owner, this.expando, {
                            value: value,
                            configurable: true
                        } );
                    }
                }
            }
            return value;
        },
        set: function( owner, data, value ) {
            var prop,
                cache = this.cache( owner );
            if ( typeof data === "string" ) {
                cache[ camelCase( data ) ] = value;
            } else {
                for ( prop in data ) {
                    cache[ camelCase( prop ) ] = data[ prop ];
                }
            }
            return cache;
        },
        get: function( owner, key ) {
            return key === undefined ?
                this.cache( owner ) :
            owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
        },
        access: function( owner, key, value ) {
            if ( key === undefined ||
                ( ( key && typeof key === "string" ) && value === undefined ) ) {

                return this.get( owner, key );
            }
            this.set( owner, key, value );
            return value !== undefined ? value : key;
        },
        remove: function( owner, key ) {
            var i,
                cache = owner[ this.expando ];

            if ( cache === undefined ) {
                return;
            }

            if ( key !== undefined ) {
                if ( helper.isArray( key ) ) {
                    key = key.map( camelCase );
                } else {
                    key = camelCase( key );
                    key = key in cache ?
                        [ key ] :
                        ( key.match( rnotwhite ) || [] );
                }

                i = key.length;

                while ( i-- ) {
                    delete cache[ key[ i ] ];
                }
            }

            if ( key === undefined || helper.isEmptyObject( cache ) ) {
                if ( owner.nodeType ) {
                    owner[ this.expando ] = undefined;
                } else {
                    delete owner[ this.expando ];
                }
            }
        },
        hasData: function( owner ) {
            var cache = owner[ this.expando ];
            return cache !== undefined && !helper.isEmptyObject( cache );
        }
    };

    global.RiderData = RiderData;

    helper.data = new RiderData();
})(this, RiderHelper);

// Rider
(function(global, helper){
    'use strict';

    var Rider = function(element, options){
        this.options = helper.extend({
            blockClass: 'rider',
            itemClass: 'rider__item',
            visibleCount: 1,
            page: 1,
            reverseHideDirection: false
        }, options || {});

        this.events = {};

        this.element = element;
        this.items = helper.$( helper.format('.{0}', this.options.itemClass), element );
        this.items.forEach(function(item, index){
            item.setAttribute('data-rider-index', index.toString());
        });
        this.itemClassTemplate = '{item}--{status} {item}--{status}--{index} {item}--{status}--{direction} {item}--{status}--{direction}--{index}';
        this.itemClassRemovePattern = new RegExp( helper.format('{0}--(show|hide)(--)?(next|prev|init)?(--)?(\\d+)?', this.options.itemClass), 'g');
        this.elementClassTemplate = '{element}--page-count--{total} {element}--current-page--{current} {element}--visible-count--{visible}';
        this.elementClassRemovePattern = new RegExp( helper.format('{0}--(page-count|current-page|visible-count)(--\\d+)?', this.options.blockClass), 'g');

        this.sliding = null;
        this.animationEndEvent = helper.getAnimationEndEvent();

        this.render(null, null, 'init');
        global.addEventListener("RiderResize", this.resize.bind(this));

        this.element.addEventListener(this.animationEndEvent, this.animationEnd.bind(this));
    };

    Rider.prototype.resize = function(e) {
        this.render();
    };

    Rider.prototype.render = function(outItems, nextItems, direction) {
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
        helper.removeClass(this.element, this.elementClassRemovePattern);
        helper.addClass(this.element, helper.format(this.elementClassTemplate, {
            element: this.options.blockClass,
            total: this.pageCount,
            current: this.currentPage,
            visible: this.visibleCount
        }));

        setTimeout(function(){
            that.onRender();
        }, 0);
    };

    Rider.prototype.runCallback = function (eventName) {
        var eventKey = helper.camelize('on ' + eventName);
        if( helper.isFunction(this.options[eventKey]) ) {
            this.options[eventKey].call(this);
        }

        this.element.dispatchEvent( this.getCustomEvent(eventName) );
    };

    Rider.prototype.on = function (eventName, callback) {
        this.element.addEventListener(eventName, callback, false);
    };

    Rider.prototype.off = function (eventName, callback) {
        this.element.removeEventListener(eventName, callback, false);
    };

    Rider.prototype.setCustomEvent = function (eventName) {
        var that = this;
        this.events[eventName] = new CustomEvent(eventName, {
            detail: {
                rider: that
            },
            bubbles: true,
            cancelable: true
        });
    };

    Rider.prototype.getCustomEvent = function (eventName) {
        if(eventName in this.events) {
            this.events[eventName].detail.rider = this;
        } else {
            this.setCustomEvent(eventName);
        }

        return this.events[eventName];
    };

    Rider.prototype.show = function (items, direction) {
        this.update(items, 'show', direction);
    };

    Rider.prototype.hide = function (items, direction) {
        this.reset();
        if(direction && this.options.reverseHideDirection) direction = direction === 'prev' ? 'next' : 'prev';
        this.update(items, 'hide', direction);
    };

    Rider.prototype.reset = function () {
        var that = this;
        this.items.forEach(function(item){
            helper.removeClass(item, that.itemClassRemovePattern);
        });
    };

    Rider.prototype.update = function (items, status, direction) {
        var that = this;
        items.forEach(function(item, index){
            helper.addClass(item, helper.format(that.itemClassTemplate, {
                item: that.options.itemClass,
                status: status,
                direction: direction || 'next',
                index: index + 1
            }));
        });
    };

    Rider.prototype.animationEnd = function (e) {
        if(helper.hasClass(e.target, helper.format('{0}--show--1', this.options.itemClass))) {
            this.onEnd();
        }
    };

    Rider.prototype.onRender = function () {
        this.runCallback('render');
    };

    Rider.prototype.onStart = function () {
        this.sliding = true;
        this.runCallback('start');
    };

    Rider.prototype.onEnd = function () {
        this.sliding = false;
        this.runCallback('end');
    };

    Rider.prototype.calculateValues = function () {
        this.itemCount = this.items.length;
        this.visibleCount = this.getVisibleCount();
        this.visibleItems = helper.$( helper.format('.{0}--show', this.options.itemClass) );
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
    };

    Rider.prototype.getNextItemsForDirection = function(direction, page){
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
    };

    Rider.prototype.getVisibleCount = function(){
        if(helper.isFunction( this.options.visibleCount )){
            return this.options.visibleCount.call(this);
        }

        return parseInt(this.options.visibleCount);
    };

    Rider.prototype.getDomArray = function(selector, parent){
        return Array.prototype.slice.call((parent || this.element).querySelectorAll(selector));
    };

    Rider.prototype.slide = function(to){
        if (this.sliding) return;
        this.onStart();
        this.calculateValues();
        var outItems;
        var nextItems;
        var direction;
        switch(to){
            case 'next':
            case 'prev':
                direction = to;
                nextItems = this.getNextItemsForDirection(to);
                break;
            default:
                direction = to > this.currentPage ? 'next' : 'prev';
                nextItems = this.getNextItemsForDirection(direction, to);
                break;
        }

        outItems = helper.arrayDiff(this.visibleItems, nextItems);
        this.render(outItems, nextItems, direction);
    };

    Rider.prototype.next = function(){
        return this.slide('next');
    };

    Rider.prototype.prev = function(){
        return this.slide('prev');
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

})(this, RiderHelper);
