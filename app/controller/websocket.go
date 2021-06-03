package controller

import (
	"log"
	"net/http"
	"xstream/internal"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type websocketRequest struct {
	Token    string `json:"token"`    // token
	DeviceID string `json:"deviceId"` // 设备ID
	Channel  int    `json:"channel"`  // 通道
	Stream   int    `json:"stream"`   // 码流类型 0-子码流 1-主码流
	Action   int    `json:"action"`   // 1-打开 0-关闭
}

var upgrader = websocket.Upgrader{}

// WsStreamHandler 实时流请求
func WsStreamHandler(c *gin.Context) {
	conn, err := websocket.Upgrade(c.Writer, c.Request, nil, 1024, 1024)
	if err != nil {
		http.NotFound(c.Writer, c.Request)
	}
	defer func() {
		conn.Close()
	}()
	var ss string
	for {
	Loop:
		var req websocketRequest
		if err := conn.ReadJSON(&req); err != nil {
			break
		}
		if req.Action == 1 {
			ss := internal.StreamSession(req.DeviceID, req.Channel, req.Stream)
			if err := internal.StreamSyncGet(ss); err == nil { // 设备视频通道链接已存在
				internal.StreamSyncAddConn(ss, conn)
				goto Loop
			}
			// 请求失败
			log.Println(err.Error())
		} else if req.Action == 0 {
			internal.StreamSyncStopConn(ss, conn) // 停止推送数据
		}
	}
	internal.StreamSyncRemoveConn(ss, conn) // 删除
}
