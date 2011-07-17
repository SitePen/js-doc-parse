define([], function () {
	return {
		'define': function (args) {
			var moduleId = args[args.length - 3] || scope.file.moduleId,
				deps = args[args.length - 2],
				callback = args[args.length - 1],
				scanRequires = args.length === 1;

			var Value = Value(moduleId);

			if (Value.type) {
				console.warn('Redefining existing Value ' + moduleId);
			}

			for (var i = 0, j = deps.length; i < j; ++i) {
				var dep = Value(deps[i]);
				Value.dependencies.push(dep);
				callback.arguments[i] = dep;
			}

			Value.type = callback.returns[callback.returns.length - 1].type;
			return Value;
		},

		'require': function (args) {
			if (args.length === 1 && args[0].is('string')) {
				return Value(args[0]);
			}

			var deps = args[args.length - 2],
				callback = args[args.length - 1];

			return 'incomplete';
		},

		'dojo/_base/kernel#mixin': function (args) {

		},

		'dojo/_base/declare': function (args) {
			var name = args[args.length - 3],
				mixins = args[args.length - 2],
				proto = args[args.length - 1],
				Value = Value(name || env.file.moduleId);
		}
	};
});