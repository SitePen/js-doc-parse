define([ '../Value', '../env', './util' ], function (Value, env, util) {
	function trim(str) {
		return str.replace(/^[\s*]+|\s+$/g, '');
	}

	function processComment(comment, summaryId) {
		var metadata = {};

		if (summaryId) {
			var type = new RegExp(summaryId + ':\\s+(.*?)\n', 'm').exec(comment);

			if (type) {
				metadata.type = trim(type[1]);
			}
		}

		return metadata;
	}

	return {
		/**
		 * Processes raw source code prior to being parsed.
		 * @param source The raw source code of a file, as a string.
		 * @returns {string} Processed source code.
		 */
		processSource: function (/**string*/ source) {
			return source.replace(/\/\*={5,}|={5,}\*\//g, '');
		},

		/**
		 * Returns metadata for a given Value.
		 * @param value Information on the Value being processed. Contains two properties:
		 *     - raw: The raw AST node for the Value object.
		 *     - evaluated: The Value object itself.
		 * @param contextValue Information on the nearest enclosing structure node (object, function, etc.).
		 * Contains two properties:
		 *     - raw: The raw AST node for the context Value.
		 *     - evaluated: The context Value itself. Note that not all enclosing structures may be associated with
		 *     a Value (i.e. VariableDeclarations).
		 * @returns {Object} An object containing keys that will be mixed into the metadata of the main Value object.
		 */
		generateMetadata: function (/**Object*/ value, /**Object?*/ context) {
			var candidate;

			// Function parameter
			if (value.raw.type === 'Identifier' && context && context.raw.type === 'FunctionDeclaration') {
				// First comment before the parameter identifier, if one exists
				candidate = util.getTokensInRange(value.raw.range, true)[0];

				return candidate && candidate.type === 'BlockComment' ? { type: trim(candidate.value) } : {};
			}

			// Function return statement
			if (value.raw.type === 'ReturnStatement') {
				// Comment at the end of the first line of the return statement, if one exists
				candidate = /^[^\n]*\/\/(.*?)\n/.exec(util.getSourceForRange(value.raw.range));

				return candidate ? { type: trim(candidate[1]) } : {};
			}

			// Function or object body
			if (value.raw.type.indexOf('Function') > -1 || value.raw.type === 'ObjectExpression') {
				// First token after the opening {, if one exists
				candidate = util.getTokensInRange(value.raw.type === 'ObjectExpression' ? value.raw.range : value.raw.body.range)[1];

				return candidate && candidate.type === 'LineBlockComment' ? processComment(candidate.value) : {};
			}

			// Object property
			if (value.raw.type === 'Property' && context && context.raw.type === 'ObjectExpression') {
				// First token before the property identifier, if one exists
				candidate = util.getTokensInRange(value.raw.range, true)[0];

				if (candidate && candidate.type === 'LineBlockComment' &&
					new RegExp('^\\s*' + value.raw.key.name + ':').test(candidate.value)) {

					return processComment(candidate.value, value.raw.key.name);
				}
				else {
					return {};
				}
			}

			return {}; // strict mode
		}
	};
});