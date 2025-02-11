const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;
const moment = require('moment-timezone');
const axios = require('axios');
const schedule = require('node-schedule');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const stocks = [
    "AXISBANK.NS", "AUBANK.NS", "BANDHANBNK.NS", "BANKBARODA.NS", "BANKINDIA.NS",
    "CANBK.NS", "CUB.NS", "FEDERALBNK.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "IDFCFIRSTB.NS", "INDUSINDBK.NS", "KOTAKBANK.NS", "PNB.NS", "RBLBANK.NS",
    "SBIN.NS", "YESBANK.NS"
];

const PREVIOUS_DAY_API = "https://previous-day-high-production.up.railway.app/stocks";
let lastInsideBarsData = null;

// Function to fetch inside bar stocks
const fetchHourlyCandleData = async () => {
    const now = moment().tz("Asia/Kolkata");
    const end = now.clone().startOf('hour');
    const start = end.clone().subtract(2, 'hour');

    let insideBars = [];

    try {
        const prevDayResponse = await axios.get(PREVIOUS_DAY_API);
        const prevDayData = prevDayResponse.data;

        for (const stock of stocks) {
            try {
                const result = await yahooFinance.chart(stock, {
                    period1: start.toISOString(),
                    period2: end.toISOString(),
                    interval: '1h'
                });

                if (!result || !result.quotes || result.quotes.length < 2) {
                    console.log(`⚠️ Not enough candles for ${stock}`);
                    insideBars.push({ symbol: stock, isInsideBar: false });
                    continue;
                }

                const candles = result.quotes.slice(-2);
                const motherCandle = candles[0];
                const babyCandle = candles[1];

                const isInsideBar = babyCandle.high <= motherCandle.high && babyCandle.low >= motherCandle.low;

                // Get previous day's high and low
                const prevDayStock = prevDayData.find(item => item.symbol === stock);
                const prevDayHigh = prevDayStock ? prevDayStock.high : null;
                const prevDayLow = prevDayStock ? prevDayStock.low : null;

                let type = "Neutral Inside Bar";
                if (isInsideBar && prevDayHigh !== null && prevDayLow !== null) {
                    if (motherCandle.high > prevDayHigh) type = "Bullish Inside Bar";
                    else if (motherCandle.low < prevDayLow) type = "Bearish Inside Bar";
                }

                let motherCandleChange = ((motherCandle.close - motherCandle.open) / motherCandle.open) * 100;

                insideBars.push({
                    symbol: stock,
                    isInsideBar,
                    type: isInsideBar ? type : "N/A",
                    motherCandle: {
                        timestamp: moment(motherCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                        high: motherCandle.high,
                        low: motherCandle.low,
                        change: motherCandleChange.toFixed(2) + "%"
                    },
                    babyCandle: {
                        timestamp: moment(babyCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                        high: babyCandle.high,
                        low: babyCandle.low
                    },
                    prevDay: {
                        high: prevDayHigh,
                        low: prevDayLow
                    }
                });
            } catch (error) {
                console.error(`❌ Error fetching data for ${stock}:`, error.message);
                insideBars.push({ symbol: stock, isInsideBar: false });
            }
        }
    } catch (error) {
        console.error("❌ Error fetching previous day data:", error.message);
    }

    lastInsideBarsData = insideBars;
    return insideBars;
};

// Schedule task at 11:17, 12:17, 13:17, 14:17, 15:17
const scheduleTimes = ['17 11 * * *', '17 12 * * *', '17 13 * * *', '17 14 * * *', '17 15 * * *'];
scheduleTimes.forEach(time => {
    schedule.scheduleJob(time, async () => {
        console.log(`🔄 Fetching inside bars at ${moment().tz("Asia/Kolkata").format("HH:mm")}`);
        await fetchHourlyCandleData();
    });
});

// API Route
app.get('/inside-bars', async (req, res) => {
    if (!lastInsideBarsData) {
        await fetchHourlyCandleData();
    }
    res.json(lastInsideBarsData);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

