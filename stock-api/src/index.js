const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;
const moment = require('moment-timezone');

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

const fetchHourlyCandleData = async () => {
    const now = moment().tz("Asia/Kolkata");
    const end1 = now.clone().startOf('hour'); // Last completed hour
    const start1 = end1.clone().subtract(1, 'hour'); // Previous hour
    const start2 = start1.clone().subtract(1, 'hour'); // 2nd previous hour

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

            // Get last two complete hourly candles
            let motherCandle = candles[candles.length - 2] || {};
            let babyCandle = candles[candles.length - 1] || {};

            // Convert timestamps to IST
            let motherTime = motherCandle.date ? moment(motherCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : null;
            let babyTime = babyCandle.date ? moment(babyCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") : null;

            candleData[stock] = {
                motherCandle: { 
                    high: motherCandle.high, 
                    low: motherCandle.low, 
                    time: motherTime 
                },
                babyCandle: { 
                    high: babyCandle.high, 
                    low: babyCandle.low, 
                    time: babyTime 
                }
            };
        } catch (error) {
            console.error(`❌ Error fetching data for ${stock}:`, error.message);
        }
    }
    return candleData;
};

const checkInsideBars = (candleData) => {
    let insideBarStatus = {};

    for (const stock in candleData) {
        const { motherCandle, babyCandle } = candleData[stock];

        if (motherCandle.low !== null && babyCandle.low !== null) {
            insideBarStatus[stock] = {
                insideBar: babyCandle.high < motherCandle.high && babyCandle.low > motherCandle.low,
                motherCandle,
                babyCandle
            };
        } else {
            insideBarStatus[stock] = { insideBar: null, motherCandle, babyCandle };
        }
    }

    return insideBarStatus;
};

const fetchCurrentPrices = async () => {
    let priceData = {};
    for (const stock of stocks) {
        try {
            const quote = await yahooFinance.quote(stock);
            priceData[stock] = quote.regularMarketPrice || null;
        } catch (error) {
            console.error(`❌ Error fetching price for ${stock}:`, error.message);
        }
    }
    return priceData;
};

app.get('/inside-bar', async (req, res) => {
    try {
        const candleData = await fetchHourlyCandleData();
        const insideBars = checkInsideBars(candleData);
        const currentPrices = await fetchCurrentPrices();

        let finalData = {};
        for (const stock in insideBars) {
            finalData[stock] = {
                currentPrice: currentPrices[stock] || null,
                ...insideBars[stock]
            };
        }

        res.json(finalData);
    } catch (error) {
        console.error("❌ Server Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
