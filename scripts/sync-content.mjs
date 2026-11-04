import fs from 'node:fs/promises';
import path from 'node:path';
const origin='https://mironoveo.evgeniia077.chatgpt.site';
const root=process.env.PORTFOLIO_OUTPUT||process.cwd();
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`Download failed: ${r.status}`);return r;}
await fs.mkdir(path.join(root,'content'),{recursive:true});
await fs.mkdir(path.join(root,'media'),{recursive:true});
const data=await (await get(origin+'/api/content')).json();
if(!data.data?.profile||!Array.isArray(data.data.projects))throw new Error('Invalid public content');
const downloaded=new Map();
async function localize(value){
 if(typeof value==='string'&&(/^\/api\/media\/[a-f0-9-]+$/.test(value)||value.startsWith('/case-assets/'))){
  if(downloaded.has(value))return downloaded.get(value);
  const r=await get(origin+value);const type=r.headers.get('content-type')||'';
  const ext=type.includes('png')?'png':type.includes('webp')?'webp':type.includes('svg')?'svg':type.includes('gif')?'gif':'jpg';
  const file='media/'+value.split('/').pop().replace(/[^a-zA-Z0-9.-]/g,'_')+'.'+ext;
  await fs.writeFile(path.join(root,file),Buffer.from(await r.arrayBuffer()));
  downloaded.set(value,'./'+file);return './'+file;
 }
 if(Array.isArray(value)){const out=[];for(const item of value)out.push(await localize(item));return out;}
 if(value&&typeof value==='object'){const out={};for(const [key,item]of Object.entries(value))out[key]=await localize(item);return out;}
 return value;
}
const result=await localize(data);
await fs.writeFile(path.join(root,'content/main.json'),JSON.stringify(result));
console.log(`Updated public resume and ${downloaded.size} media files`);

const bundlePath=path.join(root,'portfolio.js');
const bundle=await fs.readFile(bundlePath,'utf8');
const iconIds=[...bundle.matchAll(/\{id:`([a-z]+)`,label:/g)].map(match=>match[1]);
if(!iconIds.includes('telegram'))throw new Error('Messenger icon definitions not found');
await fs.mkdir(path.join(root,'social-icons'),{recursive:true});
await Promise.all([...new Set(iconIds)].map(async id=>{
 const svg=await (await get(origin+'/social-icons/'+id+'.svg')).text();
 if(!/^\s*<svg[\s>]/.test(svg))throw new Error('Invalid messenger SVG: '+id);
 await fs.writeFile(path.join(root,'social-icons',id+'.svg'),svg);
}));
await fs.writeFile(bundlePath,bundle.replaceAll('`/social-icons/`','`./social-icons/`'));
console.log(`Updated ${new Set(iconIds).size} messenger icons`);
