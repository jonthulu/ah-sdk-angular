# ah-sdk-angular

> Tool for auto-generating Angular $http services for Actionhero

The services are generated based entirely on the actionhero routing. (See Generation Details below)

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

## Generation Details

The tool scans the routes file and uses the paths to define models.
These models are defined using the first directory from the URL path name for each route.
The actions/methods defined for each model is taken from the second directory from the path or a defined sdkName.

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
    { path: '/auth/login', action: 'authLogin', sdkName: 'login' },

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
```js
Auth.login(email, password);
Auth.login({'email': email, 'password': password);
```

Each function does a $http call and returns a simple promise with the returned data (the normal header and other info is stripped).
```js
Auth.login(email, password).then(function (data) {}, function (err) {});
```

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
