define([ 'dojo/_base/kernel', './env' ], function (dojo, env) {
	/**
	 * Represents a parsed data structure (object, etc.).
	 */
	function Value(/** Object? */ kwArgs) {
		if (!(this instanceof Value)) {
			return new Value(kwArgs);
		}

		this.properties = {};
		this.mixins = [];
		this.parameters = [];
		this.returns = [];
		this.from = env.file;

		dojo.mixin(this, kwArgs);

		return this; // strict mode
	}
	Value.prototype = {
		constructor: Value,

		/**
		 * The file that this definition came from.
		 * @type File
		 */
		file: undefined,

		/**
		 * @type string? One of 'string', 'number', 'regexp', 'function', 'instance', 'array', 'object',
		 * 'atom', undefined. If undefined, it means that the Value has not been fully resolved yet.
		 */
		type: undefined,

		/**
		 * If type is 'string', 'number', 'regexp', 'array', or 'value', the value of the scalar, regular expression,
		 * or Array object. If type is 'instance', the Value of the instance or a reference to the type of object being
		 * instantiated.
		 * @type string|number|RegExp|Array.<*>|Reference|Value?
		 */
		value: undefined,

		/**
		 * An array of modules whose properties are mixed into this value at runtime.
		 * @type Array.<string|Module|Reference>
		 */
		mixins: [],

		/**
		 * A hash map of properties attached to this data structure.
		 * @type Object.<Module|Value|Reference>
		 */
		properties: {},

		/**
		 * If type is 'function', the available parameters for the function.
		 * @type Array.<Parameter>
		 */
		parameters: [],

		/**
		 * If type is 'function', all return values from within the function.
		 * @type Array.<Value|Reference>
		 */
		returns: [],

		/**
		 * If type is 'function', the scope for the function.
		 * @type Scope?
		 */
		scope: undefined,

		toString: function () {
			return '[object Value(type: ' + this.type + ', value: ' + this.value + ')]';
		}
	};

	return Value;
});