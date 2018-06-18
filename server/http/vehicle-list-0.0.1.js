/*
Copyright 2018 Ola Benderius

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var vehicleList = (function() {
  var m_divId,
  m_senderStampMod,
  m_firstContactCallback,
  m_extractProgramCallback,
  m_sendMessageCallback,
  m_initialized = false,
  m_knownVehicles = [],
  m_runningIntervals = {},
  m_simulatingIntervals = {},
  m_memory = {},
  m_lanes = {},
  m_boxes = {},

  isFirstContact = function(vehicleId) {
    return m_knownVehicles.indexOf(vehicleId) == -1;
  },
  generateVehiclePanel = function(vehicleId) {
    const index = m_knownVehicles.length;
    const prevIndex = index - 1;
    const bgStyle = (index % 2) == 0 ? "light" : "";
    const vehicleName = "Car " + vehicleId;
    const html =
      '<div id="vehicle-panel-' + index + '" class="vehicle-panel ' + bgStyle + '">'
    +   '<img id="vehicle' + vehicleId + '-video" alt="' + vehicleName + ' video feed">'
    +   '<div>'
    +     '<h4>' + vehicleName + '</h4>'
    +     '<table class="vehicle-sensors">'
    +       '<tr>'
    +         '<td>Front:</td>'
    +         '<td id="vehicle' + vehicleId + '-front" class="right">0.0</td>'
    +         '<td>m</td>'
    +         '<td>Motor:</td>'
    +         '<td id="vehicle' + vehicleId + '-motor" class="right">0</td>'
    +         '<td>%</td>'
    +       '</tr>'
    +       '<tr>'
    +         '<td>Rear:</td>'
    +         '<td id="vehicle' + vehicleId + '-rear" class="right">0.0</td>'
    +         '<td>m</td>'
    +         '<td>Steering:</td>'
    +         '<td id="vehicle' + vehicleId + '-steering" class="right">0</td>'
    +         '<td>°</td>'
    +       '</tr>'
    +       '<tr>'
    +         '<td>Left:</td>'
    +         '<td id="vehicle' + vehicleId + '-left" class="right">0.0</td>'
    +         '<td>m</td>'
    +         '<td>Motor (simulated):</td>'
    +         '<td id="vehicle' + vehicleId + '-motorsim" class="right">0</td>'
    +         '<td>%</td>'
    +       '</tr>'
    +       '<tr>'
    +         '<td>Right:</td>'
    +         '<td id="vehicle' + vehicleId + '-right" class="right">0.0</td>'
    +         '<td>m</td>'
    +         '<td>Steering (simulated):</td>'
    +         '<td id="vehicle' + vehicleId + '-steeringsim" class="right">0</td>'
    +         '<td>°</td>'
    +       '</tr>'
    +     '</table>'
    +   '</div>'
    + '</div>';

    if (prevIndex == -1) {
      $("#" + m_divId).html(html); 
    } else {
      $("#vehicle-panel-" + prevIndex).after(html);
    }
  },
  controlMotor = function(vehicleId, motorValue) {
    const dataType = 1086;
    const position = motorValue;
    const messageJson = "{\"position\":" + position + "}";
    m_sendMessageCallback(dataType, vehicleId * m_senderStampMod, messageJson);
  },
  controlSteering = function(vehicleId, steeringValue) {
    const dataType = 1090;
    const position = steeringValue;
    const messageJson = "{\"groundSteering\":" + position + "}";
    m_sendMessageCallback(dataType, vehicleId * m_senderStampMod, messageJson);
  },
  doUpdateData = function(vehicleId, d) {
    const originalSenderStamp = d.senderStamp - vehicleId * m_senderStampMod;
    if (d.dataType == 1055) {
      $("#vehicle" + vehicleId + "-video").attr("src", "data:image/jpeg;base64," + d['opendlv_proxy_ImageReading']['data']);
    } else if (d.dataType == 1086) {
      console.log('position ' + d['opendlv_proxy_PedalPositionRequest']['position']);
      $("#vehicle" + vehicleId + "-motor").text(Math.floor(d['opendlv_proxy_PedalPositionRequest']['position']));
    } else if (d.dataType == 1090) {
      $("#vehicle" + vehicleId + "-steering").text(Math.floor(d['opendlv_proxy_GroundSteeringRequest']['groundSteering']));
    } else if (d.dataType == 1039) {
      var fieldId;
      if (originalSenderStamp == 0) {
        fieldId = "vehicle" + vehicleId + "-front";
      } else {
        fieldId = "vehicle" + vehicleId + "-rear";
      }
      $("#" + fieldId).text(d['opendlv_proxy_DistanceReading']['distance']);
    } else if (d.dataType == 1037) {
      var fieldId;
      if (originalSenderStamp == 0) {
        fieldId = "vehicle" + vehicleId + "-left";
      } else {
        fieldId = "vehicle" + vehicleId + "-right";
      }
      const voltage = d['opendlv_proxy_VoltageReading']['voltage'];
      const distance = (1.7 - voltage) / 4.95;    
      $("#" + fieldId).text(distance.toFixed(2));
    } else if (d.dataType == 1111) {
      if (originalSenderStamp == 1 || originalSenderStamp == 2) {
        var color;
        if (originalSenderStamp == 1) {
          color = 'blue';
        } else {
          color = 'purple';
        }
        const angle = d['opendlv_logic_sensation_Point']['azimuthAngle'];
        const distance = d['opendlv_logic_sensation_Point']['distance'];
        for (var i = 0; i < m_boxes[vehicleId].length; i++) {
          var box = m_boxes[vehicleId][i];
          if (Math.abs(angle - box.angle) < 0.1) {
            m_boxes[vehicleId][i].angle = angle;
            m_boxes[vehicleId][i].distance = distance;
            m_boxes[vehicleId][i].color = color;
            m_boxes[vehicleId][i].timestamp = Date.now();
            return;
          }
        }
        var box = {
          angle : angle,
          distance : distance,
          color : color,
          timestamp : Date.now()
        };
        m_boxes[vehicleId].push(box);
      } else if (originalSenderStamp == 3) {
        const angle = d['opendlv_logic_sensation_Point']['azimuthAngle'];
        for (var i = 0; i < m_lanes[vehicleId].length; i++) {
          var lane = m_lanes[vehicleId][i];
          if (Math.abs(angle - lane.angle) < 0.05) {
            m_lanes[vehicleId][i].angle = angle;
            m_lanes[vehicleId][i].timestamp = Date.now();
            return;
          }
        }
        var lane = {
          angle : angle,
          timestamp : Date.now()
        };
        m_lanes[vehicleId].push(lane);
      }
    }
  };
  return {
    initialize : function(divId, senderStampMod, firstContactCallback, extractProgramCallback, sendMessageCallback) {
      if (!m_initialized) {
        m_divId = divId;
        m_senderStampMod = senderStampMod;
        m_firstContactCallback = firstContactCallback;
        m_extractProgramCallback = extractProgramCallback;
        m_sendMessageCallback = sendMessageCallback;
        m_initialized = true;
      }
    },
    updateData : function(d) {
      if (!m_initialized) {
        return;
      }

      const vehicleId = Math.floor(d.senderStamp / m_senderStampMod);

      if (isFirstContact(vehicleId)) {
        generateVehiclePanel(vehicleId);
        m_firstContactCallback(vehicleId);
        m_memory[vehicleId] = {};
        m_lanes[vehicleId] = [];
        m_boxes[vehicleId] = [];
        m_knownVehicles.push(vehicleId);
      }

      doUpdateData(vehicleId, d);
    },
    runProgram : function(vehicleId) {

      if (m_runningIntervals[vehicleId] === undefined) {
      
        var interval = setInterval(function() {
          
          var freshBoxes = [];
          for (var i = 0; i < m_boxes[vehicleId].length; i++) {
            const detectionAge = Date.now() - m_boxes[vehicleId][i].timestamp;
            if (detectionAge < 200) {
              freshBoxes.push(m_boxes[vehicleId][i]);
            }
          }
          m_boxes[vehicleId] = freshBoxes;

          var freshLanes = [];
          for (var i = 0; i < m_lanes[vehicleId].length; i++) {
            const detectionAge = Date.now() - m_lanes[vehicleId][i].timestamp;
            if (detectionAge < 200) {
              freshLanes.push(m_lanes[vehicleId][i]);
            }
          }
          m_lanes[vehicleId] = freshLanes;

          const perception = {front : Number($("#vehicle" + vehicleId + "-front").text()),
            rear : Number($("#vehicle" + vehicleId + "-rear").text()),
            left : Number($("#vehicle" + vehicleId + "-left").text()),
            right : Number($("#vehicle" + vehicleId + "-right").text()),
            lanes : m_lanes[vehicleId],
            boxes : m_boxes[vehicleId]
          };

          var actuation = {motor : 0,
            steering : 0
          };

          var memory = m_memory[vehicleId];

          var code = m_extractProgramCallback();
          eval(code);

          m_memory[vehicleId] = memory;

         // $("#vehicle" + vehicleId + "-motor").text(Math.floor(actuation.motor));
         // $("#vehicle" + vehicleId + "-steering").text(Math.floor(actuation.steering));

          controlMotor(vehicleId, actuation.motor / 100);
          controlSteering(vehicleId, actuation.steering / 100);

        }, 100);

        m_runningIntervals[vehicleId] = interval;

      } else {
        clearInterval(m_runningIntervals[vehicleId]);
        delete m_runningIntervals[vehicleId];
        $("#vehicle" + vehicleId + "-motor").text("0");
        $("#vehicle" + vehicleId + "-steering").text("0");
        controlMotor(vehicleId, 0);
        controlSteering(vehicleId, 0);
      }
    },
    simulateProgram : function(vehicleId) {

      if (m_runningIntervals[vehicleId] === undefined) {
      
        var interval = setInterval(function() {
          
          var freshBoxes = [];
          for (var i = 0; i < m_boxes[vehicleId].length; i++) {
            const detectionAge = Date.now() - m_boxes[vehicleId][i].timestamp;
            if (detectionAge < 200) {
              freshBoxes.push(m_boxes[vehicleId][i]);
            }
          }
          m_boxes[vehicleId] = freshBoxes;

          var freshLanes = [];
          for (var i = 0; i < m_lanes[vehicleId].length; i++) {
            const detectionAge = Date.now() - m_lanes[vehicleId][i].timestamp;
            if (detectionAge < 200) {
              freshLanes.push(m_lanes[vehicleId][i]);
            }
          }
          m_lanes[vehicleId] = freshLanes;

          const perception = {front : Number($("#vehicle" + vehicleId + "-front").text()),
            rear : Number($("#vehicle" + vehicleId + "-rear").text()),
            left : Number($("#vehicle" + vehicleId + "-left").text()),
            right : Number($("#vehicle" + vehicleId + "-right").text()),
            lanes : m_lanes[vehicleId],
            boxes : m_boxes[vehicleId]
          };

          var actuation = {motor : 0,
            steering : 0
          };

          var memory = m_memory[vehicleId];

          var code = m_extractProgramCallback();
          eval(code);

          m_memory[vehicleId] = memory;

          $("#vehicle" + vehicleId + "-motorsim").text(Math.floor(actuation.motor));
          $("#vehicle" + vehicleId + "-steeringsim").text(Math.floor(actuation.steering));

        }, 100);

        m_runningIntervals[vehicleId] = interval;

      } else {
        clearInterval(m_runningIntervals[vehicleId]);
        delete m_runningIntervals[vehicleId];
        $("#vehicle" + vehicleId + "-motorsim").text("0");
        $("#vehicle" + vehicleId + "-steeringsim").text("0");
      }
    }
  };
})();
