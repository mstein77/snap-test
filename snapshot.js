var fs = require('fs'),
    _ = require('lodash'),
    md5 = require('md5'),
    utils = require('./utils.js');

function doSnapShot(roadMapPath, urlPrefix) {
    var target,
        payload,
        response,
        url;

    var roadMap = utils.getRoadMapFromPath(roadMapPath);
    console.log('Processing road map file "' + roadMapPath + '":');
    var souvenirPath = utils.getSouvenirPathForRoadMapPath(roadMapPath);
    utils.mkEmptyDirSync(souvenirPath);

    for (target in roadMap) {
        payload = roadMap[target];
        url = urlPrefix + target;

        response = utils.getHttpResponse(url, payload);
        if (_.isNull(response)) {
            console.log('ERROR! Request timed out!');
        }

        var targetFilePath = utils.getSouvenirPathForTarget(souvenirPath, target);
        fs.writeFileSync(targetFilePath, JSON.stringify(response));

        console.log(' --> ' + response.statusCode + ': Stored ' + response.body.length + ' bytes as souvenir');
    }
}

var roadMapPath = utils.getRoadMapPathFromArguments();

if (_.isNull(roadMapPath)) {
    console.log('Usage: snapshot <filename> <baseurl>');
} else {
    var baseUrl = utils.getBaseUrlFromArguments();
    doSnapShot(roadMapPath, baseUrl);
}