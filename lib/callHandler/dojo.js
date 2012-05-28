define([
	'dojo/AdapterRegistry',
	'dojo/_base/lang',
	'dojo/aspect',
	'../env',
	'../Module',
	'../Value',
	'../console',
	'./util'
], function (AdapterRegistry, lang, aspect, env, Module, Value, console, util) {
	/**
	 * Mixes together Value object properties.
	 */
	function handleMixin(callInfo, args) {
		var destination = args[0].evaluated;

		for (var i = 1, source; (source = args[i]); ++i) {
			lang.mixin(destination.properties, source.evaluated.properties);
		}

		return destination;
	}

	/**
	 * Creates a variable in the global scope and sets it to a given value.
	 * @param fullIdentifier A dot-separated accessor string for the variable to create.
	 * @param value The value to assign to the variable.
	 * @param context If a context is given, the variable will be set as a property of the context object instead
	 * of the global object.
	 */
	function setGlobalObject(/**string*/ fullIdentifier, /**Value*/ value, /**Value?*/ context) {
		var identifier,
			lastContext,
			useGlobalScope = false;

		fullIdentifier = fullIdentifier.split('.');
		identifier = fullIdentifier.shift();

		// Context object not provided, use global scope as context
		if (!context || context.type === Value.TYPE_UNDEFINED) {
			context = env.globalScope.getVariable(identifier);
			useGlobalScope = true;
		}

		// The root object does not exist
		if (context.type === Value.TYPE_UNDEFINED) {
			context = new Value({ type: Value.TYPE_OBJECT });

			if (useGlobalScope) {
				env.globalScope.addVariable(identifier);
				env.globalScope.setVariableValue(identifier, context);
			}
		}

		// Iterate through each property accessor, creating objects as necessary
		while (fullIdentifier.length > 1) {
			identifier = fullIdentifier.shift();
			lastContext = context;
			context = context.getProperty(identifier);
			if (!context || context.type === Value.TYPE_UNDEFINED) {
				context = new Value({ type: Value.TYPE_OBJECT });
				lastContext.setProperty(identifier, context);
			}
		}

		// Set last property regardless of whether or not it already exists
		context.setProperty(fullIdentifier, value);

		return value;
	}

	var handlers = new AdapterRegistry(),
		_hasOwnProperty = Object.prototype.hasOwnProperty;

	/**
	 * Manually configure the scopeMap so global properties for dijit and dojox reference the same object.
	 */
	handlers.register('configureScopeMap', util.matchesIdentifier('dojo.__docParserConfigureScopeMap'), function (callInfo, args) {
		var scopeMap = args[0].evaluated.properties,
			scopeName;

		for (var k in scopeMap) {
			if (!_hasOwnProperty.call(scopeMap, k) || k === 'prototype') {
				continue;
			}

			scopeName = scopeMap[k].properties[0].value;

			env.globalScope.addVariable(scopeName);
			env.globalScope.setVariableValue(scopeName, scopeMap[k].properties[1]);
		}
	});

	/**
	 * The Dojo loader registers AMD modules as global objects by default in order to ensure backwards-compatibility,
	 * so we need to do that too.
	 */
	handlers.register('define', util.isValue(env.globalScope.vars.define), function (callInfo, args) {
		var id = (args[args.length - 3] || {}).evaluated;

		// ID can be explicitly defined or come from the filename
		id = id ? id.value : env.file.moduleId;

		// This relies on the dojo adapter being registered after the amd adapter
		var module = Module.get(id),
			currentGlobalObject;

		currentGlobalObject = env.globalScope.getVariable(id.split('/'));

		if (!currentGlobalObject || currentGlobalObject.type === Value.TYPE_UNDEFINED) {
			setGlobalObject(id.replace(/\//g, '.'), module.value);
		}

		return module;
	});

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
			prototype = new Value({ type: Value.TYPE_OBJECT });
		}

		var mixinModules = [];

		if (mixins.type === Value.TYPE_ARRAY) {
			mixins = mixins.toArray();
			mixinModules = mixins.map(getMixinModule);
		}
		else if (mixins.type !== Value.TYPE_NULL && mixins.type !== Value.TYPE_UNDEFINED) {
			mixins = [ mixins ];
			mixinModules = [ getMixinModule(mixins[0]) ];
		}
		else {
			mixins = [];
		}

		// Flatten any nested arrays
		mixinModules = mixinModules.concat.apply([], mixinModules);

		// The newly created constructor
		var value = new Value({
			type: Value.TYPE_CONSTRUCTOR,
			mixins: mixinModules
		});

		value.metadata.classlike = true;

		// An instance of the first mixin is the delegate for the new constructor, if one exists
		if (mixins.length) {
			prototype.setProperty('prototype', new Value({ type: Value.TYPE_INSTANCE, value: mixins[0] }));
		}

		// All subsequent mixins have their properties copied over to the new constructor’s prototype
		for (var i = 1, mixin; (mixin = mixins[i]); ++i) {
			mixin = mixin.getProperty('prototype');

			// Only copy over existing prototype properties;
			// TODO: May want to copy metadata regardless, though
			for (var k in mixin.properties) {
				if (_hasOwnProperty.call(mixin.properties, k) && !_hasOwnProperty.call(prototype.properties, k)) {
					prototype.setProperty(k, mixin.properties[k]);
				}
			}
		}

		value.setProperty('prototype', prototype);

		if (declaredClass) {
			if (declaredClass.type !== Value.TYPE_STRING) {
				console.info('Cannot set object from variable');
			}
			else {
				prototype.setProperty('declaredClass', declaredClass.value);
				setGlobalObject(declaredClass.value, value);
			}
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
			lastContext;

		if (fullIdentifier.type !== Value.TYPE_STRING) {
			console.info('Cannot get object from variable');
			return new Value();
		}

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

	handlers.register('setObject', util.isModuleProperty('dojo/_base/lang', 'setObject'), function (callInfo, args) {
		var fullIdentifier = (args[0] || {}).evaluated,
			value = (args[1] || {}).evaluated,
			context = (args[2] || {}).evaluated;

		if (fullIdentifier.type !== Value.TYPE_STRING) {
			console.info('Cannot set object by variable');
			return new Value();
		}

		return setGlobalObject(fullIdentifier.value, value, context);
	});

	handlers.register('deprecated', util.isModuleProperty('dojo/_base/kernel', 'deprecated'), function (callInfo, args) {
		var message = ((args[0] || {}).evaluated || {}).value || '',
			extra = ((args[1] || {}).evaluated || {}).value || '',
			removal = ((args[2] || {}).evaluated || {}).value || '';

		message += extra ? ' ' + extra : '';
		message += removal ? ' -- will be removed in version: ' + removal : '';

		env.functionScope.relatedFunction.metadata.isDeprecated = message;
	});

	handlers.register('experimental', util.isModuleProperty('dojo/_base/kernel', 'experimental'), function (callInfo, args) {
		var message = ((args[1] || {}).evaluated || {}).value || '';

		env.functionScope.relatedFunction.metadata.isExperimental = message || true;
	});

	(function legacyModules() {
		var modulesInProgress = [];

		handlers.register('legacyProvide', util.matchesIdentifier('dojo.provide'), function (callInfo, args) {
			if (!args[0] || args[0].evaluated.type !== Value.TYPE_STRING) {
				return;
			}

			var legacyId = args[0].evaluated.value,
				module = new Module(legacyId.replace(/\./g, '/'));

			module.value = new Value({ type: Value.TYPE_OBJECT });
			setGlobalObject(legacyId, module.value);

			modulesInProgress.push(module);
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
			if (modulesInProgress.length && modulesInProgress[modulesInProgress.length - 1].file === state.file) {
				var currentModule = modulesInProgress.pop();
				currentModule.value = env.globalScope.getVariable(currentModule.id.split('/'));
				currentModule.value.relatedModule = currentModule;
			}

			return state;
		});
	}());

	return handlers;
});