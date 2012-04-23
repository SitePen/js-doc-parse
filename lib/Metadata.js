define([ 'dojo/_base/lang' ], function (lang) {
	function Metadata(/**Object*/ kwArgs) {
		if (!(this instanceof Metadata)) {
			throw new Error('Metadata is a constructor');
		}

		this.examples = [];
		this.tags = [];

		lang.mixin(this, kwArgs);
	}

	Metadata.prototype = {
		constructor: Metadata,

		/**
		 * A more detailed value type description.
		 * @type string
		 */
		type: undefined,

		/**
		 * A brief summary of the associated value.
		 * @type string
		 */
		summary: undefined,

		/**
		 * A detailed description of the associated value.
		 * @type string
		 */
		description: undefined,

		/**
		 * Code examples.
		 * @type Array.<string>
		 */
		examples: [],

		/**
		 * Tags.
		 * @type Array.<string>
		 */
		tags: []
	};

	return Metadata;
});