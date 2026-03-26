import{c as x,r as s,j as e,J as u,O as h,P as b}from"./index-CzWBMTfm.js";import{C as k}from"./copy-CcHvEDGx.js";/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]],f=x("send",j);/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]],N=x("video",y);function v(){const[n,r]=s.useState("image"),[i,d]=s.useState(""),[o,c]=s.useState(""),[l,m]=s.useState(""),[p,t]=s.useState(null),g=()=>{!i||!o||t(n==="image"?{title:"Image Generation Prompt",prompt:`
High-quality ${l||"modern"} advertisement image for a ${i} company.
Marketing goal: ${o}.
Visual style: clean, professional, cinematic lighting.
Include strong brand presence, minimal text, high contrast.
Aspect ratio: 4:5 (social media).
Photorealistic, ultra-detailed.
        `.trim()}:{title:"Video Generation Prompt",prompt:`
Short-form marketing video (15–30 seconds) for a ${i} brand.
Goal: ${o}.
Style: ${l||"modern, engaging"}.
Scenes:
1. Attention-grabbing hook in first 3 seconds
2. Product/service value demonstration
3. Emotional or aspirational moment
4. Clear call-to-action at the end
Format optimized for Instagram Reels / TikTok.
Cinematic transitions, subtitles, brand colors.
        `.trim()})};return e.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(u,{className:"text-pink-600"}),e.jsx("h3",{className:"font-semibold text-slate-900 dark:text-white",children:"AI Media Prompt Generator"})]}),e.jsxs("div",{className:"flex gap-2 mb-3",children:[e.jsxs("button",{onClick:()=>r("image"),className:`flex items-center gap-1 px-3 py-1 rounded text-sm ${n==="image"?"bg-pink-600 text-slate-900 dark:text-white":""}`,children:[e.jsx(h,{size:16})," Image"]}),e.jsxs("button",{onClick:()=>r("video"),className:`flex items-center gap-1 px-3 py-1 rounded text-sm ${n==="video"?"bg-pink-600 text-slate-900 dark:text-white":""}`,children:[e.jsx(N,{size:16})," Video"]})]}),e.jsxs("div",{className:"grid gap-3 mb-3",children:[e.jsx("input",{value:i,onChange:a=>d(a.target.value),placeholder:"Industry (e.g. SaaS, Real Estate, Fashion)",className:"border rounded p-2 text-sm"}),e.jsx("input",{value:o,onChange:a=>c(a.target.value),placeholder:"Campaign goal (e.g. Lead generation, Brand awareness)",className:"border rounded p-2 text-sm"}),e.jsx("input",{value:l,onChange:a=>m(a.target.value),placeholder:"Style (optional – cinematic, minimal, luxury)",className:"border rounded p-2 text-sm"})]}),e.jsxs("button",{onClick:g,className:"flex items-center gap-2 bg-pink-600 text-slate-900 dark:text-white px-4 py-2 rounded text-sm",children:[e.jsx(k,{size:16}),"Generate Prompt"]}),typeof onAttach=="function"&&e.jsx("button",{onClick:()=>onAttach(a=>({...a,content:{...(a==null?void 0:a.content)||{},media:p}})),children:"Attach"})]})}function A(){const[n,r]=s.useState("content"),[i,d]=s.useState(""),[o,c]=s.useState(null),[l,m]=s.useState("mediapromptpanel"),p=()=>{c({title:"AI Generated Campaign",summary:"This is a sample AI-generated marketing output.",steps:["Define target audience","Craft key message","Choose distribution channels","Schedule campaign"]})};return e.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(u,{className:"text-indigo-600"}),e.jsx("h3",{className:"font-semibold  text-slate-900 dark:text-white",children:"AI Marketing Assistant"})]}),e.jsx("div",{className:"flex gap-2 mb-3",children:["content","campaign","social","ads"].map(t=>e.jsx("button",{onClick:()=>r(t),className:`px-3 py-1 rounded text-sm ${n===t?"bg-indigo-600 text-white":"bg-slate-100 text-slate-600"}`,children:t.replace("_"," ").toUpperCase()},t))}),e.jsx("textarea",{value:i,onChange:t=>d(t.target.value),placeholder:`Describe what you want to generate (${n})...`,className:"w-full border rounded-md p-2 text-sm mb-3",rows:3}),e.jsxs("button",{onClick:p,className:"flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm",children:[e.jsx(f,{size:16}),"Generate"]}),o&&e.jsxs("div",{className:"mt-2",children:[e.jsx("pre",{children:o}),typeof onAttach=="function"&&e.jsx("button",{onClick:()=>onAttach(t=>({...t,content:{...(t==null?void 0:t.content)||{},copy:o}})),children:"Attach"})]}),e.jsx("div",{className:"grid grid-cols-1 xl:grid-cols-3 gap-2 px-0 pt-6 pb-0 ",children:e.jsx("div",{onClick:()=>m("mediapromptpanel"),className:"cursor-pointer transition hover:scale-[1.02]",children:e.jsx(C,{title:"Media Prompt Panel",icon:b,children:"Behavioral rules, dynamic audiences, predictive lookalikes."})})}),l==="mediapromptpanel"&&e.jsx(v,{})]})}function C({title:n,icon:r,children:i}){return e.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 font-semibold mb-3",children:[e.jsx(r,{size:18})," ",n]}),e.jsx("p",{className:"text-sm text-slate-600 dark:text-slate-400",children:i})]})}export{A as default};
