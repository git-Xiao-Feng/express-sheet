# internal/server 经验

- 路由用 `http.ServeMux` + `mux.HandleFunc("METHOD /path", h.fn)` 的 Go 1.22+ 语法
- 静态资源通过 `//go:embed web` 注入到 main,`fs.Sub(h.WebFS, "web")` 子化后挂 `/static/`
- `/api/pdf` 请求体走「strip → 严格解析 → validate」三段式:
  1. `json.Unmarshal(body, &raw)` 读到 `any`(`map[string]any` / `[]any`)
  2. `stripLegacyJSONFields(raw)` 递归删除 `border` / `border_color` / `value_field` 以及值为数组的 `fields`
  3. `json.Marshal(raw)` 重新编码,再用 `Decoder.DisallowUnknownFields()` 严格解析
  这套流程保证旧模板兼容(200)同时真正的拼写错误(例如 `borderr`)仍被 400 拦截
- 旧的 `type` 字符串(`text` / `barcode`)不在后端做映射 —— 前端 `stripLegacyFields` 已转成 `text_h` / `barcode_h`;后端遇到未识别 `type` 一律 400
- `validate(t *Template)` 已支持 8 种 BlockType 常量,默认分支错误信息含「不支持的类型」,沿用 `html.EscapeString` 防 XSS
- `index.html` 在返回前用 `versionTag` 替换 `app.js` / `style.css` 的 query string,避免浏览器缓存
- 错误统一 `writeError(w, code, msg)`,内部用 `html.EscapeString` 防 XSS
