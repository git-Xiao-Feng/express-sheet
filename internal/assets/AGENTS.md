# internal/assets 经验

- `//go:embed simhei.ttf` / `//go:embed default_template.json` 把资源嵌进二进制,改文件后必须重新 `go build` 才能生效
- `default_template.json` 的 **顶层数组 key 是 `elements`**(US-009 与后端 `Template.Blocks` 的 JSON tag 对齐),`elements` **必须用 8 种新 type**(`text_h` / `text_v` / `line_h` / `line_v` / `rect` / `barcode_h` / `barcode_v` / `qrcode`);旧 `text` / `barcode` 在 `internal/server/validate` 会被 400 拒绝(US-003)
- **边框需求一律用 `rect` 元素表达**,不要给 block 加 `border` / `border_color` 字段 —— `Block` 结构体已删这两个字段,前端 `stripLegacyFields` 与后端 `stripLegacyJSONFields` 都会把旧 JSON 里的 `border` 字段 strip 掉
- `b_fraction_box` 之类的「先画框后画字」必须把 `rect` 元素排在目标文字元素**之前**(生成器按 blocks 顺序绘制),否则矩形会盖住文字
- 资源是只读字节,运行时不要尝试 unmarshal/marshal 修改;需要变更就改源 JSON 后重新 build
