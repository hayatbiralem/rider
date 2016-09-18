// RiderButtons
(function(Rider, key){
    'use strict';

    if(!Rider) throw new Error('Rider is not defined!');

    function Plugin(rider, dots, currentClass){
        if(!rider || !(rider instanceof Rider)) Rider.error('Given parameter is not a Rider instance!');

        dots = Rider.$$(dots);

        Rider.on(dots, 'click', function(event){
            rider.slide(Rider.index(event.target) + 1);
        });

        rider.on('render', function(event){
            if(dots[event.detail.rider.currentPage - 1]) {
                Rider.removeClass(dots, currentClass);
                Rider.addClass(dots[event.detail.rider.currentPage - 1], currentClass);
            }
        });
    }

    Rider.addPlugin(key, Plugin);
})(Rider, 'setDots');
