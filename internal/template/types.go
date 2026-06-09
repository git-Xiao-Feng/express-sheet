// Package template defines the data model for waybill templates.
package template

// Template is the root of a waybill template JSON.
//
// JSON 字段名 "elements" 与前端 state.template.elements 对齐(US-006 引入,
// US-009 验证 e2e 流程时发现后端仍用 "blocks" 会导致 DisallowUnknownFields 直接 400,
// 因此把 JSON tag 改为 "elements" 与前端 canonical 字段名一致;Go 字段名 Blocks 保留
// 以避免大范围重命名,且 BlockType / Block 字段也未变)。
type Template struct {
	Page   Page    `json:"page"`
	Font   Font    `json:"font"`
	Blocks []Block `json:"elements"`
}

// Page describes the physical page size in millimetres.
type Page struct {
	WidthMM  float64 `json:"width_mm"`
	HeightMM float64 `json:"height_mm"`
}

// Font describes the active font family.
type Font struct {
	Family string `json:"family"`
}

// BlockType enumerates the 8 supported element (block) types.
type BlockType string

const (
	// 文本类
	BlockTextH BlockType = "text_h" // 横向文字
	BlockTextV BlockType = "text_v" // 竖向文字
	// 图形类
	BlockLineH   BlockType = "line_h" // 水平线
	BlockLineV   BlockType = "line_v" // 垂直线
	BlockRect    BlockType = "rect"   // 矩形框(空心,仅描边)
	// 条形码/二维码
	BlockBarcodeH BlockType = "barcode_h" // 横向条形码
	BlockBarcodeV BlockType = "barcode_v" // 竖向条形码
	BlockQRCode   BlockType = "qrcode"    // 二维码
)

// Block is a drawable region on the page.
type Block struct {
	ID          string    `json:"id"`
	Type        BlockType `json:"type"`
	X           float64   `json:"x"`
	Y           float64   `json:"y"`
	W           float64   `json:"w"`
	H           float64   `json:"h"`
	Value       string    `json:"value,omitempty"`
	FontSize    float64   `json:"font_size,omitempty"`
	Bold        bool      `json:"bold,omitempty"`
	Align       string    `json:"align,omitempty"`  // left | center | right
	Color       string    `json:"color,omitempty"`  // hex like "#000000"
	BarcodeType string    `json:"barcode_type,omitempty"` // code128 | code39 | ean13
	LineWidth   float64   `json:"line_width,omitempty"`   // mm;仅 line_h/line_v/rect 使用,与前端 line_width 对齐
}

// RenderRequest is the JSON body for /api/preview and /api/pdf.
//
// Values is kept for backward-compatible payload shape; blocks now carry
// their own value via Block.Value, so the map is allowed to be empty.
type RenderRequest struct {
	Template Template          `json:"template"`
	Values   map[string]string `json:"values,omitempty"`
}
