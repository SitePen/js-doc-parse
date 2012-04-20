define([ 'dojo/_base/lang', '../Value', '../Parameter' ], function (lang, Value, Parameter) {
	var env = {};

	/**
	 * A convenience function for creating new Value objects that correspond to a
	 * JavaScript function.
	 * @param parameters An array of arrays with the following keys:
	 *   * 0: The name of the parameter.
	 *   * 1: The type of the parameter.
	 *   * 2: Whether or not the parameter is a rest... parameter.
	 *   * 3: Whether or not the parameter is optional.
	 *   Note that if a parameter is a rest... parameter, it is optional by default.
	 */
	function makeFunctionValue(/**Array*/ parameters, /**Array*/ returns) {
		return new Value({
			type: Value.TYPE_FUNCTION,
			parameters: parameters.map(function (parameter) {
				return new Parameter({
					name: parameter[0],
					type: parameter[1],
					isRest: parameter[2] || false,
					isOptional: parameter[2] || parameter[3] || false
				});
			}),
			returns: returns.map(function (returnType) {
				return new Value({ type: returnType });
			})
		});
	}

	// standard global functions that accept a single string argument and return a string
	[ 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
	  'escape', 'unescape' ].forEach(function (fnName) {
		env[fnName] = makeFunctionValue([ [ 'string', Value.TYPE_STRING ] ], [ Value.TYPE_STRING ]);
	});

	// other global properties and functions
	lang.mixin(env, {
		'this':     new Value({ type: Value.TYPE_OBJECT }),
		NaN:        new Value({ type: Value.TYPE_NUMBER, value: NaN }),
		Infinity:   new Value({ type: Value.TYPE_NUMBER, value: Infinity }),
		undefined:  new Value({ type: Value.TYPE_UNDEFINED }),
		'eval':     makeFunctionValue([ [ 'x', Value.TYPE_STRING ] ], [ Value.TYPE_ANY ]),
		parseInt:   makeFunctionValue([ [ 'string', Value.TYPE_STRING ], [ 'radix', Value.TYPE_NUMBER ] ], [ Value.TYPE_NUMBER ]),
		parseFloat: makeFunctionValue([ [ 'string', Value.TYPE_STRING ] ], [ Value.TYPE_NUMBER ]),
		isNaN:      makeFunctionValue([ [ 'number', Value.TYPE_NUMBER ] ], [ Value.TYPE_BOOLEAN ]),
		isFinite:   makeFunctionValue([ [ 'number', Value.TYPE_NUMBER ] ], [ Value.TYPE_BOOLEAN ])
	});

	env.Object = new Value({
		type: Value.TYPE_CONSTRUCTOR,
		parameters: [
			new Value({ type: Value.TYPE_ANY })
		],
		properties: {
			prototype: new Value({
				type: Value.TYPE_OBJECT,
				properties: {
					hasOwnProperty: makeFunctionValue([ [ 'V', Value.TYPE_STRING ] ], [ Value.TYPE_BOOLEAN ]),
					toString:       makeFunctionValue([ [] ], [ Value.TYPE_STRING ]),
					// TODO ...
				}
			}),
			getPrototypeOf:           makeFunctionValue([ [ 'O', Value.TYPE_OBJECT ] ], [ Value.TYPE_ANY ]),
			getOwnPropertyDescriptor: makeFunctionValue([ [ 'O', Value.TYPE_OBJECT ], [ 'P', Value.TYPE_STRING ] ], [ Value.TYPE_OBJECT ]),
			getOwnPropertyNames:      makeFunctionValue([ [ 'O', Value.TYPE_OBJECT ] ], [ Value.TYPE_ARRAY ]),

			// TODO ...
		}
	});

	env.Function = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.Array = new Value({
		type: Value.TYPE_CONSTRUCTOR,
		properties: {
			prototype: new Value({
				type: Value.TYPE_OBJECT,
				properties: {
					prototype: env.Object,
					toString: makeFunctionValue([], [ Value.TYPE_STRING ]),
					toLocaleString: makeFunctionValue([], [ Value.TYPE_STRING ]),
					concat: makeFunctionValue([ [ 'item', Value.TYPE_ANY, true ] ], [ Value.TYPE_ARRAY ]),
					join: makeFunctionValue([ [ 'separator', Value.TYPE_STRING ] ], [ Value.TYPE_STRING ]),
					pop: makeFunctionValue([], [ Value.TYPE_ANY ]),
					push: makeFunctionValue([ [ 'item', Value.TYPE_ANY, true ] ], [ Value.TYPE_NUMBER ]),
					reverse: makeFunctionValue([], [ Value.TYPE_ARRAY ]),
					shift: makeFunctionValue([], [ Value.TYPE_ANY ]),
					slice: makeFunctionValue([ [ 'start', Value.TYPE_NUMBER ], [ 'end', Value.TYPE_NUMBER ] ], [ Value.TYPE_ARRAY ]),
					sort: makeFunctionValue([ [ 'comparefn', Value.TYPE_FUNCTION ] ], [ Value.TYPE_ARRAY ]),
					splice: makeFunctionValue([
						[ 'start', Value.TYPE_NUMBER ],
						[ 'deleteCount', Value.TYPE_NUMBER ],
						[ 'item', Value.TYPE_ANY, true ]
					], [ Value.TYPE_ARRAY ]),
					unshift: makeFunctionValue([ [ 'item', Value.TYPE_ANY, true ] ], [ Value.TYPE_NUMBER ]),
					indexOf: makeFunctionValue([
						[ 'searchElement', Value.TYPE_ANY ],
						[ 'fromIndex', Value.TYPE_NUMBER, false, true ]
					], [ Value.TYPE_NUMBER ]),
					lastIndexOf: makeFunctionValue([
						[ 'searchElement', Value.TYPE_ANY ],
						[ 'fromIndex', Value.TYPE_NUMBER, false, true ]
					], [ Value.TYPE_NUMBER ]),
					every: makeFunctionValue([
						[ 'callbackfn', Value.TYPE_FUNCTION ],
						[ 'thisArg', Value.TYPE_ANY, false, true ]
					], [ Value.TYPE_BOOLEAN ]),
					some: makeFunctionValue([
						[ 'callbackfn', Value.TYPE_FUNCTION ],
						[ 'thisArg', Value.TYPE_ANY, false, true ]
					], [ Value.TYPE_BOOLEAN ]),
					forEach: makeFunctionValue([
						[ 'callbackfn', Value.TYPE_FUNCTION ],
						[ 'thisArg', Value.TYPE_ANY, false, true ]
					], []),
					map: makeFunctionValue([
						[ 'callbackfn', Value.TYPE_FUNCTION ],
						[ 'thisArg', Value.TYPE_ANY, false, true ]
					], [ Value.TYPE_ARRAY ]),
					filter: makeFunctionValue([
						[ 'callbackfn', Value.TYPE_FUNCTION ],
						[ 'thisArg', Value.TYPE_ANY, false, true ]
					], [ Value.TYPE_ARRAY ]),
					reduce: makeFunctionValue([
						[ 'callbackfn', Value.TYPE_FUNCTION ],
						[ 'initialValue', Value.TYPE_ANY, false, true ]
					], [ Value.TYPE_ANY ]),
					reduceRight: makeFunctionValue([
						[ 'callbackfn', Value.TYPE_FUNCTION ],
						[ 'initialValue', Value.TYPE_ANY, false, true ]
					], [ Value.TYPE_ANY ]),
					length: new Value({
						type: Value.TYPE_NUMBER
					})
				}
			}),
			isArray: makeFunctionValue([ [ 'arg', Value.TYPE_ANY ] ], [ Value.TYPE_BOOLEAN ]),
		}
	});

	env.String = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.Boolean = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.Number = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.Date = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.RegExp = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.Error = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.EvalError = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.RangeError = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.ReferenceError = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.SyntaxError = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.TypeError = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.URIError = new Value({
		type: Value.TYPE_CONSTRUCTOR,

		// TODO ...
	});

	env.Math = new Value({
		type: Value.TYPE_OBJECT,

		// TODO ...
	});

	env.JSON = new Value({
		type: Value.TYPE_OBJECT,

		// TODO ...
	});

	return env;
});