import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
import { extractCookie } from "./utils/cookie.js";
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
  isLogedIn = false;
  /**
   *
   * @param {String} wikiUrl
   */
  constructor(wikiUrl) {
    if (!wikiUrl) {
      throw new Error("you didn't pass the url of your wiki");
    }
    this.wikiUrl = wikiUrl;
  }
  async #postWiki(body) {
    return fetch(this.wikiUrl, {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "user-agent": "node-fetch mw-api-node-client",
        cookie: this.#cookie,
      },
      method: "POST",
      credentials: "include",
      body: new URLSearchParams({ format: "json", utf8: 1, ...body }),
    });
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
    const res = await fetch(`${this.wikiUrl}?${queryString}`, {
      headers: { cookie: this.#cookie },
    });
    return res.json();
  }
  /**
   * method to login the user and get a cookie for forther operations
   * @param {String} [userName]
   * @param {String} [password]
   * @returns {Promise<Boolean>}
   */
  async login(userName, password) {
    if (userName) {
      this.userName = userName;
    }
    if (password) {
      this.#password = password;
    }
    if (!this.userName || !this.#password) {
      throw new Error("you dinwt pass your user name or your password");
    }
    const { logintoken: lgtoken } = await this.#getToken("login");
    const loginParams = {
      action: "login",
      lgname: this.userName,
      lgpassword: this.#password,
      lgtoken,
    };
    const res = await this.#postWiki(loginParams);
    const { login } = await res.json();
    if (!login.result || login.result !== "Success") {
      console.log(login);
      this.isLogedIn = false;
      return false;
    }
    this.#cookie = extractCookie(res.headers.raw()["set-cookie"]);
    this.token = await this.#getToken("csrf&assert=bot");
    this.isLogedIn = true;
    return true;
  }
  async logout() {
    const logOutParams = {
      action: "logout",
      token: this.token,
    };
    this.#postWiki(logOutParams)
      .then(() => console.log("loged out successfully"))
      .catch((err) => console.log(err));
  }
  /**
   *
   * @param {String} type
   * @returns {Promise<Object>}
   */
  async #getToken(type) {
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
  }
  /**
   * method for making edit, you most provide title or pageid, providing both will return error from the api, you most even provide text, all other arguments are optional
   * @param {Object} param
   * @param {String} [param.title]
   * @param {Number} [param.pageId]
   * @param {String} param.text
   * @param {Number} [param.baseRevId]
   * @param {String} [param.summary]
   * @param {Number} param.nocreate
   * @param {Number|String} [param.section]
   * @param {String} [param.sectiontitle]
   * @returns {Promise<String>}
   */
  async edit({
    title,
    pageId: pageid,
    text,
    baseRevId: baserevid,
    summary,
    nocreate = 1,
    section,
    sectiontitle,
  }) {
    if (!title && !pageid) {
      throw new Error(
        "you didn't pass the details of the article you want to edit"
      );
    }
    if (!this.isLogedIn) {
      await this.login();
    }
    const editParams = {
      action: "edit",
      text,
      summary: summary || "",
      minor: 1,
      bot: 1,
      nocreate,
      baserevid,
      section,
      sectiontitle,
      token: this.token.csrftoken,
    };
    if(!nocreate) delete editParams.nocreate;
    if (!baserevid) {
      delete editParams.baserevid;
    }
    if (!section) {
      delete editParams.section;
    }
    if (!sectiontitle) {
      delete editParams.sectiontitle;
    }
    if (title) {
      editParams.title = title;
    } else {
      editParams.pageid = pageid;
    }
    const res = await this.#postWiki(editParams);
    const { edit, error } = await res.json();
    return edit?.result || error;
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
    const res = await this.#postWiki(deleteParams);
    const parsed = await res.json();
    console.log(parsed?.delete?.title || `problem deleting ${title}`);
    return parsed;
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
    { movetalk = 1, movesubpages = 1, noredirect = 1 }
  ) {
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
    const res = await this.#postWiki(moveParams);
    const parsed = await res.json();
    return parsed?.move?.to;
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
    const res = await this.#postWiki(params);
    const parsed = await res.json();
    if (parsed.error) {
      console.log(parsed.error.code, title);
    } else {
      console.log(parsed.undelete.title);
    }
  }
  async sendMail({ target, subject, text }) {
    const mailParams = {
      action: "emailuser",
      target,
      subject,
      text,
      token: target.token,
    };
    const res = await this.#postWiki(mailParams);
    const parsed = await res.json();
    console.log(parsed);
    return parsed?.emailuser?.result;
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
    const res = await this.#postWiki(flowParams);
    const parsed = await res.json();
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
