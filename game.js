(() => {
  'use strict';
  const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
  const W=1200,H=760,ROAD=104,LAPS=3,$=id=>document.getElementById(id);
  const ui={intro:$('introOverlay'),hud:$('raceHud'),pause:$('pauseOverlay'),finish:$('finishOverlay'),start:$('startButton'),resume:$('resumeButton'),restart:$('restartButton'),again:$('againButton'),menu:$('menuButton'),countdown:$('countdown'),countNumber:$('countNumber'),lap:$('lapCurrent'),lapBar:$('lapBar'),time:$('raceTime'),best:$('bestTime'),pos:$('positionNow'),posLabel:$('positionLabel'),speed:$('speedValue'),meter:$('speedMeter'),gear:$('gearValue'),finishTitle:$('finishTitle'),finishKicker:$('finishKicker'),finishPos:$('finishPosition'),finishTime:$('finishTime'),toast:$('toast'),record:$('recordValue'),sound:$('soundToggle'),soundIcon:$('soundIcon')};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,n)=>((v%n)+n)%n,lerp=(a,b,t)=>a+(b-a)*t;
  function timeText(t){const mm=Math.floor(t/60),ss=Math.floor(t%60),cs=Math.floor((t*100)%100);return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;}
  const anchors=[[210,180],[330,132],[470,128],[610,160],[735,146],[865,155],[970,210],[1030,300],[1033,385],[978,455],[882,487],[804,545],[752,615],[630,637],[516,603],[438,540],[345,516],[250,492],[170,442],[132,365],[137,288],[164,222]];
  function catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return{x:.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),y:.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)};}
  const track=[],steps=48;for(let i=0;i<anchors.length;i++)for(let j=0;j<steps;j++)track.push(catmull(anchors[mod(i-1,anchors.length)],anchors[i],anchors[(i+1)%anchors.length],anchors[(i+2)%anchors.length],j/steps));
  let trackLength=0;for(let i=0;i<track.length;i++){const a=track[i],b=track[(i+1)%track.length];a.distance=trackLength;a.tangent=Math.atan2(b.y-a.y,b.x-a.x);trackLength+=Math.hypot(b.x-a.x,b.y-a.y);}
  function closest(x,y){let best=Infinity,at=0;for(let i=0;i<track.length;i++){const p=track[i],d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;at=i;}}return{index:at,point:track[at],distance:Math.sqrt(best),along:track[at].distance};}
  function sampleAt(s){const target=mod(s,trackLength);let lo=0,hi=track.length-1;while(lo<hi){const m=(lo+hi)>>1;if(track[m].distance<target)lo=m+1;else hi=m;}const i=mod(lo-1,track.length),a=track[i],b=track[(i+1)%track.length],span=(b.distance>=a.distance?b.distance:trackLength-a.distance+b.distance)||1,t=mod(target-a.distance,trackLength)/span;return{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),angle:Math.atan2(b.y-a.y,b.x-a.x)};}
  let seed=87321;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  const trees=[];for(let y=42;y<H-30;y+=49)for(let x=34;x<W-20;x+=57){const px=x+(random()-.5)*24,py=y+(random()-.5)*22;if(closest(px,py).distance>ROAD*.5+49&&random()>.29)trees.push({x:px,y:py,r:8+random()*8,h:random()});}
  const grassDots=[];for(let i=0;i<1250;i++)grassDots.push({x:random()*W,y:random()*H,r:.4+random()*1.25,a:.035+random()*.1});
  const buildings=[{x:940,y:72,w:120,h:48,c:'#809392'},{x:58,y:520,w:92,h:47,c:'#748b80'},{x:966,y:610,w:135,h:52,c:'#8c8d78'}];
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));}
  new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);resize();
  function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
  function drawTrees(){for(const b of buildings){ctx.fillStyle='#192e2a';ctx.fillRect(b.x+5,b.y+7,b.w,b.h);ctx.fillStyle=b.c;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#adad8b';ctx.fillRect(b.x+8,b.y+8,b.w-16,6);ctx.fillStyle='#506b65';for(let i=0;i<5;i++)ctx.fillRect(b.x+12+i*20,b.y+23,10,14);}for(const t of trees){ctx.fillStyle='#09282055';ctx.beginPath();ctx.ellipse(t.x+3,t.y+6,t.r*1.1,t.r*.72,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=t.h>.5?'#23593f':'#2d6744';ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.fillStyle=t.h>.5?'#3c8052':'#438c59';ctx.beginPath();ctx.arc(t.x-t.r*.28,t.y-t.r*.28,t.r*.62,0,Math.PI*2);ctx.fill();ctx.fillStyle='#80a65d66';ctx.beginPath();ctx.arc(t.x-t.r*.35,t.y-t.r*.42,t.r*.2,0,Math.PI*2);ctx.fill();}}
  function pathTrack(){ctx.beginPath();ctx.moveTo(track[0].x,track[0].y);for(let i=1;i<track.length;i++)ctx.lineTo(track[i].x,track[i].y);ctx.closePath();}
  function strokeTrack(color,width){pathTrack();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function drawKerbs(){for(let i=0;i<track.length;i+=7){const p=track[i],n=track[(i+1)%track.length],angle=Math.atan2(n.y-p.y,n.x-p.x),nx=-Math.sin(angle),ny=Math.cos(angle);for(const side of [-1,1]){ctx.strokeStyle=Math.floor(i/7)%2===0?'#e9e9d8':'#e55248';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x+nx*side*(ROAD/2-2),p.y+ny*side*(ROAD/2-2));ctx.lineTo(n.x+nx*side*(ROAD/2-2),n.y+ny*side*(ROAD/2-2));ctx.stroke();}}}
  function drawStartLine(){const p=track[0];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.tangent);for(let row=0;row<2;row++)for(let col=0;col<10;col++){ctx.fillStyle=(row+col)%2?'#f3f1df':'#17252a';ctx.fillRect(-6+row*6,-ROAD/2+col*8,6,8);}ctx.restore();}
  function drawTrack(){strokeTrack('#182d2d',ROAD+23);strokeTrack('#9caa93',ROAD+14);strokeTrack('#383f3d',ROAD+5);strokeTrack('#555a55',ROAD);strokeTrack('#484e4a',ROAD-8);drawKerbs();ctx.save();pathTrack();ctx.setLineDash([14,18]);ctx.strokeStyle='#e7e1c98a';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();drawStartLine();}
  function drawWorld(){ctx.fillStyle='#60905a';ctx.fillRect(0,0,W,H);for(const d of grassDots){ctx.fillStyle=`rgba(190,219,136,${d.a})`;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#d5cc9c';ctx.globalAlpha=.44;ctx.fillRect(0,0,W,12);ctx.fillRect(0,H-11,W,11);ctx.fillRect(0,0,12,H);ctx.fillRect(W-12,0,12,H);ctx.globalAlpha=1;drawTrees();
    for(let i=0;i<track.length;i+=19){const p=track[i],a=p.tangent,nx=-Math.sin(a),ny=Math.cos(a);for(const side of [-1,1]){ctx.fillStyle=i%38===0?'#ece8d7':'#d85144';ctx.beginPath();ctx.arc(p.x+nx*side*(ROAD/2+13),p.y+ny*side*(ROAD/2+13),3.2,0,Math.PI*2);ctx.fill();}}
    ctx.fillStyle='#e2d8be';ctx.fillRect(586,67,177,6);ctx.fillRect(586,67,6,25);ctx.fillRect(757,67,6,25);ctx.fillStyle='#adbe97';ctx.font='800 9px Arial';ctx.fillText('COSTA AZUL  /  GRAND PRIX',600,62);ctx.fillStyle='#233a36';ctx.fillRect(327,244,108,30);ctx.fillStyle='#b8b8a0';ctx.fillRect(333,249,96,4);ctx.fillStyle='#6b7770';ctx.fillRect(337,256,89,13);for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#e7e1c9':'#cb5244';ctx.fillRect(340+i*10,258,5,8);}}
  const carColors=['#ed6e4e','#d2cb65','#d8ddd1'];
  function drawCar(car,player=false){ctx.save();ctx.translate(car.x,car.y);ctx.rotate(car.angle);ctx.scale(player?1.12:1,player?1.12:1);
    ctx.fillStyle='#06101177';ctx.beginPath();ctx.ellipse(-1,5,25,15,0,0,Math.PI*2);ctx.fill();
    // tires
    ctx.fillStyle='#111719';for(const x of [-13,13])for(const y of [-12,12]){roundedRect(ctx,x-5,y-2.7,10,5.4,1.8);ctx.fill();ctx.fillStyle='#65706c';ctx.fillRect(x-2,y-1.6,4,3.2);ctx.fillStyle='#111719';}
    // sculpted body, front faces right
    ctx.fillStyle='#18252a';ctx.beginPath();ctx.moveTo(-22,-7);ctx.quadraticCurveTo(-20,-12,-12,-13);ctx.lineTo(13,-11.5);ctx.quadraticCurveTo(20,-10,23,-6);ctx.lineTo(25,-3);ctx.lineTo(25,4);ctx.lineTo(21,8.5);ctx.quadraticCurveTo(18,12,10,12);ctx.lineTo(-14,12);ctx.quadraticCurveTo(-21,10,-23,6);ctx.lineTo(-23,-4);ctx.closePath();ctx.fill();
    const paint=player?'#167ac4':car.color;ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(-21,-6);ctx.quadraticCurveTo(-19,-10,-12,-11);ctx.lineTo(12,-10);ctx.quadraticCurveTo(19,-9,22,-5);ctx.lineTo(24,-2);ctx.lineTo(24,3);ctx.lineTo(20,7.5);ctx.quadraticCurveTo(17,10,10,10);ctx.lineTo(-14,10);ctx.quadraticCurveTo(-20,8,-21,5);ctx.closePath();ctx.fill();
    ctx.fillStyle=player?'#46b5f5':car.light;ctx.beginPath();ctx.moveTo(-7,-8.7);ctx.lineTo(7,-8.3);ctx.lineTo(11,-5.7);ctx.lineTo(9,5.7);ctx.lineTo(-8,6.6);ctx.lineTo(-11,3);ctx.lineTo(-10,-5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#17282e';ctx.beginPath();ctx.moveTo(-7,-7.2);ctx.lineTo(-1,-6.8);ctx.lineTo(-1,6.3);ctx.lineTo(-8,6.1);ctx.lineTo(-9,-5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(1,-6.8);ctx.lineTo(7,-6.4);ctx.lineTo(9,-4);ctx.lineTo(8,5.5);ctx.lineTo(1,6);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#b9e8f4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-.3,-7);ctx.lineTo(-.3,6);ctx.stroke();
    ctx.fillStyle='#d5f064';ctx.fillRect(20,-5.5,3.2,3.4);ctx.fillRect(20,2.1,3.2,3.4);ctx.fillStyle='#ff594e';ctx.fillRect(-21,-6,2.5,3);ctx.fillRect(-21,3,2.5,3);
    // blue racing stripe and twin kidney grilles
    if(player){ctx.fillStyle='#e3e7dd';ctx.fillRect(13,-1,7,2);ctx.fillStyle='#12232b';roundedRect(ctx,21,-4.3,2.2,3,1);ctx.fill();roundedRect(ctx,21,1.2,2.2,3,1);ctx.fill();ctx.fillStyle='#e6f3f5';ctx.fillRect(-18,-1,3,2);}
    if(car.braking){ctx.fillStyle='#ff3028';ctx.shadowColor='#ff3129';ctx.shadowBlur=8;ctx.fillRect(-22,-6,2.7,4);ctx.fillRect(-22,2,2.7,4);ctx.shadowBlur=0;}
    ctx.restore();
  }
  const keys=new Set(), touch={left:false,right:false,accelerate:false,brake:false};
  const held=(...names)=>names.some(k=>keys.has(k));
  let state='menu',lastFrame=0,countLeft=0,elapsed=0,bestLocal=null,lastAlong=0,offTrackTime=0;
  let player,opponents=[],soundOn=false,audio=null,toastTimer=0;
  let bestStored=Number(localStorage.getItem('vr-best-time')||0);if(bestStored){ui.best.textContent=`MEJOR ${timeText(bestStored)}`;ui.record.textContent=timeText(bestStored);}
  function freshRace(){const start=sampleAt(0);player={x:start.x,y:start.y,angle:start.angle,vx:0,vy:0,distance:0,along:0,laps:0,off:false,braking:false};lastAlong=0;offTrackTime=0;elapsed=0;
    opponents=[{name:'M. VEGA',color:carColors[0],light:'#ffbe82',offset:-25,speed:210,distance:45},{name:'A. ROUSSEAU',color:carColors[1],light:'#fff2a1',offset:0,speed:194,distance:90},{name:'J. KIM',color:carColors[2],light:'#f8fff0',offset:25,speed:180,distance:135}];
    for(const ai of opponents){const p=sampleAt(ai.distance);ai.x=p.x+Math.cos(p.angle+Math.PI/2)*ai.offset;ai.y=p.y+Math.sin(p.angle+Math.PI/2)*ai.offset;ai.angle=p.angle;}
  }
  function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1500);}
  function setState(next){state=next;ui.intro.hidden=next!=='menu';ui.hud.hidden=!['countdown','racing','paused'].includes(next);ui.pause.hidden=next!=='paused';ui.finish.hidden=next!=='finished';ui.countdown.hidden=next!=='countdown';}
  function beginRace(){freshRace();setState('countdown');countLeft=3.15;ui.countNumber.textContent='3';ui.lap.textContent='1';ui.posLabel.textContent='EN CARRERA';playTone(480,.08);}
  function finishRace(){setState('finished');stopEngine();const place=1+opponents.filter(ai=>ai.distance>player.distance).length;ui.finishPos.textContent=`${place}.º`;ui.finishTime.textContent=timeText(elapsed);ui.finishKicker.textContent=place===1?'VICTORIA EN LA COSTA':'BANDERA A CUADROS';ui.finishTitle.innerHTML=place===1?'¡LO<br><em>LOGRASTE!</em>':'¡BUENA<br><em>CARRERA!</em>';if(!bestStored||elapsed<bestStored){bestStored=elapsed;localStorage.setItem('vr-best-time',String(bestStored));ui.best.textContent=`MEJOR ${timeText(bestStored)}`;ui.record.textContent=timeText(bestStored);showToast('¡NUEVO RÉCORD PERSONAL!');}else{ui.best.textContent=`MEJOR ${timeText(bestStored)}`;}}
  function resumeRace(){setState('racing');lastFrame=performance.now();}
  function playTone(freq=420,duration=.11){if(!soundOn)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!audio)audio=new AC();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch(_){}}
  let engineOsc=null,engineGain=null;
  function startEngine(){if(!soundOn)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!audio)audio=new AC();if(audio.state==='suspended')audio.resume();engineOsc=audio.createOscillator();engineGain=audio.createGain();engineOsc.type='sawtooth';engineOsc.frequency.value=55;engineGain.gain.value=.012;engineOsc.connect(engineGain);engineGain.connect(audio.destination);engineOsc.start();}catch(_){}}
  function stopEngine(){if(engineOsc){try{engineOsc.stop();}catch(_){}engineOsc=null;engineGain=null;}}
  function toggleSound(){soundOn=!soundOn;ui.soundIcon.textContent=soundOn?'♫':'♪';ui.sound.setAttribute('aria-label',soundOn?'Silenciar sonidos':'Activar sonidos');if(soundOn){playTone(500,.08);if(state==='racing')startEngine();}else stopEngine();}
  ui.start.addEventListener('click',beginRace);ui.again.addEventListener('click',beginRace);ui.restart.addEventListener('click',beginRace);ui.resume.addEventListener('click',resumeRace);ui.menu.addEventListener('click',()=>{stopEngine();setState('menu');});ui.sound.addEventListener('click',toggleSound);
  window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();keys.add(key);if(key==='enter'&&state==='menu')beginRace();else if((key==='escape'||key==='p')&&state==='racing'){setState('paused');stopEngine();}else if((key==='escape'||key==='p')&&state==='paused')resumeRace();else if(key==='r'&&['racing','paused'].includes(state))beginRace();});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();for(const k in touch)touch[k]=false;if(state==='racing'){setState('paused');stopEngine();}});
  document.querySelectorAll('[data-control]').forEach(button=>{const name=button.dataset.control;const down=e=>{e.preventDefault();touch[name]=true;button.classList.add('pressed');button.setPointerCapture?.(e.pointerId);};const up=e=>{e.preventDefault();touch[name]=false;button.classList.remove('pressed');};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);});
  function controlState(){return {up:held('w','arrowup')||touch.accelerate,down:held('s','arrowdown')||touch.brake,left:held('a','arrowleft')||touch.left,right:held('d','arrowright')||touch.right,hand:held(' ') };}

  function updatePlayer(dt){
    const c=controlState();
    const forwardX=Math.cos(player.angle),forwardY=Math.sin(player.angle),sideX=-forwardY,sideY=forwardX;
    let forward=player.vx*forwardX+player.vy*forwardY;
    let lateral=player.vx*sideX+player.vy*sideY;
    player.braking=c.down||c.hand;
    const grip=player.off?0.72:1;
    if(c.up)forward+=235*dt*grip;
    if(c.down)forward-=forward>0?390*dt:145*dt;
    if(c.hand)forward*=Math.exp(-2.2*dt);
    forward*=Math.exp(-(player.off?1.15:0.34)*dt);
    lateral*=Math.exp(-(c.hand?2.3:player.off?1.4:5.7)*dt);
    forward=clamp(forward,-95,285);
    const speed=Math.hypot(forward,lateral);
    const steer=(Number(c.right)-Number(c.left));
    if(steer&&speed>3){const reverse=forward<0?-1:1;player.angle+=steer*reverse*(1.85+Math.min(speed,230)/155)*dt*(c.hand?1.25:1);}
    player.vx=forward*forwardX+lateral*sideX;
    player.vy=forward*forwardY+lateral*sideY;
    player.x+=player.vx*dt;player.y+=player.vy*dt;
    const near=closest(player.x,player.y);player.off=near.distance>ROAD*.5-7;
    if(player.off){offTrackTime+=dt;if(offTrackTime>1.2&&offTrackTime<1.24)showToast('¡VUELVE AL ASFALTO!');}else offTrackTime=0;
    let delta=near.along-lastAlong;
    if(delta>trackLength*.5)delta-=trackLength;
    if(delta< -trackLength*.5)delta+=trackLength;
    if(delta>0&&delta<85)player.distance+=delta;
    if(delta>0&&lastAlong>trackLength-65&&near.along<65){player.laps++;playTone(720,.13);if(player.laps>=LAPS){lastAlong=near.along;finishRace();return;}}
    lastAlong=near.along;player.along=near.along;
  }
  function updateAI(dt){
    for(const ai of opponents){
      const p=sampleAt(ai.distance);const bend=Math.abs(Math.sin(p.angle));
      ai.distance+=ai.speed*(1-bend*.045)*dt;
      const next=sampleAt(ai.distance);ai.x=next.x+Math.cos(next.angle+Math.PI/2)*ai.offset;ai.y=next.y+Math.sin(next.angle+Math.PI/2)*ai.offset;ai.angle=next.angle;
    }
  }
  function updateHud(){
    const total=LAPS*trackLength,progress=clamp(player.distance/total,0,1);
    const lap=Math.min(LAPS,Math.floor(player.distance/trackLength)+1);
    ui.lap.textContent=String(lap);ui.lapBar.style.width=`${Math.round((player.distance%trackLength)/trackLength*100)}%`;
    ui.time.textContent=timeText(elapsed);
    const rank=1+[...opponents].filter(ai=>ai.distance>player.distance).length;
    ui.pos.textContent=String(rank);ui.posLabel.textContent=rank===1?'LIDERANDO':'EN CARRERA';
    const speed=Math.round(Math.abs(player.vx*Math.cos(player.angle)+player.vy*Math.sin(player.angle))*1.16);
    ui.speed.textContent=String(speed).padStart(3,'0');ui.meter.style.width=`${clamp(speed/260*100,0,100)}%`;
    ui.gear.textContent=String(clamp(Math.floor(speed/48)+1,1,6));
    if(engineOsc&&audio&&engineGain){engineOsc.frequency.setTargetAtTime(48+speed*.72,audio.currentTime,.08);engineGain.gain.setTargetAtTime(.006+speed/285*.012,audio.currentTime,.12);}
  }
  function render(){
    const rect=canvas.getBoundingClientRect(),cw=rect.width,ch=rect.height;if(!cw||!ch)return;
    const dpr=canvas.width/cw;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
    const racing=['countdown','racing','paused','finished'].includes(state)&&player;
    const scale=racing?clamp(Math.min(cw/790,ch/540),.52,1.18):Math.min(cw/W,ch/H)*.96;
    ctx.save();ctx.translate(cw/2,ch/2);ctx.scale(scale,scale);
    if(racing){ctx.translate(-player.x,-player.y);}else ctx.translate(-W/2,-H/2);
    drawWorld();drawTrack();
    if(opponents.length)for(const ai of opponents)drawCar(ai,false);
    if(player)drawCar(player,true);
    ctx.restore();
    if(state==='racing'&&player.off){ctx.fillStyle='#ff76591c';ctx.fillRect(0,0,cw,ch);}
  }
  function frame(now){
    const dt=Math.min(.04,Math.max(0,(now-lastFrame)/1000||0));lastFrame=now;
    if(state==='countdown'){
      countLeft-=dt;const number=Math.ceil(countLeft);
      if(number>0){if(ui.countNumber.textContent!==String(number)){ui.countNumber.textContent=String(number);playTone(400+number*75,.08);}}
      else if(countLeft>-.78){if(ui.countNumber.textContent!=='¡YA!'){ui.countNumber.textContent='¡YA!';playTone(800,.2);startEngine();}}
      else {setState('racing');lastFrame=now;}
    }else if(state==='racing'){
      elapsed+=dt;updateAI(dt);updatePlayer(dt);if(state==='racing')updateHud();
    }
    render();requestAnimationFrame(frame);
  }
  freshRace();
  setState('menu');
  updateHud();
  requestAnimationFrame(frame);
})();
