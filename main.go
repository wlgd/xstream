package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
	"xstream/app/serve"
	"xstream/configs"
	"xstream/router"
)

var (
	configure = flag.String("c", "./conf/config.toml", "default config file")
)

func logFatalln(err error) {
	if err != nil {
		log.Fatalln(err)
	}
}

// 启动流程
// 1、初始化数据库
// 2、获取向中心服务配置信息
func main() {
	flag.Parse()
	logFatalln(configs.Load(configure))
	logFatalln(serve.Run())
	// web服务
	s := router.Start(configs.Services.Local.HttpPort)
	log.Printf("Http Server Start at %s\n", s.Addr)
	time.Sleep(10 * time.Microsecond)
	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal)
	// kill (no param) default send syscanll.SIGTERM
	// kill -2 is syscall.SIGINT
	// kill -9 is syscall. SIGKILL but can"t be catch, so don't need add it
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutdown Server ...")
	serve.Stop()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.Shutdown(ctx); err != nil {
		log.Fatal("Server Shutdown:", err)
	}
	// catching ctx.Done(). timeout of 5 seconds.
	<-ctx.Done()
	log.Println("timeout of 5 seconds.")
	log.Println("Server exiting")
}
