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
 * @param {{moduleName: String, apiUrl: String, version: String, singleFile: boolean, wrap: boolean, filter: {whitelist: Array.<string>, blacklist: Array.<string>}}=} options
 * @return {{name: String, output: String}} The name of file and its output.
 */
module.exports = function sdkGenerator(api, options) {
  var ngModuleName = options.moduleName || 'ahServices';
  var version      = options.version || 'latest';
  var singleFile   = !!options.singleFile;
  var url          = options.apiUrl || null;
  var wrap         = !!options.wrap;
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

  var verbActions = {
    'get':    'find',
    'post':   'create',
    'put':    'update',
    'delete': 'delete',
    'patch':  'patch'
  };

  var models = {};
  _.forEach(api.routes.routes, function parseVerbs(routes, verb) {
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

      var actionVersion;
      if (version !== 'latest' && version !== 'newest') {
        if (hasActionVersion(api, route.action, version)) {
          actionVersion = version;
        }
      }
      if (!actionVersion) {
        actionVersion = getNewestActionVersion(api, route.action);
      }

      var actionTemplate = api.actions.actions[route.action][actionVersion];
      actionTemplate.sdkName = sdkName;
      actionTemplate.route   = cleanPath;
      actionTemplate.verb    = verb;
      actionTemplate.params  = _.union(
        actionTemplate.inputs.required || [],
        actionTemplate.inputs.optional || []
      );

      if (actionTemplate.sdkKeywords) {
        if (filter.blacklist.length) {
          if (_.intersection(filter.blacklist, actionTemplate.sdkKeywords).length) {
            // This action has a blacklisted keyword.
            return;
          }
        }
        if (filter.whitelist.length) {
          if (!_.intersection(filter.whitelist, actionTemplate.sdkKeywords).length) {
            // This action is missing a whitelisted keyword.
            return;
          }
        }
      } else if (filter.whitelist.length) {
        // Skip this action since there is a whitelist and we have no keywords.
        return;
      }

      if (!models[model]) {
        models[model] = {};
      }
      if (!models[model][sdkName]) {
        models[model][sdkName] = {};
      }
      models[model][sdkName][verb] = actionTemplate;
    })
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
    name:   toFileName('actionheroAuth'),
    type:   'factory',
    output: mark.up(authMarkup, {})
  });

  var moduleFile = {
    name:   toFileName(ngModuleName),
    type:   'module',
    output: mark.up(moduleMarkup, {
      url:    url,
      files: (singleFile) ? files : null
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
  }
}
