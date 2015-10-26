'use strict';

var httpSync = require('http-sync-4'),
    fs = require('fs'),
    _ = require('lodash'),
    stdio = require('stdio'),
    rmdirRecursive = require('rimraf'),
    crypto = require('crypto');

class BootInfo {

    constructor() {
        this.headers = {};
    }

    getHeaders() {
        return this.headers;
    }

    addHeader(name, value) {
        this.headers[name] = value;
    }
}

var api = {
    arguments: null,
    roadMapPath: null,
    config: null,

    md5: function md5(value) {
        return crypto.createHash('md5').update(value).digest('hex');
    },

    extractUrlParts: function (url) {
        var parts,
            part,
            result;

        result = {};
        parts = url.split('/');
        part = parts.shift();
        if (_.endsWith(part, ':')) {
            result.protocol = part.substr(0, part.length - 1);
            part = parts.shift();
            if (part !== '') {
                throw new Error('Invalid url given!');
            }
            part = parts.shift();
        } else {
            result.protocol = 'http';
        }
        var port = null;
        var domainParts = part.split(':');
        if (domainParts.length > 2) {
            throw new Error('Invalid port given in url!');
        } else if (domainParts.length === 2) {
            port = parseInt(domainParts[1], 10);
        }
        if (port === null) {
            if (result.protocol === 'http') {
                port = 80;
            } else if (result.protocol === 'https') {
                port = 443;
            } else {
                throw new Error('No default port found for protocol ' + result.protocol);
            }
        }
        result.host = domainParts[0];
        result.port = port;
        result.path = '/' + _.trimRight(parts.join('/'), ['/']);

        return result;
    },

    getHttpResponse: function (url, payload, headers) {
        var body = null,
            method = _.isNull(payload) ? 'GET' : 'POST';

        if (_.isUndefined(headers)) {
            headers = {};
        }

        var urlParts = api.extractUrlParts(url);

        if (method === 'POST') {
            if (_.isObject(payload)) {
                body = JSON.stringify(payload);
                headers['Content-Type'] = 'application/json';
            } else if (_.isString(body)) {
                body = payload;
                headers['Content-Type'] = 'text';
            }
        }
        var requestConfig = {
            method: method,
            headers: headers,
            body: body,
            protocol: urlParts.protocol,
            host: urlParts.host,
            port: urlParts.port,
            path: urlParts.path
        };

        console.log(method + ' ' + url);
        var request = httpSync.request(requestConfig);

        var timedOut = false;
        request.setTimeout(90000, function () {
            timedOut = true;
        });

        var response = request.end();
        if (timedOut) {
            throw new Error('Request timed out!');
        }
        var statusCode = response.statusCode;
        return {statusCode: statusCode, body: response.body.toString()}
    },

    shiftArgument: function () {
        if (!_.isArray(api.arguments)) {
            api.arguments = [];
            process.argv.forEach(function (value, index) {
                if (index > 1) {
                    api.arguments.push(value);
                }
            });
        }
        if (_.isEmpty(api.arguments)) {
            return null;
        }
        return api.arguments.shift();
    },

    getArguments: function () {
        if (_.isNull(api.arguments)) {
            api.arguments = stdio.getopt({
                'baseurl': {args: 1, key: 'b', description: 'The base url which is used as prefix'},
                'testcases': {
                    key: 't',
                    args: 1,
                    description: 'A comma separated list of test case numbers which should be executed'
                }
            });
        }
        return api.arguments;
    },

    mkEmptyDirSync: function (path) {
        try {
            fs.mkdirSync(path);
        } catch (e) {
            if (e.code === 'EEXIST') {
                rmdirRecursive.sync(path);
                api.mkEmptyDirSync(path);
            } else {
                throw new Error('Could not create folder "' + path + '": ' + e.code);
            }
        }
    },

    getJsonFromFile: function (path) {
        var content = fs.readFileSync(path, 'utf8');
        var json = JSON.parse(content);
        if (!_.isObject(json)) {
            throw new Error('Could not parse JSON from file "' + path + '"');
        }
        return json;
    },

    getRoadMapPath: function () {
        if (_.isNull(api.roadMapPath)) {
            var path = api.getArguments().args[0];
            if (_.isNull(path)) {
                return null;
            }
            if (!_.endsWith(path.toLowerCase(), '.json')) {
                path = path + '.json';
            }
            api.roadMapPath = fs.realpath(path);
        }
        return api.roadMapPath;
    },

    getBootFilePath: function () {
        let path = api.getRoadMapPath();
        path = path.substr(0, path.length - 4) + 'boot.js';
        return path;
    },

    getConfigFilePath: function () {
        let path = api.getRoadMapPath();
        path = path.substr(0, path.length - 4) + 'conf.json';
        return path;
    },

    getSouvenirIdForRoadMapPath: function (path) {
        return api.md5(fs.realpathSync(path));
    },

    getSouvenirPathForRoadMapPath: function (path) {
        var souvenirPath =   __dirname + '/souvenirs/' + api.getSouvenirIdForRoadMapPath(path);
        return souvenirPath;
    },

    getSouvenirPathForTarget: function (souvenirPath, target) {
        var targetId = api.md5(target);
        var path = souvenirPath + '/' + targetId + '.json';
        return path;
    },

    getBaseUrlFromArguments: function () {
        var args = api.getArguments();
        var baseUrl = (args.hasOwnProperty('baseurl')) ? args.baseurl : null;
        if (_.isNull(baseUrl)) {
            baseUrl = api.getConfigValue('base_url', '');
        }
        return baseUrl;
    },

    getTestcases: function () {
        var args = api.getArguments();
        var result = [];
        if (args.hasOwnProperty('testcases')) {
            let ids = args.testcases.split(',');
            ids.forEach((id) => {
                result.push(parseInt(_.trim(id), 10));
            });
        }
        return result;
    },

    getRoadMapFromPath: function (path) {
        try {
            var content = fs.readFileSync(path, 'utf8');
        } catch (e) {
            throw new Error('ERROR - failed to open roadmap file : ' + path);
        }
        var roadMapJSON = JSON.parse(content);
        if (!_.isObject(roadMapJSON)) {
            throw new Error('ERROR - failed to parse roadmap JSON file : ' + path);
        }
        return roadMapJSON;
    },

    hasFile: function (name) {
        try {
            var result = fs.statSync(name);
        } catch (e) {
            return false;
        }
        return true;
    },

    getBootInfo: function () {
        let bootInfo = new BootInfo(),
            bootFile = api.getBootFilePath();

        if (api.hasFile(bootFile)) {
            let boot = require(bootFile);
            console.log('Booting...');
            boot.run(bootInfo);
            console.log('..Done!');
        }
        return bootInfo;
    },

    getConfigValue: function (key, dfault) {
        if (_.isNull(api.config)) {
            let configPath = api.getConfigFilePath();
            if (api.hasFile(configPath)) {
                api.config = api.getJsonFromFile(configPath);
            }
        }
        if (api.config.hasOwnProperty(key)) {
            return api.config[key];
        }
        if (_.isUndefined(dfault)) {
            throw new Error('Missing config value "' + key + '"');
        }
        return dfault;
    }
};

module.exports = api;