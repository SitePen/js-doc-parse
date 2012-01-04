define([ 'dojo/_base/lang', 'dojo/AdapterRegistry', './env', './Module', './ParseError', './node!util' ], function (lang, AdapterRegistry, env, Module, ParseError, util) {
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
			dependencyIds = args[args.length - 2],
			factory = args[args.length - 1];

		// ID can be explicitly defined or come from the filename
		id = id ? id.value : env.file.moduleId;

		// TODO: If dependencyIds array is non-existent, need to scan for require(str) calls in the factory function
		// string, blah.
		dependencyIds = dependencyIds ? dependencyIds.value : [];

		console.debug('Handling define call for module', id, 'with deps', dependencyIds.map(function (id) {
			return id.value;
		}).join(', '));

		var module = new Module(id);

		for (var i = 0, dependency; dependencyIds[i]; ++i) {
			if (dependencyIds[i].value.indexOf('!') > -1) {
				console.warn('  Cannot resolve plugin dependency', dependencyIds[i].value);
				continue;
			}

			// These modules should mean nothing to us because nobody should
			// ever meddle with them
			if (dependencyIds[i].value in { require: 1, module: 1 }) {
				continue;
			}

			// TODO: Deal with exports

			console.debug('  Resolving dependency', dependencyIds[i].value);

			try {
				dependency = Module.get(env.file.resolveRelativeId(dependencyIds[i].value));
			}
			// Keep parser from ignoring this error as being one that is coming from the AdapterRegistry
			catch(error) {
				throw new ParseError(error);
			}

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