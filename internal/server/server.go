// Package server hosts HTTP handlers and the static frontend.
package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/xfeng/express-sheet/internal/codegen"
	"github.com/xfeng/express-sheet/internal/pdfgen"
	"github.com/xfeng/express-sheet/internal/template"
)

// WebFS 由调用方注入(在 main 中通过 //go:embed web 嵌入),
// 让本包不依赖运行目录,二进制可在任意位置运行。
type WebFS interface {
	fs.ReadDirFS
	fs.ReadFileFS
}

// Handler bundles dependencies.
type Handler struct {
	FontBytes []byte
	WebFS     WebFS
}

// New constructs a Handler.
func New(fontBytes []byte, webFS WebFS) *Handler {
	return &Handler{FontBytes: fontBytes, WebFS: webFS}
}

// Register routes onto mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /{$}", h.index)
	staticSub, _ := fs.Sub(h.WebFS, "web")
	mux.Handle("GET /static/", noCache(stripQueryString(http.StripPrefix("/static/", http.FileServer(http.FS(staticSub))))))
	mux.HandleFunc("GET /api/template/default", h.defaultTemplate)
	mux.HandleFunc("POST /api/pdf", h.generatePDF)
	mux.HandleFunc("GET /api/image", h.generateImage)
	mux.HandleFunc("GET /api/health", h.health)
}

// stripQueryString 在转给 FileServer 之前去掉 URL 的查询串,
// 因为我们给 app.js/style.css 注入了 ?v=... 用来强制刷新缓存。
func stripQueryString(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.RawQuery != "" {
			r2 := r.Clone(r.Context())
			r2.URL.RawQuery = ""
			r = r2
		}
		next.ServeHTTP(w, r)
	})
}

// noCache 禁止浏览器缓存静态资源,方便前端改动立即生效。
func noCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		next.ServeHTTP(w, r)
	})
}

// versionTag 会在 index.html 中作为 app.js 的查询串注入,
// 每次重启二进制时 Go 都会重新编译,内嵌的资源 hash 也会变化,这里用构建时间作为版本。
var versionTag = fmt.Sprintf("v=%d", time.Now().Unix())

func (h *Handler) index(w http.ResponseWriter, r *http.Request) {
	body, err := fs.ReadFile(h.WebFS, "web/index.html")
	if err != nil {
		http.Error(w, "index.html not found: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// 给静态资源加版本号,防止浏览器用旧版 app.js
	body = bytes.ReplaceAll(body, []byte("/static/app.js"), []byte("/static/app.js?"+versionTag))
	body = bytes.ReplaceAll(body, []byte("/static/style.css"), []byte("/static/style.css?"+versionTag))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(body)
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) defaultTemplate(w http.ResponseWriter, r *http.Request) {
	var tpl template.Template
	if err := json.Unmarshal(assetsDefaultTemplate(), &tpl); err != nil {
		writeError(w, http.StatusInternalServerError, "默认模板解析失败: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, tpl)
}

func (h *Handler) generatePDF(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRenderRequest(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	pdfBytes, err := pdfgen.Generate(req.Template, req.Values, h.FontBytes)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "PDF 生成失败: "+err.Error())
		return
	}
	filename := fmt.Sprintf("waybill-%s.pdf", time.Now().Format("20060102-150405"))
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(pdfBytes)))
	if _, err := w.Write(pdfBytes); err != nil {
		// Header already sent; nothing to do.
		_ = err
	}
}

func (h *Handler) generateImage(w http.ResponseWriter, r *http.Request) {
	kind := r.URL.Query().Get("type")
	content := r.URL.Query().Get("content")
	bcKind := r.URL.Query().Get("kind")
	if bcKind == "" {
		bcKind = "code128"
	}
	wStr := r.URL.Query().Get("w")
	hStr := r.URL.Query().Get("h")
	imgW := parseIntDefault(wStr, 400)
	imgH := parseIntDefault(hStr, 200)
	var (
		pngBytes []byte
		err      error
	)
	switch kind {
	case "barcode":
		pngBytes, err = codegen.GenerateBarcode(content, bcKind, imgW, imgH)
	case "qrcode":
		size := imgW
		if imgH > size {
			size = imgH
		}
		pngBytes, err = codegen.GenerateQR(content, size)
	default:
		writeError(w, http.StatusBadRequest, "type 必须是 barcode 或 qrcode")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "生成图片失败: "+err.Error())
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(pngBytes)
}

func decodeRenderRequest(r *http.Request) (template.RenderRequest, error) {
	if r.Body == nil {
		return template.RenderRequest{}, fmt.Errorf("请求体为空")
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return template.RenderRequest{}, fmt.Errorf("读取请求体失败: %v", err)
	}
	if len(bytes.TrimSpace(body)) == 0 {
		return template.RenderRequest{}, fmt.Errorf("请求体为空")
	}
	var req template.RenderRequest
	dec := json.NewDecoder(strings.NewReader(string(body)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		return template.RenderRequest{}, fmt.Errorf("JSON 解析失败: %v", err)
	}
	if err := validate(&req.Template); err != nil {
		return template.RenderRequest{}, err
	}
	return req, nil
}

func validate(t *template.Template) error {
	if t.Page.WidthMM <= 0 || t.Page.HeightMM <= 0 {
		return fmt.Errorf("页面尺寸必须大于 0")
	}
	if t.Page.WidthMM > 500 || t.Page.HeightMM > 500 {
		return fmt.Errorf("页面尺寸不能超过 500mm")
	}
	ids := map[string]bool{}
	for i, b := range t.Blocks {
		if b.ID == "" {
			return fmt.Errorf("第 %d 个区块的 id 为空", i+1)
		}
		if ids[b.ID] {
			return fmt.Errorf("区块 id 重复: %s", html.EscapeString(b.ID))
		}
		ids[b.ID] = true
		switch b.Type {
		case template.BlockTextH, template.BlockBarcodeH, template.BlockQRCode, template.BlockRect:
			// ok
		default:
			return fmt.Errorf("第 %d 个区块类型不支持: %s", i+1, html.EscapeString(string(b.Type)))
		}
		if b.W <= 0 || b.H <= 0 {
			return fmt.Errorf("第 %d 个区块尺寸无效 (id=%s)", i+1, b.ID)
		}
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": html.EscapeString(msg)})
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return def
		}
		n = n*10 + int(c-'0')
	}
	if n == 0 {
		return def
	}
	return n
}
