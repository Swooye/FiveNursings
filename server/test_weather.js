const axios = require('axios');

async function testWeather(adcode) {
    const amapKey = "ce237825915cd4d2837264fdcf0298bc";
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${amapKey}&city=${adcode}`;
    console.log(`Testing URL: ${url}`);
    try {
        const res = await axios.get(url);
        console.log("Response Status:", res.data.status);
        console.log("Response Info:", res.data.info);
        if (res.data.lives) {
            console.log("Weather Data:", res.data.lives[0]);
        } else {
            console.log("Full Data:", JSON.stringify(res.data, null, 2));
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

// Test with Shanghai (310000) and Hangzhou Xihu (330106)
testWeather("310000");
testWeather("330106");
