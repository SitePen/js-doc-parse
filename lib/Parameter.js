define([ 'dojo/_base/kernel' ], function (dojo) {
	function Parameter(kwArgs) {
		if (!(this instanceof Parameter)) {
			return new Parameter(kwArgs);
		}

		dojo.mixin(this, kwArgs);

		return this; // strict mode
	}
	Parameter.prototype = {
		constructor: Parameter,

		/**
		 * The name of the parameter.
		 * @type string
		 */
		name: undefined,

		/**
		 * Expected argument type for this parameter.
		 * @type string
		 */
		type: undefined,

		toString: function () {
			return '[object Parameter(name: ' + this.name + ')]';
		}
	};

	return Parameter;
});