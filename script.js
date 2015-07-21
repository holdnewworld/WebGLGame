/******************** Class definitions *********************/

/**
  * An ObjectGroup class that may contain single or 
  * multiple 3D meshes. It's used to group 3D geometries 
  * as a distinct named object.
  */
function ObjectGroup() {
  this.name = "";
  this.objects = [];
  this.pickable = false;
  this.lookClosePosition = new THREE.Vector3();
  this.lookCloseDirection = new THREE.Vector3();
  this.lookCloseMessage =   // default text
    "I don't see anything unusual about this thing.";
}

/**
  * Particle system for fire 
  * a bit rough at this point
  */
function FireSystem(x, y, z, size, spreadVertical, spreadHorizontal) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.size = size;
  this.initialized = true;

  this.particleCount = 100000;
  this.geo = new THREE.Geometry();
  var colors = [];
  for (var i=0; i<this.particleCount; i++) {
    colors.push(new THREE.Color());
  }
  this.geo.colors = colors;
  
  this.particleMaterial = new THREE.PointCloudMaterial({
    name: "fireParticleMaterial",
    color: 0xffffff,
    size: 0.1,
    blending: THREE.AdditiveBlending,
    vertexColors: THREE.VertexColors,
  });

  for (var p=0; p<this.particleCount; p++) {
    var px = this.x + Math.random()*this.size - this.size/2;
    var py = this.y + Math.random()*this.size - this.size/2;
    var pz = this.z + Math.random()*this.size - this.size/2;
    this.geo.vertices.push(new THREE.Vector3(px, py, pz));
  }
  this.particleSystem = new THREE.PointCloud(this.geo, this.particleMaterial);
  this.particleSystem.geometry.verticesNeedUpdate = true;
  this.particleSystem.updateMatrix();

  // animate
  this.update = function() {
    for (var p=0; p<this.particleCount; p++) {
      var dx = (Math.random()-0.5)*spreadHorizontal*1.2 + (Math.random()-0.5)*0.8;
      var dy = Math.random()*Math.random()*spreadVertical*2.0;
      var dz = (Math.random()-0.5)*spreadHorizontal*1.2 + (Math.random()-0.5)*0.8;

      // if particle goes out of bound, remove it and add new one
      if (this.geo.vertices[p].y >= this.y+2*this.size) {
        var px = this.x + Math.random()*this.size - this.size/2;
        var py = this.y + Math.random()*this.size - this.size/2;
        var pz = this.z + Math.random()*this.size - this.size/2;
        this.geo.vertices[p] = new THREE.Vector3(px, py, pz);
      }

      // update particle position
      this.geo.vertices[p].x += dx;
      this.geo.vertices[p].y += dy;
      this.geo.vertices[p].z += dz;

      // update color depending on position
      if (Math.abs(this.geo.vertices[p].x-this.x) < 8*this.size*getRandomProb(2)
          && Math.abs(this.geo.vertices[p].y-this.y) < 120*this.size*getRandomProb(4)
          && Math.abs(this.geo.vertices[p].z-this.z) < 8*this.size*getRandomProb(2)) {
        this.particleSystem.geometry.colors[p].set(0xff0000);
      } else if (Math.abs(this.geo.vertices[p].x-this.x) < 15*this.size*getRandomProb(2)
          && Math.abs(this.geo.vertices[p].y-this.y) < 200*this.size*getRandomProb(4)
          && Math.abs(this.geo.vertices[p].z-this.z) < 15*this.size*getRandomProb(2)) {
        this.particleSystem.geometry.colors[p].set(0xff6600);
      } else {
        this.particleSystem.geometry.colors[p].set(0xffff66);
      }
    }

    this.particleSystem.geometry.verticesNeedUpdate = true;
    this.particleSystem.geometry.colorsNeedUpdate = true;
  };
}

/**
  * Support audio feature
  */
function SoundSystem(source) {
  this.backgroundSource = source;
  this.background1 = new Audio(this.backgroundSource);
  this.background2 = new Audio(this.backgroundSource);
  this.currentSong = 1;
  this.paused = false;
  this.background = null;

  this.backgroundLoop = function() {
    if (this.paused) {
      console.log("playing false");
      return;
    }

    // play two alternating sounds that start before the other
    // ends so that continuum of sounds is maintained
    if (this.currentSong == 1) {
      this.background = this.background2;
      this.currentSong = 2;
    } else {
      this.background = this.background1;
      this.currentSong = 1;
    }
    this.background.play();

    var that = this;
    setTimeout(function() {
      that.backgroundLoop();
    }, 5500);
  };

  this.startBackground = function() {
    if (this.paused) {
      // finish the one that was being played
      this.background.play();
      this.paused = false;
      this.startBackground();
    }
    this.backgroundLoop();
  }

  this.stop = function() {
    this.background.pause();
    this.paused = true;
  }
}

/************************ Constants *************************/
var UPVECTOR = new THREE.Vector3(0, 1, 0);
var DOWNVECTOR = new THREE.Vector3(0, -1, 0);

var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

/********************** Static functions ********************/

// the higher deg is, the lower probability is
function getRandomProb(deg) {
  var prob = 1;
  for (var i=0; i<deg; i++) {
    prob *= Math.random();
  }
  return prob;
}

// For object picking
function getSelectedObjectGroup() {
  raycaster.setFromCamera(mouse, camera);
  for (var i=0; i<objectGroups.length; i++) {
    //var objectsInGroup = objectGroups[i].objects;
    if (raycaster.intersectObjects(objectGroups[i].objects).length > 0) {
      if (objectGroups[i].pickable) {
        return objectGroups[i];
      }
    }
  }
  return null;
}

function enterLookCloseMode(objectGroup) {
  if (objectGroup.name == "wooden box" && holding_wooden_box) {
    // clicking wooden box while holding it should do nothing
    return;
  } else if (objectGroup.name == "wooden box" && wooden_box_found) {
    // second click on the wooden box
    holding_wooden_box = true;
    return;
  }

  lookCloseMode = true;
  if (objectGroup.name == "wooden box") {
    // once clicked, let it remain visible
    wooden_box_found = true;
  }

  playerPosition.x = camera.position.x;
  playerPosition.y = camera.position.y;
  playerPosition.z = camera.position.z;

  var pos = objectGroup.lookClosePosition;
  var dir = objectGroup.lookCloseDirection;

  camera.position.x = pos.x;
  camera.position.y = pos.y;
  camera.position.z = pos.z;
  var lookAtVector = new THREE.Vector3().addVectors(dir, camera.position);
  camera.lookAt(lookAtVector);

  renderer.setViewport(0, 50, WIDTH, HEIGHT-100);

  textLine.innerHTML = objectGroup.lookCloseMessage;
  document.body.appendChild(textLine);
}

function exitLookCloseMode() {
  lookCloseMode = false;
  camera.position.x = playerPosition.x;
  camera.position.y = playerPosition.y;
  camera.position.z = playerPosition.z;
  var lookAtVector = new THREE.Vector3().addVectors(lookAtDirection, camera.position);
  camera.lookAt(lookAtVector);

  renderer.setViewport(0, 0, WIDTH, HEIGHT);
  document.body.removeChild(textLine);

  if (got_key) {
    scene.remove(keyObject);
  }
}

function closeEachOther(obj1, obj2, minDist) {
  return (Math.abs(obj1.x-obj2.x)<=minDist)
    && (Math.abs(obj1.y-obj2.y)<=minDist)
    && (Math.abs(obj1.z-obj2.z)<=minDist);
}

/************************ Initialize ************************/
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(
  75, WIDTH/HEIGHT, 0.1, 1000);

var lookAtRotationX = new THREE.Matrix4();
var lookAtRotationY = new THREE.Matrix4();
var lookAtDirection = new THREE.Vector3(0, 0, -1);

//var lookCloseAtDirection;
var lookCloseMode = false;
var playerPosition = new THREE.Vector3();

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WIDTH, HEIGHT);
renderer.shadowMapType = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// array of ObjectGroups
var objectGroups = [];

// setup picking
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// global text message
var textLine = document.createElement('div');
textLine.style.position = 'absolute';
//text2.style.zIndex = 1;
textLine.style.width = WIDTH;
textLine.style.height = 0;
textLine.style.color = "white";
textLine.align = "center";
textLine.style.top = HEIGHT-35 + 'px';
textLine.style.left = 0 + 'px';

var wooden_box_found = false;
var holding_wooden_box = false;
var burnTimer = new THREE.Clock();
var boxBurning = false;
var boxFire = null;

var got_key = false;

/****************** Set up menu GUI *********************/
var menu = new dat.GUI();
menu.closed = true;
var options = {
  textureMapping: true,
  bumpMapping: true,
  perlinNoise: true,
  reflection: true,
  sound: true,
};
menu.add(options, 'textureMapping').name('Texture Mapping')
    .onFinishChange(function() {
      // toggle between 0/1
      paperOnWallMaterial.uniforms.usingTextureMapping.value ^= 1;
      doorMaterial.uniforms.usingTextureMapping.value ^= 1;
    });
menu.add(options, 'bumpMapping').name('Bump Mapping')
    .onFinishChange(function() {
      roomFloorMaterial.uniforms.usingBumpMapping.value ^= 1;
    });
menu.add(options, 'perlinNoise').name('Perlin Noise')
    .onFinishChange(function() {
      roomMaterial.uniforms.usingNoise.value ^= 1;
    });
menu.add(options, 'reflection').name('Reflection')
    .onFinishChange(function() {
      if (options.reflection) {
        mirrorMaterial.envMap = mirrorCamera.renderTarget;
      } else {
        mirrorMaterial.envMap = null;
      }
    });
menu.add(options, 'sound').name('Sound')
    .onFinishChange(function() {
      if (options.sound) {
        soundSystem.startBackground();
      } else {
        soundSystem.stop();
      }
    });

/********************** Lights **************************/
var lightSource = new THREE.SpotLight(0xffffff);
lightSource.position.set(-5, 95, 0);
scene.add(lightSource);

var lightSource2 = new THREE.SpotLight(0xffffff);
lightSource2.position.set(5, 95, 0);
scene.add(lightSource2);

var lightSource3 = new THREE.SpotLight(0xffffff);
lightSource3.position.set(0, 80, -100);
scene.add(lightSource3);

var lightSource4 = new THREE.SpotLight(0xffffff);
lightSource4.position.set(0, 80, 100);
scene.add(lightSource4);

/****************** 6 sides of the room ******************/
var roomSize = 100; // half the wdith of each side

var room = new ObjectGroup();
room.name = "room";
room.pickable = false;

var roomSideFront = new THREE.PlaneGeometry(2*roomSize, 2*roomSize);
var roomSideBack = roomSideFront.clone();
var roomSideLeft = roomSideFront.clone();
var roomSideRight = roomSideFront.clone();
var roomSideCeiling = roomSideFront.clone();
var roomSideFloor = roomSideFront.clone();

var roomMaterial = new THREE.ShaderMaterial({
  name: "roomMaterial",
  side: THREE.DoubleSide,
  uniforms: {
    usingNoise: {type: "f", value: 1.0},
    base_color: {type: "c", value: new THREE.Color(0x666666)},
  },
  vertexShader: document.getElementById('perlinVertexShader').textContent,
  fragmentShader: document.getElementById('perlinFragmentShader').textContent
});

var flatGrayMaterial = new THREE.MeshBasicMaterial({
  name: "flatGrayMaterial",
  color: "silver",
  side: THREE.DoubleSide,
});

roomSideFront.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-roomSize));
room.objects.push(new THREE.Mesh(roomSideFront, roomMaterial));
//scene.add(new THREE.Mesh(roomSideFront, roomMaterial));

roomSideBack.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,roomSize));
room.objects.push(new THREE.Mesh(roomSideBack, roomMaterial));
//scene.add(new THREE.Mesh(roomSideBack, roomMaterial));

roomSideLeft.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/2));
roomSideLeft.applyMatrix(new THREE.Matrix4().makeTranslation(-roomSize,0,0));
room.objects.push(new THREE.Mesh(roomSideLeft, roomMaterial));
//scene.add(new THREE.Mesh(roomSideLeft, roomMaterial));

roomSideRight.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/2));
roomSideRight.applyMatrix(new THREE.Matrix4().makeTranslation(roomSize,0,0));
room.objects.push(new THREE.Mesh(roomSideRight, roomMaterial));
//scene.add(new THREE.Mesh(roomSideRight, roomMaterial));



var roomFloorMaterial = new THREE.ShaderMaterial({
  name: "roomFloorMaterial",
  uniforms: {
    usingBumpMapping: {type: "f", value: 1.0},
    // normal map file source: http://www.polycount.com/forum/showthread.php?t=89636
    normal_texture: {type: "t", value: THREE.ImageUtils.loadTexture('data/brick_normal2.png')},
    base_color: {type: "c", value: new THREE.Color(0x666666)},
    light_pos: {type: "v3", value: lightSource.position},
  },
  vertexShader: document.getElementById('textureVertexShader').textContent,
  fragmentShader: document.getElementById('bumpFragmentShader').textContent,
  side: THREE.DoubleSide,
});


roomSideCeiling.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/2));
roomSideCeiling.applyMatrix(new THREE.Matrix4().makeTranslation(0,roomSize,0));
room.objects.push(new THREE.Mesh(roomSideCeiling, roomFloorMaterial));
//scene.add(new THREE.Mesh(roomSideCeiling, roomMaterial));

roomSideFloor.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/2));
roomSideFloor.applyMatrix(new THREE.Matrix4().makeTranslation(0,-roomSize,0));
var roomSideFloorObj = new THREE.Mesh(roomSideFloor, roomFloorMaterial);
//roomSideFloorObj.receiveShadow = true;
room.objects.push(roomSideFloorObj);
//scene.add(new THREE.Mesh(roomSideFloor, roomFloorMaterial));

objectGroups.push(room);

/******************* paper on the wall  ********************/
var paperOnWallObjectGroup = new ObjectGroup();
paperOnWallObjectGroup.name = "paper on wall";
paperOnWallObjectGroup.pickable = true;

var paperOnWall = new THREE.PlaneGeometry(30, 20);
/*
var paperOnWallMaterial = new THREE.MeshBasicMaterial({
  name: "paperOnWallMaterial",
  color: 0xffffff,
  side: THREE.DoubleSide,
  map: THREE.ImageUtils.loadTexture('data/paperOnWall.png'),
  transparent: false,
  opacity: 0.3,
});*/
var paperOnWallMaterial = new THREE.ShaderMaterial({
  name: "paperOnWallMaterial",
  uniforms: {
    usingTextureMapping: {type: "f", value: 1.0},
    base_color: {type: "c", value: new THREE.Color(0x000000)},
    texture: {type: "t", value: THREE.ImageUtils.loadTexture('data/paperOnWall.png')}
  },
  vertexShader: document.getElementById('textureVertexShader').textContent,
  fragmentShader: document.getElementById('textureFragmentShader').textContent,
});

paperOnWall.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI/2));
paperOnWall.applyMatrix(new THREE.Matrix4().makeTranslation(roomSize-0.1,0,0));

paperOnWallObjectGroup.objects.push(new THREE.Mesh(paperOnWall, paperOnWallMaterial));
paperOnWallObjectGroup.lookClosePosition = new THREE.Vector3(roomSize-15,0,0);
paperOnWallObjectGroup.lookCloseDirection = new THREE.Vector3(1,0,0);
paperOnWallObjectGroup.lookCloseMessage = 
  "Something's written on it. What does it mean?";
objectGroups.push(paperOnWallObjectGroup);

/********************* Wooden box ****************************/
var woodenBoxObjectGroup = new ObjectGroup();
woodenBoxObjectGroup.name = "wooden box";
woodenBoxObjectGroup.pickable = true;

var woodenBox = new THREE.BoxGeometry(15, 10, 15);
var woodenBoxMaterial = new THREE.MeshPhongMaterial({
  name: "woodenBoxMaterial",
  ambient   : 0x222222,
  color   : 0x663300,
  emissive: 0x663300,
  shininess : 20, 
  specular  : 0xffffff,
  shading: THREE.SmoothShading,
  side: THREE.DoubleSide,
});
//woodenBox.applyMatrix(new THREE.Matrix4().makeTranslation(90,-95,-40));
var woodenBoxObject = new THREE.Mesh(woodenBox, woodenBoxMaterial);
woodenBoxObject.position.set(90,-95,-40);

woodenBoxObjectGroup.objects.push(woodenBoxObject);
woodenBoxObjectGroup.lookClosePosition = new THREE.Vector3(60, -90, -40);
woodenBoxObjectGroup.lookCloseDirection = new THREE.Vector3(1, 0, 0);
woodenBoxObjectGroup.lookCloseMessage =
  "A small box made of soft wood. It's locked so I can't open it. "+
  "I hear a clanking sound inside. How did I not see it was there though? Weird..";
objectGroups.push(woodenBoxObjectGroup);

/************************* Key *******************************/
var keySize = 3.0;
var keyMaterial = new THREE.MeshPhongMaterial({
  name: "woodenBoxMaterial",
  ambient   : 0xffffff,
  color   : 0xffcc00,
  //emissive: 0xffcc00,
  shininess : 60, 
  specular  : 0xffcc00,
  shading: THREE.SmoothShading,
  side: THREE.DoubleSide,
});
var keyRing = new THREE.TorusGeometry(keySize, keySize/2, 16, 16);
keyRing.applyMatrix(new THREE.Matrix4().makeTranslation(0,-3*keySize,0));
var keyTrunk = new THREE.CylinderGeometry(keySize/2, keySize/2, 6*keySize, 16);
keyTrunk.applyMatrix(new THREE.Matrix4().makeTranslation(0, keySize, 0));
var keyTooth1 = new THREE.BoxGeometry(keySize, keySize/2, keySize/2);
keyTooth1.applyMatrix(new THREE.Matrix4().makeTranslation(keySize, 2*keySize, 0));
var keyTooth2 = new THREE.BoxGeometry(keySize/2, keySize/2, keySize/2);
keyTooth2.applyMatrix(new THREE.Matrix4().makeTranslation(keySize*3/4, 0, 0));

var keyObject = new THREE.Object3D();
keyObject.add(new THREE.Mesh(keyRing, keyMaterial));
keyObject.add(new THREE.Mesh(keyTrunk, keyMaterial));
keyObject.add(new THREE.Mesh(keyTooth1, keyMaterial));
keyObject.add(new THREE.Mesh(keyTooth2, keyMaterial));
keyObject.rotateOnAxis(new THREE.Vector3(1,0,0), Math.PI);
//scene.add(keyObject);

/***************** Wrinkled paper ball ***********************/
var wrinkledPaperObjectGroup = new ObjectGroup();
wrinkledPaperObjectGroup.name = "wrinkled paper";
wrinkledPaperObjectGroup.pickable = true;

var wrinkledPaper = new THREE.SphereGeometry(10, 16, 12);
var wrinkledPaperMaterial = new THREE.MeshPhongMaterial({
  name: "wrinkledPaperMaterial",
  color: 0xffff66,
  bumpMap: THREE.ImageUtils.loadTexture('data/wrinkledPaperTexture14.jpg'),
  bumpScale: 5,
  //transparent: true,
  //opacity: 1.0,
});
wrinkledPaper.applyMatrix(new THREE.Matrix4().makeTranslation(90,-90,-40));
var wrinkledPaperObj = new THREE.Mesh(wrinkledPaper, wrinkledPaperMaterial);
wrinkledPaperObj.castShadow = true;
wrinkledPaperObj.receiveShadow = true;

wrinkledPaperObjectGroup.objects.push(wrinkledPaperObj);
wrinkledPaperObjectGroup.lookClosePosition = new THREE.Vector3(70, -90, -40);
wrinkledPaperObjectGroup.lookCloseDirection = new THREE.Vector3(1, 0, 0);
wrinkledPaperObjectGroup.lookCloseMessage =
  "How could I not see it was there? Weird..";
//objectGroups.push(wrinkledPaperObjectGroup);

/*
var particleMaterial = new THREE.PointCloudMaterial({
  name: "fireParticleMaterial",
  color: 0xffffff,
  size: 0.1,
  blending: THREE.AdditiveBlending,
  vertexColors: THREE.VertexColors,
});*/

/**************** Unfolded wrinkled paper ****************/
//var unfoldedPaper = 

/******************** Fire and candle ********************/
var fireCandle = new ObjectGroup();
fireCandle.name = "fire and candle";
fireCandle.pickable = true;

var fire = new FireSystem(75, -15, -75, 1, 6, 2);
fireCandle.objects.push(fire.particleSystem);

// add candle below the fire
var candle = new THREE.CylinderGeometry(2, 2, 20, 16);
var candleMaterial = new THREE.MeshPhongMaterial({
  name: "candleMaterial",
  color: 0x888888,
  emissive: 0x999999,
  specular: 0x444444,
  shininess: 30,
  shading: THREE.SmoothShading,
  side: THREE.DoubleSide,
  transparent: false,
  opacity: 0.3,
});
var candleObject = new THREE.Mesh(candle, candleMaterial);
candleObject.position.set(75, -25.6, -75);
fireCandle.objects.push(candleObject);

fireCandle.lookClosePosition = new THREE.Vector3(
  candleObject.position.x, candleObject.position.y+5, candleObject.position.z+30);
fireCandle.lookCloseDirection = new THREE.Vector3(0,0,-1);
fireCandle.lookCloseMessage = "Looks like a candle fire.";
objectGroups.push(fireCandle);

/********************* Desk object *************************/
var deskObjectGroup = new ObjectGroup();
deskObjectGroup.name = "desk";
deskObjectGroup.pickable = false;

var deskMaterial = new THREE.MeshPhongMaterial({
  name: "deskMaterial",
  ambient   : 0x222222,
  color   : 0x663300,
  shininess : 20, 
  specular  : 0xffffff,
  shading: THREE.SmoothShading,
  side: THREE.DoubleSide,
});

var deskBoard = new THREE.Mesh(new THREE.BoxGeometry(100, 3, 50), deskMaterial);
var deskLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 60), deskMaterial);
var deskLeg2 = deskLeg1.clone();
var deskLeg3 = deskLeg1.clone();
var deskLeg4 = deskLeg1.clone();
deskBoard.position.set(50, -40, -75);
deskLeg1.position.set(5, -70, -95);
deskLeg2.position.set(95, -70, -95);
deskLeg3.position.set(5, -70, -55);
deskLeg4.position.set(95, -70, -55);

deskObjectGroup.objects = [
  deskBoard,
  deskLeg1,
  deskLeg2,
  deskLeg3,
  deskLeg4,
];

objectGroups.push(deskObjectGroup);

/********************* Sound feature **********************/
//startPlayingSound("data/Strange_Days-Mike_Koenig-176042049.mp3");
var soundSystem = new SoundSystem("data/Strange_Days-Mike_Koenig-176042049.mp3");
soundSystem.startBackground();

/********************* mirror object **********************/
var mirrorObjectGroup = new ObjectGroup();
mirrorObjectGroup.name = "mirror";
mirrorObjectGroup.pickable = true;
// mirror
var mirror = new THREE.CylinderGeometry(25, 25, 4, 20);
mirror.applyMatrix(new THREE.Matrix4().makeRotationZ(Math.PI/2));
var mirrorCamera = new THREE.CubeCamera(0.1, 500, 1024);
//mirrorCamera.lookAt(THREE.Vector3(1,0,0));
scene.add(mirrorCamera);

var mirrorMaterial = new THREE.MeshBasicMaterial({
  name: "mirrorMaterial",
  color: 0xffffff,
  shading: THREE.SmoothShading,
  envMap: mirrorCamera.renderTarget,
  side: THREE.DoubleSide,
  transparent: false,
  opacity: 0.3,
});
/*
var mirrorMaterial = new THREE.ShaderMaterial({
  name: "mirrorMaterial",
  uniforms: {
    "mirrorColor": {type: "c", value: new THREE.Color(0x7F7F7F)},
    "mirrorSampler": {type: "t", value: null},
    "textureMatrix" : {type: "m4", value: new THREE.Matrix4()}
  },
  vertexShader: document.getElementById('mirrorVertexShader').textContent,
  fragmentShader: document.getElementById('mirrorFragmentShader').textContent,
});*/

var mirrorObject = new THREE.Mesh(mirror, mirrorMaterial);
mirrorObject.position.set(-(roomSize-0.1), 0, 0);
mirrorCamera.position = mirrorObject.position;
mirrorCamera.position.x -= roomSize;
//scene.add(mirrorObject);
mirrorObjectGroup.objects.push(mirrorObject);

// mirror frame
var mirrorFrame = new THREE.TorusGeometry(26, 3, 32, 24);
mirrorFrame.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/2));
var mirrorFrameMaterial = new THREE.MeshPhongMaterial({
  name: "mirrorFrameMaterial",
  ambient   : 0xeeeeee,
  color   : 0xcc3300,
  shininess : 20, 
  specular  : 0xffffff,
  shading   : THREE.SmoothShading,
  side: THREE.DoubleSide,
  transparent: false,
  opacity: 0.3,
});
var mirrorFrameObject = new THREE.Mesh(mirrorFrame, mirrorFrameMaterial);
mirrorFrameObject.position.set(-(roomSize-0.1), 0, 0);
//scene.add(mirrorFrameObject);
mirrorObjectGroup.objects.push(mirrorFrameObject);

mirrorObjectGroup.lookClosePosition.x = mirrorObject.position.x+50;
mirrorObjectGroup.lookCloseDirection = new THREE.Vector3(-1,0,0);
mirrorObjectGroup.lookCloseMessage =
  "Looks like a mirror.";
objectGroups.push(mirrorObjectGroup);

/************************* Door ***************************/
var doorObjectGroup = new ObjectGroup();
doorObjectGroup.name = "door";
doorObjectGroup.pickable = true;

var doorMaterial = new THREE.ShaderMaterial({
  name: "doorMaterial",
  uniforms: {
    usingTextureMapping: {type: "f", value: 1.0},
    base_color: {type: "c", value: new THREE.Color(0x663300)},
    // image file source: http://hdimagelib.com/wooden+door+texture
    texture: {type: "t", value: THREE.ImageUtils.loadTexture('data/door.png')}
  },
  vertexShader: document.getElementById('textureVertexShader').textContent,
  fragmentShader: document.getElementById('textureFragmentShader').textContent,
});
var doorObject = new THREE.Mesh(new THREE.BoxGeometry(60, 160, 3), doorMaterial);
doorObject.position.set(0, -20, 99.5);

doorObjectGroup.objects.push(doorObject);
doorObjectGroup.lookClosePosition.z = 40;
doorObjectGroup.lookCloseDirection.z = 1;
doorObjectGroup.lookCloseMessage =
  "This door seems to be the only way out, but it's locked from outside.";
objectGroups.push(doorObjectGroup);

/********************* Elastic ball ***********************/
var a = 10;
var b = 10;
var c = 10;
var elasticBallGeom = new THREE.ParametricGeometry(
  function(u, v) {
    var x = a * Math.cos(u) * Math.cos(v);
    var y = b * Math.cos(u) * Math.sin(v);
    var z = c * Math.sin(u);
    return new THREE.Vector3(x,y,z);
  },
  120, 120
);
var elasticBallObject = new THREE.Mesh(elasticBallGeom, keyMaterial);
scene.add(elasticBallObject);

/*************** add all objects to the scene *************/
for (var i=0; i<objectGroups.length; i++) {
  var objs = objectGroups[i].objects;
  for (var j=0; j<objs.length; j++) {
    scene.add(objs[j]);
  }
}



camera.position.z = 3;

/*********************** Listeners ************************/
var mouseDown = false;
var lastX = 0;
var lastY = 0;

document.addEventListener('mousedown', onMouseDown, false);
function onMouseDown(event) {
  event.preventDefault();

  mouseDown = true;

  var selectedObjGroup = getSelectedObjectGroup();

  if (lookCloseMode) {
    // exit look close mode
    console.log("exiting look close mode");
    exitLookCloseMode();
    return;
  }

  if (selectedObjGroup != null) {
    // enter look close mode
    enterLookCloseMode(selectedObjGroup);
  }

  lastX = event.pageX;
  lastY = event.pageY;
}

document.addEventListener('mousemove', onMouseMove, false);
function onMouseMove(event) {
  event.preventDefault();

  if (mouseDown) {
    lookAtRotationX.makeRotationY((lastX-event.pageX)/250);
    lookAtDirection.transformDirection(lookAtRotationX);
    lookAtRotationY.makeRotationX((lastY-event.pageY)/250);
    lookAtDirection.transformDirection(lookAtRotationY);
    var lookAtVector = new THREE.Vector3().addVectors(lookAtDirection, camera.position);
    camera.lookAt(lookAtVector);
    //console.log("Looking at ("+lookAtVector.x+", "+lookAtVector.y+", "+lookAtVector.z+")");
  }
  lastX = event.pageX;
  lastY = event.pageY;
  mouse.x = (event.clientX/WIDTH)*2 - 1;
  mouse.y = -(event.clientY/HEIGHT)*2 + 1;
}

document.addEventListener('mouseup', onMouseUp, false);
function onMouseUp(event) {
  event.preventDefault();

  mouseDown = false;
}

document.addEventListener('keypress', onKeyPressed, false);
function onKeyPressed(event) {
  var key = event.keyCode ? event.keyCode : event.which;
  //var rotMatrix = new THREE.Matrix4();
  var moveVector = new THREE.Vector3();

  switch(key) {
    case 87:  // w
    case 119: 
      moveVector = lookAtDirection;
      //camera.position.add(moveVector);
      camera.position.x += 3*moveVector.x;
      camera.position.z += 3*moveVector.z;
      break;
    case 83:  // s
    case 115:
      moveVector = new THREE.Vector3(0, 0, 0).sub(lookAtDirection);
      //camera.position.add(moveVector);
      camera.position.x += 3*moveVector.x;
      camera.position.z += 3*moveVector.z;
      break;
    case 65:  // a
    case 97:
      moveVector.crossVectors(lookAtDirection, DOWNVECTOR);
      //camera.position.add(moveVector);
      camera.position.x += 3*moveVector.x;
      camera.position.z += 3*moveVector.z;
      break;
    case 68:  // d
    case 100:
      moveVector.crossVectors(lookAtDirection, UPVECTOR);
      //camera.position.add(moveVector);
      camera.position.x += 3*moveVector.x;
      camera.position.z += 3*moveVector.z;
      break;
  }
  //console.log("eye position=("+camera.position.x+", "+camera.position.y+", "+camera.position.z+")");
}

/******************** Render function *********************/
var render = function () {
  // first set all objects as unpicked
  for (var i=0; i<scene.children.length; i++) {
    if (typeof scene.children[i].material != "undefined") {
    //if (scene.children[i].type == "Mesh") {
      //console.log(scene.children[i]);
      scene.children[i].material.transparent = false;
      scene.children[i].material.opacity = 1.0;
    }
  }

  // then check picked objects
  var selectedObjectGroup = getSelectedObjectGroup();
  if (selectedObjectGroup != null) {
    for (var i=0; i<selectedObjectGroup.objects.length; i++) {
      selectedObjectGroup.objects[i].material.transparent = true;
      selectedObjectGroup.objects[i].material.opacity = 0.3; // this will get overriden for ShaderMaterial
    }
  }

  fire.update();
  if (boxFire != null) {
    boxFire.update();
  }

  mirrorObject.visible = false;
  woodenBoxObject.visible = true;
  mirrorCamera.updateCubeMap(renderer, scene);
  mirrorObject.visible = true;
  woodenBoxObject.visible = wooden_box_found;

  if (holding_wooden_box) {
    woodenBoxObject.position.x = camera.position.x+30*lookAtDirection.x;
    woodenBoxObject.position.y = camera.position.y+30*lookAtDirection.y;
    woodenBoxObject.position.z = camera.position.z+30*lookAtDirection.z;
  }


  if (!burnTimer.running && !boxBurning && closeEachOther(woodenBoxObject.position, fire, 10)) {
    console.log("start burning");
    burnTimer.start();
  } else if (burnTimer.running && !boxBurning && burnTimer.getElapsedTime()>4 && burnTimer.getElapsedTime()<10) {
    console.log("waiting for box on fire..");
    boxBurning = true;
    boxFire = new FireSystem(woodenBoxObject.position.x, woodenBoxObject.position.y, woodenBoxObject.position.z, 3, 12, 12);
    scene.add(boxFire.particleSystem);
  } else if (burnTimer.running && boxBurning && burnTimer.getElapsedTime()>=10) {
    boxBurning = false;
    burnTimer.stop();
    scene.remove(boxFire.particleSystem);
    boxFire = null;

    var x = woodenBoxObject.position.x;
    var y = woodenBoxObject.position.y;
    var z = woodenBoxObject.position.z;
    scene.remove(woodenBoxObject);
    objectGroups.splice(objectGroups.indexOf(woodenBoxObjectGroup), 1);

    // show key in "look close" mode
    keyObject.position.set(x,y,z+10);

    var keyObjectGroup = new ObjectGroup();
    keyObjectGroup.name = "key";
    keyObjectGroup.objects.push(keyObject);
    keyObjectGroup.lookClosePosition.x = keyObject.position.x;
    keyObjectGroup.lookClosePosition.y = keyObject.position.y;
    keyObjectGroup.lookClosePosition.z = keyObject.position.z+40;
    keyObjectGroup.lookCloseDirection.z = -1.0;
    keyObjectGroup.lookCloseMessage =
      "Obtained a key!";
    
    got_key = true;

    scene.add(keyObject);
    enterLookCloseMode(keyObjectGroup);
  }

  requestAnimationFrame(render);

  renderer.render(scene, camera);
};

render();