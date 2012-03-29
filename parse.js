define([ './lib/esprimaParser', './lib/env', './lib/File', './lib/Module', './lib/node!fs', './lib/node!util' ], function (parse, env, File, Module, fs, util) {
	env.parse = parse;

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
			//Module.getByFile(new File(path));
			//console.log(util.inspect(parse(fs.readFileSync(path, 'utf-8')), null, null));

			env.file = new File(path);
			parse(env.file.source);
			env.file = undefined;
			console.log(util.inspect(env.globalScope, null, null));
		}
	});

	console.log("\nModules:\n", util.inspect(Module.getAll(), null, 6));
});