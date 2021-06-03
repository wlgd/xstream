//Player states.
const kPlayerStateIdle = 0
const kPlayerStatePlaying = 1
const kPlayerStatePausing = 2

/**
 * websocket 播放器
 * @param {string} url websocket url
 * @param {canvas} canvas 画布
 * @param {string} deviceId 设备ID
 * @param {number} channel 通道
 * @param {stream} stream 码流类型
 * @param {token} token 
 * @param {number} autoPlay 自动播放
 */
function WasmPlayer(url, canvas, deviceId, channel, stream, token, autoPlay) {
  this.socketWorker = null
  this.socketurl = url
  this.deviceId = deviceId
  this.channel = channel
  this.stream = stream
  this.token = token
  this.webglPlayer = null
  this.canvas = canvas
  this.playerState = kPlayerStateIdle
  this.pixFmt = 0
  this.videoWidth = 0
  this.videoHeight = 0
  this.yLength = 0
  this.uvLength = 0
  this.frameBuffer = []
  this.autoPlay = autoPlay
  this.volume = false
  this.offset = 0
  this.initSocketWorker()
  this.initDecoder()
  this.initCanvas()
}

/**
 * 初始化画布
 */
WasmPlayer.prototype.initCanvas = function () {
  this.webglPlayer = new WebGLPlayer(this.canvas, {
    preserveDrawingBuffer: false,
  })
}

// 初始化视频资源
WasmPlayer.prototype.initSocketWorker = function () {
  var self = this
  if (this.socketurl.search('http://') != -1) {
    this.socketWorker = new Worker('dist/player/downloader.js')
  } else {
    this.socketWorker = new Worker('dist/player/websocket.js')
  }
  this.socketWorker.onmessage = function (data) {
    var frame = data.data
    switch (frame.type) {
      case kAVStreamOpenSuccess:
        if (self.autoPlay) {
          self.callStreamPlay() // 开始播放
        }
        break
      case kAVFrameVideo:
        self.onVideoFrame(frame)
        break
      case kAVFrameAudio:
        self.onAudioFrame(frame)
        break
      case kFileOffset:
        self.offset += frame.offset
        self.callStreamPlay()
        break
      case kAVStreamClose:
        self.playerState = kPlayerStateIdle
        break
    }
  }
  this.callStreamOpen() // 打开视频Url
}
/**
 * isPlaying 播放状态
 */
WasmPlayer.prototype.isPlaying = function () {
  if (this.playerState == kPlayerStatePlaying) {
    return true
  }
  return false
}
/**
 * 开始播放
 */
WasmPlayer.prototype.play = function () {
  if (this.playerState == kPlayerStatePausing) {
    this.resumePlaying()
    return true
  }
  if (this.playerState == kPlayerStatePlaying) {
    return true
  }
  if (!this.socketurl) {
    console.log('WasmPlayer error, url empty.')
    return false
  }

  if (!this.webglPlayer) {
    console.log('WasmPlayer webgl not initialized.')
    return false
  }
  self.callStreamPlay() // 开始播放
}

/**
 * 停止
 */
WasmPlayer.prototype.stop = function () {
  this.callStreamStop()
}

/**
 * 重放
 */
WasmPlayer.prototype.resumePlaying = function () {
  this.callStreamPlay()
}

/**
 * 全屏
 */
WasmPlayer.prototype.fullscreen = function () {
  if (this.webglPlayer) {
    this.webglPlayer.fullscreen()
  }
}

/**
 * 声音控制
 */
WasmPlayer.prototype.volume = function () {
  if (this.volume) {
    this.volume = false;
  } else {
    this.volume = true;
  }
}

/**
 * 拉流播放
 */
WasmPlayer.prototype.callStreamPlay = function () {
  this.playerState = kPlayerStatePlaying
  var req = {
    type: kAVStreamPlay,
    start: this.offset,
  }
  this.socketWorker.postMessage(req)
}

/**
 * 停止拉流
 */
WasmPlayer.prototype.callStreamStop = function () {
  this.playerState = kPlayerStatePausing
  var req = {
    type: kAVStreamStop,
  }
  this.socketWorker.postMessage(req)
}

/**
 * 打开视频流Url地址
 */
WasmPlayer.prototype.callStreamOpen = function () {
  var req = {
    type: kAVStreamOpen,
    url: this.socketurl,
    deviceId: this.deviceId,
    channel: this.channel,
    stream: this.stream,
    token: this.token,
  }
  this.socketWorker.postMessage(req)
}

/**
 * 
 */
WasmPlayer.prototype.displayLoop = function () {
  if (this.playerState !== playerStateIdle) {
    requestAnimationFrame(this.displayLoop.bind(this))
  }
  if (this.playerState != playerStatePlaying) {
    return
  }

  if (this.frameBuffer.length == 0) {
    return
  }

  // requestAnimationFrame may be 60fps, if stream fps too large,
  // we need to render more frames in one loop, otherwise display
  // fps won't catch up with source fps, leads to memory increasing,
  // set to 2 now.
  this.logger.log('displayLoop ' + this.frameBuffer.length)
  for (i = 0; i < 2; ++i) {
    var frame = this.frameBuffer[0]
    switch (frame.t) {
      case kAudioFrame:
        if (this.displayAudioFrame(frame)) {
          this.frameBuffer.shift()
        }
        break
      case kVideoFrame:
        if (this.displayVideoFrame(frame)) {
          this.frameBuffer.shift()
        }
        break
      default:
        return
    }

    if (this.frameBuffer.length == 0) {
      break
    }
  }
}

/**
 * 视频帧解码回调
 * @param {json} frame yuyv帧 
 */
WasmPlayer.prototype.onVideoFrame = function (frame) {
  if (this.videoWidth == 0) {
    this.videoWidth = frame.width
    this.videoHeight = frame.height
    this.yLength = this.videoWidth * this.videoHeight
    this.uvLength = (this.videoWidth / 2) * (this.videoHeight / 2)
    this.canvas.setAttribute('width', this.videoWidth)
    this.canvas.setAttribute('height', this.videoHeight)
    // console.log('frame width ' + frame.width + ' height ' + frame.height + ' Len ' + frame.length + ' format ' + frame.format)
  }
  this.webglPlayer.renderFrame(frame.data, this.videoWidth, this.videoHeight, this.yLength, this.uvLength)
  return true
}

/**
 * 音频帧解码回调
 * @param {json} frame pcm帧
 */
WasmPlayer.prototype.onAudioFrame = function (frame) {
  if(this.volume)
    this.pcmPlayer.play(frame.data)
}

/**
 * 初始化pcm播放器，视频wasm自动检测码流类型并解码
 */
WasmPlayer.prototype.initDecoder = function () {
  this.pcmPlayer = new PCMPlayer({
    encoding: '16bitInt',
    channels: 1,
    sampleRate: 8000,
    flushingTime: 5000,
  })
}
