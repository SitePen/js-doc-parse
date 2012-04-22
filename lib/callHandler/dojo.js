define([
	'dojo/AdapterRegistry',
	'../env',
	'../Module'
], function (AdapterRegistry, env, Module) {
	var handlers = new AdapterRegistry();

	function isModule(/**string*/ moduleId) {
		return function (/**Object*/ callInfo) {
			// Avoid circular requests for the module while it is being processed
			if (moduleId === env.file.moduleId) {
				return false;
			}

			return Module.get(moduleId).value === callInfo.callee;
		};
	}

	handlers.register('declare', isModule('dojo/_base/declare'), function (callInfo, args) {
		console.log('handling declare');
	});

	return handlers;
});