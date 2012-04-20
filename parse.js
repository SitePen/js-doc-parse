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
			Module.getByFile(new File(path));
		}
	});

	console.log("\nModules:\n", util.inspect(Module.getAll(), null, 6));

//	console.log(Module.get("dojo/_base/NodeList").value);
});