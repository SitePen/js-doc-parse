define([
	'dojo/AdapterRegistry',
	'../env',
	'../Module',
	'../Value',
	'./util'
], function (AdapterRegistry, env, Module, Value, util) {
	var handlers = new AdapterRegistry();

	handlers.register('declare', util.isModule('dojo/_base/declare'), function (callInfo, args) {
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