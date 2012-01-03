define([ './env', './node!fs' ], function (env, fs) {
	// from dojo loader
	function resolveRelativeId(path) {
		var result = [], segment, lastSegment;
		path = path.split('/');
		while (path.length) {
			segment = path.shift();
			if (segment === '..' && result.length && lastSegment !== '..') {
				result.pop();
			}
			else if (segment !== '.') {
				result.push((lastSegment = segment));
			} // else ignore '.'
		}

		return result.join('/');
	}

	function getModuleIdFromPath(path) {
		var result = resolveRelativeId(path),
			match = false;

		for (var module in env.config.prefixMap) {
			if (env.config.prefixMap.hasOwnProperty(module)) {
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
		}

		result = result.replace(/^\/|\.js$/g, '');

		// TODO: Update to use more traditional AMD module map pattern
		return !match ? result : (result === 'main' ? module : module + '/' + result);
	}

	function File(/**string*/ filename) {
		if (!(this instanceof File)) {
			throw new Error('File is a constructor');
		}

		this.filename = filename;
		this.moduleId = getModuleIdFromPath(filename);

		// During debugging, seeing a big source string in output is gross, so make it non-enumerable to avoid the
		// inspector picking it up
		Object.defineProperty(this, 'source', {
			value: fs.readFileSync(this.filename, 'utf8').replace(/\/\*={5,}|={5,}\*\//g, ''),
			enumerable: false
		});

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

		/**
		 * The source code of the file.
		 * @type string
		 */
		source: '',

		/**
		 * Resolves an ID relative to this file.
		 * @param id A relative or absolute module ID. If absolute, returned as-is.
		 * @returns {string} Absolute module ID.
		 */
		resolveRelativeId: function (/**string*/ id) {
			if (id.indexOf('.') !== 0) {
				return id;
			}

			return resolveRelativeId(this.moduleId.replace(/\/[^\/]+$/, '/') + id);
		},

		toString: function () {
			return '[object File(filename: ' + this.filename + ', moduleId: ' + this.moduleId + ')]';
		}
	};

	return File;
});