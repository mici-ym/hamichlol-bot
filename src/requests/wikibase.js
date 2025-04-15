import Client from "./Client.js";

/**
 * WikiBase client class for interacting with Wikibase API
 * @extends Client
 */
class WikiBase extends Client {
  /**
   * Creates a new WikiBase client instance
   * @param {string} wikiUrl - The URL of the wiki to connect to
   */
  constructor(wikiUrl) {
    super(wikiUrl, 5, 3, false);
  }

  /**
   * Retrieves claims for a specified entity
   * @param {string} entity - The entity ID to get claims for
   * @param {Object} options - Additional options for the request
   * @param {string} [options.property] - Filter claims by property ID
   * @param {string} [options.rnak] - Filter claims by rank
   * @returns {Promise<Object>} The API response containing the requested claims
   */
  async getClaims(entity, options) {
    const params = {
      action: "wbgetclaims",
      format: "json",
      entity,
    };
    if (options.property) {
      params.property = options.property;
    }
    if (options.rnak) {
      params.rnak = options.rnak;
    }
    return await super.wikiGet(params);
  }

  /**
   * Retrieves entities by title
   * @param {string} title - The title of the entity to retrieve
   * @param {string} [sites="hewiki"] - The site to look for the title
   * @param {string} [languages="he"] - The language to get entity data in
   * @param {Object} [options] - Additional options for the request
   * @returns {Promise<Object>} The API response containing the requested entities
   */
  async getEntities(title, sites = "hewiki", languages = "he", options) {
    const params = {
      action: "wbgetentities",
      format: "json",
      titles: title,
      sites,
      languages,
    };

    return await super.wikiGet(params);
  }

  /**
   * Formats a value according to the specified type
   * @param {JSON<Object>} value - The value to format
   * @param {string} type - The type of the value
   * @returns {Promise<Object>} The API response containing the formatted value
   */
  async formatValue(value, type) {
    const params = {
      action: "wbformatvalue",
      format: "json",
      value: JSON.stringify(value),
      type,
    };

    return await super.wikiPost(params);
  }
}

export default WikiBase;
