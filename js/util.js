
// 定義一個 LocalStorage 操作的物件
const LocalStorageUtil = {
    // 將字符串進行 Base64 編碼
    encode: function(value) {
        const bytes = new TextEncoder().encode(value); // 將字符串轉換為字節數組
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]); // 將字節轉換為字符
        }
        return btoa(binary); // 將二進制字符串編碼為 Base64
    },

    // 將 Base64 字符串解碼
    decode: function(value) {
        const binary = atob(value); // 解碼 Base64 字符串
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i); // 將字符轉換為字節
        }
        return new TextDecoder().decode(bytes); // 將字節數組轉換為字符串
    },

    // 寫入數據到 LocalStorage
    // @param {string} key - 存儲的鍵
    // @param {any} value - 存儲的值，可以是任何類型
    setItem: function(key, value) {
        const encodedValue = this.encode(JSON.stringify(value));
        localStorage.setItem(key, encodedValue);
    },

    // 從 LocalStorage 讀取數據
    // @param {string} key - 要讀取的鍵
    // @returns {any} - 讀取的值，若不存在則返回 null
    getItem: function(key) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(this.decode(value)) : null;
    },

    // 刪除特定的數據
    // @param {string} key - 要刪除的鍵
    removeItem: function(key) {
        localStorage.removeItem(key);
    },

    // 清除所有 LocalStorage 的數據
    clear: function() {
        localStorage.clear();
    }
};

/*

// 使用範例
// 寫入數據
LocalStorageUtil.setItem('user', { name: 'Alice', age: 25 });

// 讀取數據
const user = LocalStorageUtil.getItem('user');
console.log(user); // 輸出: { name: 'Alice', age: 25 }

// 刪除特定數據
LocalStorageUtil.removeItem('user');

// 清除所有數據
LocalStorageUtil.clear();
*/

// 定義一個 Cookie 操作的物件
const CookieUtil = {
    // 寫入 Cookie
    // @param {string} name - Cookie 的名稱
    // @param {string} value - Cookie 的值
    // @param {number} days - 過期天數
    setCookie: function(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); // 計算過期時間
            expires = "; expires=" + date.toUTCString(); // 設定過期日期
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/"; // 設定 Cookie
    },

    // 讀取 Cookie
    // @param {string} name - 要讀取的 Cookie 名稱
    // @returns {string|null} - 讀取的值，若不存在則返回 null
    getCookie: function(name) {
        const nameEQ = name + "="; // 建立查詢字串
        const ca = document.cookie.split(';'); // 分割所有 Cookie
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length); // 去除前導空格
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length); // 返回值
        }
        return null; // 若未找到，返回 null
    },

    // 刪除指定的 Cookie
    // @param {string} name - 要刪除的 Cookie 名稱
    deleteCookie: function(name) {
        this.setCookie(name, "", -1); // 設定過期為過去的時間
    },

    // 清除所有 Cookie
    clearAllCookies: function() {
        const cookies = document.cookie.split(";"); // 獲取所有 Cookie
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie; // 獲取 Cookie 名稱
            this.deleteCookie(name); // 刪除每個 Cookie
        }
    }
};

/*

// 使用範例
// 寫入 Cookie
CookieUtil.setCookie('username', 'Alice', 7); // 設定 Cookie，過期時間為 7 天

// 讀取 Cookie
const username = CookieUtil.getCookie('username');
console.log(username); // 輸出: Alice

// 刪除特定 Cookie
CookieUtil.deleteCookie('username');

// 清除所有 Cookie
CookieUtil.clearAllCookies();

*/

// 定義一個 SessionStorage 操作的物件
const SessionStorageUtil = {
    // 將字符串進行 Base64 編碼
    encode: function(value) {
        const bytes = new TextEncoder().encode(value); // 將字符串轉換為字節數組
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]); // 將字節轉換為字符
        }
        return btoa(binary); // 將二進制字符串編碼為 Base64
    },

    // 將 Base64 字符串解碼
    decode: function(value) {
        const binary = atob(value); // 解碼 Base64 字符串
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i); // 將字符轉換為字節
        }
        return new TextDecoder().decode(bytes); // 將字節數組轉換為字符串
    },

    // 寫入數據到 SessionStorage
    setItem: function(key, value) {
        const encodedValue = this.encode(JSON.stringify(value));
        sessionStorage.setItem(key, encodedValue);
    },

    // 從 SessionStorage 讀取數據
    getItem: function(key) {
        const value = sessionStorage.getItem(key);
        return value ? JSON.parse(this.decode(value)) : null;
    },

    // 刪除特定的數據
    removeItem: function(key) {
        sessionStorage.removeItem(key);
    },

    // 清除所有 SessionStorage 的數據
    clear: function() {
        sessionStorage.clear();
    }
};

/*
// 使用範例
// 寫入數據
SessionStorageUtil.setItem('sessionUser', { name: 'Alice', age: 25 });

// 讀取數據
const sessionUser = SessionStorageUtil.getItem('sessionUser');
console.log(sessionUser); // 輸出: { name: 'Alice', age: 25 }

// 刪除特定數據
SessionStorageUtil.removeItem('sessionUser');

// 清除所有數據
SessionStorageUtil.clear();
*/