import { Requests } from "../requests/requests.js";

async function testMaxStringLength() {
  const wikiRequest = new Requests("https://he.wikipedia.org/w/api.php");
  wikiRequest.withLogedIn = false;

  let testString = "a".repeat(50);
  let maxLength = 0;
  const increment = 8198; // מספר התווים שיש להוסיף בכל צעד

  while (true) {
    testString += "a".repeat(increment);
    try {
      const response = await wikiRequest.query({
        options: {
          list: "test", // שנה את הפרמטרים לפי הצורך
          prop: "info",
          titles: testString,
          // ניתן להוסיף פרמטרים נוספים כאן
        },
      });
      console.log(`ניסיון עם אורך מחרוזת ${testString.length} הצליח.`);
      maxLength = testString.length;
    } catch (error) {
      console.log(`ניסיון עם אורך מחרוזת ${testString.length} נכשל.`);
      break;
    }
  }

  console.log(`אורך המחרוזת המקסימלי שהשרת מקבל: ${maxLength}`);
}

testMaxStringLength();