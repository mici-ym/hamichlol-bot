import { getRequestsInstance } from "../requests/requests.js";
import { importText } from "../import/import_text.js";
import logger from "../logger.js";

const request = getRequestsInstance("hamichlol");
const wikiRequest = getRequestsInstance("wiki");

async function updateMath() {
  const category = process.argv[2] || "מתמטיקה";

  if (!category) {
    logger.error("no category provided");
    throw new Error("no category provided");
  }

  const data = await wikiRequest.categoryMembers({
    categoryName: category,
    withCookie: false,
  });
  if (data.length === 0) {
    logger.error(`no pages in category ${category}`);
  }
  let count = 0;
  for (const page of data) {
    const { text, summary, isImage } = await importText(page.title);
    if (!text) {
      logger.error(`page ${page.title} not get text`);
      continue;
    }

    const { edit } = await request.edit({
      title: page.title,
      text,
      summary,
      tags: isImage ? "auto update with image" : "auto-update",
    });
    if (edit.result === "Success") {
      logger.info(`page ${page.title} updated`, {
        service: "updateMath",
        ...edit,
      });
      count++;
    }
  }

  logger.info(`updated ${count} pages in ${category}`, {
    service: "updateMath",
  });
  request.edit({
    title: " u:מוטי בוט/לוגים",
    text: `${count} דפים עודכנו מתוך ${data.length} בקטגוריה ${category}. @[[U:שרגא|שרגא]] לתשומת ליבך! ~~~~`,
    section: "new",
    sectiontitle: "לוג עדכון",
  });
}

updateMath();
