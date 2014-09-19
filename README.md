# ah-sdk-angular

> Tool for auto-generating Angular $http services for Actionhero

The services are generated based entirely on the actionhero routing. (See Generation Details below)

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
model generation.
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

Once the plugin has been installed, it may be enabled inside your Gruntfile
with these lines of JavaScript:

```js
grunt.loadNpmTasks('ah-sdk-angular');
grunt.config('actionheroSDKAngular', {
  options: {
    output: 'DIRECTORY TO OUTPUT FILES'
    // Add extra options here.
  }
});
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

### Sending options to Grunt
Options format when calling grunt is `:output:version:singleFile:wrap`.
```shell
grunt actionheroSDKAngular:/tmp:1.0:true:true
```
Note: These will override the options defined in the grunt config.

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

(Note: If no sdkName is given and no second folder exists, such as with the userCreate action above,
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

#### sdkPath
Type: `string` *Optional  
Default: `null`

Overrides the `path` param when parsing the model and action names.
The `sdkModel` and `sdkName` options override anything parsed from this option.
```js
{ path: '/something/anything/:id', action: 'authLogin', sdkRoute: '/auth/login' }
// Generates an Auth.login method.
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
angular.module('myApp').controller('authController', ['Auth', 'ActionheroAuth', function (Auth, ActionheroAuth) {
  $scope.login = function () {
    Auth.login({'email': email, 'password': password}).then(function loginSuccess(user) {
      ActionheroAuth.login(user.token, user.id, $scope.rememberMe);
      console.log('Login Success', user);
    }, function loginError(err) {
      console.log('Login Error', err);
    });
  };
}]);
```

* Use the ActionheroAuth service to track Authentication. When provided an access token and user id, all subsequent
$http calls will have the Authentication header automatically set to your user access token.
```
angular.module('myApp').controller('testController', ['ActionheroAuth', 'Users', function (ActionheroAuth, Users) { 
  var someToken  = '1234';
  var someUserId = 1;
  // This would have happened in the login, not in the same controller...
  ActionheroAuth.login(someToken, someUserId, true);

  // We better have 'id' in our inputs.required in the userGetPrivateData action.
  Users.getPrivateData({id: ActionheroAuth.getUserId()}).then(function (myPrivateData) {
    console.log(myPrivateData);
  });

  // This will do a $http GET call to '/users/getPrivateData/1' with 'Authentication: 1234' in the headers.
}]);
```

Note: You will have to generate your own accessTokens, I use the uid2 package available through npm.
```shell
npm install uid2 --save
```

* When you logout the user, call ActionheroAuth.logout() to clear the current session.
```js
Auth.logout(function logoutSuccess() {
  ActionheroAuth.logout();
});
```

* Check the docblocks in the generated code for more help if you need it.
