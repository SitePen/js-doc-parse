define([ './Value' ], function (Value) {
	var _moduleMap = {};

	/**
	 * Represents an AMD module.
	 */
	function Module(id) {
		if (!(this instanceof Module)) {
			return _moduleMap[id] || new Module(id);
		}

		this.id = id;
		this.dependencies = [];
		this.extends = [];
		this.value = new Value();

		_moduleMap[id] = this;
		return this; // strict mode
	}
	Module.prototype = {
		constructor: Module,

		/**
		 * Globally resolvable module ID.
		 * @type string?
		 */
		id: undefined,

		/**
		 * Array of modules that this module depends upon.
		 * @type Array.<string|Module>
		 */
		dependencies: [],

		/**
		 * Other modules that are extended when this module is loaded.
		 * @type Array.<string|Module>
		 */
		extends: [],

		/**
		 * The value of the module.
		 * @type Value
		 */
		value: undefined
	};

	return Module;
});