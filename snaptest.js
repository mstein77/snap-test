'use strict';

var fs = require('fs'),
    _ = require('lodash'),
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

    var bootInfo = utils.getBootInfo();

    let no = 0;
    let failed = [];
    let skipped = 0;

    let fixTests = utils.getTestcases();

    for (target in roadMap) {
        no++;

        if (!_.isEmpty(fixTests)) {
            if (!_.contains(fixTests, no)) {
                skipped++;
                continue;
            }
        }

        console.log('');
        console.log( 'Request #' + no + ' ==================');
        var targetFilePath = utils.getSouvenirPathForTarget(souvenirPath, target);
        try {
            var targetJson = utils.getJsonFromFile(targetFilePath);
        } catch (e) {
            console.log('ERROR - Skipping target "' + target + '": ' + e);
            failed.push(no);
            continue;
        }
        payload = roadMap[target];
        url = urlPrefix + target;

        response = utils.getHttpResponse(url, payload, bootInfo.getHeaders());
        if (_.isNull(response)) {
            console.log(colors.red('ERROR! Request timed out!'));
            failed.push(no);
        }
        if (response.statusCode !== targetJson.statusCode) {
            console.log(colors.red('ERROR: Status code mismatch!'));
            console.log('--- EXPECTED ---');
            console.log(targetJson.statusCode);
            console.log('--- ACTUAL ---');
            console.log(response.statusCode);
            failed.push(no);
        } else if (response.body !== targetJson.body) {
            console.log(colors.red('ERROR: Body mismatch!'));
            console.log('--- DIFF ---');
            printDiff(response.body, targetJson.body);
            failed.push(no);
        } else {
            console.log(colors.green('OK!'));
        }
    }

    console.log('');
    console.log('==========================');
    let status = [];
    let fail = failed.length;
    let succ = no - skipped - fail;
    if (skipped > 0) {
        status.push(colors.blue(skipped + ' skipped'));
    }
    if (fail > 0) {
        status.push(colors.red(fail + ' failed'))
    }
    if (succ > 0) {
        status.push(colors.green(succ + ' successful'))
    }

    console.log(' Summary: ' + no + ' tests found [ ' + status.join(', ') + ' ]');

    if (fail) {
        console.log(colors.red(' Failed tests: ' + failed.join(',')));
    }
}

var args = utils.getArguments();
if (args.hasOwnProperty('args') || args.length === 1) {
    var roadMapPath = utils.getRoadMapPath();
    var baseUrl = utils.getBaseUrlFromArguments();

    doSnapTest(roadMapPath, baseUrl);
} else {
    args.printHelp();
}


function printDiff(expected, current) {

    let diff = null,
        expectedJson = false,
        currentJson = false;

    try {
        expectedJson = JSON.parse(expected);
        currentJson = JSON.parse(current);
        diff = jsdiff.diffJson(currentJson, expectedJson);
        if (diff.length === 1) {
            diff = null;
        }
    } catch (e) {
    }

    if (_.isNull(diff)) {
        diff = jsdiff.diffWords(current, expected);
    }

    diff.forEach(function (part) {
        var bgClr = part.added ? 'bgGreenBright' :
            part.removed ? 'bgRedBright' : null;
        var clr = part.added ? 'black' :
            part.removed ? 'whiteBright' : null;
        if (_.isNull(clr)) {
            process.stderr.write(part.value);
        } else {
            process.stderr.write(colors[bgClr][clr](part.value));
        }
    })
};