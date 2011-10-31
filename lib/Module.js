define([ 'dojo/_base/lang', './Value', './env' ], function (lang, Value, env) {
	var _moduleMap = {};

	/**
	 * Represents an AMD module.
	 * @param id The canonical ID of the module.
	 * @param value The return value of the module.
	 */
	function Module(/**string*/ id, /**Value?*/ value) {
		if (!(this instanceof Module)) {
			throw Error('Module is a constructor');
		}

		if (_moduleMap[id]) {
			throw Error('Module with id "' + id + '" already exists');
		}

		this.id = id;
		this.file = env.file;
		this.dependencies = [];
		this.reverseDependencies = [];
		this.value = value || new Value();

		_moduleMap[id] = this;
		return this; // strict mode
	}

	/**
	 * Gets a previously registered module.
	 * @param id The ID of the module.
	 * @param forceRegistration If true, a new (incomplete) Module will be defined and returned if one does not already
	 *                          exist.
	 * @returns Module?
	 */
	Module.get = function (/**string*/ id, /**boolean?*/ forceRegistration) {
		var module;

		if (!(module = _moduleMap[id]) && forceRegistration) {
			module = new Module(id);
			module.file = undefined;
		}

		return module;
	};

	/**
	 * Gets all registered modules in the current environment.
	 * @returns Object.<id, Module>
	 */
	Module.getAll = function () {
		return lang.mixin({}, _moduleMap);
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