define([ 'dojo/_base/lang', './env', './console' ], function (lang, env, console) {
	/**
	 * Represents a parsed data structure (object, etc.).
	 */
	function Value(/** Object? */ kwArgs) {
		if (!(this instanceof Value)) {
			throw new Error('Value is a constructor');
		}

		this.properties = {};
		this.mixins = [];
		this.parameters = [];
		this.returns = [];
		this.throws = [];
		this.comments = [];
		this.file = env.file;

		lang.mixin(this, kwArgs);
	}

	lang.mixin(Value, {
		TYPE_ANY:         'any', // TODO: This is used for functions that we know return "any" type of value
		TYPE_ARRAY:       'Array',
		TYPE_BOOLEAN:     typeof false,
		TYPE_CONSTRUCTOR: 'constructor',
		TYPE_FUNCTION:    typeof new Function(),
		TYPE_INSTANCE:    'instance',
		TYPE_NULL:        'null',
		TYPE_NUMBER:      typeof 0,
		TYPE_OBJECT:      typeof {},
		TYPE_PARAMETER:   'parameter', // TODO: This seems like a weird thing to notate as a separate value type?
		TYPE_REGEXP:      'RegExp',
		TYPE_STRING:      typeof '',
		TYPE_UNDEFINED:   typeof void 0
	});

	Value.prototype = {
		constructor: Value,

		/**
		 * The file that this definition came from. If undefined, the definition is a built-in (global) value.
		 * @type File?
		 */
		file: undefined,

		/**
		 * @type string? One of the Value.TYPE_* constants. If TYPE_UNDEFINED, it means that the Value has not been
		 * fully resolved yet.
		 */
		type: Value.TYPE_UNDEFINED,

		/**
		 * If type is 'string', 'number', 'regexp', or 'boolean', the value of the scalar, or regular expression. If
		 * type is 'instance', the Value of the instance or a reference to the type of object being instantiated.
		 * @type string|number|RegExp|boolean|Value?
		 */
		value: undefined,

		/**
		 * A hash map of properties attached to this data structure.
		 * @type Object.<Module|Value>|Array.<Module|Value>
		 */
		properties: {},

		/**
		 * Metadata annotations for this data structure.
		 * @type Object.<*>
		 */
		metadata: {},

		/**
		 * If type is 'function' or 'constructor', the scope of the function containing information about variables
		 * assigned.
		 * @type Scope?
		 */
		scope: undefined,

		/**
		 * If type is 'function' or 'constructor', the available parameters for the function.
		 * @type Array.<Parameter>
		 */
		parameters: [],

		/**
		 * Comments attached to this Value.
		 * @type Array.<token>
		 */
		comments: [],

		/**
		 * If type is 'function' or 'constructor', all return values from within the function.
		 * @type Array.<Value|Reference>
		 */
		returns: [],

		/**
		 * If type is 'function' or 'constructor', all throws from within the function.
		 * @type Array.<Value>
		 */
		throws: [],

		/**
		 * If a function attempts to overwrite this Value with a new Value, copy it over the existing properties of
		 * this object instead of overwriting the object.
		 * TODO: This is never used. Use or delete.
		 * @type boolean
		 */
		copyOver: false,

		toString: function () {
			return '[object Value(type: ' + this.type + ', value: ' + this.value + ')]';
		},

		/**
		 * Gets the value of a property on this object or a sub-property of this object.
		 * @param name The name of the property to retrieve as an array of strings.
		 * @returns Value? Value if one exists, otherwise undefined.
		 */
		getProperty: function (/**Array.<string>*/ name) {
			for (var variable = this, i = 0, j = name.length; i < j; ++i) {
				variable = variable.properties[name[i]] ||
						   variable.properties.prototype && variable.properties.prototype[name[i]];

				if (!variable) {
					break;
				}
			}

			return variable;
		},

		/**
		 * Sets the value of a property on this object or a sub-property of this object.
		 * @param name The name of the property to set as an array of strings.
		 * @param value The value to set on the property.
		 */
		setProperty: function (/**Array.<string>*/ name, /**Value*/ value) {
			var assumeKeyExists = this.type === Value.TYPE_FUNCTION || this.isParameter;

			for (var obj = this, i = 0, j = name.length - 1, key; i < j && (key = name[i]); ++i) {
				if (!obj.properties[key]) {
					// function body analysis occurs before parameters are resolved so if we are trying to set a
					// property on an object on a parameter, assume the code is correct
					if (assumeKeyExists || this.isParameter) {
						obj.properties[key] = new Value();
						assumeKeyExists = true;
					}
					// prototype object exists by default on a function; if something on it is being set, also assume
					// that this object is actually a constructor
					// TODO: Switching functions to constructors might be more productive later in the lifecycle by
					// e.g. checking the caps first letter, whether or not the function returns a value, etc.
					else if ((obj.type === Value.TYPE_FUNCTION || obj.type === Value.TYPE_CONSTRUCTOR) && key === 'prototype') {
						obj.type = Value.TYPE_CONSTRUCTOR;
						obj.properties[key] = new Value({
							type: Value.TYPE_OBJECT
						});
					}
					else {
						// TODO: Things I don't care about right now... this throws when we try to walk through
						// loops without actually following the loop because objects that were programmatically
						// generated by looping are never actually created. Just do it anyway for now.
						// throw new Error('Attempt to set property of undefined object ' + key + ' on ' + obj);
						console.warn('Attempt to set property of undefined object ' + key + ' on ' + obj);
						obj.properties[key] = new Value({
							type: Value.TYPE_UNDEFINED
						});
					}
				}

				obj = obj.properties[key];
			}

			if (obj.properties[name[j]]) {
				console.info('Resetting property of object ' + this);

				// TODO: Should mixin, not overwrite, the property if it was once assumed to exist
			}

			obj.properties[name[j]] = value;
		},

		/**
		 * Determines whether or not another Value is equal to this value.
		 * TODO: Does anything actually need to use this?
		 * @param otherValue The other value.
		 * @param strict Whether or not to apply strict equality rules.
		 * @returns {boolean} Whether or not the Values are considered equal.
		 */
		equals: function (/**Value*/ otherValue, /**boolean*/ strict) {
			if (this.type === otherValue.type === Value.TYPE_UNDEFINED) {
				return true;
			}

			if (typeof this.value !== 'undefined') {
				return strict ? this.value === otherValue.value : this.value == otherValue.value;
			}

			return this === otherValue;
		}
	};

	return Value;
});