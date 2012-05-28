/**
 * A module that improves the standard console logging mechanism
 * by adding details about the execution state of the parser.
 */
define([ './env', '../config' ], function (env, config) {
	function blissfulSilence() {}

	function createLogger(fn, prefix) {
		return function () {
			var messages = [].slice.call(arguments, 0);

			if (messages[0] instanceof Error) {
				messages[0] = messages[0].stack;
			}

			if (prefix !== undefined) {
				messages.unshift(
					prefix,
					(env.file ? env.file.filename.slice(env.config.basePath.length) : '') +
					(env.parserState && env.parserState.location ? ':' + env.parserState.location.start.line + ':' + env.parserState.location.start.column : '')
				);
			}

			oldConsole[fn].apply(oldConsole, messages);
		};
	}

	var oldConsole = this.console,
		console = {
		log:                       createLogger('log'),
		warn:  config.show.warn  ? createLogger('warn', 'WARN:') : blissfulSilence,
		error:                     createLogger('error', 'ERR:'),
		info:  config.show.info  ? createLogger('info', 'INFO:') : blissfulSilence,
		debug: config.show.debug ? createLogger('debug', '')     : blissfulSilence,
		trace: oldConsole.trace
	};

	process.on('uncaughtException', function (error) {
		// At least node 0.6.12 will silently exit if the uncaught exception object is passed directly to
		// console.error
		console.error(error.stack || error.message || error);
		process.exit(1);
	});

	return console;
});