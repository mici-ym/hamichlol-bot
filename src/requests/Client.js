import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
import { extractCookie } from "./utils/cookie.js";
import logger from "../logger.js";

/**
 * client for mediawiki wiki api,
 * use only with A user with bot rights,
 * create A sub user with [[Special:BotPasswords]],
 * instruction see in {@link https://www.mediawiki.org/wiki/Manual:Bot_passwords}
 * @class Client
 */
class WikiClient {
  wikiUrl;
  #cookie = "";
  userName = process.env.MC_USER || "";
  #password = process.env.MC_PASSWORD || "";
  token = "";
  isLoggedIn = false;

  /**
   *
   * @param {String} wikiUrl
   */
  constructor(wikiUrl, maxlag = 5, maxRetries = 3, withLogedIn = true) {
    if (!wikiUrl) {
      throw new Error("you didn't pass the url of your wiki");
    }
    this.wikiUrl = wikiUrl;
    this.isLoggedIn = false;
    this.withLogedIn = withLogedIn;
    this.maxlag = maxlag;
    this.maxRetries = maxRetries;
  }

  /**
   * Sends a request to the MediaWiki API.
   * @async
   * @private
   * @param {string} method - The HTTP method to use for the request.
   * @param {object} params - The object params the request URL.
   * @param {number} [retries=0] - The number of retries for failed requests.
   * @returns {Promise<Object>} The JSON response from the MediaWiki API.
   */
  async #request(method, params, retries = 0) {
    const url = new URL(this.wikiUrl);
    const searchParams = new URLSearchParams({ format: "json", utf8: 1, ...params });
    if (this.maxlag) {
      searchParams.append("maxlag", this.maxlag);
    }
    let response;
    try {
      if (method === "GET") {
        url.search = searchParams;
        response = await fetch(url, {
          headers: {
            "user-agent": this.userAgent || "hamichlol-bot",
            cookie: this.#cookie,
          },
        });
      } else {
        response = await fetch(url, {
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "user-agent": this.userAgent || "hamichlol-bot",
            cookie: this.#cookie,
          },
          method: "POST",
          credentials: "include",
          body: searchParams,
        });
      }
      if (!response.ok) {
        const retry = parseInt(response.headers.get("retry-after"));
        if (retry && retries < this.maxRetries) {
          logger.info(`Retrying fetch after ${retry} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retry * 1000));
          return this.#request(method, params, retries + 1);
        } else if (retries >= this.maxRetries) {
          logger.error(
            `Max retries exceeded for ${url.toString()}, giving up...`,
            response
          );
          throw new Error(`Max retries exceeded for ${url.toString()}`);
        }
        const error = new Error(`HTTP error! status: ${response.status}`);
        logger.error(`Failed to fetch ${url.toString()}: ${error.message}`, response);
        throw error;
      }
      if (params.action === "login") {
        this.#cookie = extractCookie(response.headers.raw()["set-cookie"]);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Error in #request: ${error.message}`, error);
      throw error;
    }
  }
  /**
   * Sends a POST request to the MediaWiki API with the provided body parameters.
   *
   * @async
   * @param {Object} body - An object containing the parameters to be sent in the request body.
   * @returns {Promise<Object>} The JSON response from the MediaWiki API.
   */
  async wikiPost(body) {
    return await this.#request("POST", body);
  }
  /**
   * Makes a GET request to a specified URL with an optional query string.
   *
   * @param {object} queryParams - The query string to be appended to the URL.
   * @returns {Promise<object>} - The response from the GET request in JSON format.
   */
  async wikiGet(queryParams) {
    if (!this.isLoggedIn && this.withLogedIn) {
      await this.login();
    }
    return await this.#request("GET", queryParams);
  }
  /**
   * method to login the user and get a cookie for forther operations
   * @param {String} [userName]
   * @param {String} [password]
   * @returns {Promise<Boolean>}
   */
  async login(userName, password, assert = "bot") {
    if (userName) {
      this.userName = userName;
    }
    if (password) {
      this.#password = password;
    }
    if (!this.userName || !this.#password) {
      logger.error("you dinwt pass your user name or your password");
      throw new Error("you dinwt pass your user name or your password");
    }
    const { logintoken: lgtoken } = await this.#getToken("login");
    const loginParams = {
      action: "login",
      lgname: this.userName,
      lgpassword: this.#password,
      lgtoken,
    };
    try {
      const { login } = await this.wikiPost(loginParams);
      this.#password = "";

      if (!login.result || login.result !== "Success") {
        logger.error(`Error in login: ${login.message}`, login);
        this.isLoggedIn = false;
        return false;
      }
      logger.info("logged in successfully");
      this.token = await this.#getToken("csrf&assert=" + assert);

      this.isLoggedIn = true;
      return true;
    } catch (error) {
      throw new Error(error);
    }
  }
  /**
   * Logs out the current user from the MediaWiki API.
   * This method sends a logout request to the API using the stored token.
   * It logs the success or failure of the logout operation.
   *
   * @async
   * @returns {Promise<void>} A promise that resolves when the logout process is complete.
   * @throws {Error} If there's an error during the logout process, it's caught and logged as a warning.
   */
  async logout() {
    const logOutParams = {
      action: "logout",
      token: this.token,
    };
    this.wikiPost(logOutParams)
      .then(() => logger.info("loged out successfully"))
      .catch((err) => logger.warn(err));
  }
  /**
   *
   * @param {String} type
   * @returns {Promise<Object>}
   */
  /**
   * Retrieves a token from the MediaWiki API for a specified action type.
   * This private method handles the API request to get the token and updates the cookie if a new one is provided.
   *
   * @private
   * @async
   * @param {string} type - The type of token to retrieve (e.g., 'login', 'csrf', etc.).
   * @returns {Promise<Object|undefined>} An object containing the requested token, or undefined if an error occurs.
   * @throws {Error} Logs the error message if the token retrieval fails.
   */
  async #getToken(type) {
    try {
      const res = await fetch(
        `${this.wikiUrl}?action=query&format=json&meta=tokens&type=${type}`,
        {
          headers: {
            cookie: this.#cookie || "",
          },
        }
      );
      const jsonRes = await res.json();

      if (res.headers.raw()["set-cookie"]) {
        this.#cookie = extractCookie(res.headers.raw()["set-cookie"]);
      }
      return jsonRes.query.tokens;
    } catch (error) {
      logger.error(`Error in #getToken: ${error.message}`, error);
    }
  }

  /**
   * Edits a page on the wiki using the MediaWiki API.
   *
   * @async
   * @param {Object} options - The options for editing the page.
   * @param {string} [options.title] - The title of the page to edit. Either title or pageId must be provided.
   * @param {number} [options.pageId] - The ID of the page to edit. Either title or pageId must be provided.
   * @param {string} options.text - The new content to set for the page.
   * @param {string} [options.summary=''] - A summary of the edit.
   * @param {boolean} [options.minor=true] - Whether the edit is minor.
   * @param {boolean} [options.bot=true] - Whether the edit is made by a bot.
   * @param {object} [options.otherParams] - Additional parameters to pass to the API.
   * @throws {Error} Throws an error if neither title nor pageId is provided, or if text is not provided.
   * @returns {Promise<Object>} A promise that resolves with the API response object.
   */
  async edit({
    title,
    pageId,
    text,
    summary = "",
    minor = true,
    bot = true,
    ...otherParams
  } = {}) {
    if (!title && !pageId) {
      logger.error(
        "you didn't pass the details of the article you want to edit"
      );
      throw new Error(
        "you didn't pass the details of the article you want to edit"
      );
    }
    if (!text) {
      logger.error("you didn't pass the text of the article you want to edit");
      throw new Error(
        "you didn't pass the text of the article you want to edit"
      );
    }

    if (!this.isLoggedIn) {
      await this.login();
    }

    const editParams = Object.fromEntries(
      Object.entries({
        action: "edit",
        title,
        pageid: pageId,
        text,
        summary,
        minor: minor ? 1 : undefined,
        bot: bot ? 1 : undefined,
        token: this.token.csrftoken,
        ...otherParams,
      }).filter(([, v]) => v !== undefined)
    );

    try {
      const result = await this.wikiPost(editParams);
      if (result.error) {
        logger.error(`Edit failed: ${result.error.info}`, result);
        throw new Error(`Edit failed: ${result.error.info}`);
      }
      return result;
    } catch (error) {
      logger.error(`Error in edit: ${error.message}`);
      throw error;
    }
  }

  /**
   * method to delete article
   * @param {String} title
   * @param {String} [reason]
   */
  async delete(title, pageid, reason) {
    if (!this.isLoggedIn) await this.login();
    const deleteParams = {
      action: "delete",
      title,
      pageid,
      token: this.token.csrftoken,
      reason,
    };
    Object.keys(deleteParams).forEach((key) => {
      if (deleteParams[key] === undefined) delete deleteParams[key];
    });
    return await this.wikiPost(deleteParams);
  }
  /**
   * method for moving pages
   * @param {String} from
   * @param {String} to
   * @param {String} [reason]
   * @param {Object} [param3]
   * @param {Number} param3.movtalk
   * @param {Number} param3.movesubpages
   * @param {Number} param3.noredirect
   * @returns {Promise<String>}
   */
  async move(
    from,
    to,
    reason,
    { movetalk = 1, movesubpages = 1, noredirect = 0 }
  ) {
    if (!this.isLoggedIn) await this.login();
    const moveParams = {
      action: "move",
      from,
      to,
      reason,
      movetalk,
      movesubpages,
      noredirect,
      ignorewarnings: 1,
      token: this.token.csrftoken,
    };
    if (!movetalk) delete moveParams.movetalk;
    if (!movesubpages) delete moveParams.movesubpages;
    if (!noredirect) delete moveParams.noredirect;
    return await this.wikiPost(moveParams);
  }

  /**
   * Locks a page on the wiki using the MediaWiki API.
   *
   * @async
   * @param {Object} options - The options for locking the page.
   * @param {string} [options.title] - The title of the page to lock. Either title or pageId must be provided.
   * @param {number} [options.pageid] - The ID of the page to lock. Either title or pageId must be provided.
   * @param {string} options.level - The protection level to apply to the page.
   * @param {string} [options.reason] - The reason for locking the page.
   * @throws {Error} Throws an error if no lock level is provided or if neither title nor pageId is provided.
   * @returns {Promise<Object>} A promise that resolves with the API response object for the lock action.
   */
  async lockPage({ title, pageid, level, reason }) {
    if (!this.isLoggedIn) await this.login();
    if (!level) throw new Error("You must provide a lock level");
    const lockParams = {
      action: "aspaklaryalockdown",
      level,
      reason,
      token: this.token.csrftoken,
    };
    if (!pageid && !title) {
      throw new Error("You must provide a title or pageid");
    } else if (pageid) {
      lockParams.pageid = pageid;
    } else lockParams.title = title;
    return await this.wikiPost(lockParams);
  }
  async unDelete({ title, reason }) {
    const params = {
      action: "undelete",
      format: "json",
      title,
      reason,
      token: this.token,
      utf8: 1,
    };
    return await this.wikiPost(params);
  }
  async sendMail({ target, subject, text }) {
    const mailParams = {
      action: "emailuser",
      target,
      subject,
      text,
      token: target.token,
    };
    return await this.wikiPost(mailParams);
  }
  async sendMessageToTalkPage({ page, topic, content }) {
    const { csrftoken: token } = await this.#getToken("csrf&assert=bot");
    const flowParams = {
      action: "flow",
      submodule: "new-topic",
      page,
      token,
      nttopic: topic,
      ntcontent: content,
    };
    const parsed = await this.wikiPost(flowParams);
    if (parsed?.error?.code === "invalid-page") {
      return await this.edit({
        title: page,
        text: content + "~~" + "~",
        summary: topic,
        section: "new",
        sectiontitle: topic,
      });
    }
    return parsed?.flow ? parsed?.flow["new-topic"]?.status : parsed;
  }

  /**
   * Performs a rollback operation on a wiki page.
   *
   * @async
   * @param {string} user - The username of the user whose edits are to be rolled back.
   * @param {Object} options - The options for the rollback operation.
   * @param {number} [options.pageid] - The ID of the page to rollback.
   * @param {string} [options.title] - The title of the page to rollback.
   * @param {string} [options.summary] - A summary of the rollback operation.
   * @param {boolean} [options.markbot=true] - Whether to mark the edit as bot.
   * @returns {Promise<Object>} A promise that resolves with the API response for the rollback action.
   */
  async rollback(user, { pageid, title, summary, markbot = true }) {
    try {
      if (!this.isLoggedIn) await this.login();
      if (!this.token.rollback) {
        const { rollbacktoken } = await this.#getToken("rollback&assert=bot");
        if (rollbacktoken) {
          this.token.rollback = rollbacktoken;
        } else {
          logger.error("Unable to obtain rollback token");
          throw new Error("Unable to obtain rollback token");
        }
      }
      const params = {
        action: "rollback",
        user,
        token: this.token.rollback,
      };

      if (pageid) params.pageid = pageid;
      if (title) params.title = title;
      if (summary) params.summary = summary;
      if (!markbot) delete params.markbot;
      return await this.wikiPost(params);
    } catch (error) {
      logger.error("rollback filed", error);
      throw error;
    }
  }
}

export default WikiClient;