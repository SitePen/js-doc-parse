define([ 'dojo/_base/lang', './env', './Value', './node!util' ], function (lang, env, Value, util) {
	function normalizeName(name) {
		if (typeof name === 'string') {
			name = name.split('.');
		}

		// Convert array of name tokens into array of strings
		if (typeof name[0] !== 'string') {
			name = name.map(function (name) { return name.value; });
		}

		return name;
	}

	/**
	 * A variable scope.
	 */
	function Scope(parent) {
		if (!(this instanceof Scope)) {
			return new Scope(parent);
		}

		if (!parent) {
			parent = env.scope;
		}

		this.parent = parent;
		this.children = [];
		this.vars = {};

		return this; // strict mode
	}
	Scope.prototype = {
		constructor: Scope,

		/**
		 * If a scope has no parent, it is the global scope.
		 * @type Scope?
		 */
		parent: undefined,

		/**
		 * The function value to which this scope belongs. Undefined if it is the global scope.
		 * @type Value?
		 */
		get relatedFunction() {
			return this.vars['this'];
		},

		set relatedFunction(/** Value */ value) {
			this.vars['this'] = value;
		},

		/**
		 * Child scopes.
		 * @type Array.<Scope>
		 */
		children: [],

		/**
		 * Variables defined within the scope.
		 * @type Object.<string, Value>
		 */
		vars: {},

		/**
		 * Creates a new variable in the local scope.
		 * @param token The name of the variable to add in the local scope.
		 * @param value An optional value to assign to the new variable. If undefined, an undefined Value will be
		 *              assigned.
		 * @returns {Value} The new value.
		 */
		addVariable: function (/**string|token*/ token, /**Value?*/ value) {
			var name = token.value || token,
				comments = token.comments || [];

			if (this.vars[name]) {
				console.warn('Variable ' + name + ' already defined in current scope');
				return this.vars[name];
			}

			console.debug('Adding variable ' + name + ' to scope');

			if (value && comments.length) {
				value.comments = value.comments.concat(comments);
			}

			return this.vars[name] = value || new Value({
				comments: comments
			});
		},

		/**
		 * Sets the property of an existing variable in the nearest declared scope.
		 * @param name An array of accessor name/string tokens or strings, or a dot-separated accessor string like
		 *             a.b.c.
		 * @param value The value to assign to the variable.
		 */
		setVariableValue: function (/**Array|string*/ name, /**Value*/ value) {
			name = normalizeName(name);

			var scope = this,
				variable;

			if (!(value instanceof Value)) {
				throw Error(name.join('.') + ': ' + value + ' is not a value');
			}

			if (name[0] === 'this') {
				variable = scope.vars['this'];
			}
			else {
				// find variable in nearest scope
				do {
					if ((variable = scope.vars[name[0]])) {
						break;
					}
				} while ((scope = scope.parent));

				if (!variable) {
					console.warn(name.join('.') + ': Implicit global variable declaration');
					variable = env.globalScope.addVariable(name[0]);
				}
			}

			if (name.length === 1) {
				if (name[0] === 'this') {
					throw Error('Cannot assign to "this"');
				}

				if (this.vars[name[0]] && this.vars[name[0]].type !== 'undefined' && this.vars[name[0]] !== value) {
					console.info(name.join('.') + ': Changing value reference from ' + this.vars[name[0]] + ' to ' + value);
				}

				this.vars[name[0]] = value;
			}
			else {
				// Attempt to set a complex expression
				if (name.some(function (value) { return value === undefined || typeof value === 'object'; })) {
					console.warn('Attempt to set a variable using a complex expression');
					return;
				}

				variable.setProperty(name.slice(1), value);
			}
		},

		/**
		 * Retrieves the value of an existing variable in the nearest declared scope.
		 * @param name An array of accessor name/string tokens or strings, or a dot-separated accessor string like
		 *             a.b.c.
		 * @returns Value?
		 */
		getVariable: function (/**Array|string*/ name) {
			name = normalizeName(name);

			var scope = this,
				variable;

			if (name[0] === 'this') {
				variable = scope.vars['this'];
			}
			else {
				// find variable in nearest scope
				do {
					if ((variable = scope.vars[name[0]])) {
						break;
					}
				} while ((scope = scope.parent));
			}

			if (variable && name.length > 1) {
				for (var i = 1, j = name.length; i < j; ++i) {
					variable = variable.properties[name[i]] ||
						       variable.properties.prototype && variable.properties.prototype[name[i]];

					if (!variable) {
						break;
					}
				}
			}

			if (!variable) {
				console.warn('Attempt to get undefined variable', name.join('.'));
			}

			return variable;
		}
	};

	return Scope;
});