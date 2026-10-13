import fs from 'node:fs';
import * as THREE from './vendor/three.module.js';
import {createZelPod,ZELPOD_NAMES} from './zelpods-entry.mjs';
// Plain glTF 2.0, embedded float positions/normals/colors, 16-bit indices.
// Export the exact runtime surface meshes; no parallel approximation of the design.
const results=[];
for(let i=0;i<3;i++) {
 const paint=new THREE.MeshBasicMaterial({color:['#19cbdc','#f3f5f4','#ffad36'][i],vertexColors:true});
 const light=new THREE.MeshBasicMaterial({color:i===1?'#85ed12':'#33e7ff',vertexColors:true});
 const group=createZelPod(i,paint,light);let chunks=[],length=0;const views=[],accessors=[],primitives=[];
 function put(buffer,target){const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}
  const view={buffer:0,byteOffset:length,byteLength:buffer.length};if(target)view.target=target;views.push(view);chunks.push(buffer);length+=buffer.length;return views.length-1;}
 function attr(array,type){const view=put(Buffer.from(array.buffer,array.byteOffset,array.byteLength),34962);
  const a={bufferView:view,componentType:5126,count:array.length/3,type};
  if(type==='VEC3'){a.min=[0,1,2].map(k=>Math.min(...array.filter((_,j)=>j%3===k)));a.max=[0,1,2].map(k=>Math.max(...array.filter((_,j)=>j%3===k)));}
  accessors.push(a);return accessors.length-1;}
 let triangles=0;const bounds=new THREE.Box3().setFromObject(group);
 const materials=[
  {name:'Customizable_Body_Panels',pbrMetallicRoughness:{baseColorFactor:[...paint.color.toArray(),1],metallicFactor:.55,roughnessFactor:.32}},
  {name:'Structural_Frame_And_Engines',pbrMetallicRoughness:{baseColorFactor:[...group.children[1].material.color.toArray(),1],metallicFactor:.72,roughnessFactor:.45}},
  {name:'Faceted_Cockpit',pbrMetallicRoughness:{baseColorFactor:[...group.children[2].material.color.toArray(),1],metallicFactor:.55,roughnessFactor:.16}},
  {name:'Exhaust_And_Lighting',pbrMetallicRoughness:{baseColorFactor:[...light.color.toArray(),1],metallicFactor:.2,roughnessFactor:.3},emissiveFactor:light.color.toArray()}
 ];
 for(let m=0;m<group.children.length;m++){
  const mesh=group.children[m],g=mesh.geometry,n=g.attributes.position.count;triangles+=n/3;
  const ids=new Uint16Array(n);for(let k=0;k<n;k++)ids[k]=k;
  const attributes={POSITION:attr(g.attributes.position.array,'VEC3'),NORMAL:attr(g.attributes.normal.array,'VEC3'),COLOR_0:attr(g.attributes.color.array,'VEC3')};
  const view=put(Buffer.from(ids.buffer),34963);accessors.push({bufferView:view,componentType:5123,count:n,type:'SCALAR'});
  primitives.push({attributes,indices:accessors.length-1,material:m===4?0:m,extras:{component:mesh.name,optional:m===4}});
 }
 const doc={asset:{version:'2.0',generator:'All Things Gamed original ZelPod surface pipeline'},scene:0,scenes:[{nodes:[0]}],
  nodes:[{name:ZELPOD_NAMES[i],mesh:0}],meshes:[{name:ZELPOD_NAMES[i],primitives}],materials,buffers:[{byteLength:length}],bufferViews:views,accessors};
 let j=Buffer.from(JSON.stringify(doc));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
 let data=Buffer.concat(chunks);data=Buffer.concat([data,Buffer.alloc((4-data.length%4)%4)]);
 const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+data.length,8);
 const h1=Buffer.alloc(8);h1.writeUInt32LE(j.length);h1.writeUInt32LE(0x4e4f534a,4);
 const h2=Buffer.alloc(8);h2.writeUInt32LE(data.length);h2.writeUInt32LE(0x004e4942,4);
 const file=Buffer.concat([header,h1,j,h2,data]);fs.writeFileSync('atg007/models/'+ZELPOD_NAMES[i]+'.glb',file);
 const meshes=group.children.map(mesh=>({positions:Array.from(mesh.geometry.attributes.position.array),normals:Array.from(mesh.geometry.attributes.normal.array),
  colors:Array.from(mesh.geometry.attributes.color.array),color:mesh.material.color.toArray(),indices:Array.from({length:mesh.geometry.attributes.position.count},(_,k)=>k),matrix:new THREE.Matrix4().elements}));
 fs.writeFileSync('atg007/reports/model-'+ZELPOD_NAMES[i]+'-scene.json',JSON.stringify({meshes}));
 results.push({name:ZELPOD_NAMES[i],triangles,drawCalls:primitives.length,materials:materials.length,bytes:file.length,textures:0,bounds:[bounds.min.toArray(),bounds.max.toArray()],front:'+Z',optionalFins:true});
}
fs.writeFileSync('atg007/reports/zelpod-model-stats.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
