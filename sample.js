/* ========================================================================
 * hero-carousel.js v0.6
 * ========================================================================
 * Copyright 2011-2015 Ömür Yanıkoğlu
 * Licensed under MIT
 * Inspired by carousel.js v3.3.6 from Bootstrap
 * ======================================================================== */

+function ($) {
    'use strict';

    var dynamicCarouselIndex = 0;

    // CAROUSEL CLASS DEFINITION
    // =========================

    var Carousel = function (element, options) {
        this.init(element, options)
    }

    Carousel.prototype.init = function (element, options) {
        var that = this;

        this.$element = $(element)
        this.$parent = this.$element.parent()
        this.id = this.$element.attr('id') || this.$element.attr('id', 'dynamic-carousel-' + ++dynamicCarouselIndex).attr('id');
        this.$indicators = this.$element.find('>.carousel__indicators')
        // this.$container  = this.$element.find('>.carousel__container'); // never used
        this.$inner = this.$element.find('>.carousel__container>.carousel__inner');
        this.$items = this.$element.find('>.carousel__container>.carousel__inner>.carousel__items');
        this.$item = this.$element.find('>.carousel__container>.carousel__inner>.carousel__items>.carousel__item');
        this.options = options
        this.paused = null
        this.sliding = null
        this.interval = null
        this.$active = null
        this.removeRegex = /carousel__item--(stay|in|out|active|next|prev|left|right|before|after)-?\d?\d?/g;
        this.removeRegexForCarousel = /carousel--(page-count|current-page|row-count|col-count)--\d?\d?/g;
        this.cssJson = {
            items: {}
        };
        this.options.keyboard && this.$element.on('keydown.bs.carousel', $.proxy(this.keydown, this))

        this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
            .on('mouseenter.bs.carousel', $.proxy(this.pause, this))
            .on('mouseleave.bs.carousel', $.proxy(this.cycle, this))

        this.update()

        $(window).on('debouncedresize', function () {
            var update = function () {
                that.calculateValues()
                if (that.pageCount !== that.$indicators.find('.carousel__indicator').length) {
                    that.update()
                }
            }
            if ($.support.transition) {
                that.$items
                    .one('bsTransitionEnd', function () {
                        update();
                    })
                    .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
            } else {
                update();
            }
        })

        // Swipe gestures
        if (Hammer && Modernizr && Modernizr.touch) {
            var mc = new Hammer(element);
            // mc.get('swipe').set({ velocity: 0.80});
            mc.on("swipeleft swiperight", function (ev) {
                that.slide(ev.type === 'swipeleft' ? 'next' : 'prev');
            });
        }
    }

    Carousel.VERSION = '0.6'

    Carousel.TRANSITION_DURATION = 600
    // Carousel.TRANSITION_DURATION = 10000

    Carousel.DEFAULTS = {
        interval: 5000,
        pause: 'hover',
        wrap: true,
        keyboard: true
    }

    Carousel.prototype.keydown = function (e) {
        if (/input|textarea/i.test(e.target.tagName)) return
        switch (e.which) {
            case 37:
                this.prev();
                break
            case 39:
                this.next();
                break
            default:
                return
        }

        e.preventDefault()
    }

    // debulked onresize handler
    Carousel.prototype.onResize = function (c, t) {
        onresize = function () {
            clearTimeout(t);
            t = setTimeout(c, 100)
        };
        return c
    };

    Carousel.prototype.getCssJson = function (selector){
        var style = null;
        var $el = $(selector);
        if($el.length > 0){
            if ( window.getComputedStyle && window.getComputedStyle($el[0], '::before') ) {
                style = window.getComputedStyle($el[0], '::before');
                style = style.content;
            }
        }

        // remove quotes
        if (typeof style === 'string' || style instanceof String) {
            style = style.replace(/^['"]+|\s+|\\|(;\s?})+|['"]$/g, '');
        }

        // return
        return style ? JSON.parse( style ) : null;
    };

    Carousel.prototype.updateIndicators = function () {
        this.calculateValues();
        var indicatorType = typeof this.$element.data('indicators') === 'string' ? this.$element.data('indicators') : '';
        var indicatorsNeeded = (this.$indicators.length > 0 || this.$element.data('indicators') ) && this.pageCount > 1 ? true : false;
        this.$element.toggleClass('carousel--has-indicators', indicatorsNeeded);
        if (indicatorsNeeded) {
            if (this.$indicators.length === 0) this.$indicators = $('<ol class="carousel__indicators" />').appendTo(this.$element);
            (indicatorType.length > 0) && this.$indicators.addClass('carousel__indicators--' + indicatorType);
            if (this.$indicators.find('.carousel__indicator').length !== this.pageCount) {
                var indicators = [];
                for (var i = 0; i < this.pageCount; i++) {
                    indicators.push('<li class="carousel__indicator' + (i === this.currentPage - 1 ? ' carousel__indicator--active' : '') + '" data-target="#' + this.id + '" data-slide-to="' + (i + 1) + '"></li>');
                }
                this.$indicators.html(indicators.join(''));
            } else {
                this.$indicators.find('.carousel__indicator').removeClass('carousel__indicator--active').eq(0).addClass('carousel__indicator--active');
            }
        } else {
            if (this.$indicators.length > 0) this.$indicators.remove();
        }
    }

    Carousel.prototype.updateArrows = function () {
        this.calculateValues();
        var arrowsNeeded = this.$element.data('arrows') && this.pageCount > 1 ? true : false;

        $('.carousel__arrow')
            .filter('[data-target="' + this.id + '"]')
            .toggleClass('carousel__arrow--show', arrowsNeeded);
    }

    Carousel.prototype.updateClasses = function () {
        var that = this;
        this.calculateValues();

        var $activeItems = this.getActiveItems();
        if ($activeItems.length === 0) {
            $activeItems = this.$item.slice(0, this.visibleItemCount);
        }

        this.$item.removeClass(function (idx, cls) {
            var res = cls.match(that.removeRegex);
            return res && res.length > 0 ? res.join(' ') : '';
        });

        $activeItems.each(function (index) {
            $(this).addClass('carousel__item--active carousel__item--active-' + (index + 1));
        });

        if (this.$parent.is('.tabs__contents')) {
            this.calculateValues();
            this.$parent.closest('.tabs').find('.tabs__item')
                .removeClass('tabs__item--active')
                .eq(this.currentPage - 1)
                .addClass('tabs__item--active');
        }

        that.addHelpers()

        // update carousel classes
        this.updateCarouselClasses();
    }

    Carousel.prototype.updateCarouselClasses = function () {
        var that = this;
        if (this.$element.is(':visible')) {
            var $activeItems = this.getActiveItems();
            if ($activeItems.length === 0) {
                $activeItems = this.$item.slice(0, this.visibleItemCount);
            }
            this.$element
                .removeClass(function (idx, cls) {
                    var res = cls.match(that.removeRegexForCarousel);
                    return res && res.length > 0 ? res.join(' ') : '';
                })
                .addClass('carousel--page-count--' + this.pageCount)
                .addClass('carousel--current-page--' + this.currentPage)
                .addClass('carousel--col-count--' + this.colCount)
                .addClass('carousel--row-count--' + this.rowCount)
                // Show 2 or more rows by adding some padding to carousel element
                .css({
                    paddingBottom: ($activeItems.eq(0).outerHeight() * (this.rowCount - 1)) + "px"
                })
            ;
        }
    }

    Carousel.prototype.update = function () {
        if (this.$element.is(':visible')) {
            this.updateClasses()
            this.updateIndicators()
            this.updateArrows()
        }
    }

    Carousel.prototype.cycle = function (e) {
        e || (this.paused = false)

        this.interval && clearInterval(this.interval)

        this.options.interval
        && !this.paused
        && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

        return this
    }

    Carousel.prototype.calculateValues = function () {
        this.cssJson.items = this.getCssJson(this.$items);
        if(this.cssJson.items && "colCount" in this.cssJson.items) {
            this.colCount = parseInt(this.cssJson.items.colCount);
            this.rowCount = parseInt(this.cssJson.items.rowCount);
        } else {
            // fallback for not supported css json (IE8-)
            this.colCount = Math.round(this.$inner.width() / this.$items.width());
            this.rowCount = 1;
        }
        this.visibleItemCount = this.colCount * this.rowCount;

        this.pageCount = Math.ceil(this.$item.length / this.visibleItemCount);
        this.$firstActive = this.$items.find('>.carousel__item--active-1');
        this.firstActiveIndex = this.$firstActive.index();
        this.currentPage = Math.ceil(this.firstActiveIndex / this.visibleItemCount) + 1;
    }

    Carousel.prototype.getNextItemsForDirection = function (direction, page) {
        this.calculateValues()
        if(this.pageCount === 1){
            return this.$item;
        }
        var $next
        var delta = direction == 'prev' ? -1 : 1
        page = page ? parseInt(page) : false;
        var itemIndex = page ? (direction == 'next' ? page - 2 : page) * this.visibleItemCount : this.firstActiveIndex;
        var start = itemIndex + delta * this.visibleItemCount;
        $next = this.$item.slice(start, start + this.visibleItemCount);

        page = page ? (page - delta) : this.currentPage;
        if ((direction === 'next' && page === this.pageCount) || (direction === 'prev' && page === 2)) {
            $next = this.$item.slice(0, this.visibleItemCount)
        }
        if ((direction === 'next' && page === this.pageCount - 1) || (direction === 'prev' && page === 1)) {
            $next = this.$item.slice(-this.visibleItemCount);
        }
        return $next;
    }

    Carousel.prototype.getActiveItems = function (direction) {
        this.calculateValues()
        if(this.pageCount === 1){
            return this.$item;
        }
        return this.$item.slice(this.firstActiveIndex, this.firstActiveIndex + this.visibleItemCount);
    }

    Carousel.prototype.to = function (pos) {
        this.calculateValues()

        var that = this
        var direction = pos > this.currentPage ? 'next' : 'prev';

        if (pos > this.pageCount || pos < 1) return

        if (this.sliding)       return this.$element.one('slid.bs.carousel', function () {
            that.to(pos)
        }) // yes, "slid"
        if (this.currentPage == pos) return this.pause().cycle()

        return this.slide(direction, this.getNextItemsForDirection(direction, pos))
    }

    Carousel.prototype.pause = function (e) {
        e || (this.paused = true)

        if (this.$items.find('>[class*="carousel__item--next-"], >[class*="carousel__item--prev-"]').length && $.support.transition) {
            this.$element.trigger($.support.transition.end)
            this.cycle(true)
        }

        this.interval = clearInterval(this.interval)

        return this
    }

    Carousel.prototype.next = function () {
        if (this.sliding) return
        this.calculateValues()
        if (this.pageCount === 2 && this.currentPage == 2 && this.$item.length !== this.visibleItemCount * this.pageCount) {
            return this.slide('prev')
        } else {
            return this.slide('next')
        }
    }

    Carousel.prototype.prev = function () {
        if (this.sliding) return
        this.calculateValues()
        if (this.pageCount === 2 && this.currentPage == 1 && this.$item.length !== this.visibleItemCount * this.pageCount) {
            return this.slide('next')
        } else {
            return this.slide('prev')
        }
    }

    Carousel.prototype.getNextPageIndexForType = function (type) {
        this.calculateValues()
        if (type === 'prev') {
            if (this.currentPage === 1) {
                return false // ;)
            } else {
                return this.currentPage - 1
            }
        } else {
            if (this.currentPage === this.pageCount) {
                return 1
            } else {
                return this.currentPage + 1
            }
        }
    }

    Carousel.prototype.addHelpers = function () {
        this.calculateValues();
        (this.getNextItemsForDirection('next')).first().addClass('carousel__item--after');
        (this.getNextItemsForDirection('prev')).last().addClass('carousel__item--before');
    }

    Carousel.prototype.resetNestedCarousels = function () {
        var that = this;
        setTimeout(function () {
            that.$element.find('.carousel').each(function () {
                $(this).carousel('update');
            });
        }, 0);
    }

    Carousel.prototype.slide = function (type, next) {
        if (this.sliding) return false

        var direction = type == 'next' ? 'left' : 'right'

        var $active = this.getActiveItems();
        var $next = next || this.getNextItemsForDirection(type, this.getNextPageIndexForType(type))
        var $stay = $next.filter('.carousel__item--active');
        var $in = $next.not($stay);
        var $out = $active.not($stay);

        var nextPage = Math.ceil(this.$item.index($next.first()) / this.visibleItemCount) + 1
        var isCycling = this.interval
        var that = this

        // if ($next.is('[class*="carousel__item--active-"]')) return (this.sliding = false)
        if ($active[0] === $next[0]) return (this.sliding = false)

        var transitionEnd = function () {
            that.$item.removeClass(function (idx, cls) {
                var res = cls.match(that.removeRegex);
                return res && res.length > 0 ? res.join(' ') : '';
            });

            $next.each(function (index) {
                $(this).addClass('carousel__item--active carousel__item--active-' + (index + 1));
            });

            that.addHelpers()

            that.updateCarouselClasses();

            that.sliding = false
            setTimeout(function () {
                that.$element.trigger(slidEvent)
            }, 0)
        }

        if (this.$element.data('reset-nested-carousels') !== false) {
            this.resetNestedCarousels();
        }

        var relatedTarget = $next
        var slideEvent = $.Event('slide.bs.carousel', {
            relatedTarget: relatedTarget,
            itemsIn: $in,
            itemsOut: $out,
            direction: direction,
            nextPage: nextPage
        })
        this.$element.trigger(slideEvent)
        if (slideEvent.isDefaultPrevented()) return

        this.sliding = true

        isCycling && this.pause()

        if (this.$indicators.length) {
            this.$indicators.find('.carousel__indicator--active').removeClass('carousel__indicator--active')
            var $nextIndicator = $(this.$indicators.children()[nextPage - 1])
            $nextIndicator && $nextIndicator.addClass('carousel__indicator--active')
        }

        var slidEvent = $.Event('slid.bs.carousel', {
            relatedTarget: relatedTarget,
            itemsIn: $in,
            itemsOut: $out,
            direction: direction
        }) // yes, "slid"
        if ($.support.transition) {
            $active.addClass('carousel__item--' + direction);
            $stay.addClass('carousel__item--stay');
            $in.addClass('carousel__item--in');
            $out.addClass('carousel__item--out');
            $next.each(function (index) {
                $(this).addClass('carousel__item--active carousel__item--' + type + '-' + (index + 1));
                this.offsetWidth;  // force reflow
            });
            $next.addClass('carousel__item--' + direction);

            $next.first()
                .one('bsTransitionEnd', function () {
                    transitionEnd();
                })
                .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
        } else {
            transitionEnd();
        }

        isCycling && this.cycle()

        return this
    }


    // CAROUSEL PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.carousel')
            var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
            var action = typeof option == 'string' ? option : options.slide
            if (!data) $this.data('bs.carousel', (data = new Carousel(this, options)))
            if (typeof option == 'number') data.to(option)
            else if (action) data[action]()
            else if (options.interval) data.pause().cycle()
        })
    }

    var old = $.fn.carousel

    $.fn.carousel = Plugin
    $.fn.carousel.Constructor = Carousel


    // CAROUSEL NO CONFLICT
    // ====================

    $.fn.carousel.noConflict = function () {
        $.fn.carousel = old
        return this
    }


    // CAROUSEL DATA-API
    // =================

    var clickHandler = function (e) {
        var href
        var $this = $(this)
        var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
        if (!$target.hasClass('carousel')) return
        var options = $.extend({}, $target.data(), $this.data())
        var slideIndex = $this.attr('data-slide-to')
        if (slideIndex) options.interval = false

        Plugin.call($target, options)

        if (slideIndex) {
            $target.data('bs.carousel').to(slideIndex)
        }

        var $tabs_item = $this.closest('.tabs__item');
        var $tabs_list = $tabs_item.closest('.tabs__list');
        var $tabs_progress = $tabs_list.find('> .tabs__item > .tabs__progress');
        var $tabs_progress_target = $($tabs_progress.data('target'));
        if ($tabs_item.length > 0) {
            if ($tabs_progress.length > 0) {
                $tabs_item
                    .add($tabs_item.prevAll())
                    .addClass('tabs__item--active');
                $tabs_item
                    .nextAll()
                    .removeClass('tabs__item--active');
                $tabs_progress.width(($this.offset().left - $tabs_list.offset().left) + $this.outerWidth());

                if ($tabs_progress_target.length) {
                    var continueClass = $tabs_progress.data('class-continue');
                    var completedClass = $tabs_progress.data('class-completed');

                    $tabs_progress_target.removeClass(continueClass + ' ' + completedClass);
                    if ($tabs_item.is(':last-child')) {
                        $tabs_progress_target.addClass(completedClass);
                    } else {
                        $tabs_progress_target.addClass(continueClass);
                    }
                }
            } else {
                $tabs_item
                    .addClass('tabs__item--active')
                    .siblings()
                    .removeClass('tabs__item--active');
            }
        }

        e.preventDefault()
    }

    var rideHandler = function(e){
        var $this = $(this);
        var ride = $this.data('ride');

        switch(ride){
            case 'carousel':
                console.log('ride: carousel');
                Plugin.call($this, $this.data());
                break;
            case 'carousel-pager':
                var href, $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')); // strip for ie7
                if($target.length === 0) return true;
                var itemClass = $this.data('item-class');
                var activeClass = $this.data('active-class');
                $target.on('slide.bs.carousel', function(e){
                    $this.find('.' + activeClass).removeClass(activeClass);
                    $this.find('.' + itemClass).eq(e.nextPage - 1).addClass(activeClass);
                });
                break;
        }
    };

    $(document)
        .on('click.bs.carousel.data-api', '[data-slide]', clickHandler)
        .on('click.bs.carousel.data-api', '[data-slide-to]', clickHandler)
        .on('ride.bs.carousel.data-api', '[data-ride]', rideHandler);

    $(document).ready(function () {
        $('[data-ride="carousel"]').trigger('ride.bs.carousel.data-api');
        $('[data-ride="carousel-pager"]').trigger('ride.bs.carousel.data-api');
    });

    $(document).on('slide.bs.carousel slid.bs.carousel', '.carousel--need-height-animation', function (e) {
        var $this = $(this);
        var $carousel = $(e.relatedTarget).closest('.carousel--need-height-animation');

        // prevent nested carousel events
        if (!$this.is($carousel)) return true;

        setTimeout(
            function () {
                var carousel = $carousel.data('bs.carousel');
                var currentHeight = carousel.$inner.outerHeight();
                var targetHeight = $(e.relatedTarget).first().outerHeight();
                if (e.type === 'slide') {
                    clearTimeout(carousel.$inner.data('t-height-animation'));
                    carousel.$inner.data('t-height-animation', setTimeout(function () {

                        if (currentHeight === targetHeight) {
                            // carousel does not need height animation!
                            return true;
                        }

                        carousel.$inner
                            .stop()
                            .height(currentHeight)
                            .animate(
                                {
                                    height: targetHeight + 'px'
                                },
                                {
                                    duration: 500,
                                    easing: 'easeOutCubic',
                                    complete: function(){
                                        carousel.$inner.height('');
                                    }
                                }
                            );
                    }, 100));
                } else {
                    carousel.$inner.height('');
                }
            },
            0
        );
    });

}(jQuery);