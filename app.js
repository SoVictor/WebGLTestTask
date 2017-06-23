'use strict';

var gl = null;


var offset = {x: 0, y: 0};
var scales = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
var scaleIdx = 5;


var mouseDown = false;
var mouseDownCursorPosition = {x: 0, y: 0};
var mouseDownOffset = {x: 0, y: 0};


var points = [];
var selectedPointIdx = -1;


var pointShaderProgram = null;
var pointCoordLocation = null;
var pointVertexBuffer = null;

var pointResolutionUniformLocation = null;
var pointMatrixUniformLocation = null;


var texture = null;

var imageShaderProgram = null;
var imageCoordLocation = null;
var imageVertexBuffer = null;
var imageTexCoordLocation = null;
var imageTexCoordBuffer = null;

var imageResolutionUniformLocation = null;
var imageMatrixUniformLocation = null;


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


function init()
{
	gl = getGLContext();
	
	pointShaderProgram = createPointShaderProgram();
	
	pointVertexBuffer = gl.createBuffer();

	pointCoordLocation = gl.getAttribLocation(pointShaderProgram, "a_position");
	pointResolutionUniformLocation = gl.getUniformLocation(pointShaderProgram, "u_resolution");
	pointMatrixUniformLocation = gl.getUniformLocation(pointShaderProgram, "u_matrix");
	

	imageShaderProgram = createImageShaderProgram();
	
	imageVertexBuffer = gl.createBuffer();
	imageTexCoordBuffer = gl.createBuffer();

	imageCoordLocation = gl.getAttribLocation(imageShaderProgram, "a_position");
	imageTexCoordLocation = gl.getAttribLocation(imageShaderProgram, "a_texCoord");
	imageResolutionUniformLocation = gl.getUniformLocation(imageShaderProgram, "u_resolution");
	imageMatrixUniformLocation = gl.getUniformLocation(imageShaderProgram, "u_matrix");
	
	
	var image = new Image();
	image.onload = function() {
		gl.bindBuffer(gl.ARRAY_BUFFER, imageVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 
			0, 0,
			image.width, 0,
			0, image.height,
			0, image.height,
			image.width, 0,
			image.width, image.height]), gl.STATIC_DRAW);
			
		gl.bindBuffer(gl.ARRAY_BUFFER, imageTexCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0,  0.0,
			1.0,  0.0,
			0.0,  1.0,
			0.0,  1.0,
			1.0,  0.0,
			1.0,  1.0]), gl.STATIC_DRAW);
			
		texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	
		renderFrame();
	}
	image.src = "Image.png";
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


function createPointShaderProgram()
{
	var vertCode =
		'attribute vec3 a_position;' +
		
		'uniform vec2 u_resolution;' +
		'uniform mat3 u_matrix;' +
			
		'void main(void) {' +
			'vec2 clipSpace = ((u_matrix * vec3(a_position.xy, 1)).xy / u_resolution) * 2.0 - 1.0;' + 
			'gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);' +
			'gl_PointSize = a_position.z;'+
		'}';
	 var vertShader = gl.createShader(gl.VERTEX_SHADER);
	 gl.shaderSource(vertShader, vertCode);
	 gl.compileShader(vertShader);

	 var fragCode =
		'void main(void) {' +
			' gl_FragColor = vec4(0.0, 0.5, 0.0, 1.0);' +
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


function createImageShaderProgram()
{
	var vertCode =
		'attribute vec2 a_position;' +
		'attribute vec2 a_texCoord;' +
		
		'uniform vec2 u_resolution;' +
		'uniform mat3 u_matrix;' +
		
		'varying vec2 v_texCoord;' +
			
		'void main(void) {' +
			'vec2 clipSpace = ((u_matrix * vec3(a_position, 1)).xy / u_resolution) * 2.0 - 1.0;' + 
			'gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);' +
			'v_texCoord = a_texCoord;' +
		'}';
	 var vertShader = gl.createShader(gl.VERTEX_SHADER);
	 gl.shaderSource(vertShader, vertCode);
	 gl.compileShader(vertShader);

	 var fragCode =
		'precision mediump float;' +
 
		'uniform sampler2D u_image;' +
		 
		'varying vec2 v_texCoord;' +
		 
		'void main() {' +
		   'gl_FragColor = texture2D(u_image, v_texCoord);' +
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


function renderFrame()
{
	gl.enable(gl.DEPTH_TEST);
	
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	drawPoints();
	drawImage();
	
	setTimeout(renderFrame, 20); // \todo: плохо, неименованная константа
}


function drawPoints()
{
	gl.useProgram(pointShaderProgram);
	
	gl.uniform2f(pointResolutionUniformLocation, gl.canvas.width, gl.canvas.height);
	gl.uniformMatrix3fv(pointMatrixUniformLocation, false, [
        scales[scaleIdx], 0 , 0,
        0, scales[scaleIdx], 0,
        -offset.x, -offset.y, 1,
    ]);
	
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


function drawImage()
{
	gl.useProgram(imageShaderProgram);
	
	gl.uniform2f(imageResolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix3fv(imageMatrixUniformLocation, false, [
        scales[scaleIdx], 0 , 0,
        0, scales[scaleIdx], 0,
        -offset.x, -offset.y, 1,
    ]);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, imageVertexBuffer);
	gl.vertexAttribPointer(imageCoordLocation, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(imageCoordLocation);


	gl.bindBuffer(gl.ARRAY_BUFFER, imageTexCoordBuffer);
	gl.vertexAttribPointer(imageTexCoordLocation, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(imageTexCoordLocation);
	
	
	gl.bindTexture(gl.TEXTURE_2D, texture);
 
	// Set the parameters so we can render any size image.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}


function processMouseDown( event ) 
{
	if (event.which == 1)
	{
		let cursorPosition = getCursorPosition( event );
		
		mouseDownCursorPosition.x = cursorPosition.x;
		mouseDownCursorPosition.y = cursorPosition.y;
		mouseDownOffset.x = offset.x;
		mouseDownOffset.y = offset.y;
		
		mouseDown = true;
	}
	else if (event.which == 3)
	{
		let cursorPosition = getCursorPosition( event );
		
		if (selectedPointIdx == -1)
		{
			points.push( viewToWorldCoordinates(cursorPosition) );
			selectedPointIdx = points.length - 1;
		}
		else
		{
			points.splice(selectedPointIdx, 1);
			selectedPointIdx = -1;
		}
		
		updateSelectedPointInfo();
	}
};


function processMouseUp( event ) 
{
	if (event.which == 1)
	{
		mouseDown = false;
	}
};


function processMouseMove( event ) 
{
	var cursorPosition = getCursorPosition( event );
	
	if (mouseDown)
	{
		if (selectedPointIdx != -1)
		{
			points[selectedPointIdx] = viewToWorldCoordinates( cursorPosition );
		}
		else
		{
			offset.x = mouseDownOffset.x - (cursorPosition.x - mouseDownCursorPosition.x);
			offset.y = mouseDownOffset.y - (cursorPosition.y - mouseDownCursorPosition.y);
		}
	}
	else
	{
		selectedPointIdx = -1;
		points.forEach(function(point, idx) {
			var pointPx = worldToViewCoordinates(point);
			var dx = cursorPosition.x - pointPx.x;
			var dy = cursorPosition.y - pointPx.y;
			var distSq = dx * dx + dy * dy;
			if (distSq < 16) // \todo: плохо, неименованная константа
			{
				selectedPointIdx = idx;
			}
		});
		
		updateSelectedPointInfo();
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
    if (event.preventDefault) 
		event.preventDefault();
    event.returnValue = false;
	
	var cursorPosition = getCursorPosition( event );
	var cursorWorld = viewToWorldCoordinates(cursorPosition);

	scaleIdx = (delta > 0) ? (scaleIdx + 1) : (scaleIdx - 1);
	scaleIdx = Math.max(0, Math.min(scaleIdx, scales.length - 1));
	
	var newCursorPx = worldToViewCoordinates( cursorWorld );
	
	offset.x = offset.x - cursorPosition.x + newCursorPx.x;
	offset.y = offset.y - cursorPosition.y + newCursorPx.y;
};


function processContextMenu( event ) 
{
	// не вызывать контекстное меню
	if (event.preventDefault) 
		event.preventDefault();
    event.returnValue = false;
};


function getCursorPosition( mouseEvent )
{
	var canvas = document.getElementById("canvas-element-id");
	var canvasRect = canvas.getBoundingClientRect();

	return { x: (mouseEvent.clientX - canvasRect.left), y: (mouseEvent.clientY - canvasRect.top) };
};


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


function updateSelectedPointInfo()
{
	var info = document.getElementById("selected-point-info");
	if (info != null)
	{
		if (selectedPointIdx == -1)
			info.innerHTML  = 'No selected point.';
		else
			info.innerHTML  = 'Point ' + (selectedPointIdx + 1) + ' selected.';
	}
}


function onSave()
{
	alert(JSON.stringify(points));
}
