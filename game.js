(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 1200, H = 760, CX = 600, CY = 380, RX = 400, RY = 250;
  const ROAD = 104, TAU = Math.PI * 2, TOTAL_LAPS = 3;
  const $ = id => document.getElementById(id);
  const ui = {
    start: $('startScreen'), startButton: $('startButton'), raceHud: $('raceHud'), countdown: $('countdown'),
    finish: $('finishScreen'), finishTitle: $('finishTitle'), finishCopy: $('finishCopy'), finishTime: $('finishTime'),
    lap: $('lapValue'), position: $('positionValue'), speed: $('speedValue'), time: $('timeValue'), best: $('bestValue'),
    dots: $('lapDots'), toast: $('toast'), record: $('recordInline'), sound: $('soundToggle'), again: $('againButton')
  };
  const keys = new Set(), touch = new Set();
  let fit = {scale: 1, x: 0, y: 0}, lastFrame = 0, state = 'intro', countdownTimer = 0, elapsed = 0, distanceProgress = 0;
  let toastTimer = 0, paused = false, audio = null, muted = false, bestTime = Number(localStorage.getItem('blueThunderBest') || 0);
  const car = {x: CX, y: CY - RY, heading: 0, speed: 0, steer: 0, offroad: false, trackT: -Math.PI / 2, lane: 0};
  const rivals = [
    {name:'04', color:'#e9503e', t:-Math.PI/2 + .16, speed:178, phase:0, progress:.16},
    {name:'12', color:'#e9c94e', t:-Math.PI/2 + .34, speed:168, phase:0, progress:.34},
    {name:'21', color:'#e9eee8', t:-Math.PI/2 + .52, speed:162, phase:0, progress:.52}
  ];
  const scenery = [];
  let seed = 1201;
  function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<118;i++){
    const a=rand()*TAU, r=rand();
    const outer=rand()<.72;
    const dist=outer ? 320+rand()*105 : 125+rand()*100;
    scenery.push({x:CX+Math.cos(a)*(RX+dist),y:CY+Math.sin(a)*(RY+dist),size:5+rand()*10,tone:rand(),kind:rand()<.7?'tree':'rock'});
  }
  function resize(){
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
    fit.scale=Math.min(canvas.width/W,canvas.height/H);fit.x=(canvas.width-W*fit.scale)/2;fit.y=(canvas.height-H*fit.scale)/2;
  }
  new ResizeObserver(resize).observe(canvas); resize();
  function anglePoint(t,rx=RX,ry=RY){return {x:CX+Math.cos(t)*rx,y:CY+Math.sin(t)*ry};}
  function pathEllipse(rx,ry){ctx.beginPath();ctx.ellipse(CX,CY,rx,ry,0,0,TAU);}
  function formatTime(s){if(!Number.isFinite(s)||s<0)return '00:00.0';const m=Math.floor(s/60),sec=Math.floor(s%60),d=Math.floor((s%1)*10);return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${d}`;}
  function setToast(text,duration=1300){ui.toast.textContent=text;ui.toast.hidden=false;toastTimer=duration;}
  function beep(freq=520,duration=.11){if(muted)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='square';osc.frequency.value=freq;gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch(_){}}
  function updateHud(){
    ui.lap.textContent='01';
    ui.position.textContent=String(playerPosition());
    ui.speed.textContent='000';
    ui.time.textContent=formatTime(0);
    for(let i=0;i<ui.dots.children.length;i++)ui.dots.children[i].classList.toggle('active',i===0);
  }
  function startRace(){
    if(state==='countdown'||state==='racing')return;
    state='countdown';paused=false;elapsed=0;distanceProgress=0;
    car.x=CX;car.y=CY-RY;car.heading=0;car.speed=0;car.steer=0;car.offroad=false;car.trackT=-Math.PI/2;car.lane=0;
    rivals[0].t=-Math.PI/2+.16;rivals[1].t=-Math.PI/2+.34;rivals[2].t=-Math.PI/2+.52;
    rivals[0].progress=.16;rivals[1].progress=.34;rivals[2].progress=.52;
    rivals.forEach(r=>r.phase=0);
    update.lastT=-Math.PI/2;update.lastLap=0;
    ui.start.hidden=true;ui.finish.hidden=true;ui.raceHud.hidden=false;ui.countdown.hidden=false;ui.countdown.textContent='3';countdownTimer=3;
    updateHud();beep(330,.12);
  }
  function finishRace(){
    state='finished';ui.countdown.hidden=true;ui.finish.hidden=false;
    const won=playerPosition()===1;
    ui.finishTitle.textContent=won?'¡VICTORIA!':'¡A META!';ui.finishTitle.style.color=won?'#63acff':'#ffb46b';
    ui.finishCopy.textContent=won?'Has conquistado el circuito. ¡Impecable!':'Carrera terminada. La próxima curva es tuya.';
    ui.finishTime.textContent=formatTime(elapsed);
    if(!bestTime||elapsed<bestTime){bestTime=elapsed;localStorage.setItem('blueThunderBest',String(bestTime));updateBest();}
    beep(won?760:430,.28);
  }
  function updateBest(){const s=bestTime?formatTime(bestTime):'—:—.—';ui.best.textContent=`MEJOR ${s}`;ui.record.textContent=s;}
  updateBest();
  function playerPosition(){
    const own=distanceProgress;
    let ahead=0;
    for(const r of rivals){if(r.progress>own)ahead++;}
    return ahead+1;
  }
  function beginPlaying(){state='racing';ui.countdown.textContent='¡YA!';beep(780,.2);setTimeout(()=>{if(state==='racing')ui.countdown.hidden=true;},380);}
  function togglePause(){if(state!=='racing')return;paused=!paused;if(paused){ui.countdown.hidden=false;ui.countdown.textContent='PAUSA';}else ui.countdown.hidden=true;}
  function held(...codes){return codes.some(code=>keys.has(code)||touch.has(code));}
  window.addEventListener('keydown',e=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key))e.preventDefault();
    if(e.repeat)return;keys.add(e.key.toLowerCase());
    if((e.key==='Enter'||e.key===' ')&&(state==='intro'||state==='finished')){startRace();return;}
    if(e.key.toLowerCase()==='p'||e.key==='Escape')togglePause();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();touch.clear();});
  ui.startButton.addEventListener('click',startRace);ui.again.addEventListener('click',startRace);
  ui.sound.addEventListener('click',()=>{muted=!muted;ui.sound.classList.toggle('muted',muted);ui.sound.innerHTML=muted?'♫ <span>OFF</span>':'♫ <span>SONIDO</span>';if(!muted)beep(600,.08);});
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    const down=e=>{e.preventDefault();touch.add(control);button.classList.add('pressed');if(state==='intro')startRace();};
    const up=e=>{e.preventDefault();touch.delete(control);button.classList.remove('pressed');};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);
  });
  function update(dt){
    if(toastTimer>0){toastTimer-=dt*1000;if(toastTimer<=0)ui.toast.hidden=true;}
    if(state==='countdown'){
      countdownTimer-=dt;
      const num=Math.max(1,Math.ceil(countdownTimer));ui.countdown.textContent=countdownTimer<=0?'¡YA!':String(num);
      if(countdownTimer<=0)beginPlaying();return;
    }
    if(state!=='racing'||paused)return;
    elapsed+=dt;
    const gas=held('w','arrowup','gas'),brake=held('s','arrowdown',' ','brake');
    const left=held('a','arrowleft','left'),right=held('d','arrowright','right');
    const steerInput=(right?1:0)-(left?1:0);
    const trackDistance=Math.abs(car.lane);
    const onRoad=trackDistance<ROAD*.47;
    car.offroad=!onRoad;
    if(car.offroad&&!car.wasOffroad)setToast('¡FUERA DE PISTA!',850);
    car.wasOffroad=car.offroad;
    const accel=car.offroad?88:157;
    if(gas)car.speed+=accel*dt;else car.speed-=35*dt;
    if(brake)car.speed-=220*dt;
    const maxSpeed=car.offroad?135:252;
    car.speed=Math.max(0,Math.min(maxSpeed,car.speed));
    if(!onRoad)car.speed=Math.max(0,car.speed-65*dt);
    car.steer=steerInput;
    const speedFactor=Math.min(1,car.speed/95);
    car.lane+=steerInput*(42+speedFactor*32)*dt;
    if(!steerInput)car.lane*=Math.max(0,1-0.18*dt);
    car.lane=Math.max(-48,Math.min(48,car.lane));
    const deriv=Math.hypot(RX*Math.sin(car.trackT),RY*Math.cos(car.trackT));
    const advance=car.speed*dt/deriv;
    car.trackT+=advance;
    distanceProgress+=advance;
    const radiusX=RX+car.lane,radiusY=RY+car.lane;
    const p=anglePoint(car.trackT,radiusX,radiusY);
    car.x=p.x;car.y=p.y;
    const tangent=Math.atan2(radiusY*Math.cos(car.trackT),-radiusX*Math.sin(car.trackT));
    car.heading=tangent+steerInput*.12*speedFactor;
    for(const r of rivals){
      const rivalDeriv=Math.hypot(RX*Math.sin(r.t),RY*Math.cos(r.t));
      const rivalAdvance=r.speed*dt/rivalDeriv;
      r.t+=rivalAdvance;r.progress+=rivalAdvance;
    }
    // Reset progress-angle anchor on race start, preserving smooth unwrapped lap distance.
    const lap=Math.max(0,Math.floor(distanceProgress/TAU));
    ui.lap.textContent=String(Math.min(TOTAL_LAPS,lap+1)).padStart(2,'0');
    const children=ui.dots.children;for(let i=0;i<children.length;i++)children[i].classList.toggle('active',i<=lap);
    ui.position.textContent=playerPosition();ui.speed.textContent=String(Math.round(car.speed*.83)).padStart(3,'0');
    ui.time.textContent=formatTime(elapsed);
    if(lap>update.lastLap){update.lastLap=lap;if(lap>0&&lap<TOTAL_LAPS){setToast(`VUELTA ${lap+1} · ¡SIGUE ASÍ!`,1300);beep(610,.12);}}
    if(lap>=TOTAL_LAPS)finishRace();
  }
  update.lastT=-Math.PI/2;update.lastLap=0;
  function drawBackground(){
    ctx.fillStyle='#28543b';ctx.fillRect(0,0,W,H);
    // Subtle grass texture and infield mowing lines.
    for(let i=0;i<145;i++){
      const x=(i*173+31)%W,y=(i*97+53)%H;
      ctx.fillStyle=i%3===0?'#ffffff08':'#071a120b';ctx.fillRect(x,y,25+(i%5)*8,2);
    }
    // Road ring, border, inner grass island.
    ctx.fillStyle='#11191b';pathEllipse(RX+ROAD/2+8,RY+ROAD/2+8);ctx.fill();
    ctx.fillStyle='#454a48';pathEllipse(RX+ROAD/2,RY+ROAD/2);ctx.fill();
    ctx.fillStyle='#346642';pathEllipse(RX-ROAD/2,RY-ROAD/2);ctx.fill();
    // Infield details.
    ctx.fillStyle='#ffffff0b';ctx.beginPath();ctx.ellipse(CX,CY,180,102,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#c9d4c51a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(CX,CY,176,98,0,0,TAU);ctx.stroke();
    ctx.fillStyle='#d5dfd122';ctx.font='700 11px monospace';ctx.textAlign='center';ctx.fillText('COASTLINE  ·  INTERNATIONAL',CX,CY+5);
    // Dashed centerline.
    ctx.strokeStyle='#f0eee077';ctx.lineWidth=2.2;ctx.setLineDash([17,19]);pathEllipse(RX,RY);ctx.stroke();ctx.setLineDash([]);
    // Alternating curb marks on both road edges.
    for(let i=0;i<120;i++){
      const a=i/120*TAU,b=(i+1)/120*TAU;
      for(const sign of [-1,1]){
        const rx=RX+sign*ROAD*.48,ry=RY+sign*ROAD*.48;
        const p=anglePoint(a,rx,ry),q=anglePoint(b,rx,ry);
        ctx.strokeStyle=i%2?'#f2eee0':'#df4c3e';ctx.lineWidth=7;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
      }
    }
    // Outer boundary highlights.
    ctx.strokeStyle='#a5aca05d';ctx.lineWidth=2;pathEllipse(RX+ROAD/2,RY+ROAD/2);ctx.stroke();pathEllipse(RX-ROAD/2,RY-ROAD/2);ctx.stroke();
    // Trackside scenery.
    for(const o of scenery){
      if(o.kind==='tree'){
        ctx.fillStyle='#101f19';ctx.beginPath();ctx.ellipse(o.x+2,o.y+5,o.size*1.1,o.size*.58,0,0,TAU);ctx.fill();
        ctx.fillStyle=o.tone>.5?'#286044':'#1e5039';ctx.beginPath();ctx.arc(o.x,o.y,o.size,0,TAU);ctx.fill();
        ctx.fillStyle='#ffffff12';ctx.beginPath();ctx.arc(o.x-o.size*.25,o.y-o.size*.3,o.size*.42,0,TAU);ctx.fill();
      }else{ctx.fillStyle='#b9aa8a';ctx.beginPath();ctx.ellipse(o.x,o.y,o.size,o.size*.5,.3,0,TAU);ctx.fill();}
    }
    // Checkered start / finish stripe at the top center.
    const sx=CX-14, sy=CY-RY-ROAD/2;
    for(let row=0;row<8;row++)for(let col=0;col<4;col++){
      ctx.fillStyle=(row+col)%2?'#f4f1e7':'#101719';ctx.fillRect(sx+col*7,sy+row*13,7,13);
    }
    // Decorative corner labels, track markers and little grandstand.
    ctx.fillStyle='#152a25';ctx.fillRect(80,95,162,28);ctx.fillStyle='#d8dfd1';ctx.font='700 9px monospace';ctx.textAlign='left';ctx.fillText('PIT LANE  ━━━  01',91,113);
    ctx.fillStyle='#354047';ctx.fillRect(886,86,206,25);for(let i=0;i<26;i++){ctx.fillStyle=i%2?'#d8d1b4':'#313638';ctx.fillRect(893+i*7.4,86,5,25);}ctx.fillStyle='#dbe0d9';ctx.font='700 8px monospace';ctx.fillText('GRANDSTAND',900,79);
    ctx.textAlign='left';
  }
  function drawCar(x,y,heading,color,player=false){
    ctx.save();ctx.translate(x,y);ctx.rotate(heading);
    // Drop shadow, racing tires, body shell.
    ctx.fillStyle='#06100c91';ctx.beginPath();ctx.ellipse(1,5,25,15,0,0,TAU);ctx.fill();
    ctx.fillStyle='#111619';
    for(const wx of [-13,12])for(const wy of [-12,12]){ctx.beginPath();ctx.roundRect(wx-5,wy-2.6,11,5.2,2);ctx.fill();}
    ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(17,-8);ctx.quadraticCurveTo(13,-11,6,-11);ctx.lineTo(-12,-10);ctx.quadraticCurveTo(-19,-8,-20,-4);ctx.lineTo(-20,4);ctx.quadraticCurveTo(-18,9,-12,10);ctx.lineTo(7,11);ctx.quadraticCurveTo(16,10,19,6);ctx.closePath();ctx.fillStyle=color;ctx.fill();
    // Nose, side sills and rear spoiler.
    ctx.fillStyle=player?'#e7ebea':'#e3e3da';ctx.beginPath();ctx.moveTo(21,0);ctx.lineTo(16,-4);ctx.lineTo(8,-3);ctx.lineTo(8,3);ctx.lineTo(16,4);ctx.closePath();ctx.fill();
    ctx.fillStyle=player?'#f4f0e2':'#273239';ctx.fillRect(-18,-8,5,16);
    // Hood stripes and windshield.
    ctx.fillStyle=player?'#f2f0e8':'#18232b';ctx.beginPath();ctx.moveTo(6,-8);ctx.lineTo(17,-5);ctx.lineTo(17,-3);ctx.lineTo(6,-4);ctx.fill();ctx.beginPath();ctx.moveTo(6,8);ctx.lineTo(17,5);ctx.lineTo(17,3);ctx.lineTo(6,4);ctx.fill();
    ctx.fillStyle='#10212a';ctx.beginPath();ctx.moveTo(3,-7);ctx.lineTo(-9,-7);ctx.lineTo(-13,-4);ctx.lineTo(-13,4);ctx.lineTo(-9,7);ctx.lineTo(3,7);ctx.quadraticCurveTo(6,0,3,-7);ctx.fill();
    ctx.strokeStyle='#ffffff75';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-2,-6);ctx.lineTo(-2,6);ctx.stroke();
    ctx.fillStyle='#d8efff';ctx.fillRect(17,-5,2.4,3);ctx.fillRect(17,2,2.4,3);
    ctx.fillStyle='#ff5447';ctx.fillRect(-19,-6,2,3);ctx.fillRect(-19,3,2,3);
    if(player){ctx.fillStyle='#1768c0';ctx.fillRect(-7,-1.7,8,3.4);ctx.fillStyle='#fff';ctx.font='900 5px sans-serif';ctx.textAlign='center';ctx.fillText('07',-3,1.7);}
    ctx.restore();
  }
  function render(){
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.setTransform(fit.scale,0,0,fit.scale,fit.x,fit.y);
    drawBackground();
    // AI cars follow the racing line.
    for(const r of rivals){const p=anglePoint(r.t);const h=Math.atan2(RY*Math.cos(r.t),-RX*Math.sin(r.t));drawCar(p.x,p.y,h,r.color);}
    drawCar(car.x,car.y,car.heading,'#1c72d4',true);
    // Subtle vignette keeps the track readable beneath the HUD.
    const g=ctx.createRadialGradient(CX,CY,230,CX,CY,720);g.addColorStop(0,'transparent');g.addColorStop(1,'#07131c42');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  function frame(now){
    const dt=Math.min(.04,(now-lastFrame)/1000||0);lastFrame=now;update(dt);render();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
