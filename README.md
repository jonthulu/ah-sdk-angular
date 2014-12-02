# ah-sdk-angular

> Tool for auto-generating Angular $http services for Actionhero

The services are generated based entirely on the actionhero routing. (See Generation Details below)

## Latest Changes

### From version 0.1.1 to 0.1.2
Changed the grunt task to a multi task, allowing you to specify targets with unique options.
See the `Install` section. You will no longer be able to send options directly to the grunt task.

### From version 0.1.0 to 0.1.1
Added `skipGenUrl` and `addModuleDependency` options. If you want to use `grunt-ng-constant` to generate
your api url for dev vs production, this is how you'll do it. See the `Using the generated services` section.

### From version 0.0.12 to 0.1.0
The generated clear cache methods have been updated in a manner that is not backwards compatible
if you were sending in a cache object. The cache object now must be sent as the second argument with
any GET parameters sent in an object as the first argument (this matches how other generated get methods
worked already). Any clearCache* methods that were being called without arguments will not need to be
updated and will not break. Any such methods that were sent non-cache object arguments may need to be
updated.

## Getting Started
The included grunt task requires Grunt `~0.4.2`

### Important!
It is required to update your settings under `config.servers.web.httpHeaders['Access-Control-Allow-Headers']`
to include `Authorization`:
```js
  {
    ...
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }
```

It is recommended that you set `config.servers.web.simpleRouting` to `false` to avoid superfluous
route generation. It is not necessary though since methods are only generated from the routes config file.
```js
  {
    ...
    'simpleRouting': false,
  }
```

Both of these settings can be found in your actionhero/config/servers/web.js config file.

### Install
If you haven't used [Grunt](http://gruntjs.com/) before,
be sure to check out the [Getting Started](http://gruntjs.com/getting-started)
guide, as it explains how to create
a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and
use Grunt plugins. Once you're familiar with that process, you may install
this plugin with this command:

```shell
npm install ah-sdk-angular --save-dev
```

Once the plugin has been installed, it can be enabled inside your Gruntfile
with these lines of JavaScript:

```js
grunt.loadNpmTasks('ah-sdk-angular');
grunt.initConfig({
  actionheroSDKAngular: {
    client: {
      options: {
        output: 'directory/to/output/files/',
        // Add extra options here.
      }
    },
    // Example admin target.
    admin:  {
      options: {
        output: 'directory/to/output/files/',
        filter: {
          whitelist: ['admin']
        }
        // Add extra options here.
      }
    }
  }
});
grunt.registerTask('angularSDK', ['actionheroSDKAngular:client']);
grunt.registerTask('adminSDK', ['actionheroSDKAngular:admin']);
```

## Tasks and configuration

To run the grunt task
```shell
grunt actionheroSDKAngular
```

### Options
Options available when generating the services file(s).

#### output
Type: `string` *Required  

The path to the directory in which generate the file(s).
If serviceOutput is set, only the Angular module file will go here.

#### serviceOutput
Type: `string|null` *Optional  
Default: `null`

The path to the directory in which to generate the Angular service/factory files.
Skipped if singleFile is true.

#### version
Type: `String` *Optional  
Default: `'latest'`

The action version to use (can be either 'latest' or a number like 1.0 or 2.3).
If the given version cannot be found, the latest version is used.

#### singleFile
Type: `Boolean` *Optional  
Default: `false`

If true, will generate a single file instead of one for each model.

#### wrap
Type: `Boolean` *Optional  
Default: `false`

If true, each file will be wrapped in a javascript function wrapper.
```js
(function(window, angular, undefined) {
  // GENERATED CODE HERE
})(window, window.angular);
```

#### modelPrepend
Type: `String` *Optional  
Default: `null`

A string that is prepended to each angular model name. If this option is set, the actual model
will be upperCamelCased instead of lowerCamelCased, though the overall name will still be lowerCamelCased.
For example: If set to 'sv', an 'auth' model will become 'svAuth' instead of 'auth'.
This option cannot be set to 'ah' as this would cause conflicts with the other SDK services.

#### tokenPrepend
Type: `String` *Optional  
Default: `null`

A string that is prepended to your access token before it is sent for authentication.  
For example, if you are using the `passport-http-bearer` package, you will need to set
this to 'Bearer '.

#### filter.whitelist
Type: `Array.<string>` *Optional  
Default: `[]`

A list of keywords that must be defined in the `sdkKeywords` option of the actionTemplate in order
for this action to be generated as a method in the model service.
The blacklist takes precedent over the whitelist.
```js
  filter: {
    whitelist: ['admin']
  }

  // Will generate this action.
  sdkKeywords: ['admin', 'expensive']

  // Will not generate this action.
  sdkKeywords: ['client']
```

#### filter.blacklist
Type: `Array.<string>` *Optional  
Default: `[]`

A list of keywords that CAN NOT be defined in the `sdkKeywords` option of the actionTemplate in order
for this action to be generated as a method in the model service.
The blacklist takes precedent over the whitelist.
```js
  filter: {
    blacklist: ['admin']
  }

  // Will generate this action.
  sdkKeywords: ['client', 'expensive']

  // Will not generate this action.
  sdkKeywords: ['client', 'admin']
```

#### moduleName
Type: `String` *Optional  
Default: `'ahServices'`

The name of the generated angular module.

#### skipHttpGen
Type: `Boolean` *Optional  
Default: false

If true, the `ahHttp` factory service will not be generated but still be used. This allows (and requires)
the user to write their own angular $http factory wrapper to suit their needs. This factory must return a
function that takes two config arguments and returns the results in whatever format you choose. The
first config argument is the generated $http config options, the second config argument are the
optional $http config options given by the user from the angular app.

```js
// Example of a custom ahHttp factory (same as the generated one).
angular.module('myApp').factory('ahHttp', [ '$http', function ahHttpFactory($http) {
    return function AHHttp(mainConfig, altConfig) {
      if (!altConfig || typeof altConfig !== 'object') {
        altConfig = {};
      }
      for (var i in mainConfig) {
        if (mainConfig.hasOwnProperty(i)) {
          altConfig[i] = mainConfig[i];
        }
      }

      return $http(altConfig).then(function (response) {
        return response.data;
      });
    };
  }]);
```

#### skipUrlGen
Type: `Boolean` *Optional  
Default: false

If true, the `apiUrlBase` constant will not be generated but still used. This allows (and requires)
the user to define their own `apiUrlBase` constant elsewhere in the code.

#### addModuleDependency
Type: `Array.<String>` *Optional  
Default: null

Adds module names as dependencies of the generated module. This can be used when `skipHttpGen` and/or
`skipUrlGen` are used.

## Generation Details

The tool scans the routes file and uses the paths to define models.
These models are defined using the first directory from the URL `path` param or a defined `sdkModel` param for each route.
The actions/methods defined for each model is taken from the second directory from the `path` param or a defined `sdkName` param.
You can also provide an optional `sdkRoute` param that mimics the `path` param but will be used instead of `path` (`sdkName` and `sdkModel` will still override this.)

Example config/routes.js file:
```js
{
  get:  [
    // Auth Routes
    { path: '/auth/logout', action: 'authLogout', sdkName: 'logout' },

    // User Routes
    { path: '/users/getPrivateData/:id', action: 'userGetPrivateData' }
  ],
  post: [
    // Auth Routes
    { path: '/auth/login', action: 'authLogin', sdkName: 'login', sdkModel: 'auth' },

    // User Routes
    { path: '/users', action: 'userCreate', sdkName: 'create' }
  ]
}
```
In this example, 2 models will be created: Auth and Users.
The Auth model will contain a login and logout method.
The User model will contain a create and getPrivateData method.

Note that the http verbs are preserved in the $http calls, so Auth.login will do a POST call and Auth.logout will do a GET call.
Any routes under the `all` verb will be ignored when generating the sdk.

(Note: If no `sdkName` is given and no second folder exists, such as with the userCreate action above,
then a name will be generated based on the verb. Get=>find, post=>create, put=>update, delete=>delete, patch=>patch.)

The parameters for the generated methods will come from the actionhero action file's inputs.required and inputs.optional settings.
```js
// If the authLogin action is defined as such.
exports.authLogin = {
  inputs: {
    'required': ['email', 'password'],
    'optional': ['ttl']
  }
  ...
};

// A function declaration such as this is generated.
function login(email, password, ttl) {
  ...
}
```

These parameters can be given to the method as individual arguments or by sending an object as the first argument.
If the actionTemplate has the `sdkSingleParam` option set to true, then only the second example will be available.
```js
Auth.login(email, password);
Auth.login({'email': email, 'password': password);
```

Each function does a $http call and returns a simple `promise` with the returned data (the normal header and other info is stripped).
```js
Auth.login(email, password).then(function (data) {}, function (err) {});
```

A bonus method `getUrls` is generated for each model that returns an object with the url for each
action. Be aware of any :params in each url that may need to be replaced. You can use `ahRouteHelper.parseRoute`
to fill in these params if you like.
```js
angular.module('myApp').controller('userController', ['Users', 'ahRouteHelper', function (Users, ahRouteHelper) {
  var url = Users.getUrls().getPrivateData;            // Returns '/users/getPrivateData/:id'.
  ahRouteHelper.parseRoute(url, {id: 32}).url; // Returns '/users/getPrivateData/32'.
}
```

### Routes config options

These are options that can be set in the route definitions in your actionhero routes config file (actionhero/config/routes.js).

#### sdkModel
Type: `string` *Optional  
Default: Parsed from the `path` or `sdkPath` param (/sdkModel/sdkName/other/routing/:id).

The model name to use when generating a service for this route.
```js
{ path: '/anything/login', action: 'authLogin', sdkName: 'login', sdkModel: 'auth' }
// Generates an Auth model.
```

#### sdkName
Type: `string` *Optional  
Default: Parsed from the `path` or `sdkPath` param (/sdkModel/sdkName/other/routing/:id).

The name to use when generating a method for this route.
```js
{ path: '/auth/anything/:id', action: 'authLogin', sdkName: 'login', sdkModel: 'auth' }
// Generates an Auth.login method.
```

#### sdkRoute
Type: `string` *Optional  
Default: `null`

Overrides the `path` param when parsing the model and action names.
The `sdkModel` and `sdkName` options override anything parsed from this option.
```js
{ path: '/something/anything/:id', action: 'authLogin', sdkRoute: '/auth/login' }
// Generates an Auth.login method.
```

#### sdkKeywords
Type: `Array.<string>` *Optional  
Default: `null`

Adds a keyword to this specific route instead of the action. This can be used to filter routes to
an action based on the routing parameters.
```js
{ path: '/something/anything', action: 'createSomething' }
{ path: '/something/anything/:adminParam', action: 'createSomething', sdkKeywords: ['admin'] }
// Here is an example where the admin sdk will take a param for an action but the non-admin wont
// for the same action.
```

### ActionTemplate options

These are options that can be set in the action template when you are defining your actionhero actions.

#### sdkKeywords
Type: `{Array.<string>}` *Optional  
Default: `null`

A list of keywords that can help define the action. These can be used to filter types of actions
when generating the services.

#### sdkSingleParam
Type: `boolean` *Optional  
Default: `false`

If true, the `inputs.required` and `inputs.optional` params will not be listed out as arguments of the method.
Instead, only a single param will be available that accepts the key/value object of params.

#### sdkClearCacheMethod
Type: `boolean` *Optional  
Default: `true` for get methods, `false` otherwise.

Generates a clear cache method for this action if true.

## Using the generated services

* Add the ahServices.js file (and any other generated files) to your Angular App.
```html
<script src="scripts/ahServices.js"></script>
(other generated files here)
```
* Add ahServices as a dependency of your module.
```js
angular.module('myApp', [
  ...
  'ahServices'
]);
```

* Simply inject your new models into anywhere you need them.
```js
angular.module('myApp').controller('authController', ['Auth', 'ahAuth', function (Auth, ahAuth) {
  $scope.login = function () {
    Auth.login({'email': email, 'password': password}).then(function loginSuccess(user) {
      ahAuth.login(user.token, user.id, $scope.rememberMe);
      console.log('Login Success', user);
    }, function loginError(err) {
      console.log('Login Error', err);
    });
  };
}]);
```

* Use the ahAuth service to track Authentication. When provided an access token and user id, all subsequent
$http calls will have the Authentication header automatically set to your user access token.
```
angular.module('myApp').controller('testController', ['ahAuth', 'Users', function (ahAuth, Users) {
  var someToken  = '1234';
  var someUserId = 1;
  // This would have happened in the login, not in the same controller...
  ahAuth.login(someToken, someUserId, true);

  // We will need 'id' in our inputs.required in the userGetPrivateData action.
  Users.getPrivateData({id: ahAuth.getUserId()}).then(function (myPrivateData) {
    console.log(myPrivateData);
  });

  // This will do a $http GET call to '/users/getPrivateData/1' with 'Authentication: 1234' in the headers.
}]);
```

Note: You will have to generate your own accessTokens, I use the uid2 package available through npm.
```shell
npm install uid2 --save
```

* When you logout the user, call ahAuth.logout() to clear the current session.
```js
Auth.logout(function logoutSuccess() {
  ahAuth.logout();
});
```

* When a 401 Unauthorized status is send in a response, the 'ahAuth:Failed' event is broadcast to the $rootScope.
It is up to you to handle that event. Here is an example of how to handle it:
```js
angular.module('myApp').run(function unauthorizedHandler($rootScope, $location, ahAuth) {
  $rootScope.$on('ahAuth:Failed', function () {
    ahAuth.logout();
    $location.path('/login');
  });
})
```

* To override the angular $http config options when calling the SDK, send the first argument as
an object of parameters and the second argument as an object of config options. Note that any
options that are explicitly set by the SDK call (method, url, etc) cannot be overridden.
```js
Users.getPrivateData({
  id: 1
}, {
  cache: true
}).then(...);
```

* To override the angular $http config defaults for all SDK calls, use angular.module(...).run() or .config().
```js
angular.module('myApp').config(['$httpProvider', function ($httpProvider) {
  $httpProvider.defaults.xsrfCookieName  = 'ahXSRF';
  $httpProvider.defaults.withCredentials = true;
}]);
/* OR */
angular.module('myApp').run(['$http', function ($http) {
  $http.defaults.xsrfCookieName  = 'ahXSRF';
  $http.defaults.withCredentials = true;
}]);
```

* To update the api url for production vs development you can use `grunt-ng-constant` to have grunt
generate an `apiUrlBase` constant in a new `ahServiceConstants` app. Make sure to set `skipUrlGen`
to `true` and `addModuleDependency` to `['ahServiceConstants']` (or whatever you named your constants
module) in your gruntfile.
```js
// Example grunt initConfig.
grunt.initConfig({
  actionheroSDKAngular: {
    client: {
      options: {
        output:              'directory/to/output/files/',
        skipUrlGen:          true,
        addModuleDependency: ['ahServiceConstants']
        // Add extra options here.
      }
    }
  }
}
```

* Check the docblocks in the generated code for more help if you need it.
