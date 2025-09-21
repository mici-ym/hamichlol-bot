#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * סקריפט לאיסוף כל שמות הקבצים מתיקית התמונות
 * יוצר מערך משותף עם כל שמות הקבצים ללא קידומת הקובץ
 */

// נתיב לתיקית התמונות
const IMAGES_BASE_PATH = path.join(__dirname, '..', '..', 'images');

/**
 * פונקציה רקורסיבית לאיסוף כל הקבצים מתיקייה
 * @param {string} dirPath - נתיב התיקייה
 * @param {Array} allFiles - מערך לאיסוף כל הקבצים
 */
function collectFilesFromDirectory(dirPath, allFiles = []) {
    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            
            if (item.isDirectory()) {
                // רקורסיה לתיקיות משנה
                collectFilesFromDirectory(fullPath, allFiles);
            } else if (item.isFile()) {
                // הוספת הקובץ לרשימה
                allFiles.push({
                    fileName: item.name,
                    fileNameWithoutExtension: path.parse(item.name).name,
                    directory: path.relative(IMAGES_BASE_PATH, dirPath),
                    fullPath: fullPath
                });
            }
        }
    } catch (error) {
        console.error(`שגיאה בקריאת התיקייה ${dirPath}:`, error.message);
    }
    
    return allFiles;
}

/**
 * פונקציה לחילוץ כל שמות הקבצים ללא קידומת
 * @param {Array} allFiles - מערך כל הקבצים
 * @returns {Array} מערך של שמות קבצים ללא קידומת
 */
function extractFileNamesWithoutExtensions(allFiles) {
    return allFiles.map(file => file.fileNameWithoutExtension);
}

/**
 * פונקציה ליצירת סטטיסטיקות
 * @param {Array} allFiles - מערך כל הקבצים
 */
function generateStatistics(allFiles) {
    const directoryCounts = {};
    const extensionCounts = {};
    
    allFiles.forEach(file => {
        // ספירה לפי תיקיות
        const dir = file.directory || 'root';
        directoryCounts[dir] = (directoryCounts[dir] || 0) + 1;
        
        // ספירה לפי סוגי קבצים
        const ext = path.extname(file.fileName) || 'no extension';
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    });
    
    return {
        totalFiles: allFiles.length,
        directoryCounts,
        extensionCounts
    };
}

/**
 * פונקציה ליצוא התוצאות לקובץ JSON
 * @param {Object} data - הנתונים לייצוא
 * @param {string} outputPath - נתיב הקובץ הפלט
 */
function exportToJson(data, outputPath) {
    try {
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ הנתונים נשמרו בהצלחה ב: ${outputPath}`);
    } catch (error) {
        console.error(`❌ שגיאה בשמירת הקובץ ${outputPath}:`, error.message);
    }
}

/**
 * פונקציה ליצוא רשימת שמות הקבצים לקובץ טקסט
 * @param {Array} fileNames - מערך שמות הקבצים
 * @param {string} outputPath - נתיב הקובץ הפלט
 */
function exportToTextFile(fileNames, outputPath) {
    try {
        const content = fileNames.join('\n');
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`✅ רשימת שמות הקבצים נשמרה בהצלחה ב: ${outputPath}`);
    } catch (error) {
        console.error(`❌ שגיאה בשמירת הקובץ ${outputPath}:`, error.message);
    }
}

// ביצוע הסקריפט
function main() {
    console.log('🔍 מתחיל איסוף קבצים מתיקית התמונות...');
    console.log(`📁 נתיב בסיס: ${IMAGES_BASE_PATH}`);
    
    // בדיקה שהתיקייה קיימת
    if (!fs.existsSync(IMAGES_BASE_PATH)) {
        console.error(`❌ התיקייה לא נמצאה: ${IMAGES_BASE_PATH}`);
        process.exit(1);
    }
    
    // איסוף כל הקבצים
    const allFiles = collectFilesFromDirectory(IMAGES_BASE_PATH);
    
    // חילוץ שמות הקבצים ללא קידומת
    const fileNamesWithoutExtensions = extractFileNamesWithoutExtensions(allFiles);
    
    // יצירת סטטיסטיקות
    const statistics = generateStatistics(allFiles);
    
    // הכנת הנתונים לייצוא
    const outputData = {
        generatedAt: new Date().toISOString(),
        statistics,
        allFiles,
        fileNamesWithoutExtensions
    };
    
    // נתיבי הפלט
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const jsonOutputPath = path.join(outputDir, 'collected_image_files.json');
    const textOutputPath = path.join(outputDir, 'filenames_without_extensions.txt');
    
    // ייצוא הנתונים
    exportToJson(outputData, jsonOutputPath);
    exportToTextFile(fileNamesWithoutExtensions, textOutputPath);
    
    // הדפסת סיכום
    console.log('\n📊 סיכום:');
    console.log(`📁 סה"כ קבצים: ${statistics.totalFiles}`);
    console.log(`🗂️ תיקיות שנסרקו: ${Object.keys(statistics.directoryCounts).length}`);
    console.log(`📄 סוגי קבצים: ${Object.keys(statistics.extensionCounts).join(', ')}`);
    
    console.log('\n📋 פירוט לפי תיקיות:');
    Object.entries(statistics.directoryCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([dir, count]) => {
            console.log(`  📁 ${dir}: ${count} קבצים`);
        });
    
    console.log('\n📄 פירוט לפי סוגי קבצים:');
    Object.entries(statistics.extensionCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([ext, count]) => {
            console.log(`  ${ext}: ${count} קבצים`);
        });
    
    console.log('\n✅ הסקריפט הושלם בהצלחה!');
    console.log(`📥 מערך שמות הקבצים זמין במשתנה: fileNamesWithoutExtensions`);
    console.log(`📄 קבצי הפלט נמצאים בתיקייה: ${outputDir}`);
}

// הרצת הסקריפט
main();

// ייצוא לשימוש כמודול
export {
    collectFilesFromDirectory,
    extractFileNamesWithoutExtensions,
    generateStatistics,
    main
};