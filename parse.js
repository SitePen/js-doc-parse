define(['./lib/naiveParser'], function (parser) {
	parser.parse(process.argv[3]);
});
require(['parse']);