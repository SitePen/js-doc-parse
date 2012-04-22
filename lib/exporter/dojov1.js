define([ '../Module', '../Value' ], function (Module, Value) {

	/**
	 * XML node representation.
	 */
	function XmlNode(/**string*/ nodeName, /**Object?*/ attributes) {
		this.nodeName = nodeName;
		this.childNodes = [];
		this.attributes = attributes || {};
	}
	XmlNode.prototype = {
		constructor: XmlNode,
		nodeName: '',
		childNodes: [],
		attributes: {},
		createNode: function (nodeName, attributes) {
			var node = new XmlNode(nodeName, attributes);
			this.childNodes.push(node);
			return node;
		},
		toString: function () {
			function escape(str) {
				return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
			}

			function attributes(attrs) {
				var nodes = [];

				for (var key in attrs) {
					if (attrs.hasOwnProperty(key) && attrs[key] != null) {
						nodes.push(key + '="' + escape(attrs[key]) + '"');
					}
				}

				return nodes.length ? ' ' + nodes.join(' ') : '';
			}

			function childNodes(nodeList) {
				var nodes = [];
				for (var i = 0, j = nodeList.length; i < j; ++i) {
					nodes.push(typeof nodeList[i] === 'string' ? escape(nodeList[i]) : nodeList[i].toString());
				}

				return nodes.join('');
			}

			var children = childNodes(this.childNodes);

			return '<' + this.nodeName + attributes(this.attributes) + (children.length ? '>' + children + '</' + this.nodeName + '>' : '/>');
		}
	};

	var METHOD_TYPES = {};
	METHOD_TYPES[Value.TYPE_CONSTRUCTOR] = 1;
	METHOD_TYPES[Value.TYPE_FUNCTION] = 1;

	/**
	 * Generates an details.xml-compatible file which is used by the API browser.
	 */
	return function (config) {
		/**
		 * Parses a code module into an XmlNode.
		 */
		function parseModule(/**Module*/ module) {
			function mixinMetadata(node, metadata) {
				for (var metadataName in { summary: 1, description: 1 }) {
					if (metadata.hasOwnProperty(metadataName)) {
						node.createNode(metadataName).childNodes.push(metadata[metadataName]);
					}
				}

				if (metadata.examples && metadata.examples.length) {
					var examplesNode = node.createNode('examples');

					for (var i = 0, j = metadata.examples.length; i < j; ++i) {
						examplesNode.createNode('example').childNodes.push(metadata.examples[i]);
					}
				}
			}

			var value = module.value,
				moduleNode = xml.createNode('object', { location: module.id }),
				properties = moduleNode.createNode('properties'),
				methods = moduleNode.createNode('methods');

			if (value.type) {
				moduleNode.attributes.type = value.type;
			}

			mixinMetadata(moduleNode, value.metadata);

			var property,
				propertyNode;

			for (var k in value.properties) {
				if (value.properties.hasOwnProperty(k)) {
					property = value.properties[k];

					if (property.type in METHOD_TYPES) {
						propertyNode = methods.createNode('method', { name: k });

						var parametersNode = propertyNode.createNode('parameters'),
							parameterNode,
							parameter,
							returnsNode = propertyNode.createNode('return-types'),
							returnValue,
							i;

						for (i = 0; (parameter = property.parameters[i]); ++i) {
							parameterNode = parametersNode.createNode('parameter', {
								name: parameter.name,
								type: parameter.type,
								usage: parameter.isOptional ? "optional" : "required"
							});
						}

						for (i = 0; (returnValue = property.returns[i]); ++i) {
							returnsNode.createNode('return-type', {
								type: returnValue.type
							});
						}
					}
					else {
						propertyNode = properties.createNode('property', { name: k, type: property.type });
					}

					mixinMetadata(propertyNode, property.metadata);
				}
			}

			return moduleNode;
		}

		var xml = new XmlNode('javascript'),
			parsedModules = Module.getAll();

		for (var k in parsedModules) {
			if (parsedModules.hasOwnProperty(k)) {
				parseModule(parsedModules[k]);
			}
		}

		console.log(xml.toString());
	};
});