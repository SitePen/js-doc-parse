define([ './env' ], function (env) {
	var oldConsole = this.console;

	function log(fn, prefix, messages) {
		messages = [].slice.call(messages, 0);
		if (prefix) {
			messages.unshift(prefix, env.file.filename);
		}

		oldConsole[fn].apply(oldConsole, messages);
	}

	this.console = {
		log: function () {
			log('log', null, arguments);
		},
		warn: function () {
			log('warn', 'WARN:', arguments);
		},
		error: function () {
			log('error', 'ERR: ', arguments);
		},
		info: function () {
			log('info', 'INFO:', arguments);
		}
	};
});