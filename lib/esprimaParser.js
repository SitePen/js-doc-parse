define([
	'./node!../esprima/esprima.js',
	'dojo/_base/lang',
	'./env',
	'./callHandlers',
	'./File',
	'./Value',
	'./Module',
	'./ParseError',
	'./node!util'
], function (esprima, lang, env, callHandlers, File, Value, Module, ParseError, util) {
	function nobodyCares() {}

	/**
	 * Creates a function that simply passes through the value of the
	 * property read from a given property on the Node. This is used
	 * for handling things like ExpressionStatements which simply
	 * wrap around another Node.
	 * @param property The property to read.
	 * @returns {Function} A reader function.
	 */
	function createPassthroughReader(/**String*/ property) {
		/**
		 * @param node An AST node.
		 * @returns {Value?} A Value corresponding to the node.
		 */
		return function (/**Node*/ node) {
			return read(node[property]);
		};
	}

	/**
	 * Creates a function that simply iterates through the array
	 * at the given property on the Node. This is used for handling
	 * things like BlockStatement which simply consists of an
	 * array of statements.
	 * @param property The property to read.
	 * @param hoist A hoist.TYPE_* constant if the list of statements needs to be hoisted
	 * in the current scope.
	 * @param createScope Whether or not a new scope should be created for this block.
	 * @returns {Function} A reader function.
	 */
	function createBlockReader(/**String*/ property, /**Number*/ hoist, /**Boolean*/ createScope) {
		/**
		 * @param node An AST node.
		 */
		return function (/**Node*/ node) {
			createScope && env.pushScope();

			if (hoist) {
				var lastHoistValue = isHoisting;
				isHoisting = hoist;
				readStatements(node[property]);
				isHoisting = lastHoistValue;
			}

			readStatements(node[property]);

			createScope && env.popScope();
		};
	}

	/**
	 * Reads a statement list.
	 * @param statements Array of statements.
	 */
	function readStatements(/**Array.<Statement>*/ statements) {
		for (var i = 0, statement; (statement = statements[i]); ++i) {
			read(statement);
		}
	}

	/**
	 * Find comments to associate with a given node.
	 * @param node The AST node.
	 * @returns {Array} An array of comments.
	 */
	function getComments(/**Node*/ node) {
		// TODO
		return [];
	}

	/**
	 * Makes a function Value from a Function node.
	 * @param fn The Function node.
	 * @returns {Value} A function Value.
	 */
	function createFunctionValue(/**Node*/ fn) {
		return new Value({
			type: Value.TYPE_FUNCTION,
			parameters: fn.params.map(function (identifier) {
				// TODO: Should this return a Parameter object
				// so that it can be mutable and have associated
				// documentation (instead of the documentation ending
				// up on whatever Value ends up being associated with
				// the parameter inside the function)?
				return identifier.name;
			}),
			comments: getComments(fn)
		});
	}

	/**
	 * Hoist variables in the current scope.
	 * @param node A node of statements for the new block.
	 * @param type The type of hoisting. One or more of the hoist.TYPE_* constants (bitwise).
	 */
	function hoist(/**Node*/ node, /**Number*/ type) {
		isHoisting = type;
		read(node);
		isHoisting = false;
	}

	/**
	 * Function scope hoisting. Recurse into non-function blocks, but only for var declarations.
	 * @constant
	 * @type Number (bitwise)
	 */
	hoist.TYPE_VAR = 1;

	/**
	 * Block scope hoisting. Do not recurse into inner blocks, and only find let declarations.
	 * @constant
	 * @type Number (bitwise)
	 */
	hoist.TYPE_LET = 2;

	/**
	 * Read a node.
	 */
	function read(/**Node*/ node) {
		return readers[node.type](node);
	}

	var isHoisting = false;
	var readers = {
		AssignmentExpression: function (expression) {
		},

		ArrayExpression: function (expression) {
			var array = [],
				value = new Value({
					type: Value.TYPE_ARRAY,
					value: array
				});

			// use i, j since some elements might be falsy
			for (var i = 0, j = expression.elements.length, element; i < j; ++i) {
				element = expression.elements[i];

				if (element === undefined) {
					array.push(new Value({ type: Value.TYPE_UNDEFINED }));
				}
				else {
					array.push(read(element));
				}
			}

			return value;
		},

		// TODO: Must handle let hoisting
		BlockStatement: createBlockReader('body', hoist.TYPE_LET),

		BinaryExpression: function (expression) {
		},

		BreakStatement: nobodyCares,

		CallExpression: function (expression) {

		},

		CatchClause: function (clause) {
			console.warn('Should not read catch clauses directly');
		},

		ConditionalExpression: function (expression) {
		},

		ContinueStatement: nobodyCares,

		DoWhileStatement: function (statement) {
		},

		DebuggerStatement: nobodyCares,

		EmptyStatement: nobodyCares,

		ExpressionStatement: createPassthroughReader('expression'),

		ForStatement: function (statement) {
		},

		ForInStatement: function (statement) {
		},

		FunctionDeclaration: function (/**Node*/ fn) {
			if (isHoisting & hoist.TYPE_VAR) {
				env.scope.addVariable(fn.id.name);
				return;
			}

			var value = createFunctionValue(fn);

			env.scope.setVariableValue(fn.id.name, value);

			value.scope = env.pushScope(value);

			hoist(fn.body, hoist.TYPE_VAR | hoist.TYPE_LET);
			read(fn.body);
			env.popScope();
		},

		FunctionExpression: function (/**Node*/ fn) {
			var value = createFunctionValue(fn);

			value.scope = env.pushScope(value);

			// named function expression
			if (fn.id) {
				env.scope.addVariable(fn.id.name, value);
			}

			hoist(fn.body, hoist.TYPE_VAR | hoist.TYPE_LET);
			read(fn.body);
			env.popScope();

			return value;
		},

		Identifier: function (identifier) {
			// TODO: Not sure if this is the right thing to return
			return env.scope.getVariable(identifier.name);
		},

		IfStatement: function (statement) {
		},

		Literal: function (literal) {
			var value = new Value({
				type: typeof literal.value,
				value: literal.value
			});

			// literals shouldn't actually be objects
			if (value.type === Value.TYPE_OBJECT) {
				value.type = value.type === null ? Value.TYPE_NULL
					: value.type instanceof RegExp ? Value.TYPE_REGEXP
					: value.type;
			}

			return value;
		},

		LabeledStatement: createPassthroughReader('body'),

		LogicalExpression: function (expression) {
		},

		MemberExpression: function (expression) {
		},

		NewExpression: function (expression) {
		},

		ObjectExpression: function (expression) {

		},

		// TODO: Update SM API docs which claim the property name is not body
		Program: createBlockReader('body', hoist.TYPE_VAR | hoist.TYPE_LET),

		// not explicitly defined as an interface in the SM Parser API,
		// this is the object that is defined in the properties
		// key of the ObjectExpression expression in the API docs
		Property: function (property) {
		},

		ReturnStatement: function (statement) {
		},

		SequenceExpression: function (expression) {
			// can't just use a StatementListReader here
			// because we need to return the value of the
			// last expression in the list
		},

		SwitchStatement: function (statement) {
		},

		SwitchCase: function (switchCase) {
		},

		ThisExpression: function (expression) {
			console.warn('thiisssss');
		},

		ThrowStatement: function (statement) {
		},

		TryStatement: function (statement) {
		},

		UnaryExpression: function (expression) {
		},

		UpdateExpression: function (expression) {
		},

		VariableDeclaration: function (expression) {
			var i,
				declaration,
				value,
				scope = expression.kind === 'var' ? env.functionScope : env.scope;

			if (isHoisting) {
				for (i = 0; (declaration = expression.declarations[i]); ++i) {
					scope.addVariable(declaration.id.name);
				}

				return;
			}

			for (i = 0; (declaration = expression.declarations[i]); ++i) {
				value = declaration.init ? read(declaration.init) : new Value({ type: Value.TYPE_UNDEFINED });
				scope.setVariableValue(declaration.id.name, value);
			}
		},

		VariableDeclarator: function (declarator) {
			throw new Error('VariableDeclarator should never be outside a VariableDeclaration.');
		},

		WhileStatement: function (statement) {
		},

		WithStatement: function (statement) {
		}
	};

	return function (src) {
		var tree = esprima.parse(src);
		read(tree);

//		readers.Program(esprima.parse(src, { range: true, comment: true }));
	};
});