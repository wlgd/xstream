self.importScripts('common.js')

/**
 * http下载类
 */
function Downloader() {
  this.url = null
  this.size = null
  this.chunk = 65535
  this.start = 0
  this.sequence = 0
  this.decoder = new WebDecoder(false)
}

/**
 * http访问成功
 * @param {number} size 文件大小
 * @param {number} status http请求状态
 */
Downloader.prototype.urlSuccess = function (size, status) {
  this.size = Number(size)
  console.log(this.url + ' access code ' + status + ' size ' + size)
  var req = {
    type: kAVStreamOpenSuccess,
  }
  self.postMessage(req)
}

/**
 * wasm解码
 * @param {*} start 文件开始
 * @param {*} end 文件结束
 * @param {*} seq 序列号
 * @param {*} data 数据
 */
Downloader.prototype.chunkSuccess = function (start, end, data) {
  this.decoder.decodeFileChuck(data)
  this.start = end
  var req = {
    type: kFileOffset,
    offset: start,
  }
  self.postMessage(req) // 通知player当前文件读取状态
  this.sequence++
  console.log(this.url + ' chuck sequence ' + this.sequence + ' start ' + this.start)
}

/**
 * 文件读取完毕
 */
Downloader.prototype.chunkOver = function () {
  this.start = 0
  this.sequence = 0
  var req = {
    type: kAVStreamClose,
  }
  self.postMessage(req) // 通知player当前文件读取结束
  console.log(this.url + ' over')
}

/**
 * 获取文件信息
 */
Downloader.prototype.getFileInfo = function () {
  console.log(this.url)
  var size = 0
  var status = 0
  var reported = false

  var xhr = new XMLHttpRequest()
  xhr.open('get', this.url, true)
  var self = this
  xhr.onreadystatechange = () => {
    var len = xhr.getResponseHeader('Content-Length')
    if (len) {
      size = len
    }
    if (xhr.status) {
      status = xhr.status
    }
    //Completed.
    if (!reported && ((size > 0 && status > 0) || xhr.readyState == 4)) {
      self.urlSuccess(size, status)
      reported = true
      xhr.abort()
    }
  }
  xhr.send()
}

Downloader.prototype.chunkDownload = function (start) {
  //this.logger.logInfo("Downloading file " + url + ", bytes=" + start + "-" + end + ".");
  if (this.start === this.size) {
    return this.chunkOver() // 文件结束
  }
  var end = this.start + this.chunk
  if (Number(end) > this.size) {
    end = this.size
  }
  var xhr = new XMLHttpRequest()
  xhr.open('get', this.url, true)
  xhr.responseType = 'arraybuffer'
  xhr.setRequestHeader('Range', 'bytes=' + start + '-' + end)
  var self = this
  xhr.onload = function () {
    self.chunkSuccess(start, end, xhr.response)
  }
  xhr.send()
}

self.downloader = new Downloader()
self.onmessage = function (evt) {
  if (!self.downloader) {
    console.log('Downloader not initialized!')
    return
  }
  var data = evt.data
  switch (data.type) {
    case kAVStreamOpen:
      self.url = data.url
      self.downloader.getFileInfo()
      break
    case kAVStreamPlay:
      self.downloader.chunkDownload(data.offset)
      break
    default:
      break
  }
}
