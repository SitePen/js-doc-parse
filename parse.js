define([
	'./lib/env',
	'./lib/File',
	'./lib/Module',
	'./lib/node!fs',
	'./lib/node!util',
	'./lib/console',
	'./lib/esprimaParser'
], function (env, File, Module, fs, util, console) {
	require.rawConfig.commandLineArgs.slice(2).forEach(function processPath(parent, path) {
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
			fs.readdirSync(path).forEach(processPath.bind(this, path));
		}
		else if (stats.isFile() && /\.js$/.test(path)) {
			// TODO: This whole thing revolves around Modules because that's what an AMD system uses, but we really
			// ought to isolate modules to the AMD callHandler so this tool can be used as an even more general
			// documentation parser.
			Module.getByFile(new File(path));
		}
	});

	env.exporters.forEach(function (exporter) {
		exporter.run(exporter.config);
	});
});