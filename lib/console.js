define([ 'dojo/_base/kernel', './env' ], function (dojo, env) {
	var oldConsole = this.console;

	function log(fn, prefix, messages) {
		messages = [].slice.call(messages, 0);
		if (prefix) {
			messages.unshift(prefix, env.file.filename + (env.token ? ':' + env.token.location.startLine + ':' + env.token.location.startCol : ''));
		}

		oldConsole[fn].apply(oldConsole, messages);
	}

	this.console = dojo.mixin({}, this.console, {
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

	process.on('uncaughtException', function (e) {
		console.error(e);
		process.exit(1);
	});
});