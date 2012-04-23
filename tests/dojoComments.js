function fn(/*foo*/ foo, /**bar*/ bar, baz) {
	//	summary:
	//		This is a function.
	//	returns:
	//		Some data, perhaps.

	foo = {
		// summary:
		//		This is an object.

		// fooBar: SuperBoolean
		//		This is a property.
		fooBar: true
	};

	return [ foo, // Array
		bar
	];
}