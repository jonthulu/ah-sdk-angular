'use strict';

var path = require('path');
var sdkGenerator = require('../lib/generator');

module.exports = function(grunt) {
  var description = 'Grunt plugin for auto-generating Angular $resource services for Actionhero';
  grunt.registerTask('actionheroSDKAngular', description, function (output, version, singleFile, wrap) {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      moduleName:    'ahServices',
      wrap:          null,
      tokenPrepend:  null,
      modelPrepend:  null,
      apiUrl:        null,
      output:        null,
      serviceOutput: null
    });
    options.version      = version || options.version || null;
    options.wrap         = wrap || options.wrap || null;
    options.output       = output || options.output || null;
    options.singleFile   = !!((singleFile === undefined) ? options.singleFile : singleFile);
    options.tokenPrepend = options.tokenPrepend || null;

    if (!options.output) {
      grunt.fail.warn('Missing mandatory option "output".');
      return;
    }
    if (options.output.substr(-1) !== '/') {
      grunt.fail.warn('Output option must be a directory with ending "/".');
      return;
    }

    if (options.serviceOutput) {
      if (options.serviceOutput.substr(-1) !== '/') {
        grunt.fail.warn('ServicesOutput option must be a directory with ending "/".');
        return;
      }
    }

    var done = this.async();
    grunt.startActionhero(function (api) {
      grunt.log.writeln('Generating SDK code');

      var files = sdkGenerator(api, options);

      var fileCount = files.length;
      var outputDir;
      files.forEach(function writeFile(file) {
        if (options.singleFile || !options.serviceOutput || file.type === 'module') {
          outputDir = options.output;
        } else {
          outputDir = options.serviceOutput;
        }
        grunt.file.write(outputDir + file.name, file.output);
        grunt.log.ok('Generated Angular services file %j', outputDir + file.name);
        fileCount -= 1;
        if (fileCount < 1) {
          done();
        }
      });
    });
  });
};
