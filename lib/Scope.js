define([ 'dojo/_base/lang', './env', './Variable' ], function (lang, env, Variable) {
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
		 * Child scopes.
		 * @type Array.<Scope>
		 */
		children: [],

		/**
		 * @type Array.<ScopeVariable>
		 */
		vars: {},

		/**
		 * Creates a new variable in the local scope. Called from var x, ….
		 */
		addVariable: function (/**string*/ name) {
			if (this.vars[name]) {
				console.warn('Variable ' + name + ' already defined in current scope');
				return this.vars[name];
			}

			console.info('Adding variable ' + name + ' to scope');
			return this.vars[name] = new Variable();
		},

		/**
		 * Sets the property of a variable in the nearest declared scope.
		 * @param name An array of accessors, or a dot-separated accessor string like a.b.c.
		 */
		setVariableValue: function (/**Array|string*/ name, /**Value?*/ value) {
			if (!lang.isArray(name)) {
				name = name.split('.');
			}

			var scope = this, variable;

			// find variable in nearest scope
			do {
				if ((variable = scope.vars[name[0]])) {
					break;
				}
			} while ((scope = this.parent));

			if (!variable) {
				console.warn(name.join('.') + ': Implicit global variable declaration');
				variable = env.globalScope.addVariable(name[0]);
			}

			if (name.length === 1) {
				if (variable.value) {
					console.info(name.join('.') + ': Changing value reference');
				}

				variable.value = value;
			}
			else {
				variable.setProperty(name.slice(1), value);
			}
		},

		resolveVariables: function () {

		}
	};

	return Scope;
});