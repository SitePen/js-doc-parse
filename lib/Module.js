define([ 'dojo/_base/lang', './Value', './env', './File', './console' ], function (lang, Value, env, File, console) {
	var _moduleMap = {},
		_modulesInFlight = {};

	/**
	 * Represents an AMD module.
	 * @param id The canonical ID of the module.
	 * @param value The return value of the module.
	 */
	function Module(/**string*/ id, /**Value?*/ value) {
		if (!(this instanceof Module)) {
			throw new Error('Module is a constructor');
		}

		if (_moduleMap[id]) {
			throw new Error('Module with id "' + id + '" already exists');
		}

		this.id = id;
		this.file = env.file;
		this.dependencies = [];
		this.reverseDependencies = [];
		this.value = value || new Value({ type: Value.TYPE_UNDEFINED });

		_moduleMap[id] = this;
	}

	/**
	 * Gets a module.
	 * @param id The ID of the module.
	 * @returns Module
	 */
	Module.get = function (/**string*/ id) {
		var module;

		console.debug('  Getting module', id);

		if ([ 'require', 'exports', 'module' ].indexOf(id) > -1) {
			throw new Error('Do not request special modules from Module.');
		}

		id = env.file.resolveRelativeId(id);

		if (!_moduleMap[id]) {
			console.debug('  Module not in cache, retrieving by file');

			var filename = id.split('/'),
				packages = env.config.packages;

			if (packages.hasOwnProperty(filename[0])) {
				filename[0] = typeof packages[filename[0]] === 'string' ?
					packages[filename[0]] :
					packages[filename[0]].location;
			}

			filename = filename.join('/') + '.js';

			return Module.getByFile(new File(filename));
		}

		return _moduleMap[id];
	};

	/**
	 * Gets a module based on a file reference.
	 * @param file The file to load module(s) from.
	 * @returns Module
	 */
	Module.getByFile = function (/**File*/ file) {
		if (!_moduleMap[file.moduleId]) {
			if (_modulesInFlight[file.moduleId]) {
				throw new Error('Circular dependency requesting ' + file.moduleId);
			}

			_modulesInFlight[file.moduleId] = 1;

			env.pushState(file);
			env.parse();
			env.popState();

			delete _modulesInFlight[file.moduleId];
		}

		if (!_moduleMap[file.moduleId]) {
			console.warn('File ' + file.filename + ' did not register any modules we care about.');
		}

		return _moduleMap[file.moduleId];
	};

	/**
	 * Gets all registered modules in the current environment.
	 * @returns Object.<id, Module>
	 */
	Module.getAll = function () {
		return _moduleMap;
	};

	/**
	 * Finds a module based on its value.
	 * @returns Module?
	 */
	Module.findByValue = function (/**Value*/ value) {
		for (var i in _moduleMap) {
			if (_moduleMap[i].value === value) {
				return _moduleMap[i];
			}
		}

		return undefined;
	};

	Module.prototype = {
		constructor: Module,

		/**
		 * Canonical module ID.
		 * @type string
		 */
		id: undefined,

		/**
		 * The file in which the module was defined.
		 * @type File
		 */
		file: undefined,

		/**
		 * Whether or not the module is an AMD plugin.
		 * @type boolean
		 */
		isPlugin: false,

		/**
		 * Array of modules that this module depends upon.
		 * @type Array.<Module>
		 */
		dependencies: [],

		/**
		 * Array of modules that depend on this module.
		 * @type Array.<Module>
		 */
		reverseDependencies: [],

		/**
		 * The resolved value of the module.
		 * @type Value
		 */
		value: undefined
	};

	return Module;
});