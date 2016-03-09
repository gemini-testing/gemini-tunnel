var chai = require('chai');

global.assert = chai.assert;
global.sinon = require('sinon');

require('chai')
    .use(require('sinon-chai'))
    .use(require('chai-as-promised'));

sinon.assert.expose(chai.assert, { prefix: '' });
