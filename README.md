# ah-sdk-angular

> Tool for auto-generating Angular $http services for Actionhero

The services are generated based entirely on the actionhero routing.

## Getting Started
The included grunt task requires Grunt `~0.4.2`

!! It is required to update your settings under config.servers.web.httpHeaders['Access-Control-Allow-Headers']
to include `Authorization`:

```js
  {
    ...
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }
```

If you haven't used [Grunt](http://gruntjs.com/) before,
be sure to check out the [Getting Started](http://gruntjs.com/getting-started)
guide, as it explains how to create
a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and
use Grunt plugins. Once you're familiar with that process, you may install
this plugin with this command:

```shell
npm install ah-sdk-angular --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile
with these lines of JavaScript:

```js
grunt.loadNpmTasks('ah-sdk-angular');
grunt.config('actionheroSDKAngular', {
  options: {
    output: 'DIRECTORY TO OUTPUT FILES'
  }
});
```

!!!
It is recommended that you set simpleRouting to false in your
actionhero/config/servers/web.js config file to avoid superfluous
model generation.
!!!

## Tasks and configuration

To run the grunt task
```shell
grunt actionheroSDKAngular
```

OPTIONS
* output: (Required) The path to the directory in which generate the file(s). If serviceOutput is set, only the Angular module file will go here.
* serviceOutput: (Optional) The path to the directory in which to generate the Angular service/factory files. Skipped if singleFile is true.
* version: (Optional) The action version to use (can be either 'latest' or a number like 1.0 or 2.3). If the given version cannot be found, the latest version is used.
* singleFile: (Optional) If true, will generate a single file instead of one for each model.
* wrap: (Optional) If true, each file will be wrapped in a javascript function wrapper. Defaults to false.
* moduleName: (Optional) The name of the angular module (defaults to ahServices).

Options format when calling grunt is `:output:version:singleFile:wrap`.
```shell
grunt actionheroSDKAngular:/tmp:1.0:true:true
```
Note: These will override the options defined in the grunt config.
