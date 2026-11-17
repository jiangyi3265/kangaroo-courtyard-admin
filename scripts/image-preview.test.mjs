import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'

let root=dirname(fileURLToPath(import.meta.url))
while(!existsSync(join(root,'RuoYi-Vue3/package.json'))){const parent=dirname(root);assert.notEqual(parent,root);root=parent}
const app=join(root,'RuoYi-Vue3'),require=createRequire(join(app,'package.json'))
const {parse,compileScript}=require('@vue/compiler-sfc')
const {createRenderer}=require('vue')
const vueUrl=pathToFileURL(join(app,'node_modules/vue/index.mjs')).href
const source=await readFile(process.env.KG_IMAGE_PREVIEW_COMPONENT_FILE||join(app,'src/components/ImagePreview/index.vue'),'utf8')
const validation=await readFile(join(app,'src/utils/validate.js'),'utf8')
const validationUrl='data:text/javascript;base64,'+Buffer.from(validation).toString('base64')
// ImagePreview 通过 @/utils/imageUrl 拼图片地址（10-13 起 /static/ 开头的小程序包内图片从 H5 站点取）；同样换成 data: 模块，环境变量写死成本地联调的值
const imageUrlSource=(await readFile(join(app,'src/utils/imageUrl.js'),'utf8')).replaceAll("from '@/utils/validate'",'from '+JSON.stringify(validationUrl)).replaceAll('import.meta.env.VITE_APP_BASE_API',JSON.stringify('/dev-api')).replaceAll('import.meta.env.VITE_APP_H5_ORIGIN',JSON.stringify(''))
const imageUrlUrl='data:text/javascript;base64,'+Buffer.from(imageUrlSource).toString('base64')
const {descriptor,errors}=parse(source,{filename:'ImagePreview.vue'})
assert.deepEqual(errors,[])
const compiled='import {computed} from '+JSON.stringify(vueUrl)+';\n'+compileScript(descriptor,{id:'preview-empty-regression',inlineTemplate:true}).content
  .replaceAll('from "vue"','from '+JSON.stringify(vueUrl))
  .replaceAll("from 'vue'",'from '+JSON.stringify(vueUrl))
  .replaceAll('from "@/utils/validate"','from '+JSON.stringify(validationUrl))
  .replaceAll('from "@/utils/imageUrl"','from '+JSON.stringify(imageUrlUrl))
  .replaceAll('import.meta.env.VITE_APP_BASE_API',JSON.stringify('/dev-api'))
const component=(await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))).default
function actualImageProps(src){
  let received
  const {createApp}=createRenderer({
    createElement:tag=>({tag,children:[]}),createText:text=>({text}),createComment:text=>({comment:text}),
    insert(node,parent){parent.children.push(node)},remove(){},setText(){},setElementText(){},patchProp(){},
    parentNode:()=>null,nextSibling:()=>null
  })
  const app=createApp(component,{src,width:44,height:44})
  app.component('ElImage',{props:['src','previewSrcList'],setup(props){received=props;return()=>null}})
  app.component('ElIcon',{render(){return null}})
  app.component('PictureFilled',{render(){return null}})
  app.mount({children:[]})
  const value={src:received.src,'preview-src-list':received.previewSrcList}
  app.unmount()
  return value
}
for(const src of ['',undefined,null])test('empty cover '+String(src)+' never creates relative undefined image URL',()=>{
  const props=actualImageProps(src)
  assert(props.src===undefined||props.src===null||props.src==='', 'Empty cover emitted '+JSON.stringify(props.src))
  assert.notEqual(props.src,'undefined')
  assert(!props['preview-src-list']?.length)
})
test('actual uploaded cover and preview still use the configured API prefix',()=>{
  const props=actualImageProps('/profile/upload/owned-test.png')
  assert.equal(props.src,'/dev-api/profile/upload/owned-test.png')
  assert.deepEqual(props['preview-src-list'],['/dev-api/profile/upload/owned-test.png'])
})
test('multiple images retain first-image display and each preview URL',()=>{
  const props=actualImageProps('/profile/a.png,https://example.invalid/b.png')
  assert.equal(props.src,'/dev-api/profile/a.png')
  assert.deepEqual(props['preview-src-list'],['/dev-api/profile/a.png','https://example.invalid/b.png'])
})
