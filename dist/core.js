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