var gl = null;

var points = [];
var selectedPointIdx = -1;
var mouseDown = false;
var mouseDownCursorPosition = {x: 0, y: 0};
var mouseDownOffset = {x: 0, y: 0};

var offset = {x: 0, y: 0};
var scales = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
var scaleIdx = 5;

var pointShaderProgram = null;
var pointCoordLocation = null;
var pointVertexBuffer = null;

var pointResolutionUniformLocation = null;
var pointOffsetUniformLocation = null;
var pointScaleUniformLocation = null;

// Функция для добавления обработчика событий
function addHandler(object, event, handler) {
	if (object.addEventListener) {
	  object.addEventListener(event, handler, false);
	}
	else if (object.attachEvent) {
	  object.attachEvent('on' + event, handler);
	}
	else alert("Обработчик колёсика мыши не поддерживается");
}
// Добавляем обработчики для разных браузеров
addHandler(window, 'DOMMouseScroll', processMouseWheel);
addHandler(window, 'mousewheel', processMouseWheel);
addHandler(document, 'mousewheel', processMouseWheel);


function worldToViewCoordinates( worldCoordinates )
{
	let scale = scales[scaleIdx];
	return {x: worldCoordinates.x * scale - offset.x, y: worldCoordinates.y * scale - offset.y};
};

function viewToWorldCoordinates( viewCoordinates )
{
	let scale = scales[scaleIdx];
	return {x: (viewCoordinates.x + offset.x) / scale, y: (viewCoordinates.y + offset.y) / scale};
};

function processMouseDown( event ) 
{
	if (event.which != 1)
	{
		return;
	}

	var canvas = document.getElementById("canvas-element-id");
	var canvasRect = canvas.getBoundingClientRect();

	var cursorX = event.clientX - canvasRect.left;
	var cursorY = event.clientY - canvasRect.top;
	
	mouseDownCursorPosition.x = cursorX;
	mouseDownCursorPosition.y = cursorY;
	mouseDownOffset.x = offset.x;
	mouseDownOffset.y = offset.y;
	
	if (event.shiftKey)
	{
		points.push( viewToWorldCoordinates({x: cursorX, y: cursorY}) );
		selectedPointIdx = points.length - 1;
	}
	
	mouseDown = true;
};

function processMouseUp( event ) 
{
	if (event.which != 1)
	{
		return;
	}
	
	var canvas = document.getElementById("canvas-element-id");
	var canvasRect = canvas.getBoundingClientRect();

	var cursorX = event.clientX - canvasRect.left;
	var cursorY = event.clientY - canvasRect.top;
	
	if (event.altKey && selectedPointIdx != -1)
	{
		points.splice(selectedPointIdx, 1);
		selectedPointIdx = -1;
	}
	
	mouseDown = false;
};

function processMouseMove( event ) 
{
	var canvas = document.getElementById("canvas-element-id");
	var canvasRect = canvas.getBoundingClientRect();

	var cursorX = event.clientX - canvasRect.left;
	var cursorY = event.clientY - canvasRect.top;
	
	if (mouseDown)
	{
		if (selectedPointIdx != -1)
		{
			points[selectedPointIdx] = viewToWorldCoordinates( {x: cursorX, y: cursorY} );
		}
		else
		{
			offset.x = mouseDownOffset.x - (cursorX - mouseDownCursorPosition.x);
			offset.y = mouseDownOffset.y - (cursorY - mouseDownCursorPosition.y);
		}
	}
	else
	{
		selectedPointIdx = -1;
		points.forEach(function(point, idx) {
			var pointPx = worldToViewCoordinates(point);
			var dx = cursorX - pointPx.x;
			var dy = cursorY - pointPx.y;
			var distSq = dx * dx + dy * dy;
			if (distSq < 16) // \todo: плохо, неименованная константа
			{
				selectedPointIdx = idx;
			}
		});
	}
};

function processMouseWheel( event )
{
	var delta;
    event = event || window.event;
    // Opera и IE работают со свойством wheelDelta
    if (event.wheelDelta)
	{
		delta = event.wheelDelta / 120;
		if (window.opera) 
		{
			delta = -delta;
		}
    }
    else if (event.detail) { // Для Gecko
      delta = -event.detail / 3;
    }
    // Запрещаем обработку события браузером по умолчанию
    if (event.preventDefault) event.preventDefault();
    event.returnValue = false;
	
	var canvas = document.getElementById("canvas-element-id");
	var canvasRect = canvas.getBoundingClientRect();

	var cursorX = event.clientX - canvasRect.left;
	var cursorY = event.clientY - canvasRect.top;

	cursorWorld = viewToWorldCoordinates({x: cursorX, y: cursorY});

	scaleIdx = (delta > 0) ? (scaleIdx + 1) : (scaleIdx - 1);
	scaleIdx = Math.max(0, Math.min(scaleIdx, scales.length - 1));
	
	newCursorPx = worldToViewCoordinates( cursorWorld );
	
	offset.x = offset.x - cursorX + newCursorPx.x;
	offset.y = offset.y - cursorY + newCursorPx.y;
};

function renderFrame()
{
	gl.enable(gl.DEPTH_TEST);
	
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	drawPoints();
	
	setTimeout(renderFrame, 20); // \todo: плохо, неименованная константа
}

function drawPoints()
{
	gl.useProgram(pointShaderProgram);
	
	gl.uniform2f(pointResolutionUniformLocation, gl.canvas.width, gl.canvas.height);
	gl.uniform2f(pointOffsetUniformLocation, offset.x, offset.y);
	gl.uniform1f(pointScaleUniformLocation, scales[scaleIdx]);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexBuffer);
	var vertices = []
	points.forEach(function(point, idx) {
		vertices.push(point.x);
		vertices.push(point.y);
		vertices.push( idx == selectedPointIdx ? 10 : 4 );
	});
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
	gl.vertexAttribPointer(pointCoordLocation, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(pointCoordLocation);

	gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
}

function getGLContext()
{
	var canvas = document.getElementById("canvas-element-id");
	if (canvas == null)
	{
		alert("there is no canvas on this page");
		return;
	}
	var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
	var ctx = null;
	for (var i = 0; i < names.length; ++i) 
	{
		try 
		{
			ctx = canvas.getContext(names[i]);
		} 
		catch(e) {}
		if (ctx) 
			break;
	}
	if (ctx == null)
	{
		alert("WebGL is not available");
	}
	else
	{
		return ctx;
	}
}

function init()
{
	gl = getGLContext();
	
	pointShaderProgram = createPointShaderProgram();
	
	pointVertexBuffer = gl.createBuffer();

	pointCoordLocation = gl.getAttribLocation(pointShaderProgram, "a_position");
	pointResolutionUniformLocation = gl.getUniformLocation(pointShaderProgram, "u_resolution");
	pointOffsetUniformLocation = gl.getUniformLocation(pointShaderProgram, "u_offset");
	pointScaleUniformLocation = gl.getUniformLocation(pointShaderProgram, "u_scale");
	
	renderFrame();
}

function createPointShaderProgram()
{
	var vertCode =
		'attribute vec3 a_position;' +
		
		'uniform vec2 u_resolution;' +
		'uniform vec2 u_offset;' +
		'uniform float u_scale;' +
			
		'void main(void) {' +
			'vec2 clipSpace = ((vec2(a_position * u_scale) - u_offset) / u_resolution) * 2.0 - 1.0;' + 
			'gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);' +
			'gl_PointSize = a_position.z;'+
		'}';
	 var vertShader = gl.createShader(gl.VERTEX_SHADER);
	 gl.shaderSource(vertShader, vertCode);
	 gl.compileShader(vertShader);

	 var fragCode =
		'void main(void) {' +
			' gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);' +
		'}';
	 var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	 gl.shaderSource(fragShader, fragCode);
	 gl.compileShader(fragShader);


	 var shaderProgram = gl.createProgram();
	 gl.attachShader(shaderProgram, vertShader); 
	 gl.attachShader(shaderProgram, fragShader);
	 gl.linkProgram(shaderProgram);
	 
	 return shaderProgram;
}