define([ 'dojo/has' ], function (has) {
	// module:
	//		node
	// summary:
	//		This module allows native Node.js modules to be loaded through AMD.

	if (!has('host-node')) {
		throw new Error('node plugin failed to load because environment is not node');
	}

	return {
		load: function (id, require, load) {
			load(require.nodeRequire(id));
		}
	};
});