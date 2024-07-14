
/**
 * Retrieves the value of the "wikibase_item" property from the given data object.
 * If the property does not exist, an empty string is returned.
 * @param {object} data - The input data object containing the properties to be checked.
 * @param {string} type - The type of property to check for.
 * @returns {string} - The value of the "wikibase_item" property, or an empty string if it doesn't exist.
 */
function getProperties(parse, type) {
    // Check if properties exist and if the length is greater than 0
    if (!parse.properties || parse.properties.length < 1) return "";
  
    // Iterate over the properties
    for (const property of parse.properties) {
      // Check if the property name is "wikibase_item"
      if (property.name == type) {
        // Return the value of the property if found
        return property["*"];
      }
    }
  
    // Return an empty string if the wikibase item is not found
    return false;
  }

  export default getProperties;