js-doc-parse
============

A library for parsing JavaScript files and extracting inline documentation. Designed primarily for use with Dojo
Toolkit, but eventually extensible enough to work with hopefully any library or documentation format.

New BSD License © 2011-2012 Colin Snover <http://zetafleet.com>

Dependencies
------------

[dojo](https://github.com/dojo/dojo) - AMD loader & helper library
[bdParse](https://github.com/altoviso/bdParse) - Tokenizer & AST parser

Instructions
------------

1. `git clone --recursive https://github.com/csnover/js-doc-parse.git`
2. Run `./parse.sh <file-or-directory>` to get some data structure output. There is nothing else yet.
