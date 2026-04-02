const { Solar } = require('lunar-javascript');

/**
 * 实时获取高德天气数据
 * @param {string} adcode 城市行政区划代码
 */
async function getLiveWeather(adcode) {
    try {
        const amapKey = "ce237825915cd4d2837264fdcf0298bc";
        const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${amapKey}&city=${adcode}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data && data.status === "1" && data.lives && data.lives.length > 0) {
            const live = data.lives[0];
            return {
                weather: live.weather,
                temperature: live.temperature + "℃",
                humidity: live.humidity + "%"
            };
        }
    } catch (e) {
        console.error("Amap Weather API failed:", e);
    }
    return {
        weather: "未知 (API异常)",
        temperature: "--℃",
        humidity: "--%"
    };
}

/**
 * 真实天文计算：基于 lunar-javascript 的精确节气
 */
function getSolarTerm() {
    try {
        const solar = Solar.fromDate(new Date());
        const lunar = solar.getLunar();
        const prev = lunar.getPrevJieQi(true); 
        const next = lunar.getNextJieQi(false); 
        return `${prev.getName()} (下一个节气 ${next.getName()} 将于 ${next.getSolar().toYmd()} 到来)`;
    } catch (err) {
        console.error("Solar Term Calculation Error:", err);
        return "未知";
    }
}

module.exports = {
    getLiveWeather,
    getSolarTerm
};
