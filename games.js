(function(){
"use strict";
var canvas=document.getElementById("gameCanvas");
var ctx=canvas?canvas.getContext("2d"):null;
var container=document.getElementById("gameContainer");
var titleEl=document.getElementById("gameTitle");
var scoreEl=document.getElementById("gameScore");
var overlay=document.getElementById("gameOverlay");
var overlayTitle=document.getElementById("overlayTitle");
var overlayMsg=document.getElementById("overlayMessage");
var overlayBtn=document.getElementById("overlayBtn");
var currentGame=null,animFrame=null,audioCtx=null;
var mouseLocked=false,mouseX=0,mouseY=0,velX=0,velY=0;

var weaponImgs={m4:null,glock:null,knife:null,grenade:null,hands:null};
var imgsLoaded=0,imgsTotal=5;
function loadWeaponImages(){
  var map=[["m4","weapon-m4.png"],["glock","weapon-glock.png"],["knife","weapon-knife.png"],["grenade","weapon-grenade.png"],["hands","hands-glock.png"]];
  for(var i=0;i<map.length;i++){
    (function(n,f){var img=new Image();img.onload=function(){weaponImgs[n]=img;imgsLoaded++;};img.onerror=function(){};img.src="images/"+f;})(map[i][0],map[i][1]);
  }
}
loadWeaponImages();

function getAC(){if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}return audioCtx;}
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){if(typeof r==="number")r={tl:r,tr:r,br:r,bl:r};var rad=r.tl||r||0;this.moveTo(x+rad,y);this.lineTo(x+w-rad,y);this.arcTo(x+w,y,x+w,y+rad,rad);this.lineTo(x+w,y+h-rad);this.arcTo(x+w,y+h,x+w-rad,y+h,rad);this.lineTo(x+rad,y+h);this.arcTo(x,y+h,x,y+h-rad,rad);this.lineTo(x,y+rad);this.arcTo(x,y,x+rad,y,rad);this.closePath();return this;};}
function osc(f,t,d,v){var a=getAC();if(!a)return;var o=a.createOscillator(),g=a.createGain();o.type=t||"square";o.frequency.value=f;g.gain.value=v||0.08;g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+(d||0.1));o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+(d||0.1));}
function noise(d,f,v,dc){var a=getAC();if(!a)return;var b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),dd=b.getChannelData(0);for(var i=0;i<dd.length;i++){var t=i/a.sampleRate;dd[i]=(Math.random()*2-1)*Math.exp(-t*(dc||30))*v+Math.sin(t*f)*Math.exp(-t*(dc||30))*v*0.5;}var s=a.createBufferSource();s.buffer=b;var g=a.createGain();g.gain.value=v;s.connect(g);g.connect(a.destination);s.start();}
function sndShoot(){noise(0.08,100,0.18,40);}
function sndHeavy(){noise(0.12,180,0.22,30);}
function sndKnife(){noise(0.06,3000,0.12,50);}
function sndGrenade(){noise(0.5,60,0.35,8);}
function sndHit(){osc(300,"sine",0.1,0.1);}
function sndHeadshot(){osc(800,"sine",0.08,0.15);setTimeout(function(){osc(1200,"sine",0.06,0.12);},40);}
function sndEat(){osc(600,"sine",0.08,0.07);}
function sndDeath(){osc(200,"sawtooth",0.3,0.1);setTimeout(function(){osc(100,"sawtooth",0.4,0.08);},150);}
function sndClick(){osc(1000,"sine",0.04,0.05);}
function sndPickup(){osc(880,"sine",0.1,0.07);setTimeout(function(){osc(1100,"sine",0.1,0.06);},80);}
function sndReload(){osc(440,"square",0.05,0.06);setTimeout(function(){osc(660,"square",0.05,0.06);},60);}
function sndTick(){osc(1800,"sine",0.015,0.02);}
function sndStep(){osc(120,"triangle",0.05,0.03);}
function sndEnemyHurt(){osc(250,"sawtooth",0.08,0.06);}
function sndEnemyDie(){osc(180,"sawtooth",0.15,0.08);setTimeout(function(){osc(100,"square",0.3,0.06);},80);}
function sndExplosion(){noise(0.6,40,0.35,6);}
function sndEnemyShoot(){noise(0.06,400,0.12,50);}
function sndRegen(){osc(520,"sine",0.04,0.03);}

function resizeCanvas(w,h,fullscreen){if(!canvas)return;canvas.width=w;canvas.height=h;if(fullscreen){canvas.style.width="100%";canvas.style.height="";}else{canvas.style.width=w+"px";canvas.style.height=h+"px";}}
function updateScore(t){if(scoreEl)scoreEl.textContent=t;}
function showOverlay(t,m,b){if(overlayTitle)overlayTitle.textContent=t;if(overlayMsg)overlayMsg.textContent=m;if(overlayBtn)overlayBtn.textContent=b||"Play Again";if(overlay)overlay.classList.remove("hidden");}
function hideOverlay(){if(overlay)overlay.classList.add("hidden");}

function cleanup(){
  if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
  if(currentGame&&currentGame.destroy)currentGame.destroy();
  currentGame=null;document.onkeydown=null;document.onkeyup=null;
  if(canvas){canvas.onmousedown=null;canvas.onmouseup=null;canvas.onmousemove=null;canvas.oncontextmenu=null;canvas.onclick=null;}
  container.classList.remove("game-fps-fullscreen");
  var h=container.querySelector(".game-header");if(h)h.style.display="";
  if(document.pointerLockElement)document.exitPointerLock();
  mouseLocked=false;mouseX=0;mouseY=0;velX=0;velY=0;
  if(canvas)canvas.style.cursor="default";
}

window.closeGame=function(){cleanup();if(container)container.classList.add("hidden");if(overlay)overlay.classList.add("hidden");};
window.restartGame=function(){if(currentGame&&currentGame.restart){hideOverlay();currentGame.restart();}};

window.startGame=function(type){
  cleanup();if(container)container.classList.remove("hidden");hideOverlay();
  if(type==="snake"){if(titleEl)titleEl.textContent="Snake";container.classList.add("game-fps-fullscreen");var h1=container.querySelector(".game-header");if(h1)h1.style.display="none";initSnake();}
  else if(type==="aim"){if(titleEl)titleEl.textContent="Aim Trainer";container.classList.add("game-fps-fullscreen");var h2=container.querySelector(".game-header");if(h2)h2.style.display="none";initAim();}
  else if(type==="fight"){if(titleEl)titleEl.textContent="Devora Fight";container.classList.add("game-fps-fullscreen");var h3=container.querySelector(".game-header");if(h3)h3.style.display="none";initFight();}
};

document.addEventListener("mousemove",function(e){
  if(mouseLocked&&currentGame){mouseX+=e.movementX||0;mouseY+=e.movementY||0;}
});

function initSnake(){
  var CELL=16,COLS,ROWS,snake,dir,nextDir,food,score,speed,running,lastTime,accum;
  var W=window.innerWidth,H=window.innerHeight;
  var BAR_H=52;
  var closeBtn={x:16,y:10,w:32,h:32};

  function init(){
    resizeCanvas(W,H,true);
    if(canvas)canvas.style.cursor="default";
    COLS=Math.floor(canvas.width/CELL);
    ROWS=Math.floor((canvas.height-BAR_H)/CELL);
    snake=[{x:Math.floor(COLS/2),y:Math.floor(ROWS/2)}];
    dir={x:1,y:0};nextDir={x:1,y:0};
    score=0;speed=120;running=true;lastTime=0;accum=0;
    placeFood();updateScore("");
    canvas.onmousedown=onMouse;
    document.onkeydown=onKey;
    loop(0);
  }

  function onMouse(e){
    var rect=canvas.getBoundingClientRect();
    var mx=(e.clientX-rect.left)*(canvas.width/rect.width);
    var my=(e.clientY-rect.top)*(canvas.height/rect.height);
    if(mx>=closeBtn.x&&mx<=closeBtn.x+closeBtn.w&&my>=closeBtn.y&&my<=closeBtn.y+closeBtn.h){
      window.closeGame();
    }
  }

  function placeFood(){var t=0;do{food={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)};t++;}while(isOn(food.x,food.y)&&t<500);}
  function isOn(x,y){for(var i=0;i<snake.length;i++){if(snake[i].x===x&&snake[i].y===y)return true;}return false;}
  function onKey(e){var k=e.key;if((k==="ArrowUp"||k==="w"||k==="W")&&dir.y!==1){nextDir={x:0,y:-1};e.preventDefault();}else if((k==="ArrowDown"||k==="s"||k==="S")&&dir.y!==-1){nextDir={x:0,y:1};e.preventDefault();}else if((k==="ArrowLeft"||k==="a"||k==="A")&&dir.x!==1){nextDir={x:-1,y:0};e.preventDefault();}else if((k==="ArrowRight"||k==="d"||k==="D")&&dir.x!==-1){nextDir={x:1,y:0};e.preventDefault();}}
  function update(){dir=nextDir;var h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.x>=COLS||h.y<0||h.y>=ROWS){gameOver();return;}if(isOn(h.x,h.y)){gameOver();return;}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;sndEat();updateScore("");speed=Math.max(50,120-score*2);placeFood();}else{snake.pop();}}
  function gameOver(){running=false;sndDeath();showOverlay("Game Over!","Your score: "+score,"Play Again");}

  function drawBar(){
    ctx.fillStyle="rgba(255,255,255,0.03)";ctx.fillRect(0,0,canvas.width,BAR_H);
    ctx.fillStyle="rgba(255,255,255,0.06)";ctx.fillRect(0,BAR_H-1,canvas.width,1);
    ctx.fillStyle="rgba(239,68,68,0.15)";
    ctx.beginPath();ctx.roundRect(closeBtn.x,closeBtn.y,closeBtn.w,closeBtn.h,8);ctx.fill();
    ctx.strokeStyle="rgba(239,68,68,0.4)";ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(closeBtn.x,closeBtn.y,closeBtn.w,closeBtn.h,8);ctx.stroke();
    ctx.fillStyle="#ef4444";ctx.font="600 13px Inter, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("\u2715",closeBtn.x+closeBtn.w/2,closeBtn.y+closeBtn.h/2);
    ctx.font="600 13px Inter, sans-serif";ctx.textAlign="center";ctx.fillStyle="rgba(255,255,255,0.5)";
    ctx.fillText("Score: "+score,canvas.width/2,26);
  }

  function draw(){
    ctx.fillStyle="#0a0e1a";ctx.fillRect(0,0,canvas.width,canvas.height);
    drawBar();
    var offY=BAR_H;
    for(var x=0;x<=COLS;x++){ctx.strokeStyle="rgba(255,255,255,0.03)";ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(x*CELL,offY);ctx.lineTo(x*CELL,offY+ROWS*CELL);ctx.stroke();}
    for(var y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,offY+y*CELL);ctx.lineTo(COLS*CELL,offY+y*CELL);ctx.stroke();}
    for(var i=0;i<snake.length;i++){
      var s=snake[i];var b=1-(i/snake.length)*0.5;
      ctx.fillStyle="rgba(52,211,153,"+b+")";ctx.shadowColor="#34d399";ctx.shadowBlur=i===0?6:2;
      ctx.beginPath();ctx.arc(s.x*CELL+CELL/2,offY+s.y*CELL+CELL/2,CELL/2-1,0,Math.PI*2);ctx.fill();
      if(i===0){ctx.fillStyle="#fff";ctx.shadowBlur=0;ctx.beginPath();ctx.arc(s.x*CELL+CELL/2+dir.x*3,offY+s.y*CELL+CELL/2+dir.y*3,2,0,Math.PI*2);ctx.fill();}
    }
    ctx.shadowBlur=0;ctx.fillStyle="#ef4444";ctx.shadowColor="#ef4444";ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(food.x*CELL+CELL/2,offY+food.y*CELL+CELL/2,CELL/2-2,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }

  function loop(time){if(!running)return;if(!lastTime)lastTime=time;accum+=time-lastTime;lastTime=time;if(accum>=speed){update();accum=0;if(!running)return;}draw();animFrame=requestAnimationFrame(loop);}
  currentGame={restart:function(){cleanup();initSnake();},destroy:function(){document.onkeydown=null;canvas.onmousedown=null;}};
  init();
}

function initAim(){
  var targets=[],score=0,timer=30,running=true,lastSpawn=0,timerInterval=null,startTime=0;
  var W=window.innerWidth,H=window.innerHeight;
  var BAR_H=52;
  var level="medium";
  var LEVELS={
    easy:{rMin:10,rMax:22,life:1400,lifeVar:600,spawn:900,spawnVar:500,maxT:6,speed:0.2,speedVar:0.4,mult:1,color:"#23a559",label:"Easy"},
    medium:{rMin:6,rMax:16,life:1100,lifeVar:500,spawn:650,spawnVar:400,maxT:9,speed:0.5,speedVar:0.8,mult:2,color:"#f0b232",label:"Medium"},
    hard:{rMin:4,rMax:11,life:850,lifeVar:400,spawn:450,spawnVar:300,maxT:12,speed:0.8,speedVar:1.2,mult:4,color:"#ef4444",label:"Hard"},
    sohard:{rMin:3,rMax:7,life:600,lifeVar:300,spawn:300,spawnVar:200,maxT:15,speed:1.2,speedVar:1.8,mult:6,color:"#dc2626",label:"So Hard"}
  };
  function L(){return LEVELS[level];}

  var closeBtn={x:12,y:10,w:32,h:32};
  var levelBtns=[];
  var crossX=-100,crossY=-100,crossVisible=false;
  var crossPulse=0,crossRing=0,lastTickTime=0;

  var sens=50,sensDragging=false;
  var sensTrack={x:0,y:0,w:100,h:5};
  var sz=50,szDragging=false;
  var szTrack={x:0,y:0,w:100,h:5};

  function getSizeMult(){return 0.3+(sz/100)*1.7;}
  function getSensMult(){return 0.2+(sens/100)*1.3;}

  function calcLayout(){
    levelBtns=[];
    var labels=["easy","medium","hard","sohard"];
    var bw=64,bh=26,gap=5;
    var totalW=labels.length*(bw+gap)-gap;
    var startX=W-totalW-12;
    for(var i=0;i<labels.length;i++){
      levelBtns.push({key:labels[i],x:startX+(bw+gap)*i,y:13,w:bw,h:bh});
    }
    var rightEdge=levelBtns[0].x-14;
    sensTrack.x=rightEdge-sensTrack.w;
    sensTrack.y=23;
    szTrack.x=sensTrack.x-szTrack.w-14;
    szTrack.y=23;
  }

  function init(){
    calcLayout();
    resizeCanvas(W,H,true);
    if(canvas)canvas.style.cursor="none";
    targets=[];score=0;timer=30;running=true;
    startTime=performance.now();lastSpawn=0;
    crossX=-100;crossY=-100;crossVisible=false;crossPulse=0;crossRing=0;
    sens=50;sensDragging=false;sz=50;szDragging=false;
    updateScore("");
    canvas.onmousedown=onMouse;
    canvas.onmousemove=onMouseMove;
    canvas.onmouseup=function(){sensDragging=false;szDragging=false;};
    canvas.onmouseenter=function(){crossVisible=true;};
    canvas.onmouseleave=function(){crossVisible=false;sensDragging=false;szDragging=false;};
    document.onkeydown=function(e){if(e.key==="Escape")window.closeGame();};
    timerInterval=setInterval(function(){
      timer--;
      if(timer<=0){running=false;clearInterval(timerInterval);showOverlay("Time's Up!","Score: "+Math.round(score)+" | Level: "+L().label,"Play Again");}
    },1000);
    loop(0);
  }

  function onMouseMove(e){
    var rect=canvas.getBoundingClientRect();
    var rawX=(e.clientX-rect.left)*(canvas.width/rect.width);
    var rawY=(e.clientY-rect.top)*(canvas.height/rect.height);
    if(sensDragging){
      var nx=(rawX-sensTrack.x)/sensTrack.w;
      sens=Math.max(0,Math.min(100,Math.round(nx*100)));
      return;
    }
    if(szDragging){
      var nx2=(rawX-szTrack.x)/szTrack.w;
      sz=Math.max(0,Math.min(100,Math.round(nx2*100)));
      return;
    }
    var mult=getSensMult();
    crossX=canvas.width/2+(rawX-canvas.width/2)*mult;
    crossY=canvas.height/2+(rawY-canvas.height/2)*mult;
    crossVisible=true;
    var now=performance.now();
    if(now-lastTickTime>80){sndTick();lastTickTime=now;crossRing=1;}
  }

  function spawn(){
    var l=L();
    var sm=getSizeMult();
    var rMin=l.rMin*sm,rMax=l.rMax*sm;
    var r=rMin+Math.random()*(rMax-rMin);
    targets.push({
      x:r+Math.random()*(canvas.width-r*2),
      y:BAR_H+r+Math.random()*(canvas.height-BAR_H-r*2),
      r:r,born:performance.now(),
      life:l.life+Math.random()*l.lifeVar,
      speed:l.speed+Math.random()*l.speedVar,
      vx:(Math.random()-0.5)*2,
      vy:(Math.random()-0.5)*2
    });
  }

  function onMouse(e){
    var rect=canvas.getBoundingClientRect();
    var mx=(e.clientX-rect.left)*(canvas.width/rect.width);
    var my=(e.clientY-rect.top)*(canvas.height/rect.height);

    if(mx>=szTrack.x-8&&mx<=szTrack.x+szTrack.w+8&&my>=szTrack.y-14&&my<=szTrack.y+szTrack.h+14){
      szDragging=true;
      sz=Math.max(0,Math.min(100,Math.round(((mx-szTrack.x)/szTrack.w)*100)));
      sndClick();return;
    }
    if(mx>=sensTrack.x-8&&mx<=sensTrack.x+sensTrack.w+8&&my>=sensTrack.y-14&&my<=sensTrack.y+sensTrack.h+14){
      sensDragging=true;
      sens=Math.max(0,Math.min(100,Math.round(((mx-sensTrack.x)/sensTrack.w)*100)));
      sndClick();return;
    }
    for(var i=0;i<levelBtns.length;i++){
      var b=levelBtns[i];
      if(mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h){level=b.key;sndClick();return;}
    }
    if(mx>=closeBtn.x&&mx<=closeBtn.x+closeBtn.w&&my>=closeBtn.y&&my<=closeBtn.y+closeBtn.h){window.closeGame();return;}
    if(!running)return;
    crossPulse=1;
    var mult=getSensMult();
    var adjX=canvas.width/2+(mx-canvas.width/2)*mult;
    var adjY=canvas.height/2+(my-canvas.height/2)*mult;
    for(var j=targets.length-1;j>=0;j--){
      var tg=targets[j];
      var dx=adjX-tg.x,dy=adjY-tg.y;
      if(dx*dx+dy*dy<=tg.r*tg.r){
        targets.splice(j,1);
        score+=L().mult;
        sndHit();return;
      }
    }
    sndClick();
  }

  function drawSlider(track,val,dragging,label,color1,color2){
    var tx=track.x,ty=track.y,tw=track.w,th=track.h;
    ctx.font="500 10px Inter, sans-serif";ctx.textAlign="right";ctx.textBaseline="middle";
    ctx.fillStyle="rgba(255,255,255,0.35)";ctx.fillText(label,tx-8,ty+3);
    ctx.fillStyle="rgba(255,255,255,0.06)";
    ctx.beginPath();ctx.roundRect(tx,ty,tw,th,3);ctx.fill();
    var fw=(val/100)*tw;
    var g=ctx.createLinearGradient(tx,0,tx+tw,0);
    g.addColorStop(0,color1);g.addColorStop(1,val>=80?color2:color1);
    ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(tx,ty,fw,th,3);ctx.fill();
    var hx=tx+fw;
    ctx.fillStyle="#fff";ctx.shadowColor=color1+"80";ctx.shadowBlur=dragging?10:4;
    ctx.beginPath();ctx.arc(hx,ty+th/2,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle="#0a0e1a";ctx.beginPath();ctx.arc(hx,ty+th/2,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="600 9px Inter, sans-serif";ctx.textAlign="center";
    ctx.fillText(val+"%",hx,ty-7);
  }

  function draw(){
    ctx.fillStyle="#0a0e1a";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="rgba(255,255,255,0.03)";ctx.fillRect(0,0,canvas.width,BAR_H);
    ctx.fillStyle="rgba(255,255,255,0.06)";ctx.fillRect(0,BAR_H-1,canvas.width,1);

    ctx.fillStyle="rgba(239,68,68,0.15)";
    ctx.beginPath();ctx.roundRect(closeBtn.x,closeBtn.y,closeBtn.w,closeBtn.h,8);ctx.fill();
    ctx.strokeStyle="rgba(239,68,68,0.4)";ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(closeBtn.x,closeBtn.y,closeBtn.w,closeBtn.h,8);ctx.stroke();
    ctx.fillStyle="#ef4444";ctx.font="600 13px Inter, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("\u2715",closeBtn.x+closeBtn.w/2,closeBtn.y+closeBtn.h/2);

    ctx.font="600 13px Inter, sans-serif";ctx.textBaseline="middle";
    ctx.textAlign="left";ctx.fillStyle="rgba(255,255,255,0.5)";ctx.fillText("Score: "+Math.round(score),54,26);
    ctx.textAlign="center";ctx.fillStyle=timer<=10?"#ef4444":"rgba(255,255,255,0.5)";ctx.fillText("Time: "+timer+"s",160,26);

    drawSlider(szTrack,sz,szDragging,"Size:","#34d399","#f0b232");
    drawSlider(sensTrack,sens,sensDragging,"Sens:","#818cf8","#ef4444");

    for(var i=0;i<levelBtns.length;i++){
      var b=levelBtns[i];var active=level===b.key;var l=LEVELS[b.key];
      if(active){
        ctx.fillStyle=l.color+"25";ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,6);ctx.fill();
        ctx.strokeStyle=l.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,6);ctx.stroke();
        ctx.fillStyle=l.color;
      }else{
        ctx.fillStyle="rgba(255,255,255,0.04)";ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,6);ctx.fill();
        ctx.fillStyle="rgba(255,255,255,0.3)";
      }
      ctx.font=(active?"700 ":"500 ")+"11px Inter, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(l.label,b.x+b.w/2,b.y+b.h/2);
    }

    if(running){
      var now=performance.now();
      var l2=L();
      if(now-startTime-lastSpawn>l2.spawn+Math.random()*l2.spawnVar){
        if(targets.length<l2.maxT)spawn();
        lastSpawn=now-startTime;
      }
    }

    var now2=performance.now();
    for(var k=targets.length-1;k>=0;k--){
      var t=targets[k];
      if(running){
        t.x+=t.vx*t.speed;t.y+=t.vy*t.speed;
        if(t.x-t.r<0||t.x+t.r>canvas.width){t.vx*=-1;t.x=Math.max(t.r,Math.min(canvas.width-t.r,t.x));}
        if(t.y-t.r<BAR_H||t.y+t.r>canvas.height){t.vy*=-1;t.y=Math.max(BAR_H+t.r,Math.min(canvas.height-t.r,t.y));}
      }
      var age=now2-t.born;
      if(age>t.life){targets.splice(k,1);continue;}
      var alpha=1-(age/t.life)*0.5;
      var pulse=1+Math.sin(now2*0.012)*0.1;
      ctx.globalAlpha=alpha;
      ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse*1.4,0,Math.PI*2);ctx.fillStyle="rgba(239,68,68,0.06)";ctx.fill();
      ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse,0,Math.PI*2);ctx.fillStyle="rgba(239,68,68,0.18)";ctx.fill();
      ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse*0.6,0,Math.PI*2);ctx.fillStyle="rgba(239,68,68,0.4)";ctx.fill();
      ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse*0.3,0,Math.PI*2);ctx.fillStyle="#ef4444";ctx.fill();
      ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse*0.1,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.2)";ctx.lineWidth=0.8;
      ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
    }

    if(crossVisible&&crossY>BAR_H){
      crossPulse*=0.85;crossRing*=0.92;
      var cx=crossX,cy=crossY;
      var ringR=14+crossRing*8+Math.sin(now2*0.006)*2;
      var innerR=4+crossPulse*3;
      ctx.globalAlpha=0.15+crossRing*0.3;ctx.strokeStyle="#818cf8";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(cx,cy,ringR,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=0.5+crossPulse*0.5;ctx.strokeStyle="#fff";ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(cx,cy,innerR,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=0.6+crossPulse*0.4;ctx.strokeStyle="rgba(255,255,255,0.7)";ctx.lineWidth=1;
      var gap=innerR+3,len=gap+8+crossPulse*4;
      ctx.beginPath();ctx.moveTo(cx-gap,cy);ctx.lineTo(cx-len,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+gap,cy);ctx.lineTo(cx+len,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-gap);ctx.lineTo(cx,cy-len);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy+gap);ctx.lineTo(cx,cy+len);ctx.stroke();
      ctx.globalAlpha=0.8+crossPulse*0.2;ctx.fillStyle="#fff";
      ctx.beginPath();ctx.arc(cx,cy,1.5,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
    }
  }

  function loop(){if(!running)return;draw();animFrame=requestAnimationFrame(loop);}
  currentGame={restart:function(){cleanup();initAim();},destroy:function(){clearInterval(timerInterval);canvas.onmousedown=null;canvas.onmousemove=null;canvas.onmouseup=null;canvas.onmouseenter=null;canvas.onmouseleave=null;document.onkeydown=null;}};
  init();
}

function initFight(){
  var W=window.innerWidth,H=window.innerHeight,FOV=Math.PI/3,HALF_FOV=FOV/2,NUM_RAYS=120,MAX_DEPTH=25;
  var MAP=[
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,1],
    [1,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,3,0,3,0,0,1],
    [1,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,3,0,3,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,4,4,0,0,4,4,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,4,4,0,0,4,4,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,1],
    [1,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,1],
    [1,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];
  var MAP_W=MAP[0].length,MAP_H=MAP.length;
  var TILE=W/NUM_RAYS;

  var player={x:12,y:12,angle:0,speed:0,rotSpeed:0,health:100,armor:0};
  var weapons=[
    {name:"M4",type:"rifle",mag:30,maxMag:30,ammo:120,damage:25,fireRate:100,reloading:false,reloadTime:2000,spread:0.03,range:20},
    {name:"Glock",type:"pistol",mag:15,maxMag:15,ammo:60,damage:20,fireRate:200,reloading:false,reloadTime:1500,spread:0.02,range:18},
    {name:"Knife",type:"melee",mag:1,maxMag:1,ammo:0,damage:50,fireRate:400,reloading:false,reloadTime:0,spread:0,range:2},
    {name:"Grenade",type:"grenade",mag:3,maxMag:3,ammo:0,damage:80,fireRate:1500,reloading:false,reloadTime:0,spread:0,range:8}
  ];
  var currentWeapon=0,canShoot=true,lastShot=0;
  var grenades=3,kills=0;

  var enemies=[];
  function spawnEnemies(){
    enemies=[];
    var spots=[[5,5],[18,5],[5,18],[18,18],[12,5],[12,18],[5,12],[18,12]];
    for(var i=0;i<spots.length;i++){
      if(MAP[spots[i][1]][spots[i][0]]===0){
        enemies.push({x:spots[i][0]+0.5,y:spots[i][1]+0.5,health:50,maxHealth:50,alive:true,angle:Math.random()*Math.PI*2,speed:0.01+Math.random()*0.01,shootTimer:0,shootInterval:1500+Math.random()*1000,walkTimer:0,walkAngle:Math.random()*Math.PI*2,deathTimer:0});
      }
    }
  }

  var damageFlash=0;
  var bobPhase=0,bobOff=0;
  var lastStepTime=0;

  function init(){
    resizeCanvas(W,H,true);
    player.x=12;player.y=12;player.angle=0;player.health=100;player.armor=0;player.speed=0;player.rotSpeed=0;
    weapons.forEach(function(w){w.mag=w.maxMag;w.reloading=false;});
    grenades=3;kills=0;damageFlash=0;bobPhase=0;bobOff=0;
    spawnEnemies();
    mouseX=0;mouseY=0;
    canvas.requestPointerLock();
    document.addEventListener("mousemove",onMouseMove);
    document.addEventListener("mousedown",onMouseDown);
    document.addEventListener("mouseup",onMouseUp);
    document.addEventListener("keydown",onKeyDown);
    document.addEventListener("keyup",onKeyUp);
    canvas.oncontextmenu=function(e){e.preventDefault();};
    loop(0);
  }

  function onMouseMove(e){
    if(!mouseLocked)return;
    player.angle+=(e.movementX||0)*0.002;
    mouseY+=(e.movementY||0);
  }
  function onMouseDown(e){
    if(!mouseLocked){canvas.requestPointerLock();return;}
    if(e.button===0)player.speed=0.04;
    if(e.button===2){player.speed=-0.03;}
  }
  function onMouseUp(e){
    if(e.button===0||e.button===2)player.speed=0;
  }
  function onKeyDown(e){
    var k=e.key;
    if(k==="1")currentWeapon=0;
    else if(k==="2")currentWeapon=1;
    else if(k==="3")currentWeapon=2;
    else if(k==="4"&&grenades>0)currentWeapon=3;
    else if((k==="r"||k==="R")&&!weapons[currentWeapon].reloading&&weapons[currentWeapon].mag<weapons[currentWeapon].maxMag&&weapons[currentWeapon].ammo>0){
      weapons[currentWeapon].reloading=true;
      sndReload();
      setTimeout(function(){var w=weapons[currentWeapon];var need=w.maxMag-w.mag;var take=Math.min(need,w.ammo);w.mag+=take;w.ammo-=take;w.reloading=false;},weapons[currentWeapon].reloadTime);
    }
    if(k==="Escape"){document.exitPointerLock();mouseLocked=false;}
  }
  function onKeyUp(e){}

  document.addEventListener("pointerlockchange",function(){
    mouseLocked=!!document.pointerLockElement;
  });

  function castRay(angle){
    var sin=Math.sin(angle),cos=Math.cos(angle);
    var dx=cos,dy=sin;
    for(var d=0;d<MAX_DEPTH;d+=0.1){
      var cx=player.x+dx*d,cy=player.y+dy*d;
      var mx=Math.floor(cx),my=Math.floor(cy);
      if(mx<0||mx>=MAP_W||my<0||my>=MAP_H)return{dist:d,wall:1,hitX:cx, hitY:cy};
      if(MAP[my][mx]>0)return{dist:d,wall:MAP[my][mx],hitX:cx,hitY:cy};
    }
    return{dist:MAX_DEPTH,wall:0,hitX:player.x,hitY:player.y};
  }

  function draw(){
    ctx.fillStyle="#111";ctx.fillRect(0,0,W,H);

    for(var x=0;x<NUM_RAYS;x++){
      var rayAngle=player.angle-HALF_FOV+(x/NUM_RAYS)*FOV;
      var hit=castRay(rayAngle);
      var corrDist=hit.dist*Math.cos(rayAngle-player.angle);
      var wallH=Math.min(H*2,H/corrDist);
      var shade=Math.max(0.15,1-corrDist/MAX_DEPTH);
      var c=hit.wall===1?[60*shade,60*shade,70*shade]:hit.wall===2?[40*shade,80*shade,40*shade]:hit.wall===3?[80*shade,50*shade,40*shade]:[50*shade,60*shade,90*shade];
      ctx.fillStyle="rgb("+Math.floor(c[0])+","+Math.floor(c[1])+","+Math.floor(c[2])+")";
      ctx.fillRect(x*TILE,H/2-wallH/2+bobOff,TILE+1,wallH);

      var floorY=H/2+wallH/2+bobOff;
      if(floorY<H){
        var fy=floorY;
        var fshade=Math.max(0.1,1-fy/H);
        ctx.fillStyle="rgb("+Math.floor(20*fshade)+","+Math.floor(25*fshade)+","+Math.floor(35*fshade)+")";
        ctx.fillRect(x*TILE,fy,TILE+1,H-fy);
      }
    }

    enemies.forEach(function(e){
      var dx=e.x-player.x,dy=e.y-player.y;
      var dist=Math.sqrt(dx*dx+dy*dy);
      var angle=Math.atan2(dy,dx)-player.angle;
      while(angle>Math.PI)angle-=Math.PI*2;
      while(angle<-Math.PI)angle+=Math.PI*2;
      if(Math.abs(angle)>HALF_FOV+0.1)return;
      var screenX=(angle/FOV+0.5)*W;
      var size=Math.min(200,150/dist);
      var ey=H/2+bobOff;
      if(!e.alive){
        ctx.globalAlpha=Math.max(0,1-e.deathTimer/1000);
        ctx.fillStyle="#8b0000";
        ctx.fillRect(screenX-size/2,ey+size/4,size,size/4);
        ctx.globalAlpha=1;return;
      }

      var bobY=Math.sin(performance.now()*0.005+e.x)*3;
      ctx.fillStyle="#2a5a3a";
      ctx.fillRect(screenX-size*0.3,ey-size*0.5+bobY,size*0.6,size*0.8);
      ctx.fillStyle="#d4a574";
      ctx.beginPath();ctx.arc(screenX,ey-size*0.55+bobY,size*0.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#1a3a2a";
      ctx.fillRect(screenX-size*0.2,ey+size*0.1+bobY,size*0.15,size*0.25);
      ctx.fillRect(screenX+size*0.05,ey+size*0.1+bobY,size*0.15,size*0.25);

      var hpW=size*0.8,hpH=4;
      ctx.fillStyle="#333";
      ctx.fillRect(screenX-hpW/2,ey-size*0.7+bobY,hpW,hpH);
      ctx.fillStyle="#ef4444";
      ctx.fillRect(screenX-hpW/2,ey-size*0.7+bobY,hpW*(e.health/e.maxHealth),hpH);
    });

    if(damageFlash>0){
      ctx.fillStyle="rgba(255,0,0,"+damageFlash*0.3+")";
      ctx.fillRect(0,0,W,H);
    }

    drawHUD();
    drawWeapon();
  }

  function drawHUD(){
    ctx.fillStyle="rgba(0,0,0,0.5)";
    ctx.fillRect(0,H-60,W,60);

    ctx.fillStyle="#ef4444";ctx.font="bold 14px Inter, sans-serif";ctx.textAlign="left";
    ctx.fillText("HP",16,H-40);
    ctx.fillStyle="#333";ctx.fillRect(16,H-30,120,10);
    ctx.fillStyle=player.health>30?"#23a559":"#ef4444";
    ctx.fillRect(16,H-30,120*(player.health/100),10);
    ctx.fillStyle="#fff";ctx.font="12px Inter, sans-serif";
    ctx.fillText(Math.ceil(player.health)+"%",140,H-22);

    ctx.fillStyle="#818cf8";ctx.font="bold 14px Inter, sans-serif";
    ctx.fillText("ARMOR",16,H-8);
    ctx.fillStyle="#333";ctx.fillRect(16,H+2,120,8);
    ctx.fillStyle="#818cf8";
    ctx.fillRect(16,H+2,120*(player.armor/100),8);
    ctx.fillStyle="#fff";ctx.font="12px Inter, sans-serif";
    ctx.fillText(Math.ceil(player.armor)+"%",140,H+10);

    var w=weapons[currentWeapon];
    var ammoText="";
    var ammoBig="";
    if(w.type==="grenade"){ammoText="GRENADES";ammoBig=grenades+"";}
    else{ammoText="AMMO";ammoBig=w.mag+"";}
    ctx.textAlign="right";ctx.font="13px Inter, sans-serif";ctx.fillStyle="rgba(255,255,255,0.4)";
    ctx.fillText(w.name,W-28,H-46);ctx.fillText("AMMO",W-28,H-32);
    ctx.font="bold 36px Inter, sans-serif";
    ctx.fillStyle=parseInt(ammoBig)>10?"#fff":parseInt(ammoBig)>0?"#fbbf24":"#ef4444";
    ctx.fillText(ammoBig,W-28,H-2);

    ctx.fillStyle="rgba(255,255,255,0.3)";ctx.font="11px Inter, sans-serif";ctx.textAlign="center";
    ctx.fillText("[1] M4  [2] Glock  [3] Knife  [4] Grenade  [R] Reload",W/2,H-8);

    ctx.fillStyle="rgba(255,255,255,0.3)";ctx.textAlign="left";ctx.font="12px Inter, sans-serif";
    ctx.fillText("Kills: "+kills,16,24);

    ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(W/2,H/2+bobOff,8,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(W/2-12,H/2+bobOff);ctx.lineTo(W/2-4,H/2+bobOff);ctx.stroke();
    ctx.beginPath();ctx.moveTo(W/2+4,H/2+bobOff);ctx.lineTo(W/2+12,H/2+bobOff);ctx.stroke();
    ctx.beginPath();ctx.moveTo(W/2,H/2+bobOff-12);ctx.lineTo(W/2,H/2+bobOff-4);ctx.stroke();
    ctx.beginPath();ctx.moveTo(W/2,H/2+bobOff+4);ctx.lineTo(W/2,H/2+bobOff+12);ctx.stroke();
  }

  function drawWeapon(){
    var w=weapons[currentWeapon];
    var bobY=bobOff*0.8;
    var wx=W/2+60,wy=H-120+bobY;

    ctx.save();
    if(weaponImgs.hands){
      ctx.globalAlpha=0.9;
      ctx.drawImage(weaponImgs.hands,wx-80,wy-20,160,140);
      ctx.globalAlpha=1;
    }

    if(w.type==="melee"){
      if(weaponImgs.knife){
        ctx.drawImage(weaponImgs.knife,wx-30,wy-40,60,100);
      }else{
        ctx.fillStyle="#aaa";ctx.fillRect(wx-3,wy-50,6,60);
        ctx.fillStyle="#666";ctx.fillRect(wx-8,wy-50,16,20);
      }
    }else if(w.type==="grenade"){
      if(weaponImgs.grenade){
        ctx.drawImage(weaponImgs.grenade,wx-20,wy-30,40,60);
      }else{
        ctx.fillStyle="#4a7a3a";ctx.beginPath();ctx.arc(wx,wy-10,12,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#333";ctx.fillRect(wx-3,wy-22,6,10);
      }
    }else if(w.type==="pistol"){
      if(weaponImgs.glock){
        ctx.drawImage(weaponImgs.glock,wx-30,wy-40,80,80);
      }else{
        ctx.fillStyle="#555";ctx.fillRect(wx-10,wy-30,20,35);
        ctx.fillStyle="#444";ctx.fillRect(wx-6,wy+2,12,18);
      }
    }else{
      if(weaponImgs.m4){
        ctx.drawImage(weaponImgs.m4,wx-50,wy-50,120,90);
      }else{
        ctx.fillStyle="#444";ctx.fillRect(wx-40,wy-20,80,10);
        ctx.fillStyle="#333";ctx.fillRect(wx+30,wy-20,10,8);
        ctx.fillStyle="#555";ctx.fillRect(wx-5,wy-15,10,25);
      }
    }

    if(w.reloading){
      var prog=(performance.now()%w.reloadTime)/w.reloadTime;
      ctx.fillStyle="rgba(0,0,0,0.5)";ctx.fillRect(wx-30,wy-60,60,6);
      ctx.fillStyle="#fbbf24";ctx.fillRect(wx-30,wy-60,60*prog,6);
      ctx.fillStyle="#fff";ctx.font="10px Inter, sans-serif";ctx.textAlign="center";
      ctx.fillText("RELOADING",wx,wy-66);
    }
    ctx.restore();
  }

  function loop(time){
    if(!running){if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}return;}

    var moveX=Math.cos(player.angle)*player.speed;
    var moveY=Math.sin(player.angle)*player.speed;
    var newX=player.x+moveX,newY=player.y+moveY;
    if(MAP[Math.floor(player.y)][Math.floor(newX)]===0)player.x=newX;
    if(MAP[Math.floor(newY)][Math.floor(player.x)]===0)player.y=newY;

    var headBob=Math.abs(player.speed)>0.01;
    if(headBob){bobPhase+=0.15;bobOff=Math.sin(bobPhase)*4;}else{bobOff*=0.9;}

    var now=performance.now();
    enemies.forEach(function(e){
      if(!e.alive){e.deathTimer+=16;return;}
      var dx=player.x-e.x,dy=player.y-e.y;
      var dist=Math.sqrt(dx*dx+dy*dy);
      e.angle=Math.atan2(dy,dx);
      if(dist>1.5){
        var nx=e.x+Math.cos(e.walkAngle)*e.speed;
        var ny=e.y+Math.sin(e.walkAngle)*e.speed;
        if(MAP[Math.floor(ny)][Math.floor(nx)]===0){e.x=nx;e.y=ny;}
        e.walkTimer+=16;
        if(e.walkTimer>2000){e.walkAngle=Math.random()*Math.PI*2;e.walkTimer=0;}
      }
      e.shootTimer+=16;
      if(dist<15&&e.shootTimer>e.shootInterval){
        e.shootTimer=0;
        if(Math.random()<0.5){
          var dmg=8+Math.random()*7;
          if(player.armor>0){var absorbed=Math.min(player.armor,dmg*0.6);player.armor-=absorbed;dmg-=absorbed;}
          player.health-=dmg;damageFlash=1;sndEnemyShoot();
          if(player.health<=0){player.health=0;running=false;showOverlay("Killed!","You were eliminated. Kills: "+kills,"Restart");}
        }
      }
    });

    if(player.health<100){player.health=Math.min(100,player.health+0.02);}
    if(damageFlash>0)damageFlash-=0.05;

    draw();
    animFrame=requestAnimationFrame(loop);
  }

  currentGame={
    restart:function(){cleanup();initFight();},
    destroy:function(){
      document.removeEventListener("mousemove",onMouseMove);
      document.removeEventListener("mousedown",onMouseDown);
      document.removeEventListener("mouseup",onMouseUp);
      document.removeEventListener("keydown",onKeyDown);
      document.removeEventListener("keyup",onKeyUp);
    }
  };
  init();
}

})();
