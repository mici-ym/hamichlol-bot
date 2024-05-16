import Client from "./Client.js";
import { mergeDeep, mapIdsToNames } from "./utils/DataProcessor.js";

/**
 * Represents a class for making HTTP GET requests to a specified URL and retrieving data from a wiki.
 * @constructor
 * @param {string} urlGet - The URL of the wiki.
 * @throws {Error} Throws an error if the URL of the wiki is not provided.
 */
export class requests extends Client {
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
    useIdsOrTitles = "ids",
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
    const query = await this.query({
      options: queryParams,
      withCookie,
      getContinue,
    });
    return useIdsOrTitles === "ids" ? query : mapIdsToNames(query);
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
    if (options.cmnamespace) {
      queryParams.cmnamespace = options.cmnamespace;
    }
    if (options.cmtype) {
      delete queryParams.cmnamespace;
    } else {
      delete options.cmtype;
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
    return await super.get(new URLSearchParams(parseParams), false);
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

    const res = await super.get(queryString, withCookie);
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
    let pages = "pages" in data.query;

    results = !pages
      ? results.concat(...Object.values(data.query))
      : data.query.pages;
    try {
      while (contin) {
        const res = await super.get(
          `${queryString}&${this.#objectToQueryString(contin)}`,
          withCookie
        );
        results = !pages
          ? results.concat(...Object.values(res.query))
          : mergeDeep(res.query.pages, results);
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

/**
 * @type {{[key: string]: Requests}}
/**
 * @type {{[key: string]: Requests}}
 */
let instance = {};

/**
 * Get or create an instance of Requests.
 *
 * @param {string} wikiUrl - The URL to use for the requests.
 * @param {string} [nameInstance="hamichlol"] - The name of the instance.
 * @returns {requests} An instance of the `Requests` class.
 */
export function getRequestsInstance(wikiUrl, nameInstance = "hamichlol") {
  if (!instance[nameInstance]) {
    instance[nameInstance] = new requests(wikiUrl);
  }
  return instance[nameInstance];
}