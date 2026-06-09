# internal/pdfgen 经验

- 渲染入口 `Generate(tpl, values, fontBytes)`,遍历 `tpl.Blocks` 调 `drawBlock`
- `drawBlock` switch 现已覆盖 8 个 BlockType,新增 `drawTextV` / `drawLineH` / `drawLineV` / `drawBarcodeV`;`drawRect` 走 `pdf.Rect(..., "D")` 仅描边(空心矩形框),`SetDrawColor` + `SetLineWidth(0.2)` 与 drawLineH/drawLineV 风格一致
- 不再有 `drawBorder` / `b.Border` 概念:边框需求改用 `line_h` / `line_v` / `rect` 三种独立元素表达
- 条形码用 codegen 包生成 PNG 后通过 gofpdf RegisterImageOptionsReader + Image 注入
- 二维码按 bounding box 短边居中
- 颜色统一走 `parseColor(hex)`,无 `#` 6 位 hex 默认 0/0/0
- `drawLineH` / `drawLineV` 走 `pdf.SetDrawColor` + `pdf.SetLineWidth(0.2)`(沿用 gofpdf 默认 0.2mm),`pdf.Line(x1,y1,x2,y2)` 取 bbox 中线
- `drawTextV` 用 `pdf.MultiCell(w, lineH, char, "", "C", false)` 逐字符堆叠;`lineH = b.FontSize * 0.4`(pt → mm 近似),超出 bbox 自动 break
- `drawBarcodeV` 是「绕 bbox 中心逆时针旋转 90°」:旋转前图像宽 b.H、高 b.W 中心对齐到 (cx,cy),旋转后正好覆盖整个 bbox。注意:旋转后条形码语义不再可扫码(条方向变了),仅作视觉元素
- gofpdf 的 `TransformRotate(angle, x, y)` 内部把 (x, y) 从 top-left mm 换算到 PDF bottom-left 坐标后再做矩阵乘法,旋转中心是传入的 (x, y) 本身;调用时直接传 top-left mm 即可
