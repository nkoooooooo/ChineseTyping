/**
 * 聖公會蔡功譜中學 - 中文打字挑戰平台
 * 智慧拆碼與拼音轉換引擎 (Enterprise Converter 2.0)
 *
 * 核心功能：
 * 1. 倉頡/速成智慧轉換：基於 words_codes.json 全字庫，速成自動提取首尾兩碼
 * 2. 漢語拼音智慧轉換：基於 pyshengdiao.js 全字庫，自動生成標準帶聲調拼音
 * 3. 智慧排點對齊防偏移：自動辨識並略過所有中英文標點符號
 * 4. 懶加載與漸進增強：按需非同步載入字庫，記憶體級高效快取
 */

var TypingConverter = (function() {
    "use strict";

    // 倉頡字母對應表 (a-z -> 日...重)
    var CJ_MAP = {
        a:"日", b:"月", c:"金", d:"木", e:"水", f:"火", g:"土", h:"竹",
        i:"戈", j:"十", k:"大", l:"中", m:"一", n:"弓", o:"人", p:"心",
        q:"手", r:"口", s:"尸", t:"廿", u:"山", v:"女", w:"田", x:"難",
        y:"卜", z:"重"
    };

    // 常用中文標點符號集合 (智慧略過，不配發拆碼/拼音)
    var PUNC_CHARS = "，。、！：；「」？_‐—～()（）《》〈〉［］【】 \t\r\n-·§°±÷ˇˊˋ˙";
    function isPunctuation(ch) {
        return PUNC_CHARS.indexOf(ch) !== -1;
    }

    // 記憶體快取
    var _wordsCodesCache = null;
    var _isWordsCodesLoading = false;
    var _wordsCodesCallbacks = [];

    // 內建常用速成字根降級備援庫 (以防離線或 words_codes.json 載入失敗)
    var FALLBACK_QUICK = {
        "一":"一","乙":"弓九","二":"一一","十":"十","丁":"一弓","七":"十山","八":"竹人","九":"大弓","人":"人","入":"人竹",
        "白":"竹日","日":"日","依":"人女","山":"山","盡":"中廿","黃":"廿金","河":"水口","海":"水卜","流":"水山",
        "蔡":"廿火","功":"一尸","譜":"卜日","中":"中","學":"竹木","校":"木大","文":"卜大","字":"十木","打":"手弓",
        "練":"女火","習":"尸日","考":"十尸","試":"卜戈","課":"卜木","堂":"火土","教":"十木","師":"竹月","生":"竹一"
    };

    return {
        isPunctuation: isPunctuation,

        /**
         * 非同步加載 words_codes.json (具備單例快取與防重複請求)
         */
        ensureWordsCodes: function(callback) {
            if (_wordsCodesCache) {
                if (callback) callback(null, _wordsCodesCache);
                return Promise.resolve(_wordsCodesCache);
            }

            if (typeof fetch === "undefined") {
                // Node.js 環境支援
                try {
                    _wordsCodesCache = require("../words_codes.json");
                    if (callback) callback(null, _wordsCodesCache);
                    return Promise.resolve(_wordsCodesCache);
                } catch(e) {
                    if (callback) callback(e, null);
                    return Promise.reject(e);
                }
            }

            return new Promise(function(resolve, reject) {
                _wordsCodesCallbacks.push({ resolve: resolve, reject: reject, callback: callback });
                if (_isWordsCodesLoading) return;
                _isWordsCodesLoading = true;

                fetch("words_codes.json")
                    .then(function(res) {
                        if (!res.ok) throw new Error("HTTP " + res.status + " 無法下載 words_codes.json");
                        return res.json();
                    })
                    .then(function(data) {
                        _wordsCodesCache = data;
                        _isWordsCodesLoading = false;
                        var cbs = _wordsCodesCallbacks.slice();
                        _wordsCodesCallbacks = [];
                        cbs.forEach(function(item) {
                            if (item.callback) item.callback(null, data);
                            item.resolve(data);
                        });
                    })
                    .catch(function(err) {
                        _isWordsCodesLoading = false;
                        var cbs = _wordsCodesCallbacks.slice();
                        _wordsCodesCallbacks = [];
                        cbs.forEach(function(item) {
                            if (item.callback) item.callback(err, null);
                            item.reject(err);
                        });
                    });
            });
        },

        /**
         * 轉換為速成字根 (首尾兩碼)
         * @param {string} text - 漢字正文
         * @param {object} [customDict] - 選擇性傳入 words_codes 資料
         * @returns {string} 空白鍵隔開的速成碼
         */
        toQuick: function(text, customDict) {
            var dict = customDict || _wordsCodesCache;
            var result = [];

            for (var i = 0; i < text.length; i++) {
                var ch = text.charAt(i);
                if (isPunctuation(ch)) continue;

                var quickCode = "";
                if (dict && dict[ch] && dict[ch].code) {
                    var raw = String(dict[ch].code).toLowerCase();
                    if (raw.length === 1) {
                        quickCode = CJ_MAP[raw] || raw;
                    } else if (raw.length >= 2) {
                        var firstChar = raw.charAt(0);
                        var lastChar = raw.charAt(raw.length - 1);
                        quickCode = (CJ_MAP[firstChar] || firstChar) + (CJ_MAP[lastChar] || lastChar);
                    }
                } else if (FALLBACK_QUICK[ch]) {
                    quickCode = FALLBACK_QUICK[ch];
                } else {
                    quickCode = ch; // 無碼則保留漢字本身供教師識別
                }
                result.push(quickCode);
            }
            return result.join(" ");
        },

        /**
         * 轉換為完整倉頡字根
         */
        toCangjie: function(text, customDict) {
            var dict = customDict || _wordsCodesCache;
            var result = [];

            for (var i = 0; i < text.length; i++) {
                var ch = text.charAt(i);
                if (isPunctuation(ch)) continue;

                var cjCode = "";
                if (dict && dict[ch] && dict[ch].code) {
                    var raw = String(dict[ch].code).toLowerCase();
                    cjCode = raw.split("").map(function(k) { return CJ_MAP[k] || k; }).join("");
                } else {
                    cjCode = ch;
                }
                result.push(cjCode);
            }
            return result.join(" ");
        },

        /**
         * 轉換為漢語拼音 (自動整合 PinyinHelper)
         */
        toPinyin: function(text, customHelper) {
            var helper = customHelper || (typeof PinyinHelper !== "undefined" ? PinyinHelper : (typeof window !== "undefined" ? window.PinyinHelper : null));
            if (helper && helper.convertText) {
                return helper.convertText(text);
            }
            if (typeof PinyinHelper !== "undefined" && PinyinHelper.convertText) {
                return PinyinHelper.convertText(text);
            }
            if (typeof trans === "function") {
                return trans(text);
            }
            return text;
        }
    };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = TypingConverter;
}
