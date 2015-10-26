var fs = require('fs'),
    _ = require('lodash'),
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

    var no = 0;

    for (target in roadMap) {
        no++;
        if (!_.isEmpty(fixTestcases) && !_.contains(fixTestcases, no)) {
            continue;
        }

        console.log('');
        console.log( 'Testcase #' + no + ' ==================');

        payload = roadMap[target];
        url = urlPrefix + target;

        response = utils.getHttpResponse(url, payload, bootInfo.getHeaders());
        if (_.isNull(response)) {
            console.log('ERROR! Request timed out!');
        }

        var targetFilePath = utils.getSouvenirPathForTarget(souvenirPath, target);
        fs.writeFileSync(targetFilePath, JSON.stringify(response));

        console.log(' --> ' + response.statusCode + ': Stored ' + response.body.length + ' bytes as souvenir');
    }
}

var args = utils.getArguments();
if (args.hasOwnProperty('args') || args.length === 1) {
    var roadMapPath = utils.getRoadMapPath();
    var baseUrl = utils.getBaseUrlFromArguments();

    doSnapShot(roadMapPath, baseUrl);
} else {
    args.printHelp();
}