define([ 'dojo/_base/lang', './env', './Variable', './node!util' ], function (lang, env, Variable, util) {
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

			console.debug('Adding variable ' + name + ' to scope');
			return this.vars[name] = new Variable();
		},

		/**
		 * Sets the property of a variable in the nearest declared scope.
		 * @param name An array of accessors, or a dot-separated accessor string like a.b.c.
		 */
		setVariableValue: function (/**Array|string*/ name, /**Value?*/ value) {
			if (typeof name === 'string') {
				name = name.split('.');
			}

			if (typeof name[0] !== 'string') {
				throw Error('Only arrays of strings can be passed to setVariableValue');
			}

			var scope = this, variable;

			if (name[0] === 'this') {
				if (!scope.vars['this']) {
					variable = scope.addVariable('this');
				}
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
				variable.value && console.info(name.join('.') + ': Changing value reference');
				variable.value = value;
			}
			else {
				variable.setProperty(name.slice(1), value);
			}
		},

		getVariable: function (/**Array|string*/ name) {

		}
	};

	return Scope;
});