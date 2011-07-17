define([ './node!../uglify-js' ], function (uglify) {
	var arrayToHash = uglify.parser.array_to_hash;
	return {
		UNASSIGNABLE_TYPES: arrayToHash([ 'string', 'num', 'atom' ]),
		OPEN_PUNC: arrayToHash([ '(', '[', '{' ]),
		CLOSE_PUNC: arrayToHash([ ')', ']', '}' ])
	};
});