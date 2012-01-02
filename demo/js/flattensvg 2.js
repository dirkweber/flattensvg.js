/*
 * 	svgFix 0.1
 *	written by Dirk Weber	
 *	http://www.eleqtriq.com
 *	Copyright (c) 2011 Dirk Weber (http://www.eleqtriq.com)
 *	licensed under the MIT (http://www.eleqtriq.com/wp-content/uploads/2010/11/mit-license.txt)
 
 Fixes a problem with xLink in SVGs in stylesheets in Webkit:
 Paths to images and stylesheets do not work
 
 SVGfix parses all SVGs and fixes them by replacing images with base64 encoded versions and putting CSS declarations inline. 
 */
 
(function(viewSVGMode){
	var stylesheets = document.styleSheets,
		showSVG 	= viewSVGMode===true ? true : false,
		svgCache = {}, 		// If we already processed an svg, let's store it here in case we need it again
		cssCache = {}, 		// ..same for stylesheets.
		imgCache = {}, 		// ..same for images.
		svgReadyEvs	= {}, 	// Here we will store our listeners for xhr ready events when loading external css...
		imgReadyEvs = {}; 	// ...and when loading external images
	
	// Parse each stylesheet. If showSVG is "true", create textfields and paste code inline for C/P:
	if(!showSVG){
		if(/webkit/gi.test(navigator.userAgent.toLowerCase())){
			parseSheets();
		}
	}else{
		var display 	= document.createElement("form"),
			headers 	= [],
			codeFields 	= [];
		
		display.setAttribute("style", "width: 100%; z-index: 10000; padding: 30px; position: absolute; background: rgba(0,0,0,0.5);");
		document.getElementsByTagName("html")[0].appendChild(display);
		parseSheets();
	}
	
	function parseSheets(){
		for(var i = 0, l=stylesheets.length; i<l; i++){
			parseSheet(stylesheets[i]);
		}
	}
	
	function parseSheet(sheet){
		// Lots annoying regexes for all kind of checks
		var cssRule,
			bgRegex 	= /background.*?url\(.*?\.svg.*?\;/,
			urlRegex 	= /url\(.*?\)/,
			attrRegex 	= /\:.*?\;/i,
			propRegex 	= /background.*?\:/,
			svgRegex 	= /url\(.*?\.svg/;
		
		// Go through every rule in stylesheet and check whether it contains references to svg background-images:
		for(var i=0, l=sheet.cssRules.length; i<l; i++){
			cssRule = sheet.cssRules[i].cssText;
			
			if( bgRegex.test(cssRule) ){
				var identifier = /^.*?\{/.exec(cssRule)[0].replace(/\s*?\{/, ""),
					paths = svgRegex.exec(cssRule) || [],
					bgRule = bgRegex.exec(cssRule)[0],
					bgAttrib,
					prop = propRegex.exec(bgRule)[0];
					prop = prop.substring(0, prop.length-1);
				
				// nor SVG found? Have a break!
				if(paths.length < 1){break;};
					
				if(attrRegex.test(bgRule)){
					bgAttrib = attrRegex.exec(bgRule)[0].replace(/.*?\:\s*?/, "").replace(/\s*?;.*?/, "");
				}
				
				// Loop through every path found and process SVG:
				for(var j=0, k=paths.length; j<k; j++){
					// prepare an ID for our "loaded" event and create event:
					var evID = "svgReady_"+i+"_"+j;
					svgReadyEvs[evID] = document.createEvent("Event");
					
					//strip superfluous information from path:
					paths[j] = paths[j].replace(/url\(\s*?/, "");
					
					//if we already came across this svg before, let's fetch it from cache instead:
					if(typeof(svgCache[paths[j]]) === "undefined"){
						// First time here? Good! Set listener and fix it
						document.addEventListener(evID, function(e){createAttrib(prop, paths[j], e.svg, i, evID);}, false);
						fixSVG(paths[j], evID);
					}else{
						createAttrib(prop, paths[j], svgCache[paths[j]], i, evID);
					}
				}
				
				// We finished processing our SVG. Now let's replace references with inline data URI's (utf-8, *NOT* base64)
				function createAttrib(property, path, svg, num, evID){
					if(evID){document.removeEventListener(evID);};
					
					if(svg !== false){
						var elem ={
								data: "data:image/svg+xml; charset=utf-8,"+svg,
								type: "image/svg+xml"
							}

						appendTemporarily("object", elem, callback);
						
						function callback(){
							var attr = bgAttrib.replace(path, '\'data:image/svg+xml; charset=utf-8,'+svg+"'");
							
							setTimeout(function(){
									sheet.cssRules[num].style.setProperty("background-image", attr);
									if(showSVG){
										placeTextfields(path, svg);
									}
								}, 10);
							}
					}
				}
				
				function placeTextfields(path, text){
					var num = codeFields.length;
					headers[num] = document.createElement("h2");
					headers[num].setAttribute("style", "display: block; width:90%; margin: 20px auto 0px; padding: 5px 10px; position: relative; border: 0px; background: black; font: bold 13px/1.2em verdana, sans-serif; color: white;");
					headers[num].innerHTML = path;
					codeFields[num] = document.createElement("textarea");
					codeFields[num].setAttribute("cols", "50");
					codeFields[num].setAttribute("rows", "20");
					codeFields[num].innerHTML = text;
					codeFields[num].setAttribute("style", "display: block; width:90%; margin: 0px auto 20px; padding: 10px; height: 180px; position: relative; border: 0px; background: white; font: 11px/1.2em verdana, sans-serif; color: black;");
					display.appendChild(headers[num]);
					display.appendChild(codeFields[num]);
				}
			}
		}
	}
	
	//Place object in document temporarily. Remove after 1sec
	function appendTemporarily(obj, elem, callback){
			var obj = document.createElement(obj);

			for(var prop in elem){
				obj.setAttribute(prop, elem[prop]);
			}
			
			obj.setAttribute("class", "preloadobj");
			obj.setAttribute("width", "1px");
			obj.setAttribute("height", "1px");
			obj.setAttribute("style", "left: -100px; width: 1px; height: 1px; position: absolute; visibility:hidden;");
			document.getElementsByTagName("html")[0].appendChild(obj);
			if(callback){callback();};
			setTimeout(function(){document.getElementsByTagName("html")[0].removeChild(obj);}, 1000);
	}
	
	// finally - load svg and fix it:
	
	function fixSVG(svgUrl, evID){
		//You want more regexes, don't you?
		
		var request 	= new XMLHttpRequest(),
			styleRegex 	= /<\?xml\-stylesheet.*?\?>/,
			imgRegex 	= /xlink:href=".*?(\.jpg|\.png|\.gif|\.webp)/,
			svgTxt,
			svgXML,
			styleTxt = "",
			styleNode,
			location,
			matchedStyles = [],
			matchedImg = [],
			styleURL,
			image,
			assetCounter = 0;
		
		request.open("GET", svgUrl, false);
		request.onreadystatechange = processSVG;
		request.send(null);
		
		function processSVG(){
			var svgReq = []; //Store XHR requests for SVG-stylesheets here. We need an array, as some will run in parallel.
			
			if (request.readyState == 4){				
				svgXML 		= request.responseXML;
				svgTxt 		= request.responseText;
				 
				matchedStyles 	= styleRegex.exec(svgTxt) || [];
				matchedImg 		= svgXML.getElementsByTagName("image") || [];
				
				// Nothing found? No need to carry on.
				if(matchedStyles.length<1 && matchedImg.length<1){
					return false;
				}
		
				location = (function(path){
					var index = path.lastIndexOf("/")+1;
					return (path.slice(0, index));
				})(svgUrl);
								
				// read out the text in every stylesheet
				
				if(matchedStyles.length > 0){
					for (var i =0, l=matchedStyles.length; i<l; i++){
						styleURL = matchedStyles[i]
						.replace(/\s*?/gi, "")
						.replace(/^<\?.*?href?.*?\="/gi, "")
						.replace(/".*?\?>$/gi, "");
				
						if(! /http(s*?)\:\/\//gi.test(styleURL)){
							styleURL = location + styleURL;
						}
						
						// only process if not in cache
						if(typeof(cssCache[styleURL]) === "undefined"){
							svgReq[i] = new XMLHttpRequest();
							svgReq[i].open("GET", styleURL, false);
							svgReq[i].onreadystatechange = function(){processStyle(i);};
							svgReq[i].send(null);
						}else{
							insertStyleNode(cssCache[styleURL]);
						}
					}
				}
				
				//process images in every stylesheet
				
				if(matchedImg.length>0){

					for (var j =0, k=matchedImg.length; j<k; j++){
						var src = matchedImg[j].getAttributeNode("xlink:href").nodeValue,
							href = location + src,
							imgEvID = "imgReady_"+evID+"_"+j;
						
						console.log(j + " "+src);
						if(typeof(imgCache[href]) === "undefined"){
							imgReadyEvs[imgEvID] = document.createEvent("Event");
							
							document.addEventListener(imgEvID, function(e){
									imgCache[href] = e.img;
									setImgAtrib(j, href, imgEvID);
							}, false);
							
							if(! /base64/g.test(href)){
								base64(href, imgEvID);
							}else{
								appendTemporarily("image", {src:  src});
								countAssets(imgEvID); 
							}
						}else{
							setImgAtrib(j, href, imgEvID)
						}
					}
					
					//replace xlink path with data URI:
					function setImgAtrib(n, href, id){
						console.log(n+" "+href+" "+id+"\n"+matchedImg[0].getAttributeNode("xlink:href").nodeValue+"\n\n");
						matchedImg[parseFloat(n)].getAttributeNode("xlink:href").nodeValue = imgCache[href];
						countAssets(id); 
					}
				}
				
				function processStyle(n){
					if (svgReq[n].readyState==4){
						insertStyleNode(svgReq[n].responseText);
					}
				}
				
				// create new "<style>" node in svg and fill it with text from stylesheet
				function insertStyleNode(txt){
					var currentStyleNode, cdata;
					
					cssCache[styleURL] = txt;
					styleTxt+= txt;
					styleNode = svgXML.createElement("style");
					styleNode.setAttribute("type","text/css");
					
					currentStyleNode = svgXML.getElementsByTagName("svg")[0].firstChild;
					cdata = svgXML.createCDATASection(styleTxt);
					
					styleNode.appendChild(cdata);
					svgXML.documentElement.insertBefore(styleNode,currentStyleNode);
					
					countAssets();
				}
			}
		}
		
		// check if all external resources (images and stylesheets) in svg are processed.
		// If so, build new svg and, when done, dispatch event:
		
		function countAssets(ev){
			assetCounter++;
			
			// Be polite, clean up after leaving
			if(ev){ document.removeEventListener(ev); }
			
			//all assets prepared? We're almost through. Do some stuff and carry on
			if(assetCounter === (matchedStyles.length + matchedImg.length)){
				var xmlString = (new XMLSerializer()).serializeToString(svgXML);
				xmlString = xmlString.replace(/.*?<svg/gi, "<svg").replace(/\n/g, "");
 				
 				svgReadyEvs[evID].initEvent(evID, true, true);
				svgReadyEvs[evID].svg = xmlString;
				svgCache[svgUrl] = xmlString;
				document.dispatchEvent(svgReadyEvs[evID]);
				return;
			}
		}
		
		function base64(src, evID){
			var canvas 	= document.createElement("canvas"),
				img 	= new Image(),
				ctx, base64;
				
				
				img.onload = function(){
					canvas.width = img.width;
					canvas.height = img.height;
					ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0);
					base64 = canvas.toDataURL("image/png");
					//console.log("B "+base64);
					appendTemporarily("image", {src: base64});
					imgReadyEvs[evID].initEvent(evID, true, true);
					imgReadyEvs[evID].img = base64;
					document.dispatchEvent(imgReadyEvs[evID]);
					}
				img.src = src;
		}
		
		/*
		function base64(src, evID){
			var END_OF_INPUT = -1,
				base64Chars = [
		    	'A','B','C','D','E','F','G','H',
		    	'I','J','K','L','M','N','O','P',
		    	'Q','R','S','T','U','V','W','X',
		    	'Y','Z','a','b','c','d','e','f',
		    	'g','h','i','j','k','l','m','n',
		    	'o','p','q','r','s','t','u','v',
		    	'w','x','y','z','0','1','2','3',
		    	'4','5','6','7','8','9','+','/'],
		    	base64Str,
		    	base64Count,
		    	data, img;
		
			(function loadBinary(url) {
			
				var req = new XMLHttpRequest();
				req.onreadystatechange = processImg;
				req.open('GET', url, false);  
				req.overrideMimeType('text/plain; charset=x-user-defined');
				
				try{
					req.send(null);
					}catch(err){
						img = "";
					}
				
				function processImg(){
					if (req.readyState==4){
						
						data = req.responseText;
						
						if(data.indexOf("<html>")<0){
							encoded	= encodeBase64(data); 
							
							startindex=url.lastIndexOf(".")+1;
							var suffix=url.substring(startindex);
												
							if(data.length>0){
								img = "data:image/"+suffix+";base64,"+encoded;
								appendTemporarily("image", {src: img});
							}else{
								img = "";
							}
						}else{
							img = "";
						}
						
						imgReadyEvs[evID].initEvent(evID, true, true);
						imgReadyEvs[evID].img = img;
						document.dispatchEvent(imgReadyEvs[evID]);
					}
				}	
			})(src);
				
//_________________Base64 encode by Stephen Ostermiller http://ostermiller.org/____________
		
			
			function readBase64(){    
		    	if (!base64Str){return END_OF_INPUT};
		    	if (base64Count >= base64Str.length){return END_OF_INPUT};
		    	var c = base64Str.charCodeAt(base64Count) & 0xff;
		    	base64Count++;
		    	return c;
			}
			
			function encodeBase64(str){
		    	base64Str = str;
		    	base64Count = 0;
		    	
		    	var result = '',
		    		inBuffer = new Array(3),
		    		lineCount = 0,
		    		done = false;
		    		
		    	while (!done && (inBuffer[0] = readBase64()) != END_OF_INPUT){
		        	inBuffer[1] = readBase64();
		        	inBuffer[2] = readBase64();
		        	result += (base64Chars[ inBuffer[0] >> 2 ]);
		        	if (inBuffer[1] != END_OF_INPUT){
		            	result += (base64Chars [(( inBuffer[0] << 4 ) & 0x30) | (inBuffer[1] >> 4) ]);
		            	if (inBuffer[2] != END_OF_INPUT){
		                	result += (base64Chars [((inBuffer[1] << 2) & 0x3c) | (inBuffer[2] >> 6) ]);
		                	result += (base64Chars [inBuffer[2] & 0x3F]);
		            	} else {
		                	result += (base64Chars [((inBuffer[1] << 2) & 0x3c)]);
		                	result += ('=');
		                	done = true;
		            	}
		        	} else {
		            	result += (base64Chars [(( inBuffer[0] << 4 ) & 0x30)]);
		            	result += ('=');
		            	result += ('=');
		            	done = true;
		        	}
		    	}
		    	return result;
			}
		}*/
	}
	
})();

