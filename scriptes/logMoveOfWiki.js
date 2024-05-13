import { requests } from "../requests/requests.js";

const wikiRequest = new requests("https://import.hamichlol.org.il/?");
const request = new requests("https://www.hamichlol.org.il/w/api.php");

async function main() {
  const res = await wikiRequest.query({
    options: {
      list: "logevents",
      utf8: 1,
      leprop: "title|type|timestamp|comment|details",
      letype: "move",
      lestart: "2024-05-08T09:21:42.000Z",
      leend: "2024-05-07T09:21:42.000Z",
      lenamespace: "0",
      lelimit: "max",
    },
    withCookie: false,
  });
  console.log(res);
}

async function cackeLocal(title, target) {
  const dataTitle = await request.query({
    options: {
      action: "query",
      format: "json",
      prop: "info|redirects",
      list: "logevents",
      titles: title,
      utf8: 1,
      rdprop: "title",
      leprop: "comment|title",
      letype: "move",
      letitle: title,
    },
  });
}
main();
