importScripts('common.js')
importScripts('decoder.js')

function WSSource() {
  this.deviceId = null
  this.channel = null
  this.stream = null
  this.socket = null
  this.url = null
  this.decoder = new WebDecoder(true)
  this.isActive = false
}

WSSource.prototype.connectServer = function (data) {
  this.deviceId = data.deviceId
  this.channel = data.channel
  this.stream = data.stream
  this.url = data.url
  this.token = data.token
  this.socket = new WebSocket(this.url)
  this.socket.binaryType = 'arraybuffer'
  this.socket.onmessage = this.onMessage.bind(this)
  this.socket.onopen = this.onOpen.bind(this)
  this.socket.onerror = this.onClose.bind(this)
  this.socket.onclose = this.onClose.bind(this)
}

// websocket 接受视频流
WSSource.prototype.onMessage = function (data) {
  if (!this.isActive) {
    return
  }
  var frameData = new Uint8Array(data.data)
  // console.log(this.deviceId + " recv frame length " + frameData.length);
  var errCode = this.decoder.decodeFrame(frameData)
}

// websocket 打开
WSSource.prototype.onOpen = function () {
  var req = {
    type: kAVStreamOpenSuccess,
  }
  self.postMessage(req)
  console.log(this.deviceId + ' channel ' + this.channel + ' connected.')
}

// websocket 关闭
WSSource.prototype.onClose = function () {
  var req = {
    type: kAVStreamClose,
  }
  self.postMessage(req)
  this.decoder.close()
  console.log(this.deviceId + ' channel ' + this.channel + ' closed.')
}

// websocket 请求播放
WSSource.prototype.startPlay = function () {
  this.isActive = true
  var req = {
    action: 1,
    deviceId: this.deviceId,
    channel: this.channel,
    stream: this.stream,
    token: this.token,
  }
  this.socket.send(JSON.stringify(req))
  console.log(this.deviceId + ' channel ' + this.channel + ' play.')
}

// websocket 停止播放
WSSource.prototype.stopPlay = function () {
  this.isActive = false
  var req = {
    action: 0,
    deviceId: this.deviceId,
    channel: this.channel,
    stream: this.stream,
    token: this.token,
  }
  this.socket.send(JSON.stringify(req))
  console.log(this.deviceId + ' channel ' + this.channel + ' stop.')
}

self.source = new WSSource()

self.onmessage = function (data) {
  var data = data.data
  switch (data.type) {
    case kAVStreamOpen:
      self.source.connectServer(data) // 连接服务器
      break
    case kAVStreamPlay:
      self.source.startPlay()
      break
    case kAVStreamStop:
      self.source.stopPlay()
      break
  }
}
