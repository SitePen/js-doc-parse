define([ 'dojo/_base/kernel', './env', './node!util' ], function (dojo, env, util) {
	var oldConsole = this.console;

	function log(fn, prefix, messages) {
		messages = [].slice.call(messages, 0);
		if (prefix) {
			messages.unshift(prefix, (env.file ? env.file.filename : '') + (env.token ? ':' + (env.token.location.startLine + 1) + ':' + (env.token.location.startCol + 1) : ''));
		}

		oldConsole[fn].apply(oldConsole, messages);
	}

	this.console = dojo.mixin({}, this.console, {
		dlog: function (obj) {
			log('log', null, [ util.inspect(obj, null, 5) ]);
		},
		log: function () {
			log('log', null, arguments);
		},
		warn: function () {
			log('warn', 'WARN:', arguments);
		},
		error: function () {
			if (arguments[0] instanceof Error) {
				log('error', 'ERR: ', [ arguments[0].message, "\n", arguments[0].stack ]);
			}
			else {
				log('error', 'ERR: ', arguments);
			}
		},
		info: function () {
			log('info', 'INFO:', arguments);
		}
	});

	process.on('uncaughtException', function (error) {
		console.error(error);
		process.exit(1);
	});
});