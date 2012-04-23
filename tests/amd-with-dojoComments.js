define([], function () {
	return {
		// summary:
		//		This is an object.

		// fooBar: SuperBoolean
		//		This is a property.
		fooBar: true,

		fn: function (/*FooType*/ foo, /**BarType*/ bar, baz) {
			//	summary:
			//		This is a function.
			//	returns:
			//		Some data, perhaps.

			return [ foo, // AmazingArray
				bar
			];
		}
	};
});