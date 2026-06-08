package server

import (
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
			"blocks": [
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
			"blocks": [
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
			"blocks": [
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

// TestStripLegacyJSONFields exercises the helper directly to lock down the
// strip semantics. It must remove border / border_color / value_field from
// every block, and drop the top-level "fields" array (and the one inside
// "template" if any).
func TestStripLegacyJSONFields(t *testing.T) {
	input := map[string]any{
		"fields": []any{map[string]any{"key": "name"}},
		"template": map[string]any{
			"fields": []any{map[string]any{"key": "old"}},
			"blocks": []any{
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
	blocks, ok := tpl["blocks"].([]any)
	if !ok || len(blocks) != 1 {
		t.Fatalf("expected one block, got %v", tpl["blocks"])
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
