var httpSync = require('http-sync'),
    fs = require('fs'),
    _ = require('lodash'),
    rmdirRecursive = require('rimraf'),
    md5 = require('md5');

var api = {
    arguments: null,

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

    getHttpResponse: function (url, payload) {
        var headers = {},
            body = null,
            method = _.isNull(payload) ? 'GET' : 'POST';

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
        request.setTimeout(50000, function () {
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

    getRoadMapPathFromArguments: function () {
        var path = api.shiftArgument();
        if (_.isNull(path)) {
            return null;
        }
        if (!_.endsWith(path.toLowerCase(), '.json')) {
            path = path + '.json';
        }
        return path;
    },

    getSouvenirIdForRoadMapPath: function (path) {
        return md5(fs.realpathSync(path));
    },

    getSouvenirPathForRoadMapPath: function (path) {
        var souvenirPath =   __dirname + '/souvenirs/' + api.getSouvenirIdForRoadMapPath(path);
        return souvenirPath;
    },

    getSouvenirPathForTarget: function (souvenirPath, target) {
        var targetId = md5(target);
        var path = souvenirPath + '/' + targetId + '.json';
        return path;
    },

    getBaseUrlFromArguments: function () {
        var baseUrl = api.shiftArgument();
        if (_.isNull(baseUrl)) {
            return '';
        }
        return baseUrl;
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
    }
};

module.exports = api;