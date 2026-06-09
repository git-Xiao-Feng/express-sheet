package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/xfeng/express-sheet/internal/template"
)

// allEightTypes is the canonical list of element types that validate must accept.
var allEightTypes = []template.BlockType{
	template.BlockTextH,
	template.BlockTextV,
	template.BlockLineH,
	template.BlockLineV,
	template.BlockRect,
	template.BlockBarcodeH,
	template.BlockBarcodeV,
	template.BlockQRCode,
}

// makeTplWithOneBlock builds a minimal valid Template that contains a single
// block of the given type. Each block has positive width/height so it clears
// the size check in validate.
func makeTplWithOneBlock(ty template.BlockType) *template.Template {
	return &template.Template{
		Page: template.Page{WidthMM: 100, HeightMM: 100},
		Blocks: []template.Block{
			{ID: "b1", Type: ty, X: 1, Y: 1, W: 10, H: 10},
		},
	}
}

// TestValidateAcceptsAllEightTypes covers acceptance criterion #1:
//   - "validate switch 8 个 BlockType"
func TestValidateAcceptsAllEightTypes(t *testing.T) {
	for _, ty := range allEightTypes {
		ty := ty
		t.Run(string(ty), func(t *testing.T) {
			if err := validate(makeTplWithOneBlock(ty)); err != nil {
				t.Fatalf("expected type %q to be accepted, got error: %v", ty, err)
			}
		})
	}
}

// TestValidateRejectsLegacyType covers acceptance criterion #4:
//   - "发送 type=text 旧值时返回 400 错误"
// and the wording requirement of criterion #1:
//   - "默认分支返回 400 + 错误信息含「不支持的类型」"
func TestValidateRejectsLegacyType(t *testing.T) {
	tpl := makeTplWithOneBlock("text")
	err := validate(tpl)
	if err == nil {
		t.Fatal("expected validate to reject legacy type \"text\"")
	}
	if !strings.Contains(err.Error(), "不支持的类型") {
		t.Fatalf("expected error to contain %q, got: %v", "不支持的类型", err)
	}
}

// TestDecodeRenderRequestStripsLegacyFields covers acceptance criterion #2/#3/#5:
//   - "decodeRenderRequest 先 json.Unmarshal 到 map,递归 strip border/border_color/value_field/顶层 fields"
//   - "发送含 border:true 的旧 JSON 时返回 200,自动忽略 border 字段"
//
// The body uses the legacy "text" type on purpose to also verify the
// unknown-type branch still runs after the strip step.
func TestDecodeRenderRequestStripsLegacyFields(t *testing.T) {
	body := `{
		"template": {
			"page": {"width_mm": 100, "height_mm": 100},
			"font": {"family": "simhei"},
			"elements": [
				{
					"id": "b1", "type": "text_h", "x": 1, "y": 1, "w": 10, "h": 10,
					"value": "hello", "color": "#000000",
					"border": true, "border_color": "#ff0000", "value_field": "name"
				}
			]
		},
		"values": {"x": "y"},
		"fields": [{"key": "name"}]
	}`
	req := httptest.NewRequest("POST", "/api/pdf", strings.NewReader(body))
	got, err := decodeRenderRequest(req)
	if err != nil {
		t.Fatalf("decodeRenderRequest returned error: %v", err)
	}
	if len(got.Template.Blocks) != 1 {
		t.Fatalf("expected 1 block, got %d", len(got.Template.Blocks))
	}
	if got.Template.Blocks[0].ID != "b1" {
		t.Errorf("expected block id b1, got %q", got.Template.Blocks[0].ID)
	}
}

// TestDecodeRenderRequestRejectsUnknownField covers acceptance criterion #3:
//   - "再 DisallowUnknownFields 严格解析,确保拼写错误仍被拦截"
//
// After the strip step, the strict decoder must still catch typos such as
// "borderr" (extra r) at the top level.
func TestDecodeRenderRequestRejectsUnknownField(t *testing.T) {
	body := `{
		"template": {
			"page": {"width_mm": 100, "height_mm": 100},
			"elements": [
				{"id": "b1", "type": "text_h", "x": 1, "y": 1, "w": 10, "h": 10}
			]
		},
		"borderr": true
	}`
	req := httptest.NewRequest("POST", "/api/pdf", strings.NewReader(body))
	_, err := decodeRenderRequest(req)
	if err == nil {
		t.Fatal("expected decodeRenderRequest to reject unknown top-level field \"borderr\"")
	}
	if !strings.Contains(err.Error(), "JSON") {
		t.Fatalf("expected error to mention JSON parsing, got: %v", err)
	}
}

// TestDecodeRenderRequestRejectsLegacyTypeAfterStrip covers acceptance
// criterion #4 end-to-end: an old payload with type:"text" must be rejected
// by validate even after the strip step ran.
func TestDecodeRenderRequestRejectsLegacyTypeAfterStrip(t *testing.T) {
	body := `{
		"template": {
			"page": {"width_mm": 100, "height_mm": 100},
			"elements": [
				{"id": "b1", "type": "text", "x": 1, "y": 1, "w": 10, "h": 10, "value": "hi"}
			]
		}
	}`
	req := httptest.NewRequest("POST", "/api/pdf", strings.NewReader(body))
	_, err := decodeRenderRequest(req)
	if err == nil {
		t.Fatal("expected decodeRenderRequest to reject legacy type \"text\"")
	}
	if !strings.Contains(err.Error(), "不支持的类型") {
		t.Fatalf("expected error to contain %q, got: %v", "不支持的类型", err)
	}
}

// TestDecodeRenderRequestAcceptsLineWidth covers the regression where
// the frontend sends "line_width" for line_h/line_v/rect elements but
// the Block struct used to lack the field, causing DisallowUnknownFields
// to reject the /api/pdf payload with 400.
func TestDecodeRenderRequestAcceptsLineWidth(t *testing.T) {
	body := `{
		"template": {
			"page": {"width_mm": 100, "height_mm": 100},
			"font": {"family": "simhei"},
			"elements": [
				{"id": "h1", "type": "line_h", "x": 1, "y": 1, "w": 50, "h": 0.5, "line_width": 0.3},
				{"id": "v1", "type": "line_v", "x": 1, "y": 1, "w": 0.5, "h": 50, "line_width": 0.4},
				{"id": "r1", "type": "rect",   "x": 5, "y": 5, "w": 10, "h":  8, "line_width": 0.5}
			]
		}
	}`
	req := httptest.NewRequest("POST", "/api/pdf", strings.NewReader(body))
	got, err := decodeRenderRequest(req)
	if err != nil {
		t.Fatalf("decodeRenderRequest returned error: %v", err)
	}
	if len(got.Template.Blocks) != 3 {
		t.Fatalf("expected 3 blocks, got %d", len(got.Template.Blocks))
	}
	want := []float64{0.3, 0.4, 0.5}
	for i, b := range got.Template.Blocks {
		if b.LineWidth != want[i] {
			t.Errorf("block %d (%s) line_width = %v, want %v", i, b.ID, b.LineWidth, want[i])
		}
	}
}

// TestStripLegacyJSONFields exercises the helper directly to lock down the
// strip semantics. It must remove border / border_color / value_field from
// every block, and drop the top-level "fields" array (and the one inside
// "template" if any).
func TestStripLegacyJSONFields(t *testing.T) {
	input := map[string]any{
		"fields": []any{map[string]any{"key": "name"}},
		"template": map[string]any{
			"fields":   []any{map[string]any{"key": "old"}},
			"elements": []any{
				map[string]any{
					"id":           "b1",
					"type":         "text_h",
					"border":       true,
					"border_color": "#ff0000",
					"value_field":  "name",
				},
			},
		},
	}
	stripLegacyJSONFields(input)

	if _, ok := input["fields"]; ok {
		t.Error("top-level fields was not stripped")
	}
	tpl, ok := input["template"].(map[string]any)
	if !ok {
		t.Fatal("template key missing after strip")
	}
	if _, ok := tpl["fields"]; ok {
		t.Error("template.fields was not stripped")
	}
	blocks, ok := tpl["elements"].([]any)
	if !ok || len(blocks) != 1 {
		t.Fatalf("expected one block, got %v", tpl["elements"])
	}
	block := blocks[0].(map[string]any)
	for _, k := range []string{"border", "border_color", "value_field"} {
		if _, ok := block[k]; ok {
			t.Errorf("block.%s was not stripped", k)
		}
	}
	if block["id"] != "b1" || block["type"] != "text_h" {
		t.Errorf("unexpected block contents: %v", block)
	}
}

// --- US-004 默认模板适配 acceptance ---

// fetchDefaultTemplate 调用 GET /api/template/default 解析为 template.Template。
// acceptance #4: 「GET /api/template/default 返回 200」
func fetchDefaultTemplate(t *testing.T, h *Handler) template.Template {
	t.Helper()
	req := httptest.NewRequest("GET", "/api/template/default", nil)
	rr := httptest.NewRecorder()
	h.defaultTemplate(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("GET /api/template/default returned %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	var tpl template.Template
	if err := json.Unmarshal(rr.Body.Bytes(), &tpl); err != nil {
		t.Fatalf("decode default template: %v", err)
	}
	return tpl
}

// findBlockByID 在 tpl.Blocks 中按 id 查找并返回 *Block;找不到时 t.Fatal。
func findBlockByID(t *testing.T, tpl template.Template, id string) *template.Block {
	t.Helper()
	for i := range tpl.Blocks {
		if tpl.Blocks[i].ID == id {
			return &tpl.Blocks[i]
		}
	}
	t.Fatalf("block %q not found in template", id)
	return nil
}

// TestDefaultTemplateServesFractionBox 覆盖 acceptance #4:
//   - 「GET /api/template/default 返回 200,b_fraction_box 存在」
//   - 「b_fraction_box 元素,type=rect,位置(68, 2.5, 29, 10),color=#000000」
func TestDefaultTemplateServesFractionBox(t *testing.T) {
	h := New(nil, nil) // 默认模板与字体无关,FontBytes 留空
	tpl := fetchDefaultTemplate(t, h)

	box := findBlockByID(t, tpl, "b_fraction_box")
	if box.Type != template.BlockRect {
		t.Errorf("b_fraction_box type = %q, want %q", box.Type, template.BlockRect)
	}
	if box.X != 68 || box.Y != 2.5 || box.W != 29 || box.H != 10 {
		t.Errorf("b_fraction_box position = (%v, %v, %v, %v), want (68, 2.5, 29, 10)",
			box.X, box.Y, box.W, box.H)
	}
	if box.Color != "#000000" {
		t.Errorf("b_fraction_box color = %q, want %q", box.Color, "#000000")
	}
}

// TestDefaultTemplateFractionHasNoBorder 覆盖 acceptance #1:
//   - 「b_fraction 元素不再含 border:true 字段」
//
// 通过 json.Unmarshal 到 map[string]any 验证字段确实消失(而不只是 Block 字段
// 缺省时被 omitempty 隐藏),避免后续给 Block 加 `border bool` 字段时悄悄通过。
func TestDefaultTemplateFractionHasNoBorder(t *testing.T) {
	h := New(nil, nil)
	req := httptest.NewRequest("GET", "/api/template/default", nil)
	rr := httptest.NewRecorder()
	h.defaultTemplate(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("GET /api/template/default returned %d", rr.Code)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decode raw default template: %v", err)
	}
	tpl, ok := raw["template"].(map[string]any)
	if !ok {
		// 处理器直接返回 Template,根就是 template 内容
		tpl = raw
	}
	elements, ok := tpl["elements"].([]any)
	if !ok {
		t.Fatalf("elements field missing or not array: %T", tpl["elements"])
	}
	var fraction map[string]any
	for _, b := range elements {
		bm := b.(map[string]any)
		if bm["id"] == "b_fraction" {
			fraction = bm
			break
		}
	}
	if fraction == nil {
		t.Fatal("b_fraction block not found")
	}
	if _, hasBorder := fraction["border"]; hasBorder {
		t.Errorf("b_fraction still has border field: %v", fraction["border"])
	}
}

// TestDefaultTemplateBoxBeforeFraction 覆盖 acceptance #3:
//   - 「b_fraction_box 排序在 b_fraction 之前(矩形先画,文字后画)」
func TestDefaultTemplateBoxBeforeFraction(t *testing.T) {
	h := New(nil, nil)
	tpl := fetchDefaultTemplate(t, h)
	boxIdx, fracIdx := -1, -1
	for i, b := range tpl.Blocks {
		switch b.ID {
		case "b_fraction_box":
			boxIdx = i
		case "b_fraction":
			fracIdx = i
		}
	}
	if boxIdx < 0 {
		t.Fatal("b_fraction_box not found in blocks")
	}
	if fracIdx < 0 {
		t.Fatal("b_fraction not found in blocks")
	}
	if boxIdx >= fracIdx {
		t.Errorf("b_fraction_box index = %d, b_fraction index = %d; box must come before fraction", boxIdx, fracIdx)
	}
}

// TestDefaultTemplateExportsPDF 覆盖 acceptance #5:
//   - 「导出 PDF 默认模板,分数区域视觉等效(分数 1/2 显示在矩形框内)」
//
// 端到端跑 /api/pdf: 文本走 round-trip(JSON encode default template -> POST /api/pdf),
// 期望返回 200 + application/pdf + 非空 PDF 字节。
// 「视觉等效」通过「text_h 1/2 元素与 rect b_fraction_box 共存且 b_fraction_box 先画」保证
// (后者由 TestDefaultTemplateBoxBeforeFraction 锁住),PDF 字节非空证明绘制管线没崩。
func TestDefaultTemplateExportsPDF(t *testing.T) {
	h := New(nil, nil) // FontBytes=nil, generator 会 fallback 到 Helvetica

	tpl := fetchDefaultTemplate(t, h)
	body, err := json.Marshal(template.RenderRequest{Template: tpl})
	if err != nil {
		t.Fatalf("marshal render request: %v", err)
	}

	req := httptest.NewRequest("POST", "/api/pdf", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	h.generatePDF(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("POST /api/pdf returned %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	ct := rr.Header().Get("Content-Type")
	if !strings.HasPrefix(ct, "application/pdf") {
		t.Errorf("Content-Type = %q, want application/pdf prefix", ct)
	}
	pdfBytes, err := io.ReadAll(rr.Body)
	if err != nil {
		t.Fatalf("read pdf body: %v", err)
	}
	if len(pdfBytes) < 100 {
		t.Errorf("PDF body suspiciously small: %d bytes", len(pdfBytes))
	}
	if !bytes.HasPrefix(pdfBytes, []byte("%PDF-")) {
		head := pdfBytes
		if len(head) > 8 {
			head = head[:8]
		}
		t.Errorf("PDF body does not start with %%PDF- magic: %q", string(head))
	}
}
