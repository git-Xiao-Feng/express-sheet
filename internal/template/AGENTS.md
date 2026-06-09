# internal/template 经验

- `BlockType` 是字符串别名,常量值就是前端 JSON 里的 `"type"` 字段值
- 当前 8 个常量:`BlockTextH/V`、`BlockLineH/V`、`BlockRect`(rect)、`BlockBarcodeH/V`、`BlockQRCode`(qrcode)
- `Block` 结构体不含 `Border` / `BorderColor`(边框由 `line_h` / `line_v` / `rect` 元素替代)
- 修改此包时,务必同步检查 `internal/pdfgen/generator.go` 与 `internal/server/server.go`,因为它们都引用 `BlockType` 常量与 `Block` 字段
- `Template.Blocks` 的 JSON tag 是 `"elements"`(US-009 改,与前端 `state.template.elements` 对齐),Go 字段名仍是 `Blocks`(Go 约定,不动);改这个 JSON tag 时要同步更新 `internal/assets/default_template.json` 的数组 key + `internal/server/server_test.go` 里所有 `"blocks":` 字面量为 `"elements":`,否则 defaultTemplate 解析或 e2e 测试会失败
- `RenderRequest.Values` 保留仅为向后兼容,实际渲染读 `Block.Value`
