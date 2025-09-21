#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * סקריפט לחילוץ שמות קבצי התמונות מתוכן קבצי ה-JSON
 * יוצר מערך משותף של כל שמות התמונות עם סיומת אבל ללא קידומת וללא כפילויות
 */

// נתיב לתיקית התמונות
const IMAGES_PATH = path.join(__dirname, '..', '..', 'images');

/**
 * פונקציה לקריאת ופרסינג של קובץ JSON
 * @param {string} filePath - נתיב הקובץ
 * @returns {Array} מערך של אובייקטים מקובץ ה-JSON
 */
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim()) {
            return []; // קובץ ריק
        }
        return JSON.parse(content);
    } catch (error) {
        console.warn(`⚠️  שגיאה בקריאת הקובץ ${filePath}: ${error.message}`);
        return [];
    }
}

/**
 * פונקציה לחילוץ שם הקובץ מה-title
 * @param {string} title - הכותרת שמכילה "קובץ:filename.ext"
 * @returns {string|null} שם הקובץ עם סיומת אבל ללא קידומת או null אם לא נמצא
 */
function extractImageFileName(title) {
    if (!title || typeof title !== 'string') {
        return null;
    }
    
    // הסרת הקידומת "קובץ:" בלבד - שומרים על הסיומת
    const withoutPrefix = title.replace(/^קובץ:/, '');
    
    if (!withoutPrefix) {
        return null;
    }
    
    return withoutPrefix;
}

/**
 * פונקציה לאיסוף כל קבצי ה-JSON מכל התיקיות
 * @param {string} dirPath - נתיב התיקייה
 * @returns {Array} מערך של נתיבי קבצי JSON
 */
function collectJsonFiles(dirPath) {
    const jsonFiles = [];
    
    function scanDirectory(currentPath) {
        try {
            const items = fs.readdirSync(currentPath, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);
                
                if (item.isDirectory()) {
                    // רקורסיה לתיקיות משנה
                    scanDirectory(fullPath);
                } else if (item.isFile() && item.name.endsWith('.json')) {
                    // הוספת קובץ JSON לרשימה
                    jsonFiles.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`שגיאה בתיקייה ${currentPath}:`, error.message);
        }
    }
    
    scanDirectory(dirPath);
    return jsonFiles;
}

/**
 * פונקציה לחילוץ כל שמות התמונות מכל קבצי ה-JSON
 * @param {Array} jsonFiles - מערך נתיבי קבצי JSON
 * @returns {Object} אובייקט עם מערך שמות התמונות וסטטיסטיקות
 */
function extractAllImageNames(jsonFiles) {
    const imageNames = new Set(); // שימוש ב-Set למניעת כפילויות
    const statistics = {
        totalJsonFiles: jsonFiles.length,
        processedFiles: 0,
        errorFiles: 0,
        totalEntries: 0,
        extractedNames: 0,
        skippedEntries: 0
    };
    
    console.log(`📂 מעבד ${jsonFiles.length} קבצי JSON...`);
    
    for (const jsonFile of jsonFiles) {
        try {
            const jsonData = readJsonFile(jsonFile);
            statistics.processedFiles++;
            
            if (Array.isArray(jsonData)) {
                statistics.totalEntries += jsonData.length;
                
                for (const item of jsonData) {
                    if (item && item.title) {
                        const imageName = extractImageFileName(item.title);
                        if (imageName) {
                            imageNames.add(imageName);
                            statistics.extractedNames++;
                        } else {
                            statistics.skippedEntries++;
                        }
                    } else {
                        statistics.skippedEntries++;
                    }
                }
            } else {
                console.warn(`⚠️  קובץ ${jsonFile} אינו מכיל מערך`);
                statistics.skippedEntries++;
            }
            
            // הדפסת התקדמות כל 100 קבצים
            if (statistics.processedFiles % 100 === 0) {
                console.log(`✅ עובד... ${statistics.processedFiles}/${jsonFiles.length} קבצים`);
            }
        } catch (error) {
            console.error(`❌ שגיאה בעיבוד ${jsonFile}:`, error.message);
            statistics.errorFiles++;
        }
    }
    
    return {
        imageNames: Array.from(imageNames).sort(),
        statistics
    };
}

/**
 * פונקציה ליצוא התוצאות לקבצים
 * @param {Array} imageNames - מערך שמות התמונות
 * @param {Object} statistics - סטטיסטיקות
 */
function exportResults(imageNames, statistics) {
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // יצירת קובץ JavaScript עם המערך
    const jsContent = `/**
 * מערך של כל שמות קבצי התמונות שחולצו מקבצי ה-JSON
 * נוצר אוטומטית בתאריך: ${new Date().toLocaleString('he-IL')}
 * סה"כ שמות תמונות: ${imageNames.length}
 * ללא כפילויות, ללא קידומת "קובץ:" אבל עם סיומת קובץ
 */

export const extractedImageNames = [
${imageNames.map(name => `  "${name}"`).join(',\n')}
];

export default extractedImageNames;

// לשימוש עם CommonJS:
// module.exports = extractedImageNames;
`;
    
    const jsPath = path.join(outputDir, 'extractedImageNames.js');
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log(`✅ קובץ JavaScript נוצר: ${jsPath}`);
    
    // יצירת קובץ טקסט פשוט
    const textContent = imageNames.join('\n');
    const textPath = path.join(outputDir, 'extracted_image_names.txt');
    fs.writeFileSync(textPath, textContent, 'utf8');
    console.log(`✅ קובץ טקסט נוצר: ${textPath}`);
    
    // יצירת קובץ JSON עם מידע מפורט
    const jsonData = {
        generatedAt: new Date().toISOString(),
        statistics,
        imageNames
    };
    const jsonPath = path.join(outputDir, 'extracted_image_names.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`✅ קובץ JSON נוצר: ${jsonPath}`);
}

// הרצת הסקריפט
console.log('🔍 מתחיל חילוץ שמות תמונות מקבצי JSON...');

if (!fs.existsSync(IMAGES_PATH)) {
    console.error(`❌ התיקייה לא נמצאה: ${IMAGES_PATH}`);
    process.exit(1);
}

// איסוף כל קבצי ה-JSON
const jsonFiles = collectJsonFiles(IMAGES_PATH);
console.log(`📁 נמצאו ${jsonFiles.length} קבצי JSON`);

if (jsonFiles.length === 0) {
    console.error('❌ לא נמצאו קבצי JSON');
    process.exit(1);
}

// חילוץ שמות התמונות
const { imageNames, statistics } = extractAllImageNames(jsonFiles);

// הדפסת סטטיסטיקות
console.log('\n📊 סיכום:');
console.log(`📁 סה"כ קבצי JSON: ${statistics.totalJsonFiles}`);
console.log(`✅ קבצים שעובדו בהצלחה: ${statistics.processedFiles}`);
console.log(`❌ קבצים עם שגיאות: ${statistics.errorFiles}`);
console.log(`📄 סה"כ רשומות שנמצאו: ${statistics.totalEntries}`);
console.log(`🖼️  שמות תמונות שחולצו: ${statistics.extractedNames}`);
console.log(`⏭️  רשומות שדולגו: ${statistics.skippedEntries}`);
console.log(`🎯 שמות תמונות ייחודיים (לאחר הסרת כפילויות): ${imageNames.length}`);

// ייצוא התוצאות
exportResults(imageNames, statistics);

console.log('\n✅ הסקריפט הושלם בהצלחה!');
console.log('📁 קבצי הפלט נמצאים בתיקיית output/');

export { collectJsonFiles, extractImageFileName, extractAllImageNames };