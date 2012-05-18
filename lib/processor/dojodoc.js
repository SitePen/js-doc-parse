define([ 'dojo/_base/lang', '../Value', '../env', './util' ], function (lang, Value, env, util) {
	function trim(str) {
		return str.replace(/^[\s*]+|\s+$/g, '');
	}

	var standardKeys = {
			type: 'type',
			summary: 'summary',
			description: 'description',
			tags: 'tags',
			returns: 'returns',
			example: 'examples',
			examples: 'examples'
		},
		// Whitespace of course, but also | because it is used by examples inside the indent zone
		indentRe = /^[\s|]+/,
		keyRe = /^\s+([^:]+):\s*(.*)$/,
		tagRe = /\[([^\]]+)\]/g,
		typeRe = /(\w+)\s*$/,
		_hasOwnProperty = Object.prototype.hasOwnProperty;

	/**
	 * Gets inline tags from a key line that uses bracketed tags.
	 * @param keyLine The key line.
	 * @returns {Array} Tags.
	 */
	function processTags(/**string*/ keyLine) {
		var tags = [],
			tag;

		while ((tag = tagRe.exec(keyLine))) {
			tags.push(tag[1]);
		}

		return tags;
	}

	function processStandardKey(metadata, key, line) {
		key = standardKeys[key];

		if (key === 'tags') {
			metadata[key] = metadata[key].concat(trim(line).split(/\s+/));
		}
		else if (metadata[key] instanceof Array) {
			metadata[key][metadata[key].length - 1] += (metadata[key][metadata[key].length - 1].length ? '\n' : '') + line;
		}
		else {
			metadata[key] += (metadata[key].length ? '\n' : '') + line;
		}
	}

	/**
	 * Processes a dojodoc multi-line comment block, which consists of key lines that identify the metadata and
	 * subsequent indented lines containing the actual metadata.
	 * @param comment The comment block.
	 * @param forKey If processing a comment block for a named object (i.e. object property), this is the name of the
	 *               object.
	 * @returns {Object} Metadata.
	 */
	function processComment(/**string*/ comment, /**string?*/ forKey) {
		if (!comment.length) {
			return {};
		}

		comment = comment.split('\n');

		// This is not a dojodoc comment block
		if (!keyRe.test(comment[0])) {
			return {};
		}

		// The standard keys are defined in the style guide at http://dojotoolkit.org/community/styleGuide
		var metadata = {
				type: '',
				summary: '',
				description: '',
				tags: [],
				returns: '',
				examples: []
			},
			keyIndent = indentRe.exec(comment[0].replace(/\t/g, '  '))[0].length,
			line,
			key;

		// This needs to do a few things:
		// 1. When there is a keyName, just read and return the contents of the specified key as summary, type, and
		//    tags.
		// 2. When there is no keyName, read all keys and return them all in a hash map.
		// 3. Parameters are also a thing that gets documented in these blocks...

		while ((line = comment.shift())) {
			// Some doc blocks mix tabs and spaces so that they appear indented correctly but actually use the
			// same number of characters, which breaks the indentation context
			line = line.replace(/\t/g, '  ');

			// New metadata key
			if (indentRe.exec(line)[0].length === keyIndent) {
				var keyLine = keyRe.exec(line);

				key = standardKeys[keyLine[1]] || keyLine[1];

				// Ignore the key and its content if it isn’t what we are looking for
				if (forKey && key !== forKey) {
					key = null;
					continue;
				}

				// Either a typo, a parameter of a function or, rarely, an extra object property
				if (!standardKeys.hasOwnProperty(key)) {
					metadata[key] = {
						type: '',
						summary: '',
						tags: []
					};
				}

				// New example; there can be many examples
				if (key === 'examples') {
					metadata[key].push('');
				}

				// Content for a standard key can start on the same line as the key
				if (standardKeys.hasOwnProperty(key) && keyLine[2]) {
					processStandardKey(metadata, key, keyLine[2]);
				}
				// Tags and type information for non-standard keys can go on the same line as the key
				else {
					metadata[key].tags = processTags(keyLine[2]);
					metadata[key].type = (typeRe.exec(keyLine[2]) || [ '', '' ])[1];
				}
			}

			// Continuation of previous key
			else if (key) {
				if (standardKeys.hasOwnProperty(key)) {
					processStandardKey(metadata, key, line);
				}
				else {
					metadata[key].summary += (metadata[key].summary.length ? '\n' : '') + line.replace(indentRe, '');
				}
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
		 * Applies metadata to the given Value.
		 * @param value Information on the Value being processed. Contains two properties:
		 *     - raw: The raw AST node for the Value object.
		 *     - evaluated: The Value object itself.
		 * @param contextValue Information on the nearest enclosing structure node (object, function, etc.).
		 * Contains two properties:
		 *     - raw: The raw AST node for the context Value.
		 *     - evaluated: The context Value itself. Note that not all enclosing structures may be associated with
		 *     a Value (i.e. VariableDeclarations).
		 */
		generateMetadata: function (/**Object*/ value, /**Object?*/ context) {
			var candidate,
				metadata = {};

			// Function parameter
			if (value.raw.type === 'Identifier' && context && context.raw.type === 'FunctionDeclaration') {
				// First comment before the parameter identifier, if one exists
				candidate = util.getTokensInRange(value.raw.range, true)[0];

				if (candidate && candidate.type === 'BlockComment') {
					metadata = { type: trim(candidate.value) };
				}
			}

			// Function return statement
			else if (value.raw.type === 'ReturnStatement') {
				// Comment at the end of the first line of the return statement, if one exists
				candidate = /^[^\n]*\/\/(.*?)\n/.exec(util.getSourceForRange(value.raw.range));

				if (candidate) {
					metadata = { type: trim(candidate[1]) };
				}
			}

			// Function or object body
			else if (value.raw.type.indexOf('Function') > -1 || value.raw.type === 'ObjectExpression') {
				// First token after the opening {, if one exists
				candidate = util.getTokensInRange(value.raw.type === 'ObjectExpression' ? value.raw.range : value.raw.body.range)[1];

				if (candidate && candidate.type === 'LineBlockComment') {
					metadata = processComment(candidate.value);
				}

				var associatedGroup = value.raw.type === 'ObjectExpression' ?
					value.evaluated.properties :
					value.evaluated.parameters;

				for (var k in metadata) {
					if (!standardKeys.hasOwnProperty(k)) {
						if (_hasOwnProperty.call(associatedGroup, k)) {
							lang.mixin(associatedGroup[k].metadata, metadata[k]);
						}

						delete metadata[k];
					}
				}

				// TODO: Be better at this
				if (metadata.returns && value.evaluated.returns[0]) {
					value.evaluated.returns[0].summary = metadata.returns;
				}

				delete metadata.returns;
			}

			// Object property
			else if (value.raw.type === 'Property' && context && context.raw.type === 'ObjectExpression') {
				// First token before the property identifier, if one exists
				candidate = util.getTokensInRange(value.raw.range, true)[0];

				if (candidate && candidate.type === 'LineBlockComment' &&
					new RegExp('^\\s*' + value.raw.key.name + ':').test(candidate.value)) {

					metadata = processComment(candidate.value, value.raw.key.name);
				}
			}

			lang.mixin(value.evaluated.metadata, metadata);
		}
	};
});