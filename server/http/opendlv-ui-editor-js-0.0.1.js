/*
Copyright 2018 Ola Benderius

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

$(document).ready(function(){
  setupUi();

  loadExampleCode(0);
  $('#welcomeModal').modal('show');
});

function setupUi() {
  var lc = libcluon();

  if ("WebSocket" in window) {
    var ws = new WebSocket("wss://" + window.location.host + "/", "od4");
    ws.binaryType = 'arraybuffer';

    ws.onopen = function() {
      onStreamOpen(ws, lc);
    }

    ws.onmessage = function(evt) {
      onMessageReceived(lc, evt.data);
    };

    ws.onclose = function() {
      onStreamClosed();
    };

  } else {
    console.log("Error: websockets not supported by your browser.");
  }

}

function onStreamOpen(ws, lc) {
  function getResourceFrom(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
  }

  var odvd = getResourceFrom("opendlv-standard-message-set-v0.9.5.odvd");

  console.log("Connected to stream.");
  console.log("Loaded " + lc.setMessageSpecification(odvd) + " messages from specification.");
  
  function sendMessage(dataType, senderStamp, messageJson) {
    const message = lc.encodeEnvelopeFromJSONWithoutTimeStamps(messageJson, dataType, senderStamp);
    strToAb = str =>
      new Uint8Array(str.split('')
        .map(c => c.charCodeAt(0))).buffer;
    ws.send(strToAb(message), { binary: true });
  }

  function firstContactCallback(vehicleId) {
    const name = "Car " + vehicleId;
    const runHtml = $("#run-program-dropdown").html() + '<a id="run-program-vehicle' + vehicleId + '" class="dropdown-item" href="#" onclick="startProgramExecution(' + vehicleId + ')">' + name + '</a>';
    const simulateHtml = $("#simulate-program-dropdown").html() + '<a id="simulate-program-vehicle' + vehicleId + '" class="dropdown-item" href="#" onclick="startProgramSimulation(' + vehicleId + ')">' + name + '</a>';
    
    $("#run-program-dropdown").html(runHtml);
    $("#simulate-program-dropdown").html(simulateHtml);
  }

  function extractProgramCallback() {
    return editor.getValue();
  }
  
  function sendMessageCallback(dataType, senderStamp, messageJson) {
    const message = lc.encodeEnvelopeFromJSONWithoutTimeStamps(messageJson, dataType, senderStamp);
    strToAb = str =>
      new Uint8Array(str.split('')
        .map(c => c.charCodeAt(0))).buffer;
    ws.send(strToAb(message), { binary: true });
  }

  vehicleList.initialize("vehicle-panels", 1000, firstContactCallback, extractProgramCallback, sendMessageCallback);
}

function onStreamClosed() {
  console.log("Disconnected from stream.");
}

function onMessageReceived(lc, msg) {

  var data_str = lc.decodeEnvelopeToJSON(msg);
  
  if (data_str.length == 2) {
    return;
  }

  d = JSON.parse(data_str);

  vehicleList.updateData(d);
}

function startProgramExecution(vehicleId) {
  const defaultText = "Car " + vehicleId;
  const currentText = $("#run-program-vehicle" + vehicleId).text();

  if (defaultText == currentText) {
    $("#run-program-vehicle" + vehicleId).text(defaultText + " (kör)");
  } else {
    $("#run-program-vehicle" + vehicleId).text(defaultText);
  }
  
  vehicleList.runProgram(vehicleId);
}

function startProgramSimulation(vehicleId) {
  const defaultText = "Car " + vehicleId;
  const currentText = $("#simulate-program-vehicle" + vehicleId).text();

  if (defaultText == currentText) {
    $("#simulate-program-vehicle" + vehicleId).text(defaultText + ", stop");
  } else {
    $("#simulate-program-vehicle" + vehicleId).text(defaultText);
  }
  
  vehicleList.simulateProgram(vehicleId);
}

function toggleDiv(id) {
  var div = document.getElementById(id);
  div.style.display = div.style.display == "none" ? "block" : "none";
}

function loadExampleCode(index) {
  var code;
  switch (index) {
    case 0:
      code = '// Först läser vi ut sensorvärden\n'
        + 'const frontSensor = perception.front;\n'
        + 'const rearSensor = perception.rear;\n'
        + 'const leftSensor = perception.left;\n'
        + 'const rightSensor = perception.right;\n'
        + '\n'
        + '// Bilens beteende: Börja med att förbereda körnig framåt och styrning åt vänster\n'
        + 'var speed = 13;\n'
        + 'var steering = 15;\n'
        + '\n'
        + '// .. är det något framför bilen?\n'
        + 'if (frontSensor < 0.8) {\n'
        + '  // .. i så fall, förbered för backning och styrning åt höger\n'
        + '  speed = -40;\n'
        + '  steering = -15;\n'
        + '  \n'
        + '  // .. om något är bakom oss så stannar vi\n'
        + '  if (rearSensor < 0.2) {\n'
        + '    speed = 0;\n'
        + '    steering = 0;\n'
        + '  }\n'
        + '}\n'
        + '\n'
        + '// Skicka slutligen de styrsignaler som vi har bestämt oss för, hela koden körs sedan igen\n'
        + 'actuation.motor = speed;\n'
        + 'actuation.steering = steering;';
      break;
    case 1:
      code = 'const frontSensor = perception.front;\n'
        + 'const rearSensor = perception.rear;\n'
        + 'const leftSensor = perception.left;\n'
        + 'const rightSensor = perception.right;\n'
        + '\n'
        + 'var speed = 13;\n'
        + 'var time = Date.now();\n'
        + 'var turnTime = 0;\n'
        + 'var turningAngle = 0;\n'
        + '\n'
        + 'if (frontSensor < 0.6 ) {\n'
        + '   if (memory.turning !== true) {\n'
        + '     memory.turningTime = Date.now();\n'
        + '     memory.randomAngle = Math.random()*60 - 30;\n'
        + '     memory.turning = true;\n'
        + '   }\n'
        + '}\n'
        + 'if (memory.turning === true) {\n'
        + '    turningAngle = memory.randomAngle;\n'
        + '\n'    
        + '    if(Math.floor((Date.now() - memory.turningTime)/1000) > 1) {\n'
        + '        memory.turning = false;\n'
        + '    }\n'
        + '    speed = -40;\n'
        + '}\n'
        + '\n'
        + 'actuation.motor = speed;\n'
        + 'actuation.steering = turningAngle;';
      break;
    case 2:
      code = '// Först läser vi ut sensorvärden\n'
        + 'const frontSensor = perception.front;\n'
        + 'const rearSensor = perception.rear;\n'
        + 'const leftSensor = perception.left;\n'
        + 'const rightSensor = perception.right;\n'
        + 'const lanes = perception.lanes;\n'
        + 'const boxes = perception.boxes;\n'
        + '\n'
        + '// Bilens beteende: Börja med att förbereda körnig framåt och styrning åt vänster\n'
        + 'var speed = 13;\n'
        + 'var steering = 15;\n'
        + '\n'
        + '// .. är det något framför bilen?\n'
        + 'if (frontSensor < 0.8) {\n'
        + '  // .. i så fall, förbered för backning och slumpmässig styrning åt höger\n'
        + '  speed = -40;\n'
        + '  steering = -15 * Math.random();\n'
        + '  \n'
        + '  // .. om något är bakom oss så stannar vi\n'
        + '  if (rearSensor < 0.3) {\n'
        + '    speed = 0;\n'
        + '    steering = 0;\n'
        + '  }\n'
        + '  \n'
        + '  // .. sen gå igenom alla lådor som vi ser framför oss\n'
        + '  for (var i = 0; i < boxes.length; i++) {\n'
        + '    const box = boxes[i];\n'
        + '    // .. är det en låda rakt framför oss som är lila?\n'
        + '    if (Math.abs(box.angle) < 0.6 && box.color == \'purple\') {\n'
        + '      // .. i så fall ändrar vi oss och stannar (vi har hittat en FIN lila låda!)\n'
        + '      speed = 0;\n'
        + '      steering = 0;\n'
        + '    }\n'
        + '  }\n'
        + '}\n'
        + '\n'
        + '// Skicka slutligen de styrsignaler som vi har bestämt oss för, hela koden körs sedan igen\n'
        + 'actuation.motor = speed;\n'
        + 'actuation.steering = steering;';
      break;
  }
  editor.setValue(code, -1);
}
