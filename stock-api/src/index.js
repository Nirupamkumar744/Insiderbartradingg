const express = require('express');
const cors = require('cors');
const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;
const moment = require('moment-timezone');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const stocks = [
    "AXISBANK.NS", "AUBANK.NS", "BANDHANBNK.NS", "BANKBARODA.NS", "BANKINDIA.NS",
    "CANBK.NS", "CUB.NS", "FEDERALBNK.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "IDFCFIRSTB.NS", "INDUSINDBK.NS", "KOTAKBANK.NS", "PNB.NS", "RBLBANK.NS",
    "SBIN.NS", "YESBANK.NS", "ABCAPITAL.NS", "ANGELONE.NS", "BAJFINANCE.NS",
    "BAJAJFINSV.NS", "CANFINHOME.NS", "CHOLAFIN.NS", "HDFCAMC.NS", "HDFCLIFE.NS",
    "ICICIGI.NS", "ICICIPRULI.NS", "LICIHSGFIN.NS", "M&MFIN.NS", "MANAPPURAM.NS",
    "MUTHOOTFIN.NS", "PEL.NS", "PFC.NS", "POONAWALLA.NS", "RECLTD.NS", "SBICARD.NS",
    "SBILIFE.NS", "SHRIRAMFIN.NS", "ADANIGREEN.NS", "ADANIPORTS.NS", "BPCL.NS",
    "GAIL.NS", "GUJGASLTD.NS", "IGL.NS", "IOC.NS", "MGL.NS", "NTPC.NS", "OIL.NS",
    "ONGC.NS", "PETRONET.NS", "POWERGRID.NS", "RELIANCE.NS", "SJVN.NS", "TATAPOWER.NS",
    "ADANIENSOL.NS", "NHPC.NS", "ACC.NS", "AMBUJACEM.NS", "DALBHARAT.NS", "JKCEMENT.NS",
    "RAMCOCEM.NS", "SHREECEM.NS", "ULTRACEMCO.NS", "APLAPOLLO.NS", "HINDALCO.NS",
    "HINDCOPPER.NS", "JINDALSTEL.NS", "JSWSTEEL.NS", "NATIONALUM.NS", "NMDC.NS",
    "SAIL.NS", "TATASTEEL.NS", "VEDL.NS", "BSOFT.NS", "COFORGE.NS", "CYIENT.NS",
    "INFY.NS", "LTIM.NS", "LTTS.NS", "MPHASIS.NS", "PERSISTENT.NS", "TATAELXSI.NS",
    "TCS.NS", "TECHM.NS", "WIPRO.NS", "ASHOKLEY.NS", "BAJAJ-AUTO.NS", "BHARATFORG.NS",
    "EICHERMOT.NS", "HEROMOTOCO.NS", "M&M.NS", "MARUTI.NS", "MOTHERSON.NS",
    "TATAMOTORS.NS", "TVSMOTOR.NS", "ABFRL.NS", "DMART.NS", "NYKAA.NS", "PAGEIND.NS",
    "PAYTM.NS", "TRENT.NS", "VBL.NS", "ZOMATO.NS", "ASIANPAINT.NS", "BERGEPAINT.NS",
    "BRITANNIA.NS", "COLPAL.NS", "DABUR.NS", "GODREJCP.NS", "HINDUNILVR.NS",
    "ITC.NS", "MARICO.NS", "NESTLEIND.NS", "TATACONSUM.NS", "UBL.NS", "UNITEDSPR.NS", 
    "ALKEM.NS", "APLLTD.NS", "AUROPHARMA.NS", "BIOCON.NS", "CIPLA.NS",
    "DIVISLAB.NS", "DRREDDY.NS", "GLENMARK.NS", "GRANULES.NS", "LAURUSLABS.NS", "LUPIN.NS",
    "SUNPHARMA.NS", "SYNGENE.NS", "TORNTPHARM.NS", "APOLLOHOSP.NS", "LALPATHLAB.NS",
    "MAXHEALTH.NS", "METROPOLIS.NS", "BHARTIARTL.NS", "HFCL.NS", "IDEA.NS", "INDUSTOWER.NS",
    "DLF.NS", "GODREJPROP.NS", "LODHA.NS", "OBEROIRLTY.NS", "PRESTIGE.NS", "GUJGASLTD.NS",
    "IGL.NS", "MGL.NS", "CONCOR.NS", "CESC.NS", "HUDCO.NS", "IRFC.NS", "ABBOTINDIA.NS",
    "BEL.NS", "CGPOWER.NS", "CUMMINSIND.NS", "HAL.NS", "L&T.NS", "SIEMENS.NS", "TIINDIA.NS",
    "CHAMBLFERT.NS", "COROMANDEL.NS", "GNFC.NS", "PIIND.NS", "BSE.NS", "DELHIVERY.NS",
    "GMRAIRPORT.NS", "IRCTC.NS", "KEI.NS", "NAVINFLUOR.NS", "POLYCAB.NS", "SUNTV.NS", "UPL.NS"
];

// Store previous day's high and low in memory
let previousDayData = {};

// Fetch previous day's high & low
const fetchPreviousDayHighLow = async () => {
    try {
        console.log("🔄 Fetching previous day's high & low...");
        const response = await axios.get('https://previous-day-high-production.up.railway.app/stocks');
        const data = response.data;
        previousDayData = {}; // Clear previous data

        data.forEach(stock => {
            previousDayData[stock.symbol] = {
                high: stock.high,
                low: stock.low
            };
        });

        console.log("✅ Previous day high & low fetched successfully.");
    } catch (error) {
        console.error("❌ Error fetching previous day's high & low:", error.message);
    }
};

// Schedule the fetching of previous day's high & low at 9:30 AM every day
cron.schedule('30 9 * * *', () => {
    fetchPreviousDayHighLow();
});

// Fetch last two hourly candles (Completed for manual, Latest for scheduled)
const fetchHourlyCandleData = async (manualRun = false) => {
    const now = moment().tz("Asia/Kolkata");
    const end = manualRun ? now.clone().subtract(1, 'hour').startOf('hour') : now.clone().startOf('hour');
    const start = end.clone().subtract(2, 'hour');

    let candleData = {};

    for (const stock of stocks) {
        try {
            const result = await yahooFinance.chart(stock, {
                period1: start.toISOString(),
                period2: end.toISOString(),
                interval: '1h'
            });

            if (!result || !result.quotes || result.quotes.length < 2) {
                console.log(`⚠️ Not enough candles for ${stock}`);
                continue;
            }

            const candles = result.quotes;
            let motherCandle = candles[candles.length - 2];
            let babyCandle = candles[candles.length - 1];

            candleData[stock] = {
                motherCandle: {
                    timestamp: moment(motherCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                    high: motherCandle.high,
                    low: motherCandle.low
                },
                babyCandle: {
                    timestamp: moment(babyCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                    high: babyCandle.high,
                    low: babyCandle.low
                }
            };
        } catch (error) {
            console.error(`❌ Error fetching data for ${stock}:`, error.message);
        }
    }
    return candleData;
};

// Check for inside bars
const checkInsideBars = async (manualRun = false) => {
    console.log(`🔄 Checking for inside bars (Manual: ${manualRun}) at ${moment().tz("Asia/Kolkata").format("HH:mm:ss")}`);

    // Fetch latest high and low if manual run is true
    if (manualRun) {
        await fetchPreviousDayHighLow();
    }

    const candleData = await fetchHourlyCandleData(manualRun);
    let insideBarStatus = [];

    for (const stock in candleData) {
        const { motherCandle, babyCandle } = candleData[stock];
        const prevDay = previousDayData[stock] || {};

        if (!prevDay.high || !prevDay.low) {
            console.log(`⚠️ Skipping ${stock}, no previous day data.`);
            continue;
        }

        let insideBar = babyCandle.high < motherCandle.high && babyCandle.low > motherCandle.low;
        let type = null;

        if (insideBar) {
            if (motherCandle.high > prevDay.high) {
                type = "Bullish Inside Bar";
            } else if (motherCandle.low < prevDay.low) {
                type = "Bearish Inside Bar";
            } else {
                type = "Neutral Inside Bar";
            }

            insideBarStatus.push({
                symbol: stock,
                type: type,
                motherCandle,
                babyCandle,
                prevDay
            });

            console.log(`✅ ${stock} - ${type}`);
        }
    }

    return insideBarStatus };

// API Endpoint to Fetch Inside Bars
app.get('/inside-bars', async (req, res) => {
    try {
        const manualRun = req.query.manual === "true";
        const insideBars = await checkInsideBars(manualRun);
        res.json(insideBars);
    } catch (error) {
        console.error("❌ Error fetching inside bars:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    fetchPreviousDayHighLow(); // Initial fetch on server start
});