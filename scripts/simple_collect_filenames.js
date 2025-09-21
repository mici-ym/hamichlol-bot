#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * סקריפט פשוט לאיסוף שמות קבצים ללא קידומת מתיקית התמונות
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

// הרצת הסקריפט
console.log('🔍 איסוף שמות קבצים מתיקית התמונות...');

if (!fs.existsSync(IMAGES_PATH)) {
    console.error(`❌ התיקייה לא נמצאה: ${IMAGES_PATH}`);
    process.exit(1);
}

const allFileNames = collectAllFileNames(IMAGES_PATH);

console.log(`✅ נמצאו ${allFileNames.length} קבצים`);
console.log('\n📋 המערך המשותף של שמות הקבצים:');

// הדפסת המערך כ-JavaScript array
console.log('const allImageFileNames = [');
allFileNames.forEach((name, index) => {
    const comma = index < allFileNames.length - 1 ? ',' : '';
    console.log(`  "${name}"${comma}`);
});
console.log('];');

console.log(`\n📊 סה"כ ${allFileNames.length} שמות קבצים נאספו.`);

export { collectAllFileNames };