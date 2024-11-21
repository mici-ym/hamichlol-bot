import { request } from "../../requests/requests.js";

const wikipediaApi = new request("https://he.wikipedia.org/w/api.php");

async function checkEvent(title) {
  wikipediaApi.get("title").then(function (response) {
    console.log(response);
  });
}
checkEvent("abc");