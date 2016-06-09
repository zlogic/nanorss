var persistenceconfiguration = require('../../lib/services/persistenceconfiguration');
var path = require('path');
var testdir = require('./testdir');

persistenceconfiguration.options.storage = path.resolve(testdir.tmpdir, "nanoRSS.sqlite");
