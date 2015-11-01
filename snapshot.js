'use strict';

var fs = require('fs'),
    _ = require('lodash'),
    colors = require('cli-color'),
    utils = require('./utils.js');

function doSnapShot(roadMapPath, urlPrefix) {
    var target,
        payload,
        response,
        url;

    var roadMap = utils.getRoadMapFromPath(roadMapPath);
    console.log('Processing road map file "' + roadMapPath + '":');

    var bootInfo = utils.getBootInfo();

    var souvenirPath = utils.getSouvenirPathForRoadMapPath(roadMapPath);
    var fixTestcases = utils.getTestcases();
    if (_.isEmpty(fixTestcases)) {
        utils.mkEmptyDirSync(souvenirPath);
    }

    var no = 0,
        skipped = 0,
        failed = 0,
        fail = [],
        bad = [];

    for (target in roadMap) {
        no++;
        if (!_.isEmpty(fixTestcases) && !_.contains(fixTestcases, no)) {
            skipped++;
            continue;
        }

        console.log('');
        console.log( 'Request #' + no + ' ==================');

        payload = roadMap[target];
        url = urlPrefix + target;

        response = utils.getHttpResponse(url, payload, bootInfo.getHeaders());
        if (_.isNull(response)) {
            failed++;
            fail.push(no);
            console.log('ERROR! Request timed out!');
            continue;
        }

        var targetFilePath = utils.getSouvenirPathForTarget(souvenirPath, target);
        fs.writeFileSync(targetFilePath, JSON.stringify(response));

        let code = response.statusCode;
        if ((code >= 400) && (code < 500)) {
            code = colors.magenta(code);
            bad.push(no);
        } else if (code >= 500) {
            code = colors.red(code);
            failed++;
            fail.push(no);
        } else {
            code = colors.green(code);
        }

        console.log(' --> ' + code + ': Stored ' + response.body.length + ' bytes as souvenir');
    }

    console.log('');
    console.log('==========================');
    let status = [];
    let succ = no - skipped - failed - bad.length;
    if (skipped > 0) {
        status.push(colors.blue(skipped + ' skipped'));
    }
    if (bad.length > 0) {
        status.push(colors.magenta(bad.length + ' bad'));
    }
    if (failed > 0) {
        status.push(colors.red(failed + ' failed'))
    }
    if (succ > 0) {
        status.push(colors.green(succ + ' successful'))
    }

    console.log(' Summary: ' + no + ' requests found [ ' + status.join(', ') + ' ]');

    if (fail.length > 0) {
        console.log(colors.red(' Failed requests: ' + fail.join(',')));
    }
    if (bad.length > 0) {
        console.log(colors.magenta(' Bad requests: ' + bad.join(',')));
    }


}

function coloredCode(code) {

}

var args = utils.getArguments();
if (args.hasOwnProperty('args') || args.length === 1) {
    var roadMapPath = utils.getRoadMapPath();
    var baseUrl = utils.getBaseUrlFromArguments();

    doSnapShot(roadMapPath, baseUrl);
} else {
    args.printHelp();
}