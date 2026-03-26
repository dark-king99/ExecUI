import{j as e}from"./index-CzWBMTfm.js";function m({role:n}){const t=n??"employee",a=t==="enterprise_admin"||t==="system_admin",i=[{id:1,name:"Customer Support",members:["Alice","Bob"]},{id:2,name:"Sales",members:["Charlie"]}];return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold text-slate-800",children:"Teams"}),e.jsx("p",{className:"text-sm text-slate-500",children:"Organize users into functional teams"})]}),e.jsx("div",{className:"space-y-3",children:i.map(s=>e.jsx("div",{className:`
              rounded-xl border bg-white p-4
              transition-all duration-200
              hover:-translate-y-0.5 hover:shadow-md
            `,children:e.jsxs("div",{className:"flex justify-between items-start",children:[e.jsxs("div",{children:[e.jsx("p",{className:"font-medium text-slate-800",children:s.name}),e.jsxs("p",{className:"text-sm text-slate-600",children:["Members: ",s.members.join(", ")]})]}),a&&e.jsx("button",{className:"text-sm text-indigo-600 hover:underline",children:"Manage"})]})},s.id))}),a?e.jsx("button",{className:`
            px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm
            hover:bg-indigo-700 transition
          `,children:"Create New Team"}):e.jsx("p",{className:"text-xs text-slate-400",children:"Team management is restricted to administrators."})]})}export{m as default};
