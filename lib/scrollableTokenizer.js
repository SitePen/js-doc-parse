define([ 'dojo/_base/lang', './const', './node!../uglify-js' ], function (lang, consts, uglify) {
	var tokenizer = uglify.parser.tokenizer;

	function tokenIs(type, value) {
		return this.type === type &&
			(value == null || (typeof value === 'object' ? value[this.value] : this.value === value));
	}

	return function (source) {
		var getToken = tokenizer(source), tokens = [], currentIndex = 0, maxIndex = -1, token;

		function normalizeIndex(index) {
			return Math.min(maxIndex, Math.max(0, index));
		}

		do {
			token = getToken();
			token.is = tokenIs;
			token.index = ++maxIndex;
			tokens.push(token);
		} while (token.type !== 'eof');

		getToken = source = token = undefined;

		return {
			rewind: function () {
				currentIndex = 0;
				return this;
			},

			seekTo: function (/**number*/ index) {
				currentIndex = normalizeIndex(index);
				return this;
			},

			next: function (/**number*/ skip) {
				currentIndex = normalizeIndex(currentIndex + (skip || 1));
				return this;
			},

			peek: function (/**number*/ look) {
				return tokens[normalizeIndex(currentIndex + (look || 1))];
			},

			expect: function (/**string*/ type, /**any?*/ value) {
				if (!this.is(type, value)) {
					var expectedValue = value;

					if (!lang.isString(value)) {
						expectedValue = [];

						for (var i in value) {
							expectedValue.push(i);
						}

						expectedValue = expectedValue.join(' or ');
					}

					throw Error('Expected ' + type + ', ' + expectedValue + '; got ' + this.type + ', ' + this.value);
				}

				return this;
			},

			is: function (/**string*/ type, /**any?*/ value) {
				return tokens[currentIndex].is(type, value);
			},

			nextUntil: function (/**string*/ type, /**any?*/ value) {
				var level = 0;

				while (true) {
					this.next();

					if (this.is(type, value) && !level) {
						break;
					}
					else if (this.is('punc', consts.OPEN_PUNC)) {
						++level;
					}
					else if (this.is('punc', consts.CLOSE_PUNC)) {
						--level;
					}
					else if (this.is('eof')) {
						throw Error('Scrolled past end of file');
					}
				}

				return this;
			},

			get line() {
				return tokens[currentIndex].line + 1;
			},

			get column() {
				return tokens[currentIndex].col + 1;
			},

			get value() {
				return tokens[currentIndex].value;
			},

			get type() {
				return tokens[currentIndex].type;
			},

			get comments() {
				return tokens[currentIndex].comments_before;
			},

			set comments(comments) {
				tokens[currentIndex].comments_before = comments;
			},

			get index() {
				return currentIndex;
			},

			get originalToken() {
				return tokens[currentIndex];
			}
		};
	}
});