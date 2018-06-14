const fs = require('fs');
const path = require('path');
const url = require('url');
const gulp = require('gulp');
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const yaml = require('js-yaml');
const markdownIt = require('markdown-it')();
const marked = require('marked');
const cssUrlParser = require('css-url-parser');
const imageminJpegoptim = require('imagemin-jpegoptim');
const critical = require('critical').stream;
const _ = require('lodash');
const $ = require('gulp-load-plugins')();

const dist = 'build';
require('dotenv').config({silent: true});

gulp.task('styles', function() {
    return gulp.src('styles/main.sass')
        .pipe($.sass())
        .pipe(gulp.dest(path.join('.tmp', 'styles')));
});

gulp.task('templates', function() {
    return gulp.src('index.html')
        .pipe($.data(function() {
            const files = fs.readdirSync('data');
            const data = files.map(function(file) {
                let filedata = yaml.load(fs.readFileSync(path.join('data', file)).toString());
                filedata.key = path.basename(file, '.yml').replace(/^[0-9]+_?/, '');
                return filedata;
            });
            return {
                data: data
            };
        }))
        .pipe($.swig({
            defaults: { cache: false },
            setup: function(swig) {
                const md = function(input) {
                    return marked(input, {
                        sanitize: true
                    });
                };
                md.safe = true;
                swig.setFilter('md', md);

                const mdi = function(input) {
                    return markdownIt.renderInline(input);
                };
                mdi.safe = true;
                swig.setFilter('mdi', mdi);
            }
        }))
        .pipe(gulp.dest('.tmp'));
});

gulp.task('html', ['styles', 'templates'], function() {
    return gulp.src('.tmp/index.html')
        .pipe($.usemin({
            path: './',
            css: [
                $.cssimport({ includePaths: ['styles'] }),
                $.cleanCss(),
                $.rev()
            ],
            js: [
                $.babel({ presets: ['env'] }),
                $.minify({
                    ext: {
                        min:'.js'
                    },
                    noSource: true
                }),
                $.rev()
            ]
        }))
        .pipe($.if('*.html', $.htmlmin({
            collapseWhitespace: true,
            decodeEntities: true,
            minifyJS: true,
            removeComments: true,
            removeScriptTypeAttributes: true
        })))
        .pipe(gulp.dest(dist));
});


gulp.task('serve', ['styles', 'templates'], function() {
    browserSync.init({
      server: {
          baseDir: ['.tmp', "./"]
      },
      open: false
  });


    gulp.watch(['*.js'], browserSync.reload);
    gulp.watch(['*.html', 'partials/*.html', 'data/*.yml'], ['templates', browserSync.reload]);
    gulp.watch('styles/*.sass', ['styles', browserSync.reload]);
});

gulp.task('copy:dist', function() {
    return gulp.src([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/d3/d3.min.js'
    ], { base: './' })
        .pipe(gulp.dest(dist));
});

gulp.task('assets', ['html', 'copy:dist']);

gulp.task('critical-css', ['assets'], function() {
    return gulp.src(path.join(dist, 'index.html'))
        .pipe(critical({
            base: dist,
            inline: true,
            minify: true
        }))
        .pipe(gulp.dest(dist));
});

gulp.task('default', () =>
  gulp.src('app.js')
    .pipe(babel({
      presets: ['env']
    }))
  .pipe(gulp.dest('dist'))
);

gulp.task('build', ['assets', 'critical-css']);

// gulp.task('default', ['build']); // TODO fix build
