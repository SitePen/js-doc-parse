define([ './const' ], function (consts) {
	function Variable(value) {
		if (!(this instanceof Variable)) {
			return new Variable(value);
		}

		this.mixins = {};
		this.comments = [];
		this.value = value;

		return this; // strict mode
	}
	Variable.prototype = {
		constructor: Variable,

		/**
		 * Additional properties that are added to the Value once it has been resolved.
		 * @type Object
		 */
		mixins: {},

		/**
		 * Code comments surrounding this variable.
		 * @type Array.<string>
		 */
		comments: [],

		/**
		 * @type Value
		 */
		value: undefined,

		/**
		 * Attaches a property to the value if it is already resolved, or stores it for mixin later.
		 * Normally called from @see Scope#setVariableValue.
		 * @param name An array of accessor components.
		 */
		setProperty: function (/**Array*/ name, /*Value*/ value) {
			var isMixin = !this.value || !('properties' in this.value),
				context = isMixin ? this.mixins : this.value.properties;

			if (!context) {
				console.log(this);
			}

			if (name.length > 1) {
				for (var contextName = name.slice(0, -1), i = 0, j = contextName.length; i < j; ++i) {
					context = context[contextName[i]];

					// XXX: if context is scalar, can't set properties either
					if (!context) {
						console.warn('Attempt to set property ' + contextName[i] + ' on object ' + contextName.slice(0, i).join('.') + ' that does not exist');
						return;
					}
					else if (consts.UNASSIGNABLE_TYPES[context.type]) {
						console.warn('Attempt to set property ' + contextName[i] + ' on object ' + contextName.slice(0, i).join('.') + ' that is a ' + context.type);
						return;
					}

					isMixin || (context = context.properties);
				}
			}

			if (context[name[name.length - 1]]) {
				console.warn('Redefining existing property ' + name.join('.'));
			}

			context[name[name.length - 1]] = value;
		}
	};

	return Variable;
});