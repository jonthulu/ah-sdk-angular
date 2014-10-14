var fs = require('fs');
var mark = require('markup-js');
var _ = require('lodash');

require.extensions['.markup'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

var authMarkup = require('./auth.markup');
var modelMarkup = require('./model.markup');
var moduleMarkup = require('./module.markup');

/**
 * Generates the Actionhero SDK file(s).
 *
 * @param {object} api Actionhero api object.
 * @param {{moduleName: string, apiUrl: string, version: string, singleFile: boolean, wrap: boolean, tokenPrepend: string|null, modelPrepend: string|null, filter: {whitelist: Array.<string>, blacklist: Array.<string>}}=} options
 * @return {{name: string, output: string}} The name of file and its output.
 */
module.exports = function sdkGenerator(api, options) {
  var ngModuleName = options.moduleName || 'ahServices';
  var version      = options.version || 'latest';
  var singleFile   = !!options.singleFile;
  var url          = options.apiUrl || null;
  var wrap         = !!options.wrap;
  var tokenPrepend = options.tokenPrepend || null;
  var modelPrepend = (options.modelPrepend) ? ('' + options.modelPrepend) : null;
  var filter       = options.filter || {};
  if (filter.whitelist && typeof filter.whitelist === 'string') {
    filter.whitelist = [filter.whitelist];
  }
  if (!filter.whitelist) {
    filter.whitelist = [];
  }
  if (filter.blacklist && typeof filter.blacklist === 'string') {
    filter.blacklist = [filter.blacklist];
  }
  if (!filter.blacklist) {
    filter.blacklist = [];
  }

  if (!url) {
    var webConfig = api.config.servers.web;
    url = 'http://' + webConfig.bindIP + ':' + webConfig.port + '/' + webConfig.urlPathForActions;
  }
  if (url.substr(-1) === '/') {
    url = url.substr(0, url.length - 1);
  }

  if (modelPrepend && modelPrepend.toLowerCase() === 'ah') {
    modelPrepend = null;
  }

  var verbActions = {
    'get':    'find',
    'post':   'create',
    'put':    'update',
    'delete': 'destroy',
    'patch':  'patch'
  };

  var models = {};
  _.forEach(api.config.routes, function parseVerbs(routes, verb) {
    if (verb === 'all') {
      return;
    }
    routes.forEach(function parseRoute(route) {
      var cleanPath = route.path.replace(/\([^\)]*\)/, '');
      var words     = cleanPath.split('/');
      var model, sdkName;

      if (route.sdkRoute) {
        words = route.sdkRoute.split('/');
      }

      if (route.sdkModel) {
        model = route.sdkModel;
      }
      while (!model && words.length > 0) {
        model = words.shift();
      }

      if (route.sdkName) {
        sdkName = route.sdkName;
      }
      while (!sdkName && words.length > 0) {
        sdkName = words.shift();
      }
      if (!sdkName) {
        sdkName = verbActions[verb];
      }

      var keywords = route.sdkKeywords || [];

      var actionVersion;
      if (version !== 'latest' && version !== 'newest') {
        if (hasActionVersion(api, route.action, version)) {
          actionVersion = version;
        }
      }
      if (!actionVersion) {
        actionVersion = getNewestActionVersion(api, route.action);
      }

      var actionTemplate = _.clone(api.actions.actions[route.action][actionVersion], true);
      actionTemplate.sdkName = sdkName;
      actionTemplate.route   = cleanPath;
      actionTemplate.verb    = verb;
      actionTemplate.params  = _.union(
        actionTemplate.inputs.required || [],
        actionTemplate.inputs.optional || []
      );
      if (actionTemplate.sdkClearCacheMethod === undefined) {
        actionTemplate.sdkClearCacheMethod = (verb === 'get');
      } else {
        actionTemplate.sdkClearCacheMethod = (!!actionTemplate.sdkClearCacheMethod);
      }

      if (actionTemplate.sdkKeywords) {
        keywords = _.union(keywords, actionTemplate.sdkKeywords);
      }
      if (keywords && keywords.length) {
        if (filter.blacklist.length) {
          if (_.intersection(filter.blacklist, keywords).length) {
            // This action has a blacklisted keyword.
            return;
          }
        }
        if (filter.whitelist.length) {
          if (!_.intersection(filter.whitelist, keywords).length) {
            // This action is missing a whitelisted keyword.
            return;
          }
        }
      } else if (filter.whitelist.length) {
        // Skip this action since there is a whitelist and we have no keywords.
        return;
      }

      var pathParams = cleanPath.match(/:[a-zA-Z0-9]+/g);
      if (pathParams) {
        pathParams = _.map(pathParams, function (name) {
          return name.replace(':', '');
        });
        actionTemplate.pathParams = pathParams;
      }

      if (!models[model]) {
        models[model] = {};
      }
      if (!models[model][sdkName]) {
        models[model][sdkName] = {};
      }
      models[model][sdkName][verb] = actionTemplate;
    });
  });

  var files = [];

  defineCustomPipes();
  mark.globals.moduleName = ngModuleName;
  mark.globals.single     = singleFile;
  mark.globals.wrap       = wrap;
  mark.globals.openBrace  = '{';
  mark.globals.closeBrace = '}';
  mark.globals.doubleOpenBrace  = '{{';
  mark.globals.doubleCloseBrace = '}}';

  var modelActionsList;
  _.forEach(models, function formatModels(actions, modelName) {
    modelActionsList = [];
    _.forEach(actions, function formatActions(verbs) {
      _.forEach(verbs, function formatVerbs(action) {
        modelActionsList.push(action);
      });
    });

    if (modelPrepend) {
      modelName = modelName.substr(0, 1).toUpperCase() + modelName.substr(1);
      modelName = modelPrepend + modelName;
    }

    files.push({
      name:   toFileName(modelName),
      type:   'factory',
      output: mark.up(modelMarkup, {
        name:    modelName,
        actions: modelActionsList
      })
    });
  });

  files.push({
    name:   toFileName('ahAuth'),
    type:   'factory',
    output: mark.up(authMarkup, {
      tokenPrepend: tokenPrepend
    })
  });

  var moduleFile = {
    name:   toFileName(ngModuleName),
    type:   'module',
    output: mark.up(moduleMarkup, {
      url:          url,
      tokenPrepend: tokenPrepend,
      files:        (singleFile) ? files : null
    })
  };

  if (singleFile) {
    return [moduleFile];
  }

  files.push(moduleFile);
  return files;
};

function hasActionVersion(api, action, version) {
  return !!api.actions.actions[action][version];
}

function getNewestActionVersion(api, action) {
  api.actions.versions[action].sort(function (a, b) {
    return b - a;
  });
  return api.actions.versions[action][0];
}

/**
 * Turns a model name into a file name.
 *
 * @param {String} model
 * @return {String}
 */
function toFileName(model) {
  return model + '.js';
}

/**
 * Define some custom pipes for markup.js.
 */
function defineCustomPipes() {
  /**
   * Wraps the given string in quotes.
   *
   * @param {String} string
   * @param {boolean} doubleQuote
   * @return {String}
   */
  mark.pipes.q = function (string, doubleQuote) {
    if (!!doubleQuote) {
      return '"' + string + '"';
    }
    return "'" + string + "'";
  };

  /**
   * Does an OR check on all the given arguments after inverting all of them.
   *
   * @params {...} checkParams
   * @return {boolean}
   */
  mark.pipes.nor = function () {
    var result = (!arguments[0]);

    var i   = 1;
    var len = arguments.length;
    for (i; i < len; i++) {
      result = result || (!arguments[i]);
    }
    return result;
  };

  /**
   * Turns an object into an iteratable array.
   *
   * @param {Object} object
   * @return {Array.<{name: String, value: *}>}
   */
  mark.pipes.loop = function (object) {
    var objectSet = [];
    for (var index in object) {
      if (object.hasOwnProperty(index)) {
        objectSet.push({name: index, value: object[index]});
      }
    }
    return objectSet;
  };

  /**
   * Turns the string into lowerCamelCase.
   *
   * @param {string} str
   * @return {string}
   */
  mark.pipes.lowercapcase = function (str) {
    str = str.replace(/(?:^|\s)\S/g, function (a) {
      return a.toUpperCase();
    });
    return str[0].toLowerCase() + str.substr(1);
  };
}
