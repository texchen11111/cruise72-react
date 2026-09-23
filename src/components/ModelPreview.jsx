import {useEffect,useState} from 'react';
import {generatePreview} from '../scene/createPlannerScene.js';
import {Icon} from './Icon.jsx';
const cache=new Map();
export function ModelPreview({type,items,cacheKey}){
 const key=cacheKey||type;const [image,setImage]=useState(cache.get(key));
 useEffect(()=>{if(cache.has(key)){setImage(cache.get(key));return;}let cancelled=false;const timer=setTimeout(()=>{try{const result=generatePreview(items||[{id:'preview',type,gx:0,gy:0,gz:0,color:'#3158e8',state:0,intensity:65,temperature:3200}]);if(result){cache.set(key,result);if(!cancelled)setImage(result);}}catch{}},40);return()=>{cancelled=true;clearTimeout(timer);};},[key,type,items]);
 return <span className="model-preview" aria-hidden="true">{image?<img src={image} alt="" draggable="false"/>:<Icon type={type||'frame'}/>}</span>;
}
