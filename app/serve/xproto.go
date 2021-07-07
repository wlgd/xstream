package serve

import (
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

// xprotoStart 启动
func xprotoStart(port uint16) error {
	xnotify := controller.NewXNotify()
	s, err := xproto.NewServe(xproto.Options{
		Port:             port,
		Adapter:          protocolAdapter,
		LinkAccessNotify: xnotify.AccessHandler,
		AVFrameNotify:    xnotify.AVFrameHandler,
	})
	_xproto = s
	return err
}

// xprotoStop 停止
func xprotoStop() {
	_xproto.Release()
}
