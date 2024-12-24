//#region Getting elements
const detailsBtn = document.getElementById("details-button");
const detailsContainer = document.getElementById("details-container");
const initialSettingsContainer = document.getElementById("initial-settings-container");
const imgInput = document.getElementById("img-input");
const fileNameEl = document.getElementById("file-name");
const previewContainer = document.getElementById("preview-container");
const topLeftCropEl = document.getElementById("top-left-crop");
const bottomRightCropEl = document.getElementById("bottom-right-crop");
const dragCropEl = document.getElementById("drag-crop");
const pinsInput = document.getElementById("pins-input");
const stringsInput = document.getElementById("strings-input");
const stringOpacityInput = document.getElementById("string-opacity-input");
const stringThicknessInput = document.getElementById("string-thickness-input");
const generateBtn = document.getElementById("generate-btn");
const additionalSettingsContainer = document.getElementById("additional-settings-container");
const referenceOpacityInput = document.getElementById("reference-opacity-slider");
const additionalStringsInput = document.getElementById("additional-strings-input");
const addBtn = document.getElementById("add-btn");
const loadBarContainer = document.getElementById("load-bar-container");
const loadBarFill = document.getElementById("load-bar-fill");
const loadBarPercentage = document.getElementById("load-bar-percentage");
const canvasContainer = document.getElementById("canvas-container");
const menuEl = document.getElementById("menu");
const downloadBtn = document.getElementById("download-btn");
const restartBtn = document.getElementById("restart-btn");
//#endregion

//#region Getting canvas
const canvasEl = document.getElementById("canvas");
const imgCanvasEl = document.getElementById("image");
const pinsCanvasEl = document.getElementById("pins");
const refCanvasEl = document.getElementById("reference");
const exportCanvasEl = document.getElementById("export-canvas");
const previewCanvasEl = document.getElementById("preview-canvas");
const cropRegionCanvasEl = document.getElementById("crop-region-canvas");
const previewCtx = previewCanvasEl.getContext("2d");
const cropRegionCtx = cropRegionCanvasEl.getContext("2d");
const ctx = imgCanvasEl.getContext("2d");
const pinsCtx = pinsCanvasEl.getContext("2d");
const exportCtx = exportCanvasEl.getContext("2d");
const refCtx = refCanvasEl.getContext("2d",{willReadFrequently: true});
imgCanvasEl.width = Math.min(innerHeight, innerWidth)*devicePixelRatio;
imgCanvasEl.height = Math.min(innerHeight, innerWidth)*devicePixelRatio;
pinsCanvasEl.width = Math.min(innerHeight, innerWidth)*devicePixelRatio;
pinsCanvasEl.height = Math.min(innerHeight, innerWidth)*devicePixelRatio;
refCanvasEl.width = Math.min(innerHeight, innerWidth)*devicePixelRatio;
refCanvasEl.height = Math.min(innerHeight, innerWidth)*devicePixelRatio;
canvasEl.width = Math.min(innerHeight, innerWidth)*devicePixelRatio;
canvasEl.height = Math.min(innerHeight, innerWidth)*devicePixelRatio;
exportCanvasEl.width = Math.min(innerHeight, innerWidth)*devicePixelRatio;
exportCanvasEl.height = Math.min(innerHeight, innerWidth)*devicePixelRatio;
//#endregion

//#region SHADER PART
const BASE_VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 uv;

  void main() {
    uv = (position+1.)/2.;
    gl_Position = vec4(position, 0, 1.0);
  }
`;

const BASE_FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 uv;
  uniform vec2 startPos;
  uniform vec2 endPos;
  uniform float thickness;
  uniform float darkness;

  void main() {
    float angle = acos(dot(normalize(uv-startPos), normalize(endPos-startPos)));
    float dist = length(uv-startPos)*sin(angle);
    float opacity = (1.-min(dist/thickness,1.))*darkness;
    gl_FragColor = vec4(vec3(0.,0.,0.), opacity);
    if(length(uv-startPos)*cos(angle)<0.||length(uv-startPos)*cos(angle)>length(endPos-startPos)){
      gl_FragColor = vec4(0.,0.,0.,0.);
    }
  }
`;

// Get our canvas
const gl = canvasEl.getContext("webgl", {alpha: true, preserveDrawingBuffer: true});
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

// Create our vertex shader
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, BASE_VERTEX_SHADER);
gl.compileShader(vertexShader);

// Create our fragment shader
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, BASE_FRAGMENT_SHADER);
gl.compileShader(fragmentShader);

// Create our program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

// Enable the program
gl.useProgram(program);

// Bind VERTICES as the active array buffer.
const VERTICES = new Float32Array([-1., -1., -1., 1., 1., 1., 1., 1., 1., -1., -1., -1.]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

// Set and enable our array buffer as the program's "position" variable
const positionLocation = gl.getAttribLocation(program, "position");
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionLocation);

gl.clearColor(0.0, 0.0, 0.0, 0.0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.enable(gl.BLEND);
gl.disable(gl.DEPTH_TEST);
gl.blendFunc(gl.ONE, gl.ONE);
gl.blendEquation(gl.FUNC_ADD);

const startPosLocation = gl.getUniformLocation(program, "startPos");
const endPosLocation = gl.getUniformLocation(program, "endPos");
const thicknessLocation = gl.getUniformLocation(program, "thickness");
const darknessLocation = gl.getUniformLocation(program, "darkness");
function drawLine(start, end, thickness, darkness){
  gl.uniform2f(startPosLocation, start.x, start.y);
  gl.uniform2f(endPosLocation, end.x, end.y);
  gl.uniform1f(thicknessLocation, thickness);
  gl.uniform1f(darknessLocation, darkness);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
//#endregion

//#region functions
function detailsToggle(){
  if(detailsContainer.style.maxHeight === ""){
    detailsContainer.style.maxHeight = detailsContainer.scrollHeight+20+"px";
  }
  else{
    detailsContainer.style.maxHeight = null;
  }
}

function redrawImage(){
  ctx.clearRect(0, 0, imgCanvasEl.width, imgCanvasEl.height);
  ctx.globalAlpha = parseFloat(referenceOpacityInput.value);
  ctx.drawImage(img, srcPosX, srcPosY, sideLength, sideLength, imgCanvasEl.width*0.05, imgCanvasEl.width*0.05, imgCanvasEl.width*0.9, imgCanvasEl.height*0.9);
}

function getImage(){
  img.src = URL.createObjectURL(imgInput.files[0]);
  img.onload = () => {
    //Sets the circular crop
    ctx.beginPath();
    ctx.arc(imgCanvasEl.width/2, imgCanvasEl.width/2, imgCanvasEl.width*0.9/2, 0, Math.PI*2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    //Draw image
    const topLeftCropRect = topLeftCropEl.getBoundingClientRect();
    const bottomRightCropRect = bottomRightCropEl.getBoundingClientRect();
    const previewContainerRect = previewContainer.getBoundingClientRect();
    ctx.globalAlpha = parseFloat(referenceOpacityInput.value);
    sideLength = img.width * (bottomRightCropRect.right - topLeftCropRect.left)/400;
    srcPosX = img.width * (topLeftCropRect.left - previewContainerRect.left)/400;
    srcPosY = img.height * (topLeftCropRect.top - previewContainerRect.top)/(400*img.naturalHeight/img.naturalWidth);
    ctx.drawImage(img, srcPosX, srcPosY, sideLength, sideLength, imgCanvasEl.width*0.05, imgCanvasEl.width*0.05, imgCanvasEl.width*0.9, imgCanvasEl.height*0.9);
    refCtx.drawImage(img, srcPosX, srcPosY, sideLength, sideLength, imgCanvasEl.width*0.05, imgCanvasEl.width*0.05, imgCanvasEl.width*0.9, imgCanvasEl.height*0.9);
    //Sets the imgData array
    const imgData = refCtx.getImageData(0, 0, refCanvasEl.width, refCanvasEl.height);
    imgBrightness = [];
    for(let i=0; i<refCanvasEl.width*refCanvasEl.height*4; i=i+4){
      imgBrightness.push((imgData.data[i]**2+imgData.data[i+1]**2+imgData.data[i+2]**2)**0.5/441.67296);
    }

    //Things to do once image loading is complete
    initialSettingsContainer.style.display = "none";
    canvasContainer.style.display = "block";
    detailsBtn.style.display = "none";
    detailsContainer.style.display = "none";
    resetLoadBar();
    loadBarContainer.style.display = "block";
    addNewStringUpdated(currentPinIndex, lastPinIndex, parseInt(stringsInput.value));
  };
}

function resetCropElements(){
  const shorterSide = Math.min(cropRegionCanvasEl.width, cropRegionCanvasEl.height);
  topLeftCropEl.style.left = (cropRegionCanvasEl.width-shorterSide)/2/devicePixelRatio + "px";
  topLeftCropEl.style.top = (cropRegionCanvasEl.height-shorterSide)/2/devicePixelRatio + "px";
  bottomRightCropEl.style.left = (cropRegionCanvasEl.width+shorterSide)/2/devicePixelRatio - 30 + "px";
  bottomRightCropEl.style.top = (cropRegionCanvasEl.height+shorterSide)/2/devicePixelRatio - 30 + "px";
  updateDragCropEl();
}

function updateFileName(){
  if(!imgInput.files[0]){
    fileNameEl.innerText = "";
    return;
  }
  fileNameEl.innerText = imgInput.files[0].name;
}

function showPreviewImage(){
  if(!imgInput.files[0]){
    previewContainer.style.display = "none";
    return;
  }
  previewContainer.style.display = "block";
  img.src = URL.createObjectURL(imgInput.files[0]);
  img.onload = () => {
    const ratio = img.naturalHeight/img.naturalWidth;
    previewCanvasEl.width = 400*devicePixelRatio;
    previewCanvasEl.height = 400*devicePixelRatio*ratio;
    cropRegionCanvasEl.width = 400*devicePixelRatio;
    cropRegionCanvasEl.height = 400*devicePixelRatio*ratio;
    previewContainer.style.width = "400px";
    previewCanvasEl.style.width = "400px";
    cropRegionCanvasEl.style.width = "400px";
    previewContainer.style.height = 400*ratio+"px";
    previewCanvasEl.style.height = 400*ratio+"px";
    cropRegionCanvasEl.style.height = 400*ratio+"px";
    previewCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, previewCanvasEl.width, previewCanvasEl.height);
    resetCropElements();
    refreshCropRegionCanvas();
  }
}

function refreshCropRegionCanvas(){
  const topLeftCropRect = topLeftCropEl.getBoundingClientRect();
  const bottomRightCropRect = bottomRightCropEl.getBoundingClientRect();
  const previewContainerRect = previewContainer.getBoundingClientRect();
  cropRegionCtx.clearRect(0, 0, cropRegionCanvasEl.width, cropRegionCanvasEl.height);
  cropRegionCtx.beginPath();
  cropRegionCtx.arc(((topLeftCropRect.left+bottomRightCropRect.right)/2-previewContainerRect.left)*devicePixelRatio, 
  ((topLeftCropRect.top+bottomRightCropRect.bottom)/2-previewContainerRect.top)*devicePixelRatio, 
  (bottomRightCropRect.right-topLeftCropRect.left)/2*devicePixelRatio,0,Math.PI*2);
  cropRegionCtx.rect(previewCanvasEl.width, 0, -previewCanvasEl.width, previewCanvasEl.height);
  cropRegionCtx.fillStyle = "#00000050";
  cropRegionCtx.fill();
  cropRegionCtx.closePath();
}

function clamp( value, min, max){
  return Math.max(min, Math.min(max, value));
}
function onTopLeftCropClick(event){
  const topLeftCropRect = topLeftCropEl.getBoundingClientRect();
  const bottomRightCropRect = bottomRightCropEl.getBoundingClientRect();
  const previewContainerRect = previewContainer.getBoundingClientRect();
  const clickPosX = event.clientX;
  const clickPosY = event.clientY;
  function onMouseMove(event){
    //offset of the current mouse position from the click position
    let offsetX = event.clientX-clickPosX;
    let offsetY = event.clientY-clickPosY;
    offsetX = clamp(offsetX, previewContainerRect.left - topLeftCropRect.left, bottomRightCropRect.left - 45 - topLeftCropRect.left);
    offsetX = clamp(offsetX, previewContainerRect.top - topLeftCropRect.top, bottomRightCropRect.top - 45 - topLeftCropRect.top);
    offsetY = clamp(offsetY, previewContainerRect.top - topLeftCropRect.top, bottomRightCropRect.top - 45 - topLeftCropRect.top);
    offsetY = clamp(offsetY, previewContainerRect.left - topLeftCropRect.left, bottomRightCropRect.left - 45 - topLeftCropRect.left);
    if(Math.abs(event.clientX-bottomRightCropRect.right)>Math.abs(event.clientY-bottomRightCropRect.bottom)){
      topLeftCropEl.style.left = topLeftCropRect.left - previewContainerRect.left + offsetX + "px"; 
      topLeftCropEl.style.top = topLeftCropRect.top - previewContainerRect.top + offsetX + "px"; 
    }else{
      topLeftCropEl.style.left = topLeftCropRect.left - previewContainerRect.left + offsetY + "px"; 
      topLeftCropEl.style.top = topLeftCropRect.top - previewContainerRect.top + offsetY + "px"; 
    }
    updateDragCropEl();
    refreshCropRegionCanvas();
  }
  function onMouseUp(){
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}
function onBottomRightCropClick(event){
  const topLeftCropRect = topLeftCropEl.getBoundingClientRect();
  const bottomRightCropRect = bottomRightCropEl.getBoundingClientRect();
  const previewContainerRect = previewContainer.getBoundingClientRect();
  const clickPosX = event.clientX;
  const clickPosY = event.clientY;
  function onMouseMove(event){
    //offset of the current mouse position from the click position
    let offsetX = event.clientX-clickPosX;
    let offsetY = event.clientY-clickPosY;
    offsetX = clamp(offsetX, topLeftCropRect.left - bottomRightCropRect.left + 45, previewContainerRect.right - bottomRightCropRect.right);
    offsetX = clamp(offsetX, topLeftCropRect.top - bottomRightCropRect.top + 45, previewContainerRect.bottom - bottomRightCropRect.bottom);
    offsetY = clamp(offsetY, topLeftCropRect.top - bottomRightCropRect.top + 45, previewContainerRect.bottom - bottomRightCropRect.bottom);
    offsetY = clamp(offsetY, topLeftCropRect.left - bottomRightCropRect.left + 45, previewContainerRect.right - bottomRightCropRect.right);
    if(Math.abs(event.clientX-topLeftCropRect.left)>Math.abs(event.clientY-topLeftCropRect.top)){
      bottomRightCropEl.style.left = bottomRightCropRect.left - previewContainerRect.left + offsetX + "px"; 
      bottomRightCropEl.style.top = bottomRightCropRect.top - previewContainerRect.top + offsetX + "px"; 
    }else{
      bottomRightCropEl.style.left = bottomRightCropRect.left - previewContainerRect.left + offsetY + "px"; 
      bottomRightCropEl.style.top = bottomRightCropRect.top - previewContainerRect.top + offsetY + "px"; 
    }
    updateDragCropEl();
    refreshCropRegionCanvas();
  }
  function onMouseUp(){
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}
function updateDragCropEl(){
  const topLeftCropRect = topLeftCropEl.getBoundingClientRect();
  const bottomRightCropRect = bottomRightCropEl.getBoundingClientRect();
  const previewContainerRect = previewContainer.getBoundingClientRect();
  dragCropEl.style.left = topLeftCropRect.left - previewContainerRect.left + 15 + "px";
  dragCropEl.style.top = topLeftCropRect.top - previewContainerRect.top + 15 + "px";
  dragCropEl.style.width = bottomRightCropRect.left - topLeftCropRect.left + "px";
  dragCropEl.style.height = bottomRightCropRect.left - topLeftCropRect.left + "px";
}
function onDragCropClick(event){
  const topLeftCropRect = topLeftCropEl.getBoundingClientRect();
  const bottomRightCropRect = bottomRightCropEl.getBoundingClientRect();
  const previewContainerRect = previewContainer.getBoundingClientRect();
  const dragCropRect = dragCropEl.getBoundingClientRect();
  const clickPosX = event.clientX;
  const clickPosY = event.clientY;
  function onMouseMove(event){
    //offset of the current mouse position from the click position
    let offsetX = event.clientX-clickPosX;
    let offsetY = event.clientY-clickPosY;
    offsetX = clamp(offsetX, previewContainerRect.left - topLeftCropRect.left, previewContainerRect.right - bottomRightCropRect.right);
    offsetY = clamp(offsetY, previewContainerRect.top - topLeftCropRect.top, previewContainerRect.bottom - bottomRightCropRect.bottom);
    dragCropEl.style.left = dragCropRect.left - previewContainerRect.left + offsetX +"px";
    dragCropEl.style.top = dragCropRect.top - previewContainerRect.top + offsetY +"px";
    topLeftCropEl.style.left = topLeftCropRect.left - previewContainerRect.left + offsetX + "px"; 
    topLeftCropEl.style.top = topLeftCropRect.top - previewContainerRect.top + offsetY + "px"; 
    bottomRightCropEl.style.left = bottomRightCropRect.left - previewContainerRect.left + offsetX + "px"; 
    bottomRightCropEl.style.top = bottomRightCropRect.top - previewContainerRect.top + offsetY + "px"; 
    refreshCropRegionCanvas();
  }
  function onMouseUp(){
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

//Returns true if the inputs are valid
function checkInputValidity(){
  if(!Number.isInteger(Number(pinsInput.value)) || !Number.isInteger(Number(stringsInput.value))){
    return false;
  }
  return true;
}

function onGenerateClick(){
  if(!checkInputValidity()){
    alert("Please input whole numbers for the number of pins and strings. No decimals silly.");
    return;
  }
  if(imgInput.value === ""){
    alert("You forgot to choose a file silly billy.");
    return;
  }

  setPins();
  currentPinIndex = Math.floor(Math.random()*pins);
  lastPinIndex = -1;
  getImage();
}

function setPins(){
  pins = parseInt(pinsInput.value);
  pinPos = [];
  for(let i=0;i<pins;i++){
    const xPos = Math.floor(imgCanvasEl.width/2 * (1+0.9*Math.cos(Math.PI*2*i/pins)));
    const yPos = Math.floor(imgCanvasEl.height/2 * (1+0.9*Math.sin(Math.PI*2*i/pins)));
    pinPos.push({x:xPos, y:yPos});
  }
  pinPosUv = pinPos.map((pos)=>({x:pos.x/imgCanvasEl.width, y:1-pos.y/imgCanvasEl.height}));

  pinsCtx.fillStyle = "red";
  const radius = 1;
  for(const pos of pinPos){
    pinsCtx.beginPath();
    pinsCtx.arc(pos.x, pos.y, radius, 0, Math.PI*2);
    pinsCtx.fill();
  }
}

function onAddClick(){
  if(!checkInputValidity()){
    alert("You can't have a fraction of a string.");
    return;
  }

  resetLoadBar();
  loadBarContainer.style.display = "block";
  additionalSettingsContainer.style.display = "none";
  menuEl.style.display = "none";
  addNewStringUpdated(currentPinIndex, lastPinIndex, parseInt(additionalStringsInput.value));
}

function updateLoadBar(total, num){
  loadBarFill.style.width = Math.floor(num/total*100)+"%";
  loadBarPercentage.innerText = Math.floor(num/total*100)+"%";
}

function resetLoadBar(){
  loadBarFill.style.width = "0%";
  loadBarPercentage.innerText = "0%";
}

function restart(){
  menuEl.style.display = "none";
  additionalSettingsContainer.style.display = "none";
  canvasContainer.style.display = "none";
  initialSettingsContainer.style.display = "grid";
  detailsBtn.style.display = "block";
  detailsContainer.style.display = "block";
  gl.clear(gl.COLOR_BUFFER_BIT);
  ctx.clearRect(0, 0, imgCanvasEl.width, imgCanvasEl.height);
  refCtx.clearRect(0, 0, refCanvasEl.width, refCanvasEl.height);
  pinsCtx.clearRect(0, 0, pinsCanvasEl.width, pinsCanvasEl.height);
}

function downloadArt(){
  gl.readPixels(0,0,canvasEl.width,canvasEl.height,gl.RGBA,gl.UNSIGNED_BYTE,artPixel);
  const imageData = new ImageData(new Uint8ClampedArray(artPixel), exportCanvasEl.width, exportCanvasEl.height);
  for(let i=0; i<imageData.width*imageData.height*4; i=i+4){
    imageData.data[i] = 255-imageData.data[i+3];
    imageData.data[i+1] = 255-imageData.data[i+3];
    imageData.data[i+2] = 255-imageData.data[i+3];
    imageData.data[i+3] = 255;
  }
  const rightSideUp = new ImageData(exportCanvasEl.width, exportCanvasEl.height);
  for(let i=0; i<exportCanvasEl.width*exportCanvasEl.height*4; i++){
    rightSideUp.data[i] = imageData.data[i%(exportCanvasEl.width*4)+exportCanvasEl.width*4*(exportCanvasEl.height-Math.floor(i/(exportCanvasEl.width*4)))];
  }
  exportCtx.putImageData(rightSideUp, 0, 0);
  const image = exportCanvasEl.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = image;
  link.download = "String_art.png";
  link.click();
}

//#region Line Making part
//input is in px
function lineScore(start, end){
  const curPos = Object.assign({}, start);
  const dy = end.y-start.y;
  const dirY = dy > 0 ? 1 : -1;
  const dx = end.x-start.x;
  const dirX = dx > 0 ? 1 : -1;
  let score = artBrightness[curPos.x + (refCanvasEl.height-1-curPos.y)*refCanvasEl.width] - imgBrightness[curPos.x + curPos.y*refCanvasEl.width];
  let count = 1;
  if(Math.abs(dy/dx) < 1){
    let d = dirY*2*dy + dirX*-dx;
    while(curPos.x !== end.x || curPos.y !== end.y){
      curPos.x += dirX;
      if(d>0){
        curPos.y += dirY;
        d = d + dirX*-2*dx;
      }
      d = d + dirY*2*dy;
      score += artBrightness[curPos.x + (refCanvasEl.height-1-curPos.y)*refCanvasEl.width] - imgBrightness[curPos.x + curPos.y*refCanvasEl.width];
      count++;
    }
  }
  else{
    let d = dirX*2*dx + dirY*-dy;
    while(curPos.x !== end.x || curPos.y !== end.y){
      curPos.y += dirY;
      if(d>0){
        curPos.x += dirX;
        d = d + dirY*-2*dy;
      }
      d = d + dirX*2*dx;
      score += artBrightness[curPos.x + (refCanvasEl.height-1-curPos.y)*refCanvasEl.width] - imgBrightness[curPos.x + curPos.y*refCanvasEl.width];
      count++;
    }
  }
  return score/count;
}

//Draws new line
function addNewStringUpdated(startIndex, indexBefore = -1, amount, num = 1){
  gl.readPixels(0,0,canvasEl.width,canvasEl.height,gl.RGBA,gl.UNSIGNED_BYTE,artPixel);
  artBrightness = [];
  for(let i=0; i<refCanvasEl.width*refCanvasEl.height*4; i=i+4){
    artBrightness.push(1 - artPixel[i+3]/255);
  }

  const bestLine = {
    index: -1,
    score: -99,
  }
  for(let i=0;i<pinPos.length;i++){
    if(i === startIndex || i === indexBefore){
      continue;
    }
    let score = lineScore(pinPos[startIndex], pinPos[i]);
    if(score > bestLine.score){
      bestLine.score = score;
      bestLine.index = i;
    }
  }
  drawLine(pinPosUv[startIndex], pinPosUv[bestLine.index],parseFloat(stringThicknessInput.value),parseFloat(stringOpacityInput.value));
  currentPinIndex = bestLine.index;
  lastPinIndex = startIndex;
  if(num < amount){
    requestAnimationFrame(()=>{
      updateLoadBar(amount, num);
      addNewStringUpdated(currentPinIndex, lastPinIndex, amount, num+1);
    });
  }
  else{
    loadBarContainer.style.display = "none";
    additionalSettingsContainer.style.display = "grid";
    menuEl.style.display = "flex";
  }
}
//#endregion
//#endregion

const artPixel = new Uint8Array(4*refCanvasEl.width*refCanvasEl.height);
let imgBrightness = [];
let artBrightness = [];
let pinPos = [];
let pinPosUv = [];
let pins;
let currentPinIndex;
let lastPinIndex;
let sideLength;
let srcPosX;
let srcPosY;
const img = new Image();
detailsBtn.addEventListener("click", detailsToggle);
generateBtn.addEventListener("click", onGenerateClick);
addBtn.addEventListener("click", onAddClick);
referenceOpacityInput.addEventListener("input", redrawImage);
restartBtn.addEventListener("click", restart);
downloadBtn.addEventListener("click", downloadArt);
imgInput.addEventListener("change", ()=>{
  updateFileName();
  showPreviewImage();
});
topLeftCropEl.addEventListener("mousedown", onTopLeftCropClick);
bottomRightCropEl.addEventListener("mousedown", onBottomRightCropClick);
dragCropEl.addEventListener("mousedown", onDragCropClick);