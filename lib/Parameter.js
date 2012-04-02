define([ 'dojo/_base/lang', './env', './Value' ], function (lang, env, Value) {
	function Parameter(kwArgs) {
		if (!(this instanceof Parameter)) {
			throw new Error('Parameter is a constructor');
		}

		Value.apply(this, arguments);
	}
	Parameter.prototype = lang.mixin(new Value(), {
		constructor: Parameter,

		/**
		 * The name of the parameter.
		 * @type string
		 */
		name: undefined,

		/**
		 * Whether or not the parameter is optional.
		 * @type boolean
		 */
		isOptional: false,

		/**
		 * Whether or not the parameter is a rest... parameter.
		 * @type boolean
		 */
		isRest: false,

		toString: function () {
			return '[object Parameter(name: ' + this.name + ')]';
		}
	});

	return Parameter;
});