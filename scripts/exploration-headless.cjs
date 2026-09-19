/**
 * Exploration visual harness: real compiled Page logic + source WXML/WXSS.
 * This is a browser adapter, NOT a WeChat renderer. Native components, safe-area
 * and device gestures still require WeChat QA. No production data is modified.
 * Run after build:local-media. Outputs are ignored artifacts/visual/.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts/visual/exploration-redesign', process.env.CAPTURE_SET || 'after');
const runtime = path.join(ROOT, 'dist-local/miniprogram');
const source = path.join(ROOT, 'miniprogram/pkg-explore/pages/exploration');
const baseline = process.env.CAPTURE_BASELINE === '1';
function readSource(file) {
  return baseline ? require('node:child_process').execFileSync('git',['show',`HEAD:miniprogram/pkg-explore/pages/exploration/${file}`],{cwd:ROOT,encoding:'utf8'}) : fs.readFileSync(path.join(source,file),'utf8');
}
let definition;
let width = Number(process.env.CAPTURE_WIDTH || 390);
let height = Number(process.env.CAPTURE_HEIGHT || 844);
const storage = new Map();
global.wx = {
  getStorageSync: k => storage.get(k), setStorageSync: (k,v) => storage.set(k,v),
  getWindowInfo: () => ({windowWidth: width, windowHeight: height, statusBarHeight: 44}),
  getMenuButtonBoundingClientRect: () => ({top: 48, height: 32, left: width-100}),
  showToast() {}, navigateTo() {}, navigateBack() {}, switchTab() {}, previewImage() {},
};
global.Page = d => { definition = d; };
if (baseline) {
  const Module=require('node:module');
  const filename=path.join(runtime,'pkg-explore/pages/exploration/index.js');
  const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
  mod._compile(require('node:child_process').execFileSync('git',['show','HEAD:dist/miniprogram/pkg-explore/pages/exploration/index.js'],{cwd:ROOT,encoding:'utf8'}),filename);
} else require(path.join(runtime, 'pkg-explore/pages/exploration/index.js'));
function instance(world) {
  const p = {};
  for (const [k,v] of Object.entries(definition)) p[k] = typeof v === 'function' ? v.bind(p) : structuredClone(v);
  p.setData = (patch, cb) => { Object.assign(p.data, patch); cb?.(); };
  p.onLoad({id:world}); p.onStartClimb(); p.tickFrame();
  return p;
}
// Small structural WXML adapter. Unknown expressions fail loudly: never silently
// replace a source component with a separately authored mock screen.
function parseWxml(text) {
  const root = {children:[]}; const stack=[root];
  const tokens = text.match(/<!--[\s\S]*?-->|<\/?[\w-]+(?:"[^"]*"|'[^']*'|[^'">])*\/?>|[^<]+/g) || [];
  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (!token.startsWith('<')) { stack.at(-1).children.push(token); continue; }
    const tag = token.match(/^<([\w-]+)/)[1]; const attrs={};
    const attrText = token.slice(tag.length+1).replace(/\/?\s*>$/, '');
    for (const m of attrText.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)) attrs[m[1]]=m[2]??'';
    const node={tag,attrs,children:[]}; stack.at(-1).children.push(node);
    if (!token.endsWith('/>')) stack.push(node);
  }
  if(stack.length!==1) throw Error('Unbalanced WXML');
  return root;
}
const template = readSource('index.wxml').replace(/<include src="([^"]+)"\s*\/>/g, (_,file)=>readSource(file));
const ast=parseWxml(template);
const escape = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function expression(s, scope) { return Function('s', 'with(s){return ('+s+')}')(scope); }
function value(s,scope) {
  const match = s.match(/^{{((?:(?!}})[\s\S])*)}}$/);
  return match ? expression(match[1],scope) : s.replace(/{{([\s\S]*?)}}/g, (_,e)=>expression(e,scope)??'');
}
function children(nodes,scope) {
  let out='',matched=false;
  for (const n of nodes) {
    if(typeof n==='string') {out+=escape(value(n,scope)); continue;}
    const a=n.attrs;
    if('wx:if' in a) {matched=Boolean(value(a['wx:if'],scope)); if(!matched)continue;}
    else if('wx:elif' in a) {if(matched)continue; matched=Boolean(value(a['wx:elif'],scope)); if(!matched)continue;}
    else if('wx:else' in a) {if(matched)continue; matched=true;}
    else matched=false;
    if('wx:for' in a) {
      const list=value(a['wx:for'],scope)||[];
      out+=list.map((item,index)=>node(n,{...scope,[a['wx:for-item']||'item']:item,[a['wx:for-index']||'index']:index})).join('');
    } else out+=node(n,scope);
  }
  return out;
}
function node(n,scope) {
  if(n.tag==='block')return children(n.children,scope);
  const tag=({'view':'div','cover-view':'div','text':'text','image':'img','scroll-view':'div','button':'button'})[n.tag]||'div';
  let attrs='';
  for(const [k,v] of Object.entries(n.attrs)) {
    if(k.startsWith('wx:'))continue;
    if(k==='bindtap'||k==='catchtap') {attrs+=' data-handler="'+escape(v)+'"';continue;}
    if(k.startsWith('bind')||k.startsWith('catch'))continue;
    if(k==='disabled') {if(value(v,scope))attrs+=' disabled';continue;}
    const resolved=value(v,scope);
    attrs+=' '+k+'="'+escape(k==='style'?String(resolved).replace(/(-?[\d.]+)rpx/g,(_,n)=>`${Number(n)*width/750}px`):resolved)+'"';
  }
  if(n.tag==='scroll-view')attrs+=' data-scroll="true"';
  return '<'+tag+attrs+'>'+ (tag==='img'?'':children(n.children,scope)+'</'+tag+'>');
}
function html(p) {
  const css=[fs.readFileSync(path.join(ROOT,'miniprogram/app.wxss'),'utf8'),readSource('index.wxss').replace(/@import "([^"]+)";/g,(_,file)=>readSource(file))].join('\n').replace(/(-?[\d.]+)rpx/g,(_,n)=>`${Number(n)*width/750}px`).replace(/(^|\n)page\s*{/g,'$1body {');
  return `<!doctype html><html><meta charset="utf-8"><style>body{margin:0}button{font:inherit;cursor:pointer}img{object-fit:cover}img[mode="aspectFit"]{object-fit:contain}[data-scroll]{overflow:auto}*{box-sizing:border-box}${css}</style><body>${children(ast.children,p.data)}<script>document.addEventListener('click',async e=>{const t=e.target.closest('[data-handler]');if(t&&!t.disabled)await window.action(t.dataset.handler,{currentTarget:{dataset:t.dataset}})});</script></body></html>`;
}
async function advance(p) {
  p.onWaypointCardClose(); p.onStepUp();
  // Advance the real animation clock deterministically; all milestones and
  // unlocks still pass through tickFrame rather than injected display data.
  if(p.climbReq) {
    const old=Date.now; const start=p.climbReq.startedAt;
    try {for(let ms=0;ms<=10000 && p.climbReq;ms+=80){Date.now=()=>start+ms;p.tickFrame();}} finally{Date.now=old;}
  }
  p.onWaypointCardClose();
  p.setData({milestoneBanner:{show:false},stageBanner:{show:false}});
}
async function main() {
  fs.mkdirSync(OUT,{recursive:true});
  let p;
  const server=http.createServer((req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html(p));return;}
    const target=path.resolve(runtime,'.'+pathname);
    if(!target.startsWith(runtime+path.sep)){res.writeHead(403).end();return;}
    try {res.setHeader('Content-Type',({'.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];const results=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.exposeFunction('action',async(method,event)=>{p[method](event);p.tickFrame();await page.goto(url);});
  const url=`http://127.0.0.1:${server.address().port}`;
  async function capture(name) {
    await page.goto(url,{waitUntil:'networkidle'});
    await page.screenshot({path:path.join(OUT,name+'.png')});
    results.push({name,world:p.exploration.id,progress:p.current,depth:p.hudElevation,view:p.data.journeyView||'legacy',images:await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),loaded:i.naturalWidth>0}))),file:name+'.png'});
    if (!baseline && await page.locator('.descent-transect').count()) {
      const rect=await page.locator('.descent-transect').boundingBox();
      if(!rect || rect.height<120) throw Error('Descent scene collapsed: '+JSON.stringify(rect));
    }
  }
  try {
    for(const world of (process.env.CAPTURE_WORLDS||'mariana,everest,colorado').split(',')) {
      p=instance(world);await capture(world+'-start');
      if(p.onInspectNext){p.onInspectNext();await capture(world+'-next-preview');p.onWaypointCardClose();}
      if(p.onJourneyView){p.onJourneyView({currentTarget:{dataset:{view:'overview'}}});await capture(world+'-overview-start');p.onJourneyView({currentTarget:{dataset:{view:'focus'}}});}
      const count=p.expeditionCore.routeIndex.milestones.length;
      for(let i=1;i<count;i++){await advance(p);await capture(world+'-'+i);}
      if(p.onJourneyView){p.onJourneyView({currentTarget:{dataset:{view:'overview'}}});await capture(world+'-overview-complete');}
      p.onUnload();
    }
    fs.writeFileSync(path.join(OUT,'capture-report.json'),JSON.stringify({renderer:'headless Chromium; real Page + WXML/WXSS adapter; NOT native WeChat',viewport:{width,height},errors,results},null,2));
    console.log(JSON.stringify({out:OUT,screenshots:results.length,errors,failedImages:results.flatMap(r=>r.images.filter(i=>!i.loaded).map(i=>({name:r.name,...i})))},null,2));
    if(errors.length)process.exitCode=1;
  } finally {await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exit(1);});
