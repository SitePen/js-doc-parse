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
	 * @property property The property to read.
	 * @returns {Function} A reader function.
	 */
	function createPassthroughReader(/**String*/ property) {
		/**
		 * @property node An AST node.
		 * @returns {Value?} A Value corresponding to the node.
		 */
		return function (/**Node*/ node) {
			var nodeToRead = node[property];
			return readers[nodeToRead.type](nodeToRead);
		};
	}

	/**
	 * Creates a function that simply iterates through the array
	 * at the given property on the Node. This is used for handling
	 * things like BlockStatement which simply consists of an
	 * array of statements.
	 * @property property The property to read.
	 * @returns {Function} A reader function.
	 */
	function createStatementListReader(/**String*/ property) {
		/**
		 * @property node An AST node.
		 */
		return function (/**Node*/ node) {
			readStatements(node[property]);
		};
	}

	/**
	 * Reads a statement list.
	 * @property statements Array of statements.
	 */
	function readStatements(/**Array.<Statement>*/ statements) {
		for (var i = 0, statement; (statement = statements[i]); ++i) {
			readers[statement.type](statement);
		}
	}

	/**
	 * Find comments to associate with a given node.
	 * @property node The AST node.
	 * @returns {Array} An array of comments.
	 */
	function getComments(/**Node*/ node) {
		// TODO
		return [];
	}

	/**
	 * Makes a function Value from a Function node.
	 * @property fn The Function node.
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

	var readers = {
		AssignmentExpression: function (expression) {

		},

        ArrayExpression: function (expression) {

		},

		// TODO: Must handle let hoisting
        BlockStatement: createStatementListReader('body'),

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
			var value = createFunctionValue(fn);

			env.scope.addVariable(fn.id.name, value);

			env.pushScope(value);

			// TODO: var hoisting pass

			this[fn.body.type](fn.body);
			env.popScope();
		},

        FunctionExpression: function (/**Node*/ fn) {
			var value = createFunctionValue(fn);

			env.pushScope(value);

			// named function expression
			if (fn.id) {
				env.scope.addVariable(fn.id.name, value);
			}

			// TODO: var hoisting pass

			this[fn.body.type](fn.body);
			env.popScope();

			return value;
		},

        Identifier: function (identifier) {
			return env.scope.getVariable(identifier.name);
		},

        IfStatement: function (statement) {
		},

        Literal: function (literal) {
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

		// TODO: Must handle hoisting
        Program: createStatementListReader('elements'),

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
		},

        VariableDeclarator: function (declarator) {
		},

        WhileStatement: function (statement) {
		},

        WithStatement: function (statement) {
		}
	};

	return esprima.parse;

	return function (src) {
		var ast = esprima.parse(src);
		readers[ast.type](ast);

//		readers.Program(esprima.parse(src, { range: true, comment: true }));
	};
});