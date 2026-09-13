# Chaudhary Trading AI v3

## What this version does
- Backend API architecture
- Twelve Data adapter
- OHLCV market data
- SMA20, SMA50, RSI14, volume analysis
- Bullish/Neutral/Bearish educational signal score
- Paper-trading only; no real-money order execution
- API key stays on the server

## API key
1. Create a Twelve Data account and obtain your API key.
2. Set the server environment variable:
   TWELVE_DATA_API_KEY=YOUR_KEY
3. Run:
   node server.js
4. Open http://localhost:3000

For Vercel, add TWELVE_DATA_API_KEY under Project Settings -> Environment Variables, then redeploy.

IMPORTANT: Twelve Data's current plan/market coverage determines whether a requested Indian/NSE symbol is available. Do not assume the free plan provides full NSE live coverage. Check the provider's current coverage and licensing before publishing a client-facing market-data site.
