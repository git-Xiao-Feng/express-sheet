// Package assets embeds binary resources (font, default template) into the binary.
package assets

import _ "embed"

//go:embed simhei.ttf
var SimHeiTTF []byte

//go:embed default_template.json
var DefaultTemplateJSON []byte
