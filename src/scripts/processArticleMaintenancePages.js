import { getRequestsInstance } from "../requests/requests.js";
import { detectTemplateCategory } from "../import/bot_pages.js";
import botPages from "../import/bot_pages.js";
import checkWords from "../import/check/filter.js";
import { checkLocalEdits } from "../import/check/check-local.js";
import logger from "../logger.js";

// הגדרת לקוחות למכלול ולויקיפדיה
const hamichlol = getRequestsInstance("hamichlol");
const wikipedia = getRequestsInstance("wiki");
wikipedia.withLogedIn = false;

// פונקציה ליצירת דף מילוני מטקסט ויקיפדיה
const createTionaryPage = botPages();

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
    logger.info("מתחיל עיבוד דפים עם תבנית 'דף לטיפול במרחב הערכים'");

    // שלב 1: איתור דפים עם התבנית
    logger.info("מחפש דפים עם התבנית...");
    const pagesWithTemplate = await hamichlol.embeddedin({
      title: "תבנית:דף לטיפול במרחב הערכים",
      options: {
        einamespace: 0, // רק מרחב הערכים
        eilimit: "max",
      },
    });

    if (!pagesWithTemplate || Object.keys(pagesWithTemplate).length === 0) {
      logger.info("לא נמצאו דפים עם התבנית");
      return;
    }

    processLog.total = Object.keys(pagesWithTemplate).length;
    logger.info(`נמצאו ${processLog.total} דפים עם התבנית`);

    // שלב 2: בדיקת כל דף
    for (const [pageId, pageData] of Object.entries(pagesWithTemplate)) {
      const title = pageData.title;
      logger.info(`מעבד דף: ${title}`);

      //בדיקת מילים
      try {
        // בדיקה האם הדף כבר נערך מקומית
        const localEditCheck = await checkLocalEdits(title);
        if (localEditCheck && localEditCheck !== false) {
          processLog.skipped.push({
            title,
            reason: `נערך מקומית: ${localEditCheck}`,
          });
          logger.info(`דף ${title} דולג - ${localEditCheck}`);
          continue;
        }

        // שלב 3: טעינת טקסט מויקיפדיה
        logger.info(`טוען תוכן מויקיפדיה עבור: ${title}`);
        const wikipediaData = await wikipedia.queryPages({
          titles: title,
          options: {
            prop: "revisions|prop",
            rvprop: "content",
            rvslots: "main",
            prop: "wikibase-item|defaultsort",
          },
          useIdsOrTitles: "titles",
        });

        if (!wikipediaData[title] || !wikipediaData[title].revisions) {
          processLog.skipped.push({
            title,
            reason: "לא נמצא בויקיפדיה",
          });
          logger.info(`דף ${title} דולג - לא נמצא בויקיפדיה`);
          continue;
        }

        const wikipediaContent =
          wikipediaData[title].revisions[0].slots.main.content;

        // בדיקה נוספת של התוכן מויקיפדיה
        const wikipediaTemplateCheck = detectTemplateCategory(wikipediaContent);
        if (!wikipediaTemplateCheck) {
          processLog.skipped.push({
            title,
            reason: "לא נמצאו תבניות מסיווגות בתוכן הויקיפדיה",
          });
          logger.info(`דף ${title} דולג - לא נמצאו תבניות מסיווגות בויקיפדיה`);
          continue;
        }

        // בדיקת מילים בתוכן הויקיפדיה
        const wordCheckResult = checkWords(wikipediaContent);
        if (wordCheckResult) {
          processLog.skipped.push({
            title,
            reason: "נמצאו מילים בעייתיות בתוכן הויקיפדיה",
          });
          logger.info(
            `דף ${title} דולג - נמצאו מילים בעייתיות`,
            wordCheckResult
          );
          continue;
        }

        // שלב 4: יצירת דף מילוני
        logger.info(`יוצר דף מילוני עבור: ${title}`);

        // הכנת האובייקט data עבור createTionaryPage
        const dataForTionary = {
          text: wikipediaContent,
          properties: wikipediaData[title].properties, // ניתן להוסיף properties נוספות אם נדרש
        };

        // קביעת הסיווג לפי התבניות שנמצאו
        let classification;
        if (Array.isArray(wikipediaTemplateCheck)) {
          // אם נמצאו מספר קטגוריות, נבחר את הראשונה
          const firstCategory = wikipediaTemplateCheck[0];
          if (
            firstCategory.includes("אישיות כדורגל") ||
            firstCategory.includes("ספורטאי")
          ) {
            classification = "ספורט";
          } else if (
            firstCategory.includes("מוזיקאי") ||
            firstCategory.includes("אלבום")
          ) {
            classification = "מוזיקה";
          } else if (
            firstCategory.includes("סדרת סרטים") ||
            firstCategory.includes("דמות בדיונית")
          ) {
            classification = "טלוויזיה וקולנוע";
          } else {
            classification = "כללי";
          }
        } else {
          classification = "כללי";
        }

        const processedContent = createTionaryPage(
          dataForTionary,
          classification
        );

        // שלב 5: שמירה במכלול
        logger.info(`שומר דף מילוני: ${title}`);
        const editResult = await hamichlol.edit({
          title: title,
          text: processedContent,
          summary: `המרה לערך מילוני מתוכן ויקיפדיה (${classification})`,
          tags: "פתיחת ערך חסום",
        });

        if (editResult.edit) {
          processLog.processed.push({
            title,
            classification,
            revisionId: editResult.edit.newrevid,
          });
          logger.info(
            `דף ${title} עובד בהצלחה - revision ${editResult.edit.newrevid}`
          );
        } else {
          throw new Error("שגיאה בעריכת הדף");
        }
      } catch (error) {
        processLog.errors.push({
          title,
          error: error.message,
        });
        logger.error(`שגיאה בעיבוד דף ${title}:`, error);
      }
    }

    // שלב 6: יצירת לוג סופי
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
 * יצירת לוג סופי ושמירתו במכלול
 * @param {Object} processLog - אובייקט הלוג של התהליך
 */
async function generateFinalLog(processLog) {
  const currentDate = new Date().toLocaleDateString("he-IL");
  const logTitle = `משתמש:המכלולבוט/לוג עיבוד דפים לטיפול - ${currentDate}`;

  let logContent = `== לוג עיבוד דפים לטיפול במרחב הערכים - ${currentDate} ==\n\n`;
  logContent += `'''סה"כ דפים שנבדקו:''' ${processLog.total}\n`;
  logContent += `'''דפים שעובדו בהצלחה:''' ${processLog.processed.length}\n`;
  logContent += `'''דפים שנדלגו:''' ${processLog.skipped.length}\n`;
  logContent += `'''דפים עם שגיאות:''' ${processLog.errors.length}\n\n`;

  // רשימת דפים שעובדו בהצלחה
  if (processLog.processed.length > 0) {
    logContent += `=== דפים שעובדו בהצלחה (${processLog.processed.length}) ===\n`;
    for (const item of processLog.processed) {
      logContent += `# [[${item.title}]] - סיווג: ${item.classification} (גרסה ${item.revisionId})\n`;
    }
    logContent += `\n`;
  }

  // רשימת דפים שנדלגו
  if (processLog.skipped.length > 0) {
    logContent += `=== דפים שנדלגו (${processLog.skipped.length}) ===\n`;
    for (const item of processLog.skipped) {
      logContent += `# [[${item.title}]] - סיבה: ${item.reason}\n`;
    }
    logContent += `\n`;
  }

  // רשימת שגיאות
  if (processLog.errors.length > 0) {
    logContent += `=== דפים עם שגיאות (${processLog.errors.length}) ===\n`;
    for (const item of processLog.errors) {
      logContent += `# [[${item.title}]] - שגיאה: ${item.error}\n`;
    }
    logContent += `\n`;
  }

  logContent += `\nלוג נוצר אוטומטית על ידי [[משתמש:המכלולבוט]] ב-${new Date().toLocaleString(
    "he-IL"
  )}\n`;
  logContent += `[[קטגוריה:לוגים של המכלולבוט]]`;

  try {
    const logResult = await hamichlol.edit({
      title: logTitle,
      text: logContent,
      summary: `עדכון לוג עיבוד דפים לטיפול - ${processLog.total} דפים נבדקו`,
      createonly: false,
    });

    if (logResult.edit) {
      logger.info(`לוג נשמר בהצלחה: ${logTitle}`);
      console.log(`\n=== סיכום התהליך ===`);
      console.log(`סה"כ דפים שנבדקו: ${processLog.total}`);
      console.log(`דפים שעובדו בהצלחה: ${processLog.processed.length}`);
      console.log(`דפים שנדלגו: ${processLog.skipped.length}`);
      console.log(`דפים עם שגיאות: ${processLog.errors.length}`);
      console.log(
        `לוג מפורט: https://www.hamichlol.org.il/index.php?title=${encodeURIComponent(
          logTitle
        )}`
      );
    }
  } catch (error) {
    logger.error("שגיאה בשמירת הלוג:", error);
    // הדפסת הלוג לקונסול כגיבוי
    console.log("\n=== לוג (גיבוי) ===");
    console.log(logContent);
  }
}

// הרצת הסקריפט
if (import.meta.url === `file://${process.argv[1]}`) {
  processArticleMaintenancePages()
    .then(() => {
      logger.info("הסקריפט הסתיים בהצלחה");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("הסקריפט נכשל:", error);
      process.exit(1);
    });
}

export default processArticleMaintenancePages;
