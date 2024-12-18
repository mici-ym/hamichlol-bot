import { Requests } from "../requests/requests.js";

const request = new Requests("https://www.hamichlol.org.il/w/api.php");

async function main() {
  const pages = await request.embeddedin({
    title: "תבנית:יחסי מדינות",
  });
  for (const page of pages) {
    if (
      (/יחסי\s\W+\s?\W*\s[א-ת]+–/.test(page.title) ||
      /יחסי[^–]+–[א-ת]+\s\W+/.test(page.title)) &&
      !/\s–\s/.test(page.title)
    ) {
      try {
        const { move } = await request.move(
          page.title,
          page.title.replace(/(–)/, " $1 "),
          "השוואה לוויקיפדיה העברית",
          {
            movtalk: false,
            movesubpages: false,
            noredirect: false,
          }
        );

        console.log(move);
        const { parse } = await request.parse({
          page: move.to,
        });
        await request.edit({
          title: parse.title,
          summary: "מיון וויקיפדיה",
          text: parse.wikitext["*"].replace(
            /{{מיון ויקיפדיה\|דף\s?=[^|]+/,
            `{{מיון ויקיפדיה|דף=${parse.title}`
          ),
        });
      } catch (error) {
        console.error(error);
      }
    }
  }
}

main();
