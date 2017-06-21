var gl = null;

var points = [];
var selectedPointIdx = -1;
var mouseDown = false;

var pointShaderProgram = null;
var pointCoordLocation = null;
var pointVertexBuffer = null;

var pointResolutionUniformLocation = null;

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
	
	if (event.shiftKey)
	{
		points.push({x: cursorX, y: cursorY});
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
			points[selectedPointIdx].x = cursorX;
			points[selectedPointIdx].y = cursorY;
		}
	}
	else
	{
		selectedPointIdx = -1;
		points.forEach(function(point, idx) {
			var dx = cursorX - point.x;
			var dy = cursorY - point.y;
			var distSq = dx * dx + dy * dy;
			if (distSq < 16) // \todo: плохо, неименованная константа
			{
				selectedPointIdx = idx;
			}
		});
	}
};

function renderFrame()
{
	gl.enable(gl.DEPTH_TEST);
	
	gl.clearColor(0.5, 0.5, 0.5, 0.9);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	drawPoints();
	
	setTimeout(renderFrame, 20); // \todo: плохо, неименованная константа
}

function drawPoints()
{
	gl.useProgram(pointShaderProgram);
	
	gl.uniform2f(pointResolutionUniformLocation, gl.canvas.width, gl.canvas.height);
	
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
	
	renderFrame();
}

function createPointShaderProgram()
{
	var vertCode =
		'attribute vec3 a_position;' +
		
		'uniform vec2 u_resolution;' +
			
		'void main(void) {' +
			'vec2 clipSpace = (vec2(a_position) / u_resolution) * 2.0 - 1.0;' + 
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