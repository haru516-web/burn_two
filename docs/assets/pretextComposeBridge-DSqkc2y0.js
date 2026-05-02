import{n as A,a as N,P as l}from"./app-CCmYRPDd.js";import"./main-C0oh_YOA.js";import"./local-fonts-DMBg5KN0.js";const f=794,B=1123,u=f*l.width,I='"Shippori Mincho", serif';function D(e){return JSON.parse(JSON.stringify(e))}function c(e,t,o){return Math.min(o,Math.max(t,e))}function T(e){const t=(e-l.x)/l.width;return c(t,0,1)*f}function M(e){const t=(e-l.y)/l.height;return c(t,0,1)*B}function P(e){return c(e/l.width,0,1)*f}function k(e){return c(e/l.height,0,1)*B}function _(e){return e==="center"||e==="right"?e:"left"}function x(e){return e==="serif"?I:'"Noto Sans JP", sans-serif'}function H(e={},t={}){if((e==null?void 0:e.editorType)==="pretext"&&Array.isArray(e.pretextBoxes))return D(e.pretextBoxes);const o=A(e),s=N(e,t),i=o.map((n,d)=>({id:n.id||`image-${d+1}`,kind:"image",x:T(n.x),y:M(n.y),width:P(n.width),height:k(n.height),minWidth:140,minHeight:140,zIndex:d+1,data:{src:null,cropX:0,cropY:0,zoom:1}}));return[...s.map((n,d)=>({id:n.id||`text-${d+1}`,kind:n.kind==="title"?"title":"body",x:T(n.x),y:M(n.y),width:P(n.width),height:k(n.height),minWidth:n.kind==="title"?220:200,minHeight:n.kind==="title"?90:140,zIndex:i.length+d+1,data:{text:String(n.text||""),fontFamily:x(n.family),fontSize:Math.max(14,Math.round(u*n.fontSize)),fontWeight:n.weight||(n.kind==="title"?700:400),lineHeight:Math.max(16,Math.round(u*n.fontSize*n.lineHeight)),letterSpacing:0,padding:Math.max(8,Math.round(u*(n.padding||.012))),color:"#111111",align:_(n.align)}})),...i]}function W(e=[]){return{editorType:"pretext",pretextBoxes:D(e).map(t=>{var o,s,i,p,n,d,r,a,h,m,y,E,w;return t.kind==="image"?{id:t.id,kind:"image",x:Math.round(t.x*1e3)/1e3,y:Math.round(t.y*1e3)/1e3,width:Math.round(t.width*1e3)/1e3,height:Math.round(t.height*1e3)/1e3,minWidth:t.minWidth,minHeight:t.minHeight,zIndex:t.zIndex,data:{src:((o=t.data)==null?void 0:o.src)||null,cropX:Number((s=t.data)==null?void 0:s.cropX)||0,cropY:Number((i=t.data)==null?void 0:i.cropY)||0,zoom:Math.max(1,Number((p=t.data)==null?void 0:p.zoom)||1)}}:{id:t.id,kind:t.kind==="title"?"title":"body",x:Math.round(t.x*1e3)/1e3,y:Math.round(t.y*1e3)/1e3,width:Math.round(t.width*1e3)/1e3,height:Math.round(t.height*1e3)/1e3,minWidth:t.minWidth,minHeight:t.minHeight,zIndex:t.zIndex,data:{text:String(((n=t.data)==null?void 0:n.text)||""),fontFamily:String(((d=t.data)==null?void 0:d.fontFamily)||x("sans")),fontSize:Number((r=t.data)==null?void 0:r.fontSize)||22,fontWeight:Number((a=t.data)==null?void 0:a.fontWeight)||400,lineHeight:Number((h=t.data)==null?void 0:h.lineHeight)||34,letterSpacing:Number((m=t.data)==null?void 0:m.letterSpacing)||0,padding:Number((y=t.data)==null?void 0:y.padding)||12,color:String(((E=t.data)==null?void 0:E.color)||"#111111"),align:_((w=t.data)==null?void 0:w.align)}}})}}const S="memories-pretext-embedded-overrides",z="#f8f4ee",g="#ffffff";function R(e){return`
html,
body,
#root {
  background: ${g} !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  overscroll-behavior: none !important;
}

html,
body {
  margin: 0 !important;
  min-height: 100% !important;
}

body,
#root,
.app-shell,
.app-shell--embedded {
  position: fixed !important;
  inset: 0 !important;
}

body::before,
body::after {
  display: none !important;
}

.app-shell,
.app-shell--embedded,
.workspace,
.canvas-area,
.canvas-area--embedded,
.page-stage-shell,
.page-stage {
  background: ${g} !important;
  border: 0 !important;
  box-shadow: none !important;
}

.app-shell--embedded,
.canvas-area--embedded {
  min-height: 100svh !important;
  min-height: 100dvh !important;
  height: 100svh !important;
  height: 100dvh !important;
}

.canvas-area--embedded {
  padding-top: 0 !important;
  padding-right: 0 !important;
  padding-left: 0 !important;
  place-items: center !important;
}

.page-stage-shell,
.page-stage,
.page-shadow,
.page {
  border-radius: 0 !important;
}

.app-shell--embedded .page-shadow,
.page-shadow {
  display: none !important;
  background: transparent !important;
  filter: none !important;
}

.app-shell--embedded .page,
.page {
  background: ${e} !important;
  box-shadow: none !important;
  outline: 0 !important;
}
`}function v(){return window.location.origin==="null"?"*":window.location.origin}function C(e){return window.location.origin==="null"?e==="null"||e==="":e===window.location.origin}function G(e,t={}){let o=H(t.customLayout,t.textValues),s=t.backgroundColor||z;const i=document.createElement("iframe");i.className="compose-pretext-iframe",i.src="./pretext-editor.html?embedded=1",i.title="Pretext editor",i.setAttribute("loading","eager"),i.setAttribute("allow","clipboard-read; clipboard-write"),i.setAttribute("allowtransparency","true"),e.replaceChildren(i);const p=()=>{const r=i.contentDocument;if(!r)return;const a=r.documentElement,h=r.body;if(!a||!h)return;i.style.setProperty("background",g,"important"),e.style.setProperty("background",g,"important"),a.style.setProperty("background",g,"important"),h.style.setProperty("background",g,"important"),a.style.setProperty("color-scheme","light","important"),h.style.setProperty("color-scheme","light","important");let m=r.getElementById(S);m||(m=r.createElement("style"),m.id=S,r.head.appendChild(m)),m.textContent=R(s)},n=()=>{var r;p(),(r=i.contentWindow)==null||r.postMessage({type:"memories:pretext:init",boxes:o},v())},d=r=>{if(!C(r.origin)||r.source!==i.contentWindow)return;const a=r.data;if(!(!a||typeof a!="object")){if(a.type==="memories:pretext:ready"){p(),n();return}a.type==="memories:pretext:change"&&Array.isArray(a.boxes)&&(o=a.boxes)}};return i.addEventListener("load",n),window.addEventListener("message",d),{unmount(){i.removeEventListener("load",n),window.removeEventListener("message",d),i.remove()},sendCommand(r){var a;(a=i.contentWindow)==null||a.postMessage({type:"memories:pretext:command",command:r},v())},getBoxes(){return o},getSerializedLayout(){return W(o)},setBackgroundColor(r){s=r||z,p()}}}export{G as mountComposePretextEditor};
