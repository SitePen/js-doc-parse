define([ 'dojo/_base/lang', 'dojo/AdapterRegistry', './env', './Module', './node!util' ], function (lang, AdapterRegistry, env, Module, util) {
	var handlers = new AdapterRegistry();

	/**
	 * Creates a test function for the adapter registry that checks to see if the Value from a function call matches
	 * the expected value.
	 * @returns {Function(Object):boolean}
	 */
	function isValue(/**Value*/ expectedValue) {
		return function (/**Object*/ callInfo) {
			return expectedValue === callInfo.value;
		};
	}

	/**
	 * Determines whether or not an object is an empty object.
	 * @returns {boolean}
	 */
	function isEmpty(/**Object*/ obj) {
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				return false;
			}
		}

		return true;
	}

	handlers.register('define', isValue(env.globalScope.vars.define), function (callInfo, args) {
		var id = args[args.length - 3],
			dependencies = args[args.length - 2],
			factory = args[args.length - 1];

		id = id ? id.value : env.file.moduleId;
		dependencies = dependencies ? dependencies.value : [];

		console.debug('Handling define call for module', id);

		var module = Module.get(id, true);

		for (var i = 0, dependency; dependencies[i] && (dependency = Module.get(env.file.resolveRelativeId(dependencies[i].value), true)); ++i) {
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
			dependency.reverseDependencies.push(module);
		}

		// TODO: Handle exports object
		// TODO: Figure out what to do if factory returns more than one thing
		module.value = factory.returns[0];
	});

	handlers.register('require', isValue(env.globalScope.vars.require), function (config, dependencies, callback) {
		console.debug('Handling require call', arguments);
	});

	return handlers;
});