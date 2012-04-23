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

	var _hasOwnProperty = Object.prototype.hasOwnProperty;

	/**
	 * Generates an details.xml-compatible file which is used by the API browser.
	 */
	return function (config) {
		/**
		 * Parses a code module into an XmlNode.
		 */
		function parseModule(/**Module*/ module) {
			/**
			 * Takes information from metadata stored alongside a Value and adds it to the output.
			 * @param node The node to add metadata to.
			 * @param metadata The metadata to parse.
			 */
			function mixinMetadata(/**XmlNode*/ node, /**Object*/ metadata) {
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

			/**
			 * Reads a list of Value properties and creates an appropriate XML structure for the data.
			 * @param type The type annotation for the output property, either "prototype" or "normal".
			 * @param propertiesNode The XML node to add new property nodes to.
			 * @param properties The properties object.
			 */
			function readProperties(/**string*/ type, /**XmlNode*/ propertiesNode, /**Object*/ properties) {
				var property,
					propertyNode;

				for (var k in properties) {
					if (k === 'prototype' && _hasOwnProperty.call(properties, k)) {
						// Type check is to ensure that only one-level deep prototype is picked up
						readProperties('prototype', propertiesNode, properties[k].properties);
					}
					else if (_hasOwnProperty.call(properties, k)) {
						property = properties[k];

						if (property.type in Value.METHOD_TYPES) {
							propertyNode = methods.createNode('method', { name: k, type: type });

							var parametersNode = propertyNode.createNode('parameters'),
								parameterNode,
								parameter,
								i;

							for (i = 0; (parameter = property.parameters[i]); ++i) {
								parameterNode = parametersNode.createNode('parameter', {
									name: parameter.name,
									type: parameter.type,
									usage: parameter.isOptional ? 'optional' : 'required'
								});
							}

							var returnsNode = propertyNode.createNode('return-types'),
								returnValue;

							for (i = 0; (returnValue = property.returns[i]); ++i) {
								returnsNode.createNode('return-type', {
									type: returnValue.type
								});
							}
						}
						else {
							propertyNode = propertiesNode.createNode('property', { name: k, type: property.type });
						}

						mixinMetadata(propertyNode, property.metadata);
					}
				}
			}

			var value = module.value,
				moduleNode = xml.createNode('object', { location: module.id }),
				propertiesNode = moduleNode.createNode('properties'),
				methods = moduleNode.createNode('methods');

			if (value.type) {
				moduleNode.attributes.type = value.type;
			}

			if (value.mixins.length) {
				moduleNode.attributes.classlike = 'true';
				moduleNode.attributes.superclass = value.mixins[0].id;

				var mixinsNode = moduleNode.createNode('mixins'),
					mixin;
				for (var i = 0; (mixin = value.mixins[i]); ++i) {
					mixinsNode.createNode('mixin', { location: mixin.id });
				}
			}

			mixinMetadata(moduleNode, value.metadata);

			readProperties('normal', propertiesNode, value.properties);

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