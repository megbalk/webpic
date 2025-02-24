// JavaScript Document

/* build structural objects */
$('nav > span').click(function(){
	var index = $('nav > span').index(this) + 1;
	var nav = this;
	$(nav).siblings().removeClass('active');
	$('.panel').not('#panel' + index).slideUp('slow');
	($(nav).hasClass('active')) ? (
		$('#panel' + index).slideUp('slow','swing',function(){
			$(nav).removeClass('active');
		})
	) : (
		$(nav).addClass('active'),
		$('#panel' + index).slideDown('slow')
	);
});

function openDiagram(){
	$('#cover').fadeIn();
	$('#expanded').css({'background-image':'url(' + this.id + '.png)','background-size':'100%','background-color':'white','background-repeat':'no-repeat','background-position':'center'}).show();
};

function closeDiagram(){
	$('#cover').fadeOut();
	$('#expanded').hide();
};

/* generate google sign in button */
var userID = userName = "NA";

function moveOn(){
	if(userName !== 'NA'){
		$('#signedIn').css('visibility','visible');
		$('#signOut').html(userName);
	}
	$('#summary').hide();
	$('#cover').fadeOut();
}

function renderButton() {
	gapi.signin2.render('my-signin2', {
		'width': 200,
		'longtitle': true,
		'theme': 'dark',
		'onsuccess': onSuccess
	});
};

function onSuccess(googleUser) {
  var profile = googleUser.getBasicProfile();
  userID = profile.getEmail();
  userName = profile.getName();
  userId = profile.getId(); // Do not send to your backend! Use an ID token instead.
  userImg = profile.getImageUrl();
  moveOn();
}

function signOut() {
	if(enterer == 'google'){
		var auth2 = gapi.auth2.getAuthInstance();
		auth2.signOut().then(function () {
		  console.log('User signed out.');
		});
	}
	userID = userName = 'NA';
	$('#signedIn').css('visibility','hidden');
	$('#summary').show();
	$('#cover').fadeIn()
}

/* initiate canvas */
var canvas = this.__canvas = new fabric.Canvas('canvas', {selection: false, hoverCursor:'default'});
fabric.Object.prototype.hasControls = false;
fabric.Object.prototype.hasBorders = false;

var bgimg;
var scale;
var trigger = 0;
var isDown = false;
var isSet = [];
var startx = [];
var starty = [];
var endx = [];
var endy = [];
var refx;
var refy;
var distances = [];
var pointSet = [];
var textSet = [];
var x3;
var y3;
var staticx = [];
var staticy = [];
var activeColor = '#ff8100';
var inactiveColor = '#ffcc98';
var textColor = '#FFFFFF';
var pointer;
var isMag = false;
var mag;
var magSpotNew;
var magSpotOld;

// runs everytime the background is loaded
function loadBackground(){
/*	rimg = Math.floor((Math.random() * bg.length));
	bgimg = bg[0]; // bg[rimg] for random image (only use if not calling and modifying remaining.txt, if modifying remaining.txt, randomize the array of images before writing remaining.txt*/
	var center = canvas.getCenter();
	var request = $.ajax({
		url: "background.php",
		type: "GET",
		dataType: "html"
	});
	request.done(function(a){
		bgimg = a;
		fabric.Image.fromURL('images/' + bgimg,function(img){ // this is where it loads an IMAGE
			scale = Math.min((canvas.height - 10) / img.getHeight(), (canvas.width - 10) / img.getWidth());
			img.set({
				scaleX:scale,
				scaleY:scale,
				top: center.top,
				left: center.left,
				originX: 'center',
				originY: 'center'});
			canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
		});
	});
}

window.onload = function(){
	loadBackground();
	
	$("body").on("keydown", function (e) {
    	if(e.keyCode == 13 && isSet[trigger]){
			nextstep();
		}else if(e.keyCode > 48 && e.keyCode < 58){
			if(!isMag){
				mag = e.keyCode - 48;
				mag = (mag == 1) ? 10 : mag;
				
				addMag();
				
				isMag = true;
			}
		}
	});
	$("body").on("keyup", function (e) {
		if(isMag){
			canvas.remove(magSpotNew);
			isMag = false;
		}
		
	});
	
	var zoomText = new fabric.Text("Hold 1-9 to zoom in.", { 
					fill: 'red',
					fontSize: 12,
					left: 485,
					top: 485,
					lockMovementX: true,
					lockMovementY: true
				});
	canvas.add(zoomText);
	
	$.when($.getJSON("map.json", function(json) {
		map = unnest(json,false);
		mapBuild = unnest(json,true)
		//console.log(map); // this will show the info it in firebug console
		})
	).then(
	 	function(){
			document.title = pageName;
			$('h1').append('<a href="/">' + pageName + '</a>');
			switch(enterer){
				case 'google':
					$('#signin').append('<p>Sign in to get started >></p><div id="my-signin2"></div><p id="disclaimer">Signing in is required.  This serves only to assign unique identifiers for each data enterer.  Absolutely no personal information will be stored for any other purpose or distributed.</p>');
					$('body').append('<script src="https://apis.google.com/js/platform.js?onload=renderButton" async defer></script>');
					break;
				case 'textbox':
					$('#signin').append('<p>Sign in to get started >></p><form><input type="text" id="identifier" /><input type="button" value="Submit" id="identifier-button" /></form><p id="disclaimer">Signing in is required.  This serves only to assign unique identifiers for each data enterer.  Absolutely no personal information will be stored for any other purpose or distributed.</p>');					
					$('#identifier').keypress(function(e){
						if(e.which == 13){
							userName = userID = $('#identifier').val();
							moveOn();
						}
					});
					$('#identifier-button').click(function(){
						userName = userID = $('#identifier').val();
						moveOn();
					});
					break;
				default:
					moveOn(); // just skip over the overlay for time's sake
					$('#signin').append("<span class='link' onclick='moveOn();'>Let's get started >></a>");
					$('#signin').click(function(){
						moveOn();
					});
			}
			for(var i=0; i<mapBuild.length; i++){
				$('#steps').append('<div class="step"><div class="stepText"><h3>Step ' + (i+1) + '. ' + mapBuild[i].title + '</h3><div class="stepDesc"><p>' + mapBuild[i].description + '</p></div></div><div class="diagram" id="diagram' + (i+1) + '"></div></div>')
			};
			$('.stepText').each(function(){
				$(this).children('.stepDesc').height($(this).height() - $(this).children('h3').height()+"px");
			});
			$('.diagram').each(function(index){
				//* if missing this.id.png, hide #diagramINDEX aka don't run this
				
				var diagramID = this.id;
				
				$.get(diagramID + '.png')
					.done(function() {
						$("#" + diagramID).css({'background-image':'url(' + diagramID + '.png)'});
						$("#" + diagramID).append('<span class="help">(?)</span>');
						$("#" + diagramID).click(openDiagram);
					}).fail(function() { 
						$("#" + diagramID).remove();
					})
				
			});
			for(var i=0; i<map.length; i++){
				$('#measurements').append('<input type="text" name="' + map[i].name + '" value="" class="ss-q-short" dir="auto" aria-label="' + map[i].label + '" title="">')
			};
			$('#measurements').attr('action',formName);
			
			$('#close,#expanded').click(closeDiagram);
			
			// fill in about tab, contact tab, and project title
			/*NOT WORKING about = about.replace(/\/n/g,'</p></p>')
			contact = contact.replace(/\/n/g,'</p></p>')*/
			$('#panel1').html('<p>' + about + '</p>');
			$('#panel2').html('<p>' + contact + '</p>');
			
			
		}
	)
	
	
}



function prevstep(){
	trigger--;
	next = document.getElementById('next');
	next.disabled = (isSet[trigger]) ? false : true;
	if(trigger < mapBuild.length){
		if(trigger != mapBuild.length-1){
			if(isSet[trigger+1]){
				switch(mapBuild[trigger+1].type){
					case "line":
						pointSet[trigger+1].set('stroke',inactiveColor);
						break;
					case "point":
						pointSet[trigger+1].set('fill',inactiveColor);
						break;
					case "count":
						$.each(pointSet[trigger+1], function(index){
							pointSet[trigger+1][index].set('fill',inactiveColor);
						});
						canvas.remove(pointSet[trigger+1][pointSet[trigger+1].length-1]);
						break;
				}
			}else{
				switch(mapBuild[trigger+1].type){
					case "line":
						canvas.remove(pointSet[trigger+1]);
						break;
					case "point":
						canvas.remove(pointSet[trigger+1]);
						break;
					case "count":
						canvas.remove(pointSet[trigger+1][pointSet[trigger+1].length-1]);
						break;
				}
			}
		}
		if(mapBuild[trigger].parent != ""){
			var parentID;
			$.each(mapBuild, function(index){
				if(this.name === mapBuild[trigger].parent){
					parentID = index;
					return false; // break once a match is found
				}
			});
			if(isSet[parentID] == false){ // if parent is not set, skip
				prevstep();
			}
		}
		if(trigger == 0){
			document.getElementById('prev').disabled = true;
		};
		
		if(isSet[trigger]){
			switch(mapBuild[trigger].type){
				case "line":
					pointSet[trigger].set('stroke',activeColor);
					break;
				case "point":
					pointSet[trigger].set('fill',activeColor);
					break;
				case "count":
					$.each(pointSet[trigger], function(index){
						pointSet[trigger][index].set('fill',activeColor);
					});
					break;
			}
		}
		next.style.fontWeight = 'normal';
		next.innerHTML = 'next >';
		next.onclick = nextstep;
		$('#buttons > p').css('visibility','visible');
	}
	canvas.renderAll();
	$('#steps div:not(.diagram)').animate({left:'+=320'});	
}

function nextstep(){
	trigger++;
	if(trigger < mapBuild.length){
		if(mapBuild[trigger].parent != ""){
			var parentID;
			$.each(mapBuild, function(index){
				if(this.name === mapBuild[trigger].parent){
					parentID = index;
					return false; // break once a match is found
				}
			});
			if(isSet[parentID] == false){ // if parent is not set, skip
				skipstep();
			}
		}
		next = document.getElementById('next');
		next.disabled = (isSet[trigger]) ? false : true;
		
			if(mapBuild[trigger].type === 'count'){
				if(typeof pointSet[trigger] === 'undefined' || pointSet[trigger].length === 0){
					distances[trigger] = 0;
					pointSet[trigger] = [];
					staticx[trigger] = [];
					staticy[trigger] = [];
				}	
			}
			if(isSet[trigger]){
				switch(mapBuild[trigger].type){
					case "line":
						pointSet[trigger].set('stroke',activeColor);
						break;
					case "point":
						pointSet[trigger].set('fill',activeColor);
						break;
					case "count":
						$.each(pointSet[trigger], function(index){
							pointSet[trigger][index].set('fill',activeColor);
						});
						break;
				}
			}
	}
	
	if(trigger > 0 && trigger <= mapBuild.length){
		if(isSet[trigger-1]){
			switch (mapBuild[trigger-1].type){
				case "line":
					pointSet[trigger-1].set('stroke',inactiveColor);
					break;
				case "point":
					pointSet[trigger-1].set('fill',inactiveColor);
					break;
				case "count":
					$.each(pointSet[trigger-1], function(index){
						pointSet[trigger-1][index].set('fill',inactiveColor);
					});
					canvas.remove(pointSet[trigger-1][pointSet[trigger-1].length-1]);
					break;
			}
		}
		document.getElementById('prev').disabled = false;


		if(mapBuild[trigger-1].type === 'point' && !isSet[trigger-1]){
			canvas.remove(pointSet[trigger-1]);
		}
	}
	
	if(trigger >= mapBuild.length){
/*		if(isSet[mapBuild.length-1]){ // redundant code, consolidate
			switch(mapBuild[mapBuild.length-1].type){
				case "line":
					pointSet[mapBuild.length-1].set('stroke',inactiveColor);
					break;
				case "point":
					pointSet[mapBuild.length-1].set('fill',inactiveColor);
					break;
				case "count":
					textSet[trigger-1].set('fill',inactiveColor);
					$.each(pointSet[trigger-1], function(index){
						pointSet[trigger-1][index].set('fill',inactiveColor);
					});
					canvas.remove(pointSet[trigger-1][pointSet[trigger-1].length-1]);
					break;
			}
		}*/
		next.disabled = false;
		next.style.fontWeight = 'bold';
		next.innerHTML = 'SUBMIT?';
		$('#buttons > p').css('visibility','hidden');
		
		// calculate distances for things that ask for distances and fill in requested values
		for(var i=0; i<mapBuild.length; i++){
			// if mapBuild[i].distance === 'true', do nothing - it's already calculated the distance of a line
			// if mapBuild[i].distance === 'true' and type === 'count, do nothing - it's already calculated the count
			if(mapBuild[i].distance === 'false'){
				if(mapBuild[i].type === 'point' && isSet[i]){
					distances[i] = staticx[i] + ',' + (canvas.height-staticy[i]);
				}
			}else if(mapBuild[i].distance !== 'true'){
				var pointB;
				var whereTo = mapBuild[i].distance.split(" ")
				for(var j=0; j<mapBuild.length; j++){
					if(mapBuild[j].name == whereTo[0]){
						pointB = j;
					}
				}
				if(isSet[i] && isSet[pointB]){
					aX = staticx[i];
					aY = staticy[i];
					if(mapBuild[pointB].type === 'line'){
						bX = (whereTo[1] == 'a') ? startx[pointB] : endx[pointB];
						bY = (whereTo[1] == 'a') ? starty[pointB] : endy[pointB];
					}else{
						bX = staticx[pointB];
						bY = staticy[pointB];
					}
					distances[i] = Calculate.lineLength(aX, aY, bX, bY);
				}else{ // if one of the ends is not set, distances[i] = 'undefined'
					distances[i] = 'undefined';
				}
			}
			document.getElementsByName(mapBuild[i].name)[0].value = distances[i];
		}
		
		if(enterer != 'NA'){
			document.getElementsByName(entererName)[0].value = userID;
		}
		var dot = bgimg.lastIndexOf('.');
		if (dot != -1) {
		    bgID = bgimg.substr(0, dot);
		}
		document.getElementsByName(bgName)[0].value = bgID;
		document.getElementsByName(resizeName)[0].value = scale;
		
		next.onclick = submitForm;
	}
	canvas.renderAll();
	$('#steps div:not(.diagram)').animate({left:'-=320'});
}

function skipstep(){
	if(trigger < mapBuild.length){
		switch(mapBuild[trigger].type){
			case "line":
				canvas.remove(pointSet[trigger]);
				removeChildren(trigger);
				if(isSet[trigger]){
					canvas.remove(textSet[trigger][0]);
					canvas.remove(textSet[trigger][1]);
					distances[trigger] = 'undefined';
				}
				break;
			case "point":
				canvas.remove(pointSet[trigger]);
				if(isSet[trigger]){
					canvas.remove(textSet[trigger]);
					distances[trigger] = 'undefined';
				}
				break;
			case "count":
				$.each(pointSet[trigger], function(index){
					canvas.remove(pointSet[trigger][index]);
				});
				if($("#count" + trigger).length != 0){
					$("#count" + trigger).remove()
				}
				distances[trigger] = 0;
				pointSet[trigger] = [];
				break;
		}
		isSet[trigger] = false;
		nextstep();
	}
}

function submitForm(){
	var anySet = 0;
	for(var i=0; i<isSet.length; i++){
		anySet = (isSet[i]==true) ? anySet+1 : anySet;
	}
	if(anySet > 0){
		document.measurements.submit();
	};
	var request = $.ajax({
		url: "done.php",
		type: "GET",
		data: {image:bgimg},
		dataType: "html"
	});
	request.done(function(a){
		startOver();
		return;
	});
}

function startOver(){
	canvas.clear().renderAll();
	loadBackground();
	next.onclick = nextstep;
	next.disabled = prev.disabled = true;
	next.style.fontWeight = 'normal';
	next.innerHTML = 'next >';
	$('#buttons > p').css('visibility','visible');
	$('.count').remove();
	trigger = 0;
	isSet = [];
	document.getElementsByClassName('ss-q-short').value = "";
	startx = [];
	starty = [];
	endx = [];
	endy = [];
	distances = [];	
	pointSet = [];
	$('#steps div:not(.diagram)').animate({left:'0'});
}

function removeChildren(trigger){
	for(var i=0; i<mapBuild.length; i++){
		if(mapBuild[i].parent == mapBuild[trigger].name){
			canvas.remove(pointSet[i]);
			canvas.remove(textSet[i]);
			isSet[i] = false;
		}
	}
}
/* function to arrange counts by line in canvas
function restackCounts(){
	countItems = 0;
	$.each(mapBuild,function(index){
		if(mapBuild[index].type=="count" && isSet[index]){
			countItems++;
			textSet[index].set('top',(20*countItems)+10);
		}
	});
}
*/
/*
function imageExists(url, callback) {
  var img = new Image();
  img.onload = function() { callback(true); };
  img.onerror = function() { callback(false); };
  img.src = url;
}
*/

function addMag(e){
	var center = canvas.getCenter();
	fabric.Image.fromURL('images/' + bgimg,function(img){
		scale = Math.min((canvas.height - 10) / img.getHeight(), (canvas.width - 10) / img.getWidth());
		var offsetX = (pointer.x-center.left)*mag;
		var offsetY = (pointer.y-center.top)*mag;
		img.set({
			scaleX:scale*mag,
			scaleY:scale*mag,
			top: center.top-offsetY+(pointer.y-center.top),
			left: center.left-offsetX+(pointer.x-center.left),
			originX: 'center',
			originY: 'center',
			lockMovementX: true,
			lockMovementY: true,
			clipTo: function (ctx) {
				ctx.save();
				ctx.setTransform(1,0,0,1,0,0);
				ctx.arc(pointer.x,pointer.y, 70, 0, Math.PI * 2);
				ctx.restore();
				}
			});
		magSpotNew = img;
		canvas.add(magSpotNew);
		canvas.remove(magSpotOld); // makes the movement smoother
		canvas.sendToBack(magSpotNew);
		magSpotOld = magSpotNew;
	});
}
