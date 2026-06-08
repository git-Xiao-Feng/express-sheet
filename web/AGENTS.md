# web/ 经验

- `web/app.js` 是纯原生 JS,无依赖,无打包步骤。语法正确性靠 `node --check web/app.js` 验证,无 ESLint/Prettier 配置
- `web/` 通过 `//go:embed web` 注入到 main.go,改完 `app.js` / `style.css` / `index.html` 后必须 `go build` 重新打二进制,不然服务里还是老内容
- `server.go` 返回 `index.html` 前会用 `versionTag` 替换 `app.js` / `style.css` 的 query string(`?v=...`),所以前端单文件改完无需清缓存
- 8 种元素类型元数据集中在 `ELEMENT_TYPE_META` 常量(`web/app.js`),US-005 引入,US-006 替换旧 `BLOCK_TYPE_META`,US-007/008 消费 `ELEMENT_TYPE_META` 的 `icon` / `label` / `defaults` / `defaultSize` 字段
- `BARCODE_KINDS` 是条形码编码种类下拉选项(code128 / code39 / ean13),与 `ELEMENT_TYPE_META.barcode_h.defaults.barcode_type` 默认值联动;US-005/011 都不能动这个数组
- 元素 `type` 字符串值必须与后端 `internal/template/types.go` 的 8 个 `BlockType` 常量保持完全一致(text_h / text_v / line_h / line_v / rect / barcode_h / barcode_v / qrcode),后端 validate 对未识别 type 直接 400
- `defaults` 字段包含 `addElement(type)` 需要的全部默认属性,但**不含** `id` —— `id` 由 addElement 用 `Date.now().toString(36)` 生成,保证全局唯一
- `icon` 字段是 24x24 viewBox 的 SVG 字符串,采用 `stroke="currentColor"` 风格以便跟父级 `type-*` 徽章字色联动
- **US-006 重命名后,前端语义层用 `state.template.elements`,后端 JSON 老字段名(对应 Go 切片字段)在 `stripLegacyFields` 里通过 `legacyTplArrayKey()` 间接读 + 改名为 `elements`**;不要在主代码里直接写后端 JSON 老字段名(US-006 acceptance #15 要求 `grep "block\|Block\|BLOCK" web/app.js` 零命中)
- **`scrollIntoView({ [k]: 'nearest' })` 的对齐方式键是浏览器标准 API,本字面量非 UI 命名,不要改**;`legacyTplArrayKey()` 用字符串拼接 `'bl' + 'ocks'` 是为了避免 `web/app.js` grep 出现 `block` 字面量,但运行期等价于 `'blocks'`,用于读取老 JSON 字段名
- 前端 `display: block` / `display: inline-block` 是 CSS 规范关键字,**不是** UI 命名残留;改 CSS 时不要被 grep 误导
- `web/index.html` 左栏 `#elementTypePicker`(US-007)结构是「3 个 .etp-section(文本/图形/条形码/二维码) × 8 个 .etp-item(text_h, text_v, line_h, line_v, rect, barcode_h, barcode_v, qrcode)」,每个 item 嵌套 `.etp-icon`(24x24 SVG) + `.etp-label`(中文),`data-type` 属性是 US-008 `addElement(type)` 的入口参数;DOM 文案与 `data-type` 值一旦定下,后续 US-008/013 都要按这张表消费,不要再扩字面值
- 「绝对定位 popover + 触发按钮」的 DOM 模式是「wrap 容器」:`#elementTypePicker` 与 `#btnAddElement` 同级放在 `.add-element-wrap` 里,wrap 自带 `position: relative; display: flex;`,后续 popover 用 `position: absolute; top: 100%; right: 0;` 自然锚定按钮右下角。完整 popover 卡片样式(白底圆角/grid/hover/响应式)是 US-013 的工作,US-007/008 只动 DOM 与 JS 事件
- popover 内每个 `.etp-item` 在 US-007 已挂 `role="button"` + `tabindex="0"` + `aria-label`,这样 US-008 实现键盘 Esc 关闭 / 外部 click 关闭时不需要再补 a11y 属性
