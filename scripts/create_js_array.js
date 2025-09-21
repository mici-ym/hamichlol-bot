#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * סקריפט ליצירת קובץ JavaScript עם מערך של שמות הקבצים
 */

// נתיב לתיקית התמונות
const IMAGES_PATH = path.join(__dirname, '..', '..', 'images');

/**
 * פונקציה לאיסוף כל שמות הקבצים ללא קידומת
 * @param {string} dirPath - נתיב התיקייה
 * @returns {Array} מערך של שמות קבצים ללא קידומת
 */
function collectAllFileNames(dirPath) {
    const fileNames = [];
    
    function scanDirectory(currentPath) {
        try {
            const items = fs.readdirSync(currentPath, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);
                
                if (item.isDirectory()) {
                    // רקורסיה לתיקיות משנה
                    scanDirectory(fullPath);
                } else if (item.isFile()) {
                    // הוסף את שם הקובץ ללא קידומת
                    const nameWithoutExtension = path.parse(item.name).name;
                    fileNames.push(nameWithoutExtension);
                }
            }
        } catch (error) {
            console.error(`שגיאה בתיקייה ${currentPath}:`, error.message);
        }
    }
    
    scanDirectory(dirPath);
    return fileNames;
}

/**
 * פונקציה ליצירת קובץ JavaScript עם המערך
 * @param {Array} fileNames - מערך שמות הקבצים
 * @param {string} outputPath - נתיב קובץ הפלט
 */
function createJavaScriptArrayFile(fileNames, outputPath) {
    const jsContent = `/**
 * מערך של כל שמות הקבצים מתיקית התמונות
 * נוצר אוטומטית בתאריך: ${new Date().toLocaleString('he-IL')}
 * סה"כ קבצים: ${fileNames.length}
 */

export const allImageFileNames = [
${fileNames.map(name => `  "${name}"`).join(',\n')}
];

export default allImageFileNames;

// לשימוש עם CommonJS:
// module.exports = allImageFileNames;
`;

    try {
        fs.writeFileSync(outputPath, jsContent, 'utf8');
        console.log(`✅ קובץ JavaScript נוצר בהצלחה: ${outputPath}`);
    } catch (error) {
        console.error(`❌ שגיאה ביצירת קובץ JavaScript: ${error.message}`);
    }
}

// הרצת הסקריפט
console.log('🔍 יוצר קובץ JavaScript עם מערך שמות הקבצים...');

if (!fs.existsSync(IMAGES_PATH)) {
    console.error(`❌ התיקייה לא נמצאה: ${IMAGES_PATH}`);
    process.exit(1);
}

const allFileNames = collectAllFileNames(IMAGES_PATH);

// יצירת תיקיית פלט אם לא קיימת
const outputDir = path.join(__dirname, '..', 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const jsOutputPath = path.join(outputDir, 'imageFileNames.js');
createJavaScriptArrayFile(allFileNames, jsOutputPath);

console.log(`\n📊 נוצר מערך עם ${allFileNames.length} שמות קבצים`);
console.log(`📁 הקובץ נשמר ב: ${jsOutputPath}`);
console.log(`\n📖 דוגמה לשימוש:`);
console.log(`import { allImageFileNames } from './output/imageFileNames.js';`);
console.log(`console.log('סה"כ קבצים:', allImageFileNames.length);`);

export { collectAllFileNames, createJavaScriptArrayFile };