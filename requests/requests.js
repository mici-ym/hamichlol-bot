import Client from "./Client.js";

const client = new Client("https://www.hamichlol.org.il/w/api.php");

/**
 * Represents a class for making HTTP GET requests to a specified URL and retrieving data from a wiki.
 * @constructor
 * @param {string} urlGet - The URL of the wiki.
 * @throws {Error} Throws an error if the URL of the wiki is not provided.
 */
class requests extends Client {
  wikiUrl = "";
  constructor(wikiUrl) {
    if (!wikiUrl) {
      throw new Error("you didn't pass the url of your wiki");
    }
    super(wikiUrl);
    this.wikiUrl = wikiUrl;
  }

  async queryPages({
    titles,
    withCookie = true,
    getContinue = true,
    options = {},
  }) {
    const queryParams = {
      action: "query",
      format: "json",
      titles,
      prop: "info",
    };
    Object.assign(queryParams, options);
    return await this.query({ options: queryParams, withCookie, getContinue });
  }

  async embeddedin({
    pageid,
    title,
    withCookie = true,
    getContinue = true,
    options = {},
  }) {
    const queryParams = {
      action: "query",
      format: "json",
      list: "embeddedin",
      einamespace: 0,
      eilimit: "max",
    };
    if (pageid && title) {
      throw new Error("you must provide either pageid or title");
    }
    if (pageid) {
      queryParams.einpageid = pageid;
    }
    if (title) {
      queryParams.eititle = title;
    }
    Object.assign(queryParams, options);
    return await this.query({ options: queryParams, withCookie, getContinue });
  }

  async categoryMembers({
    /**
     * Queries the wiki API for the members of a specific category.
     *
     * @param {Object} options - The options for the query request.
     * @param {string} options.categoryName - The name of the category whose members are to be queried.
     * @param {boolean} [options.withCookie=true] - A flag indicating whether to use a cookie for the request.
     * @param {boolean} [options.getContinue=true] - A flag indicating whether to retrieve all results using continuation.
     * @param {Object} [options.options={}] - Additional options for the query request.
     * @returns {Promise<Object>} - A promise that resolves to the query result in JSON format.
     */
    categoryName,
    categoryId,
    withCookie = true,
    getContinue = true,
    options = {},
  }) {
    const queryParams = {
      action: "query",
      format: "json",
      list: "categorymembers",
      cmnamespace: 0,
      cmlimit: "max",
    };
    if ((categoryId || options.categoryId) && categoryName) {
      throw new Error("you must provide either categoryId or categoryName");
    }
    if (categoryId || options.categoryId) {
      queryParams.cmpageid = categoryId || options.categoryId;
    }
    if (categoryName) {
      queryParams.cmtitle = `קטגוריה:${categoryName}`;
    }
    if (options.cmtype) {
      delete queryParams.cmnamespace;
    }

    Object.assign(queryParams, options);
    return await this.query({
      options: queryParams,
      withCookie,
      getContinue,
    });
  }

  /**
   * Parses a wiki page by making a GET request to the wiki API with the specified parameters.
   * @async
   * @param {string} params.page - The title of the wiki page to parse.
   * @param {number} params.pageid - The ID of the wiki page to parse.
   * @param {string} params.prop - The properties to include in the parsed data.
   * @param {number} params.section - The section number of the wiki page to parse.
   * @param {Object} params.options - Additional options for the parse request.
   * @returns {Promise<Object>} A promise that resolves to the parsed data in JSON format.
   */
  async parse({ page, pageid, prop, section, options = {} }) {
    const parseParams = {
      action: "parse",
      format: "json",
      utf8: 1,
      prop: prop || "wikitext",
    };
    if (page && pageid) {
      throw new Error("you can't pass both page and pageid");
    }
    if (page) {
      parseParams.page = page;
    }
    if (pageid) {
      parseParams.pageid = pageid;
    }
    if (section || section === 0) {
      parseParams.section = section;
    }
    Object.assign(parseParams, options);
    return await client.get(new URLSearchParams(parseParams), false);
  }

  /**
   * Queries the wiki API by making a GET request with the specified parameters.
   * @async
   * @param {Object} params - The parameters for querying the wiki API.
   * @param {Object} params.options - Additional options for the query request.
   * @returns {Promise<Object>} A promise that resolves to the query result in JSON format.
   */
  async query({ options = {}, withCookie = true, getContinue = true }) {
    const queryParams = {
      action: "query",
      format: "json",
      utf8: 1,
      ...options,
    };
    const queryString = new URLSearchParams(queryParams);

    const res = await client.get(queryString, withCookie);
    if (!getContinue) {
      return res;
    } else {
      return await this.getWithContinue(queryString, withCookie, res);
    }
  }

  /**
   * Handles the continuation of a query in the wiki API.
   *
   * @param {string} queryString - The query string for the GET request.
   * @param {boolean} withCookie - A flag indicating whether to use a cookie for the request.
   * @param {object} data - The data from the previous query results.
   * @returns {Promise} - The result of the final query.
   * @throws {Error} - If an error occurs during the process.
   */
  async getWithContinue(queryString, withCookie, data) {
    let contin = data.continue;
    let results = [];
    const pages = data.query.pages;

    results = !pages
      ? results.concat(...Object.values(data.query))
      : results.concat(Object.values(Object.values(data.query)[0]));
    try {
      while (contin) {
        const res = await client.get(
          `${queryString}&${this.#objectToQueryString(contin)}`,
          withCookie
        );
        results = !pages
          ? results.concat(...Object.values(res.query))
          : results.concat(Object.values(Object.values(res.query)[0]));
        contin = res.continue;
      }
      return results;
    } catch (error) {
      console.error(error);
      //throw new Error(error);
    }
  }
  /**
   * Converts an object into a query string format.
   * @param {Object} obj - The object to be converted into a query string.
   * @returns {string} - The query string representation of the input object.
   */
  #objectToQueryString(obj) {
    return Object.entries(obj)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join("&");
  }
}

let instance = {};

export function getRequestsInstance(wikiUrl, nameInstance = "hamichlol") {
  if (!instance[nameInstance]) {
    instance[nameInstance] = new requests(wikiUrl);
  }
  return instance[nameInstance];
}
