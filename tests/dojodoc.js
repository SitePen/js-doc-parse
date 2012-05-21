define([ 'dojo/_base/declare', 'dojo/Stateful' ], function (declare, Stateful) {
	var Internal = declare(Stateful, {
		//	summary:
		//		A sample constructor that is not publicly exposed.
		//	description:
		//		This also features a _description_, which is made out of *Markdown*.
		//	foo: foo-type?
		//		A property that only exists in your mind.
	});

	var External = declare(Internal, {
		//	summary:
		//		A sample declare module.

		//	obj: Object?
		//		An optional object with an explicit type.
		obj: null,

		//	arr: Array
		arr: [],

		//	bool:
		//		A boolean with no explicit type.
		bool: false,

		fn: function (/**a-type*/ a, /**b-type?*/ b, c) {
			//	summary:
			//		A function
			//	a:
			//		String type in parameters.
			//	b:
			//		Optional string type in parameters.
			//	c: c-type
			//		Boolean type in comment.

			return a + // return-type
				b;
		}
	});

	External.fn2 = function () {
		//	summary:
		//		A static function.
	};

	return External;
});