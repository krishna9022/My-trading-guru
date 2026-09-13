
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TD_BASE = "https://api.twelvedata.com";

function send(res, status, body, type="application/json") {
  res.writeHead(status, {"Content-Type": type, "Cache-Control":"no-store"});
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function sma(values, n) {
  if (values.length < n) return null;
  return values.slice(-n).reduce((a,b)=>a+b,0)/n;
}
function rsi(values, n=14) {
  if (values.length <= n) return null;
  let gain=0, loss=0;
  for(let i=values.length-n;i<values.length;i++){
    const d=values[i]-values[i-1];
    if(d>=0) gain+=d; else loss-=d;
  }
  if(loss===0) return 100;
  const rs=(gain/n)/(loss/n);
  return 100-(100/(1+rs));
}
function analyze(rows) {
  const closes=rows.map(x=>Number(x.close)).filter(Number.isFinite);
  const volumes=rows.map(x=>Number(x.volume||0)).filter(Number.isFinite);
  const price=closes.at(-1);
  const s20=sma(closes,20), s50=sma(closes,50), r=rsi(closes,14);
  const avgVol=volumes.length>=20?sma(volumes,20):null;
  let score=0, reasons=[];
  if(s20!==null){ if(price>s20){score+=20;reasons.push("Price is above SMA20");} else {score-=20;reasons.push("Price is below SMA20");}}
  if(s50!==null){ if(price>s50){score+=20;reasons.push("Price is above SMA50");} else {score-=20;reasons.push("Price is below SMA50");}}
  if(s20!==null && s50!==null){ if(s20>s50){score+=20;reasons.push("SMA20 is above SMA50");} else {score-=20;reasons.push("SMA20 is below SMA50");}}
  if(r!==null){ if(r>=55 && r<70){score+=15;reasons.push("RSI shows positive momentum");} else if(r<45){score-=15;reasons.push("RSI shows weak momentum");} else if(r>=70){reasons.push("RSI is high; caution");} }
  if(avgVol && volumes.at(-1)>avgVol*1.2){score += score>=0?10:-10; reasons.push("Volume is elevated versus average");}
  score=Math.max(-100,Math.min(100,score));
  const signal=score>=35?"BULLISH":score<=-35?"BEARISH":"NEUTRAL";
  return {price,sma20:s20,sma50:s50,rsi:r,score,signal,reasons};
}

async function td(symbol, interval="1day", outputsize=120) {
  if(!API_KEY) throw new Error("TWELVE_DATA_API_KEY is not configured.");
  const u=`${TD_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${encodeURIComponent(API_KEY)}`;
  const r=await fetch(u);
  const j=await r.json();
  if(!r.ok || j.status==="error" || !j.values) throw new Error(j.message || "Market-data request failed.");
  return j.values.reverse();
}

const html=fs.readFileSync(path.join(__dirname,"public","index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"public","style.css"),"utf8");

const server=http.createServer(async (req,res)=>{
  const u=new URL(req.url,`http://${req.headers.host}`);
  try{
    if(u.pathname==="/api/status"){
      return send(res,200,{configured:!!API_KEY,mode:API_KEY?"API":"DEMO",provider:"Twelve Data"});
    }
    if(u.pathname==="/api/analyze"){
      const symbol=u.searchParams.get("symbol")||"AAPL";
      const interval=u.searchParams.get("interval")||"1day";
      const rows=await td(symbol,interval,120);
      return send(res,200,{symbol,provider:"Twelve Data",mode:"LIVE_API",candles:rows,analysis:analyze(rows)});
    }
    if(u.pathname==="/style.css") return send(res,200,css,"text/css");
    return send(res,200,html,"text/html; charset=utf-8");
  }catch(e){
    return send(res,500,{error:e.message,mode:API_KEY?"API":"DEMO"});
  }
});
server.listen(PORT,()=>console.log(`Chaudhary Trading AI v3 running on ${PORT}`));
