define([
	'./node!../esprima/esprima.js',
	'dojo/_base/lang',
	'./env',
	'./callHandlers',
	'./File',
	'./Value',
	'./Parameter',
	'./Module',
	'./ParseError',
	'./node!util'
], function (esprima, lang, env, callHandlers, File, Value, Parameter, Module, ParseError, util) {
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
				return new Parameter({
					name: identifier.name
				});
			}),
			comments: getComments(fn)
		});
	}

	/**
	 * Hoist variables in the current scope.
	 * @param node A node of statements for the new block.
	 * @param type The type of hoisting. One or more of the hoist.TYPE_* constants.
	 */
	function hoist(/**Node*/ node, /**String*/ type) {
		isHoisting = type;
		read(node);
		isHoisting = false;
	}

	/**
	 * Function scope hoisting. Recurse into non-function blocks, but only for var declarations.
	 * @constant
	 * @type String
	 */
	hoist.TYPE_VAR = 'var';

	/**
	 * Block scope hoisting. Do not recurse into inner blocks, and only find let declarations.
	 * @constant
	 * @type String
	 */
	hoist.TYPE_LET = 'let';

	/**
	 * Read a node or statement list.
	 * @param node The node to read, or an array of statements to read.
	 * @param options Reader-specific options.
	 */
	function read(/**Node|Array*/ node, /**Object?*/ options) {
		if (Array.isArray(node)) {
			return readStatements(node);
		}

		return readers[node.type](node, options);
	}

	var isHoisting = false;
	var readers = {
		AssignmentExpression: function (expression) {
			var lhsValue = read(expression.left);

			if (!lhsValue) {
				console.info('Cannot resolve assignment expression');
				return new Value({ type: Value.TYPE_UNDEFINED });
			}

			var lhsIdentifier = read(expression.left, { asIdentifier: true }),
				rhsValue = read(expression.right);

			if (!rhsValue) {
				console.info('Cannot resolve replacement value');
				return lhsValue;
			}

			switch (expression.operator) {
			case '=':
				env.scope.setVariableValue(lhsIdentifier, rhsValue);
				lhsValue = rhsValue;
				break;
			case '+=':
				lhsValue.type = lhsValue.type === Value.TYPE_NUMBER && rhsValue.type === Value.TYPE_NUMBER ?
					Value.TYPE_NUMBER : Value.TYPE_STRING;
				// TODO: Not actually correct; value property is not guaranteed to exist if it is e.g. an function.
				lhsValue.value += rhsValue.value;
				break;
			default:
				lhsValue.type = Value.TYPE_NUMBER;
				// TODO: Does anyone care about the actual value?
				break;
			}

			return lhsValue;
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

		/**
		 * @param statement The statement.
		 * @param options One or more options:
		 *   * noNewScope: do not create a new scope when reading this block.
		 */
		BlockStatement: function (statement, options) {
			options = options || {};

			if (isHoisting === hoist.TYPE_LET) {
				// let hoisting should not descend into other blocks,
				// but var + let hoisting might
				return;
			}

			// We might be in the middle of a 'var' hoist (in which case we are not actually reading the block yet)
			if (isHoisting === hoist.TYPE_VAR) {
				read(statement.body);
			}
			else {
				!options.noNewScope && env.pushScope();

				hoist(statement.body, hoist.TYPE_LET);
				read(statement.body);

				!options.noNewScope && env.popScope();
			}
		},

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
			if (isHoisting) {
				if (isHoisting === hoist.TYPE_VAR) {
					env.scope.addVariable(fn.id.name);
				}

				// No hoisting should ever descend into a function declaration
				return;
			}

			var value = createFunctionValue(fn);

			env.scope.setVariableValue(fn.id.name, value);

			value.scope = env.pushScope(value);

			for (var i = 0, parameter; (parameter = value.parameters[i]); ++i) {
				env.scope.addVariable(parameter.name);
				env.scope.setVariableValue(parameter.name, parameter);
			}

			// 'let' hoisting happens when the BlockStatement body is read,
			// so only 'var' hoisting needs to happen explicitly
			hoist(fn.body, hoist.TYPE_VAR);
			read(fn.body, { noNewScope: true });
			env.popScope();
		},

		FunctionExpression: function (/**Node*/ fn) {
			if (isHoisting) {
				// No hoisting should ever descend into a function expression
				console.warn('In fact I am not sure it should get here at all');
				return;
			}

			var value = createFunctionValue(fn);

			value.scope = env.pushScope(value);

			// named function expression
			if (fn.id) {
				env.scope.addVariable(fn.id.name);
				env.scope.setVariableValue(fn.id.name, value);
			}

			for (var i = 0, parameter; (parameter = value.parameters[i]); ++i) {
				env.scope.addVariable(parameter.name);
				env.scope.setVariableValue(parameter.name, parameter);
			}

			// 'let' hoisting happens when the BlockStatement body is read,
			// so only 'var' hoisting needs to happen explicitly
			hoist(fn.body, hoist.TYPE_VAR);
			read(fn.body, { noNewScope: true });
			env.popScope();

			return value;
		},

		/**
		 * @param identifier The identifier.
		 * @param options One or more options:
		 *   * asIdentifier: return the identifier instead the resolved Value of the identifier.
		 */
		Identifier: function (identifier, options) {
			options = options || {};
			return options.asIdentifier ? identifier : env.scope.getVariable(identifier.name);
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

		/**
		 * @param statement The statement.
		 * @param options One or more options:
		 *   * asIdentifier: return the result of the expression as a flattened array of identifiers instead of as
		 *     the resolved Value of the expression.
		 */
		MemberExpression: function (expression, options) {
			options = options || {};
			var resolvedName = [];

			resolvedName = resolvedName.concat(read(expression.object, { asIdentifier: true }));

			// foo[bar]
			if (expression.computed) {
				var computedValue = read(expression.property);
				if (computedValue && computedValue.type !== Value.TYPE_UNDEFINED) {
					// TODO: What if it computes to an object or something?!?!
					resolvedName.push({ type: "Identifier", name: computedValue.value });
				}
				else {
					// can't resolve it
					// TODO: Maybe provide a better value here.
					return null;
				}
			}
			else {
				resolvedName.push(expression.property);
			}

			// TODO: Handle computed expressions
			return options.asIdentifier ? resolvedName : env.scope.getVariable(resolvedName.map(function (id) { return id.name; }));
		},

		NewExpression: function (expression) {
			return new Value({
				type: Value.TYPE_INSTANCE,
				value: read(expression.callee)
			});
		},

		ObjectExpression: function (expression) {
			var properties = {};

			// TODO: Handle getter/setters properly; right now they show up as functions
			for (var i = 0, property; (property = expression.properties[i]); ++i) {
				// key might be a Literal or an Identifier
				properties[property.key.value || property.key.name] = read(property.value);
			}

			return new Value({
				type: Value.TYPE_OBJECT,
				properties: properties
			});
		},

		// TODO: Update SM API docs which claim the property name is something other than body
		Program: function (program) {
			hoist(program.body, hoist.TYPE_LET);
			hoist(program.body, hoist.TYPE_VAR);
			read(program.body);
		},

		ReturnStatement: function (statement) {
			if (isHoisting) {
				return;
			}

			env.functionScope.relatedFunction.returns.push(read(statement.argument));
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
				// TODO: This assumes that the value of isHoisting is a string that
				// matches 'var' or 'let' but this may not always be the case!
				if (isHoisting === expression.kind) {
					for (i = 0; (declaration = expression.declarations[i]); ++i) {
						scope.addVariable(declaration.id.name);
					}
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

	return function (src, inspectTree) {
		var tree = esprima.parse(src); // { range: true, comment: true }

		if (inspectTree) {
			console.log(util.inspect(tree, null, null));
		}
		else {
			read(tree);
		}
	};
});