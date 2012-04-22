define([ '../env', '../node!util' ], function (env, util) {
	/**
	 * Retrieves all tokens in a given range.
	 * TODO: Make this generic
	 * @param range An index range to search for tokens.
	 * @param includeFirstPrevious Whether or not to also include the token *before* the first token in the range.
	 */
	function getTokensInRange(/**Array.<number>*/ range, /**boolean*/ includeFirstPrevious) {
		var firstTokenIndex = -1,
			tokens = env.parserState.tokens.filter(function (token, index) {
				if (token.range[0] >= range[0] && token.range[1] <= range[1]) {
					firstTokenIndex = firstTokenIndex > -1 ? firstTokenIndex : index;
					return true;
				}

				return false;
			});

		if (includeFirstPrevious && firstTokenIndex > 0) {
			tokens.unshift(env.parserState.tokens[firstTokenIndex - 1]);
		}

		return tokens;
	}

	function getSourceForRange(/**Array.<number>*/ range) {
		return env.file.source.slice(range[0], range[1]);
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
		 * Attaches comments to the correct nearby nodes.
		 * @param node An AST node.
		 * @param node The nearest enclosing structure node (object, function, etc.).
		 */
		attachComment: function (/**Node*/ node, /**Node*/ contextNode) {
			var candidate;

			if (node.type === 'Identifier' && contextNode && contextNode.type === 'FunctionDeclaration') {
				candidate = getTokensInRange(node.range, true)[0];
				if (candidate.type === 'BlockComment') {
					return [ candidate.value ];
				}
			}

			if (node.type === 'ReturnStatement') {
				candidate = /\/\/(.*)$/m.exec(getSourceForRange(node.range));
				return candidate ? [ candidate[1] ] : [];
			}

			return [];
		},

		/**
		 * Performs additional processing on each fully defined value, such as copying data from attached comment
		 * blocks onto the Value.
		 */
		processValue: function (/**Value*/ value) {

		}
	};
});