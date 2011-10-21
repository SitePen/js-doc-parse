define([
	'bdParse/lib/main',
	'bdParse/lib/types',
	'dojo/_base/lang',
	'./env',
	'./callHandlers',
	'./File',
	'./Value',
	'./Module',
	'./node!util'
], function (bdParse, types, lang, env, callHandlers, File, Value, Module, util) {
	types = types.symbols;

	/**
	 * @param token A node in the ASN tree.
	 * @param options context    Context for an operation that involves reading a list of accessors.
	 *                parentFunction The parent function Value for the current tree of statements.
	 *                isHoisting Whether or not to find variable declarations only (to emulate hoisting).
	 *                readRaw    Whether or not to return a raw set of tokens instead of a Value. Used when collecting
	 *                           tNames.
	 */
	function readTree(token, options) {
		var i, child;

		options = options || {};

		// Used to put line/column in log messages
		env.token = token;

		// Statement block ~ DONE
		if (is(token, types.asnRoot) || is(token, types.asnBlock)) {
			if (is(token, types.asnRoot)) {
				// Hoist variables in global scope
				console.debug('Hoisting root');
				for (i = 0; (child = token.children[i]); ++i) {
					readTree(child, { isHoisting: true });
				}

				console.debug('Reading root');
			}

			for (i = 0; (child = token.children[i]); ++i) {
				readTree(child, options);
			}
		}

		// Function definition or function literal
		else if (is(token, types.asnFunctionDef) || is(token, types.asnFunctionLiteral)) {
			var functionName = token.children[0],
				parameters = token.children[1],
				statements = token.children[2],
				value = new Value({
					type: 'function'
				});

			if (options.isHoisting) {
				// Hoist function declarations
				is(token, types.asnFunctionDef) && env.scope.addVariable(functionName, value);
				return;
			}

			console.debug('Reading function', functionName.value);

			env.pushScope();
			
			// TODO: If this never ends up being used, remove it
			env.scope.relatedFunction = value;

			if (is(token, types.asnFunctionLiteral) && functionName) {
				env.scope.addVariable(functionName.value, value);
			}

			for (i = 0; (child = parameters[i]); ++i) {
				parameters[i] = env.scope.addVariable(child.value, new Value({ type: 'parameter' }));
				parameters[i].value = child;
			}

			// Find var declarations (hoisting)
			for (i = 0; (child = statements[i]); ++i) {
				readTree(child, { isHoisting: true });
			}

			// Read actual function
			for (i = 0; (child = statements[i]); ++i) {
				readTree(child, { parentFunction: value });
			}

			return lang.mixin(value, {
				parameters: parameters,
				scope: env.popScope()
			});
		}

		// Miscellaneous statements
		else if (is(token, types.asnBreak) || is(token, types.asnContinue) || is(token, types.asnCase)) {
			// do nothing
		}

		// Throw statement
		else if (is(token, types.asnThrow)) {
			// TODO: Does nothing for now, later it should document what a function throws
		}

		// ASN primitives
		else if (is(token, types.asnString) || is(token, types.asnNumber) || is(token, types.asnRegEx)) {
			var value = readTree(token.children);

			return new Value({
				type: typeof value,
				value: value
			});
		}

		// Single statement or name
		else if (is(token, types.asnStatement) || is(token, types.asnName)) {
			// Empty statement
			if (!token.children) {
				return;
			}

			return readTree(token.children, options);
		}

		// For loop ~ DONE
		else if (is(token, types.asnFor)) {
			var initial = token.children[0][0], // index 0 is array of variables or an expression; index 1 is the
				test = token.children[1],       // terminating semicolon so just go directly for the data
				update = token.children[2],
				statements = token.children[3]; // tBlock or single statement

			// If initial is an array, it indicates that it is a var statement;
			// read this statement to avoid false assignments to global within the
			// loop
			if (options.isHoisting) {
				if (Array.isArray(initial)) {
					for (i = 0; (child = initial[i]); ++i) {
						env.scope.addVariable(child.name.value);
					}
				}

				return;
			}

			// TODO: Do we actually care about this crap?
			if (Array.isArray(initial)) {
				for (i = 0; (child = initial[i]); ++i) {
					env.scope.setVariableValue(child.name.value, readTree(child.initialValue));
				}
			}

			readTree(statements, options);
		}

		// For-in loop ~ DONE
		else if (is(token, types.asnForIn)) {
			var isVar = token.children[0],
				assignTo = token.children[1],
				fromObject = token.children[2],
				statements = token.children[3]; // tBlock or single statement

			// TODO: bdParse was extended to support this, not a native thinger.
			// Normally, children[0] is assignTo
			if (options.isHoisting) {
				isVar && env.scope.addVariable(assignTo.value);
				return;
			}

			readTree(statements, options);
		}

		// While loop ~ DONE
		else if (is(token, types.asnWhile)) {
			var condition = token.children[0],
				statements = token.children[1];

			readTree(statements, options);
		}

		// Do-while loop ~ DONE
		else if (is(token, types.asnDo)) {
			var condition = token.children[1],
				statements = token.children[0];

			readTree(statements, options);
		}

		// Switch
		else if (is(token, types.asnSwitch)) {
			var condition = token.children[0],
				statements = token.children[1];


		}

		// If/else ~ DONE
		else if (is(token, types.asnIf)) {
			var condition = token.children[0],
				trueBlock = token.children[1],
				falseBlock = token.children[2];

			readTree(condition, options);
			readTree(trueBlock, options);
			falseBlock && readTree(falseBlock, options);
		}

		// Ternary
		else if (!options.isHoisting && is(token, types.asnConditional)) {
			var condition = token.children[0],
				trueExpression = token.children[1],
				falseExpression = token.children[2];

			return readTree(falseExpression, options);
		}

		// variable declaration ~ DONE
		else if (is(token, types.asnVar)) {
			if (options.isHoisting) {
				for (i = 0; (child = token.children[i]); ++i) {
					env.scope.addVariable(child.name.value);
				}

				return;
			}

			for (i = 0; (child = token.children[i]); ++i) {
				// TODO: Need to move comments from child or name token to Value
				child.initialValue && env.scope.setVariableValue(child.name.value, readTree(child.initialValue, options));
			}
		}

		// new ___
		else if (!options.isHoisting && is(token, types.asnNew)) {

			var clazz = token.children[0],
				args = [];

			// new instance with arguments
			if (is(clazz, types.asnBinaryOp) && is(clazz.children[0], types.tPunc, '(')) {
				args = clazz.children[2];
				clazz = clazz.children[1];
			}

			// clazz might be a single tName but it might also be a tree of accessors
			// or a function
			clazz = readTree(clazz);

			return new Value({
				type: 'instance',
				value: clazz,
				arguments: args
			});
		}

		// Some unary operation
		else if (!options.isHoisting && is(token, types.asnUnaryPrefix)) {
			var operator = token.children[0],
				rhs = token.children[1];

			if (is(operator, types.tOperator, '!')) {
				var value = new Value({ type: 'boolean' }),
					reverseRhs = true;

				if (is(rhs, types.asnUnaryPrefix) && is(rhs.children[0], types.tOperator, '!')) {
					reverseRhs = false;
					rhs = rhs.children[1];
				}

				console.log(rhs);

				// Array, object, regex, function literals all coerce to true
				if (is(rhs, types.asnArray) || is(rhs, types.asnObject) || is(rhs, types.asnRegEx) ||
					is(rhs, types.asnFunctionLiteral)) {

					value.value = reverseRhs ? false : true;
				}

				// Numbers, strings, null, true, false coerce depending upon their value
				else if (is(rhs, types.asnNumber) || is(rhs, types.asnString) || is(rhs, types.asnAtom) ||
						 (is(rhs, types.asnName) && rhs.children.type.isExprAtom)) {

					value.value = reverseRhs ? !rhs.children.value : !!rhs.children.value;
				}
				else {
					// TODO: More complex expressions.
				}

				return value;
			}
		}

		// Some binary operation
		else if (!options.isHoisting && is(token, types.asnBinaryOp)) {
			var operator = token.children[0],
				lhs = token.children[1],
				rhs = token.children[2];

			// Assignment
			if (is(operator, types.tOperator, '=')) {
				var assignTo = readTree(lhs, { asArray: true }).map(treeToValues);

				// passing assignTo as context so that the name of the variable
				// identifier can be used elsewhere to determine whether or not
				// a function is a constructor or a normal function
				env.scope.setVariableValue(assignTo, readTree(rhs, { context: assignTo }));
			}

			// Function call
			if (is(operator, types.tPunc, '(')) {
				var functionName = readTree(token.children[1]), // function or function reference
					args = token.children[2],
					functionValue,
					result;

				if (!Array.isArray(functionName)) {
					functionName = [ functionName ];
				}

				for (i = 0; (child = args[i]); ++i) {
					args[i] = readTree(child);
				}

				functionValue = env.scope.getVariable(functionName);

				if (!functionValue) {
					// TODO: Prototypes blah blah blah
					console.warn('Could not find a valid function to return');
					return new Value();
				}

				try {
					result = callHandlers.match(functionValue, args);
				}
				catch (e) {
					console.error(e);
					result = functionValue.returns;
				}

				return result;
			}

			// Dot accessor
			if (is(operator, types.tPunc, '.')) {
				options.context = options.context || [];

				options.context.unshift(rhs.children);

				if (is(lhs, types.asnBinaryOp)) {
					readTree(lhs, options);
				}
				else {
					options.context.unshift(lhs.children);
				}

				// TODO: Really return the context?
				return options.context;
			}

			// Bracket accessor
			if (is(operator, types.tPunc, '[')) {
				options.context = options.context || [];

				options.context.unshift(lhs.children, is(rhs, types.asnString) ? rhs.children : readTree(rhs));

				// TODO: Really return the context?
				return options.context;
			}

			// A default value for a property
			if (is(operator, types.tOperator, '||') && !is(rhs, types.asnBinaryOp)) {
				return rhs.children;
			}
		}

		// An object ~ DONE?
		else if (!options.isHoisting && is(token, types.asnObject)) {
			var object = {}, key, value;

			for (i = 0; (child = token.children[i]); ++i) {
				key = child[0];
				value = readTree(child[1]);

				// TODO: This is kinda hacky!! Somewhere else should probably return Values instead of tokens.
				if (!(value instanceof Value)) {
					value = new Value({
						type: typeof value,
						value: value
					});
				}

				if (key.comments) {
					value.comments = value.comments.concat(key.comments);
				}

				object[key.value] = value;
			}

			return new Value({
				type: 'object',
				properties: object,
				comments: token.comments
			});
		}

		// An array
		else if (!options.isHoisting && is(token, types.asnArray)) {
			return new Value({
				type: 'array',
				comments: token.comments,
				value: token.children
			});
		}

		// A return value
		else if (!options.isHoisting && is(token, types.asnReturn)) {
			if (!options.parentFunction) {
				throw Error('return not in function');
			}

			options.parentFunction.returns.push(readTree(token.children));
		}

		else if (!options.isHoisting && !token.type) {
			console.error('wtf');
			console.log(token);
		}

		// A name, string, number, regular expression, boolean, null
		else if (!options.isHoisting && token.type.isExprAtom) {

			// Regular expression
			if (is(token, types.tRegEx)) {
				console.log(token.value);
				var regExp = /^\/(.*)\/([gim]*)$/.exec(token.value);
				return new RegExp(regExp[1], regExp[2]);
			}

			// Name
			if (is(token, types.tName)) {
				return options.asArray ? [ token ] : token;
			}

			return token.value;
		}

		else if (!options.isHoisting) {
			console.warn('Unimplemented type', token.type.value);
			console.debug(util.inspect(token, null, null));
		}
	}

	/**
	 * Convenience function for checking the type and optionally value of a
	 * token.
	 */
	function is(token, type, value) {
		return token.type === type && (value === undefined || token.value === value);
	}

	/**
	 * A map function to convert the left-hand side tree of an assignment
	 * operation into an array of strings representing the whole identifier
	 * (e.g. aToken.bToken.cToken -> [ 'a', 'b', 'c' ]).
	 */
	function treeToValues(item) {
		return item.name ? item.name.value : item.value;
	}

	/**
	 * Ensures comment tokens are attached to the nearest non-comment token so
	 * that they can be processed.
	 */
	function attachComments(/** Array.<Object> */ tokens) {
		var filtered = [],
			comments = [],
			lastKeywordToken = {},
			token,
			docToken,
			lastDocToken = {};

		for (var i = 0, j; (token = tokens[i]); ++i) {
			if (token.type === types.tLineComment || token.type === types.tBlockComment) {
				comments.push(token);
			}
			else {
				if (comments.length) {
					// Comment locations:
					// 1. First block of tLineComment tokens inside a function body. Describes the function
					// 2. First tBlockComment token outside a function body. Describes the function
					// 3. First tBlockComment token outside a parameter name. Describes the parameter type
					// 4. First tBlockComment token inside a function body. Describes the return value
					// 5. First block of tLineComment tokens inside an object literal. Describes the object
					// 6. First tLineComment or tBlockComment after the end of a return statement. Describes the return value
					// 7. First tLineComment block or tBlockComment before a tName token inside an object literal. Describes the key

					// Assume comments before a 'var' are intended for the first defined variable
					if (token.type === types.tKeyword && token.value === 'var') {
						tokens[i + 1].commentsBefore = comments;
					}
					else {
						token.commentsBefore = token.commentsBefore ? token.commentsBefore.concat(comments) : comments;
					}

					comments = [];
				}

				if (token.type === types.tKeyword && (types.tKeyword.value === 'return' || types.tKeyword.value === 'function')) {
					// TODO ???
				}

				filtered.push(token);
			}
		}

		if (comments.length) {
			lastNameToken.commentsAfter = comments;
		}

		return filtered;
	}

	return function (path) {
		if (1) {
			env.file = new File(path);
			readTree(bdParse.parseText(env.file.source, attachComments)[1]);
			console.log(util.inspect(Module.getAll(), null, null));
		}
		else {
			console.log(util.inspect(bdParse.parseText(fs.readFileSync(path, 'utf8').replace(/\/*=====|=====*\//g, ''), attachComments)[1], null, null));
		}
	};
});