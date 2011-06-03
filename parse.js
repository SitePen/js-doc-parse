var tokenizer = require('uglify-js').parser.tokenizer,
	arrayToHash = require('uglify-js').parser.array_to_hash,
	fs = require('fs');

// PARSER:
// 1. build tree
// 2. hoist variable declarations within each function block
// 3. build symbol map for each block
//
// DOC BUILDER:
// 1. handle mixin to modules
// 2. handle dojo.declare of modules
// 3. handle return objects or functions as module
// 4. handle assignment onto modules from within other modules

function parse(data) {
	// These operators can be prefixed to an otherwise unremarkable function definition to turn it into a function
	// expression that can be immediately invoked
	var OPERATORS_RTL = arrayToHash([ '!', '~', '+', '-', 'typeof', 'void', 'delete' ]),

		OPERATORS_ASSIGN = arrayToHash([ '=', '+=', '-=', '/=', '*=', '%=', '>>=', '<<=', '>>>=', '|=', '^=', '&=' ]),

		tree = [],
		fuid = 0,
		T = (function () {
			var getRawToken = tokenizer(data),
				prevToken,
				currToken,
				nextToken;

			/**
			 * Tests whether a token matches the specified type and (optional) value.
			 */
			function tokenIs(type, value) {
				return this.type === type &&
					(value == null || (typeof value === 'object' ? value[this.value] : this.value === value));
			}

			/**
			 * Gets the next token from the tokenizer and decorates it with the tokenIs function.
			 */
			function getToken() {
				var token = getRawToken();
				token.is = tokenIs;

				currToken && (token.comments_after = currToken.comments_before);

				// Probably incorrect automatic semicolon insertion
				// TODO: Try to fix this, or remove it completely if ASI is superfluous
/*				if (!token.is('punc', ';') && !token.is('operator') && currToken && !currToken.is('punc', ';') &&
					(token.nlb || token.is('punc', '}'))) {

					nextToken = token;
					token = {
						type: 'punc',
						value: ';',
						line: token.line,
						col: token.col,
						pos: 'asi',
						nlb: false,
						is: tokenIs
					};
				}*/

				return token;
			}

			return {
				/**
				 * Gets the previous token without rewinding the tokenizer.
				 */
				get prev() {
					return prevToken;
				},

				/**
				 * Gets the next token without forwarding the tokenizer.
				 */
				get peek() {
					return nextToken || (nextToken = getToken());
				},

				/**
				 * Gets the current token.
				 */
				get curr() {
					return currToken || T.next();
				},

				/**
				 * Forwards the tokenizer and returns the next token.
				 */
				next: function () {
					prevToken = currToken;

					if (nextToken) {
						currToken = nextToken;
						nextToken = undefined;
					}
					else {
						currToken = getToken();
					}

					return currToken;
				},

				/**
				 * Checks that the current token matches the given type and optional value, and throws an error
				 * if it does not.
				 */
				expect: function (type, value) {
					if (!T.curr.is(type, value)) {
						throw new Error('Expected ' + type + ' ' + value + '; got ' + T.curr.type + ' ' + T.curr.value +
										' at ' + (T.curr.line + 1) + ':' + (T.curr.col + 1));
					}
				},

				/**
				 * Fast forwards through the list of tokens until a token matching the given type and optional
				 * value is discovered. Leaves the tokenizer pointing at the first token after the matched token.
				 * Returns an array of tokens that were forwarded through, excluding the initial token and the
				 * matched token.
				 */
				nextUntil: function (type, value) {
					var tokens = [];

					while (this.next() && !this.curr.is(type, value)) {
						if (this.curr.is('eof')) {
							throw new Error('Unexpected end of file at ' + (this.curr.line + 1) + ':' + (this.curr.col + 1));
						}

						if (this.curr.is('punc', '{')) {
							tokens.push(this.nextUntil('punc', '}'));
						}
						else if (this.curr.is('punc', '[')) {
							tokens.push(this.nextUntil('punc', ']'));
						}
						else if (this.curr.is('punc', '(')) {
							tokens.push(this.nextUntil('punc', ')'));
						}
						else {
							tokens.push(this.curr);
						}
					}

					this.next(); // skip closing token

					return tokens;
				}
			}
		}());

	/**
	 * Reads an entire list of names with refinements and returns it as an array of tokens. Leaves the tokenizer
	 * pointing at the first token after the symbol.
	 * TODO: Look for @name hints
	 */
	function readSymbol() {
		var symbol = [];

		if (!T.curr.is('name')) {
			throw new Error('Not a valid symbol');
		}

		symbol.push(T.curr);
		T.next();

		while (true) {
			// foo.bar
			if (T.curr.is('punc', '.')) {
				T.next(); // skip .
				symbol.push(T.curr);
				T.next();
			}

			// foo['bar']
			else if (T.curr.is('punc', '[')) {
				// nextUntil skips both [ and ]
				symbol.push(T.nextUntil('punc', ']'));
			}

			// symbol definition is done, or someone did something invalid
			else {
				break;
			}
		}

		return symbol;
	}

	/**
	 * Reads a list of function arguments and returns it as an array. Leaves the tokenizer pointing at the first token
	 * after the closing parenthesis of the arguments list.
	 */
	function readArguments() {
		var args = [];

		T.expect('punc', '(');
		T.next(); // skip (

		while (!T.curr.is('punc', ')')) {
			if (T.curr.is('eof')) {
				throw new Error('Unexpected end of file at ' + (T.curr.line + 1) + ':' + (T.curr.col + 1));
			}

			args.push(readStructure());

			if (T.curr.is('punc', ',')) {
				T.next(); // skip , but not )
			}
		}

		T.next(); // skip )

		return args;
	}

	/**
	 * Reads a statement from a function body. Only function calls, variable declarations, and assignments are parsed;
	 * everything else is ignored. Leaves the tokenizer pointing at the first token after the statement. Returns a
	 * single statement or an array of statements.
	 */
	function readStatement() {
		// TODO: Don’t predefine what the statement is going to look like here; use a constructor instead
		var statement = {
			type: undefined, // 'call', 'assign', 'var', 'return'
			symbol: undefined, // name of object that has been called or assigned
			value: undefined // for calls, the list of arguments; for assignments, the assigned value;
			                 // for variable definitions, not sure yet TODO
		};

		// function call or assignment
		if (T.curr.is('name')) {
			statement.symbol = readSymbol();

			// function call
			if (T.curr.is('punc', '(')) {
				console.log('CALL:', statement.symbol.map(function reduce(item) {
					return Array.isArray(item) ? '[' + item.map(reduce).join('.') + ']' : item.value;
				}).join('.'));

				statement.type = 'call';
				statement.value = readArguments();
			}

			// assignment
			else if (T.curr.is('operator', OPERATORS_ASSIGN)) {
				T.next(); // skip assignment operator

				statement.type = 'assign';
				statement.value = readStructure();
			}

			// something else weird
			else {
				var e = new Error('I really don’t know what to do with ' + T.curr.type + ' value ' + T.curr.value + ' at ' + T.curr.line + ':' + T.curr.col);
				e.token = T.curr;
				throw e;
			}
		}

		// function declaration
		else if (T.curr.is('keyword', 'function')) {
			var functionValue = readStructure();

			statement = [
				{ type: 'var', symbol: functionValue.name },
				{ type: 'assign', symbol: functionValue.name, value: functionValue }
			];
		}

		// variable declaration
		else if (T.curr.is('keyword', 'var')) {
			// returning an array of statements is cool TODOC
			statement = [];

			T.next(); // skip keyword 'var'
			T.expect('name');

			// merge comments on 'var' keyword with comments on first defined symbol
			T.curr.comments_before = T.prev.comments_before.concat(T.curr.comments_before);

			do {
				if (T.peek.is('operator', '=')) {
					var innerStatement = readStatement();
					statement.push({
						type: 'var',
						symbol: innerStatement.symbol
					}, innerStatement);
				}
				else {
					statement.push({
						type: 'var',
						symbol: readSymbol()
					});
				}
			} while (T.curr.is('punc', ',') && T.next());
		}

		// iife
		else if ((T.curr.is('punc', '(') || T.curr.is('operator', OPERATORS_RTL)) && T.peek.is('keyword', 'function')) {
			T.next(); // skip operator
			T.curr.comments_before = T.prev.comments_before.concat(T.curr.comments_before);
			statement.type = 'iife';
			statement.value = readStructure();

			if (T.curr.is('punc', ')')) {
				T.next(); // skip ) in the case of a call like (function () {})()
			}

			statement.args = readArguments();
		}

		// return value
		else if (T.curr.is('keyword', 'return')) {
			T.next(); // skip keyword 'return'
			statement.type = 'return';
			statement.value = readStructure();
		}

		// something we do not care about
		else {
			console.log('skipping', T.curr.type, T.curr.value);
			T.next(); // skip token
			return [];
		}

		return statement;
	}

	/**
	 * Reads literal data structures. Leaves the tokenizer pointing at the first token after the structure.
	 */
	function readStructure() {
		// Whether or not to skip the last token or not; keeps refs from stepping too far
		var skipLast = true,
			structure = {
				type: undefined, // function, array, object, boolean, null, undefined, string, num, regexp, name, ref
				value: undefined,
				name: undefined // for function declarations
			};

		// function literal
		if (T.curr.is('keyword', 'function')) {
			structure.type = 'function';
			// TODO: Figure out how to transplant comments from earlier punctuation or operators
			structure.comments_before = T.curr.comments_before.slice(0);
			structure.value = {
				params: [],
				body: undefined
			};

			if (T.peek.is('name')) {
				T.next(); // skip 'function' keyword
				structure.name = T.curr.value;
			}
			else {
				structure.name = '*anon' + (++fuid);
			}

			T.next(); // skip function name or 'function' keyword
			T.expect('punc', '(');

			while (T.next() && !T.curr.is('punc', ')')) {
				if (T.curr.is('punc', ',')) {
					continue;
				}

				structure.value.params.push(T.curr);
			}

			T.next(); // skip )
			T.expect('punc', '{');
			T.next(); // skip {

			structure.value.body = parseFunctionBody();
		}

		// expression
		else if (T.curr.is('punc', '(')) {
			structure.type = 'expression';
			structure.value = T.nextUntil('punc', ')');
			console.log('expression not implemented');
		}

		// array literal
		else if (T.curr.is('punc', '[')) {
			structure.type = 'array';
			structure.value = T.nextUntil('punc', ']');
			console.log('array literal not implemented');
		}

		// object literal
		else if (T.curr.is('punc', '{')) {
			structure.type = 'object';
			structure.value = T.nextUntil('punc', '}');
			console.log('object literal not implemented');
		}

		// boolean literal
		else if (T.curr.is('name', 'true') || T.curr.is('name', 'false')) {
			structure.type = 'boolean';
			structure.value = !!T.curr.value;
		}

		// null primitive
		else if (T.curr.is('name', 'null')) {
			structure.type = 'null';
			structure.value = null;
		}

		// undefined primitive
		else if (T.curr.is('name', 'undefined')) {
			structure.type = 'undefined';
			structure.value = undefined;
		}

		// reference
		else if (T.curr.is('name')) {
			// TODO: See if it has been defined earlier in the scope
			structure.type = 'ref';
			structure.value = readSymbol();
			skipLast = false;
		}

		// string, number, regular expression literals
		// TODO: Might want to do something else here instead depending upon what ends up being done with other stuff
		else if (T.curr.is('string') || T.curr.is('num') || T.curr.is('regexp')) {
			structure.type = T.curr.type;
			structure.value = T.curr;
		}

		// object instance
		else if (T.curr.is('operator', 'new')) {
			T.next(); // skip 'new' operator

			structure.type = 'instance';
			structure.value = readStatement();
		}

		// all others
		else {
			throw new Error('Unknown structure type ' + T.curr.type + ' with value ' + T.curr.value);

			structure.type = T.curr.type;
			structure.value = T.curr;
		}

		skipLast && T.next(); // skip last token in structure

		return structure;
	}

	function parseFunctionBody() {
		var block = [];

		while (!T.curr.is('punc', '}') && !T.curr.is('eof')) {
			// TODO: Probably smarter to forward past the punctuation elsewhere
			if (T.curr.is('punc', ';')) {
				T.next();
				continue;
			}

			block = block.concat(readStatement());
		}

		return block;
	}

	return parseFunctionBody();
}

/* -----[ Main ] ----- */

var config = {
	baseUrl: '/mnt/devel/web/dojo-trunk/',

	moduleMap: {
		dojo: 'dojo',
		dijit: 'dijit',
		dojox: 'dojox'
	}
};

var modules = {};

// from dojo loader
function resolveRelativeId(path) {
	var result = [], segment, lastSegment;
	path = path.split('/');
	while (path.length) {
		segment = path.shift();
		if (segment === '..' && result.length && lastSegment != '..') {
			result.pop();
		}
		else if(segment != '.') {
			result.push((lastSegment = segment));
		} // else ignore '.'
	}

	return result.join('/');
}

function getModuleIdFromPath(path) {
	var result = resolveRelativeId(path);

	for (var module in config.moduleMap) {
		var pathPrefix = config.baseUrl + config.moduleMap[module];

		if (pathPrefix.charAt(-1) !== '/') {
			pathPrefix += '/';
		}

		if (result.indexOf(pathPrefix) === 0) {
			result = result.substr(pathPrefix.length);
			break;
		}
	}

	result = result.replace(/^\/|\.js$/g, '');

	// TODO: Update to use more traditional AMD module map pattern
	return result === 'main' ? module : module + '/' + result;
}

function processFile(path) {
	var fileModuleId = getModuleIdFromPath(path),
		tree = parse(fs.readFileSync(path, 'utf8'));

	console.log(require('util').inspect(tree, null, null));
}

/*var token;
var getToken = tokenizer(fs.readFileSync(process.argv[2], 'utf8'));

while ((token = getToken()).type !== 'eof') {
	console.dir(token);
}

process.stdout.end();
process.exit(0);*/

process.argv.slice(2).forEach(function processPath(parent, path) {
	path = (parent + (path ? '/' + path : '')).replace(/\/{2,}/g, '/');

	var stats = fs.statSync(path);

	if (stats.isDirectory()) {
		fs.readdirSync(path).forEach(processPath.bind(this, path));
	}
	else if (stats.isFile() && /\.js$/.test(path)) {
		processFile(path);
	}
});