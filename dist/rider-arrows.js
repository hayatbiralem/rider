// RiderButtons
(function(Rider, key){
    'use strict';

    if(!Rider) throw new Error('Rider is not defined!');

    function Plugin(rider, next, prev){
        if(!rider || !(rider instanceof Rider)) Rider.error('Given parameter is not a Rider instance!');
        Rider.on(next, 'click', function(){
            rider.next();
        });
        Rider.on(prev, 'click', function(){
            rider.prev();
        });
    }

    Rider.addPlugin(key, Plugin);
})(Rider, 'setArrows');
