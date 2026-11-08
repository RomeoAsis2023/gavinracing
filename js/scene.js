import * as THREE from 'three';

const SCALE = 30;
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .65, ...extra });

export class RaceScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#b9d7df');
    this.scene.fog = new THREE.Fog('#b9d7df', 70, 155);
    this.camera = new THREE.PerspectiveCamera(48, 1, .1, 260);
    this.scene.add(new THREE.HemisphereLight('#e4f5ff', '#6b723b', 2.2));
    const sun = new THREE.DirectionalLight('#fff0ca', 3.2);
    sun.position.set(-18, 35, -12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 35, bottom: -35, near: 1, far: 100 });
    sun.shadow.normalBias = .035;
    sun.target.position.set(0, 0, -10); this.scene.add(sun, sun.target);
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.black = material('#171c23');
    this.glass = material('#204f67', { metalness: .35, roughness: .2 });
    this.white = material('#fff7e8');
    this.rubber = material('#14171b');
    this.rim = material('#aab2bd', { metalness: .8, roughness: .3 });
    this.wheelGeometry = new THREE.CylinderGeometry(.38, .38, .22, 12);
    this.traffic = [];
    this.buildRoad(); this.buildTrees(); this.buildFinish();
    this.player = this.createCar('#ef251e', true); this.scene.add(this.player);
    this.buildEffects();
    this.resize();
  }

  box(parent, x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(this.boxGeometry, mat);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  createCar(color, stripes = false) {
    const car = new THREE.Group(), paint = material(color, { metalness: .25, roughness: .32 });
    paint.userData.paint = true;
    this.box(car, 0, .49, 0, 1.65, .52, 3.2, paint);
    this.box(car, 0, .38, 0, 1.7, .15, 3.1, this.black);
    this.box(car, 0, .79, -1.05, 1.56, .16, 1.05, paint);
    this.box(car, 0, .84, .18, 1.32, .56, 1.48, this.glass);
    this.box(car, 0, 1.15, .22, 1.3, .1, 1.02, paint);
    this.box(car, 0, .82, 1.16, 1.57, .12, .68, paint);
    for (const x of [-.85, .85]) {
      for (const z of [-1, 1]) {
        const tire = new THREE.Mesh(this.wheelGeometry, this.rubber);
        tire.rotation.z = Math.PI / 2; tire.position.set(x, .38, z); tire.castShadow = true; car.add(tire);
        const rim = new THREE.Mesh(this.wheelGeometry, this.rim);
        rim.rotation.z = Math.PI / 2; rim.scale.set(.55, 1.04, .55);
        rim.position.set(x * 1.025, .38, z); car.add(rim);
      }
      this.box(car, x * .98, .91, -.22, .2, .14, .25, paint);
      this.box(car, x * .65, .68, -1.61, .38, .13, .04, material('#fff4c5', { emissive: '#ffe2a0', emissiveIntensity: .7 }));
      this.box(car, x * .65, .65, 1.61, .4, .12, .04, material('#ff3023', { emissive: '#f52716', emissiveIntensity: 1 }));
    }
    if (stripes) for (const x of [-.18, .18]) {
      this.box(car, x, .878, -1.05, .19, .015, 1.04, this.white);
      this.box(car, x, 1.207, .22, .19, .015, 1.01, this.white);
      this.box(car, x, .888, 1.16, .19, .015, .67, this.white);
      this.box(car, x, .54, 1.613, .19, .3, .012, this.white);
    }
    return car;
  }

  setCarArtwork(sprite) {
    // The original artwork becomes a hood decal on the modeled red car.
    const texture = new THREE.CanvasTexture(sprite.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(sprite.w / sprite.image.width, sprite.h / sprite.image.height);
    texture.offset.set(sprite.x / sprite.image.width, 1 - (sprite.y + sprite.h) / sprite.image.height);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(.36, .66), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    decal.rotation.x = -Math.PI / 2; decal.position.set(.52, .887, -1.05); this.player.add(decal);
  }

  buildRoad() {
    this.box(this.scene, 0, -.22, -25, 200, .25, 300, material('#6c913d'));
    this.box(this.scene, 0, -.075, -25, 13.1, .1, 300, material('#aa9866'));
    this.box(this.scene, 0, -.005, -25, 11.74, .08, 300, material('#615e60'));
    for (const x of [-5.65, 5.65]) this.box(this.scene, x, .045, -25, .075, .015, 300, this.white);
    this.markings = [];
    for (let i = 0; i < 65; i++) for (const x of [-1.955, 1.955]) {
      this.markings.push({ mesh: this.box(this.scene, x, .045, 0, .1, .018, 1.45, this.white), index: i });
    }
    const rail = material('#c5c9c1', { metalness: .45 });
    for (const x of [-6.6, 6.6]) {
      this.box(this.scene, x, .63, -25, .13, .23, 260, rail);
      for (let z = -140; z < 100; z += 5) this.box(this.scene, x, .3, z, .12, .6, .12, rail);
    }
  }

  buildFinish() {
    this.finish = new THREE.Group(); this.scene.add(this.finish);
    const width = 11.74, square = width / 12;
    for (let row = 0; row < 2; row++) for (let column = 0; column < 12; column++) {
      this.box(this.finish, -width / 2 + square * (column + .5), .065, (row - .5) * .65, square, .018, .65, (row + column) % 2 ? this.black : this.white);
    }
    for (const x of [-6.15, 6.15]) this.box(this.finish, x, 2.7, 0, .22, 5.4, .22, this.white);
    this.box(this.finish, 0, 5.1, 0, 12.5, 1.2, .22, this.black);
    const label = document.createElement('canvas'); label.width = 1024; label.height = 128;
    const context = label.getContext('2d');
    context.fillStyle = '#171c23'; context.fillRect(0, 0, 1024, 128);
    context.fillStyle = '#fff7e8'; context.font = 'bold 76px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText('FINISH · 1,000,000', 512, 67);
    const texture = new THREE.CanvasTexture(label); texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 1.1), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    sign.position.set(0, 5.1, .13); this.finish.add(sign); this.finish.visible = false;
  }

  buildTrees() {
    const count = 180;
    this.trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .28, 2, 6), material('#725337'), count);
    this.crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material('#76aa2d', { flatShading: true }), count);
    this.trunks.castShadow = this.crowns.castShadow = true;
    this.crowns.receiveShadow = true;
    this.scene.add(this.trunks, this.crowns);
    this.trees = []; this.dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      this.trees.push({ x: (i % 2 ? 1 : -1) * (8 + (i % 5) * 2.8), z: Math.floor(i / 2) * 2.5 - 170, size: 1.3 + ((i * 17) % 11) * .1 });
      this.crowns.setColorAt(i, new THREE.Color().setHSL(.22 + (i % 5) * .009, .55, .28 + (i % 7) * .035));
    }
  }

  buildEffects() {
    const image = document.createElement('canvas'); image.width = image.height = 64;
    const c = image.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#fff'); g.addColorStop(.4, '#ffffffaa'); g.addColorStop(1, '#ffffff00');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(image);
    this.smoke = Array.from({ length: 100 }, () => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: '#d5dce1', transparent: true, depthWrite: false }));
      sprite.visible = false; this.scene.add(sprite); return sprite;
    });
    this.sparks = Array.from({ length: 25 }, () => {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(.07, 4, 3), new THREE.MeshBasicMaterial({ color: '#ffc46c' }));
      spark.visible = false; this.scene.add(spark); return spark;
    });
    this.explosions = Array.from({ length: 2 }, () => {
      const group = new THREE.Group(); group.visible = false; this.scene.add(group);
      const paint = material('#ed3228', { metalness: .3 });
      const debris = Array.from({ length: 24 }, (_, i) => {
        const mesh = new THREE.Mesh(this.boxGeometry, i % 3 ? paint : this.black);
        mesh.castShadow = true; group.add(mesh); return mesh;
      });
      const fire = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: '#ffad32', transparent: true, depthWrite: false }));
      group.add(fire);
      const clouds = Array.from({ length: 10 }, () => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: '#514b48', transparent: true, depthWrite: false }));
        group.add(sprite); return sprite;
      });
      const light = new THREE.PointLight('#ff8a26', 0, 12); light.position.y = 1; group.add(light);
      return { group, paint, debris, fire, clouds, light };
    });
  }

  explode(cars) {
    cars.forEach((car, index) => {
      const explosion = this.explosions[index];
      explosion.group.position.set((car.x - 400) / SCALE, 0, (car.y - 430) / SCALE);
      explosion.paint.color.set(car.color);
      explosion.debris.forEach((mesh, i) => {
        const angle = Math.random() * Math.PI * 2, force = 2 + Math.random() * 4;
        mesh.userData.velocity = new THREE.Vector3(Math.cos(angle) * force, 3 + Math.random() * 5, Math.sin(angle) * force);
        mesh.userData.origin = new THREE.Vector3((Math.random() - .5) * 1.4, .5 + Math.random() * .5, (Math.random() - .5) * 2.6);
        mesh.scale.set(.12 + Math.random() * .45, .08 + Math.random() * .2, .15 + Math.random() * .55);
        mesh.userData.spin = i % 2 ? 1 : -1;
      });
      explosion.clouds.forEach((cloud, i) => {
        cloud.userData.direction = new THREE.Vector3(Math.cos(i * 2.4), .5 + Math.random(), Math.sin(i * 2.4));
      });
    });
  }

  drawExplosions(state, age, reducedMotion) {
    this.explosions.forEach(explosion => {
      explosion.group.visible = state === 'crashed';
      if (!explosion.group.visible) return;
      const motion = reducedMotion ? .4 : 1;
      explosion.fire.position.y = .9;
      explosion.fire.scale.setScalar(.3 + Math.min(age * 9, 2.7));
      explosion.fire.material.opacity = Math.max(0, 1 - age / .65) * (reducedMotion ? .5 : .9);
      explosion.fire.material.color.set(age < .18 ? '#ffe6a2' : '#ff641d');
      explosion.light.intensity = reducedMotion ? 0 : Math.max(0, 32 * (1 - age / .6));
      explosion.debris.forEach(mesh => {
        mesh.position.copy(mesh.userData.origin).addScaledVector(mesh.userData.velocity, age * motion);
        mesh.position.y = Math.max(.12, mesh.position.y - 5 * age * age * motion);
        mesh.rotation.set(age * 5 * motion, age * 7 * mesh.userData.spin * motion, age * 3 * motion);
      });
      explosion.clouds.forEach((cloud, i) => {
        cloud.position.copy(cloud.userData.direction).multiplyScalar((.3 + age * 1.8) * motion);
        cloud.position.y += 1;
        cloud.scale.setScalar(1 + age * 2 + (i % 3) * .3);
        cloud.material.opacity = Math.max(0, Math.min(.65, age * 2) * (1 - age / 1.8));
      });
    });
  }

  resize() {
    const w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 640;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    const fit = Math.max(1, .8 / this.camera.aspect);
    this.camera.position.set(12 * fit, 17 * fit, 20 * fit);
    this.camera.lookAt(0, 0, -7); this.camera.updateProjectionMatrix();
  }

  render({ playerX, traffic, smoke, particles, roadOffset, state, steer, reducedMotion, crashAge, finishRemaining }) {
    this.finish.visible = ['racing', 'countdown', 'paused', 'won'].includes(state) && finishRemaining < 600;
    // Distance points accrue at .15 per world pixel (30 pixels per 3D unit).
    this.finish.position.z = -finishRemaining / (.15 * SCALE);
    this.player.visible = state !== 'crashed';
    this.player.position.set((playerX - 400) / SCALE, 0, 0);
    this.player.rotation.z = reducedMotion ? 0 : -steer * .035;
    this.player.rotation.y = steer * -.045;
    for (let i = this.traffic.length; i < traffic.length; i++) {
      const model = this.createCar(traffic[i].color); this.traffic.push(model); this.scene.add(model);
    }
    this.traffic.forEach((model, i) => {
      model.visible = i < traffic.length && !traffic[i].exploded;
      if (!model.visible) return;
      const car = traffic[i]; model.position.set((car.x - 400) / SCALE, 0, (car.y - 430) / SCALE);
      // Traffic slots are reused across runs and must receive their current paint.
      for (const mesh of model.children) if (mesh.material.userData.paint) mesh.material.color.set(car.color);
    });
    const offset = roadOffset / SCALE;
    this.markings.forEach(({ mesh, index }) => { mesh.position.z = index * 4 - 170 + offset % 4; });
    this.trees.forEach((tree, i) => {
      const z = ((tree.z + offset + 170) % 225) - 170;
      this.dummy.position.set(tree.x, 1, z); this.dummy.scale.set(1, 1, 1); this.dummy.updateMatrix();
      this.trunks.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y = 2.6; this.dummy.scale.set(tree.size, tree.size * .95, tree.size); this.dummy.updateMatrix();
      this.crowns.setMatrixAt(i, this.dummy.matrix);
    });
    this.trunks.instanceMatrix.needsUpdate = this.crowns.instanceMatrix.needsUpdate = true;
    this.smoke.forEach((sprite, i) => {
      const puff = smoke[i]; sprite.visible = !!puff;
      if (!puff) return;
      sprite.position.set((puff.x - 400) / SCALE, .3 + (1 - puff.life / puff.maxLife) * .6, (puff.y - 430) / SCALE);
      sprite.scale.setScalar(puff.radius / SCALE * 2.5);
      sprite.material.opacity = puff.opacity * puff.life / puff.maxLife;
    });
    this.sparks.forEach((spark, i) => {
      const p = particles[i]; spark.visible = !!p && p.life > 0;
      if (spark.visible) spark.position.set((p.x - 400) / SCALE, .4 + Math.max(0, p.life), (p.y - 430) / SCALE);
    });
    this.drawExplosions(state, crashAge, reducedMotion);
    if (state === 'crashed' && !reducedMotion) this.camera.setViewOffset(this.canvas.width, this.canvas.height, (Math.random() - .5) * 6, (Math.random() - .5) * 6, this.canvas.width, this.canvas.height);
    else this.camera.clearViewOffset();
    this.renderer.render(this.scene, this.camera);
  }
}
