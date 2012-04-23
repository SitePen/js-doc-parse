define([
	'dojo/AdapterRegistry',
	'../env',
	'../Module',
	'../Value'
], function (AdapterRegistry, env, Module, Value) {
	var handlers = new AdapterRegistry();

	function isModule(/**string*/ moduleId) {
		var module;
		return function (/**Object*/ callInfo) {
			// Avoid circular requests for the module while it is being processed
			if (moduleId === env.file.moduleId) {
				return false;
			}

			// Avoid re-retrieving the module over and over again, mostly to avoid peppering the console with
			// debug messages
			if (!module) {
				module = Module.get(moduleId);
			}

			return module.value === callInfo.callee;
		};
	}

	handlers.register('declare', isModule('dojo/_base/declare'), function (callInfo, args) {
		var declaredClass = (args[args.length - 3] || {}).evaluated,
			mixins        = (args[args.length - 2] || {}).evaluated,
			prototype     = (args[args.length - 1] || {}).evaluated;

		var mixinModules = [];

		if (mixins.type === Value.TYPE_ARRAY) {
			mixinModules = mixins.toArray().map(function (mixin) { return mixin.relatedModule; });
		}
		else if (mixins.type !== Value.TYPE_NULL && mixins.type !== Value.TYPE_UNDEFINED) {
			mixinModules = [ mixins.relatedModule ];
		}

		return new Value({
			type: Value.TYPE_CONSTRUCTOR,
			mixins: mixinModules,
			properties: {
				prototype: prototype
			}
		});
	});

	return handlers;
});