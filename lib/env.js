define([ 'dojo/_base/kernel', './Scope', './Value', './Module', 'exports' ], function (dojo, Scope, Value, Module, exports) {
	var globalScope = new Scope();
	globalScope.vars = {
		define: new Value({ type: 'function' }),
		require: new Value({ type: 'function' }),
		undefined: new Value(),
		window: new Value({ type: 'object' })
	};
	globalScope.vars.window.properties = globalScope.vars;

	return dojo.mixin(exports, {
		/**
		 * The doc parser configuration.
		 * @type Object
		 */
		config: {
			prefixMap: {}
		},

		/**
		 * The modules in the environment.
		 * @type Array.<Module>
		 */
		modules: [],

		/**
		 * The global scope.
		 * @type Scope
		 */
		globalScope: globalScope,

		/**
		 * The current scope of the parser environment.
		 * @type Scope
		 */
		scope: globalScope,

		/**
		 * The current file being processed.
		 * @type File
		 */
		file: undefined,

		/**
		 * Pushes a new variable scope to the environment.
		 * @param functionValue The function to which the new scope belongs.
		 * @returns {Scope} The new scope.
		 */
		pushScope: function (/**Value*/ relatedFunction) {
			var parentScope = this.scope;
			this.scope = new Scope(parentScope, relatedFunction);
			parentScope.children.push(this.scope);

			return this.scope;
		},

		/**
		 * Pops the current scope off the environment.
		 * @returns {Scope} The old scope.
		 */
		popScope: function () {
			var childScope = this.scope;

			if (this.scope === globalScope) {
				throw new Error('There is no scope above global scope');
			}

			this.scope = this.scope.parent;
			return childScope;
		}
	});
});