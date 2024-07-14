import { requests } from "../requests/requests.js";

const request = new requests("https://www.hamichlol.org.il/w/api.php");

async function removeReplacementImages() {
  const queryParams = {
    action: "query",
    format: "json",
    prop: "revisions",
    generator: "embeddedin",
    utf8: 1,
    formatversion: "2",
    rvprop: "content",
    rvslots: "main",
    geititle: "תבנית:תמונה חילופית",
    geinamespace: "0",
    geidir: "ascending",
    geilimit: "200",
  };

  try {
    
    const res   = await request.query({ options: queryParams });
    let count = 0;
    for (const page of Object.values(res)) {
      if (count == 10) break;
      let content = page.revisions[0].slots.main.content;
      const regex = /\{\{תמונה (חילופית|הדורשת החלפה)\|[^:\n]+:([^|\]]+)[^}]+\}\}/g;
      let listFilesOfRemove = [];
      const matches = content.matchAll(regex);

      if (!matches) continue;

      for (const match of matches) {
        listFilesOfRemove.push(match[2]);
        content = content.replace(match[0], "");
      }
      if (listFilesOfRemove.length == 0) continue;
      listFilesOfRemove = listFilesOfRemove.map((file, index) => {
        return `[[:קובץ:${file}|${index + 1}]]`;
      })
      count ++
      await request
        .edit({
          title: page.title,
          summary: `${listFilesOfRemove.join(", ")}`,
          text: content + "\n[[קטגוריה:ערכים שהוסרה מהם תבנית תמונה חילופית על ידי בוט]]",
          tags: "הסרת תבנית תמונה חילופית",
          nocreate: 1
        })

    }
  } catch (error) {
    console.error(error);
  }

}

removeReplacementImages()