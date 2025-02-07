const express = require('express');
const cors = require('cors');
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

// Fetch last two hourly candles for each stock
const fetchHourlyCandleData = async () => {
    const now = moment().tz("Asia/Kolkata");
    const end1 = now.clone().startOf('hour'); 
    const start1 = end1.clone().subtract(1, 'hour'); 
    const start2 = start1.clone().subtract(1, 'hour');

    let candleData = {};

    for (const stock of stocks) {
        try {
            const result = await yahooFinance.chart(stock, {
                period1: start2.toISOString(),
                period2: end1.toISOString(),
                interval: '1h'
            });

            if (!result || !result.quotes || result.quotes.length < 2) {
                console.log(`⚠️ Not enough candles for ${stock}`);
                continue;
            }

            const candles = result.quotes;
            let motherCandle = candles[candles.length - 2] || {};
            let babyCandle = candles[candles.length - 1] || {};

            let motherTime = motherCandle.date ? moment(motherCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : null;
            let babyTime = babyCandle.date ? moment(babyCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : null;

            candleData[stock] = {
                motherCandle: { high: motherCandle.high, low: motherCandle.low, time: motherTime },
                babyCandle: { high: babyCandle.high, low: babyCandle.low, time: babyTime }
            };
        } catch (error) {
            console.error(`❌ Error fetching data for ${stock}:`, error.message);
        }
    }
    return candleData;
};

// Check for inside bars
const checkInsideBars = async () => {
    console.log(`🔄 Running Inside Bar Check at ${moment().tz("Asia/Kolkata").format("HH:mm:ss")}`);
    const candleData = await fetchHourlyCandleData();
    let insideBarStatus = {};

    for (const stock in candleData) {
        const { motherCandle, babyCandle } = candleData[stock];

        if (motherCandle.low !== null && babyCandle.low !== null) {
            insideBarStatus[stock] = {
                insideBar: babyCandle.high < motherCandle.high && babyCandle.low > motherCandle.low,
                motherCandle,
                babyCandle
            };
        }
    }

    console.log("✅ Inside Bar Analysis Completed:", insideBarStatus);
    return insideBarStatus;
};

// API Endpoint for manual execution
app.get('/run-manual', async (req, res) => {
    try {
        console.log("⚡ Manually Triggered Inside Bar Check");
        const result = await checkInsideBars();
        res.json(result);
    } catch (error) {
        console.error("❌ Error in manual execution:", error.message);
        res.status(500).json({ error: "Error running manual check" });
    }
});

// Cron Job to run at 11:15 AM, 12:15 PM, 1:15 PM, 2:15 PM, 3:15 PM IST
cron.schedule('15 11,12,13,14,15 * * *', async () => {
    console.log("⏳ Scheduled Run Triggered");
    await checkInsideBars();
}, {
    timezone: "Asia/Kolkata"
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
