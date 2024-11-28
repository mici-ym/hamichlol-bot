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
class Client {
  wikiUrl;
  #cookie = "";
  userName = process.env.MC_USER || "";
  #password = process.env.MC_PASSWORD || "";
  token = "";

  /**
   *
   * @param {String} wikiUrl
   */
  constructor(wikiUrl) {
    if (!wikiUrl) {
      throw new Error("you didn't pass the url of your wiki");
    }
    this.wikiUrl = wikiUrl;
    this.isLogedIn = false;
    this.withLogedIn = true;
  }
  /**
   * Sends a POST request to the MediaWiki API with the provided body parameters.
   * This private method handles authentication, error logging, and cookie management.
   *
   * @private
   * @async
   * @param {Object} body - An object containing the parameters to be sent in the request body.
   * @param {string} [body.action] - The action to be performed. If 'login', updates the cookie.
   * @returns {Promise<Object>} The JSON response from the MediaWiki API.
   * @throws {Error} Throws an error if the HTTP response is not ok or if there's any other error during the process.
   */
  async #postWiki(body) {
    try {
      const response = await fetch(this.wikiUrl, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": "node-fetch mw-api-node-client",
          cookie: this.#cookie,
        },
        method: "POST",
        credentials: "include",
        body: new URLSearchParams({ format: "json", utf8: 1, ...body }),
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        logger.error(`Failed to post to wiki: ${error.message}`);
        throw error;
      }
      if (body.action === "login") {
        this.#cookie = extractCookie(response.headers.raw()["set-cookie"]);
      }
      return await response.json();
    } catch (error) {
      logger.error(`Error in #postWiki: ${error.message}`, error);
      throw error;
    }
  }
  /**
   * Makes a GET request to a specified URL with an optional query string.
   *
   * @param {string} queryString - The query string to be appended to the URL.
   * @param {boolean} withCookie - Indicates whether to include the user's cookie in the request headers. Default is `true`.
   * @returns {Promise<object>} - The response from the GET request in JSON format.
   */
  async get(queryString, withCookie = true) {
    if (!this.isLogedIn && withCookie && this.withLogedIn) {
      await this.login();
    }
    try {
      const res = await fetch(`${this.wikiUrl}?${queryString}`, {
        headers: { cookie: this.#cookie },
      });
      if (res.status !== 200) {
        logger.error(`Error: ${res.status}`);
        throw new Error(`Status: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      logger.error(`Error in get: ${error.message}`, error);
      throw new Error(error);
    }
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
      const { login } = await this.#postWiki(loginParams);
      console.log(login);

      if (!login.result || login.result !== "Success") {
        logger.error(`Error in login: ${login.message}`, login);
        this.isLogedIn = false;
        return false;
      }
      logger.info("logged in successfully");
      this.token = await this.#getToken("csrf&assert=" + assert);
      console.log(this.token);

      this.isLogedIn = true;
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
    this.#postWiki(logOutParams)
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

    if (!this.isLogedIn) {
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
      const result = await this.#postWiki(editParams);
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
    if (!this.isLogedIn) await this.login();
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
    return await this.#postWiki(deleteParams);
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
    if (!this.isLogedIn) await this.login();
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
    return await this.#postWiki(moveParams);
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
    if (!this.isLogedIn) await this.login();
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
    return await this.#postWiki(lockParams);
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
    return await this.#postWiki(params);
  }
  async sendMail({ target, subject, text }) {
    const mailParams = {
      action: "emailuser",
      target,
      subject,
      text,
      token: target.token,
    };
    return await this.#postWiki(mailParams);
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
    const parsed = await this.#postWiki(flowParams);
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
      if (!this.isLogedIn) await this.login();
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
      return await this.#postWiki(params);
    } catch (error) {
      logger.error("rollback filed", error);
      throw error;
    }
  }
}

export default Client;
