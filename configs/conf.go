package configs

import (
	"github.com/BurntSushi/toml"
)

type configure struct {
	GUID           string  // 服务Id
	UnattendedTime float64 // 无人值守时间
	Superior       struct {
		GetUrl string // 上级服务地址
	}
}

// Conf 所有配置参数
var (
	Default configure
)

// Load 初始化配置参数
func Load(path *string) error {
	_, err := toml.DecodeFile(*path, &Default)
	return err
}