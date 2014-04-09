"use strict";

var http = require('http')
var express = require('express')
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs')

var FrameDumpServer = require('./lib/framedump-server').FrameDumpServer;
var OscServer = require('./lib/osc-server').OscServer;
var BundleServer = require('./lib/bundle-server').BundleServer;

var config = require('./config.json')

var ENGI = config.server.engiPath
var PROJECT = argv._[0] || ENGI
var listenHost = argv.i || config.server.host
var listenPort = argv.p || config.server.port

if (argv.h || argv.help) {
	return console.log('usage: node server.js -i 127.0.0.1 -p 8000 [/path/to/alt/project]')
}

console.log('Project path: ', PROJECT)
console.log('URL: http://'+listenHost+':'+listenPort)

function showFolderListing(reTest) {
	return function(req, res, next) {
		fs.readdir(PROJECT + req.path, function(err, files) {
			if (err) {
				console.warn(err.stack);
				files = [];
			}

			res.send(files.filter(function(file) {
				return reTest.test(file);
			}));
		});
	}
}

function downloadHandler(req, res) {
	var path = PROJECT + decodeURIComponent(req.path.substring(3))

	fs.exists(path, function(exists) {
		if (!exists)
			return res.send(404);

		res.header('Content-Type', 'application/octet-stream');
		fs.createReadStream(path).pipe(res);
	});
}

var app = express()
	.use(express.logger(':remote-addr :method :url :status :res[content-length] - :response-time ms'))
	.use(function(req, res, next) {
		if (req.url.indexOf('?_') > -1)
			req.url = req.url.substring(0, req.url.indexOf('?_'))
		next()
	})
	.use(express['static'](ENGI, { maxAge: 60 * 60 * 24 * 1000 }))
	.use(express['static'](PROJECT, { maxAge: 0 }))
	.use('/node_modules',
		express['static'](__dirname+'/node_modules',
			{ maxAge: 60 * 60 * 24 * 1000 }))
	// set no-cache headers for the rest
	.use(function(req, res, next) {
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
		res.setHeader('Expires', 0)
		next()
	})
	.get(/^\/data\/(graphs|textures|scenes|audio|video|jsons)\/$/, showFolderListing(/^[^.].*$/))
	.get(/^\/dl\/data\/(graphs|textures|audio|video|jsons)\/[^\/]*$/, downloadHandler)
	.post(/^\/data\/graphs\/[^\/]*\.json$/, function(req, res, next) {
		var savePath = decodeURIComponent(req.path)
			.replace(/graphs\/[^a-zA-Z0-9\ \.\-\_]/, '_')

		if (!/\.json$/.test(savePath))
			savePath = savePath+'.json'

		var stream = fs.createWriteStream(PROJECT + savePath)
		stream.on('error', next)
		stream.on('close', function() {
			res.send({}); // reply with an empty object
		});
		req.pipe(stream);
	});

new BundleServer(ENGI + 'plugins/').listen(app);

if (config.server.enableFrameDumping)
	new FrameDumpServer().listen(app);

app.use(express.errorHandler());

var httpServer = http.createServer(app);
httpServer.listen(listenPort, listenHost);

if (config.server.enableOSC)
	new OscServer().listen(httpServer);

