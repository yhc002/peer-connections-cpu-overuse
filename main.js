/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* jshint esversion: 6 */

'use strict';

var $ = document.getElementById.bind(document);

var testTable = $('test-table');
var nPeerConnectionsInput = $('num-peerconnections');
var connections;
var startTestButton = $('start-test');
var cpuOveruseDetectionCheckbox = $('cpuoveruse-detection');

startTestButton.onclick = startTest;

var curRow= testTable.insertRow(-1);
var rowLength;
var rowCount = 0;

function logError(err) {
  console.err(err);
}

function addNewVideoElement() {
  if(rowCount>=rowLength){
    curRow = testTable.insertRow(-1);
    rowCount=0;
  }
  ++rowCount;
  var newCell = curRow.insertCell(-1);
  newCell.style.height = `${80/rowLength}vh`;
  var video = document.createElement('video');
  video.autoplay = true;
  newCell.appendChild(video);
  return video;
}

function PeerConnection(id, cpuOveruseDetection) {
  this.id = id;
  this.cpuOveruseDetection = cpuOveruseDetection;

  this.localConnection = null;
  this.remoteConnection = null;

  this.remoteView = addNewVideoElement();

  this.start = function() {
    var onGetUserMediaSuccess = this.onGetUserMediaSuccess.bind(this);
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true
    })
      .then(onGetUserMediaSuccess)
      .catch(logError);
  };

  this.onGetUserMediaSuccess = function(stream) {
    // Create local peer connection.
    this.localConnection = new RTCPeerConnection(null, {
      'optional': [{
        'googCpuOveruseDetection': this.cpuOveruseDetection
      }]
    });
    this.localConnection.onicecandidate = (event) => {
      this.onIceCandidate(this.remoteConnection, event);
    };
    this.localConnection.addStream(stream);

    // Create remote peer connection.
    this.remoteConnection = new RTCPeerConnection(null, {
      'optional': [{
        'googCpuOveruseDetection': this.cpuOveruseDetection
      }]
    });
    this.remoteConnection.onicecandidate = (event) => {
      this.onIceCandidate(this.localConnection, event);
    };
    this.remoteConnection.onaddstream = (e) => {
      this.remoteView.srcObject = e.stream;
    };

    // Initiate call.
    var onCreateOfferSuccess = this.onCreateOfferSuccess.bind(this);
    this.localConnection.createOffer({
      offerToReceiveAudio: 0,
      offerToReceiveVideo: 1
    })
      .then(onCreateOfferSuccess, logError);
  };

  this.onCreateOfferSuccess = function(desc) {
    this.localConnection.setLocalDescription(desc);
    this.remoteConnection.setRemoteDescription(desc);

    var onCreateAnswerSuccess = this.onCreateAnswerSuccess.bind(this);
    this.remoteConnection.createAnswer()
      .then(onCreateAnswerSuccess, logError);
  };

  this.onCreateAnswerSuccess = function(desc) {
    this.remoteConnection.setLocalDescription(desc);
    this.localConnection.setRemoteDescription(desc);
  };

  this.onIceCandidate = function(connection, event) {
    if (event.candidate) {
      connection.addIceCandidate(new RTCIceCandidate(event.candidate));
    }
  };
}

function startTest() {
  var cpuOveruseDetection = cpuOveruseDetectionCheckbox.checked;
  connections = nPeerConnectionsInput.value;

  rowLength = Math.ceil(Math.sqrt(connections));
  console.log("rowLength ", rowLength)
  for (var i = 0; i < connections; ++i) {
    new PeerConnection(i, cpuOveruseDetection).start();
  }
}