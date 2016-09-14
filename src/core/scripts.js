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

        resize: function(){

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

// Rider
(function(global, helper){
    'use strict';

    var Rider = function(element, options){
        this.options = helper.extend({
            itemClass: 'item',
            visibleCount: 1,
            page: 1
        }, options || {});

        this.element = element;
        this.items = helper.$( helper.format('.{0}', this.options.itemClass), element );
        this.items.forEach(function(item, index){
            item.setAttribute('data-rider-index', index.toString());
        });
        this.classTemplate = '{item}--{status} {item}--{status}--{index} {item}--{status}--{direction} {item}--{status}--{direction}--{index}';
        this.removePattern = new RegExp( helper.format('item--(show|hide)-?-?(next|prev)?-?-?(\\d+)?', this.options.itemClass), 'g');

        this.calculateValues();
        this.reset();
        this.show(this.visibleItems, 'next');

        this.sliding = null;

        global.addEventListener("RiderResize", this.render.bind(this));
    };

    Rider.prototype.render = function() {
        console.log('render');
        this.calculateValues();
        this.reset();
        this.show(this.visibleItems);
    };

    Rider.prototype.show = function (items, direction) {
        this.update(items, 'show', direction);
    };

    Rider.prototype.hide = function (items, direction) {
        this.reset();
        this.update(items, 'hide', direction);
    };

    Rider.prototype.reset = function () {
        var that = this;
        this.items.forEach(function(item){
            helper.removeClass(item, that.removePattern);
        });
    };

    Rider.prototype.update = function (items, status, direction) {
        var that = this;
        items.forEach(function(item, index){
            helper.addClass(item, helper.format(that.classTemplate, {
                item: that.options.itemClass,
                status: status,
                direction: direction,
                index: index + 1
            }));
        });
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
        this.calculateValues();
        var nextItems;
        var inItems;
        var outItems;
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
        inItems = helper.arrayDiff(this.visibleItems, outItems);

        this.hide(outItems, direction);
        this.show(nextItems, direction);
        this.calculateValues();
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

var rider = new Rider(
    document.querySelector('.items'),
    {
        visibleCount: function(){
            var bodyWidth = document.body.offsetWidth;
            var count = 5;
            if(bodyWidth < 1200) count = 4;
            if(bodyWidth < 992) count = 3;
            if(bodyWidth < 768) count = 2;
            return count;
        }
    }
);

document.querySelector('.arrow--prev').addEventListener("click", function(e) {
    rider.prev();
});

document.querySelector('.arrow--next').addEventListener("click", function(e) {
    rider.next();
});

var dots = Array.prototype.slice.call(document.querySelectorAll('.dot'));
dots.forEach(function (el, index) {
    el.addEventListener('click', function() {
        rider.slide(index + 1);
    });
});
