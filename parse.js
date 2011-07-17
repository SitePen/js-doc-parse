define([
	'dojo/_base/kernel',
	'./lib/Module',
	'./lib/File',
	'./lib/Scope',
	'./lib/Value',
	'./lib/Reference',
	'./lib/scrollableTokenizer',
	'./lib/env',
	'./lib/callHandlers',
	'./lib/node!util',
	'./lib/node!fs',
	'./lib/console'
], function (dojo, Module, File, Scope, Value, Reference, scrollableTokenizer, env, callHandlers, util, fs) {
	// TODO: Get from config file/build script/something else
	env.config = {
		baseUrl: '/mnt/devel/web/dojo-trunk/',

		prefixMap: {
			dojo: 'dojo',
			dijit: 'dijit',
			dojox: 'dojox'
		}
	};

	/**
	 * Step 1: Find and add function parameters to scope.
	 * Step 2: Find all var declarations (and other scopes inside the current scope?) and add them to scope.
	 * Step 3: Consume all instructions inside the function body, descending into scopes as necessary, and making
	 *         function calls as necessary.
	 * Step 4: Perform fake function call.
	 * Step 5: Resolve Variable values.
	 * Step 6: Mix in Variable properties to Value.
	 */

	var token;

	/**
	 * Reads a complete accessor name and returns it as an array of its parts.
	 */
	function readName() {
		var name = [ token.value ], isUnresolvable = false;

		// TODO: look to jsdoc for @name hint

		token.next();

		while (true) {
			// foo.bar
			if (token.is('punc', '.')) {
				token.next(); // skip .
				name.push(token.value);
				token.next(); // skip identifier
			}

			// foo['bar']
			else if (token.is('punc', '[')) {
				token.next(); // skip [

				// XXX: complex expressions are not supported at this time but maybe a bit more can be done to support
				// them later
				if (token.is('string') && token.peek().is('punc', ']')) {
					name.push(token.value);
					token.next(2); // skip string & ]
				}
				else {
					isUnresolvable = true;
					token.nextUntil('punc', ']');
				}
			}

			// symbol definition is done, or someone did something invalid
			else {
				break;
			}
		}

		return isUnresolvable ? null : name;
	}

	function readProgram() {
		// Step 2, var declarations
		do {
			if (token.is('keyword', 'function')) {
				// function declarations
				if (!token.peek(-1).is('(') && token.peek(1).is('name')) {
					token.next();
					env.scope.addVariable(token.value);
				}

				// TODO: read a Statement instead
				token.nextUntil('punc', '{').nextUntil('punc', '}');
			}

			else if (token.is('keyword', 'var')) {
				do {
					env.scope.addVariable(token.next().value);

					if (token.peek().is('operator', '=')) {
						// TODO: read an AssignmentExpression instead
						token.nextUntil('punc', {',':1, ';':1});
					}
					else {
						token.next();
					}
				} while (token.is('punc', ','));
			}
		} while (!token.next().is('eof'));

		token.rewind();

		// Step 3, consume block
		do {
			var lhsName, assignTo, startIndex, fn;

			// anonymous function constructor
			if (token.is('keyword', 'new') && token.peek().is('keyword', 'function')) {
				console.log('XXX new function constructor');
			}
			else if (token.is('name')) {
				if (token.peek(-1).is('keyword', 'function')) {
					// function declaration
					if (!token.peek(-2).is('punc', '(')) {
						startIndex = token.index - 1;
						lhsName = readName();

						token.seekTo(startIndex);
						env.scope.setVariableValue(lhsName, readFunction(true));
					}
					// immediately invoked function expression
					else {
						token.seekTo(token.index - 1);
						fn = readFunction();

						if (token.is('punc', ')')) {
							token.next();
						}

						call(fn, readArgumentList());
					}
				}
				else {
					lhsName = readName();

					// assignment
					if (token.is('operator', '=')) {
						token.next();

						env.scope.setVariableValue(lhsName, readStructure());
					}

					// function call
					else if (token.is('punc', '(')) {
						call(lhsName, readArgumentList());
					}
				}
			}
		} while (!token.next().is('eof'));

		if (env.scope === env.globalScope) {
			console.log('Block read complete');
			console.log(util.inspect(env.globalScope, false, null));
		}
	}

	function readStructure() {
		var name;

		// structure is a function
		if (token.is('keyword', 'function')) {
			return readFunction();
		}

		// structure is a reference to another variable
		else if (token.is('name')) {
			var index = token.index;
			name = readName();

			// value is a complex expression XXX: maybe do more later
			if (token.is('operator') && !token.is('operator', '=')) {
				return null;
			}

			// value is a reference to another variable; need to rewind so that the referenced variable can be picked
			// up and defined
			if (token.is('operator', '=')) {
				token.seekTo(index);
			}

			return Reference(name);
		}

		// structure is an empty array literal
		else if (token.is('punc', '[') && token.peek().is('punc', ']')) {
			return Value({ type: 'array', value: [] });
		}

		// structure is an array literal XXX: this seems differently weird from everything else
		else if (token.is('punc', '[')) {
			var array = [];

			token.next();
			do {
				array.push(readStructure());

				token.expect('punc', { ',': true, ']': true });
				if (token.is('punc', ',')) {
					token.next();
				}
			} while (!token.is('punc', ']'));

			token.next();

			return Value({
				type: 'array',
				value: array
			});
		}

		// structure is an empty object literal
		else if (token.is('punc', '{') && token.peek(1).is('punc', '}')) {
			return Value({
				type: 'object'
			});
		}

		// structure is an object literal
		else if (token.is('punc', '{') && token.peek(1).is('name') && token.peek(2).is('punc', ':') &&
		         !token.peek(3).is('keyword', { 'for': true, 'do': true, 'while': true })) {

			var obj = {};

			token.next();

			do {
				name = token.value;
				token.next();
				token.expect('punc', ':');
				token.next();

				obj[name] = readStructure();

				token.expect('punc', { ',': true, '}': true });
				if (token.is('punc', ',')) {
					token.next();
				}
			} while (!token.is('punc', '}'));

			return Value({
				type: 'object',
				properties: obj
			});
		}

		// structure is an object instance
		else if (token.is('keyword', 'new')) {
			token.next();
			console.log('XXX: object instance');
		}

		// structure is a string, number, boolean, regexp, null, or undefined
		else if (token.is('string') || token.is('num') || token.is('regexp') || token.is('atom')) {

			// value is a complex expression XXX: maybe do more later
			if (token.peek().is('operator')) {
				return null;
			}

			var value = Value({
				type: token.type,
				value: token.value
			});

			token.next();

			return value;
		}

		console.warn('Could not read structure ' + token.type + ' ' + token.value + ' at ' + token.line + ':' + token.column);
		return null;
	}

	function readFunction(isDeclaration) {
		env.pushScope();

		token.expect('keyword', 'function');
		token.next();

		// parent should have put this in calleeName
		if (token.is('name')) {
			if (token.value !== calleeName) {
				throw Error('calleeName missing');
			}

			token.next();
		}

		// immediately invoked function expression
		if (assignTo === undefined) {
			readParameterList();
			readFunctionBody();
		}

		env.popScope();
	}

/*
	function readFunctionBody() {
		var fn, varName;

		do {
			if (token.is('keyword', 'function')) {
				// (function () {}()) or (function () {})()
				if (token.peek(-1).is('punc', '(')) {
					var fn = readFunction();

					if (token.is('punc', ')')) {
						token.next();
					}

					handleCall(fn, readArgumentsList());
				}
				// function foo() {}
				else if (token.peek(1).is('name')) {
					readFunction();
				}
			}
			// var …
			else if (token.is('keyword', 'var')) {
				token.next();
				readAssignmentList(true);
			}
			// foo()
			else if (token.is('punc', '(') && token.peek(-1).is('name')) {
				varName = readReverseName
			}

			// foo = …
			else if (token.is('name') && token.peek(1).is('operator', '=')) {
				readAssignmentList();
			}

			// that’s all folks.

		} while (!(token = token.next()).is('eof') && !token.is('punc', '}'));

		env.popScope();
	}*/

	env.file = File(process.argv[3]);
	token = scrollableTokenizer(fs.readFileSync(env.file.filename, 'utf8'));
	readProgram();
});
require(['parse']);