/* Real-time 3D excavator for the home hero (Three.js r128, global THREE).
   Built from primitives in the brand colours; digs on a loop, follows the mouse,
   pauses when off-screen, and falls back to a still photo if WebGL is unavailable. */
(function () {
  "use strict";
  var host = document.getElementById("hero3d");
  if (!host || !window.THREE) return;
  var THREE = window.THREE;
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  host.appendChild(renderer.domElement);
  host.closest(".hero").classList.add("has3d");

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050d18, 18, 42);
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  /* ---------- materials ---------- */
  var ORANGE = 0xf37021, BLUE = 0x0b5cab;
  var mOrange = new THREE.MeshStandardMaterial({ color: ORANGE, metalness: 0.35, roughness: 0.42 });
  var mDark = new THREE.MeshStandardMaterial({ color: 0x1a222d, metalness: 0.5, roughness: 0.6 });
  var mSteel = new THREE.MeshStandardMaterial({ color: 0xc9d3de, metalness: 0.95, roughness: 0.18 });
  var mGlass = new THREE.MeshStandardMaterial({ color: 0x0f2a4a, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.82, emissive: 0x0b3a6b, emissiveIntensity: 0.35 });
  var mBlue = new THREE.MeshStandardMaterial({ color: BLUE, metalness: 0.4, roughness: 0.45 });
  var mWhite = new THREE.MeshStandardMaterial({ color: 0xf2f5f8, metalness: 0.2, roughness: 0.5 });

  [mOrange, mDark, mSteel, mGlass, mBlue, mWhite].forEach(function (m) { m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); });
  // track tread texture
  var tc = document.createElement("canvas"); tc.width = 64; tc.height = 256;
  var tx = tc.getContext("2d"); tx.fillStyle = "#151b23"; tx.fillRect(0, 0, 64, 256);
  for (var i = 0; i < 16; i++) { tx.fillStyle = i % 2 ? "#232c38" : "#0c1117"; tx.fillRect(0, i * 16, 64, 9); }
  var treadTex = new THREE.CanvasTexture(tc); treadTex.wrapS = treadTex.wrapT = THREE.RepeatWrapping; treadTex.repeat.set(1, 3);
  var mTread = new THREE.MeshStandardMaterial({ map: treadTex, metalness: 0.6, roughness: 0.7 });

  function box(w, h, d, m, r) {
    var g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
    var mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  function cyl(r, h, m, seg) {
    var mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 20), m);
    mesh.castShadow = true; return mesh;
  }
  // rounded slab built from an extruded rounded rectangle (side profile), centred
  function slab(w, h, depth, rad, m) {
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + rad, y); s.lineTo(x + w - rad, y); s.quadraticCurveTo(x + w, y, x + w, y + rad);
    s.lineTo(x + w, y + h - rad); s.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    s.lineTo(x + rad, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rad);
    s.lineTo(x, y + rad); s.quadraticCurveTo(x, y, x + rad, y);
    var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    g.translate(0, 0, -depth / 2);
    var mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
  }

  /* ---------- machine ---------- */
  var machine = new THREE.Group(); scene.add(machine);

  // undercarriage
  var under = new THREE.Group(); machine.add(under);
  [-1, 1].forEach(function (side) {
    var track = slab(4.4, 0.9, 0.85, 0.42, mTread); track.position.set(0, 0.45, side * 1.25); under.add(track);
    var frame = slab(3.7, 0.5, 0.9, 0.2, mDark); frame.position.set(0, 0.5, side * 1.25); under.add(frame);
    for (var k = 0; k < 5; k++) { var roller = cyl(0.14, 0.95, mSteel, 14); roller.rotation.x = Math.PI / 2; roller.position.set(-1.5 + k * 0.75, 0.25, side * 1.25); under.add(roller); }
    var idler = cyl(0.36, 0.92, mDark, 24); idler.rotation.x = Math.PI / 2; idler.position.set(-1.8, 0.45, side * 1.25); under.add(idler);
    var sprocket = cyl(0.36, 0.92, mOrange, 10); sprocket.rotation.x = Math.PI / 2; sprocket.position.set(1.8, 0.45, side * 1.25); under.add(sprocket);
  });
  var centre = box(1.8, 0.4, 1.7, mDark); centre.position.set(0, 0.75, 0); under.add(centre);
  var blade = box(0.25, 0.5, 3.1, mOrange); blade.position.set(-2.35, 0.35, 0); under.add(blade);

  // upper house (swings)
  var house = new THREE.Group(); house.position.y = 1.05; machine.add(house);
  var ring = cyl(0.95, 0.18, mDark, 32); ring.position.y = 0.0; house.add(ring);
  var deck = slab(3.6, 0.32, 2.5, 0.12, mDark); deck.position.set(0.25, 0.22, 0); house.add(deck);
  var body = slab(2.3, 1.05, 2.3, 0.22, mOrange); body.position.set(0.85, 0.9, 0.05); house.add(body);
  var cw = slab(0.7, 1.0, 2.45, 0.3, mDark); cw.position.set(2.05, 0.82, 0); house.add(cw);
  var stripe = box(0.05, 0.12, 2.32, mBlue); stripe.position.set(2.42, 0.95, 0); house.add(stripe);
  var exhaust = cyl(0.07, 0.6, mSteel, 12); exhaust.position.set(1.4, 1.65, 0.7); house.add(exhaust);
  var rail = box(1.6, 0.05, 0.05, mWhite); rail.position.set(0.9, 1.6, -1.05); house.add(rail);
  // cab
  var cab = new THREE.Group(); cab.position.set(-0.55, 0.38, -0.62); house.add(cab);
  var cabShell = slab(1.25, 1.7, 1.0, 0.18, mOrange); cabShell.position.set(0, 0.85, 0); cab.add(cabShell);
  var glassF = box(0.06, 1.15, 0.86, mGlass); glassF.position.set(-0.64, 1.0, 0); cab.add(glassF);
  var glassS = box(1.0, 1.05, 0.06, mGlass); glassS.position.set(0.0, 1.02, -0.52); cab.add(glassS);
  var glassS2 = glassS.clone(); glassS2.position.z = 0.52; cab.add(glassS2);
  var roof = slab(1.35, 0.1, 1.08, 0.05, mWhite); roof.position.set(0, 1.74, 0); cab.add(roof);
  var beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a1a, emissiveIntensity: 2 }));
  beacon.position.set(0.3, 1.86, 0); cab.add(beacon);
  var beaconLight = new THREE.PointLight(0xff7a1a, 0.0, 6); beaconLight.position.copy(beacon.position); cab.add(beaconLight);

  // boom / stick / bucket (hierarchy of pivots)
  var boomPivot = new THREE.Group(); boomPivot.position.set(-0.4, 0.75, 0.32); house.add(boomPivot);
  var BOOM_L = 3.6;
  var boom = slab(BOOM_L, 0.46, 0.5, 0.2, mOrange); boom.position.set(-BOOM_L / 2, 0, 0); boomPivot.add(boom);
  var boomTop = box(BOOM_L * 0.8, 0.05, 0.52, mDark); boomTop.position.set(-BOOM_L / 2, 0.24, 0); boomPivot.add(boomTop);
  var stickPivot = new THREE.Group(); stickPivot.position.set(-BOOM_L, 0, 0); boomPivot.add(stickPivot);
  var STICK_L = 2.4;
  var stick = slab(STICK_L, 0.34, 0.4, 0.15, mOrange); stick.position.set(-STICK_L / 2 + 0.2, 0, 0); stickPivot.add(stick);
  var pin1 = cyl(0.12, 0.62, mSteel, 16); pin1.rotation.x = Math.PI / 2; stickPivot.add(pin1);
  var bucketPivot = new THREE.Group(); bucketPivot.position.set(-STICK_L + 0.2, 0, 0); stickPivot.add(bucketPivot);
  var pin2 = cyl(0.1, 0.7, mSteel, 16); pin2.rotation.x = Math.PI / 2; bucketPivot.add(pin2);
  // bucket: extruded side profile
  var bs = new THREE.Shape();
  bs.moveTo(0, 0.12); bs.lineTo(0.15, -0.2); bs.quadraticCurveTo(0.05, -0.75, -0.55, -0.85); bs.lineTo(-0.85, -0.8); bs.lineTo(-0.55, -0.45); bs.quadraticCurveTo(-0.3, -0.05, 0, 0.12);
  var bg = new THREE.ExtrudeGeometry(bs, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }); bg.translate(0, 0, -0.4);
  var bucket = new THREE.Mesh(bg, mDark); bucket.castShadow = true; bucketPivot.add(bucket);
  for (var tth = 0; tth < 4; tth++) { var tooth = box(0.18, 0.06, 0.1, mSteel); tooth.position.set(-0.9, -0.8, -0.3 + tth * 0.2); tooth.rotation.z = -0.5; bucketPivot.add(tooth); }

  // hydraulic rams (barrel + rod) that track two anchor points each frame
  var rams = [];
  function ram(parentA, a, parentB, b, r) {
    var barrel = cyl(r, 1, mDark, 14), rod = cyl(r * 0.55, 1, mSteel, 12);
    scene.add(barrel); scene.add(rod);
    rams.push({ pa: parentA, a: a, pb: parentB, b: b, barrel: barrel, rod: rod });
  }
  ram(house, new THREE.Vector3(-0.9, 0.55, 0.32), boomPivot, new THREE.Vector3(-1.7, -0.25, 0), 0.11);
  ram(boomPivot, new THREE.Vector3(-1.4, 0.32, 0), stickPivot, new THREE.Vector3(0.55, 0.25, 0), 0.1);
  ram(stickPivot, new THREE.Vector3(-0.4, 0.22, 0), bucketPivot, new THREE.Vector3(0.1, 0.18, 0), 0.08);
  var A = new THREE.Vector3(), B = new THREE.Vector3(), M = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
  function updateRams() {
    for (var i = 0; i < rams.length; i++) {
      var r = rams[i];
      A.copy(r.a); r.pa.localToWorld(A); B.copy(r.b); r.pb.localToWorld(B);
      dir.subVectors(B, A); var len = dir.length(); dir.normalize(); q.setFromUnitVectors(up, dir);
      var bl = len * 0.6, rl = len * 0.55;
      r.barrel.quaternion.copy(q); r.barrel.scale.set(1, bl, 1); M.copy(A).addScaledVector(dir, bl / 2); r.barrel.position.copy(M);
      r.rod.quaternion.copy(q); r.rod.scale.set(1, rl, 1); M.copy(B).addScaledVector(dir, -rl / 2); r.rod.position.copy(M);
    }
  }

  machine.rotation.y = -2.39;
  machine.position.set(0.9, 0, -0.4);

  /* ---------- ground, grid, ring, dirt ---------- */
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  var grid = new THREE.GridHelper(60, 60, 0xf37021, 0x1d3a5f); grid.material.transparent = true; grid.material.opacity = 0.28; grid.position.y = 0.002; scene.add(grid);
  var ringMat = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  var scanRing = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.66, 96, 1, 0, Math.PI * 1.6), ringMat); scanRing.rotation.x = -Math.PI / 2; scanRing.position.set(0.9, 0.01, -0.4); scene.add(scanRing);
  var scanRing2 = new THREE.Mesh(new THREE.RingGeometry(4.3, 4.32, 96, 1, 0, Math.PI * 0.7), ringMat.clone()); scanRing2.material.color.set(0x3d8fe0); scanRing2.rotation.x = -Math.PI / 2; scanRing2.position.copy(scanRing.position); scene.add(scanRing2);
  // spoil heap
  var heapG = new THREE.SphereGeometry(1.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  var pos = heapG.attributes.position;
  for (var v = 0; v < pos.count; v++) { var y = pos.getY(v); pos.setY(v, y * 0.55 + (Math.random() - 0.5) * 0.08); pos.setX(v, pos.getX(v) + (Math.random() - 0.5) * 0.1); }
  heapG.computeVertexNormals();
  var heap = new THREE.Mesh(heapG, new THREE.MeshStandardMaterial({ color: new THREE.Color(0x5a3e2b).convertSRGBToLinear(), roughness: 1, flatShading: true }));
  heap.position.set(-1.3, 0, -5.2); heap.castShadow = heap.receiveShadow = true; scene.add(heap);

  // dust particles
  var PN = 380, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3), ps = new Float32Array(PN);
  for (var p = 0; p < PN; p++) { pp[p * 3] = (Math.random() - 0.5) * 30; pp[p * 3 + 1] = Math.random() * 9; pp[p * 3 + 2] = (Math.random() - 0.5) * 20; ps[p] = Math.random(); }
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  var dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffb27a, size: 0.05, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0x9cc4ff, 0x120a05, 0.55));
  var key = new THREE.DirectionalLight(0xffe2c4, 2.1);
  key.position.set(6, 11, 7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9; key.shadow.bias = -0.0005;
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x3d8fe0, 2.4); rim.position.set(-8, 5, -6); scene.add(rim);
  var fill = new THREE.PointLight(0xf37021, 1.2, 14); fill.position.set(-3, 2, 4); scene.add(fill);

  /* ---------- layout ---------- */
  var baseDist = 16, camTarget = new THREE.Vector3(), mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  function layout() {
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var narrow = w < 760;
    // push the machine to the right on wide screens so it sits beside the headline
    camTarget.set(narrow ? -0.4 : -5.4 * Math.min(1.2, w / 1440), 1.9, 0);
    baseDist = 21.5 + (camera.aspect < 1.7 ? (1.7 - camera.aspect) * 10 : 0);
  }
  layout();
  addEventListener("resize", layout);
  addEventListener("pointermove", function (e) {
    mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------- animate ---------- */
  var visible = true, t = 0, last = performance.now(), scrollY0 = 0;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { last = performance.now(); loop(); } }).observe(host);
  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  function pose(time) {
    // 8-second dig cycle: reach out, curl & dig, lift, swing to heap, dump, swing back
    var c = (time % 8) / 8, swing = 0, boomA, stickA, bucketA;
    if (c < 0.25) { var k = ease(c / 0.25); boomA = -0.05 - 0.25 * k; stickA = 0.5 - 0.35 * k; bucketA = 0.3 - 0.6 * k; }
    else if (c < 0.45) { var k2 = ease((c - 0.25) / 0.2); boomA = -0.3 + 0.05 * k2; stickA = 0.15 + 0.75 * k2; bucketA = -0.3 + 1.6 * k2; }
    else if (c < 0.62) { var k3 = ease((c - 0.45) / 0.17); boomA = -0.25 + 0.5 * k3; stickA = 0.9 - 0.15 * k3; bucketA = 1.3; swing = 1.25 * k3; }
    else if (c < 0.75) { var k4 = ease((c - 0.62) / 0.13); boomA = 0.25; stickA = 0.75 - 0.4 * k4; bucketA = 1.3 - 1.6 * k4; swing = 1.25; }
    else { var k5 = ease((c - 0.75) / 0.25); boomA = 0.25 - 0.3 * k5; stickA = 0.35 + 0.15 * k5; bucketA = -0.3 + 0.6 * k5; swing = 1.25 * (1 - k5); }
    house.rotation.y = swing;
    boomPivot.rotation.z = -0.55 - boomA;           // boom raised
    stickPivot.rotation.z = 1.35 - stickA;          // stick folds down
    bucketPivot.rotation.z = 0.2 + bucketA * 0.8;
  }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduced) t += dt;
    pose(reduced ? 1.6 : t);
    smooth.x += (mouse.x - smooth.x) * 0.04; smooth.y += (mouse.y - smooth.y) * 0.04;
    var sc = Math.min(1, (window.scrollY || 0) / 700);
    var ang = 0.75 + smooth.x * 0.25 + (reduced ? 0 : Math.sin(t * 0.12) * 0.12), dist = baseDist - sc * 2.5;
    camera.position.set(camTarget.x + 2 + Math.sin(ang) * dist, 5.2 - smooth.y * 1.2 + sc * 2.2, Math.cos(ang) * dist);
    camera.lookAt(camTarget.x + 2.2, camTarget.y, 0);
    scanRing.rotation.z = t * 0.5; scanRing2.rotation.z = -t * 0.3;
    var bl = (Math.sin(t * 8) + 1) / 2; beacon.material.emissiveIntensity = 0.6 + bl * 2.4; beaconLight.intensity = bl * 1.4;
    var arr = pg.attributes.position.array;
    for (var i = 0; i < PN; i++) { arr[i * 3 + 1] += dt * (0.12 + ps[i] * 0.25); arr[i * 3] += Math.sin(t + ps[i] * 6) * dt * 0.08; if (arr[i * 3 + 1] > 9) arr[i * 3 + 1] = 0; }
    pg.attributes.position.needsUpdate = true;
    machine.updateMatrixWorld(true); updateRams();
    renderer.render(scene, camera);
  }
  var raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function step(now) {
      frame(now);
      if (visible && !reduced && !document.hidden) raf = requestAnimationFrame(step);
    });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { last = performance.now(); loop(); } });
  loop();
  // fade the canvas in
  renderer.domElement.style.opacity = "0"; renderer.domElement.style.transition = "opacity 1.4s ease";
  requestAnimationFrame(function () { renderer.domElement.style.opacity = "1"; });
})();
