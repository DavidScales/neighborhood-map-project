/*
  1. Inline css (minify too) and js (don't minify yet).
  2. Minify html and inlined js.
  3. Copy images from src to dist.
  4. Optimize images.
*/

module.exports = function(grunt) {

  grunt.initConfig({

    /*  Minify and internalize css and js files.
     *
     * Mark href with ?__inline=true
     * https://github.com/chyingp/grunt-inline */
    inline: {
      task1: {
        options: {
          cssmin: true,
          uglify: false // Don't try to minify, causing errors on libraries that are already minified
        },
        src: 'src/index.html',
        dest: 'dist/index.html'
      }
    },

    /* Minify html files, including inlined js
    https://github.com/gruntjs/grunt-contrib-htmlmin */
    htmlmin: {
      dist: {
        options: {
          removeComments: true, // remove comments from html
          removeCommentsFromCDATA: true, // remove comments from <script> and <style>
          removeScriptTypeAttributes: true, // remove unnecessary <script> attributes
          removeStyleLinkTypeAttributes: true, // remove unnecessary <style> attributes
          minifyJS: true, // minify any inline js
          collapseWhitespace: true, // remove whitespace
          conservativeCollapse: true // preserve a single whitespace, to prevent potential errors
        },
        files: {
          'dist/index.html': 'dist/index.html' // destination : source
        }
      }
    },

    /* Copy images from src to dist */
    copy: {
      dev: {
        files: [{
          expand: true,
          src: '*.{gif,jpg,png}',
          cwd: 'src/images/',
          dest: 'dist/images/'
        }]
      },
    },

    /* Optimize images with ImageOptim
    Run after responsive_images for further optimizations.
    Leave jPeg mini false, its not installed (its $20!).
    You can set imageAlpha to true, it works on png's only and is lossy.
    ImageOptim is already true (all are true by default)
    https://github.com/JamieMason/grunt-imageoptim */
    imageoptim: {
      myTask: {
        options: {
          jpegMini: false,
          imageAlpha: false
        },
        src: ['dist/images']
      }
    }

  });

  // Load grunt tasks, loads tasks automatically from package.json
  // replaces grunt.loadNpmTask('grunt-...'); lines for each plugin
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', ['inline', 'htmlmin', 'copy', 'imageoptim']);
};
