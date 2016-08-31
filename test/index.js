var plugin = require('../'),
    Tunnel = require('ssh-tun'),
    q = require('q'),
    qEmitter = require('qemitter'),
    inherit = require('inherit'),
    _ = require('lodash'),
    events = require('events'),
    Tunnel = require('ssh-tun');

describe('plugin', function () {
    var sandbox = sinon.sandbox.create(),
        gemini;

    function buildGeminiOpts (opts) {
        opts = opts || {};

        return _.defaults(opts, {
            host: 'host',
            ports: 'ports',
            localport: 'localport',
            user: undefined
        });
    }

    function mimicGeminiConfig (opts) {
        opts = _.defaults(opts || {}, {
            browserId: 'default_browser',
            rootUrl: 'default-host.com'
        });

        var Constructor = inherit(qEmitter, {
                config: {
                    getBrowserIds: sandbox.stub(),
                    forBrowser: sandbox.stub()
                }
            }),
            emitter = new Constructor();

        emitter.config.getBrowserIds.returns([opts.browserId]);
        emitter.config.forBrowser.withArgs(opts.browserId).returns({ rootUrl: opts.rootUrl });

        return emitter;
    }

    beforeEach(function () {
        gemini = new events.EventEmitter();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('options', function () {
        it('should do nothing if opts is not an object', function () {
            var opts = 'I`m an object!';

            sandbox.spy(gemini, 'on');
            plugin(gemini, opts);

            assert.notCalled(gemini.on);
        });

        it('should do nothing if plugin is not enabled', function () {
            var opts = { enabled: false };

            sandbox.spy(gemini, 'on');
            plugin(gemini, opts);

            assert.notCalled(gemini.on);
        });

        it('should enable plugin if opts.enabled is not set', function () {
            var opts = buildGeminiOpts();

            sandbox.spy(gemini, 'on');
            plugin(gemini, opts);

            assert.called(gemini.on);
        });

        it('should throw if no remote host passed in options', function () {
            var opts = {
                ports: 'ports',
                localport: 'localport'
            };

            assert.throws(function () {
                return plugin(gemini, opts);
            }, 'Missing required option: host');
        });

        it('should throw if no ports range passed', function () {
            var opts = {
                host: 'host',
                localport: 'localport'
            };

            assert.throws(function () {
                return plugin(gemini, opts);
            }, 'Missing required option: ports');
        });

        it('should throw if no local port passed', function () {
            var opts = {
                host: 'host',
                ports: 'ports'
            };

            assert.throws(function () {
                return plugin(gemini, opts);
            }, 'Missing required option: localport');
        });

        describe('user option', function () {
            afterEach(function () {
                delete process.env.GEMINI_TUNNEL_USER;
            });

            it('should get user option value from env variable GEMINI_TUNNEL_USER', function () {
                var opts = buildGeminiOpts({ user: 'user1' }),
                    gemini = mimicGeminiConfig();

                process.env.GEMINI_TUNNEL_USER = 'user2';
                sandbox.stub(Tunnel, 'openWithRetries').returns(q.resolve(new Tunnel(opts)));

                plugin(gemini, opts);
                return gemini.emitAndWait('startRunner').then(function () {
                    assert.calledWithMatch(Tunnel.openWithRetries, { user: 'user2' });
                });
            });
        });

        describe('"localport" is a function', function () {
            var opts;

            beforeEach(function () {
                opts = buildGeminiOpts({ localport: sandbox.stub() });
                gemini = mimicGeminiConfig();
                sandbox.stub(Tunnel, 'openWithRetries').returns(q.resolve(new Tunnel(opts)));
            });

            it('should detect localport if promise is resolved', function () {
                opts.localport.returns(q.resolve(4444));

                plugin(gemini, opts);
                return gemini.emitAndWait('startRunner').then(function () {
                    assert.calledWithMatch(Tunnel.openWithRetries, { localport: 4444 });
                });
            });

            it('should throw if "localport" promise is rejected', function () {
                opts.localport.returns(q.reject(new Error('Could not find free port')));

                plugin(gemini, opts);
                return assert.isRejected(gemini.emitAndWait('startRunner'), 'Could not find free port');
            });
        });
    });

    describe('gemini events', function () {
        beforeEach(function () {
            sandbox.spy(gemini, 'on');
        });

        it('should subscribe for startRunner event', function () {
            plugin(gemini, buildGeminiOpts());

            assert.calledWith(gemini.on, 'startRunner');
        });

        it('should subscribe for endRunner event', function () {
            plugin(gemini, buildGeminiOpts());

            assert.calledWith(gemini.on, 'endRunner');
        });

        it('should try open tunnel with retries set in opts on startRunner event', function () {
            var opts = buildGeminiOpts({ retries: 5 }),
                gemini = mimicGeminiConfig();

            sandbox.stub(Tunnel, 'openWithRetries').returns(q.resolve(new Tunnel(opts)));

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                assert.calledWith(Tunnel.openWithRetries, opts, 5);
            });
        });

        it('should try to close tunnel on endRunner', function () {
            var opts = buildGeminiOpts(),
                gemini = mimicGeminiConfig();

            sandbox.stub(Tunnel.prototype, 'open').returns(q());
            sandbox.spy(Tunnel.prototype, 'close');

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                return gemini.emitAndWait('endRunner').then(function () {
                    assert.called(Tunnel.prototype.close);
                });
            });
        });

        it('should replace urls from config with urls to remote host where tunnel opened', function () {
            var opts = buildGeminiOpts({
                    host: 'some_host',
                    ports: { min: 1, max: 1 }
                }),
                gemini = mimicGeminiConfig({ browserId: 'ya_browser' });

            sandbox.stub(Tunnel.prototype, 'open');
            Tunnel.prototype.open.returns(q());

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                assert.include(gemini.config.forBrowser('ya_browser').rootUrl, 'some_host:1');
            });
        });

        it('should use protocol from opts in resulting root url', function () {
            var opts = buildGeminiOpts({
                    host: 'some_host',
                    ports: { min: 1, max: 1 },
                    protocol: 'https'
                }),
                gemini = mimicGeminiConfig({ browserId: 'ya_browser' });

            sandbox.stub(Tunnel.prototype, 'open');
            Tunnel.prototype.open.returns(q());

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                assert.include(gemini.config.forBrowser('ya_browser').rootUrl, 'https://');
            });
        });

        it('should use protocol `http` by default in resulting root url', function () {
            var opts = buildGeminiOpts({
                    host: 'some_host',
                    ports: { min: 1, max: 1 }
                }),
                gemini = mimicGeminiConfig({
                    browserId: 'ya_browser',
                    rootUrl: 'http://random-host.com'
                });

            sandbox.stub(Tunnel.prototype, 'open');
            Tunnel.prototype.open.returns(q());

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                assert.include(gemini.config.forBrowser('ya_browser').rootUrl, 'http://');
            });
        });

        it('should save paths in replaced urls where tunnel opened', function () {
            var opts = buildGeminiOpts({
                    host: 'some_host',
                    ports: { min: 1, max: 1 }
                }),
                gemini = mimicGeminiConfig({
                    browserId: 'ya_browser',
                    rootUrl: 'http://random-host.com/some/path'
                });

            sandbox.stub(Tunnel.prototype, 'open');
            Tunnel.prototype.open.returns(q());

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                assert.equal(gemini.config.forBrowser('ya_browser').rootUrl, 'http://some_host:1/some/path');
            });
        });
    });
});

