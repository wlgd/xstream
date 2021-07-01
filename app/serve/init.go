package serve

import (
	"errors"
	"fmt"
	"log"
	"time"
	"xstream/configs"

	"github.com/wlgd/xutils"
	"github.com/wlgd/xutils/rpc"
)

var (
	isLoginServer = false
	rpcToken      = ""
)

// serveGet 获取服务信息
func serveGet() error {
	if configs.Default.Superior.GetUrl == "" {
		return errors.New("please set superior address firstly")
	}
	url := fmt.Sprintf("%s/%s", configs.Default.Superior.GetUrl, configs.Default.GUID)
	if err := xutils.HttpGet(url, &configs.Services); err != nil {
		return xutils.ErrLogin
	}
	if configs.Services.Local.Status != rpc.ServeStatusOk {
		return errors.New("the service has been disabled")
	}
	return nil
}

func loginServer() error {
	if isLoginServer {
		return rpc.KeepAlive(&rpc.KeepAliveArgs{
			ServeId:     configs.Default.GUID,
			Token:       rpcToken,
			UpdatedTime: time.Now()})
	}
	st := configs.Services.Station
	if err := rpc.Connect("xstation", st.Address, st.RpcPort); err != nil {
		return err
	}
	var reply rpc.LoginReply
	if err := rpc.Login(&rpc.LoginArgs{
		ServeId: configs.Default.GUID,
		Address: configs.LocalIpAddr}, &reply); err != nil {
		return err
	}
	rpcToken = reply.Token
	isLoginServer = true
	return nil
}

// Run 启动
func Run() error {
	if err := serveGet(); err != nil {
		return err
	}
	configs.LocalIpAddr = xutils.PublicIPAddr()
	// 初始化xproto
	go xprotoStart(configs.Services.Local.AccessPort)
	go func() {
		loginServer()
		ticker := time.NewTicker(time.Second * 60)
		for {
			<-ticker.C
			if err := loginServer(); err != nil {
				log.Println(err.Error())
				isLoginServer = false
			}
		}
	}()
	return nil
}

// Stop 停止
func Stop() {
	xprotoStop()
}
