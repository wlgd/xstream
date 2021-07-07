package router

import (
	"fmt"
	"net/http"
	"time"
	"xstream/app/controller"

	"github.com/gin-gonic/gin"
)

func newApp() *gin.Engine {
	r := gin.Default()
	gin.SetMode(gin.ReleaseMode)
	r.Use(gin.Logger()) // 日志
	r.Static("/xstream", "./static")
	r.GET("/ws", controller.WsStreamHandler)
	return r
}

// Start 路由
func Start(port uint16) *http.Server {
	r := newApp()
	address := fmt.Sprintf(":%d", port)
	s := &http.Server{
		Addr:           address,
		Handler:        r,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	go s.ListenAndServe()
	return s
}
