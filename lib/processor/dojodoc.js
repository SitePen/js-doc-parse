define([], function () {
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
		 * @param comments An array of available comments from the processed file. Each object in the array
		 * contains the following properties:
		 * - type: The type of comment. Can be "Line" or "Block".
		 * - value: The value of the comment as a string.
		 * - range: The range of the comment as a zero-indexed character range.
		 * Note that splicing comments from the array means they will not show up in future calls to attachComment;
		 * this would be a good idea once a comment has been confirmed as belonging to this node and can be processed
		 * that way.
		 * TODO: Might want to send a Value to this instead of a Node.
		 */
		attachComment: function (/**Node*/ node, /**Array.<Object>*/ comments) {

		},

		/**
		 * Performs additional processing on each fully defined value, such as copying data from attached comment
		 * blocks onto the Value.
		 */
		processValue: function (/**Value*/ value) {

		}
	};
});