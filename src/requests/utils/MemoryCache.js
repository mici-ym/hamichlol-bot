/**
 * מחלקה לניהול מטמון בזיכרון
 */
class MemoryCache {
  /**
   * יוצר מופע חדש של מטמון בזיכרון
   * @param {Object} options - אפשרויות המטמון
   * @param {boolean} [options.enabled=true] - האם המטמון מופעל
   * @param {number} [options.ttl=3600000] - זמן חיים של פריט במטמון במילישניות (ברירת מחדל: שעה)
   * @param {number} [options.maxSize=1000] - מספר מקסימלי של פריטים במטמון
   */
  constructor(options = {}) {
    this.options = {
      enabled: true,
      ttl: 3600000, // שעה במילישניות
      maxSize: 1000,
      ...options
    };
    
    // אתחול המטמון כ-Map
    this.cache = new Map();
    
    // סטטיסטיקות מטמון
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0
    };
  }

  /**
   * יוצר מפתח מטמון מתוך שם מתודה ופרמטרים
   * @param {string} method - שם המתודה
   * @param {Object} params - הפרמטרים
   * @returns {string} מפתח המטמון
   */
  makeKey(method, params) {
    return `${method}:${JSON.stringify(params)}`;
  }

  /**
   * מקבל ערך מהמטמון
   * @param {string} method - שם המתודה
   * @param {Object} params - הפרמטרים
   * @returns {*|null} הערך מהמטמון או null אם לא נמצא או פג תוקף
   */
  get(method, params) {
    if (!this.options.enabled) return null;
    
    const key = this.makeKey(method, params);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // בדיקה אם הערך במטמון עדיין בתוקף
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    this.stats.hits++;
    return cached.data;
  }

  /**
   * שומר ערך במטמון
   * @param {string} method - שם המתודה
   * @param {Object} params - הפרמטרים
   * @param {*} data - המידע לשמירה
   */
  set(method, params, data) {
    if (!this.options.enabled) return;
    
    const key = this.makeKey(method, params);
    
    // בדיקה אם צריך לנקות את המטמון
    if (this.cache.size >= this.options.maxSize) {
      // אסטרטגיה פשוטה: הסרת הרשומה הישנה ביותר
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.options.ttl,
      timestamp: Date.now()
    });
    
    this.stats.size = this.cache.size;
  }

  /**
   * מנקה את המטמון
   * @param {string} [method] - שם מתודה לניקוי מטמון ספציפי (אופציונלי)
   * @param {Object} [params] - פרמטרים לניקוי רשומה ספציפית (אופציונלי)
   */
  clear(method, params) {
    if (!method) {
      // ניקוי כל המטמון
      this.cache.clear();
      this.stats.size = 0;
      return;
    }
    
    if (!params) {
      // ניקוי כל הרשומות עבור מתודה ספציפית
      const methodPrefix = `${method}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(methodPrefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      // ניקוי רשומה ספציפית
      const key = this.makeKey(method, params);
      this.cache.delete(key);
    }
    
    this.stats.size = this.cache.size;
  }

  /**
   * מקבל סטטיסטיקות מטמון
   * @returns {Object} סטטיסטיקות המטמון
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * מציין שהייתה החטאה במטמון (miss)
   */
  registerMiss() {
    this.stats.misses++;
  }
}

export default MemoryCache;