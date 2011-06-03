/**
 * Function 'funcA' comment.
 */
function funcA(/** TypeOfA */ a) {
	/** @type TypeOfB */
	var b = 'ValueOfB',
		/** @type TypeOfC */
		c = 'ValueOfC';

	return b;
}

/**
 * Function 'funcB' comment.
 */
function funcB(/** TypeOfA */ a, /** TypeOfB */ b) {
	/** @type TypeOfC */
	var c = 'ValueOfC',
		/** @type TypeOfD */
		d,
		/** @type TypeOfE */
		e = 'ValueOfE';

	/** @type NewTypeOfA */
	a = 'NewValueOfA';

	function funcInB(/** TypeOfC */ c) {
		return c;
	}

	return 'Return value of funcB';
}

/**
 * Function 'funcC' comment.
 */
var funcC = function (/** TypeOfA */ a) {
	/**
	 * Hey look, an identity function.
	 */
	return a;
};