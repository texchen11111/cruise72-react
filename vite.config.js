import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const threePath=fileURLToPath(new URL('./vendor/three.module.js',import.meta.url));
const orbitPath=fileURLToPath(new URL('./vendor/OrbitControls.js',import.meta.url));

// Vendored Three.js 0.170.0 stays out of the bundle. In dev it is resolved
// through aliases below; in build the bare specifiers are kept external and the
// importmap in index.html loads /vendor/*.js at runtime. The vendor directory
// lives at the project root so Vite dev can serve it as a regular module.
export default defineConfig(({command})=>({
 esbuild:{jsx:'automatic'},
 publicDir:command==='build'?'public':false,
 resolve:command==='serve'?{alias:[
  {find:/^three\/addons\/OrbitControls\.js$/,replacement:orbitPath},
  {find:/^three$/,replacement:threePath},
 ]}:undefined,
 plugins:command==='build'?[{name:'copy-vendor',closeBundle(){fs.cpSync('vendor','dist/vendor',{recursive:true});}}]:[],
 build:{rollupOptions:{external:[/^three$/,/^three\/addons\/OrbitControls\.js$/]}},
}));
