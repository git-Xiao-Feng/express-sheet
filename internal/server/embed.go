package server

import (
	_ "embed"

	"github.com/xfeng/express-sheet/internal/assets"
)

//go:generate echo embedding default template
var (
	_ = assets.SimHeiTTF
	_ = assets.DefaultTemplateJSON
)

func assetsDefaultTemplate() []byte {
	return assets.DefaultTemplateJSON
}
