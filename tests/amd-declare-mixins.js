define([ 'dojo/_base/declare', 'dojo/Stateful' ], function (declare, Stateful) {
	return declare(Stateful, {
		someProperty: true,

		postCreate: function () {}
	});
});