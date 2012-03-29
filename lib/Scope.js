define([ 'dojo/_base/lang', './env', './Value', './node!util' ], function (lang, env, Value, util) {
	/**
	 * Transforms "name" into an array of strings representing a variable/property to be accessed.
	 * @param name A dot-separated string, an array of strings, or an array of tokens.
	 * @returns {Array?} An array of strings, or undefined if the name is not resolvable (due to the use of array
	 * notation with a non-string expression).
	 */
	function normalizeName(name) {
		var isValid = true;

		if (typeof name === 'string') {
			name = name.split('.');
		}

		// Convert array of name tokens into array of strings
		if (typeof name[0] !== 'string') {
			// TODO: This is not amazingly efficient
			name = name.map(function (name) {
				if (!name || typeof name.value !== 'string') {
					isValid = false;
					return;
				}

				return name.value;
			});
		}

		return isValid ? name : undefined;
	}

	/**
	 * A variable scope.
	 */
	function Scope(/**Scope*/ parent, /**Value*/ relatedFunction) {
		if (!(this instanceof Scope)) {
			throw new Error('Scope is a constructor');
		}

		if (!parent) {
			parent = env.scope;
		}

		this.parent = parent;
		this.children = [];
		this.vars = {};

		this.isFunctionScope = !!relatedFunction;
		this.relatedFunction = relatedFunction;

		return this; // strict mode
	}
	Scope.prototype = {
		constructor: Scope,

		/**
		 * Whether or not this is a function scope (as opposed
		 * to a block scope).
		 * @type boolean
		 */
		isFunctionScope: false,

		/**
		 * If a scope has no parent, it is the global scope.
		 * @type Scope?
		 */
		parent: undefined,

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
				console.warn('Variable "' + name + '" already defined in current scope');
				return this.vars[name];
			}

			console.debug('Adding variable "' + name + '" to scope');

			if (value && comments.length) {
				value.comments = value.comments.concat(comments);
			}

			return (this.vars[name] = value || new Value({
				comments: comments
			}));
		},

		/**
		 * Sets the property of an existing variable in the nearest declared scope.
		 * @param name An array of accessor name/string tokens or strings, or a dot-separated accessor string like
		 *             a.b.c.
		 * @param value The value to assign to the variable.
		 */
		setVariableValue: function (/**Array|string*/ name, /**Value*/ value) {
			var originalName = name;
			name = normalizeName(name);

			if (!name) {
				// Only an array-based accessor string would be unresolvable so using join unconditionally is fine
				console.warn('Attempt to set value on unresolvable name "' + originalName.join('.') + '"');
				return;
			}

			var scope = this,
				variable;

			if (!(value instanceof Value)) {
				throw new Error(name.join('.') + ': "' + value + '" is not a value');
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
					scope = env.globalScope;
					variable = scope.addVariable(name[0]);
				}
			}

			if (name.length === 1) {
				if (name[0] === 'this') {
					throw new Error('Cannot assign to "this"');
				}

				if (scope.vars[name[0]] && scope.vars[name[0]].type !== 'undefined' && scope.vars[name[0]] !== value) {
					console.info(name.join('.') + ': Changing value reference from ' + scope.vars[name[0]] + ' to ' + value);
				}

				scope.vars[name[0]] = value;
			}
			else {
				// Attempt to set a complex expression
				if (name.some(function (value) {
						return (value === undefined || typeof value === 'object');
					})) {

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
			var originalName = name;
			name = normalizeName(name);

			if (!name) {
				if (Array.isArray(originalName[0])) {
					console.trace();
					console.log(util.inspect(originalName, false, 6));
					process.exit(1);
				}

				// Only an array-based accessor string would be unresolvable so using join unconditionally is fine
				console.warn('Attempt to get value on unresolvable name "' + originalName.join('.') + '"');
				return new Value();
			}

			var scope = this,
				variable;

			if (name[0] === 'this') {
				variable = scope.vars['this'];
			}
			else {
				// find variable in nearest scope
				do {
					// hasOwnProperty check is necessary to ensure built-in names like 'toString' are not picked up
					// from the object’s prototype
					if (scope.vars.hasOwnProperty(name[0]) && (variable = scope.vars[name[0]])) {
						break;
					}
				} while ((scope = scope.parent));
			}

			if (variable && name.length > 1) {
				variable = variable.getProperty(name.slice(1));
			}

			if (!variable) {
				console.warn('Attempt to get undefined variable "' + name.join('.') + '"');
				variable = new Value();
			}

			return variable;
		},

		/**
		 * The function value to which this scope belongs. Undefined if it is the global scope.
		 * @type Value?
		 */
		get relatedFunction() {
			return this.vars['this'];
		},

		set relatedFunction(/**Value*/ value) {
			this.vars['this'] = value;
		}
	};

	return Scope;
});