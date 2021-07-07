package configs

// xserverOpt 服务配置信息
type xserverOpt struct {
	Name       string `json:"name"`
	HttpPort   uint16 `json:"httpPort"`
	AccessPort uint16 `json:"accessPort"`
	RpcPort    uint16 `json:"rpcPort"`
	Status     int    `json:"status"`
	Address    string // 服务IP
}

// ServicesInf 服务信息
type ServicesInf struct {
	Local   xserverOpt `json:"local"`
	Station xserverOpt `json:"station"`
}

var (
	Services    ServicesInf // 服务信息
	LocalIpAddr string      // 服务IP
)
