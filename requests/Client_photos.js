import fetch from "node-fetch";
import { extractCookie } from "./utils/cookie.js";

class ClientPhotos {
  url = "https://www.pituachmichlol.org.uk";
  userName = process.env.PITUACH_USERNAME;
  #password = process.env.PITUACH_PASSWORD;
  #cookie = "";
  isLogedIn = false;
  constructor() {}

  async #postWiki(body) {
    return fetch(this.url, {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "user-agent": "node-fetch moti-hamichlol",
        cookie: this.#cookie,
      },
      method: "POST",
      credentials: "include",
      body: new URLSearchParams({ format: "json", utf8: 1, ...body }),
    });
  }

  async login() {
    if (!this.userName || !this.#password) {
      throw new Error("you dinwt pass your user name or your password");
    }

    const loginParams = {
      action: "login",
      uname: this.userName,
      pw: this.#password,
    };
    const res = await this.#postWiki(loginParams);
    const result = await res.json();
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (result.success) {
      this.#cookie = extractCookie(res.headers.raw()["set-cookie"]);
      this.isLogedIn = true;
      return true;
    }
  }

  async search(file) {
    if (!this.isLogedIn) {
      await this.login();
    }
    const res = await fetch(`${this.url}/api?action=search&image=${file}`, {
      headers: { cookie: this.#cookie },
    });
    return res.json();
  }
}
export default ClientPhotos;
