define([], function () {
	/**
	 * A complex expression that cannot be easily represented by static analysis.
	 * @param tokens @see ComplexExpression#tokens
	 */
	function ComplexExpression(tokens) {
		if (!(this instanceof ComplexExpression)) {
			return new ComplexExpression(tokens);
		}

		this.tokens = tokens;
		return this; // strict mode
	}
	ComplexExpression.prototype = {
		constructor: ComplexExpression,

		/**
		 * @type Array.<Object> An array of tokens from the tokenizer.
		 */
		tokens: []
	}
	return ComplexExpression;
});