var gulp = require('gulp');
var del = require('del');
var path = require('path');
var jshint = require('gulp-jshint');
var twig = require('gulp-twig');
var prettify = require('gulp-jsbeautifier');
var replace = require('gulp-replace');
var connect = require('gulp-connect');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var pump = require('pump');
var rename = require('gulp-rename');
var merge = require('merge-stream');
var fs = require('fs');
var json = {
    get: function(){
        return JSON.parse(fs.readFileSync('src/json/db.json'));
    }
};
var modules = ['core', 'core-2', 'carousel', 'rider-arrows', 'rider-dots'];

// clean
gulp.task('clean', function () {
    return del([ 'dist' ]);
});

gulp.task('html', function () {

    var data = json.get();
    data.title = 'Rider';

    var streams = merge();
    modules.forEach(function(val, key){
        var stream = gulp.src([
            'src/'+val+'/index.twig'
        ])
            // compile
            .pipe(twig({
                data: data
            }))

            // prettify
            .pipe(prettify({
                unformatted: []
            }))

            // convert multiple line breaks to one linebreak
            .pipe(replace(/^\s*[\r\n]/gm, "\n"))

            // rename
            .pipe(rename(val + '.html'))
            
            // dist
            .pipe(gulp.dest('dist/'));

        if(key === modules.length - 1) {
            stream = stream.pipe(connect.reload());
        }

        streams.add(stream);
    });

    return streams.isEmpty() ? null : streams;
});
gulp.task('html:watch', function () {
    gulp.watch('src/**/*.twig', ['html']);
});

// scss
gulp.task('sass', function () {
    var streams = merge();
    modules.forEach(function(val, key){
        var stream = gulp.src([
            'src/'+val+'/styles.scss'
        ])
            .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
            .pipe(autoprefixer({
                cascade: false,
                browsers: [
                    'Android >= 2.3',
                    'BlackBerry >= 7',
                    'Chrome >= 9',
                    'Firefox >= 4',
                    'Explorer >= 9',
                    'iOS >= 5',
                    'Opera >= 11',
                    'Safari >= 5',
                    'OperaMobile >= 11',
                    'OperaMini >= 6',
                    'ChromeAndroid >= 9',
                    'FirefoxAndroid >= 4',
                    'ExplorerMobile >= 9'
                ]
            }))
            .pipe(rename(val + '.css'))
            .pipe(gulp.dest('dist/'));

        if(key === modules.length - 1) {
            stream = stream.pipe(connect.reload());
        }

        streams.add(stream);
    });

    return streams.isEmpty() ? null : streams;
});
gulp.task('sass:watch', function () {
    gulp.watch('src/**/*.scss', ['sass']);
});

// scripts
gulp.task('javascript', function() {
    var streams = merge();
    modules.forEach(function(val, key){
        var stream = gulp.src([
            'src/'+val+'/scripts.js'
        ])
            .pipe(jshint())
            .pipe(jshint.reporter('default'))
            .pipe(concat(val + '.js'))
            .pipe(gulp.dest('dist/'));

        if(key === modules.length - 1) {
            stream = stream.pipe(connect.reload());
        }

        streams.add(stream);
    });

    return streams.isEmpty() ? null : streams;
});
gulp.task('compress', ['javascript'], function (cb) {
    pump([
            gulp.src(['dist/**/*.js', '!dist/**/*.min.js']),
            rename(function (path) {
                path.extname = ".min.js";
                return path;
            }),
            uglify(),
            gulp.dest('dist')
        ],
        cb
    );
});
gulp.task('javascript:watch', function () {
    gulp.watch('src/**/*.js', ['compress']);
});

// connect
gulp.task('connect', function() {
    connect.server({
        root: 'dist',
        livereload: false
    });
});

// watch
gulp.task('watch', ['html:watch', 'sass:watch', 'javascript:watch']);

// build tasks
gulp.task('build', ['html', 'sass', 'javascript', 'compress']);

// default tasks
gulp.task('default', ['build', 'connect', 'watch']);