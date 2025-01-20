import{d as y,u as j,r as _,o as v,_ as h,c as i,a as t,t as o,n as b,F as g,b as x,k as S,e as c}from"./index-CyWGbrK6.js";import{u as k}from"./project-CVlk6ne3.js";const P=y({__name:"ProjectDetail",setup(p,{expose:s}){s();const a=j(),e=k(),l=_([]),m=_([]);v(async()=>{const n=a.params.id;await e.fetchProject(n)});const u={route:a,projectStore:e,buildings:l,workItems:m,formatCurrency:n=>n.toLocaleString("en-US",{minimumFractionDigits:2}),formatDate:n=>new Date(n).toLocaleDateString(),getStatusClass:n=>({PLANNING:"bg-yellow-100 text-yellow-800",IN_PROGRESS:"bg-blue-100 text-blue-800",COMPLETED:"bg-green-100 text-green-800",ON_HOLD:"bg-red-100 text-red-800"})[n]||"",editProject:()=>{},addBuilding:()=>{},editBuilding:n=>{},addWorkItem:()=>{},editWorkItem:n=>{}};return Object.defineProperty(u,"__isScriptSetup",{enumerable:!1,value:!0}),u}}),C={key:0,class:"space-y-6"},w={class:"flex justify-between items-center"},D={class:"text-2xl font-bold"},I={class:"bg-white shadow rounded-lg p-6"},B={class:"grid grid-cols-1 md:grid-cols-3 gap-6"},E={class:"mt-1"},W={class:"mt-1"},N={class:"mt-1"},L={class:"mt-1"},O={class:"mt-1"},A={class:"mt-1"},V={class:"grid grid-cols-1 md:grid-cols-2 gap-6"},F={class:"bg-white shadow rounded-lg p-6"},R={class:"space-y-4"},T={class:"font-medium"},z={class:"text-sm text-gray-500"},G=["onClick"],M={class:"bg-white shadow rounded-lg p-6"},U={class:"space-y-4"},H={class:"font-medium"},q={class:"text-sm text-gray-500"},J=["onClick"];function K(p,s,a,e,l,m){return e.projectStore.currentProject?(c(),i("div",C,[t("div",w,[t("h2",D,o(e.projectStore.currentProject.name),1),t("div",{class:"flex space-x-4"},[t("button",{onClick:e.editProject,class:"bg-primary-600 text-white px-4 py-2 rounded"}," Edit Project ")])]),t("div",I,[t("div",B,[t("div",null,[s[0]||(s[0]=t("h3",{class:"text-sm font-medium text-gray-500"},"Client",-1)),t("p",E,o(e.projectStore.currentProject.client),1)]),t("div",null,[s[1]||(s[1]=t("h3",{class:"text-sm font-medium text-gray-500"}," Contract Value ",-1)),t("p",W," $"+o(e.formatCurrency(e.projectStore.currentProject.contractValue)),1)]),t("div",null,[s[2]||(s[2]=t("h3",{class:"text-sm font-medium text-gray-500"},"Status",-1)),t("p",N,[t("span",{class:b([e.getStatusClass(e.projectStore.currentProject.status),"px-2 py-1 rounded-full text-xs"])},o(e.projectStore.currentProject.status),3)])]),t("div",null,[s[3]||(s[3]=t("h3",{class:"text-sm font-medium text-gray-500"}," Contract Type ",-1)),t("p",L,o(e.projectStore.currentProject.contractType),1)]),t("div",null,[s[4]||(s[4]=t("h3",{class:"text-sm font-medium text-gray-500"}," Start Date ",-1)),t("p",O,o(e.formatDate(e.projectStore.currentProject.startDate)),1)]),t("div",null,[s[5]||(s[5]=t("h3",{class:"text-sm font-medium text-gray-500"},"Address",-1)),t("p",A,o(e.projectStore.currentProject.address),1)])])]),t("div",V,[t("div",F,[t("div",{class:"flex justify-between items-center mb-4"},[s[6]||(s[6]=t("h3",{class:"text-lg font-medium"},"Buildings",-1)),t("button",{onClick:e.addBuilding,class:"text-primary-600 hover:text-primary-700"}," Add Building ")]),t("div",R,[(c(!0),i(g,null,x(e.buildings,r=>{var d;return c(),i("div",{key:r.id,class:"flex justify-between items-center p-4 border rounded"},[t("div",null,[t("p",T,o(r.name),1),t("p",z,o(((d=r.elevations)==null?void 0:d.length)||0)+" Elevations ",1)]),t("button",{onClick:f=>e.editBuilding(r),class:"text-gray-600 hover:text-primary-600"}," Edit ",8,G)])}),128))])]),t("div",M,[t("div",{class:"flex justify-between items-center mb-4"},[s[7]||(s[7]=t("h3",{class:"text-lg font-medium"},"Work Items",-1)),t("button",{onClick:e.addWorkItem,class:"text-primary-600 hover:text-primary-700"}," Add Work Item ")]),t("div",U,[(c(!0),i(g,null,x(e.workItems,r=>(c(),i("div",{key:r.id,class:"flex justify-between items-center p-4 border rounded"},[t("div",null,[t("p",H,o(r.code)+" - "+o(r.description),1),t("p",q," $"+o(e.formatCurrency(r.unitPrice))+"/"+o(r.unit),1)]),t("button",{onClick:d=>e.editWorkItem(r),class:"text-gray-600 hover:text-primary-600"}," Edit ",8,J)]))),128))])])])])):S("",!0)}const ot=h(P,[["render",K],["__file","/Users/imtiazrayhan/xpertbuild/src/client/views/projects/ProjectDetail.vue"]]);export{ot as default};
