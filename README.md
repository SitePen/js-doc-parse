js-doc-parse
============

A library for parsing JavaScript files and extracting inline documentation. Designed primarily for use with the Dojo
Toolkit, but extensible enough to work with any application or documentation format.

New BSD License © 2011–2012 Colin Snover <http://zetafleet.com>.

Why is this library special?
----------------------------

1. Works anywhere, not only on Rhino. (n.b. by “anywhere” I mean “node.js”, but there’s only a handful of code that
   needs to be abstracted for it to work on Rhino and in the browser, too, and I plan on doing just that.)
2. It isn’t lazy! js-doc-parse completely parses the actual JavaScript source code to extract API details instead of
   just running some crappy regular expressions over the source text to pluck out comment blocks.
3. [Highly extensible](https://github.com/csnover/js-doc-parse/blob/master/config.js), with initially planned support
   for two code commenting styles (dojodoc and jsdoc).

Wait, _highly_ extensible? Tell me more!
----------------------------------------

Oh, alright! This documentation parser is designed to allow you, a JavaScript developer, to very easily extend four key
areas of operation:

1. Environments

   Your code might run in a variety of environments and exploit natively available functionality of each environment.
   If the documentation parser doesn’t know about all those delicious native objects, it can’t help you document
   anything you borrow from them. Pluggable environments let you define all the built-ins of the environment your code
   runs in so it doesn’t fall over when you try to `var slice = [].slice;`.

2. Call handlers

   Chances are good that whatever library you’re using has at least one function that retrieves, decorates, or iterates
   over objects that you need to document. Adding custom call handlers makes it possible for the documentation parser
   to understand and evaluate these special calls so that the correct properties exist on the correct objects and that
   any special magic that these functions might represent can be annotated.

3. Documentation processors

   Some people don’t like the standard jsdoc syntax, and that’s cool. If you’ve extended jsdoc with some new tags, or
   use some completely different format like dojodocs, Natural Docs, or docco – or, after an evening of heavy drinking,
   created your own custom documentation format from scratch – writing a new documentation processor will enable you
   to process any format your heart desires. It will not, however, cure your cirrhosis.

4. Exporters

   Once the code has been parsed and the documentation parsed, you’ll need to output the result to a format that you
   (or some tool other than you) can actually use! Exporters are completely isolated from the documentation processing
   workflow, so you can pick and choose one (or lots of) exporters for your final output.

Dependencies
------------

[dojo](https://github.com/dojo/dojo) – AMD loader & helper library  
[esprima](https://github.com/ariya/esprima) – ECMAScript parser

Instructions
------------

1. `git clone --recursive https://github.com/csnover/js-doc-parse.git`
2. Run `./parse.sh <file-or-directory>` to maybe get some data structure output. There is nothing else yet.
