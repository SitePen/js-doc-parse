define([
	'dojo/_base/lang',
	'dojo/AdapterRegistry',
	'./env',
	'./Module',
	'./Value',
	'./node!util'
], function (lang, AdapterRegistry, env, Module, Value, util) {
	var handlers = new AdapterRegistry();

	function valueToArray(/**Value*/ value) {
		var array = [], obj = value.properties;
		for (var k in obj) {
			if (obj.hasOwnProperty(k) && !isNaN(k)) {
				array[k] = obj[k];
			}
		}

		return array;
	}

	/**
	 * Creates a test function for the adapter registry that checks to see if the Value from a function call matches
	 * the expected value.
	 * @returns {Function(Object):boolean}
	 */
	function isValue(/**Value*/ expectedValue) {
		return function (/**Object*/ callInfo) {
			return expectedValue === callInfo.callee;
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
		var id = (args[args.length - 3] || {}).evaluated,
			dependencyIds = (args[args.length - 2] || {}).evaluated,
			factory = (args[args.length - 1] || {}).evaluated;

		// ID can be explicitly defined or come from the filename
		id = id ? id.value : env.file.moduleId;

		// TODO: If dependencyIds array is non-existent, need to scan for require(str) calls in the factory function
		// string, blah.
		dependencyIds = dependencyIds ? valueToArray(dependencyIds) : [];

		console.debug('Handling define call for module', id, 'with deps', dependencyIds.map(function (id) {
			return id.value;
		}).join(', '));

		var module = new Module(id),
			exports;

		for (var i = 0, dependency; dependencyIds[i]; ++i) {
			if (dependencyIds[i].value.indexOf('!') > -1) {
				console.warn('  Cannot resolve plugin dependency', dependencyIds[i].value);
				continue;
			}

			// These special module IDs should mean nothing to us because nobody should ever meddle with them
			if (dependencyIds[i].value in { require: 1, module: 1 }) {
				continue;
			}

			// Whatever was set on the exports object is the return value of the module
			if (dependencyIds[i].value === 'exports') {
				exports = factory.parameters[i];
				continue;
			}

			console.debug('  Resolving dependency', dependencyIds[i].value);

			dependency = Module.get(env.file.resolveRelativeId(dependencyIds[i].value));

			// Might be a dependency that is loaded but not assigned to a parameter in the factory, in which
			// case we are guaranteed that no properties have extended it
			if (factory.parameters[i]) {
				// Make sure anything that was augmented onto a parameter of the factory function
				// by the factory function is copied onto the actual Module that that parameter represents
				if (dependency.value && dependency.value.type !== Value.TYPE_UNDEFINED) {
					lang.mixin(dependency.value.properties, factory.parameters[i].properties);
				}
				else {
					// TODO: If the dependency has not resolved yet then the parser will accidentally override any
					// attachments that are intended to be overrides of the original functionality.
					// This might not be correct at all.
					dependency.value = factory.parameters[i];
				}
			}

			module.dependencies.push(dependency);
			dependency.reverseDependencies.push(module);
		}

		// TODO: Handle exports object
		// TODO: Figure out what to do if factory returns more than one thing
		module.value = exports || factory.returns[0];
	});

	handlers.register('require', isValue(env.globalScope.vars.require), function (config, dependencies, callback) {
		console.debug('Handling require call', arguments);
	});

	return handlers;
});