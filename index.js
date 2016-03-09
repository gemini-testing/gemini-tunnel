'use strict';

var _ = require('lodash'),
    util = require('util'),
    Tunnel = require('ssh-tun'),
    q = require('q');

var REQUIRED_OPTS = {
    HOST: 'host',
    PORTS: 'ports',
    LOCAL_PORT: 'localport'
};

var DEFAULT_PROTOCOL = 'http';

module.exports = function (gemini, opts) {
    if (!_.isObject(opts) || opts.enabled === false) {
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
        return q
            .invoke(function () {
                return _.isFunction(opts.localport) ? opts.localport() : opts.localport;
            })
            .then(function (localport) {
                return Tunnel.openWithRetries(
                    _.extend(opts, { localport: localport }),
                    opts.retries
                );
            })
            .then(function (createdTunnel) {
                tunnel = createdTunnel;
                gemini.config.getBrowserIds().forEach(function (id) {
                    var protocol = opts.protocol || DEFAULT_PROTOCOL,
                        proxyUrl = createdTunnel.proxyUrl;

                    gemini.config.forBrowser(id).rootUrl = util.format('%s://%s', protocol, proxyUrl);
                });
            });
    });

    gemini.on('endRunner', function () {
        return tunnel && tunnel.close();
    });
}
