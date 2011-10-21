define([ 'dojo/_base/lang', './env' ], function (lang, env) {
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
		this.comments = [];
		this.from = env.file;

		lang.mixin(this, kwArgs);

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
		 * 'constructor', 'atom', 'undefined'. If 'undefined', it means that the Value has not been fully
		 * resolved yet.
		 */
		type: 'undefined',

		/**
		 * If type is 'string', 'number', 'regexp', 'array', or 'value', the value of the scalar, regular expression,
		 * or Array object. If type is 'instance', the Value of the instance or a reference to the type of object being
		 * instantiated.
		 * @type string|number|RegExp|Array.<*>|Reference|Value?
		 */
		value: undefined,

		/**
		 * A hash map of properties attached to this data structure.
		 * @type Object.<Module|Value|Reference>
		 */
		properties: {},

		/**
		 * If type is 'function' or 'constructor', the scope of the function containing information about variables
		 * assigned.
		 * @type Scope?
		 */
		scope: undefined,

		/**
		 * If type is 'function', the available parameters for the function.
		 * @type Array.<Parameter>
		 */
		parameters: [],

		/**
		 * Comments attached to this Value.
		 * @type Array.<token>
		 */
		comments: [],

		/**
		 * If type is 'function', all return values from within the function.
		 * @type Array.<Value|Reference>
		 */
		returns: [],

		/**
		 * If a function attempts to overwrite this Value with a new Value, copy it over the existing properties of
		 * this object instead of overwriting the object.
		 * @type boolean
		 */
		copyOver: false,

		toString: function () {
			return '[object Value(type: ' + this.type + ', value: ' + this.value + ')]';
		},

		getProperty: function (name, value) {

		},

		/**
		 * Sets the value of a property on this object or a sub-property of this object.
		 * @param name
		 * @param value
		 */
		setProperty: function (/**Array.<string|token>|string*/ name, /**Value*/ value) {
			var assumeKeyExists = this.type === 'parameter';

			for (var obj = this, i = 0, j = name.length - 1, key; i < j && (key = name[i]); ++i) {
				if (!obj.properties[key]) {
					// function body analysis occurs before parameters are resolved so if we are trying to set a
					// property on an object on a parameter, assume the code is correct
					if (assumeKeyExists || obj.type === 'parameter') {
						obj.properties[key] = new Value();
						assumeKeyExists = true;
					}
					else {
						throw Error('Attempt to set property of undefined object ' + key + ' on ' + obj);
					}
				}

				obj = obj.properties[key];
			}

			if (obj.properties[name[j]]) {
				console.info('Resetting property of object');
			}

			obj.properties[name[j]] = value;
		}
	};

	return Value;
});