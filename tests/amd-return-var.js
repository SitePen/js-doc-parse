define([ 'dojo/_base/declare' ], function (declare) {
	//	module:
	//		amd-return-var
	//	summary:
	//		Some crap here. This is not the right way to do things.

	/**
	 * A function that returns something awesome.
	 */
	var a = function(/**any*/ awesome) {
		return awesome;
	}, b;

	a.blah = well.done.apply(this);
	a.foo = 'yep';

	if (a) {
		return a;
	}

	return b;
});