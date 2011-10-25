define([ 'dojo/_base/lang', 'dojo/AdapterRegistry', './env', './Module', './node!util' ], function (lang, AdapterRegistry, env, Module, util) {
	var handlers = new AdapterRegistry();

	function isValue(expectedValue) {
		return function (callInfo) {
			return expectedValue === callInfo.value;
		};
	}

	function isEmpty(obj) {
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				return false;
			}
		}

		return true;
	}

	handlers.register('define', isValue(env.globalScope.vars.define), function (callInfo, args) {
		console.debug('Handling define call for module', id);

		var id = args[args.length - 3],
			dependencies = args[args.length - 2],
			factory = args[args.length - 1];

		id = id ? id.value : env.file.moduleId;
		dependencies = dependencies ? dependencies.value : [];

		var module = Module(id);

		for (var i = 0, dependency; dependencies[i] && (dependency = Module(env.file.resolveRelativeId(dependencies[i].value))); ++i) {
			if (dependency.value.type !== 'undefined') {
				lang.mixin(dependency.value.properties, factory.parameters[i].value.properties);
			}
			else {
				// TODO: If the dependency has not resolved yet then the parser will accidentally override any
				// attachments that are intended to be overrides of the original functionality.
				// This might not be correct at all.
				dependency.value = factory.parameters[i];
			}

			module.dependencies.push(dependency);
		}

		// TODO: Handle exports object
		// TODO: Figure out what to do if factory returns more than one thing
		module.value = factory.returns[0];
	});

	handlers.register('require', isValue(env.globalScope.vars.require), function (config, dependencies, callback) {
		// Correct for 1-arg and 2-arg signatures
		if (arguments.length === 2) {
			callback = dependencies;
			dependencies = id;
			config = {};
		}
		else if (arguments.length === 1) {
			callback = id;
			dependencies = [];
			config = {};
		}

		console.debug('Handling require call', arguments);
	});

	return handlers;
});