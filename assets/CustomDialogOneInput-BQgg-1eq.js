import{S as T,i as j,s as L,j as A,c as M,l as c,f as m,m as v,t as G,a as H,g as d,d as J,o as K,e as P,k as Q,D as R,y as U}from"./index-DRMiRhuH.js";import{A as W}from"./ActionButton-DSQRQR0L.js";function z(u){let e,l,i;return{c(){e=A("i"),c(e,"class",l=`${u[3]} ${u[2]}`),c(e,"style",i=u[0]?"margin-right: 8px;":"")},m(t,o){m(t,e,o)},p(t,o){o&12&&l!==(l=`${t[3]} ${t[2]}`)&&c(e,"class",l),o&1&&i!==(i=t[0]?"margin-right: 8px;":"")&&c(e,"style",i)},d(t){t&&d(e)}}}function X(u){let e,l,i=u[2]&&z(u);return{c(){i&&i.c(),e=P(),l=Q(u[0])},m(t,o){i&&i.m(t,o),m(t,e,o),m(t,l,o)},p(t,o){t[2]?i?i.p(t,o):(i=z(t),i.c(),i.m(e.parentNode,e)):i&&(i.d(1),i=null),o&1&&R(l,t[0])},d(t){t&&(d(e),d(l)),i&&i.d(t)}}}function Y(u){let e,l,i;return l=new W({props:{appearance:"plain",extraClass:"btn-menuSeller",style:u[1],$$slots:{default:[X]},$$scope:{ctx:u}}}),l.$on("click",u[5]),{c(){e=A("span"),M(l.$$.fragment),c(e,"style",u[4])},m(t,o){m(t,e,o),v(l,e,null),i=!0},p(t,[o]){const f={};o&2&&(f.style=t[1]),o&1048589&&(f.$$scope={dirty:o,ctx:t}),l.$set(f),(!i||o&16)&&c(e,"style",t[4])},i(t){i||(G(l.$$.fragment,t),i=!0)},o(t){H(l.$$.fragment,t),i=!1},d(t){t&&d(e),J(l)}}}function Z(u,e,l){let{nameButton:i=""}=e,{titleFirst:t=""}=e,{subtitle:o=""}=e,{btn:f=""}=e,{btnSubtitle:y=""}=e,{onSubmit:S=()=>{}}=e,{btnStyle:h=""}=e,{icon:F=""}=e,{iconClass:k="fa-light"}=e,{onClose:b=()=>{}}=e,{autoOpen:g=!1}=e,{userId:_=null}=e,{defaultValue:C=""}=e,{wrapperStyle:w="display: block;"}=e,s=null,x=!1;function N(n){S(n,_)}function V(){x||(x=!0,s=null,b&&b())}function B(){s&&s.close(),V()}function I(){if(s){s.open();return}x=!1,s=U.dialog.create({destroyOnClose:!0,title:`
                <div class="btnCustomDialogTitle" style="position: relative;">
                    <i class="f7-icons close-icon" style="position: absolute; right: 0px; top: auto; color:#667085; font-size: 24px; cursor: pointer;">xmark</i>
                ${t}
            </div>
        `,text:`
              <div class="btnCustomDialogSubtitle">
                  ${o}
              </div>
          `,content:`
                    <div style="height: 40px; margin-top: 10px; width=90%">
                            <div class="item-content">
                            <div style="
                            box-sizing: border-box;
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            padding: 10px 14px;
                            gap: 8px;
                            height: 44px;
                            background: var(--dialog-content-bg, #FFFFFF);
                            border: 1px solid #D0D5DD;
                            box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
                            border-radius: 8px;
                            ">
                                <input type="text" id="inputValue" placeholder="${y}" value="${C??""}" style="width: 90%; box-sizing: border-box;">
                                </div>
                            </div>
                    </div>
                    `,buttons:[{text:f,onClick:()=>{var a,r;const n=((r=(a=s==null?void 0:s.el)==null?void 0:a.querySelector("#inputValue"))==null?void 0:r.value)??"";try{N(n)}finally{B()}}}],onClose:()=>{V()}}),setTimeout(()=>{var r,O,q,D;const n=(r=s==null?void 0:s.el)==null?void 0:r.querySelector(".close-icon");n&&n.addEventListener("click",()=>{B()});const a=(O=s==null?void 0:s.el)==null?void 0:O.querySelector("#inputValue");(q=a==null?void 0:a.focus)==null||q.call(a),(D=a==null?void 0:a.select)==null||D.call(a)},100),s.open()}return K(()=>{g&&I()}),u.$$set=n=>{"nameButton"in n&&l(0,i=n.nameButton),"titleFirst"in n&&l(6,t=n.titleFirst),"subtitle"in n&&l(7,o=n.subtitle),"btn"in n&&l(8,f=n.btn),"btnSubtitle"in n&&l(9,y=n.btnSubtitle),"onSubmit"in n&&l(10,S=n.onSubmit),"btnStyle"in n&&l(1,h=n.btnStyle),"icon"in n&&l(2,F=n.icon),"iconClass"in n&&l(3,k=n.iconClass),"onClose"in n&&l(11,b=n.onClose),"autoOpen"in n&&l(12,g=n.autoOpen),"userId"in n&&l(13,_=n.userId),"defaultValue"in n&&l(14,C=n.defaultValue),"wrapperStyle"in n&&l(4,w=n.wrapperStyle)},[i,h,F,k,w,I,t,o,f,y,S,b,g,_,C]}class $ extends T{constructor(e){super(),j(this,e,Z,Y,L,{nameButton:0,titleFirst:6,subtitle:7,btn:8,btnSubtitle:9,onSubmit:10,btnStyle:1,icon:2,iconClass:3,onClose:11,autoOpen:12,userId:13,defaultValue:14,wrapperStyle:4})}}export{$ as C};
