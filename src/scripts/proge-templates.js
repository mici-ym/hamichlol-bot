import { Requests } from "../requests/requests.js";

const request = new Requests("https://www.hamichlol.org.il/w/api.php");
async function main() {
  const templates = await request.query({
    options: {
      list: "categorymembers",
      cmtitle: " קטגוריה:תבניות עם ניהול פרמטרים",
      cmnamespace: "10",
      cmlimit: "max",
    },
  });
  for (const template of templates) {
    const { parse } = await request.parse({ pageid: template.pageid });
    await request
      .edit({
        pageId: template.pageid,
        text: parse.wikitext["*"],
        summary: "",
      })
      .then((res) => {
        console.log(res);
      });
  }
}

main();

