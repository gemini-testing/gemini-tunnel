var plugin = require('../../lib/plugin'),
    Tunnel = require('../../lib/Tunnel'),
    q = require('q'),
    qEmitter = require('qemitter'),
    inherit = require('inherit'),
    _ = require('lodash'),
    events = require('events');

describe('plugin', function () {
    var sandbox = sinon.sandbox.create(),
        gemini;

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

            expect(gemini.on).to.be.not.called;
        });

        it('should do nothing if plugin is not enabled', function () {
            var opts = { enabled: false };

            sandbox.spy(gemini, 'on');
            plugin(gemini, opts);

            expect(gemini.on).to.be.not.called;
        });

        it('should enable plugin if opts.enabled is not set', function () {
            var opts = buildGeminiOpts();

            sandbox.spy(gemini, 'on');
            plugin(gemini, opts);

            expect(gemini.on).to.be.called;
        });

        it('should throw if no remote host passed in options', function () {
            var opts = {
                ports: 'ports',
                localport: 'localport'
            };

            expect(function () { plugin(gemini, opts); })
                .to.throw('Missing required option: host');
        });

        it('should throw if no ports range passed', function () {
            var opts = {
                host: 'host',
                localport: 'localport'
            };

            expect(function () { plugin(gemini, opts); })
                .to.throw('Missing required option: ports');
        });

        it('should throw if no local port passed', function () {
            var opts = {
                host: 'host',
                ports: 'ports'
            };

            expect(function () { plugin(gemini, opts); })
                .to.throw('Missing required option: localport');
        });
    });

    describe('gemini events', function () {
        beforeEach(function () {
            sandbox.spy(gemini, 'on');
        });

        it('should subscribe for startRunner event', function () {
            plugin(gemini, buildGeminiOpts());

            expect(gemini.on).to.be.calledWith('startRunner');
        });

        it('should subscribe for endRunner event', function () {
            plugin(gemini, buildGeminiOpts());

            expect(gemini.on).to.be.calledWith('endRunner');
        });

        it('should try open tunnel with retries set in opts on startRunner event', function () {
            var opts = buildGeminiOpts(),
                openWithRetries = sandbox.stub(Tunnel, 'openWithRetries');

            opts.retries = 5;

            openWithRetries.returns(q.resolve());
            plugin(gemini, opts);
            gemini.emit('startRunner');

            expect(openWithRetries).to.be.calledWith(opts, 5);
        });

        it('should replace urls from config with urls to remote host where tunnel opened', function () {
            var opts = buildGeminiOpts({
                    host: 'some_host',
                    ports: { min: 1, max: 1 }
                }),
                gemini = mimicGeminiConfig({
                    browserId: 'ya_browser',
                    oldRoot: 'random-host.com'
                }, sandbox);

            sandbox.stub(Tunnel.prototype, 'open');
            Tunnel.prototype.open.returns(q());

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                expect(gemini.config.forBrowser('ya_browser').rootUrl).to.contain('some_host:1');
            });
        });

        it('should should use prtocol from opts in resulting root url', function  () {
            var opts = buildGeminiOpts({
                    host: 'some_host',
                    ports: { min: 1, max: 1 },
                    protocol: 'https'
                }),
                gemini = mimicGeminiConfig({
                    browserId: 'ya_browser',
                    oldRoot: 'http://random-host.com'
                }, sandbox);

            sandbox.stub(Tunnel.prototype, 'open');
            Tunnel.prototype.open.returns(q());

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                expect(gemini.config.forBrowser('ya_browser').rootUrl).to.contain('https://');
            });
        });

        it('should should use prtocol `http` by default in resulting root url', function  () {
            var opts = buildGeminiOpts({
                    host: 'some_host',
                    ports: { min: 1, max: 1 }
                }),
                gemini = mimicGeminiConfig({
                    browserId: 'ya_browser',
                    oldRoot: 'http://random-host.com'
                }, sandbox);

            sandbox.stub(Tunnel.prototype, 'open');
            Tunnel.prototype.open.returns(q());

            plugin(gemini, opts);
            return gemini.emitAndWait('startRunner').then(function () {
                expect(gemini.config.forBrowser('ya_browser').rootUrl).to.contain('http://');
            });
        });
    });
});

function buildGeminiOpts (opts) {
    opts = opts || {};

    return _.defaults(opts, {
        host: 'host',
        ports: 'ports',
        localport: 'localport'
    });
}

function mimicGeminiConfig (opts, sandbox) {
    var Constructor = inherit(qEmitter, {
            config: {
                getBrowserIds: sandbox.stub(),
                forBrowser: sandbox.stub()
            }
        }),
        emitter = new Constructor();

    emitter.config.getBrowserIds.returns([opts.browserId]);
    emitter.config.forBrowser.withArgs(opts.browserId).returns({ rootUrl: opts.oldRoot });

    return emitter;
}
