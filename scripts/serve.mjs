import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
if(!fs.existsSync(root))throw new Error('Ejecuta npm run build antes de npm run preview');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  const exists=fs.existsSync(file)&&fs.statSync(file).isFile();if(!exists)file=path.join(root,'404.html');
  res.writeHead(exists?200:404,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Robots-Tag':'noindex, nofollow'});fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end('Solicitud incorrecta');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Vista previa: http://127.0.0.1:'+(process.env.PORT||4173)));
