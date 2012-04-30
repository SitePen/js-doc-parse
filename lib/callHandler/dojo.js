define([
	'dojo/AdapterRegistry',
	'dojo/_base/lang',
	'../env',
	'../Module',
	'../Value',
	'./util'
], function (AdapterRegistry, lang, env, Module, Value, util) {
	function handleMixin(callInfo, args) {
		var destination = args[0].evaluated;

		for (var i = 1, source; (source = args[i]); ++i) {
			lang.mixin(destination.properties, source.evaluated.properties);
		}

		return destination;
	}

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

	handlers.register('mixin', util.isModuleProperty('dojo/_base/lang', 'mixin'), handleMixin);
	handlers.register('safeMixin', util.isModuleProperty('dojo/_base/declare', 'safeMixin'), handleMixin);
	handlers.register('extend', util.isModuleProperty('dojo/_base/lang', 'extend'), function (callInfo, args) {
		var destination = args[0].evaluated.getProperty('prototype');

		for (var i = 1, source; (source = args[i]); ++i) {
			lang.mixin(destination.properties, source.evaluated.properties);
		}

		return destination;
	});

	return handlers;
});