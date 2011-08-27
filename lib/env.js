define([ 'dojo/_base/kernel', './Scope', 'exports' ], function (dojo, Scope, exports) {
	var globalScope = new Scope();

	return dojo.mixin(exports, {
		/**
		 * The doc parser configuration.
		 * @type Object
		 */
		config: undefined,

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
		 * The current tokenizer.
		 * @type scrollableTokenizer
		 */
		tokenizer: undefined,

		/**
		 * Pushes a new variable scope to the environment.
		 * @returns {Scope} The new scope.
		 */
		pushScope: function () {
			var parentScope = this.scope;
			this.scope = new Scope(parentScope);
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
				console.warn('BUG: There is no scope above global scope');
			}
			else {
				this.scope = this.scope.parent;
			}

			return childScope;
		}
	});
});