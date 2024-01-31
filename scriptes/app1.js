import fetch from "node-fetch";
import { extractCookie } from "./utils/cookie.js";
import Word_list from "./Word_list.js";
/**
 * @param {string} userName
 * @param {string} password
 */
const userName = process.env.USER;
const password = process.env.PASSWORD;

let cookie = "";
let isLogedIn = false;
let csrfToken;

/**
 * @param {number} length
 */
let arrayLength;
let length;
let numPages = 0;
let numEdits = 0;
let numCinun = 0;
let numNoSport = 0;
let numError = 0;

/**
 *
 * @param {string} type
 * @returns {Promise<boolean>}
 */
async function getToken(type = "csrf") {
  const res = await fetch(
    `https://www.hamichlol.org.il/w/api.php?action=query&format=json&meta=tokens&type=${type}`,
    {
      headers: {
        cookie: cookie || "",
      },
    }
  );
  const jsonRes = await res.json();
  if (res.headers.raw()["set-cookie"]) {
    cookie = extractCookie(res.headers.raw()["set-cookie"]);
  }
  if (jsonRes.query.tokens.csrftoken) {
    csrfToken = jsonRes.query.tokens.csrftoken;
  }
  return jsonRes.query.tokens;
}

/**
 *
 * @param {string} userName
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function login(userName, password) {
  if (!userName || !password) {
    throw new Error("you dinwt pass your user name or your password");
  }
  const { logintoken: lgtoken } = await getToken("login");
  const url = `https://www.hamichlol.org.il/w/api.php`;
  const loginParams = {
    action: "login",
    lgname: userName,
    lgpassword: password,
    lgtoken,
  };
  const res = await fetch(url, {
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "node-fetch mw-api-node-client",
      cookie: cookie,
    },
    method: "POST",
    credentials: "include",
    body: new URLSearchParams({ format: "json", utf8: 1, ...loginParams }),
  });
  const { login } = await res.json();
  console.log(login);
  if (!login.result || login.result !== "Success") {
    isLogedIn = false;
    return false;
  }
  cookie = extractCookie(res.headers.raw()["set-cookie"]);
  isLogedIn = true;
  return true;
}
export function get1() {
  if (!isLogedIn) {
    login(userName, password).then(() => getToken().then(() => getList()));
  } else {
    getList();
  }
}

async function getList() {
  const urlList =
    "https://www.hamichlol.org.il/w/api.php?action=query&format=json&list=categorymembers&utf8=1&cmtitle=קטגוריה:דפים_לטיפול_תרבות/ספורט&cmtype=page&cmstartsortkeyprefix=אליפות&cmlimit=100";
  const res = await fetch(urlList);
  const data = await res.json();
  const array = data.query.categorymembers;
  arrayLength = array.length;
  length = array.length;
  console.log(length);
  for (const i in array) {
    getTextWiki(array[i].title);
  }
}

/**
 *
 * @param {string} title
 */
async function getTextWiki(title) {
  const urlWiki = `https://import.hamichlol.org.il/?action=parse&page=${title}&format=json&prop=wikitext|revid|properties&origin=*`;
  const res = await fetch(urlWiki);
  const data = await res.json();
  try {
    const girsa = data.parse.revid;
    const parit = getProperties(data);
    const summary = `עדכון מוויקיפדיה גרסה ${girsa}, בוט ספורט`;
    let text = getPageText(data.parse.wikitext["*"]);
    text = removePhotos(text);
    text = `${text}\n{{בוט ספורט}}\n{{מיון ויקיפדיה|דף=${title}|גרסה=${girsa}|פריט=${parit}}}`;
    let cinun = checkWords(text);
    let sport = await checkCategories(text);
    if (cinun && sport) {
      edit({ title, text, summary });
      console.log(title);
    } else if (!cinun) {
      numCinun++;
      length--;
      console.erorr(title + "- sinun");
    } else if (!sport) {
      numNoSport++;
      length--;
      console.erorr(title + "- noSport");
    }
  } catch (error) {
    console.error(title);
    console.error(error);
    numError++;
    length--;
  }
}

/**
 *
 * @param {object} param
 * @param {string} param.title
 * @param {string} param.text
 * @param {string} param.summary
 * @param {string} param.section
 * @param {string} param.sectiontitle
 * @returns {Promise<object}
 */
async function edit({
  title,
  text,
  summary,
  section: section,
  sectiontitle: sectiontitle,
}) {
  if (!title) {
    throw new Error(
      "you didn't pass the details of the article you want to edit"
    );
  }
  if (!isLogedIn) {
    await login(userName, password);
  }
  const editParams = {
    action: "edit",
    title: title,
    text: text,
    summary: summary || "",
    bot: 1,
    section,
    sectiontitle,
    token: csrfToken,
  };
  if (!section) {
    delete editParams.section;
  }
  if (!sectiontitle) {
    delete editParams.sectiontitle;
  }
  const url = `https://www.hamichlol.org.il/w/api.php`;
  const res = await fetch(url, {
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "node-fetch mw-api-node-client",
      cookie: cookie,
    },
    method: "POST",
    credentials: "include",
    body: new URLSearchParams({ format: "json", utf8: 1, ...editParams }),
  });
  const data = await res.json();
  numPages++;
  console.log(numPages);
  if (data.edit) {
    numEdits++;
  } else {
    numError++;
  }
  if (numPages === length) {
    console.log("stop!");
    log();
  }
  console.log(data);
  return edit?.result;
}

async function logout() {
  const logOutParams = {
    action: "logout",
    token: csrfToken,
  };
  const url = `https://www.hamichlol.org.il/w/api.php`;
  const res = await fetch(url, {
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "node-fetch mw-api-node-client",
      cookie: cookie,
    },
    method: "POST",
    credentials: "include",
    body: new URLSearchParams({ format: "json", utf8: 1, ...logOutParams }),
  });
  const data = res.json();
  if (data) {
    console.log(data);
    console.log("יציאה!");
  }
}

/**
 *
 * @param {String} text
 * @returns {Promise<string>}
 */
function getPageText(text) {
  const regex1 = /==.*==/g;
  const regex2 = "\n\n";
  const regex3 = /\[\[קטגוריה:[^\]]*?\]\]/g;
  const regex4 = /{{מיון רגיל:.+}}/;
  let textList;
  let categoriesToAdd;
  let defaultsortToAdd;
  let newText;
  let first;
  textList = text.split(regex1);
  if (textList.length < 3) {
    textList = text.split(regex2);
    first = textList[0];
  } else {
    first = textList[0];
  }
  categoriesToAdd = text.match(regex3);
  defaultsortToAdd = text.match(regex4);
  if (defaultsortToAdd) {
    newText = `${first}\n${defaultsortToAdd.join()}\n${categoriesToAdd.join(
      "\n"
    )}`;
  } else {
    newText = `${first}\n${categoriesToAdd.join("\n")}`;
  }
  return newText;
}

/**
 *
 * @param {string} text
 */
export function removePhotos(text) {
  const regex1 = /(?<!סמל ?= ?)\[\[קובץ:.+\]\]\n?/g;
  const regex2 = /\|\s?תמונה.+\n/g;
  const regex3 = /\|\s?כיתוב\s?=.+\n/;
  let textWithoutImages = text
    .replace(regex1, "")
    .replace(regex2, "")
    .replace(regex3, "");
  return textWithoutImages;
}

/**
 *
 * @param {string} text
 * @returns {boolean}
 */
export function checkWords(text) {
  const test = Word_list.test(text);
  if (!test) {
    return true;
  } else {
    return false;
  }
}

/**
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export function checkCategories(text) {
  const chess = /שחמט/.test(text);
  if (chess) {
    return false;
  } else {
    const sport = ListOfCategories.test(text);
    if (sport) {
      return true;
    } else {
      return false;
    }
  }
}

/**
 *
 * @param {object} data
 * @returns {string}
 */
function getProperties(data) {
  var parit = " ";
  if (!data.parse.properties[0]) {
    parit = " ";
  } else if (data.parse.properties[0]["name"] == "wikibase_item") {
    parit = data.parse.properties[0]["*"];
  } else if (
    data.parse.properties[0]["name"] != "wikibase_item" &&
    data.parse.properties.length <= 1
  ) {
    parit = " ";
  } else if (
    data.parse.properties[0]["name"] != "wikibase_item" &&
    data.parse.properties.length > 1
  ) {
    for (let pa = 0; pa < data.parse.properties.length; pa++) {
      if (data.parse.properties[pa]["name"] == "wikibase_item") {
        parit = data.parse.properties[pa]["*"];
      } else continue;
    }
  }
  return parit;
}

function log() {
  const sectiontitle = `דו"ח ריצה {{ס:#זמןמ:xhxjj xjx}} {{ס:#זמןמ:d-m-y}}`;
  const tochen = `התקבלו ${arrayLength} דפים, מתוכם נפתחו ${numEdits}. ב-${numCinun} נמצאו מילים בעייתיות, ב-${numNoSport} לא נמצאה תבנית מתאימה, ${numError} לא נערכו בשל תקלה. [https://www.hamichlol.org.il/w/index.php?target=מוטי+בוט&namespace=all&tagfilter=פתיחת+ערך+חסום&start={{ס:#זמןמ:Y-m-d}}&end={{ס:#זמןמ:Y-m-d}}&limit=${numEdits}&title=מיוחד:תרומות רשימת הדפים]. ~~~~`;
  edit({
    title: "משתמש:מוטי בוט/פתיחת ערכים/דוחות",
    text: tochen,
    summary: "לוג ריצה",
    section: "new",
    sectiontitle: sectiontitle,
  }).then(() => logout());
}

const ListOfCategories =
  /{{אישיות כדורגל|{{אישיות בייסבול|{{אישיות כדורגל2|{{אישיות כדוריד|{{אישיות כדורסל|{{אישיות םוטבול|{{אמן לחימה|{{טניסאי|{{מתאבק|נהג מרוצים|{{ספורטאי|{{פרופילי ספורטאים}}|{{רוכב גרנד פרי|{{אולימפיאדה|{{משחק ספורט|{{קבוצת הוקי קרח|{{קבוצת כדוריד|{{קבוצת כדורעף|{{מרוץ אופניים|{{משחק כדורגל|{{נבחרת|{{נבחרת במונדיאל|{{נבחרת טניס|{{נבחרת לאומית|{{סופרבול|{{פדרציית ספורט|{{קבוצת בייסבול|{{קבוצת כדורגל|{{קבוצת כדורסל|{{קבוצת פוטבול|{{תחרות|{{מדינה במשחקים האולימפיים|{{אולימפיאדות}}|{{רוכב אופניים|{{ליגה|{{אליפויות|{{אליפות|{{עונה בספורט|{{טורניר|קטגוריה:אליפו/;

get1();
