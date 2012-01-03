define([], function(){
	function ParseError(/*Error*/ originalError) {
		this.originalError = originalError;
	}
	ParseError.prototype = new Error();
	ParseError.prototype.constructor = ParseError;

	return ParseError;
});