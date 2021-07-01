module xstream

go 1.16

require (
	github.com/BurntSushi/toml v0.3.1
	github.com/gin-gonic/gin v1.7.2
	github.com/gorilla/websocket v1.4.2
	github.com/wlgd/xproto v0.0.0-00010101000000-000000000000
	github.com/wlgd/xutils v0.0.0-20210701074559-e4b0685b2ff6
)

replace github.com/wlgd/xproto => ../xproto

replace github.com/wlgd/xutils => ../xutils
