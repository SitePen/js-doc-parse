var foo = 'foo';
var fooBar = foo + 'Bar';
var fooFN = foo + function dontDoThis() { return 'fn'.toUpperCase(); }();

/** bar */
var bar = 'bar', /** baz */ baz = 'baz';