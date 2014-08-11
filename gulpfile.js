var gulp          = require('gulp');
var sass          = require('gulp-sass');
var plumber       = require('gulp-plumber');
var csso          = require('gulp-csso');
var uglify        = require('gulp-uglify');
var concat        = require('gulp-concat');
var templateCache = require('gulp-angular-templatecache');

// compiles sass to css and csso uglifies
gulp.task('sass', function() {
	gulp.src('public/stylesheets/style.scss')
		.pipe(plumber())
		.pipe(sass())
		.pipe(csso())
		.pipe(gulp.dest('public/stylesheets'));
});

// to watch for changes and launch corresponding tasks
gulp.task('watch', function() {
	// to watch for changes in the sass files and call sass task if changes are observed
	gulp.watch('public/stylesheets/*.scss', ['sass']);

	// watches for changes in the html and calls template task
	gulp.watch('public/views/**/*.html', ['templates']);

	// watches changes in all js files except vendors and generated js and calls compress task
	gulp.watch(['public/**/*.js', '!public/app.min.js', '!public/templates.js', '!public/vendor'], ['compress']);
});

// the task that concats, minifies and uglifies the js
gulp.task('compress', function() {
	gulp.src([
		// the order is important and should be how you attach it to index.html using script tags
		'public/vendor/angular.min.js',
		'public/vendor/*.js',
		'public/app.js',
		'public/services/*.js',
		'public/controllers/*.js',
		'public/filters/*.js',
		'public/directives/*.js'
	])
	.pipe(concat(app.min.js))
	.pipe(uglify())
	.pipe(gulp.dest('public'));
});

// the task for caching template html
// this is great for avoiding http requests EVERY time you navigate to a different route in client
// this is why we need angular templatecache for gulp
gulp.task('templates', function() {
	gulp.src('public/views/**/*.html')
		.pipe(templateCache({ root: 'views', module: 'MyApp' }))
		.pipe(gulp.dest('public'));
});

// launches sass, compress and watch tasks on 'gulp' command
gulp.task('default', ['sass', 'compress', 'templates', 'watch']);