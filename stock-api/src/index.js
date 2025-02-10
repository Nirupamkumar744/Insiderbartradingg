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
    "ICICIGI.NS", "ICICIPRULI.NS", "M&MFIN.NS", "MANAPPURAM.NS",
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
    "ITC.NS", "MARICO.NS", "NESTLEIND.NS", "TATACONSUM.NS", "UBL.NS", 
    "ALKEM.NS", "APLLTD.NS", "AUROPHARMA.NS", "BIOCON.NS", "CIPLA.NS",
    "DIVISLAB.NS", "DRREDDY.NS", "GLENMARK.NS", "GRANULES.NS", "LAURUSLABS.NS", "LUPIN.NS",
    "SUNPHARMA.NS", "SYNGENE.NS", "TORNTPHARM.NS", "APOLLOHOSP.NS", "LALPATHLAB.NS",
    "MAXHEALTH.NS", "METROPOLIS.NS", "BHARTIARTL.NS", "HFCL.NS", "IDEA.NS", "INDUSTOWER.NS",
    "DLF.NS", "GODREJPROP.NS", "LODHA.NS", "OBEROIRLTY.NS", "PRESTIGE.NS", "GUJGASLTD.NS",
    "IGL.NS", "MGL.NS", "CONCOR.NS", "CESC.NS", "HUDCO.NS", "IRFC.NS", "ABBOTINDIA.NS",
    "BEL.NS", "CGPOWER.NS", "CUMMINSIND.NS", "HAL.NS","SIEMENS.NS", "TIINDIA.NS",
    "CHAMBLFERT.NS", "COROMANDEL.NS", "GNFC.NS", "PIIND.NS", "BSE.NS", "DELHIVERY.NS",
    "GMRAIRPORT.NS", "IRCTC.NS", "KEI.NS", "NAVINFLUOR.NS", "POLYCAB.NS", "SUNTV.NS", "UPL.NS"
];

// Fetch last two hourly candles
const fetchHourlyCandleData = async () => {
    const now = moment().tz("Asia/Kolkata");
    const end = now.clone().startOf('hour');
    const start = end.clone().subtract(2, 'hour');

    let insideBars = [];

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

            // Check if baby candle is inside the mother candle
            if (babyCandle.high <= motherCandle.high && babyCandle.low >= motherCandle.low) {
                // Calculate mother candle gain/loss percentage
                let motherCandleChange = ((motherCandle.close - motherCandle.open) / motherCandle.open) * 100;

                insideBars.push({
                    symbol: stock,
                    type: "Neutral Inside Bar",
                    motherCandle: {
                        timestamp: moment(motherCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                        high: motherCandle.high,
                        low: motherCandle.low,
                        change: motherCandleChange.toFixed(2) + "%"  // New field added
                    },
                    babyCandle: {
                        timestamp: moment(babyCandle.date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                        high: babyCandle.high,
                        low: babyCandle.low
                    },
                    prevDay: {
                        high: result.meta.previousClose,
                        low: motherCandle.low
                    }
                });
            }
        } catch (error) {
            console.error(`❌ Error fetching data for ${stock}:`, error.message);
        }
    }

    return insideBars;
};

// API endpoint to get inside bars
app.get('/inside-bars', async (req, res) => {
    try {
        const data = await fetchHourlyCandleData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Error fetching inside bar data" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
