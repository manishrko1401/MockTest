const a1=document.getElementById("z6"),a2=document.getElementById("z7"),a3=document.getElementById("z8"),
a4=document.getElementById("y1"),a5=document.getElementById("z0"),a6=document.getElementById("y7"),
a7=document.getElementById("y2"),a8=document.getElementById("z9");let b1=600,
b2=0,b3=null,b4=!1,b5=0,b6=0,b7="";function c1(){document.fullscreenElement?a8.textContent="Exit Full Screen":a8.textContent="Full Screen"}
function c2(){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(e=>console.log(`Error: ${e.message}`))}
document.addEventListener("fullscreenchange",c1);document.addEventListener("webkitfullscreenchange",c1);document.addEventListener("mozfullscreenchange",c1);document.addEventListener("MSFullscreenChange",c1);
function d1(){b4||(b4=!0,b3=setInterval(()=>{b2++;b1--;const m=Math.floor(b1/60),s=b1%60;a3.textContent=`00:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`,b1<=0&&(clearInterval(b3),e1(!0))},1e3))}
function e1(f=!1){!a2.value.trim()&&!f?alert("Please type something!"):(
    a6.value=a2.value.replace(/\r\n|\r|\n/g,"\n"),
    a7.value=b2,
    document.getElementById("y3").value=a2.value.length,
    document.getElementById("y4").value=b5,
    document.getElementById("y5").value=b6,
        fetch("record_attempt.php",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`user_id=67494&passage_id=2454`}).catch(()=>{}),
        g1())}

/* ============================================================
   CDN-resilient submission (g1)
   The host CDN sometimes serves a "Checking your browser…"
   challenge on POST requests over public WiFi. A normal
   form.submit() POST gets its body dropped by that challenge,
   so result4.php sees an empty request and bounces the user to
   the homepage with no result.
   Fix: save the result locally BEFORE sending, submit via fetch
   so the challenge can be DETECTED, reload top-level so the
   browser actually solves it, then auto-resubmit. Finally reach
   the result page with a GET, which is replay-safe.
   No UI, styling, or scoring logic is changed by this block.
   ============================================================ */
const G_ENDPOINT=a4.getAttribute("action"),G_PENDING="tm_pending_t4_v1",G_RETRY="tm_cf_retry_t4_v1",G_MAXRETRY=3;
let g_busy=!1;

function g_overlay(msg,note,withBtn,payload){
    let o=document.getElementById("tm-cf-overlay");
    if(!o){
        o=document.createElement("div");o.id="tm-cf-overlay";
        o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;";
        o.innerHTML='<div style="background:#fff;border-radius:10px;padding:26px 30px;max-width:420px;text-align:center;font-family:Arial,Helvetica,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)"><div id="tm-cf-msg" style="font-size:17px;font-weight:700;color:#111;margin-bottom:8px"></div><div id="tm-cf-note" style="font-size:14px;color:#555"></div><div id="tm-cf-act"></div></div>';
        document.body.appendChild(o);
    }
    o.style.display="flex";
    document.getElementById("tm-cf-msg").textContent=msg||"";
    document.getElementById("tm-cf-note").textContent=note||"";
    const act=document.getElementById("tm-cf-act");act.innerHTML="";
    if(withBtn){
        const b=document.createElement("button");
        b.textContent="Continue & Show My Result";
        b.style.cssText="margin-top:16px;padding:11px 20px;border:none;border-radius:6px;background:#335c91;color:#fff;font-size:15px;font-weight:700;cursor:pointer";
        b.addEventListener("click",()=>{b.disabled=!0;sessionStorage.removeItem(G_RETRY);g_overlay("Submitting your result…","Please do not close this page.",!1);g2(payload)});
        act.appendChild(b);
    }
}

function g_payload(){
    return{
        endpoint:G_ENDPOINT,
        passage_id:(a4.querySelector("[name=passage_id]")||{}).value||"0",
        duration:(document.getElementById("y8")||{}).value||"0",
        is_custom:(a4.querySelector("[name=is_custom]")||{}).value||"0",
        backspace_disabled:(document.getElementById("y6")||{}).value||"0",
        custom_content:(document.getElementById("y9")||{}).value||"",
        typed_text:a6.value,
        time_taken:a7.value,
        keystroke_count:(document.getElementById("y3")||{}).value||"0",
        backspace_count:(document.getElementById("y4")||{}).value||"0",
        mistakes_count:(document.getElementById("y5")||{}).value||"0"
    };
}

function g_fd(p){
    const f=new FormData();
    f.append("passage_id",p.passage_id);
    f.append("duration",p.duration);
    f.append("is_custom",p.is_custom);
    f.append("backspace_disabled",p.backspace_disabled);
    if(p.custom_content)f.append("custom_content",p.custom_content);
    f.append("typed_text",p.typed_text);
    f.append("time_taken",p.time_taken);
    f.append("keystroke_count",p.keystroke_count);
    f.append("backspace_count",p.backspace_count);
    f.append("mistakes_count",p.mistakes_count);
    f.append("ajax","1");
    return f;
}

function g_isChallenge(status,text){
    if(0===status||403===status||429===status||503===status)return!0;
    if(!text)return!1;
    const t=text.toLowerCase();
    return-1!==t.indexOf("just a moment")||-1!==t.indexOf("checking your browser")||-1!==t.indexOf("cf-browser-verification")||-1!==t.indexOf("__cf_chl")||-1!==t.indexOf("cf-challenge")||-1!==t.indexOf("attention required")||-1!==t.indexOf("verifying you are human")||-1!==t.indexOf("enable javascript and cookies to continue")||-1!==t.indexOf("ddos-guard")||-1!==t.indexOf("please wait while we are checking your browser");
}

function g_challenge(p){
    try{sessionStorage.setItem(G_PENDING,JSON.stringify(p))}catch(e){}
    let r=parseInt(sessionStorage.getItem(G_RETRY)||"0",10);
    if(r>=G_MAXRETRY){
        g_overlay("Your network needs a quick security check.","Your result is safely saved. Tap below to finish.",!0,p);
        return;
    }
    sessionStorage.setItem(G_RETRY,String(r+1));
    g_overlay("Verifying your network…","Please wait a moment. Do not close this page.",!1);
    /* Top-level reload lets the browser solve the CDN challenge and store
       its clearance cookie; the saved result is replayed right after. */
    setTimeout(()=>{window.location.reload()},1200);
}

async function g2(p){
    try{sessionStorage.setItem(G_PENDING,JSON.stringify(p))}catch(e){}
    let resp,text="";
    try{
        resp=await fetch(p.endpoint||G_ENDPOINT,{
            method:"POST",body:g_fd(p),credentials:"same-origin",
            headers:{"X-Requested-With":"XMLHttpRequest"},redirect:"follow",cache:"no-store"
        });
        text=await resp.text();
    }catch(e){return g_challenge(p)}

    let data=null;
    const ct=(resp.headers.get("content-type")||"").toLowerCase(),tr=(text||"").trim();
    if(-1!==ct.indexOf("application/json")||"{"===tr.charAt(0)){try{data=JSON.parse(tr)}catch(e){data=null}}

    if(data&&!0===data.ok){
        try{sessionStorage.removeItem(G_PENDING);sessionStorage.removeItem(G_RETRY)}catch(e){}
        const base=String(p.endpoint||G_ENDPOINT).split("?")[0];
        const url=data.result_id?base+"?result_id="+encodeURIComponent(data.result_id):(data.redirect||base);
        window.location.replace(url);
        return;
    }
    if(data&&!1===data.ok){
        try{sessionStorage.removeItem(G_PENDING);sessionStorage.removeItem(G_RETRY)}catch(e){}
        g_overlay("Could not save your result.",data.error||"Please try again.",!0,p);
        return;
    }
    if(g_isChallenge(resp.status,text))return g_challenge(p);

    /* Unknown non-JSON reply → fall back to the original navigation POST. */
    try{sessionStorage.removeItem(G_PENDING);sessionStorage.removeItem(G_RETRY)}catch(e){}
    a4.submit();
}

function g1(){
    if(g_busy)return;
    g_busy=!0;
    a2.disabled=!0;a5.disabled=!0;
    try{sessionStorage.removeItem(G_RETRY)}catch(e){}
    g2(g_payload());
}

function g3(){
    let raw=null;
    try{raw=sessionStorage.getItem(G_PENDING)}catch(e){raw=null}
    if(!raw)return;
    let p;
    try{p=JSON.parse(raw)}catch(e){try{sessionStorage.removeItem(G_PENDING)}catch(e2){}return}
    g_busy=!0;a2.disabled=!0;a5.disabled=!0;
    if(b3){clearInterval(b3);b3=null}
    g_overlay("Network verified — saving your result…","Almost done. Do not close this page.",!1);
    setTimeout(()=>{g2(p)},400);
}
/* ============================================================
   TYPING SOUND (speaker toggle in header)
   Plays sound.mp3 on every key press while enabled.
   State is remembered in localStorage so the learner does not
   have to switch it on for every test.
   ============================================================ */
const s4=document.getElementById("z10"),s5=document.getElementById("z11"),s6=document.getElementById("z13");
let s7=!1;

function s0(){
    if(!s4)return;
    s4.classList.toggle("on",s7);
    s4.classList.toggle("off",!s7);
    s4.setAttribute("aria-pressed",s7?"true":"false");
    s4.title="Typing Sound: "+(s7?"On":"Off");
    if(s5)s5.textContent=s7?"Sound On":"Sound Off";
}

function s1(){
    s7=!s7;s0();
    try{localStorage.setItem("tm_t4_sound",s7?"1":"0")}catch(e){}
    if(s6){
        s6.volume=.35;
        if(s7){ if(s6.paused){s6.play().catch(()=>{})} }
        else{s6.pause();try{s6.currentTime=0}catch(e){}}
    }
    if(a2&&!a2.disabled)a2.focus();
}

function s2(){
    /* Typing par sound ko RESET nahi karna hai. Sirf itna dekhna hai ki
       kisi wajah se (tab switch, browser policy) pause to nahi ho gaya. */
    if(!s7||!s6)return;
    if(s6.paused){try{s6.play().catch(()=>{})}catch(e){}}
}

function s3(){
    let v=null;try{v=localStorage.getItem("tm_t4_sound")}catch(e){}
    s7="1"===v;
    if(s6){
        s6.volume=.35;
        s6.loop=!0;
        /* MP3 ke loop point par encoder padding se halka gap aata hai.
           Track khatam hone se thoda pehle wapas 0 par le jaane se
           loop seamless mehsoos hota hai. */
        s6.addEventListener("timeupdate",()=>{
            if(s6.duration&&s6.currentTime>s6.duration-.25){try{s6.currentTime=0}catch(e){}}
        });
        /* Autoplay policy: page load par sound on hone par bhi browser
           tab tak nahi bajayega jab tak user ne interact na kiya ho.
           Pehle click/keypress par chalu kar dete hain. */
        const s8=()=>{if(s7&&s6.paused){s6.play().catch(()=>{})}};
        document.addEventListener("click",s8);
        document.addEventListener("keydown",s8);
        /* Tab wapas aane par sound dobara chalu */
        document.addEventListener("visibilitychange",()=>{
            if(!document.hidden&&s7&&s6.paused){s6.play().catch(()=>{})}
        });
    }
    s0();
}

function f1(g){
    const h=parseInt(window.getComputedStyle(a1).fontSize)||17;let i=g===0?17:h+g;
    i=Math.max(14,Math.min(36,i));let j=1.5;
    i>20?j=1.45-(i-20)*.008:i<16&&(j=1.58+(16-i)*.015),
    j=Math.max(1.38,Math.min(1.65,j)),
    a1.style.fontSize=i+"px",
    a1.style.lineHeight=j+"em",
    a2.style.fontSize=i+1+"px",
    a2.style.lineHeight=j+"em"
}
document.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("keydown",e=>{
    if(e.ctrlKey||e.metaKey){if(["a","c","v","x","s","u","p","f","r","i","j","k"].includes(e.key.toLowerCase()))return e.preventDefault()}
    ("F12"===e.key||(e.ctrlKey&&e.shiftKey&&"I"===e.key))&&e.preventDefault()
});
document.addEventListener("selectstart",e=>{"custom-content"!==e.target.id&&"z7"!==e.target.id&&e.preventDefault()});
a2.addEventListener("input",()=>{!b4&&a2.value.trim()&&d1();const k=a2.value;k.length<b7.length&&(b6+=b7.length-k.length),b7=k});
a2.addEventListener("keydown",e=>{
    e.ctrlKey||e.metaKey||e.altKey||!e.key||(1===e.key.length||"Backspace"===e.key||"Enter"===e.key||"Tab"===e.key)&&s2();
    "Tab"===e.key?(e.preventDefault(),a2.setRangeText("    ",a2.selectionStart,a2.selectionEnd,"end")):"Backspace"===e.key&&(b5++)
});
a5.addEventListener("click",()=>e1());
window.addEventListener("load",()=>{a1&&(a1.textContent=a1.textContent.trim()),a2.focus(),f1(0),c1(),s3(),g3()});