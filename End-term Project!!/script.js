// ========== GLOBAL STATE ==========
let userProfile = null;
let weeklyChart = null;

// ========== USDA API CONFIG ==========
// Get your FREE key at: https://fdc.nal.usda.gov/api-key-signup
// Replace the string below with your key
const USDA_API_KEY = 'DEMO_KEY'; // DEMO_KEY works but has low rate limits (30 req/day)

// ========== UTILITY FUNCTIONS ==========
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function getTodayLog() {
    const key = `dailyLog_${getTodayKey()}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {
        date: getTodayKey(),
        foods: [],
        exercises: [],
        caloriesEaten: 0,
        caloriesBurned: 0,
        netCalories: 0,
        proteinConsumed: 0
    };
}

function saveTodayLog(log) {
    const key = `dailyLog_${getTodayKey()}`;
    localStorage.setItem(key, JSON.stringify(log));
}

// ========== PROFILE MANAGEMENT ==========
function loadProfile() {
    const stored = localStorage.getItem('userProfile');
    userProfile = stored ? JSON.parse(stored) : null;
}

function saveProfile() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
}

// ========== CALCULATIONS ==========
function calculateBMR(gender, weight, height, age) {
    if (gender === 'male') {
        return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
}

function calculateTDEE(bmr, activityLevel) {
    return Math.round(bmr * parseFloat(activityLevel));
}

function calculateDailyTarget(tdee, goal) {
    if (goal === 'loss') return tdee - 500;
    if (goal === 'gain') return tdee + 300;
    return tdee;
}

// ========================================================
// ========== MASSIVE LOCAL FOOD DATABASE (FALLBACK) =====
// ========================================================
// All values per 100g unless noted. Used when USDA API fails.
const LOCAL_FOOD_DB = {

    // ── INDIAN STAPLES ──────────────────────────────────
    'roti':           { cal: 297, pro: 9.9,  carb: 53,  fat: 3.7,  defaultUnit: 'piece', defaultGrams: 35 },
    'chapati':        { cal: 297, pro: 9.9,  carb: 53,  fat: 3.7,  defaultUnit: 'piece', defaultGrams: 35 },
    'phulka':         { cal: 297, pro: 9.9,  carb: 53,  fat: 3.7,  defaultUnit: 'piece', defaultGrams: 30 },
    'naan':           { cal: 310, pro: 9.1,  carb: 55,  fat: 5.5,  defaultUnit: 'piece', defaultGrams: 90 },
    'paratha':        { cal: 326, pro: 8,    carb: 45,  fat: 12,   defaultUnit: 'piece', defaultGrams: 80 },
    'aloo paratha':   { cal: 200, pro: 4.5,  carb: 30,  fat: 7,    defaultUnit: 'piece', defaultGrams: 100 },
    'puri':           { cal: 340, pro: 6,    carb: 44,  fat: 16,   defaultUnit: 'piece', defaultGrams: 40 },
    'white rice':     { cal: 130, pro: 2.7,  carb: 28,  fat: 0.3,  defaultUnit: 'cup',   defaultGrams: 186 },
    'brown rice':     { cal: 111, pro: 2.6,  carb: 23,  fat: 0.9,  defaultUnit: 'cup',   defaultGrams: 195 },
    'basmati rice':   { cal: 130, pro: 2.7,  carb: 28,  fat: 0.3,  defaultUnit: 'cup',   defaultGrams: 186 },
    'rice':           { cal: 130, pro: 2.7,  carb: 28,  fat: 0.3,  defaultUnit: 'cup',   defaultGrams: 186 },
    'biryani':        { cal: 200, pro: 8,    carb: 35,  fat: 5,    defaultUnit: 'cup',   defaultGrams: 200 },
    'pulao':          { cal: 160, pro: 4,    carb: 30,  fat: 3,    defaultUnit: 'cup',   defaultGrams: 200 },
    'dal':            { cal: 116, pro: 9,    carb: 20,  fat: 0.5,  defaultUnit: 'cup',   defaultGrams: 240 },
    'toor dal':       { cal: 116, pro: 9,    carb: 20,  fat: 0.5,  defaultUnit: 'cup',   defaultGrams: 240 },
    'moong dal':      { cal: 105, pro: 7,    carb: 19,  fat: 0.4,  defaultUnit: 'cup',   defaultGrams: 240 },
    'masoor dal':     { cal: 116, pro: 9,    carb: 20,  fat: 0.4,  defaultUnit: 'cup',   defaultGrams: 240 },
    'chana dal':      { cal: 164, pro: 8.9,  carb: 27,  fat: 2.6,  defaultUnit: 'cup',   defaultGrams: 240 },
    'rajma':          { cal: 127, pro: 8.7,  carb: 22.8,fat: 0.5,  defaultUnit: 'cup',   defaultGrams: 240 },
    'kidney beans':   { cal: 127, pro: 8.7,  carb: 22.8,fat: 0.5,  defaultUnit: 'cup',   defaultGrams: 240 },
    'chole':          { cal: 164, pro: 8.9,  carb: 27,  fat: 2.6,  defaultUnit: 'cup',   defaultGrams: 240 },
    'chickpeas':      { cal: 164, pro: 8.9,  carb: 27,  fat: 2.6,  defaultUnit: 'cup',   defaultGrams: 240 },
    'paneer':         { cal: 265, pro: 18,   carb: 1.2, fat: 21,   defaultUnit: 'piece', defaultGrams: 100 },
    'tofu':           { cal: 76,  pro: 8,    carb: 1.9, fat: 4.2,  defaultUnit: 'cup',   defaultGrams: 126 },
    'dosa':           { cal: 168, pro: 4,    carb: 28,  fat: 4,    defaultUnit: 'piece', defaultGrams: 80 },
    'idli':           { cal: 58,  pro: 2,    carb: 12,  fat: 0.2,  defaultUnit: 'piece', defaultGrams: 40 },
    'uttapam':        { cal: 130, pro: 4,    carb: 22,  fat: 3.5,  defaultUnit: 'piece', defaultGrams: 90 },
    'sambhar':        { cal: 56,  pro: 3,    carb: 10,  fat: 0.5,  defaultUnit: 'cup',   defaultGrams: 240 },
    'samosa':         { cal: 262, pro: 5,    carb: 26,  fat: 16,   defaultUnit: 'piece', defaultGrams: 60 },
    'pakora':         { cal: 200, pro: 4,    carb: 20,  fat: 12,   defaultUnit: 'piece', defaultGrams: 50 },
    'poha':           { cal: 250, pro: 6,    carb: 48,  fat: 3,    defaultUnit: 'cup',   defaultGrams: 180 },
    'upma':           { cal: 200, pro: 5,    carb: 35,  fat: 4,    defaultUnit: 'cup',   defaultGrams: 180 },
    'khichdi':        { cal: 150, pro: 5,    carb: 30,  fat: 1,    defaultUnit: 'cup',   defaultGrams: 200 },
    'raita':          { cal: 40,  pro: 2,    carb: 5,   fat: 1.5,  defaultUnit: 'cup',   defaultGrams: 200 },
    'curd':           { cal: 60,  pro: 3.4,  carb: 4.7, fat: 3.3,  defaultUnit: 'cup',   defaultGrams: 245 },
    'dahi':           { cal: 60,  pro: 3.4,  carb: 4.7, fat: 3.3,  defaultUnit: 'cup',   defaultGrams: 245 },
    'lassi':          { cal: 140, pro: 6,    carb: 20,  fat: 4,    defaultUnit: 'cup',   defaultGrams: 240 },
    'ghee':           { cal: 900, pro: 0,    carb: 0,   fat: 99.5, defaultUnit: 'tsp',   defaultGrams: 5 },
    'butter':         { cal: 717, pro: 0.9,  carb: 0.1, fat: 81,   defaultUnit: 'tsp',   defaultGrams: 5 },
    'aloo':           { cal: 77,  pro: 2,    carb: 17,  fat: 0.1,  defaultUnit: 'piece', defaultGrams: 150 },
    'potato':         { cal: 77,  pro: 2,    carb: 17,  fat: 0.1,  defaultUnit: 'piece', defaultGrams: 150 },
    'aloo sabzi':     { cal: 120, pro: 2.5,  carb: 18,  fat: 5,    defaultUnit: 'cup',   defaultGrams: 200 },
    'palak paneer':   { cal: 180, pro: 10,   carb: 8,   fat: 12,   defaultUnit: 'cup',   defaultGrams: 200 },
    'butter chicken': { cal: 175, pro: 16,   carb: 5,   fat: 10,   defaultUnit: 'cup',   defaultGrams: 200 },
    'chicken curry':  { cal: 175, pro: 16,   carb: 5,   fat: 10,   defaultUnit: 'cup',   defaultGrams: 200 },
    'mutton curry':   { cal: 250, pro: 20,   carb: 5,   fat: 17,   defaultUnit: 'cup',   defaultGrams: 200 },
    'fish curry':     { cal: 160, pro: 18,   carb: 4,   fat: 8,    defaultUnit: 'cup',   defaultGrams: 200 },
    'pav bhaji':      { cal: 150, pro: 4,    carb: 22,  fat: 5,    defaultUnit: 'cup',   defaultGrams: 200 },
    'vada pav':       { cal: 290, pro: 6,    carb: 40,  fat: 12,   defaultUnit: 'piece', defaultGrams: 120 },
    'chaat':          { cal: 180, pro: 5,    carb: 30,  fat: 5,    defaultUnit: 'cup',   defaultGrams: 200 },

    // ── PROTEINS (GYM STAPLES) ───────────────────────────
    'chicken breast':     { cal: 165, pro: 31,  carb: 0,   fat: 3.6,  defaultUnit: 'piece', defaultGrams: 150 },
    'chicken':            { cal: 165, pro: 31,  carb: 0,   fat: 3.6,  defaultUnit: 'piece', defaultGrams: 150 },
    'grilled chicken':    { cal: 165, pro: 31,  carb: 0,   fat: 3.6,  defaultUnit: 'piece', defaultGrams: 150 },
    'boiled chicken':     { cal: 150, pro: 29,  carb: 0,   fat: 3,    defaultUnit: 'piece', defaultGrams: 150 },
    'chicken thigh':      { cal: 209, pro: 26,  carb: 0,   fat: 11,   defaultUnit: 'piece', defaultGrams: 100 },
    'chicken leg':        { cal: 184, pro: 28,  carb: 0,   fat: 8,    defaultUnit: 'piece', defaultGrams: 120 },
    'mutton':             { cal: 294, pro: 25,  carb: 0,   fat: 21,   defaultUnit: 'piece', defaultGrams: 100 },
    'fish':               { cal: 206, pro: 22,  carb: 0,   fat: 12,   defaultUnit: 'piece', defaultGrams: 100 },
    'salmon':             { cal: 208, pro: 20,  carb: 0,   fat: 13,   defaultUnit: 'piece', defaultGrams: 100 },
    'tuna':               { cal: 132, pro: 28,  carb: 0,   fat: 1.3,  defaultUnit: 'cup',   defaultGrams: 154 },
    'tuna canned':        { cal: 116, pro: 26,  carb: 0,   fat: 0.8,  defaultUnit: 'cup',   defaultGrams: 154 },
    'egg':                { cal: 155, pro: 13,  carb: 1.1, fat: 11,   defaultUnit: 'piece', defaultGrams: 50 },
    'egg white':          { cal: 52,  pro: 11,  carb: 0.7, fat: 0.2,  defaultUnit: 'piece', defaultGrams: 33 },
    'whole egg':          { cal: 155, pro: 13,  carb: 1.1, fat: 11,   defaultUnit: 'piece', defaultGrams: 50 },
    'boiled egg':         { cal: 155, pro: 13,  carb: 1.1, fat: 11,   defaultUnit: 'piece', defaultGrams: 50 },
    'scrambled eggs':     { cal: 170, pro: 12,  carb: 2,   fat: 13,   defaultUnit: 'cup',   defaultGrams: 220 },

    // ── DAIRY & GYM DAIRY ────────────────────────────────
    'milk':               { cal: 61,  pro: 3.2,  carb: 4.8, fat: 3.3, defaultUnit: 'cup',  defaultGrams: 244 },
    'whole milk':         { cal: 61,  pro: 3.2,  carb: 4.8, fat: 3.3, defaultUnit: 'cup',  defaultGrams: 244 },
    'skim milk':          { cal: 34,  pro: 3.4,  carb: 5,   fat: 0.1, defaultUnit: 'cup',  defaultGrams: 245 },
    'greek yogurt':       { cal: 59,  pro: 10,   carb: 3.6, fat: 0.4, defaultUnit: 'cup',  defaultGrams: 245 },
    'yogurt':             { cal: 59,  pro: 10,   carb: 3.6, fat: 0.4, defaultUnit: 'cup',  defaultGrams: 245 },
    'low fat yogurt':     { cal: 63,  pro: 5.3,  carb: 7,   fat: 1.6, defaultUnit: 'cup',  defaultGrams: 245 },
    'cottage cheese':     { cal: 98,  pro: 11,   carb: 3.4, fat: 4.3, defaultUnit: 'cup',  defaultGrams: 226 },
    'cheese':             { cal: 402, pro: 25,   carb: 1.3, fat: 33,  defaultUnit: 'piece', defaultGrams: 28 },
    'mozzarella':         { cal: 280, pro: 28,   carb: 2.2, fat: 17,  defaultUnit: 'piece', defaultGrams: 30 },
    'whey protein':       { cal: 400, pro: 80,   carb: 8,   fat: 4,   defaultUnit: 'scoop', defaultGrams: 30 },
    'protein powder':     { cal: 400, pro: 80,   carb: 8,   fat: 4,   defaultUnit: 'scoop', defaultGrams: 30 },

    // ── BREADS & GRAINS ──────────────────────────────────
    'bread':              { cal: 265, pro: 9,    carb: 49,  fat: 3.2, defaultUnit: 'slice', defaultGrams: 30 },
    'white bread':        { cal: 265, pro: 9,    carb: 49,  fat: 3.2, defaultUnit: 'slice', defaultGrams: 30 },
    'brown bread':        { cal: 247, pro: 10,   carb: 46,  fat: 3.4, defaultUnit: 'slice', defaultGrams: 32 },
    'whole wheat bread':  { cal: 247, pro: 10,   carb: 46,  fat: 3.4, defaultUnit: 'slice', defaultGrams: 32 },
    'multigrain bread':   { cal: 240, pro: 10.5, carb: 44,  fat: 3.5, defaultUnit: 'slice', defaultGrams: 32 },
    'pita bread':         { cal: 275, pro: 9.1,  carb: 56,  fat: 1.2, defaultUnit: 'piece', defaultGrams: 60 },
    'oats':               { cal: 389, pro: 17,   carb: 66,  fat: 7,   defaultUnit: 'cup',   defaultGrams: 81 },
    'oatmeal':            { cal: 71,  pro: 2.5,  carb: 12,  fat: 1.5, defaultUnit: 'cup',   defaultGrams: 234 },
    'muesli':             { cal: 363, pro: 10,   carb: 66,  fat: 6,   defaultUnit: 'cup',   defaultGrams: 85 },
    'granola':            { cal: 471, pro: 10,   carb: 64,  fat: 20,  defaultUnit: 'cup',   defaultGrams: 122 },
    'cornflakes':         { cal: 357, pro: 7.5,  carb: 84,  fat: 0.4, defaultUnit: 'cup',   defaultGrams: 28 },
    'quinoa':             { cal: 120, pro: 4.4,  carb: 21,  fat: 1.9, defaultUnit: 'cup',   defaultGrams: 185 },
    'pasta':              { cal: 131, pro: 5,    carb: 25,  fat: 1.1, defaultUnit: 'cup',   defaultGrams: 140 },
    'whole wheat pasta':  { cal: 124, pro: 5.3,  carb: 26,  fat: 0.5, defaultUnit: 'cup',   defaultGrams: 140 },

    // ── FRUITS ───────────────────────────────────────────
    'apple':              { cal: 52,  pro: 0.3,  carb: 14,  fat: 0.2, defaultUnit: 'piece', defaultGrams: 182 },
    'banana':             { cal: 89,  pro: 1.1,  carb: 23,  fat: 0.3, defaultUnit: 'piece', defaultGrams: 118 },
    'mango':              { cal: 60,  pro: 0.8,  carb: 15,  fat: 0.4, defaultUnit: 'cup',   defaultGrams: 165 },
    'orange':             { cal: 47,  pro: 0.9,  carb: 12,  fat: 0.1, defaultUnit: 'piece', defaultGrams: 131 },
    'grapes':             { cal: 69,  pro: 0.7,  carb: 18,  fat: 0.2, defaultUnit: 'cup',   defaultGrams: 151 },
    'watermelon':         { cal: 30,  pro: 0.6,  carb: 7.6, fat: 0.2, defaultUnit: 'cup',   defaultGrams: 152 },
    'papaya':             { cal: 43,  pro: 0.5,  carb: 11,  fat: 0.3, defaultUnit: 'cup',   defaultGrams: 145 },
    'pineapple':          { cal: 50,  pro: 0.5,  carb: 13,  fat: 0.1, defaultUnit: 'cup',   defaultGrams: 165 },
    'pomegranate':        { cal: 83,  pro: 1.7,  carb: 19,  fat: 1.2, defaultUnit: 'cup',   defaultGrams: 174 },
    'strawberry':         { cal: 32,  pro: 0.7,  carb: 7.7, fat: 0.3, defaultUnit: 'cup',   defaultGrams: 152 },
    'blueberry':          { cal: 57,  pro: 0.7,  carb: 14,  fat: 0.3, defaultUnit: 'cup',   defaultGrams: 148 },
    'kiwi':               { cal: 61,  pro: 1.1,  carb: 15,  fat: 0.5, defaultUnit: 'piece', defaultGrams: 76 },
    'guava':              { cal: 68,  pro: 2.6,  carb: 14,  fat: 1,   defaultUnit: 'piece', defaultGrams: 100 },
    'pear':               { cal: 57,  pro: 0.4,  carb: 15,  fat: 0.1, defaultUnit: 'piece', defaultGrams: 178 },
    'peach':              { cal: 39,  pro: 0.9,  carb: 10,  fat: 0.3, defaultUnit: 'piece', defaultGrams: 150 },
    'lychee':             { cal: 66,  pro: 0.8,  carb: 17,  fat: 0.4, defaultUnit: 'cup',   defaultGrams: 190 },
    'avocado':            { cal: 160, pro: 2,    carb: 9,   fat: 15,  defaultUnit: 'piece', defaultGrams: 136 },
    'dates':              { cal: 277, pro: 1.8,  carb: 75,  fat: 0.2, defaultUnit: 'piece', defaultGrams: 8 },
    'coconut':            { cal: 354, pro: 3.3,  carb: 15,  fat: 33,  defaultUnit: 'cup',   defaultGrams: 80 },

    // ── GYM VEGGIES (RAW & STEAMED) ──────────────────────
    'broccoli':           { cal: 34,  pro: 2.8,  carb: 7,   fat: 0.4, defaultUnit: 'cup',   defaultGrams: 91 },
    'steamed broccoli':   { cal: 35,  pro: 2.4,  carb: 7.2, fat: 0.4, defaultUnit: 'cup',   defaultGrams: 156 },
    'spinach':            { cal: 23,  pro: 2.9,  carb: 3.6, fat: 0.4, defaultUnit: 'cup',   defaultGrams: 30 },
    'steamed spinach':    { cal: 41,  pro: 5.4,  carb: 6.8, fat: 0.5, defaultUnit: 'cup',   defaultGrams: 180 },
    'cauliflower':        { cal: 25,  pro: 1.9,  carb: 5,   fat: 0.3, defaultUnit: 'cup',   defaultGrams: 107 },
    'steamed cauliflower':{ cal: 29,  pro: 2.3,  carb: 5.4, fat: 0.3, defaultUnit: 'cup',   defaultGrams: 124 },
    'green beans':        { cal: 31,  pro: 1.8,  carb: 7,   fat: 0.1, defaultUnit: 'cup',   defaultGrams: 125 },
    'steamed green beans':{ cal: 44,  pro: 2.4,  carb: 9.9, fat: 0.4, defaultUnit: 'cup',   defaultGrams: 125 },
    'asparagus':          { cal: 20,  pro: 2.2,  carb: 3.9, fat: 0.1, defaultUnit: 'cup',   defaultGrams: 134 },
    'steamed asparagus':  { cal: 32,  pro: 3.4,  carb: 5.9, fat: 0.3, defaultUnit: 'cup',   defaultGrams: 180 },
    'zucchini':           { cal: 17,  pro: 1.2,  carb: 3.1, fat: 0.3, defaultUnit: 'cup',   defaultGrams: 124 },
    'steamed zucchini':   { cal: 20,  pro: 1.5,  carb: 4,   fat: 0.2, defaultUnit: 'cup',   defaultGrams: 124 },
    'bell pepper':        { cal: 31,  pro: 1,    carb: 6,   fat: 0.3, defaultUnit: 'piece', defaultGrams: 119 },
    'capsicum':           { cal: 31,  pro: 1,    carb: 6,   fat: 0.3, defaultUnit: 'piece', defaultGrams: 119 },
    'carrot':             { cal: 41,  pro: 0.9,  carb: 10,  fat: 0.2, defaultUnit: 'piece', defaultGrams: 61 },
    'steamed carrot':     { cal: 54,  pro: 1.2,  carb: 12,  fat: 0.3, defaultUnit: 'cup',   defaultGrams: 146 },
    'peas':               { cal: 81,  pro: 5.4,  carb: 14,  fat: 0.4, defaultUnit: 'cup',   defaultGrams: 160 },
    'tomato':             { cal: 18,  pro: 0.9,  carb: 3.9, fat: 0.2, defaultUnit: 'piece', defaultGrams: 123 },
    'onion':              { cal: 40,  pro: 1.1,  carb: 9,   fat: 0.1, defaultUnit: 'piece', defaultGrams: 110 },
    'garlic':             { cal: 149, pro: 6.4,  carb: 33,  fat: 0.5, defaultUnit: 'piece', defaultGrams: 3 },
    'cucumber':           { cal: 15,  pro: 0.7,  carb: 3.6, fat: 0.1, defaultUnit: 'piece', defaultGrams: 119 },
    'mushroom':           { cal: 22,  pro: 3.1,  carb: 3.3, fat: 0.3, defaultUnit: 'cup',   defaultGrams: 70 },
    'steamed mushroom':   { cal: 28,  pro: 3.5,  carb: 5.2, fat: 0.4, defaultUnit: 'cup',   defaultGrams: 156 },
    'sweet potato':       { cal: 86,  pro: 1.6,  carb: 20,  fat: 0.1, defaultUnit: 'piece', defaultGrams: 130 },
    'steamed sweet potato':{ cal: 90, pro: 2,    carb: 21,  fat: 0.1, defaultUnit: 'piece', defaultGrams: 130 },
    'palak':              { cal: 23,  pro: 2.9,  carb: 3.6, fat: 0.4, defaultUnit: 'cup',   defaultGrams: 30 },
    'methi':              { cal: 49,  pro: 4.4,  carb: 6,   fat: 0.9, defaultUnit: 'cup',   defaultGrams: 30 },
    'bhindi':             { cal: 33,  pro: 1.9,  carb: 7.5, fat: 0.2, defaultUnit: 'cup',   defaultGrams: 100 },
    'okra':               { cal: 33,  pro: 1.9,  carb: 7.5, fat: 0.2, defaultUnit: 'cup',   defaultGrams: 100 },
    'lauki':              { cal: 15,  pro: 0.6,  carb: 3.4, fat: 0.1, defaultUnit: 'cup',   defaultGrams: 200 },
    'bottle gourd':       { cal: 15,  pro: 0.6,  carb: 3.4, fat: 0.1, defaultUnit: 'cup',   defaultGrams: 200 },
    'karela':             { cal: 17,  pro: 1,    carb: 3.7, fat: 0.2, defaultUnit: 'piece', defaultGrams: 100 },
    'bitter gourd':       { cal: 17,  pro: 1,    carb: 3.7, fat: 0.2, defaultUnit: 'piece', defaultGrams: 100 },
    'corn':               { cal: 86,  pro: 3.3,  carb: 19,  fat: 1.4, defaultUnit: 'cup',   defaultGrams: 154 },
    'corn on cob':        { cal: 86,  pro: 3.3,  carb: 19,  fat: 1.4, defaultUnit: 'piece', defaultGrams: 100 },
    'edamame':            { cal: 121, pro: 11,   carb: 8.9, fat: 5.2, defaultUnit: 'cup',   defaultGrams: 155 },

    // ── NUTS & SEEDS ─────────────────────────────────────
    'almond':             { cal: 579, pro: 21,  carb: 22,  fat: 50,  defaultUnit: 'piece', defaultGrams: 1 },
    'almonds':            { cal: 579, pro: 21,  carb: 22,  fat: 50,  defaultUnit: 'cup',   defaultGrams: 143 },
    'cashew':             { cal: 553, pro: 18,  carb: 30,  fat: 44,  defaultUnit: 'cup',   defaultGrams: 130 },
    'cashews':            { cal: 553, pro: 18,  carb: 30,  fat: 44,  defaultUnit: 'cup',   defaultGrams: 130 },
    'walnut':             { cal: 654, pro: 15,  carb: 14,  fat: 65,  defaultUnit: 'cup',   defaultGrams: 100 },
    'walnuts':            { cal: 654, pro: 15,  carb: 14,  fat: 65,  defaultUnit: 'cup',   defaultGrams: 100 },
    'peanut':             { cal: 567, pro: 26,  carb: 16,  fat: 49,  defaultUnit: 'cup',   defaultGrams: 146 },
    'peanuts':            { cal: 567, pro: 26,  carb: 16,  fat: 49,  defaultUnit: 'cup',   defaultGrams: 146 },
    'peanut butter':      { cal: 588, pro: 25,  carb: 20,  fat: 50,  defaultUnit: 'tbsp',  defaultGrams: 32 },
    'flaxseed':           { cal: 534, pro: 18,  carb: 29,  fat: 42,  defaultUnit: 'tbsp',  defaultGrams: 10 },
    'chia seeds':         { cal: 486, pro: 17,  carb: 42,  fat: 31,  defaultUnit: 'tbsp',  defaultGrams: 12 },
    'sunflower seeds':    { cal: 584, pro: 21,  carb: 20,  fat: 51,  defaultUnit: 'cup',   defaultGrams: 140 },
    'pistachios':         { cal: 562, pro: 20,  carb: 28,  fat: 45,  defaultUnit: 'cup',   defaultGrams: 123 },

    // ── OILS & FATS ──────────────────────────────────────
    'olive oil':          { cal: 884, pro: 0,   carb: 0,   fat: 100, defaultUnit: 'tbsp',  defaultGrams: 14 },
    'coconut oil':        { cal: 862, pro: 0,   carb: 0,   fat: 100, defaultUnit: 'tbsp',  defaultGrams: 14 },
    'sunflower oil':      { cal: 884, pro: 0,   carb: 0,   fat: 100, defaultUnit: 'tbsp',  defaultGrams: 14 },
    'mustard oil':        { cal: 884, pro: 0,   carb: 0,   fat: 100, defaultUnit: 'tbsp',  defaultGrams: 14 },

    // ── BEVERAGES ─────────────────────────────────────────
    'black coffee':       { cal: 2,   pro: 0.3, carb: 0,   fat: 0,   defaultUnit: 'cup',   defaultGrams: 240 },
    'coffee':             { cal: 2,   pro: 0.3, carb: 0,   fat: 0,   defaultUnit: 'cup',   defaultGrams: 240 },
    'green tea':          { cal: 2,   pro: 0,   carb: 0.5, fat: 0,   defaultUnit: 'cup',   defaultGrams: 240 },
    'tea':                { cal: 2,   pro: 0,   carb: 0.5, fat: 0,   defaultUnit: 'cup',   defaultGrams: 240 },
    'chai':               { cal: 60,  pro: 2,   carb: 8,   fat: 2,   defaultUnit: 'cup',   defaultGrams: 200 },
    'orange juice':       { cal: 45,  pro: 0.7, carb: 10,  fat: 0.2, defaultUnit: 'cup',   defaultGrams: 248 },
    'coconut water':      { cal: 19,  pro: 0.7, carb: 3.7, fat: 0.2, defaultUnit: 'cup',   defaultGrams: 240 },

    // ── GYM / AMERICAN FOODS ─────────────────────────────
    'burger':             { cal: 295, pro: 17,  carb: 24,  fat: 14,  defaultUnit: 'piece', defaultGrams: 150 },
    'pizza':              { cal: 266, pro: 11,  carb: 33,  fat: 10,  defaultUnit: 'slice', defaultGrams: 107 },
    'sandwich':           { cal: 252, pro: 12,  carb: 30,  fat: 9,   defaultUnit: 'piece', defaultGrams: 150 },
    'wrap':               { cal: 238, pro: 11,  carb: 30,  fat: 8,   defaultUnit: 'piece', defaultGrams: 150 },
    'hot dog':            { cal: 290, pro: 11,  carb: 23,  fat: 17,  defaultUnit: 'piece', defaultGrams: 100 },
    'steak':              { cal: 271, pro: 26,  carb: 0,   fat: 18,  defaultUnit: 'piece', defaultGrams: 100 },
    'french fries':       { cal: 312, pro: 3.4, carb: 41,  fat: 15,  defaultUnit: 'cup',   defaultGrams: 117 },
    'pancakes':           { cal: 227, pro: 6,   carb: 38,  fat: 6,   defaultUnit: 'piece', defaultGrams: 77 },
    'waffles':            { cal: 291, pro: 8,   carb: 37,  fat: 13,  defaultUnit: 'piece', defaultGrams: 75 },
    'cereal':             { cal: 357, pro: 7.5, carb: 84,  fat: 0.4, defaultUnit: 'cup',   defaultGrams: 28 },
    'protein bar':        { cal: 370, pro: 30,  carb: 40,  fat: 10,  defaultUnit: 'piece', defaultGrams: 60 },
    'energy bar':         { cal: 370, pro: 10,  carb: 55,  fat: 12,  defaultUnit: 'piece', defaultGrams: 60 },
    'rice cake':          { cal: 387, pro: 8,   carb: 81,  fat: 3,   defaultUnit: 'piece', defaultGrams: 9 },
    'hummus':             { cal: 166, pro: 7.9, carb: 14,  fat: 9.6, defaultUnit: 'tbsp',  defaultGrams: 30 },
    'greek yogurt':       { cal: 59,  pro: 10,  carb: 3.6, fat: 0.4, defaultUnit: 'cup',   defaultGrams: 245 },
    'sweet corn':         { cal: 86,  pro: 3.3, carb: 19,  fat: 1.4, defaultUnit: 'cup',   defaultGrams: 154 },
    'black beans':        { cal: 132, pro: 8.9, carb: 24,  fat: 0.5, defaultUnit: 'cup',   defaultGrams: 172 },
    'lentils':            { cal: 116, pro: 9,   carb: 20,  fat: 0.4, defaultUnit: 'cup',   defaultGrams: 198 },
};

// ========================================================
// ========== UNIT CONVERSION HELPERS =====================
// ========================================================

// Standard gram weights for each unit type
const UNIT_GRAM_MAP = {
    'g':       (amt) => amt,
    'gram':    (amt) => amt,
    'grams':   (amt) => amt,
    'kg':      (amt) => amt * 1000,
    'ml':      (amt) => amt,               // approximate for liquids
    'l':       (amt) => amt * 1000,
    'cup':     (amt) => amt * 240,         // standard cup ≈ 240ml/g
    'cups':    (amt) => amt * 240,
    'tbsp':    (amt) => amt * 15,
    'tablespoon': (amt) => amt * 15,
    'tsp':     (amt) => amt * 5,
    'teaspoon': (amt) => amt * 5,
    'bowl':    (amt) => amt * 300,
    'bowls':   (amt) => amt * 300,
    'plate':   (amt) => amt * 350,
    'plates':  (amt) => amt * 350,
    'scoop':   (amt) => amt * 30,
    'scoops':  (amt) => amt * 30,
    'oz':      (amt) => amt * 28.35,
    'lb':      (amt) => amt * 453.6,
    'slice':   null, // handled per-food
    'slices':  null,
    'piece':   null,
    'pieces':  null,
    'pcs':     null,
    'pc':      null,
    // Indian-specific
    'roti':    null,
    'rotis':   null,
    'chapati': null,
    'chapatis':null,
    'egg':     null,
    'eggs':    null,
};

// Parse the user's input like "2 cups rice" or "100g chicken" or "3 boiled eggs"
function parseInput(query) {
    const q = query.toLowerCase().trim();

    // Patterns: "100g chicken", "2 cup oats", "3 eggs", "1 apple", "200 gram salmon"
    const match = q.match(/^(\d+\.?\d*)\s*(g|grams?|kg|ml|l|cups?|tbsp|tablespoons?|tsps?|teaspoons?|bowls?|plates?|scoops?|oz|lb|slices?|pieces?|pcs?|pc|rotis?|chapatis?|eggs?)\s+(.+)$/i)
               || q.match(/^(\d+\.?\d*)\s+(.+)$/i);  // fallback: "2 apple"

    if (match && match.length === 4) {
        return { amount: parseFloat(match[1]), unit: match[2].toLowerCase(), foodName: match[3].trim() };
    } else if (match && match.length === 3) {
        return { amount: parseFloat(match[1]), unit: null, foodName: match[2].trim() };
    }

    // No number? treat as 1 unit of the food
    return { amount: 1, unit: null, foodName: q };
}

// Find best matching food key in local DB
function findLocalFood(name) {
    // exact match first
    if (LOCAL_FOOD_DB[name]) return name;
    // partial match
    const keys = Object.keys(LOCAL_FOOD_DB);
    const exact = keys.find(k => name === k);
    if (exact) return exact;
    const contains = keys.find(k => name.includes(k) || k.includes(name));
    return contains || null;
}

// Calculate grams from amount + unit, using food's defaultGrams if unit is piece/slice etc.
function toGrams(amount, unit, foodKey) {
    const food = LOCAL_FOOD_DB[foodKey];

    if (!unit) {
        // No unit — use the food's default (e.g. "2 apple" → 2 × apple defaultGrams)
        return amount * (food.defaultGrams || 100);
    }

    const unitKey = unit.toLowerCase();

    // Numeric gram-based units
    if (UNIT_GRAM_MAP[unitKey] && UNIT_GRAM_MAP[unitKey] !== null) {
        return UNIT_GRAM_MAP[unitKey](amount);
    }

    // Piece-like units — use food's defaultGrams
    const pieceUnits = ['piece','pieces','pcs','pc','slice','slices','roti','rotis','chapati','chapatis','egg','eggs','scoop','scoops'];
    if (pieceUnits.includes(unitKey)) {
        return amount * (food.defaultGrams || 100);
    }

    // cup/bowl special — use food's defaultGrams if set, else standard
    if (['cup','cups'].includes(unitKey)) {
        return food.defaultUnit === 'cup' && food.defaultGrams
            ? amount * food.defaultGrams
            : amount * 240;
    }

    return amount * (food.defaultGrams || 100);
}

// Calculate nutrition from grams
function calcFromGrams(foodKey, grams) {
    const food = LOCAL_FOOD_DB[foodKey];
    const mult = grams / 100;
    return {
        name: foodKey,
        grams: Math.round(grams),
        calories: Math.round(food.cal * mult),
        protein:  Math.round(food.pro * mult * 10) / 10,
        carbs:    Math.round(food.carb * mult * 10) / 10,
        fat:      Math.round(food.fat * mult * 10) / 10,
    };
}

// ========================================================
// ========== USDA API FETCH ==============================
// ========================================================
async function fetchFromUSDA(query) {
    try {
        const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${USDA_API_KEY}&pageSize=5&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`;
        const res = await fetch(searchUrl);
        if (!res.ok) throw new Error('USDA API error');
        const data = await res.json();

        if (!data.foods || data.foods.length === 0) return null;

        const food = data.foods[0]; // top result
        const nutrients = food.foodNutrients || [];

        const get = (name) => {
            const n = nutrients.find(n => n.nutrientName && n.nutrientName.toLowerCase().includes(name));
            return n ? Math.round(n.value * 10) / 10 : 0;
        };

        return {
            name: food.description,
            source: 'USDA',
            calories: get('energy'),
            protein:  get('protein'),
            carbs:    get('carbohydrate'),
            fat:      get('total lipid'),
            // portions from USDA
            portions: food.foodPortions || []
        };
    } catch (err) {
        console.warn('USDA API failed, falling back to local DB:', err.message);
        return null;
    }
}

// ========================================================
// ========== MAIN fetchNutrition (replaces old one) ======
// ========================================================
async function fetchNutrition(query) {
    if (!query || query.trim() === '') return null;

    const { amount, unit, foodName } = parseInput(query.trim());
    const localKey = findLocalFood(foodName);

    // ── STEP 1: Try local DB first (fast, no API call) ──
    if (localKey) {
        const grams = toGrams(amount, unit, localKey);
        const result = calcFromGrams(localKey, grams);
        result.name = query; // keep user's original input as name
        result.source = 'Local';
        return result;
    }

    // ── STEP 2: Try USDA API ──────────────────────────────
    const usdaData = await fetchFromUSDA(foodName);
    if (usdaData) {
        // Determine grams: if user gave grams use that, else use 100g (USDA values are per 100g)
        let grams = 100;
        if (unit && UNIT_GRAM_MAP[unit] && UNIT_GRAM_MAP[unit] !== null) {
            grams = UNIT_GRAM_MAP[unit](amount);
        } else {
            grams = amount * 100; // treat number as servings of 100g
        }
        const mult = grams / 100;
        return {
            name: query,
            grams: Math.round(grams),
            calories: Math.round(usdaData.calories * mult),
            protein:  Math.round(usdaData.protein * mult * 10) / 10,
            carbs:    Math.round(usdaData.carbs * mult * 10) / 10,
            fat:      Math.round(usdaData.fat * mult * 10) / 10,
            source: 'USDA'
        };
    }

    // ── STEP 3: Nothing found ──────────────────────────────
    return null;
}

// ========================================================
// ========== EXERCISE DATABASE (MET VALUES) ==============
// ========================================================
// MET (Metabolic Equivalent of Task) values from the
// Compendium of Physical Activities (Ainsworth et al.)
// Calories Burned = MET × weight(kg) × duration(hours)
// Grouped by category with display labels and icons.

const EXERCISE_DB = {

    // ── 🚶 WALKING ──────────────────────────────────────
    'walking_slow':           { label: 'Walking (slow, 2 mph)',         met: 2.5,  category: 'Walking',   icon: '🚶' },
    'walking_normal':         { label: 'Walking (normal, 3 mph)',       met: 3.5,  category: 'Walking',   icon: '🚶' },
    'walking_brisk':          { label: 'Walking (brisk, 3.5 mph)',      met: 4.3,  category: 'Walking',   icon: '🚶' },
    'walking_fast':           { label: 'Walking (fast, 4.5 mph)',       met: 5.0,  category: 'Walking',   icon: '🚶' },
    'walking_uphill':         { label: 'Walking uphill',                met: 6.0,  category: 'Walking',   icon: '⛰️' },
    'walking_treadmill':      { label: 'Treadmill walking',             met: 4.0,  category: 'Walking',   icon: '🏃' },
    'hiking':                 { label: 'Hiking / trekking',             met: 6.0,  category: 'Walking',   icon: '🥾' },
    'stair_climbing':         { label: 'Stair climbing',                met: 8.0,  category: 'Walking',   icon: '🪜' },

    // ── 🏃 RUNNING ──────────────────────────────────────
    'running_5k':             { label: 'Running (5 km/h jog)',          met: 7.0,  category: 'Running',   icon: '🏃' },
    'running_6k':             { label: 'Running (6 km/h)',              met: 8.3,  category: 'Running',   icon: '🏃' },
    'running_8k':             { label: 'Running (8 km/h)',              met: 9.8,  category: 'Running',   icon: '🏃' },
    'running_10k':            { label: 'Running (10 km/h)',             met: 11.0, category: 'Running',   icon: '🏃' },
    'running_12k':            { label: 'Running (12 km/h, fast)',       met: 13.0, category: 'Running',   icon: '🏃' },
    'running_sprint':         { label: 'Sprinting (>14 km/h)',          met: 16.0, category: 'Running',   icon: '⚡' },
    'running_treadmill':      { label: 'Treadmill running',             met: 9.8,  category: 'Running',   icon: '🏃' },
    'running_incline':        { label: 'Treadmill incline run',         met: 11.0, category: 'Running',   icon: '🏔️' },
    'marathon_pace':          { label: 'Marathon pace running',         met: 13.5, category: 'Running',   icon: '🏅' },

    // ── 🚴 CYCLING ──────────────────────────────────────
    'cycling_leisure':        { label: 'Cycling (leisure, <16 km/h)',   met: 4.0,  category: 'Cycling',   icon: '🚴' },
    'cycling_moderate':       { label: 'Cycling (moderate, 19–22 km/h)',met: 8.0,  category: 'Cycling',   icon: '🚴' },
    'cycling_vigorous':       { label: 'Cycling (vigorous, 22–25 km/h)',met: 10.0, category: 'Cycling',   icon: '🚴' },
    'cycling_racing':         { label: 'Cycling (racing, >30 km/h)',    met: 16.0, category: 'Cycling',   icon: '🏆' },
    'cycling_stationary':     { label: 'Stationary bike (moderate)',    met: 7.0,  category: 'Cycling',   icon: '🚲' },
    'cycling_stationary_hard':{ label: 'Stationary bike (vigorous)',    met: 10.5, category: 'Cycling',   icon: '🚲' },
    'spinning':               { label: 'Spinning class',                met: 10.5, category: 'Cycling',   icon: '🔄' },

    // ── 🏋️ GYM / WEIGHT TRAINING ────────────────────────
    'gym_general':            { label: 'Gym (general workout)',         met: 5.5,  category: 'Gym',       icon: '🏋️' },
    'weight_training_light':  { label: 'Weight training (light)',       met: 3.5,  category: 'Gym',       icon: '🏋️' },
    'weight_training_moderate':{ label: 'Weight training (moderate)',   met: 5.0,  category: 'Gym',       icon: '🏋️' },
    'weight_training_heavy':  { label: 'Weight training (heavy/power)', met: 6.0,  category: 'Gym',       icon: '🏋️' },
    'powerlifting':           { label: 'Powerlifting',                  met: 6.0,  category: 'Gym',       icon: '🏋️' },
    'bodybuilding':           { label: 'Bodybuilding (hard effort)',     met: 6.0,  category: 'Gym',       icon: '💪' },
    'bench_press':            { label: 'Bench press',                   met: 5.0,  category: 'Gym',       icon: '🏋️' },
    'deadlift':               { label: 'Deadlift',                      met: 6.0,  category: 'Gym',       icon: '🏋️' },
    'squats':                 { label: 'Squats (barbell)',               met: 5.5,  category: 'Gym',       icon: '🦵' },
    'pull_ups':               { label: 'Pull-ups / Chin-ups',           met: 8.0,  category: 'Gym',       icon: '💪' },
    'push_ups':               { label: 'Push-ups',                      met: 8.0,  category: 'Gym',       icon: '💪' },
    'dips':                   { label: 'Dips (tricep / chest)',          met: 6.5,  category: 'Gym',       icon: '💪' },
    'lunges':                 { label: 'Lunges',                        met: 5.0,  category: 'Gym',       icon: '🦵' },
    'plank':                  { label: 'Plank (static hold)',            met: 4.0,  category: 'Gym',       icon: '🧱' },
    'abs_core':               { label: 'Abs / Core workout',            met: 4.5,  category: 'Gym',       icon: '🔥' },
    'circuit_training':       { label: 'Circuit training',              met: 8.0,  category: 'Gym',       icon: '⚡' },
    'functional_training':    { label: 'Functional fitness training',   met: 7.0,  category: 'Gym',       icon: '🏅' },
    'crossfit':               { label: 'CrossFit / WOD',                met: 10.0, category: 'Gym',       icon: '🔥' },
    'kettlebell':             { label: 'Kettlebell training',           met: 9.0,  category: 'Gym',       icon: '⚾' },
    'battle_ropes':           { label: 'Battle ropes',                  met: 10.0, category: 'Gym',       icon: '🌊' },
    'box_jumps':              { label: 'Box jumps / Plyometrics',       met: 10.0, category: 'Gym',       icon: '📦' },
    'rowing_machine':         { label: 'Rowing machine (moderate)',     met: 7.0,  category: 'Gym',       icon: '🚣' },
    'rowing_machine_hard':    { label: 'Rowing machine (vigorous)',     met: 12.0, category: 'Gym',       icon: '🚣' },
    'elliptical':             { label: 'Elliptical trainer (moderate)', met: 5.0,  category: 'Gym',       icon: '🔄' },
    'elliptical_hard':        { label: 'Elliptical trainer (vigorous)', met: 8.0,  category: 'Gym',       icon: '🔄' },
    'stair_master':           { label: 'StairMaster / Step mill',       met: 9.0,  category: 'Gym',       icon: '🪜' },
    'cable_machine':          { label: 'Cable machine exercises',       met: 4.5,  category: 'Gym',       icon: '🏋️' },
    'resistance_bands':       { label: 'Resistance band training',      met: 3.5,  category: 'Gym',       icon: '🏋️' },

    // ── 🔥 HIIT & CARDIO ─────────────────────────────────
    'hiit':                   { label: 'HIIT (general)',                 met: 10.0, category: 'HIIT',      icon: '🔥' },
    'hiit_intense':           { label: 'HIIT (intense)',                 met: 12.0, category: 'HIIT',      icon: '🔥' },
    'tabata':                 { label: 'Tabata training',                met: 13.0, category: 'HIIT',      icon: '⏱️' },
    'burpees':                { label: 'Burpees',                        met: 10.0, category: 'HIIT',      icon: '🔥' },
    'jump_rope':              { label: 'Jump rope / Skipping',           met: 11.8, category: 'HIIT',      icon: '🪢' },
    'jumping_jacks':          { label: 'Jumping jacks',                  met: 8.0,  category: 'HIIT',      icon: '⭐' },
    'mountain_climbers':      { label: 'Mountain climbers',              met: 8.0,  category: 'HIIT',      icon: '⛰️' },
    'aerobics_low':           { label: 'Aerobics (low impact)',          met: 5.0,  category: 'HIIT',      icon: '🕺' },
    'aerobics_high':          { label: 'Aerobics (high impact)',         met: 7.3,  category: 'HIIT',      icon: '🕺' },
    'zumba':                  { label: 'Zumba / Dance fitness',          met: 6.5,  category: 'HIIT',      icon: '💃' },

    // ── 🏊 SWIMMING ──────────────────────────────────────
    'swimming_leisure':       { label: 'Swimming (leisure)',             met: 6.0,  category: 'Swimming',  icon: '🏊' },
    'swimming_moderate':      { label: 'Swimming (moderate laps)',       met: 8.0,  category: 'Swimming',  icon: '🏊' },
    'swimming_fast':          { label: 'Swimming (fast / vigorous)',     met: 10.0, category: 'Swimming',  icon: '🏊' },
    'freestyle_swim':         { label: 'Freestyle (front crawl)',        met: 9.0,  category: 'Swimming',  icon: '🏊' },
    'breaststroke':           { label: 'Breaststroke',                   met: 10.3, category: 'Swimming',  icon: '🏊' },
    'backstroke':             { label: 'Backstroke',                     met: 8.0,  category: 'Swimming',  icon: '🏊' },
    'butterfly_stroke':       { label: 'Butterfly stroke',               met: 13.8, category: 'Swimming',  icon: '🦋' },
    'water_aerobics':         { label: 'Water aerobics',                 met: 5.5,  category: 'Swimming',  icon: '💧' },

    // ── 🧘 YOGA & FLEXIBILITY ────────────────────────────
    'yoga_hatha':             { label: 'Yoga (Hatha, gentle)',           met: 2.5,  category: 'Yoga',      icon: '🧘' },
    'yoga_vinyasa':           { label: 'Yoga (Vinyasa / flow)',          met: 4.0,  category: 'Yoga',      icon: '🧘' },
    'yoga_power':             { label: 'Yoga (Power yoga)',              met: 5.0,  category: 'Yoga',      icon: '🧘' },
    'yoga_ashtanga':          { label: 'Yoga (Ashtanga)',                met: 5.0,  category: 'Yoga',      icon: '🧘' },
    'yoga_bikram':            { label: 'Bikram / Hot yoga',              met: 5.0,  category: 'Yoga',      icon: '🌡️' },
    'stretching':             { label: 'Stretching (general)',           met: 2.3,  category: 'Yoga',      icon: '🤸' },
    'pilates':                { label: 'Pilates',                        met: 3.5,  category: 'Yoga',      icon: '🤸' },
    'tai_chi':                { label: 'Tai chi',                        met: 3.0,  category: 'Yoga',      icon: '☯️' },
    'meditation':             { label: 'Meditation (light movement)',    met: 1.5,  category: 'Yoga',      icon: '🙏' },
    'foam_rolling':           { label: 'Foam rolling / recovery',       met: 2.0,  category: 'Yoga',      icon: '🔵' },

    // ── ⚽ SPORTS ─────────────────────────────────────────
    'football':               { label: 'Football / Soccer',             met: 10.0, category: 'Sports',    icon: '⚽' },
    'cricket':                { label: 'Cricket (batting/bowling)',      met: 5.0,  category: 'Sports',    icon: '🏏' },
    'cricket_fielding':       { label: 'Cricket (fielding)',             met: 3.5,  category: 'Sports',    icon: '🏏' },
    'basketball':             { label: 'Basketball',                     met: 8.0,  category: 'Sports',    icon: '🏀' },
    'badminton':              { label: 'Badminton',                      met: 5.5,  category: 'Sports',    icon: '🏸' },
    'tennis':                 { label: 'Tennis (singles)',               met: 8.0,  category: 'Sports',    icon: '🎾' },
    'tennis_doubles':         { label: 'Tennis (doubles)',               met: 6.0,  category: 'Sports',    icon: '🎾' },
    'table_tennis':           { label: 'Table tennis / Ping pong',       met: 4.0,  category: 'Sports',    icon: '🏓' },
    'volleyball':             { label: 'Volleyball',                     met: 4.0,  category: 'Sports',    icon: '🏐' },
    'kabaddi':                { label: 'Kabaddi',                        met: 8.0,  category: 'Sports',    icon: '🤼' },
    'kho_kho':                { label: 'Kho Kho',                       met: 7.0,  category: 'Sports',    icon: '🏃' },
    'hockey':                 { label: 'Field hockey',                   met: 8.0,  category: 'Sports',    icon: '🏑' },
    'boxing':                 { label: 'Boxing (sparring)',              met: 12.8, category: 'Sports',    icon: '🥊' },
    'boxing_bag':             { label: 'Boxing (heavy bag)',             met: 9.0,  category: 'Sports',    icon: '🥊' },
    'wrestling':              { label: 'Wrestling',                      met: 8.0,  category: 'Sports',    icon: '🤼' },
    'martial_arts':           { label: 'Martial arts (karate/judo)',     met: 10.0, category: 'Sports',    icon: '🥋' },
    'mma':                    { label: 'MMA / BJJ training',             met: 10.5, category: 'Sports',    icon: '🥋' },

    // ── 🏃 OUTDOOR / ADVENTURE ───────────────────────────
    'rock_climbing':          { label: 'Rock climbing',                  met: 8.0,  category: 'Outdoor',   icon: '🧗' },
    'skiing':                 { label: 'Skiing (downhill)',              met: 7.0,  category: 'Outdoor',   icon: '⛷️' },
    'skating':                { label: 'Skating / Rollerblading',        met: 7.0,  category: 'Outdoor',   icon: '⛸️' },
    'kayaking':               { label: 'Kayaking',                       met: 5.0,  category: 'Outdoor',   icon: '🛶' },
    'rowing_outdoor':         { label: 'Rowing (outdoor)',               met: 12.0, category: 'Outdoor',   icon: '🚣' },
    'surfing':                { label: 'Surfing',                        met: 3.0,  category: 'Outdoor',   icon: '🏄' },

    // ── 🏠 HOME / BODYWEIGHT ─────────────────────────────
    'bodyweight_general':     { label: 'Bodyweight workout (general)',   met: 5.0,  category: 'Home',      icon: '🏠' },
    'calisthenics':           { label: 'Calisthenics',                   met: 8.0,  category: 'Home',      icon: '💪' },
    'yoga_at_home':           { label: 'Home yoga / stretching',         met: 2.5,  category: 'Home',      icon: '🏠' },
    'cleaning_vigorous':      { label: 'Vigorous cleaning / mopping',    met: 3.5,  category: 'Home',      icon: '🧹' },
    'dancing':                { label: 'Dancing (general)',              met: 5.0,  category: 'Home',      icon: '💃' },
};

// ── Helper: get all unique categories ──────────────────
function getExerciseCategories() {
    const cats = [...new Set(Object.values(EXERCISE_DB).map(e => e.category))];
    return cats;
}

// ── Helper: get exercises for a category ───────────────
function getExercisesByCategory(category) {
    return Object.entries(EXERCISE_DB)
        .filter(([, v]) => v.category === category)
        .map(([key, v]) => ({ key, ...v }));
}

// ── Main calorie burn calculation ──────────────────────
function calculateCaloriesBurned(activityKey, durationMinutes, weightKg) {
    const exercise = EXERCISE_DB[activityKey];
    const met = exercise ? exercise.met : 5.0;
    const hours = durationMinutes / 60;
    return Math.round(met * weightKg * hours);
}

// ── Get display label for an activity key ──────────────
function getExerciseLabel(activityKey) {
    return EXERCISE_DB[activityKey]?.label || activityKey;
}

// ── Get icon for an activity key ───────────────────────
function getExerciseIcon(activityKey) {
    return EXERCISE_DB[activityKey]?.icon || '🏃';
}

// ── Populate the exercise dropdown (call on DOM ready) ──
function populateExerciseDropdown() {
    const select = document.getElementById('activityType');
    if (!select) return;

    select.innerHTML = ''; // clear old options

    const categories = getExerciseCategories();
    categories.forEach(cat => {
        const group = document.createElement('optgroup');
        group.label = cat;

        const exercises = getExercisesByCategory(cat);
        exercises.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.key;
            option.textContent = `${ex.icon} ${ex.label}`;
            group.appendChild(option);
        });

        select.appendChild(group);
    });
}

// ========== GOAL PREDICTION ==========
function calculateDaysToGoal(currentWeight, targetWeight, dailyDeficit) {
    const weightDifference = Math.abs(currentWeight - targetWeight);
    const caloriesNeeded = weightDifference * 7700;

    if (dailyDeficit <= 0) {
        return { days: null, date: null, message: "Keep tracking to see your prediction!" };
    }

    const daysNeeded = Math.ceil(caloriesNeeded / dailyDeficit);
    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + daysNeeded);

    return {
        days: daysNeeded,
        date: goalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        message: null
    };
}

// ========== CHART FUNCTIONS ==========
function getLast7DaysData() {
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const dayData = JSON.parse(localStorage.getItem(`dailyLog_${dateKey}`) || '{}');
        data.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            caloriesIn: dayData.caloriesEaten || 0,
            caloriesOut: dayData.caloriesBurned || 0
        });
    }
    return data;
}

function initChart() {
    const weeklyData = getLast7DaysData();
    const ctx = document.getElementById('weeklyChart').getContext('2d');

    if (weeklyChart) weeklyChart.destroy();

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeklyData.map(d => d.date),
            datasets: [
                {
                    label: 'Calories In',
                    data: weeklyData.map(d => d.caloriesIn),
                    backgroundColor: '#10b981',
                    borderRadius: 8
                },
                {
                    label: 'Calories Out',
                    data: weeklyData.map(d => d.caloriesOut),
                    backgroundColor: '#ef4444',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1000, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
                        font: { size: 12, weight: '600' }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() },
                    grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() }
                },
                x: {
                    ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() },
                    grid: { display: false }
                }
            }
        }
    });
}

// ========== DASHBOARD UPDATE ==========
function updateDashboard() {
    if (!userProfile) return;

    const log = getTodayLog();

    document.getElementById('maintenanceCalories').textContent = userProfile.TDEE;
    document.getElementById('recommendedCalories').textContent = userProfile.dailyTarget;
    const deficit = userProfile.TDEE - userProfile.dailyTarget;
    document.getElementById('dailyDeficit').textContent = deficit > 0 ? `-${deficit}` : `+${Math.abs(deficit)}`;

    document.getElementById('caloriesEaten').textContent = log.caloriesEaten;
    document.getElementById('caloriesBurned').textContent = log.caloriesBurned;
    document.getElementById('netCalories').textContent = log.caloriesEaten - log.caloriesBurned;
    document.getElementById('targetCalories').textContent = userProfile.dailyTarget;

    const dailyDeficit = userProfile.TDEE - (log.caloriesEaten - log.caloriesBurned);
    const prediction = calculateDaysToGoal(userProfile.currentWeight, userProfile.targetWeight, dailyDeficit);

    const predictionEl = document.getElementById('predictionText');
    if (prediction.message) {
        predictionEl.textContent = prediction.message;
        document.getElementById('daysToGoal').textContent = '--';
    } else {
        predictionEl.innerHTML = `At your current pace, you will reach <strong>${userProfile.targetWeight}kg</strong> on <strong>${prediction.date}</strong> (in ${prediction.days} days)`;
        document.getElementById('daysToGoal').textContent = prediction.days;
    }

    updateFoodList();
    updateExerciseList();
    initChart();
}

function updateFoodList() {
    const log = getTodayLog();
    const foodList = document.getElementById('foodList');

    if (log.foods.length === 0) {
        foodList.innerHTML = `<div class="empty-state"><i class="fas fa-utensils"></i><p>No meals logged yet</p></div>`;
        return;
    }

    foodList.innerHTML = log.foods.map(food => `
        <div class="log-item">
            <div class="log-item-info">
                <div class="log-item-name">${food.name}</div>
                <div class="log-item-calories">
                    <span class="cal-value">${food.calories}</span> cal
                    ${food.protein ? ` • ${food.protein}g protein` : ''}
                    ${food.grams ? ` • ${food.grams}g` : ''}
                </div>
            </div>
            <button class="delete-btn" onclick="deleteFood('${food.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function updateExerciseList() {
    const log = getTodayLog();
    const exerciseList = document.getElementById('exerciseList');

    if (log.exercises.length === 0) {
        exerciseList.innerHTML = `<div class="empty-state"><i class="fas fa-running"></i><p>No activities logged yet</p></div>`;
        return;
    }

    exerciseList.innerHTML = log.exercises.map(exercise => `
        <div class="log-item">
            <div class="log-item-info">
                <div class="log-item-name">${getExerciseIcon(exercise.activity)} ${getExerciseLabel(exercise.activity)}</div>
                <div class="log-item-calories">${exercise.duration} min • <span class="cal-value">${exercise.caloriesBurned}</span> cal burned • MET ${EXERCISE_DB[exercise.activity]?.met ?? '~5'}</div>
            </div>
            <button class="delete-btn" onclick="deleteExercise('${exercise.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// ========== ADD FOOD ==========
async function addFood() {
    const input = document.getElementById('foodInput');
    const query = input.value.trim();

    if (!query) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 300);
        return;
    }

    const btn = document.getElementById('addFoodBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        const foodData = await fetchNutrition(query);

        if (!foodData) {
            alert('Food not found.\n\nTry formats like:\n• "100g chicken breast"\n• "2 roti"\n• "1 cup dal"\n• "3 boiled eggs"\n• "1 apple"\n• "200g steamed broccoli"\n• "1 cup greek yogurt"\n• "2 slice brown bread"');
            return;
        }

        const log = getTodayLog();
        const newFood = {
            id: `f${Date.now()}`,
            ...foodData,
            timestamp: new Date().toISOString()
        };

        log.foods.push(newFood);
        log.caloriesEaten += foodData.calories;
        log.proteinConsumed += foodData.protein || 0;
        log.netCalories = log.caloriesEaten - log.caloriesBurned;

        saveTodayLog(log);
        updateDashboard();
        input.value = '';
    } catch (error) {
        console.error('Error adding food:', error);
        alert('Failed to add food. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Add Food';
    }
}

// ========== ADD EXERCISE ==========
function addExercise() {
    const activityType = document.getElementById('activityType').value;
    const duration = parseInt(document.getElementById('exerciseDuration').value);

    if (!duration || duration <= 0) {
        const input = document.getElementById('exerciseDuration');
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 300);
        return;
    }

    const caloriesBurned = calculateCaloriesBurned(activityType, duration, userProfile.currentWeight);

    const log = getTodayLog();
    const newExercise = {
        id: `e${Date.now()}`,
        activity: activityType,
        duration: duration,
        caloriesBurned: caloriesBurned,
        timestamp: new Date().toISOString()
    };

    log.exercises.push(newExercise);
    log.caloriesBurned += caloriesBurned;
    log.netCalories = log.caloriesEaten - log.caloriesBurned;

    saveTodayLog(log);
    updateDashboard();
    document.getElementById('exerciseDuration').value = '';
}

// ========== DELETE FUNCTIONS ==========
function deleteFood(id) {
    const log = getTodayLog();
    const food = log.foods.find(f => f.id === id);

    if (food) {
        log.caloriesEaten -= food.calories;
        log.proteinConsumed -= food.protein || 0;
        log.foods = log.foods.filter(f => f.id !== id);
        log.netCalories = log.caloriesEaten - log.caloriesBurned;
        saveTodayLog(log);
        updateDashboard();
    }
}

function deleteExercise(id) {
    const log = getTodayLog();
    const exercise = log.exercises.find(e => e.id === id);

    if (exercise) {
        log.caloriesBurned -= exercise.caloriesBurned;
        log.exercises = log.exercises.filter(e => e.id !== id);
        log.netCalories = log.caloriesEaten - log.caloriesBurned;
        saveTodayLog(log);
        updateDashboard();
    }
}

// ========== ONBOARDING ==========
document.getElementById('onboardingForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('userName').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const age = parseInt(document.getElementById('userAge').value);
    const height = parseInt(document.getElementById('userHeight').value);
    const currentWeight = parseFloat(document.getElementById('currentWeight').value);
    const targetWeight = parseFloat(document.getElementById('targetWeight').value);
    const activityLevel = document.getElementById('activityLevel').value;
    const goal = document.querySelector('input[name="goal"]:checked').value;

    const bmr = calculateBMR(gender, currentWeight, height, age);
    const tdee = calculateTDEE(bmr, activityLevel);
    const dailyTarget = calculateDailyTarget(tdee, goal);
    const proteinTarget = Math.round(currentWeight * 2);

    userProfile = {
        name, gender, age, height, currentWeight, targetWeight,
        activityLevel, goal,
        BMR: Math.round(bmr), TDEE: tdee, dailyTarget, proteinTarget,
        startDate: new Date().toISOString()
    };

    saveProfile();

    document.getElementById('onboardingModal').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    updateDashboard();
    document.getElementById('onboardingForm').reset();
});

// ========== THEME TOGGLE ==========
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';

if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.classList.add('active');
    themeToggle.querySelector('.theme-toggle-icon').className = 'fas fa-moon theme-toggle-icon';
}

themeToggle.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    this.classList.toggle('active');
    const icon = this.querySelector('.theme-toggle-icon');
    icon.className = newTheme === 'dark' ? 'fas fa-moon theme-toggle-icon' : 'fas fa-sun theme-toggle-icon';

    if (weeklyChart) setTimeout(initChart, 300);
});

// ========== EVENT LISTENERS ==========
document.getElementById('addFoodBtn').addEventListener('click', addFood);
document.getElementById('foodInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addFood();
});
document.getElementById('addExerciseBtn').addEventListener('click', addExercise);

// ========== INITIALIZATION ==========
window.addEventListener('DOMContentLoaded', function() {
    loadProfile();
    populateExerciseDropdown();

    if (userProfile) {
        document.getElementById('onboardingModal').classList.remove('active');
        document.getElementById('dashboard').classList.add('active');
        updateDashboard();
    }
});
