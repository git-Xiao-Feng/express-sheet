// Package codegen produces barcode and QR-code PNG images.
package codegen

import (
	"bytes"
	"image"
	"image/draw"
	"image/png"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
	"github.com/boombuler/barcode/code39"
	"github.com/boombuler/barcode/ean"
)

// GenerateBarcode returns a PNG-encoded barcode image.
//
// kind: "code128" (default) | "code39" | "ean13"
func GenerateBarcode(content, kind string, w, h int) ([]byte, error) {
	if content == "" {
		content = " "
	}
	var c barcode.Barcode
	var err error
	switch kind {
	case "code39":
		c, err = code39.Encode(content, true, true)
	case "ean13":
		c, err = ean.Encode(content)
	default:
		c, err = code128.Encode(content)
	}
	if err != nil {
		return nil, err
	}
	if w <= 0 {
		w = 400
	}
	if h <= 0 {
		h = 200
	}
	c, err = barcode.Scale(c, w, h)
	if err != nil {
		return nil, err
	}
	// Force 8-bit RGBA so gofpdf accepts the result regardless of scale.
	img := ToNRGBA(c)
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ToNRGBA converts any image.Image to 8-bit NRGBA so downstream consumers
// (gofpdf) can decode the resulting PNG. boombuler/barcode's high-res
// Scale() output is 16-bit which gofpdf rejects.
func ToNRGBA(src image.Image) *image.NRGBA {
	if img, ok := src.(*image.NRGBA); ok {
		return img
	}
	b := src.Bounds()
	out := image.NewNRGBA(b)
	draw.Draw(out, b, src, b.Min, draw.Src)
	return out
}
