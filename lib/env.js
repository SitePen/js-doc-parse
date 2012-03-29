define([ 'dojo/_base/kernel', './Scope', './File', './Value', './Module', 'exports' ], function (dojo, Scope, File, Value, Module, exports) {
	var globalScope = new Scope();
	globalScope.vars = {
		define: new Value({ type: 'function' }),
		require: new Value({ type: 'function' }),
		undefined: new Value(),
		window: new Value({ type: 'object' })
	};
	globalScope.vars.window.properties = globalScope.vars;

	var states = [];

	return dojo.mixin(exports, {
		/**
		 * The doc parser configuration.
		 * @type Object
		 */
		config: {
			basePath: '',
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
		 * The current block scope of the parser environment.
		 * @type Scope
		 */
		scope: globalScope,

		/**
		 * The current function scope of the parser environment.
		 * @type Scope
		 */
		functionScope: globalScope,

		/**
		 * The current file being processed.
		 * @type File
		 */
		file: undefined,

		/**
		 * A reference to the main parser function. Defined by whatever parser
		 * gets loaded.
		 * @type Function
		 */
		parse: undefined,

		/**
		 * A token, used to provide more useful information about the
		 * current parser state in console logs.
		 * @type token
		 */
		token: undefined,

		/**
		 * Pushes a new variable scope to the environment.
		 * @param relatedFunction The function to which the new scope belongs.
		 * If undefined, the new scope is a block scope.
		 * @returns {Scope} The new scope.
		 */
		pushScope: function (/**Value?*/ relatedFunction) {
			var parentScope = this.scope;
			this.scope = new Scope(parentScope, relatedFunction);

			if (relatedFunction) {
				this.functionScope = this.scope;
			}

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

			if (this.scope.isFunctionScope) {
				this.functionScope = this.scope;
			}

			return childScope;
		},

		/**
		 * Saves the current environment state and resets state to default.
		 * @param file The File object for the new environment.
		 */
		pushState: function (/**File|string*/ file) {
			states.push({
				file: this.file,
				scope: this.scope,
				token: this.token
			});

			if (!(file instanceof File)) {
				file = new File(file);
			}

			this.file = file;
			this.scope = globalScope;
			this.token = undefined;
		},

		/**
		 * Restores the previously saved environment state.
		 * @returns {Object} The old state.
		 */
		popState: function () {
			var state = states.pop(),
				oldState = {
					file: this.file,
					scope: this.scope,
					token: this.token
				};

			if (!state) {
				throw new Error('Attempt to restore a state that does not exist');
			}

			this.file = state.file;
			this.scope = state.scope;
			this.token = state.token;

			return oldState;
		}
	});
});