define([
	'./lib/env',
	'./lib/File',
	'./lib/Module',
	'./lib/node!fs',
	'./lib/node!util',
	'./lib/console',
	'./lib/esprimaParser'
], function (env, File, Module, fs, util, console) {
	env.ready(function(){
		console.status('Processing scripts…');

		require.rawConfig.commandLineArgs.slice(2).forEach(function processPath(parent, path) {
			if (typeof path === 'number') {
				path = '';
			}

			path = (parent + (path ? '/' + path : '')).replace(/\/{2,}/g, '/');
			var stats;

			try {
				stats = fs.statSync(path);
			}
			catch (error) {
				console.error(error);
				return;
			}

			if (stats.isDirectory()) {
				fs.readdirSync(path).sort().forEach(processPath.bind(this, path));
			}
			else if (stats.isFile() && /\.js$/.test(path)) {
				// TODO: This whole thing revolves around Modules because that's what an AMD system uses, but we really
				// ought to isolate modules to the AMD callHandler so this tool can be used as an even more general
				// documentation parser.

				// Skip excluded paths
				if (env.config.excludePaths.some(function (exclude) {
					return typeof exclude === 'string' ?
						path.indexOf(exclude) === 0 :
						exclude.test(path);
				})) {
					return;
				}

				Module.getByFile(new File(fs.realpathSync(path)));
			}
		});

		console.status('Exporting results…');

		env.exporters.forEach(function (exporter) {
			exporter.run(exporter.config);
		});

		console.status('Done!');
	});
});