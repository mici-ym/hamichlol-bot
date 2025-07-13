import { getRequestsInstance } from "../requests/requests.js";

async function sendWeeklyLockedPagesCount() {
    const api = getRequestsInstance();
    // קבל את כמות הדפים שננעלו בשבוע האחרון
    const logList = await api.query(
        {
            options: {
                prop: "info|categories",
                generator: "recentchanges",
                formatversion: "2",
                inprop: "allevel",
                cllimit: "max",
                clcategories: "קטגוריה:המכלול: ערכים מילוניים",
                grcnamespace: "0",
                grctag: "פתיחת ערך חסום",
                grcstart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                grcdir: "newer",
                grclimit: "max",
                grctype: "edit",
            }
        }
    )
    const count = Object.values(logList).reduce((acc, page) => {
        const level = page.allevel;
        if (level && (level === "edit-semi" || level === "edit-full")) {
            acc++;
        }
        return acc;
    }, 0);

    // בנה את ההודעה ל-Google Chat
    const message = {
        text: `עדכון שבועי:\nבשבוע האחרון נפתחו כ־${count} דפים.`
    };

    // שלח את ההודעה ל-webhook
    fetch("https://chat.googleapis.com/v1/spaces/AAAAlz23pH0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=4a_MFH8Tb7mhioHlEkvUDtcPIpmiaohDbs8_bfPyuyc", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error sending message: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Message sent successfully:", data);
        })
        .catch(error => {
            console.error("Error sending message:", error);
        }
        );
}

// הרץ את הפונקציה
sendWeeklyLockedPagesCount().catch(console.error);
