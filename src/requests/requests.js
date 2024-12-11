import Client from "./Client.js";
import { mapIdsToNames, mergeResults } from "./utils/DataProcessor.js";
import logger from "../logger.js";

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
      logger.error("you didn't pass the url of your wiki");
      throw new Error("you didn't pass the url of your wiki");
    }
    super(wikiUrl);
    this.wikiUrl = wikiUrl;
  }

  /**
   * Queries pages from the wiki API based on provided titles or IDs.
   *
   * @async
   * @param {Object} params - The parameters for the query.
   * @param {string|string[]} [params.titles] - The titles of the pages to query. Can be a single title or an array of titles.
   * @param {string} [params.useIdsOrTitles="ids"] - Determines whether to return results using page IDs or titles. Can be "ids" or "titles".
   * @param {boolean} [params.withCookie=true] - Whether to include cookies in the request.
   * @param {boolean} [params.getContinue=true] - Whether to automatically fetch all results using continuation.
   * @param {Object} [params.options={}] - Additional query parameters to be included in the request.
   * @returns {Promise<Object>} A promise that resolves to the query results. If useIdsOrTitles is "ids", it returns the raw query result. If "titles", it returns the result mapped from IDs to titles.
   */
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
      prop: "info",
    };
    if (titles)
      queryParams.titles =
        typeof titles === "string" ? titles : titles.join("|");
    Object.assign(queryParams, options);
    const query = await this.query({
      options: queryParams,
      withCookie,
      getContinue,
    });
    return useIdsOrTitles === "ids" ? query : mapIdsToNames(query, "title");
  }

  /**
   * Queries the wiki API for pages that embed (transclude) a specified page.
   *
   * @async
   * @param {Object} params - The parameters for the query.
   * @param {number} [params.pageid] - The ID of the page to find embeddings for. Mutually exclusive with 'title'.
   * @param {string} [params.title] - The title of the page to find embeddings for. Mutually exclusive with 'pageid'.
   * @param {boolean} [params.withCookie=true] - Whether to include cookies in the request.
   * @param {boolean} [params.getContinue=true] - Whether to automatically fetch all results using continuation.
   * @param {Object} [params.options={}] - Additional query parameters to be included in the request.
   * @throws {Error} Throws an error if both pageid and title are provided.
   * @returns {Promise<Object>} A promise that resolves to the query results containing pages that embed the specified page.
   */
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
      logger.error("you must provide either pageid or title");
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

  /**
   * Queries the wiki API for the members of a specific category.
   *
   * @param {Object} options - The options for the query request.
   * @param {string} options.categoryName - The name of the category whose members are to be queried.
   * @param {number} [options.categoryId] - The ID of the category whose members are to
   * @param {boolean} [options.withCookie=true] - A flag indicating whether to use a cookie for the request.
   * @param {boolean} [options.getContinue=true] - A flag indicating whether to retrieve all results using continuation.
   * @param {Object} [options.options={}] - Additional options for the query request.
   * @returns {Promise<Object>} - A promise that resolves to the query result in JSON format.
   */
  async categoryMembers({
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
      logger.error("you must provide either categoryId or categoryName");
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
      logger.error("you can't pass both page and pageid");
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
  /**
   * Performs a query to the wiki API using specified parameters.
   *
   * @async
   * @param {Object} params - The parameters for the query.
   * @param {Object} [params.options={}] - Additional options to be included in the query parameters.
   * @param {boolean} [params.withCookie=true] - Whether to include cookies in the request.
   * @param {boolean} [params.getContinue=true] - Whether to automatically fetch all results using continuation.
   * @returns {Promise<Object>} A promise that resolves to the query result. If getContinue is true, it includes all paginated results.
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
   * @async
   * @param {string} queryString - The query string for the GET request.
   * @param {boolean} withCookie - A flag indicating whether to use a cookie for the request.
   * @param {object} data - The data from the previous query results.
   * @returns {Promise} - The result of the final query.
   * @throws {Error} - If an error occurs during the process.
   */
  async getWithContinue(queryString, withCookie, data) {
    if (!data || !data.query) {
      logger.error("the data is not valid");
      throw new Error("the data is not valid");
    }
    if (!queryString) {
      logger.error("the query string is not valid");
      throw new Error("the query string is not valid");
    }
    let contin = data.continue;

    let results = mergeResults([], data);

    try {
      while (contin) {
        const res = await super.get(
          `${queryString}&${this.#objectToQueryString(contin)}`,
          withCookie
        );
        results = mergeResults(results, res);
        contin = res.continue;
      }
      return results;
    } catch (error) {
      logger.error(error);
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
 * @type {{[key: string]: requests}}
 */
let instance = new Map();

/**
 * Get or create an instance of Requests.
 *
 * @param {string} [nameInstance="hamichlol"] - The name of the instance.
 * @param {string} wikiUrl - The URL to use for the requests.
 * @returns {requests} An instance of the `Requests` class.
 */
export function getRequestsInstance(nameInstance = "hamichlol", wikiUrl) {
  wikiUrl = wikiUrl
    ? wikiUrl
    : nameInstance === "hamichlol"
    ? "https://www.hamichlol.org.il/w/api.php"
    : process.platform === "win32"
    ? "https://www.hamichlol.org.il/import/get_wik1i.php"
    : "https://he.wikipedia.org/api.php";
  if (!instance[nameInstance]) {
    logger.info("creating instance: " + nameInstance);
    instance[nameInstance] = new requests(wikiUrl);
  }
  return instance[nameInstance];
}
