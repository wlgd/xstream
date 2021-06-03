package internal

import (
	"errors"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

type websocketMap struct {
	socks map[*websocket.Conn]bool
}

// webscoket
var clients sync.Map

// StreamSession 判断通道视频流是否打开
func StreamSession(device string, channel, streamType int) string {
	return fmt.Sprintf("Stream_%s_%02d_%02d", device, channel, streamType) // 设置唯一session
}

// StreamSyncSendMediaData 发送媒体数据到websocket
func StreamSyncSendMediaData(session string, data []byte) error {
	v, ok := clients.Load(session)
	if !ok {
		return errors.New("not client")
	}
	msl, _ := v.(websocketMap)
	if len(msl.socks) == 0 {
		return errors.New("not client exist")
	}
	isActive := false
	for conn, ok := range msl.socks {
		if ok {
			if err := conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
				delete(msl.socks, conn)
			}
			isActive = true
		}
	}
	if !isActive {
		return errors.New("not client recv")
	}
	return nil
}

// StreamSyncAddConn 添加连接到映射表中
func StreamSyncAddConn(session string, conn *websocket.Conn) {
	v, ok := clients.Load(session)
	if !ok {
		var msl websocketMap
		msl.socks = make(map[*websocket.Conn]bool)
		msl.socks[conn] = true
		clients.LoadOrStore(session, msl)
		return
	}
	msl, _ := v.(websocketMap)
	msl.socks[conn] = true
}

// StreamSyncRemoveConn websocket关闭删除
func StreamSyncRemoveConn(session string, conn *websocket.Conn) {
	v, ok := clients.Load(session)
	if !ok {
		return
	}
	msl, _ := v.(websocketMap)
	if _, ok := msl.socks[conn]; ok {
		delete(msl.socks, conn)
	}
}

// StreamSyncStopConn 停止推送数据
func StreamSyncStopConn(session string, conn *websocket.Conn) {
	v, ok := clients.Load(session)
	if !ok {
		return
	}
	msl, _ := v.(websocketMap)
	msl.socks[conn] = false
}

// StreamSyncReomve 从映射表中删除链接
func StreamSyncReomve(session string) {
	clients.Delete(session)
}

// StreamSyncGet 判断设备链接是否存在
func StreamSyncGet(session string) error {
	_, ok := clients.Load(session)
	if !ok {
		return errors.New("device Stream link no exist")
	}
	return nil
}
