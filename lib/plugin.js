'use strict';

var _ = require('lodash'),
    Tunnel = require('./Tunnel');

var REQUIRED_OPTS = {
    HOST: 'host',
    PORTS: 'ports',
    LOCAL_PORT: 'localport'
};

module.exports = function (gemini, opts) {
    if (opts.enabled === false) {
        return;
    }

    validateOpts(opts);

    openTunnel(gemini, opts);
};

function validateOpts(opts) {
    _.forEach(REQUIRED_OPTS, function (option) {
        if (!_.has(opts, option)) {
            throw new Error('Missing required option: ' + option);
        }
    });
}

function openTunnel(gemini, opts) {
    var tunnel;

    gemini.on('startRunner', function () {
        return Tunnel.openWithRetries(opts, opts.retries).then(function (createdTunnel) {
            tunnel = createdTunnel;
            gemini.config.getBrowserIds().forEach(function (id) {
                gemini.config.forBrowser(id).rootUrl = createdTunnel.proxyUrl;
            });
        });
    });

    gemini.on('endRunner', function () {
        return tunnel && tunnel.close();
    });
}
