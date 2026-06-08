// Package pdfgen converts a Template into a PDF byte stream.
package pdfgen

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/jung-kurt/gofpdf"

	"github.com/xfeng/express-sheet/internal/codegen"
	"github.com/xfeng/express-sheet/internal/template"
)

// Generate produces a PDF byte stream for the given template.
//
// values is accepted for backward-compatible payload shape; blocks read
// their content from Block.Value and the map is otherwise ignored.
func Generate(tpl template.Template, values map[string]string, fontBytes []byte) ([]byte, error) {
	_ = values
	// Size format name must be a gofpdf standard size (A4/Legal/...) or
	// empty. We always add a page via AddPageFormat with the custom mm
	// dimensions, so any placeholder works; "" is the most explicit.
	pdf := gofpdf.New("P", "mm", "", "")
	pdf.SetMargins(0, 0, 0)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPageFormat("P", gofpdf.SizeType{Wd: tpl.Page.WidthMM, Ht: tpl.Page.HeightMM})

	if len(fontBytes) > 0 {
		pdf.AddUTF8FontFromBytes("simhei", "", fontBytes)
	} else {
		pdf.SetFont("Helvetica", "", 12)
	}

	for _, b := range tpl.Blocks {
		if err := drawBlock(pdf, b, fontBytes); err != nil {
			return nil, fmt.Errorf("绘制区块 %s 失败: %w", b.ID, err)
		}
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func drawBlock(pdf *gofpdf.Fpdf, b template.Block, fontBytes []byte) error {
	if b.W <= 0 || b.H <= 0 {
		return nil
	}
	switch b.Type {
	case template.BlockTextH:
		return drawText(pdf, b, fontBytes)
	case template.BlockTextV:
		return drawTextV(pdf, b, fontBytes)
	case template.BlockLineH:
		return drawLineH(pdf, b)
	case template.BlockLineV:
		return drawLineV(pdf, b)
	case template.BlockRect:
		return drawRect(pdf, b)
	case template.BlockBarcodeH:
		return drawBarcode(pdf, b)
	case template.BlockBarcodeV:
		return drawBarcodeV(pdf, b)
	case template.BlockQRCode:
		return drawQRCode(pdf, b)
	}
	return nil
}

func drawRect(pdf *gofpdf.Fpdf, b template.Block) error {
	r, g, bb := parseColor(b.Color)
	pdf.SetFillColor(r, g, bb)
	// 第四个参数 "F" = filled;若用户希望仅描边可加 border:false 时切到 "D"
	pdf.Rect(b.X, b.Y, b.W, b.H, "F")
	return nil
}

// drawLineH 在 bbox 水平中线处绘制一条水平线。
// 用 SetLineWidth(0.2) 沿用 gofpdf 默认线宽,便于将来按 Color/线宽扩展。
func drawLineH(pdf *gofpdf.Fpdf, b template.Block) error {
	r, g, bb := parseColor(b.Color)
	pdf.SetDrawColor(r, g, bb)
	pdf.SetLineWidth(0.2)
	pdf.Line(b.X, b.Y+b.H/2, b.X+b.W, b.Y+b.H/2)
	return nil
}

// drawLineV 在 bbox 垂直中线处绘制一条垂直线。
func drawLineV(pdf *gofpdf.Fpdf, b template.Block) error {
	r, g, bb := parseColor(b.Color)
	pdf.SetDrawColor(r, g, bb)
	pdf.SetLineWidth(0.2)
	pdf.Line(b.X+b.W/2, b.Y, b.X+b.W/2, b.Y+b.H)
	return nil
}

func drawText(pdf *gofpdf.Fpdf, b template.Block, fontBytes []byte) error {
	if len(fontBytes) > 0 {
		pdf.SetFont("simhei", "", b.FontSize)
	} else {
		style := ""
		if b.Bold {
			style = "B"
		}
		pdf.SetFont("Helvetica", style, b.FontSize)
	}
	r, g, bb := parseColor(b.Color)
	pdf.SetTextColor(r, g, bb)

	align := strings.ToLower(b.Align)
	switch align {
	case "center":
		pdf.SetXY(b.X, b.Y)
		pdf.CellFormat(b.W, b.H, b.Value, "", 0, "C", false, 0, "")
	case "right":
		pdf.SetXY(b.X, b.Y)
		pdf.CellFormat(b.W, b.H, b.Value, "", 0, "R", false, 0, "")
	default:
		pdf.SetXY(b.X, b.Y)
		pdf.CellFormat(b.W, b.H, b.Value, "", 0, "L", false, 0, "")
	}
	return nil
}

// drawTextV 把 b.Value 的字符按行从上到下堆叠为一列(竖排文字)。
// 每个字符用 MultiCell 单独绘制;行高取字号 * 0.4(≈ pt → mm 换算的近似),
// 超出 bbox 底部的字符自动丢弃。
func drawTextV(pdf *gofpdf.Fpdf, b template.Block, fontBytes []byte) error {
	if len(fontBytes) > 0 {
		pdf.SetFont("simhei", "", b.FontSize)
	} else {
		style := ""
		if b.Bold {
			style = "B"
		}
		pdf.SetFont("Helvetica", style, b.FontSize)
	}
	r, g, bb := parseColor(b.Color)
	pdf.SetTextColor(r, g, bb)
	lineH := b.FontSize * 0.4
	for i, ch := range b.Value {
		yy := b.Y + float64(i)*lineH
		if yy+lineH > b.Y+b.H+1e-9 {
			break
		}
		pdf.SetXY(b.X, yy)
		// MultiCell 第 6 个参数 fill=false;align 居中使单字符在列内水平居中。
		pdf.MultiCell(b.W, lineH, string(ch), "", "C", false)
	}
	return nil
}

func drawBarcode(pdf *gofpdf.Fpdf, b template.Block) error {
	content := b.Value
	w := int(b.W * 32)
	h := int(b.H * 32)
	pngBytes, err := codegen.GenerateBarcode(content, b.BarcodeType, w, h)
	if err != nil {
		return err
	}
	name := fmt.Sprintf("barcode_%s", b.ID)
	pdf.RegisterImageOptionsReader(name, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, bytes.NewReader(pngBytes))
	pdf.Image(name, b.X, b.Y, b.W, b.H, false, "PNG", 0, "")
	return nil
}

// drawBarcodeV 与 drawBarcode 共用 PNG 生成,只是把图像绕 bbox 中心
// 逆时针旋转 90° 后再贴回 bbox:在旋转前的坐标系中,图像宽 b.H(原高)、
// 高 b.W(原宽),中心与 bbox 中心对齐;旋转 90° 后,图像的四个角
// 正好落在 (b.X, b.Y) / (b.X+b.W, b.Y) / (b.X+b.W, b.Y+b.H) / (b.X, b.Y+b.H),
// 即完全覆盖 bbox。视觉上条形码的"条"由原横向变为纵向,呈现为竖向条码。
// 注意:旋转后的条形码并非可扫码内容(条码方向敏感),仅作视觉元素,
// 与前端 barcode_v 的旋转行为保持一致。
func drawBarcodeV(pdf *gofpdf.Fpdf, b template.Block) error {
	content := b.Value
	w := int(b.W * 32)
	h := int(b.H * 32)
	pngBytes, err := codegen.GenerateBarcode(content, b.BarcodeType, w, h)
	if err != nil {
		return err
	}
	name := fmt.Sprintf("barcode_v_%s", b.ID)
	pdf.RegisterImageOptionsReader(name, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, bytes.NewReader(pngBytes))
	pdf.TransformBegin()
	cx := b.X + b.W/2
	cy := b.Y + b.H/2
	pdf.TransformRotate(90, cx, cy)
	// 旋转前坐标系里,图像宽 b.H、高 b.W,中心对齐到 (cx, cy)
	pdf.Image(name, cx-b.H/2, cy-b.W/2, b.H, b.W, false, "PNG", 0, "")
	pdf.TransformEnd()
	return nil
}

func drawQRCode(pdf *gofpdf.Fpdf, b template.Block) error {
	content := b.Value
	side := int(b.W * 8)
	if int(b.H*8) < side {
		side = int(b.H * 8)
	}
	pngBytes, err := codegen.GenerateQR(content, side)
	if err != nil {
		return err
	}
	name := fmt.Sprintf("qrcode_%s", b.ID)
	pdf.RegisterImageOptionsReader(name, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, bytes.NewReader(pngBytes))
	// Centre inside the bounding box.
	sideMM := b.W
	if b.H < sideMM {
		sideMM = b.H
	}
	ox := b.X + (b.W-sideMM)/2
	oy := b.Y + (b.H-sideMM)/2
	pdf.Image(name, ox, oy, sideMM, sideMM, false, "PNG", 0, "")
	return nil
}

func parseColor(hex string) (int, int, int) {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) != 6 {
		return 0, 0, 0
	}
	var r, g, b int
	_, _ = fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	return r, g, b
}
