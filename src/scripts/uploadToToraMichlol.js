import fs from "fs";
import { Requests } from "../requests/requests.js";
import logger from "../logger.js";
import { log } from "console";

async function getarticleTextFromFile(filePath) {
  const data = fs.readFileSync(filePath, "utf8");

  const titlePattern = /==([^=\n]+)==/g;
  const matches = [...data.matchAll(titlePattern)];
  const articles = [];

  matches.forEach((match, i) => {
    const titleStart = match.index + match[0].length;
    const contentEnd = matches[i + 1] ? matches[i + 1].index : data.length;
    if (i === 60 || i === 61 || i === 80 || i === 81) {
      console.log(`Title: ${match[1].trim()}`);
      console.log(`match: ${matches[i + 1]}`);
      console.log(`Content Start: ${titleStart}, Content End: ${contentEnd}`);
    }
    const content = data.substring(titleStart, contentEnd).trim();

    articles.push({
      title: match[1].trim(),
      content: content,
      isEmpty: content.length === 0
    });
  });

  return articles;
}
getarticleTextFromFile("C:/Users/user/Downloads/test3.txt").then(res => {
  res.forEach((article, i) => {
    if ((i + 1) % 10 !== 0) return;
    console.log(`\n--- מאמר ${i + 1} ---`);
    console.log(`כותרת: "${article.title}"`);
    console.log(`ריק: ${article.isEmpty}`);
    console.log(`תוכן: ${article.content.substring(0, 100)}...`);
  });
});
