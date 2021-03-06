/*
	Webroids

	Version: 1.0
	Author: David Laurell <david@laurell.nu>
	License: GPLv3

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

window.importScripts = function(filename) { };

window.requestAnimationFrame = (function(){
	  return  window.requestAnimationFrame       || 
	          window.webkitRequestAnimationFrame || 
	          window.mozRequestAnimationFrame    || 
	          window.oRequestAnimationFrame      || 
	          window.msRequestAnimationFrame     || 
	          function(/* function */ callback, /* DOMElement */ element){
	            window.setTimeout(callback, 1000 / 60);
	          };
	})();

var AsteroidsGame = {
	buffer: [],
   init: function() {
      var updateWorker;

      if(!window.Worker) {
         window.postMessage = function(data) {
            updateWorker.onmessage({data: data});
         }

         window.Worker = function(filename) {           
            this.onmessage = function(event) {};
            this.onerror = function(error) {};
            this.postMessage = function(data) {
               updatemessage({data: data});
            }
         };
      }
	   var canvas = document.getElementById("game");
      var bgCanvas = document.getElementById("background");
      
      if(!canvas.getContext) {
         try {
            G_vmlCanvasManager.initElement(canvas);
         } catch(e) {}
         try {
            G_vmlCanvasManager.initElement(bgCanvas);
         } catch(e) {}
      }

	   var ctx = canvas.getContext("2d");
      var ctxBG = bgCanvas.getContext("2d");

      var _game = {
         objects: [],
         points: 0,
         currentFPS: 0,
	   };
		
		var lvl = 1;
		var lives = 3;
		var updateFPS = 0;
      var drawIndex = 0;
		var debug = false;

	   this.buffer = [_game,_game];

	   updateWorker = new Worker("update.js");

		var b = this.buffer;
      updateWorker.onmessage = function(event) {
			switch(event.data.type) {
				case EVENT_TYPE_UPDATE:
				   var index = (drawIndex == 1) ? 0 : 1;
					b[index] = event.data.data;
				   drawIndex = index;
					updateFPS = event.data.data.currentFPS;
					break;
				case EVENT_TYPE_NEWLEVEL:
					lvl = event.data.lvl;
					drawBackground();
					break;
				case EVENT_TYPE_LIFELOST:
					lives = event.data.lives;
					break;
				case EVENT_TYPE_GAMEOVER:
					var highscores = [];
					if(localStorage["highscores"])
						highscores = JSON.parse(localStorage["highscores"]);

					var points = b[drawIndex].points;
					var date = new Date();
					highscores.push({points: points, date: date});

					highscores.sort(function(a, b) {
						if(a.points < b.points)
							return 1;
						else if(a.points > b.points)
							return -1;
						else
							return 0;
					});

					if(highscores.length > 10) {
						highscores = highscores.slice(0,10);
					}

					localStorage["highscores"] = JSON.stringify(highscores);

	            document.getElementById("gameover").style.display = "block";
					var list = document.getElementById("highscore");
					list.innerHTML = "";

					for(var i=0;i<highscores.length;i++) {
						var li = document.createElement("li");
						if(highscores[i].date == date)
							li.innerHTML = highscores[i].points + " <-- Highscore!";
						else
							li.innerHTML = highscores[i].points;

						list.appendChild(li);
					}
					
					break;
			}

      };
      updateWorker.onerror = function(error) {
         throw new Error("Update worker error: " + error.message + " on line " + error.lineno);
      };
      updateWorker.postMessage({type: "init", message: {width: canvas.width, height: canvas.height}});

	   document.onkeydown = function(e) {
         if(!e)
            e=window.event;

         if(e.keyCode == 32 || e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40)
            updateWorker.postMessage({type: "move", message:{key: e.keyCode, down: true}});

			e.preventDefault();
			return false;
	   };
	   document.onkeyup = function(e) {
         if(!e)
            e=window.event;

         if(e.keyCode == 32 || e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40)
            updateWorker.postMessage({type: "move", message: {key: e.keyCode, down: false}});

			//new game
			if(e.keyCode == 13) {
				lives = 3;
				lvl = 1;
				b = [_game, _game];
				document.getElementById("gameover").style.display = "none";
				updateWorker.postMessage({type: "init", message: {width: canvas.width, height: canvas.height}});
			}

			//toggle debug
			if(e.keyCode == 68) {
				debug = !debug;
			}
			e.preventDefault();
			return false;
	   };
      
      var drawShip = function(p) {
         if(p.alive) {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);

	         ctx.strokeStyle = "rgb(255,255,255)";
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowBlur = 15;
            ctx.lineWidth = 2;
            ctx.shadowColor = p.color;

            ctx.beginPath();
            ctx.moveTo(-6,0);
            ctx.lineTo(-12,-8);
            ctx.lineTo(12,0);
            ctx.lineTo(-12,8);
            ctx.lineTo(-6,0);
            ctx.closePath();
    
            ctx.stroke();
         }
      };
      var corners = 6;
      var rad = Math.PI / 180;
      var drawAsteroid = function(a) {
         ctx.translate(a.x, a.y);
         ctx.rotate(a.rot);

         ctx.strokeStyle = "rgb(255,255,255)";
         ctx.lineCap = "round";
         ctx.lineJoin = "round";
         ctx.lineWidth = 2;
         ctx.shadowBlur = 15;
         ctx.shadowColor = a.color;
         ctx.beginPath();

         var mangle = -1*(360/corners) * rad;
         ctx.moveTo(Math.cos(mangle)*a.radius,Math.sin(mangle)*a.radius);

         for(var i=0; i<corners+1; i++) {
            var angle = (i)*(360/corners) * rad;
            ctx.lineTo(Math.cos(angle)*a.radius,Math.sin(angle)*a.radius);
         }

         ctx.closePath();
         ctx.stroke();
      };

      var drawShot = function(s) {
         ctx.translate(s.x, s.y);
         ctx.rotate(s.rot);
         ctx.strokeStyle = "rgb(255,255,255)";
         ctx.lineCap = "round";
         ctx.lineJoin = "round";
         ctx.lineWidth = 3;
         ctx.shadowBlur = 20;
         ctx.shadowColor = s.color;
         ctx.beginPath();
         ctx.moveTo(-4,0);
         ctx.lineTo(4,0);
         ctx.stroke();
      };
      
      var lastFrame = 0;
      var currentFPS = 0;
      var currentLvl = 1;

      var drawBackground = function() {
         ctxBG.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
         var bgcolor = [];
         for(var i=0;i<3;i++)
            bgcolor[i] = Math.round(Math.random() * 64);

         var g = ctxBG.createRadialGradient(bgCanvas.width/2, bgCanvas.height/2, 0, bgCanvas.width/2, bgCanvas.height/2,bgCanvas.height);

         g.addColorStop(1,"rgb(" + bgcolor[0] + "," + bgcolor[1] + "," + bgcolor[2] + ")");
         g.addColorStop(0,"rgb(" + (bgcolor[0] + 64) + "," + (bgcolor[1] + 64) + "," + (bgcolor[2] + 64) + ")");

         ctxBG.fillStyle = g;
         ctxBG.fillRect(0,0,canvas.width,canvas.height);
      };

      drawBackground();

		var drawLife = function(x, y) {
			ctx.save();

         ctx.translate(x, y);
         ctx.rotate(Math.PI/180*-90);
			ctx.scale(2.0,2.0);

         ctx.fillStyle = "rgba(0,0,0,0.3)";

         ctx.beginPath();        
			ctx.moveTo(-6,0);
         ctx.lineTo(-12,-8);
         ctx.lineTo(12,0);
         ctx.lineTo(-12,8);
         ctx.lineTo(-6,0);
         ctx.closePath();
			ctx.fill();

			ctx.restore();
		};

      var draw = function() {
         var timeNow = new Date().getTime();
         var elapsed = timeNow - lastFrame;
         currentFPS = Math.round(1000 / elapsed);
         
         ctx.clearRect(0, 0, canvas.width, canvas.height);

         ctx.save();

         ctx.fillStyle = "rgba(0,0,0,0.3)";
         ctx.font = "40px sans-serif";
         ctx.textAlign = "center";
         ctx.textBaseline = "middle";
         ctx.fillText(b[drawIndex].points,canvas.width/2,canvas.height/2 - 100);
			
			ctx.fillStyle = "rgba(0,0,0,0.3)";
         ctx.font = "80px sans-serif";
         ctx.textAlign = "center";
         ctx.textBaseline = "middle";
         ctx.fillText(lvl,canvas.width/2,canvas.height/2);
			
			if(debug) {
		      ctx.fillStyle = "rgba(255,255,255,0.3)";
		      ctx.font = "12px sans-serif";
		      ctx.textAlign = "left";
		      ctx.textBaseline = "top";
		      ctx.fillText("Draw thread: " + currentFPS + "fps",10,10);
		      ctx.fillText("Update thread: " + updateFPS + "fps",10,25);
			}
         ctx.restore();

			var lifeY = canvas.height/2 + 100;
			for(var i=0;i<lives;i++) {
				var lifeX = canvas.width/2 - 64 + 64 * i;
				drawLife(lifeX, lifeY);
			}

	      for(i=0;i<b[drawIndex].objects.length;i++) {
            ctx.save();

            if(b[drawIndex].objects[i].type == "player")
               drawShip(b[drawIndex].objects[i].data);
            else if(b[drawIndex].objects[i].type == "enemy")
               drawShip(b[drawIndex].objects[i].data);
            else if(b[drawIndex].objects[i].type == "asteroid")
               drawAsteroid(b[drawIndex].objects[i].data);
            else if(b[drawIndex].objects[i].type == "shot" ||
                  b[drawIndex].objects[i].type == "enemyshot")
   		      drawShot(b[drawIndex].objects[i].data);

            ctx.restore();
         }

         lastFrame = timeNow;
         
         requestAnimationFrame(draw, canvas);
      };

      draw();
   }
};
