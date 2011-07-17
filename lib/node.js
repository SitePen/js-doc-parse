define([ 'require', 'dojo/has' ], function (require, has) {
	// module:
	//		node
	// summary:
	//		This module implements the !node plugin.
	// description:
	//		Loads a native node.js module.

	if (!has('host-node')) {
		console.error('node plugin failed to load because environment is not node');
	}

	return {
		load: function (id, requireParent, onLoad) {
			onLoad(require.nodeRequire(id));
		}
	};
});