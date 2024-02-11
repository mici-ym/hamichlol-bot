import getRequestsInstance from "../requests/requests.js";
import fs from "fs";
const request = getRequestsInstance("https://www.hamichlol.org.il/w/api.php");

(async () => {
  const arr1 = [];
  const arrErr = [];
  const data = await request.query({
    options: {
      action: "query",
      format: "json",
      prop: "info",
      generator: "allpages",
      utf8: 1,
      gapnamespace: "1",
      gapminsize: "1",
      gapmaxsize: "1",
      gaplimit: "max",
    },
  });
  for (const i of data) {
    if (i.contentmodel === "flow-board" && !/\/|ארכיון/.test(i.title)) {
      const { flow } = await request.get(
        `action=flow&format=json&submodule=view-topiclist&page=${i.title}&utf8=1&vtltoconly=1&vtlformat=fixed-html`
      );
      try {
        console.log(
          i.title,
          flow["view-topiclist"]?.result.topiclist.roots.length
        );
        if (
          flow["view-topiclist"]?.result.topiclist.roots.length === 1 &&
          /השוואה|ויקיפדיה/.test(
            flow["view-topiclist"].result.topiclist.revisions[
              flow["view-topiclist"].result.topiclist.posts[
                flow["view-topiclist"].result.topiclist.roots[0]
              ][0]
            ].content.plaintext
          )
        ) {
          arr1.push(i.title);
          const dataFlow = await request.get(
            `action=flow&format=json&submodule=view-topic&page=נושא:${flow["view-topiclist"]?.result.topiclist.roots[0]}&utf8=1`
          );
          if (
            Object.values(dataFlow.flow["view-topic"]?.result.topic.posts)
              .length < 4
          ) {
            await request.delete(i.title, "מחיקת דפי זרימה מיותרים");
            continue;
          }
        }
        if (flow["view-topiclist"]?.result.topiclist.roots.length > 0) {
          const res = await request.move(
            i.title,
            `${i.title}/ארכיון`,
            "ארכוב דפי זרימה",
            { movetalk: false }
          );
          console.log(res);
          const edit = await request.edit({
            title: i.title,
            text: `{{תיבת ארכיון|[[/ארכיון|ארכיון]]}}`,
            summary: "ארכוב דפי זרימה",
            nocreate: false,
          });
          console.log(edit);
          if (edit.code === "no-direct-editing")
          logMessage(`${i.title} no-direct-editing`);
        } else if (
          flow["view-topiclist"].result.topiclist?.roots.length === 0
        ) {
          await request.delete(i.title, "מחיקת דפי זרימה ריקים");
          logMessage(`${i.title} deleted`);
          //.then((res) => {console.log(res)});
        }
      } catch (error) {
        console.error(error);
        arrErr.push(i.title);
        logMessage(`${i.title} ${error}`);
      }
    }
  }
})();

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFile(
    "C:\\Tacnot\\demopy\\ArchiveTtalkFlow.log",
    logMessage,
    (err) => {
      if (err) {
        console.error("Error writing to log file", err);
      }
    }
  );
}

logMessage("This is a log message!");
