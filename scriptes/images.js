import fetch from "node-fetch";
import dotenv from "dotenv";
import { extractCookie } from "./utils/cookie.js";
dotenv.config()
class ImageApi {
  userName = "";
  #password = "";
  url = "";
  cookie = "";
  isLoggedIn = false;
  constructor() {
    this.userName = process.env.PITUACH_USERNAME;
    this.#password = process.env.PITUACH_PASSWORD;
    this.url = "https://www.pituachmichlol.org.uk/api/";
  }
  async login() {
    const res = await this.#post({
      action: "login",
      uname: this.userName,
      pw: this.#password,
    });
    const data = await res.json();
    if (data.success) {
      this.cookie = extractCookie(res.headers.raw()["set-cookie"][1]);
      this.isLoggedIn = true;
    } else {
      throw new Error("Couldn't login: " + JSON.stringify(data));
    }
    return this;
  }
  async getImageStatus(image) {
    const res = await this.#get({ action: "search", image: image });
    const data = await res.json();
    if (data.error) {
      return data.error.message;
    }
    return data.image?.netfree;
  }
  async #post(params) {
    return fetch(`${this.url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: this.cookie,
      },
      body: JSON.stringify(params),
    });
  }
  async #get(params) {
    return fetch(`${this.url}?${new URLSearchParams(params)}`, {
      headers: { cookie: this.cookie },
      credentials: "include",
    });
  }
}