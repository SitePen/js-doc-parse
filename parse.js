define([
	'dojo/_base/kernel',
	'./lib/Module',
	'./lib/File',
	'./lib/Scope',
	'./lib/Value',
	'./lib/Reference',
	'./lib/Parameter',
	'./lib/scrollableTokenizer',
	'./lib/env',
	'./lib/const',
	'./lib/callHandlers',
	'./lib/node!util',
	'./lib/node!fs',
	'./lib/console'
], function (dojo, Module, File, Scope, Value, Reference, Parameter, scrollableTokenizer, env, consts, callHandlers, util, fs) {
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
	 * @returns {Array}
	 */
	function readName(thisValue) {
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
					console.warn('Skipping complex assignment on ' + name.join('.'));
					isUnresolvable = true;
					token.nextUntil('punc', ']');
				}
			}

			// symbol definition is done, or someone did something invalid
			else {
				break;
			}
		}

		if (!isUnresolvable && name[0] === 'this') {
			if (thisValue) {
				name = thisValue.slice(0, -1).concat(name.slice(1));
			}
			else {
				console.info('Assignment to global via \'this\'');
				name = name.slice(1);
			}
		}

		return isUnresolvable ? null : name;
	}

	/**
	 * Reads an argument list and returns it as an array of structures.
	 * @returns {Array}
	 */
	function readArgumentList() {
		token.expect('punc', '(');
		token.next();

		var args = [];

		while (!token.is('punc', ')')) {
			args.push(readValue());

			if (token.is('punc', ',')) {
				token.next();
			}
		}

		token.next();

		return args;
	}

	function call(nameOrFunction, args) {
		console.log(nameOrFunction, 'called with arguments', args);
	}

	function resolveParameters(fn, args) {
		console.log('resolve', fn, 'with', args);
	}

	/**
	 * Reads a JavaScript program.
	 * @param assignTo If the program being read is a function body that is being assigned to a variable, this is the
	 * name of the variable.
	 * @param value If the program being read is a function body, this is the Value representing the function object.
	 */
	function readProgram(/**Array?*/ assignTo, /**Value?*/ value) {
		var level = 0, startIndex = token.index;

		// Step 2, var declarations
		do {
			if (token.is('keyword', 'function')) {
				// function declarations
				if (!token.peek(-1).is('punc', '(') && !token.peek(-1).is('operator') && token.peek(1).is('name')) {
					token.next();
					env.scope.addVariable(token.value);
				}

				// TODO: read a Statement instead
				token.nextUntil('punc', '{').next().nextUntil('punc', '}');
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

			else if (token.is('punc', consts.OPEN_PUNC)) {
				++level;
			}

			else if (token.is('punc', consts.CLOSE_PUNC)) {
				--level;
			}

			token.next();
		} while (!token.is('eof') && (!token.is('punc', '}') || level > 0));

		token.seekTo(startIndex);

		// Step 3, consume block
		do {
			var lhsName, startIndex, fn;

			// return value
			if (token.is('keyword', 'return') && value) {
				token.next();
				value.returns.push(readValue());
			}

			// anonymous function constructor
			else if (token.is('keyword', 'new') && token.peek().is('keyword', 'function')) {
				console.log('XXX new function constructor');
			}

			// immediately invoked function expression
			else if (token.is('keyword', 'function') && (token.peek(-1).is('operator', '!') || token.peek(-1).is('punc', '('))) {
				fn = readFunction();

				if (token.is('punc', ')')) {
					token.next();
				}

				resolveParameters(fn, readArgumentList());
			}

			else if (token.is('name')) {
				// function declaration
				if (token.peek(-1).is('keyword', 'function')) {
					if (!token.peek(-2).is('punc', '(') && !token.peek(-2).is('operator')) {
						startIndex = token.index - 1;
						lhsName = readName(assignTo);

						token.seekTo(startIndex);
						env.scope.setVariableValue(lhsName, readFunction(true));
					}
				}
				else {
					lhsName = readName(assignTo);

					// assignment
					if (token.is('operator', '=')) {
						token.next();

						env.scope.setVariableValue(lhsName, readValue(lhsName));
					}

					// function call
					else if (token.is('punc', '(')) {
						call(lhsName, readArgumentList());
					}
				}
			}

			else if (token.is('punc', consts.OPEN_PUNC)) {
				++level;
			}

			else if (token.is('punc', consts.CLOSE_PUNC)) {
				--level;
			}

			token.next();
		} while (!token.is('eof') && (!token.is('punc', '}') || level > 0));

		if (env.scope === env.globalScope) {
			console.log('Block read complete');
			console.log(util.inspect(env.globalScope, false, null));
		}
	}

	/**
	 * Reads a value (object, string, regexp, etc.).
	 * @param assignTo The variable to which the value is being assigned. Used to resolve references to “this”
	 * inside functions.
	 * @returns {Value|Reference?} A Value, Reference, or null if the value could not be read (complex expression).
	 */
	function readValue(/**Array?*/ assignTo) {
		var name;

		// structure is a function
		if (token.is('keyword', 'function')) {
			return readFunction(false, assignTo);
		}

		// structure is a reference to another variable
		else if (token.is('name')) {
			var index = token.index;
			name = readName(assignTo);

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

		// structure is an array literal XXX: this seems differently weird from everything else
		else if (token.is('punc', '[')) {
			var array = [];

			token.next();
			while (!token.is('punc', ']')) {
				array.push(readValue());

				token.expect('punc', { ',': true, ']': true });
				if (token.is('punc', ',')) {
					token.next();
				}
			}

			token.next();

			return Value({
				type: 'array',
				value: array
			});
		}

		// structure is an object literal
		else if (token.is('punc', '{') && ((token.peek(1).is('name') && token.peek(2).is('punc', ':') &&
		         !token.peek(3).is('keyword', { 'for': true, 'do': true, 'while': true })) || token.peek().is('punc', '}'))) {

			var obj = {};

			token.next();

			while (!token.is('punc', '}')) {
				name = token.value;
				token.next();
				token.expect('punc', ':');
				token.next();

				if (assignTo) {
					assignTo = assignTo.slice(0);
					assignTo.push(name);
				}
				obj[name] = readValue(assignTo);

				token.expect('punc', { ',': true, '}': true });
				if (token.is('punc', ',')) {
					token.next();
				}
			}

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

	function readFunction(/**boolean*/ isDeclaration, /**Array?*/ assignTo) {
		token.expect('keyword', 'function');
		token.next();

		if (isDeclaration && !token.is('name')) {
			console.warn('Anonymous function declaration');
			return null;
		}

		env.pushScope();
		var value = Value({ type: 'function' });

		if (token.is('name')) {
			if (!isDeclaration) {
				env.scope.addVariable(token.value);
				env.scope.setVariableValue(token.value, value);
			}
			token.next();
		}

		token.expect('punc', '(');
		token.next();
		while (!token.is('punc', ')')) {
			env.scope.addVariable(token.value);
			value.parameters.push(Parameter({
				name: token.value
			}));
			token.next();

			if (token.is('punc', ',')) {
				token.next();
			}
		}

		readProgram(assignTo, value);

		if (token.is('punc', '}')) {
			token.next();
		}

		env.popScope();

		return value;
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