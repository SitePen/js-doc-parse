js-doc-parse
============

A library for parsing JavaScript files and extracting inline documentation. Designed primarily for use with the Dojo
Toolkit, but extensible enough to work with any application or documentation format.

New BSD License © 2011-2012 Colin Snover <http://zetafleet.com>

Why is this library special?
----------------------------

1. Works anywhere, not only on Rhino.
2. Parses the actual JavaScript source code to extract API details, instead of just running some regular expressions
   over the source text to pluck out comment blocks. (= fewer boilerplate comments)
3. Designed to be highly extensible, with planned support for two code commenting styles (dojodoc and jsdoc).

Dependencies
------------

[dojo](https://github.com/dojo/dojo) – AMD loader & helper library  
[esprima](https://github.com/ariya/esprima) – ECMAScript parser

Instructions
------------

1. `git clone --recursive https://github.com/csnover/js-doc-parse.git`
2. Run `./parse.sh <file-or-directory>` to maybe get some data structure output. There is nothing else yet.
