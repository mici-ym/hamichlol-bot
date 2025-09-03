import { getRequestsInstance } from "../requests/requests.js";
import { detectTemplateCategory } from "../import/bot_pages.js";
import checkWords from "../import/check/filter.js";
import { checkLocalEdits } from "../import/check/check-local.js";
import { processWikiContent } from "../import/utils.js";
import logger from "../logger.js";
import path from "path";

// הגדרת לקוחות למכלול ולויקיפדיה
const hamichlol = getRequestsInstance("hamichlol");
hamichlol.withLogedIn = false;
const wikipedia = getRequestsInstance("wiki");
wikipedia.withLogedIn = false;

/**
 * סקריפט לעיבוד דפים עם תבנית "דף לטיפול במרחב הערכים"
 * הסקריפט:
 * 1. מאתר דפים עם התבנית
 * 2. בודק האם יש בהם תבניות מהרשימה המוגדרת
 * 3. אם לא - מוסיף לרשימת הלוג ומדלג
 * 4. אם כן - טוען מויקיפדיה, מעבד ושומר במכלול
 * 5. מדפיס לוג מפורט של התוצאות
 */

async function processArticleMaintenancePages() {
  const processLog = {
    processed: [], // דפים שעובדו בהצלחה
    skipped: [], // דפים שנדלגו (לא נמצאו תבניות או סיבות אחרות)
    errors: [], // דפים שנכשלו בעיבוד
    total: 0,
  };

  try {
    // שלב 1: איסוף כל הכותרות לעיבוד
    logger.info("מחפש דפים עם התבנית...");
    
    for await (const pagesWithTemplate of hamichlol.embeddedin({
      title: "תבנית:דף לטיפול",
      esGenerator: true,
    })) {
      if (!pagesWithTemplate || pagesWithTemplate.length === 0) {
        logger.info("לא נמצאו דפים עם התבנית");
        return;
      }
      const titlesToProcess = new Set();
      processLog.total += pagesWithTemplate.length;
      logger.info(`נמצאו ${processLog.total} דפים עם התבנית`);

      // איסוף כותרות אחרי בדיקת עריכות מקומיות
      for (const pageData of pagesWithTemplate) {
        const title = pageData.title;

        try {
          // בדיקה האם הדף כבר נערך מקומית
          const localEditCheck = await checkLocalEdits(title);
          if (localEditCheck && localEditCheck !== false) {
            processLog.skipped.push({
              title,
              reason: `נערך מקומית: ${localEditCheck}`,
            });
            logger.info(`בדף ${title}: נמצאו עריכות מקומיות - ${localEditCheck}`);
            continue;
          }
          titlesToProcess.add(title);
        } catch (error) {
          processLog.errors.push({
            title,
            error: error.message,
          });
          logger.error(`שגיאה בעיבוד דף ${title}:`, error);
        }
      }


      if (titlesToProcess.size === 0) {
        logger.info("לא נמצאו דפים לעיבוד לאחר הסינון");
        return;
      }

      // שלב 2: חלוקה לקבוצות של 50 ועיבוד כל קבוצה
      const titlesArray = Array.from(titlesToProcess);
      const batchSize = 50;

      console.log(`מתחיל עיבוד ${titlesArray.length} דפים בקבוצות של ${batchSize}`);

      for (let i = 0; i < titlesArray.length; i += batchSize) {
        const batch = titlesArray.slice(i, i + batchSize);
        logger.info(`מעבד קבוצה ${Math.floor(i / batchSize) + 1}/${Math.ceil(titlesArray.length / batchSize)} (${batch.length} דפים)`);

        await processBatch(batch, processLog);

        // המתנה קצרה בין קבוצות כדי לא להעמיס על השרתים
        if (i + batchSize < titlesArray.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // שלב 3: יצירת לוג סופי
    await generateFinalLog(processLog);
  } catch (error) {
    logger.error("שגיאה כללית בסקריפט:", error);
    throw error;
  } finally {
    // התנתקות מהלקוחות
    try {
      await hamichlol.logout();
    } catch (error) {
      logger.warn("שגיאה בהתנתקות ממכלול:", error);
    }
  }
}

/**
 * עיבוד קבוצה של דפים
 * @param {string[]} titles - מערך כותרות לעיבוד
 * @param {Object} processLog - אובייקט הלוג של התהליך
 */
async function processBatch(titles, processLog) {
  try {
    // שלב 1: בקשת תוכן מויקיפדיה עבור כל הדפים בקבוצה
    console.log(`טוען תוכן מויקיפדיה עבור ${titles.length} דפים...`);

    const wikipediaResults = {};

    // חלוקה לקבוצות קטנות יותר לויקיפדיה (בגלל הגבלות API)
    const wikiApiBatchSize = 50;

    for (let i = 0; i < titles.length; i += wikiApiBatchSize) {
      const wikiBatch = titles.slice(i, i + wikiApiBatchSize);

      try {
        const pages = await wikipedia.queryPages({
          titles: wikiBatch.join('|'),
          useIdsOrTitles: "titles",
          options: {
            prop: 'revisions|pageprops',
            rvprop: 'content|ids',
            rvslots: 'main'
          },
          method: 'POST'
        });

        if (pages) {
          for (const [title, pageData] of Object.entries(pages)) {
            if (pageData.missing) {
              continue; // דף לא קיים בויקיפדיה
            }

            if (pageData.revisions && pageData.revisions[0] && pageData.revisions[0].slots && pageData.revisions[0].slots.main) {
              wikipediaResults[title] = {
                text: pageData.revisions[0].slots.main['*'],
                revid: pageData.revisions[0].revid,
                title: title
              };
            }
          }
        }
      } catch (error) {
        logger.error(`שגיאה בטעינת קבוצה מויקיפדיה:`, error);
        // המשך עם הדפים שכן נטענו
      }
    }

    // שלב 2: עיבוד כל דף בקבוצה
    for (const title of titles) {
      try {
        const wikipediaData = wikipediaResults[title];

        if (!wikipediaData) {
          processLog.skipped.push({
            title,
            reason: "לא נמצא בויקיפדיה",
          });
          logger.info(`דף ${title}: דולג - לא נמצא בויקיפדיה`);
          continue;
        }

        const content = wikipediaData.text;

        // בדיקה נוספת של התוכן מויקיפדיה
        const wikipediaTemplateCheck = detectTemplateCategory(content);
        if (!wikipediaTemplateCheck) {
          processLog.skipped.push({
            title,
            reason: "לא נמצאו תבניות תרבות בתוכן הדף",
          });
          logger.info(`דף ${title}: דולג - לא נמצאו תבניות תרבות בתוכן הדף`);
          continue;
        }

        // בדיקת מילים בתוכן הדף
        const wordCheckResult = await checkWords(content);
        if (wordCheckResult) {
          console.log("Found problematic words:", wordCheckResult);
          processLog.skipped.push({
            title,
            reason: "נמצאו מילים בעייתיות בתוכן",
          });
          logger.info(
            `דף ${title}: דולג - נמצאו מילים בעייתיות`,
            wordCheckResult
          );
          continue;
        }

        // קביעת הסיווג לפי התבניות שנמצאו
        let classification;
        switch (wikipediaTemplateCheck) {
          case "sport":
            classification = "ספורט";
            break;
          case "music":
            classification = "מוזיקה";
            break;
          case "musicians":
            classification = "מוזיקאים";
            break;
          case "tv":
            classification = "טלוויזיה";
            break;
          case "actors":
            classification = "שחקנים";
            break;
          default:
            classification = null;
        }

        if (!classification) {
          processLog.skipped.push({
            title,
            reason: "לא נמצא סיווג מתאים",
          });
          logger.info(`דף ${title}: דולג - לא נמצא סיווג מתאים`);
          continue;
        }

        // הכנת האובייקט data עבור processWikiContent
        const processData = {
          currentPage: title,
          page: title,
          exist: true,
          bot: classification,
        };

        console.log(`מעבד דף: ${title} (סיווג: ${classification})`);
        const { text, summary } = await processWikiContent(
          wikipediaData,
          processData
        );

        // שמירה במכלול
        const { edit, error } = await hamichlol.edit({
          title: title,
          text,
          summary,
          tags: "פתיחת ערך חסום|auto-update",
        });

        if (edit) {
          processLog.processed.push({
            title,
            classification,
            revisionId: edit.newrevid,
          });
          console.log("\x1b[32m===edited!===\n" + JSON.stringify(edit) + "===edited===\x1b[0m");
          logger.info(`דף ${title} נשמר בהצלחה:`, edit);
        } else {
          logger.warn(`דף ${title} לא נערך - שגיאה`, error);
          processLog.errors.push({
            title,
            error: error || "שגיאה לא ידועה בעריכה",
          });
        }

        // המתנה קצרה בין עריכות
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        processLog.errors.push({
          title,
          error: error.message,
        });
        logger.error(`שגיאה בעיבוד דף ${title}:`, error);
      }
    }
  } catch (error) {
    logger.error("שגיאה בעיבוד קבוצה:", error);
    // הוסף את כל הדפים בקבוצה לשגיאות
    for (const title of titles) {
      if (!processLog.errors.some(e => e.title === title) &&
        !processLog.processed.some(p => p.title === title) &&
        !processLog.skipped.some(s => s.title === title)) {
        processLog.errors.push({
          title,
          error: "שגיאה כללית בעיבוד הקבוצה",
        });
      }
    }
  }
}

/**
 * יצירת לוג סופי ושמירתו במכלול
 * @param {Object} processLog - אובייקט הלוג של התהליך
 */
async function generateFinalLog(processLog) {
  const currentDate = new Date().toLocaleDateString("he-IL");
  const logTitle = `משתמש:${hamichlol.userName}/לוג עיבוד דפים לטיפול - ${currentDate}`;

  let logContent = `== לוג עיבוד דפים לטיפול במרחב הערכים - ${currentDate} ==\n\n`;
  logContent += `סה"כ דפים שנבדקו: ${processLog.total}\n`;
  logContent += `דפים שעובדו בהצלחה: ${processLog.processed.length}\n`;
  logContent += `דפים שדולגו: ${processLog.skipped.length}\n`;
  logContent += `דפים עם שגיאות: ${processLog.errors.length}\n\n`;
  logContent += "\n~~~~~";

  try {
    const logResult = await hamichlol.edit({
      title: logTitle,
      text: logContent,
      summary: `עדכון לוג עיבוד דפים לטיפול - ${processLog.total} דפים נבדקו`,
      createonly: false,
    });

    if (logResult.edit) {
      logger.info(`לוג נשמר בהצלחה: ${logTitle}`);
      console.log(`\x1b[32m=== סיכום התהליך ===\x1b[0m`);
      console.log(`סה"כ דפים שנבדקו: ${processLog.total}`);
      console.log(`דפים שעובדו בהצלחה: ${processLog.processed.length}`);
      console.log(`דפים שדולגו: ${processLog.skipped.length}`);
      console.log(`דפים עם שגיאות: ${processLog.errors.length}`);
      console.log(`\x1b[32m========\x1b[0m`);
    } else {
      logger.warn(`שגיאה בשמירת הלוג:`, logResult.error);
      // הדפסת הלוג לקונסול כגיבוי
      console.log("\n=== לוג (גיבוי) ===");
      console.log(logContent);
    }
    await hamichlol.edit({
      title: `u:${hamichlol.userName}/לוג עיבוד דפים לטיפול.json`,
      text: processLog,
      summary: `עדכון לוג עיבוד דפים לטיפול - ${processLog.total} דפים נבדקו`,
      createonly: false,
    });

  } catch (error) {
    logger.error("שגיאה בשמירת הלוג:", error);
    // הדפסת הלוג לקונסול כגיבוי
    console.log("\n=== לוג (גיבוי) ===");
    console.log(logContent);
  }
}

// הרצת הסקריפט
if (path.basename(import.meta.url) === path.basename(process.argv[1])) {
  processArticleMaintenancePages()
}

export default processArticleMaintenancePages;
