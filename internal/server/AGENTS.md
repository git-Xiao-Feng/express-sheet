# internal/server 经验

- 路由用 `http.ServeMux` + `mux.HandleFunc("METHOD /path", h.fn)` 的 Go 1.22+ 语法
- 静态资源通过 `//go:embed web` 注入到 main,`fs.Sub(h.WebFS, "web")` 子化后挂 `/static/`
- `/api/pdf` 请求体用 `json.Decoder.DisallowUnknownFields()` 严格解析,旧字段必须先 strip(US-003 才实现 decodeRenderRequest 的 strip 步骤)
- `validate(t *Template)` 当前只接 4 种 type 常量,US-003 会扩展到 8 种
- `index.html` 在返回前用 `versionTag` 替换 `app.js` / `style.css` 的 query string,避免浏览器缓存
- 错误统一 `writeError(w, code, msg)`,内部用 `html.EscapeString` 防 XSS
