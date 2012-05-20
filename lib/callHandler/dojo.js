define([
	'dojo/AdapterRegistry',
	'dojo/_base/lang',
	'dojo/aspect',
	'../env',
	'../Module',
	'../Value',
	'./util'
], function (AdapterRegistry, lang, aspect, env, Module, Value, util) {
	function handleMixin(callInfo, args) {
		var destination = args[0].evaluated;

		for (var i = 1, source; (source = args[i]); ++i) {
			lang.mixin(destination.properties, source.evaluated.properties);
		}

		return destination;
	}

	var handlers = new AdapterRegistry();

	handlers.register('declare', util.isModule('dojo/_base/declare'), function (callInfo, args) {
		function getMixinModule(value) {
			// The mixin is not exposed as a module, i.e. it is local to the value itself
			// In this case it seems best to just lie and report the mixin’s mixins, but maybe it is
			// better to create a pseudo-module instead
			if (!value.relatedModule) {
				return value.mixins.slice(0);
			}

			return value.relatedModule;
		}

		var declaredClass = (args[args.length - 3] || {}).evaluated,
			mixins        = (args[args.length - 2] || {}).evaluated,
			prototype     = (args[args.length - 1] || {}).evaluated;

		// Composition with no prototype
		if (!mixins && prototype) {
			mixins = prototype;
			prototype = undefined;
		}

		var mixinModules = [];

		if (mixins.type === Value.TYPE_ARRAY) {
			mixinModules = mixins.toArray().map(getMixinModule);
		}
		else if (mixins.type !== Value.TYPE_NULL && mixins.type !== Value.TYPE_UNDEFINED) {
			mixinModules = [ getMixinModule(mixins) ];
		}

		// Flatten any nested arrays
		mixinModules = mixinModules.concat.apply([], mixinModules);

		var value = new Value({
			type: Value.TYPE_CONSTRUCTOR,
			mixins: mixinModules,
			properties: {
				prototype: prototype
			}
		});

		if (declaredClass) {
			env.globalScope.setVariableValue(declaredClass.value.split('.'), value);
		}

		return value;
	});

	handlers.register('mixin', util.isModuleProperty('dojo/_base/lang', 'mixin'), handleMixin);
	handlers.register('_mixin', util.isModuleProperty('dojo/_base/lang', '_mixin'), handleMixin);
	handlers.register('safeMixin', util.isModuleProperty('dojo/_base/declare', 'safeMixin'), handleMixin);
	handlers.register('extend', util.isModuleProperty('dojo/_base/lang', 'extend'), function (callInfo, args) {
		var destination = args[0].evaluated.getProperty('prototype');

		for (var i = 1, source; (source = args[i]); ++i) {
			lang.mixin(destination.properties, source.evaluated.properties);
		}

		return destination;
	});

	handlers.register('getObject', util.isModuleProperty('dojo/_base/lang', 'getObject'), function (callInfo, args) {
		var fullIdentifier = (args[0] || {}).evaluated,
			createObject = ((args[1] || {}).evaluated || {}).value,
			context = (args[2] || {}).evaluated,
			identifier,
			useGlobalScope = false,
			lastContext,
			value;

		fullIdentifier = fullIdentifier.value.split('.');
		identifier = fullIdentifier.shift();

		// Context object not provided, use global scope as context
		if (!context || context.type === Value.TYPE_UNDEFINED) {
			context = env.globalScope.getVariable(identifier);
			useGlobalScope = true;
		}

		// The root object does not exist
		if (context.type === Value.TYPE_UNDEFINED) {
			if (!createObject) {
				return context;
			}

			context = new Value({ type: Value.TYPE_OBJECT });

			if (useGlobalScope) {
				env.globalScope.addVariable(identifier);
				env.globalScope.setVariableValue(identifier, context);
			}
		}

		// Iterate through each property accessor, creating objects as necessary
		while ((identifier = fullIdentifier.shift())) {
			lastContext = context;
			context = context.getProperty(identifier);
			if (!context || context.type === Value.TYPE_UNDEFINED) {
				if (!createObject) {
					return context;
				}

				context = new Value({ type: Value.TYPE_OBJECT });
				lastContext.setProperty(identifier, context);
			}
		}

		return context;
	});

	(function legacyModules() {
		var modulesInProgress = [];

		handlers.register('legacyProvide', util.matchesIdentifier('dojo.provide'), function (callInfo, args) {
			if (!args[0] || args[0].evaluated.type !== Value.TYPE_STRING) {
				return;
			}

			var id = args[0].evaluated.value.replace(/\./g, '/');
			modulesInProgress.push(new Module(id));
		});

		handlers.register('legacyRequire', util.matchesIdentifier('dojo.require'), function (callInfo, args) {
			var currentModule = modulesInProgress[modulesInProgress.length - 1];

			if (!args[0] || args[0].evaluated.type !== Value.TYPE_STRING || currentModule.file !== env.file) {
				return;
			}

			var id = args[0].evaluated.value.replace(/\./g, '/'),
				dependency = Module.get(id);

			currentModule.dependencies.push(dependency);
			dependency.reverseDependencies.push(currentModule);
		});

		aspect.after(env, 'popState', function (state) {
			if (!modulesInProgress.length || modulesInProgress[modulesInProgress.length - 1].file !== state.file) {
				return state;
			}

			var currentModule = modulesInProgress.pop();
			currentModule.value = env.globalScope.getVariable(currentModule.id.split('/'));
			currentModule.value.relatedModule = currentModule;

			return state;
		});
	}());

	return handlers;
});