define([ '../Module', '../Value', './util' ], function (Module, Value, util) {
	/**
	 * Takes information from metadata stored alongside a Value and adds it to the output.
	 * @param node The node to add metadata to.
	 * @param metadata The metadata to parse.
	 */
	function mixinMetadata(/**XmlNode*/ node, /**Object*/ metadata) {
		if (metadata.type) {
			node.attributes.type = metadata.type;
		}

		for (var metadataName in { summary: 1, description: 1 }) {
			if (metadata.hasOwnProperty(metadataName) && metadata[metadataName]) {
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
	function readProperties(/**string*/ type, /**XmlNode*/ propertiesNode, /**XmlNode*/ methodsNode, /**Object*/ properties) {
		var property,
			propertyNode;

		for (var k in properties) {
			if (k === 'prototype' && _hasOwnProperty.call(properties, k)) {
				// Type check is to ensure that only one-level deep prototype is picked up
				readProperties('prototype', propertiesNode, methodsNode, properties[k].properties);
			}
			else if (_hasOwnProperty.call(properties, k)) {
				property = properties[k];

				if (property.type in Value.METHOD_TYPES) {
					propertyNode = methodsNode.createNode('method', { name: k, type: type });

					var parametersNode = propertyNode.createNode('parameters'),
						parameterNode,
						parameter,
						i;

					for (i = 0; (parameter = property.parameters[i]); ++i) {
						parameterNode = parametersNode.createNode('parameter', {
							name: parameter.name,
							type: parameter.metadata.type || parameter.type,
							usage: parameter.isOptional ? 'optional' : 'required'
						});

						if (parameter.metadata.summary) {
							parameterNode.createNode('summary').childNodes.push(parameter.metadata.summary);
						}
					}

					var returnsNode = propertyNode.createNode('return-types'),
						returnValue;

					for (i = 0; (returnValue = property.returns[i]); ++i) {
						returnsNode.createNode('return-type', {
							type: returnValue.metadata.type || returnValue.type
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

	var _hasOwnProperty = Object.prototype.hasOwnProperty,
		XmlNode = util.XmlNode;

	/**
	 * Generates an details.xml-compatible file which is used by the API browser.
	 */
	return function (config) {
		/**
		 * Parses a code module into an XmlNode.
		 */
		function parseModule(/**Module*/ module) {
			var value = module.value,
				moduleNode = xml.createNode('object', { location: module.id }),
				propertiesNode = moduleNode.createNode('properties'),
				methodsNode = moduleNode.createNode('methods');

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

			readProperties('normal', propertiesNode, methodsNode, value.properties);

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