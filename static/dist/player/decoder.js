self.isLoad = false
self.Module = {
  onRuntimeInitialized: function () {
    self.isLoad = true
    // console.log("wasm load success");
  },
}

self.importScripts('av.js')

function WebDecoder(stream) {
  this.stream = stream
  this.videoCallback = null
  this.audioCallback = null
  this.codec = null
  this.cacheBuffer = null
}

// 初始化解码器
WebDecoder.prototype.init = function () {
  if (!self.isLoad) {
    return
  }
  this.videoCallback = Module.addFunction(function (buff, format, width, heigth, size, timestamp) {
    var outArray = Module.HEAPU8.subarray(buff, buff + size)
    var data = new Uint8Array(outArray)
    var obj = {
      type: kAVFrameVideo,
      format: format,
      width: width,
      height: heigth,
      length: size,
      data: data,
      dts: timestamp,
    }
    self.postMessage(obj, [obj.data.buffer])
  }, 'viid')
  this.audioCallback = Module.addFunction(function (buff, size) {
    var outArray = Module.HEAPU8.subarray(buff, buff + size)
    var data = new Uint8Array(outArray)
    var obj = {
      type: kAVFrameAudio,
      data: data,
    }
    self.postMessage(obj, [obj.data.buffer])
  }, 'viid')
  this.codec = Module._jsNewDecoder(this.videoCallback, this.audioCallback)
  this.cacheBuffer = Module._malloc(6553600)
  if (!this.stream) {
    Module._jsOpenDecoder(this.codec)
  }
  return this.codec
}

// 解码一帧数据
WebDecoder.prototype.decodeFrame = function (frameData) {
  if (null == this.codec) {
    this.init()
  }
  Module.HEAPU8.set(frameData, this.cacheBuffer)
  return Module._jsDecodecOnepacket(this.codec, this.cacheBuffer, frameData.length)
}

WebDecoder.prototype.decodeFileChuck = function (frameData) {}

// 释放解码器资源
WebDecoder.prototype.close = function () {
  if (this.codec) Module._jsReleaseDecoder(this.codec)
}