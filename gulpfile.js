const { src, dest, parallel, series, spawn, watch } = require('gulp');
const babel = require('gulp-babel');
const coffee = require('gulp-coffee');
const concat = require('gulp-concat');
const gls = require('gulp-live-server');
const cp = require("child_process");

// https://www.npmjs.com/package/gulp#sample-gulpfilejs
let paths = {
  client_cof: {
    src: './src/*.coffee',
    dest: './dest/js/'},
  client_js: {
    src: [
      'js/sortedset.js',
      'js/hsv.js',
      'js/hsl.js',
      'vendor/fisheye.js',
      'js/quadParser.js',
      'js/multistring.js',
      'js/oncerunner.js',
      'js/gvcl.js',
      './dest/js/*.js'],
    dest: './lib/'},
  server_cof: {
    src: 'server.coffee',
    dest: './'}
  }
let node;

function helloworld(cb) {
  console.log('hello great listening world!');
  cb()
}

function noop(cb) {
  console.log('noop');
  cb();
}

function client_cof() {
  return src(paths.client_cof.src)
    .pipe(coffee({bare: true}))
    .pipe(babel({presets: ['@babel/env']}))
    .pipe(dest(paths.client_cof.dest, {overwrite: true}));
}

function client_js() {
  return src(paths.client_js.src)
    .pipe(concat('huviz.js'))
    .pipe(dest(paths.client_js.dest))
}

function server_cof() {
  return src(paths.server_cof.src)
    .pipe(dest(paths.server_cof.dest, {overwrite: true}))
}

var build = series(client_cof, server_cof, client_js);

// Automatically reload your node.js app on file change with Gulp
// https://gist.github.com/webdesserts/5632955
function server(cb) {
  if (node) {
    node.kill();
  }
  node = cp.spawn('ls', ['server.js','9997'], {XXsdtio: 'inherit'});
  node.on('close', function(code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes....');
    } else {
      console.log('closed')
    }
  });

  node.on('error', function(err) {
    console.log(err);
  });
  cb();
}

function gls_serve() {
  node = gls.new(['server.js','9997']);
  node.start();
}

//let server = noop;

//https://gulpjs.com/docs/en/getting-started/watching-files


let watch_files = paths.client_js.src.concat([paths.client_cof.src, 'server.js']);

function watch_n_serve() {
  return watch(watch_files,
               series(node.stop.bind(node), build, gls_serve));
}

let dev = series(build,
                 gls_serve,
                 watch_n_serve
                );
/*
  function dev() {
  server();
  return watch([paths.client_cof.src, paths.client_js.src], series(build, server));
}
*/

/*
gulp.src('./src/*.coffee', { sourcemaps: true })
  .pipe(coffee({ bare: true }))
  .pipe(gulp.dest('./dest/js'));

gulp.src('./src/*.coffee', { sourcemaps: true })
  .pipe(coffee({ bare: true }))
  .pipe(gulp.dest('./dest/js'));
*/

exports.helloworld = helloworld;
exports.build = build;
exports.dev = dev;
