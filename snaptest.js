var fs = require('fs'),
    _ = require('lodash'),
    md5 = require('md5'),
    utils = require('./utils.js'),
    colors = require('cli-color'),
    jsdiff = require('diff');

function doSnapTest(roadMapPath, urlPrefix) {
    var target,
        payload,
        response,
        url;

    var roadMap = utils.getRoadMapFromPath(roadMapPath);
    console.log('Processing road map file "' + roadMapPath + '":');
    var souvenirPath = utils.getSouvenirPathForRoadMapPath(roadMapPath);

    for (target in roadMap) {
        console.log('==================');
        var targetFilePath = utils.getSouvenirPathForTarget(souvenirPath, target);

        try {
            var targetJson = utils.getJsonFromFile(targetFilePath);
        } catch (e) {
            console.log('ERROR - Skipping target "' + target + '": ' + e);
            continue;
        }
        payload = roadMap[target];
        url = urlPrefix + target;

        response = utils.getHttpResponse(url, payload);
        if (_.isNull(response)) {
            console.log(colors.red('ERROR! Request timed out!'));
        }
        if (response.statusCode !== targetJson.statusCode) {
            console.log(colors.red('ERROR: Status code mismatch!'));
            console.log('--- CURRENT ---');
            console.log(response.statusCode);
            console.log('--- EXPECTED ---');
            console.log(targetJson.statusCode);
            console.log('--- DIFF ---');
            printDiff(response.statusCode, targetJson.statusCode);
        } else if (response.body !== targetJson.body) {
            console.log(colors.red('ERROR: Body mismatch!'));
            console.log('--- CURRENT ---');
            console.log(response.body);
            console.log('--- EXPECTED ---');
            console.log(targetJson.body);
            console.log('--- DIFF ---');
            printDiff(response.body, targetJson.body);
        } else {
            console.log(colors.green('OK!'));
        }
    }
}

var roadMapPath = utils.getRoadMapPathFromArguments();

if (_.isNull(roadMapPath)) {
    console.log('Usage: snaptest <filename> <baseurl>');
} else {
    var baseUrl = utils.getBaseUrlFromArguments();
    doSnapTest(roadMapPath, baseUrl);
}

function printDiff(expected, current) {

    var diff = jsdiff.diffChars(expected, current);

    diff.forEach(function (part) {
        var clr = part.added ? 'green' :
            part.removed ? 'red' : null;
        if (_.isNull(clr)) {
            process.stderr.write(part.value);
        } else {
            process.stderr.write(colors[clr](part.value));
        }
    })
};