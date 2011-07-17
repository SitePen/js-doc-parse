define([ './env' ], function (env) {
	// from dojo loader
	function resolveRelativeId(path) {
		var result = [], segment, lastSegment;
		path = path.split('/');
		while (path.length) {
			segment = path.shift();
			if (segment === '..' && result.length && lastSegment != '..') {
				result.pop();
			}
			else if(segment != '.') {
				result.push((lastSegment = segment));
			} // else ignore '.'
		}

		return result.join('/');
	}

	function getModuleIdFromPath(path) {
		var result = resolveRelativeId(path),
			match = false;

		for (var module in env.config.prefixMap) {
			var pathPrefix = env.config.baseUrl + env.config.prefixMap[module];

			// avoid accidental matching of partial paths
			if (pathPrefix.charAt(-1) !== '/') {
				pathPrefix += '/';
			}

			if (result.indexOf(pathPrefix) === 0) {
				result = result.substr(pathPrefix.length);
				match = true;
				break;
			}
		}

		result = result.replace(/^\/|\.js$/g, '');

		// TODO: Update to use more traditional AMD module map pattern
		return !match ? result : (result === 'main' ? module : module + '/' + result);
	}

	function File(filename) {
		if (!(this instanceof File)) {
			return new File(filename);
		}

		this.filename = filename;
		this.moduleId = getModuleIdFromPath(filename);
		return this;
	}

	File.prototype = {
		constructor: File,

		/**
		 * The absolute filename of the current file.
		 * @type string
		 */
		filename: undefined,

		/**
		 * The module ID based on the provided filename.
		 * @type string
		 */
		moduleId: undefined,

		toString: function () {
			return '[object File(filename: ' + this.filename + ', moduleId: ' + this.moduleId + ')]';
		}
	};

	return File;
});