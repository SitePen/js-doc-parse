define([
	'./node!../esprima/esprima.js',
	'dojo/_base/lang',
	'./env',
	'./callHandlers',
	'./File',
	'./Value',
	'./Parameter',
	'./Module',
	'./node!util',
	'./console'
], function (esprima, lang, env, callHandlers, File, Value, Parameter, Module, util, console) {
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
	 * Converts a Value to some reasonable value for a binary operation.
	 * TODO: Moar spec compliant.
	 * @param value
	 * @returns {string|number|boolean|RegExp|null|Array}
	 */
	function toPrimitive(/**Value*/ value) {
		switch (value.type) {
		case Value.TYPE_BOOLEAN:
		case Value.TYPE_STRING:
		case Value.TYPE_NUMBER:
		case Value.TYPE_REGEXP:
		case Value.TYPE_NULL:
		case Value.TYPE_UNDEFINED:
			return value.value;
		case Value.TYPE_ARRAY:
			return value.properties;
		default:
			return '[object ' + value.type.charAt(0).toUpperCase() + value.type.slice(1) + ']';
		}
	}

	var _calculateBinaryCache = {},
		_calculateUnaryCache = {};

	/**
	 * Calculates the result of a binary operation between two Values.
	 * @returns {Object} The resulting type and value of the operation.
	 */
	function calculateBinary(/**Value*/ lhs, /**string*/ operator, /**Value*/ rhs) {
		if (operator === 'in') {
			return {
				type: Value.TYPE_BOOLEAN,
				value: lhs in rhs.properties
			};
		}

		var calculate = _calculateBinaryCache[operator] ||
			(_calculateBinaryCache[operator] = new Function('lhs,rhs', 'return lhs ' + operator + ' rhs;')),

			value = calculate(toPrimitive(lhs), toPrimitive(rhs));

		return {
			type: typeof value,
			value: value
		};
	}

	/**
	 * Calculates the result of a unary operation on a Value.
	 * @returns {Object} The resulting type and value of the operation.
	 */
	function calculateUnary(/**string*/ operator, /**Value*/ operand) {
		if (operator === 'delete') {
			// TODO: Actually try to delete the property from the parent operand?
			return {
				type: Value.TYPE_BOOLEAN,
				value: true
			};
		}

		var calculate = _calculateUnaryCache[operator] ||
			(_calculateUnaryCache[operator] = new Function('operand', 'return ' + operator + ' operand;')),

			value = calculate(toPrimitive(operand));

		return {
			type: typeof value,
			value: value
		};
	}

	/**
	 * Reads an expression consisting of an operator plus a left and right operand.
	 * @param expression The expression to read.
	 * @returns {Value}
	 */
	function readBinaryExpression(/**Node*/ expression) {
		var lhsValue = read(expression.left),
			rhsValue = read(expression.right);

		if (!lhsValue || !rhsValue) {
			console.info('Cannot resolve value');
			return new Value({ type: (lhsValue && lhsValue.type) || (rhsValue && rhsValue.type) || Value.TYPE_UNDEFINED });
		}

		return new Value(calculateBinary(lhsValue, expression.operator, rhsValue));
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

		if (isHoisting && /(?:Expression|Identifier|Literal)$/.test(node.type)) {
			return undefined;
		}

		env.parserState = { range: node.range, location: node.loc };
		return readers[node.type](node, options);
	}

	var isHoisting = false;
	var readers = {
		AssignmentExpression: function (expression) {
			var lhsValue,
				lhsIdentifier = read(expression.left, { asIdentifier: true }),
				rhsValue = read(expression.right);

			// If the LHS is just a plain identifier instead of a MemberExpression, it is returned
			// as-is instead of as an array, but we always expect an array of Identifiers for
			// simplicity.
			if (!Array.isArray(lhsIdentifier)) {
				lhsIdentifier = [ lhsIdentifier ];
			}

			if (!rhsValue) {
				console.info('Cannot resolve replacement value');
				return read(expression.left) || new Value({ type: Value.TYPE_UNDEFINED });
			}

			if (expression.operator === '=') {
				// TODO: Avoid losing comments from LHS?
				env.scope.setVariableValue(lhsIdentifier.map(function (id) { return id.name; }), rhsValue);
				lhsValue = rhsValue;
			}
			else {
				lhsValue = read(expression.left);

				if (!lhsValue) {
					console.info('Cannot resolve origin value');
					return new Value({ type: Value.TYPE_UNDEFINED });
				}

				lang.mixin(lhsValue, calculateBinary(lhsValue, expression.operator.replace(/\=$/, ''), rhsValue));
			}

			return lhsValue;
		},

		ArrayExpression: function (expression) {
			var array = [],
				value = new Value({
					type: Value.TYPE_ARRAY,
					properties: array
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
				// but var hoisting might
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

		BinaryExpression: readBinaryExpression,

		BreakStatement: nobodyCares,

		CallExpression: function (expression) {
			var callee = read(expression.callee),
				calleeIdentifier = read(expression.callee, { asIdentifier: true });

			if (!Array.isArray(calleeIdentifier)) {
				calleeIdentifier = [ calleeIdentifier ];
			}

			var args = [];
			for (var i = 0, argument; (argument = expression.arguments[i]); ++i) {
				args.push({ raw: argument, evaluated: read(argument) });
			}

			try {
				return callHandlers.match({
					callee: callee,
					identifier: calleeIdentifier
				}, args) || new Value({ type: Value.TYPE_UNDEFINED });
			}
			catch (error) {
				if (error.message !== 'No match found') {
					throw error;
				}

				// Call handler for this call was not found so AdapterRegistry threw
				console.debug('No call handler found for ' + calleeIdentifier.map(function (id) { return id.name; }).join('.'));
			}

			// TODO: Dunno!
			return new Value({ type: Value.TYPE_UNDEFINED });
		},

		CatchClause: function (clause) {
			if (isHoisting === hoist.TYPE_LET) {
				return;
			}

			if (isHoisting) {
				read(clause.body);
			}
			else {
				env.pushScope();

				env.scope.addVariable(clause.param.name);

				hoist(clause.body, hoist.TYPE_LET);
				read(clause.body, { noNewScope: true });

				env.popScope();
			}
		},

		ConditionalExpression: function (expression) {
			var test = read(expression.test);
			return read(test && toPrimitive(test) ? expression.consequent : expression.alternate);
		},

		ContinueStatement: nobodyCares,

		DoWhileStatement: function (statement) {
			// TODO: Do we care about test?
			read(statement.body);
		},

		DebuggerStatement: nobodyCares,

		EmptyStatement: nobodyCares,

		ExpressionStatement: createPassthroughReader('expression'),

		ForStatement: function (statement) {
			if (isHoisting === hoist.TYPE_LET) {
				// let hoisting should not descend into other blocks,
				// but var hoisting might
				return;
			}

			if (isHoisting) {
				statement.init && read(statement.init);
				read(statement.body);
			}
			else {
				env.pushScope();

				// init, test, and update can all be null if they are empty in the source
				statement.init && hoist(statement.init, hoist.TYPE_LET);
				hoist(statement.body, hoist.TYPE_LET);

				// TODO: Do we care about test/update?
				// TODO: Iterate?

				statement.init && read(statement.init);
				read(statement.body, { noNewScope: true });

				env.popScope();
			}
		},

		ForInStatement: function (statement) {
			if (isHoisting === hoist.TYPE_LET) {
				// let hoisting should not descend into other blocks,
				// but var + let hoisting might
				return;
			}

			if (isHoisting) {
				read(statement.left);
				read(statement.body);
			}
			else {
				env.pushScope();

				hoist(statement.left, hoist.TYPE_LET);

				// TODO: Iterate?

				read(statement.body, { noNewScope: true });

				env.popScope();
			}
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
			// TODO: Do we care about test?
			read(statement.consequent);
			statement.alternate && read(statement.alternate);
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

		LogicalExpression: readBinaryExpression,

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
					resolvedName.push({ type: 'Identifier', name: computedValue.value });
				}
				else {
					// can't resolve it
					// TODO: Maybe provide a better value here.
					return new Value({ type: Value.TYPE_UNDEFINED });
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

			statement.argument && env.functionScope.relatedFunction.returns.push(read(statement.argument));
		},

		SequenceExpression: function (sequence) {
			// can't just use a StatementListReader here
			// because we need to return the value of the
			// last expression in the list
			for (var i = 0, expression, value; (expression = sequence.expressions[i]); ++i) {
				value = read(expression);
			}

			return value;
		},

		SwitchStatement: function (statement) {
			// TODO: Do we care about discriminant?
			for (var i = 0, switchCase; (switchCase = statement.cases[i]); ++i) {
				// TODO: Do we care about test?
				// Note that test is null for the default case.
				read(switchCase.consequent);
			}
		},

		ThisExpression: function (expression, options) {
			options = options || {};

			return options.asIdentifier ? { type: 'Identifier', name: 'this' } :
				// TODO: Global object is environment specific!
				(env.functionScope.relatedFunction || env.globalScope.vars.window);
		},

		ThrowStatement: function (statement) {
			if (isHoisting) {
				return;
			}

			// Might be a throw in the global scope, in which case there is no related function
			env.functionScope.relatedFunction && env.functionScope.relatedFunction.throws.push(read(statement.argument));
		},

		TryStatement: function (statement) {
			read(statement.block);

			// The Parser API has an extension for handling multiple catch handlers, but there
			// is only ever one catch handler per try block in spec-compliant scripts
			statement.handlers[0] && read(statement.handlers[0]);

			statement.finalizer && read(statement.finalizer);
		},

		UnaryExpression: function (expression) {
			var value = read(expression.argument);

			if (!value) {
				console.info('Cannot resolve unary value');
				return new Value({ type: Value.TYPE_UNDEFINED });
			}

			return new Value(calculateUnary(expression.operator, value));
		},

		UpdateExpression: function (expression) {
			var value = read(expression.argument),
				difference;

			if (!value) {
				return new Value({
					type: Value.TYPE_NUMBER,
					value: NaN
				});
			}

			if (expression.operator === '++') {
				value.value++;
				difference = 1;
			}
			else {
				value.value--;
				difference = -1;
			}

			return new Value({
				type: Value.TYPE_NUMBER,
				value: expression.prefix ? value.value : value.value - difference
			});
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

		WhileStatement: function (statement) {
			// TODO: Do we care about test?
			read(statement.body);
		},

		WithStatement: function (statement) {
			// TODO: Not impossible to implement, but is it worth it?
			console.warn('"with" statement detected; block ignored. Refactor your code.');
		}
	};

	return env.parse = function () {
		read(esprima.parse(env.file.source, { range: true, comment: true, loc: true }));
	};
});