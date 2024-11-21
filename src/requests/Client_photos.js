import { extractCookie } from "./utils/cookie.js";

class ClientPhotos {
  url = "https://www.pituachmichlol.org.uk";
  userName = process.env.PITUACH_USERNAME;
  #password = process.env.PITUACH_PASSWORD;
  #cookie = "";
  isLogedIn = false;
  constructor() {}

  async #post(body) {
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

  async #get(params) {
    const res = await fetch(`${this.url}?${new URLSearchParams(params)}`, {
      headers: { cookie: this.#cookie },
      credentials: "include",
    });
    return res.json();
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
    const res = await this.#post(loginParams);
    const result = await res.json();

    if (result.success) {
      this.#cookie = extractCookie(res.headers.raw()["set-cookie"][1]);
      this.isLogedIn = true;
    } else {
      throw new Error("Couldn't login: " + JSON.stringify(result));
    }
    return this;
  }

  async getImageStatus(file) {
    if (!this.isLogedIn) {
      await this.login();
    }

    const { image, error } = await this.#get({ action: "search", image: file });
    return image?.netfree || error?.message;
  }
}
export default ClientPhotos;
