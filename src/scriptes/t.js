import Categorytree from "./categorytree.js";

const categorytree = new Categorytree("https://www.hamichlol.org.il");
console.log(new Date())
categorytree.createCategoryTree({ categoryName: 'תנ"ך', conditionForCategory: checkCategory, saveToFile: true });
console.log(new Date())

function checkCategory(category) {
    const arr = ['תבניות תנ"ך', 'בעלי חיים בתנ"ך', "הטקסט המקראי", "המקרא בתרבות ובאמנות", "חקר המקרא", "לשון המקרא", 'מהדורות ותרגומים של התנ"ך', 'מהדורות של התנ"ך', 'עצים בתנ"ך', "פרשנות המקרא", "צמחי"]
    return arr.includes(`קטגוריה:${category}`)
}