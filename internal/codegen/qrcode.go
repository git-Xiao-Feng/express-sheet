package codegen

import (
	"bytes"
	"image/png"

	qrcode "github.com/skip2/go-qrcode"
)

// GenerateQR returns a PNG-encoded QR code image.
func GenerateQR(content string, size int) ([]byte, error) {
	if content == "" {
		content = " "
	}
	if size <= 0 {
		size = 400
	}
	q, err := qrcode.New(content, qrcode.Medium)
	if err != nil {
		return nil, err
	}
	// Force 8-bit RGBA so gofpdf can decode the result at any scale.
	img := ToNRGBA(q.Image(size))
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
