module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      compile:
        files:
          'server.js': 'server.coffee'
    express:
      options:
        port: 9997
        delay: 300
        script: "server.js"
      dev:
        options:
          node_env: "development"
      prod:
        options:
          node_env: "production"
    stitch:
      options:
        paths: ['src']
        dependencies: [
          'js/sortedset.js',
          'js/hsv.js',
          'js/hsl.js',
          'vendor/fisheye.js',
          'js/quadParser.js',
          'js/multistring.js',
          'js/oncerunner.js',
          'js/gvcl.js']
        dest: 'lib/huviz.js'
    watch:
      scripts:
        files: [
          'src/*.coffee',
          'js/*.js',
          'lib/*.js',
          'Gruntfile.coffee',
          'server.coffee',
          'views/*.ejs',
          'views/*.js']
        tasks: ['coffee', 'stitch', 'express:dev']
        options:
          atBegin: true
          debounceDelay: 250
          livereload:
            port: 35731
          spawn: false
    release:
      options:
        npm: false
        github:
          repo: 'smurp/huviz'
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-express-server')
  grunt.loadNpmTasks('grunt-release')
  grunt.loadNpmTasks('grunt-stitch')
  grunt.registerTask('default', ['express:prod'])
  grunt.registerTask('dev', ['watch'])
