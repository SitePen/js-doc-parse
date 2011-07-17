define([ './env' ], function (env) {
	/**
	 * A reference to another variable. Resolved in pass XXX: TODOC
	 */
	function Reference(toVar) {
		if (!(this instanceof Reference)) {
			return new Reference(toVar);
		}

		this.toVar = toVar;
		return this; // strict mode
	}

	return Reference;
});