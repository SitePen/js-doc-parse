define([
	'bdParse/lib/main',
	'bdParse/lib/types',
	'./env',
	'./node!fs',
	'./node!util'
], function (bdParse, types, env, fs, util) {
	types = types.symbols;

	/**
	 * @param token A node in the ASN tree.
	 * @param context Context for an operation.
	 * @param isHoisting Whether or not to find variable declarations only (to emulate hoisting).
	 */
	function readTree(token, context, isHoisting) {
		var i, child;

		// Statement block ~ DONE
		if (is(token, types.asnRoot) || is(token, types.tBlock)) {
			if (is(token, types.asnRoot)) {
				// Hoist variables in global scope
				console.debug('Hoisting root');
				for (i = 0; (child = token.children[i]); ++i) {
					readTree(child, undefined, true);
				}
			}

			console.debug('Reading root');
			for (i = 0; (child = token.children[i]); ++i) {
				readTree(child);
			}
		}

		// Function definition or function literal
		else if (is(token, types.asnFunctionDef) || is(token, types.asnFunctionLiteral)) {
			var functionName = token.children[0],
				parameters = token.children[1],
				statements = token.children[2];

			if (isHoisting) {
				// Hoist function declarations
				is(token, types.asnFunctionDef) && env.scope.addVariable(functionName.value);
				return;
			}

			console.debug('Reading function', functionName.value);

			env.pushScope();

			if (is(token, types.asnFunctionLiteral) && functionName) {
				env.scope.addVariable(functionName.value);
				// TODO: set variable to this function
			}

			for (i = 0; (child = parameters[i]); ++i) {
				env.scope.addVariable(child.value);
			}

			// Find var declarations (hoisting)
			for (i = 0; (child = statements[i]); ++i) {
				readTree(child, undefined, true);
			}

			// Read actual function
			for (i = 0; (child = statements[i]); ++i) {
				readTree(child);
			}

			var functionScope = env.popScope();
			return "Here be function"; // TODO: return a function Value or something I think
		}

		// Single statement and ASN primitives
		else if (is(token, types.asnStatement) || is(token, types.asnString) || is(token, types.asnNumber) ||
				 is(token, types.asnName) || is(token, types.asnRegEx)) {
			return readTree(token.children, context, isHoisting);
		}

		// For loop ~ DONE
		else if (is(token, types.tFor)) {
			var initial = token.children[0],
				test = token.children[1],
				update = token.children[2],
				statements = token.children[3]; // tBlock or single statement

			// If initial is an array, it indicates that it is a var statement;
			// read this statement to avoid false assignments to global within the
			// loop
			if (isHoisting) {
				if (lang.isArray(initial)) {
					for (i = 0; (child = initial[i]); ++i) {
						env.scope.addVariable(child.value);
					}
				}

				return;
			}

			readTree(statements);
		}

		// For-in loop ~ DONE
		else if (is(token, types.asnForIn)) {
			var isVar = token.children[0],
				assignTo = token.children[1],
				fromObject = token.children[2],
				statements = token.children[3]; // tBlock or single statement

			// TODO: bdParse was extended to support this, not a native thinger.
			// By default, children[0] is assignTo
			if (isHoisting) {
				isVar && env.scope.addVariable(assignTo.value);
				return;
			}

			readTree(statements);
		}

		// variable declaration ~ DONE
		else if (is(token, types.asnVar)) {
			if (isHoisting) {
				for (i = 0; (child = token.children[i]); ++i) {
					env.scope.addVariable(child.name.value);
				}

				return;
			}

			for (i = 0; (child = token.children[i]); ++i) {
				child.initialValue && env.scope.setVariableValue(child.name.value, readTree(child.initialValue, context));
			}
		}

		// new ___
		else if (!isHoisting && is(token, types.tNew)) {
			var clazz = token.children[0],
				args = [];

			// new instance with arguments
			if (is(clazz, types.asnBinaryOp) && is(clazz.children[0], tPunc, '(')) {
				clazz = clazz.children[1];
				args = clazz.children[2];
			}

			// clazz might be a single tName but it might also be a tree of accessors
			// or a function
			clazz = readTree(clazz);

			return {
				type: 'instance',
				value: clazz,
				arguments: args
			};
		}

		// Some binary operation
		else if (!isHoisting && is(token, types.asnBinaryOp)) {
			var operator = token.children[0],
				lhs = token.children[1],
				rhs = token.children[2];

			// Assignment
			if (is(operator, types.tOperator, '=')) {
				env.scope.setVariableValue(readTree(lhs).map(treeToValues), readTree(rhs));
			}

			// Function call
			if (is(operator, types.tPunc, '(')) {
				var functionName = readTree(token.children[1]), // function or function reference
					args = token.children[2];
			}

			// Dot accessor
			if (is(operator, types.tPunc, '.')) {
				context = context || [];

				context.unshift(rhs.children);

				if (is(lhs, types.asnBinaryOp)) {
					readTree(lhs, context);
				}
				else {
					context.unshift(lhs.children);
				}

				return context;
			}

			// Bracket accessor
			if (is(operator, types.tPunc, '[')) {
				context = context || [];

				context.unshift(is(rhs, types.tString) ? rhs.children : readTree(rhs), lhs.children);
				return context;
			}

			// A default value for a property
			if (is(operator, types.tOperator, '||') && !is(rhs, types.asnBinaryOp)) {
				return rhs.children;
			}
		}

		// An object
		else if (!isHoisting && is(token, types.asnObject)) {
			var object = {}, key, value;
			
			for (i = 0; (child = token.children[i]); ++i) {
				key = child[0];
				value = child[1];
				
				object[key.value] = readTree(value);
			}
			
			return {
				type: 'object',
				value: object
			};
		}

		// An array
		else if (!isHoisting && is(token, types.tArray)) {
			return {
				type: 'array',
				value: token
			};
		}

		// A name, string, number, regular expression, boolean, null
		else if (!isHoisting && token.type.isExprAtom) {
			
			// Regular expression
			if (is(token, types.tRegEx)) {
				console.log(token.value);
				var regExp = /^\/(.*)\/([gim]*)$/.exec(token.value);
				return new RegExp(regExp[1], regExp[2]);
			}
			
			// Name
			if (is(token, types.tName)) {
				return token;
			}
			
			return token.value;
		}

		else if (!isHoisting) {
			console.warn('Unimplemented type', token.type.value);
			console.debug(util.inspect(token, null, null));
		}
	}

	function is(token, type, value) {
		return token.type === type && (value === undefined || token.value === value);
	}

	function treeToValues(item) {
		return item.name ? item.name.value : item.value;
	}

	function attachComments(tokens) {
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
		readTree(bdParse.parseText(fs.readFileSync(path, 'utf8').replace(/\/*=====|=====*\//g, ''), attachComments)[1]);
		console.log(util.inspect(env, null, null));
	};
});