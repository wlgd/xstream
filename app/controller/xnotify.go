package controller

import (
	"errors"
	"sync"
	"time"
	"xstream/configs"
	"xstream/internal"

	"github.com/wlgd/xproto"
)

// webscoket
var lives sync.Map

// liveGetLastTime 获取上次发送时间
func liveGetLastTime(session string) time.Time {
	v, _ := lives.Load(session)
	tt, _ := v.(time.Time)
	return tt
}

// liveUpdateTime 更新时间
func liveUpdateTime(session string) {
	lives.LoadOrStore(session, time.Now())
}

// liveUpdateTime 删除时间
func liveRemove(session string) {
	lives.Delete(session)
}

type XNotify struct {
}

// NewAccessData 实例化对象
func NewXNotify() *XNotify {
	return new(XNotify)
}

// AccessHandler 设备接入
func (o *XNotify) AccessHandler(tag string, register *xproto.LinkAccess) error {
	if register.LinkType != xproto.LINK_LiveStream {
		return errors.New("unsupport link")
	}
	// fmt.Printf("%s >> | deviceID %s\n", register.Session, register.DeviceID)
	if register.OnLine {
		liveRemove(register.Session)
	} else {
		liveUpdateTime(register.Session)
	}
	// entity.RpcSendMessage("XLinkRegister", register, nil)
	return nil
}

// XLinkAVFrameHandler 格式化视频帧
func (o *XNotify) AVFrameHandler(deviceID, ss string, channel, typ uint16, timestamp uint64, data []byte) {
	// fmt.Printf("%s >> | channel %d type: %d timestamp: %v length %d\n", ss, channel, typ, timestamp, len(data))
	if err := internal.StreamSyncSendMediaData(ss, data); err == nil {
		liveUpdateTime(ss)
		return
	}
	lastTime := liveGetLastTime(ss)
	if time.Since(lastTime).Seconds() <= configs.Default.UnattendedTime {
		return
	}
	xproto.SyncStopConnection(deviceID, ss) // 超时关闭
	internal.StreamSyncReomve(ss)
}
