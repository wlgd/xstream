package serve

import (
	"log"
	"xstream/app/controller"

	"github.com/wlgd/xproto"
	"github.com/wlgd/xproto/ho"
	"github.com/wlgd/xproto/jt"
	"github.com/wlgd/xproto/ttx"
)

func protocolAdapter(b []byte) xproto.InterfaceProto {
	if _, err := ho.IsValidProto(b); err == nil {
		return &ho.ProtoImpl{}
	}
	if _, err := ttx.IsValidProto(b); err == nil {
		return &ttx.ProtoImpl{}
	}
	if _, err := jt.IsValidProto(b); err == nil {
		return &jt.ProtoImpl{}
	}
	return nil
}

var (
	_xproto *xproto.Serve = nil
)

// xprotoStart 启动access服务
func xprotoStart(port uint16) {
	_xproto = &xproto.Serve{
		RequestTimeOut: 30,
		RecvTimeout:    60,
		Adapter:        protocolAdapter,
	}
	xnotify := controller.NewXNotify()
	_xproto.SetNotifyOfLinkAccess(xnotify.AccessHandler)
	_xproto.SetNotifyOfAVFrame(xnotify.AVFrameHandler)
	log.Printf("XProto Serve Start %d\n", port)
	if err := _xproto.ListenAndServe(port); err != nil {
		log.Fatalln("localAccess", err)
	}
}

// xprotoStop 停止access服务
func xprotoStop() {
	_xproto.Close()
}
