define([ '../env', '../Module' ], function (env, Module) {
	var _hasOwnProperty = Object.prototype.hasOwnProperty;

	return {
		/**
		 * Creates a test function for the adapter registry that checks to see if the Value from a function call matches
		 * the expected value.
		 * @param expectedValue The expected value.
		 * @returns {Function(Object):boolean}
		 */
		isValue: function (/**Value*/ expectedValue) {
			return function (/**Object*/ callInfo) {
				return expectedValue === callInfo.callee;
			};
		},

		/**
		 * Determines whether or not an object is an empty object.
		 * @returns {boolean}
		 */
		isEmpty: function (/**Object*/ obj) {
			for (var k in obj) {
				if (_hasOwnProperty.call(obj, k)) {
					return false;
				}
			}

			return true;
		},

		/**
		 * Creates a test function for the adapter registry that checks to see if the Value from a function call
		 * matches the value of a module.
		 * @param moduleId The module ID.
		 * @returns {Function(Object):boolean}
		 */
		isModule: function (/**string*/ moduleId) {
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
	};
});