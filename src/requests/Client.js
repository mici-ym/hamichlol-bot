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
  }
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
    if (!this.isLogedIn && withCookie) {
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
      if (!login.result || login.result !== "Success") {
        logger.error(`Error in login: ${login.message}`, login);
        this.isLogedIn = false;
        return false;
      }
      logger.info("logged in successfully");
      this.token = await this.#getToken("csrf&" + assert);
      this.isLogedIn = true;
      return true;
    } catch (error) {
      throw new Error(error);
    }
  }
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
   * method for making edit, you most provide title or pageid, providing both will return error from the api, you most even provide text, all other arguments are optional
   * @param {Object} param
   * @param {String} [param.title]
   * @param {Number} [param.pageId]
   * @param {String} param.text
   * @param {String} [param.summary]
   * @param {Boolean} [param.minor]
   * @param {Boolean} [param.bot]
   * @param {Object} [param.otherParams]
   * @returns {Promise<String>}
   */
async edit({
  title,
  pageId,
  text,
  summary = '',
  minor = true,
  bot = true,
  ...otherParams
} = {}) {
  if (!title && !pageId) {
    logger.error("you didn't pass the details of the article you want to edit");
    throw new Error("you didn't pass the details of the article you want to edit");
  }
  if (!text) {
    logger.error("you didn't pass the text of the article you want to edit");
    throw new Error("you didn't pass the text of the article you want to edit");
  }

  if (!this.isLogedIn) {
    await this.login();
  }

  const editParams = Object.fromEntries(
    Object.entries({
      action: 'edit',
      title,
      pageid: pageId,
      text,
      summary,
      minor: minor ? 1 : undefined,
      bot: bot ? 1 : undefined,
      token: this.token.csrftoken,
      ...otherParams
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
  async delete(title, reason) {
    if (!this.isLogedIn) await this.login();
    const deleteParams = {
      action: "delete",
      title,
      token: this.token.csrftoken,
      reason,
    };
    if (!reason) delete deleteParams.reason;
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
}

export default Client;
