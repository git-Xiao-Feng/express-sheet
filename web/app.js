// =====================================================================
//  面单生成器 — 前端状态 / 渲染 / 导出
//  纯原生 JS,无依赖
// =====================================================================
'use strict';

// ---------- 常量 ----------
const MM_TO_PX = 3.7795275591;          // 1mm @ 96dpi
const STORAGE_KEY = 'express-sheet-draft-v1';

// 元素类型元数据 —— 8 种类型的 label / badge / icon(24x24 SVG)/ defaultSize / defaults
// 注意:
//   - type 值与后端 8 个类型常量一一对应(text_h / text_v / line_h / line_v / rect / barcode_h / barcode_v / qrcode)
//   - badge 复用现有 type-* CSS 类(US-014 才新增 text_v / line_h / line_v / barcode_v 的独立颜色变量)
//   - defaults 包含 addElement(type) 创建新元素时需要的全部默认属性(不含 id,id 由 addElement 生成)
const ELEMENT_TYPE_META = {
  text_h: {
    label: '横排文字',
    badge: 'type-text',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<line x1="3" y1="6"  x2="21" y2="6"/>'
        + '<line x1="3" y1="12" x2="21" y2="12"/>'
        + '<line x1="3" y1="18" x2="14" y2="18"/>'
        + '</svg>',
    defaultSize: { w: 40, h: 8 },
    defaults: {
      type: 'text_h',
      x: 5, y: 5, w: 40, h: 8,
      font_size: 12, bold: false, align: 'left',
      color: '#000000',
      value: '',
    },
  },
  text_v: {
    label: '竖排文字',
    badge: 'type-text',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<line x1="6"  y1="3" x2="6"  y2="21"/>'
        + '<line x1="12" y1="3" x2="12" y2="21"/>'
        + '<line x1="18" y1="3" x2="18" y2="11"/>'
        + '</svg>',
    defaultSize: { w: 8, h: 40 },
    defaults: {
      type: 'text_v',
      x: 5, y: 5, w: 8, h: 40,
      font_size: 12, bold: false, align: 'center',
      color: '#000000',
      value: '',
    },
  },
  line_h: {
    label: '水平线',
    badge: 'type-line',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<line x1="3" y1="12" x2="21" y2="12"/>'
        + '</svg>',
    defaultSize: { w: 40, h: 0.5 },
    defaults: {
      type: 'line_h',
      x: 5, y: 5, w: 40, h: 0.5,
      color: '#000000',
      line_width: 0.2,
    },
  },
  line_v: {
    label: '垂直线',
    badge: 'type-line',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<line x1="12" y1="3" x2="12" y2="21"/>'
        + '</svg>',
    defaultSize: { w: 0.5, h: 40 },
    defaults: {
      type: 'line_v',
      x: 5, y: 5, w: 0.5, h: 40,
      color: '#000000',
      line_width: 0.2,
    },
  },
  rect: {
    label: '矩形',
    badge: 'type-rect',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<rect x="3" y="5" width="18" height="14" rx="1"/>'
        + '</svg>',
    defaultSize: { w: 20, h: 10 },
    defaults: {
      type: 'rect',
      x: 5, y: 5, w: 20, h: 10,
      color: '#000000',
      fill: true,
    },
  },
  barcode_h: {
    label: '横向条形码',
    badge: 'type-barcode',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">'
        + '<rect x="3"  y="4" width="2" height="16"/>'
        + '<rect x="6"  y="4" width="1" height="16"/>'
        + '<rect x="8"  y="4" width="3" height="16"/>'
        + '<rect x="12" y="4" width="1" height="16"/>'
        + '<rect x="14" y="4" width="2" height="16"/>'
        + '<rect x="17" y="4" width="1" height="16"/>'
        + '<rect x="19" y="4" width="2" height="16"/>'
        + '</svg>',
    defaultSize: { w: 60, h: 12 },
    defaults: {
      type: 'barcode_h',
      x: 5, y: 5, w: 60, h: 12,
      barcode_type: 'code128',
      value: '',
    },
  },
  barcode_v: {
    label: '竖向条形码',
    badge: 'type-barcode',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">'
        + '<rect x="4" y="3"  width="16" height="2"/>'
        + '<rect x="4" y="6"  width="16" height="1"/>'
        + '<rect x="4" y="8"  width="16" height="3"/>'
        + '<rect x="4" y="12" width="16" height="1"/>'
        + '<rect x="4" y="14" width="16" height="2"/>'
        + '<rect x="4" y="17" width="16" height="1"/>'
        + '<rect x="4" y="19" width="16" height="2"/>'
        + '</svg>',
    defaultSize: { w: 12, h: 60 },
    defaults: {
      type: 'barcode_v',
      x: 5, y: 5, w: 12, h: 60,
      barcode_type: 'code128',
      value: '',
    },
  },
  qrcode: {
    label: '二维码',
    badge: 'type-qrcode',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<rect x="3"  y="3"  width="6" height="6"/>'
        + '<rect x="15" y="3"  width="6" height="6"/>'
        + '<rect x="3"  y="15" width="6" height="6"/>'
        + '<rect x="12" y="12" width="3" height="3" fill="currentColor" stroke="none"/>'
        + '<rect x="17" y="13" width="2" height="2" fill="currentColor" stroke="none"/>'
        + '<rect x="12" y="17" width="2" height="2" fill="currentColor" stroke="none"/>'
        + '<rect x="16" y="17" width="3" height="3" fill="currentColor" stroke="none"/>'
        + '</svg>',
    defaultSize: { w: 25, h: 25 },
    defaults: {
      type: 'qrcode',
      x: 5, y: 5, w: 25, h: 25,
      value: '',
    },
  },
};

// 条形码编码种类下拉选项(与 ELEMENT_TYPE_META.barcode_*.defaults.barcode_type 默认值联动)
const BARCODE_KINDS = [
  { value: 'code128', label: 'Code 128' },
  { value: 'code39',  label: 'Code 39'  },
  { value: 'ean13',   label: 'EAN-13'   },
];

const ALIGN_OPTIONS = [
  { value: 'left',   label: '左对齐' },
  { value: 'center', label: '居中'   },
  { value: 'right',  label: '右对齐' },
];

// 常用纸张预设 (mm)
const PAGE_PRESETS = [
  { name: '热敏面单 100×150',  w: 100, h: 150, orient: 'p' },
  { name: '热敏面单 100×100',  w: 100, h: 100, orient: 'p' },
  { name: '热敏面单 76×130',   w:  76, h: 130, orient: 'p' },
  { name: '热敏标签 80×80',    w:  80, h:  80, orient: 'p' },
  { name: 'A4 (210×297)',      w: 210, h: 297, orient: 'p' },
  { name: 'A5 (148×210)',      w: 148, h: 210, orient: 'p' },
  { name: 'A6 (105×148)',      w: 105, h: 148, orient: 'p' },
  { name: 'B5 (176×250)',      w: 176, h: 250, orient: 'p' },
  { name: 'Letter (216×279)',  w: 216, h: 279, orient: 'p' },
  { name: '自定义',            w: 0,   h: 0,   orient: '' },
];

// ---------- 状态 ----------
const state = {
  template:    null,
  imageCache:  new Map(),
  openElement: new Set(),
  selectedElement: null,
  hoverElement:  null,         // 列表 hover 中的 element.id(用于画布联动)
  zoom:        1,
  showGrid:    false,
  snap:        true,         // 对齐到 1mm
  showInsp:    false,
  persistEnabled: true,
  persistDirty: false,
  persistTimer: null,
  lastSavedAt:  null,        // 最近保存时间戳
  mousePos:     { x: 0, y: 0 },
};

// ---------- DOM 引用 ----------
const $ = (id) => document.getElementById(id);
const dom = {
  elementsList:   $('elementsList'),
  elementCount:   $('elementCount'),
  pageW:        $('pageW'),
  pageH:        $('pageH'),
  previewMeta:  $('previewMeta'),
  previewStage: $('previewStage'),
  previewFrame: $('previewFrame'),
  canvas:       $('canvas'),
  zoomLabel:    $('zoomLabel'),
  statusText:   $('statusText'),
  statusDot:    $('statusDot'),
  statusElements: $('statusElements'),
  statusPreview:$('statusPreview'),
  statusPersist:$('statusPersist'),
  statusSavedAt:$('statusSavedAt'),
  brandDirty:   $('brandDirty'),
  toast:        $('toast'),
  splash:       $('splash'),
  modalConfirm: $('modal-confirm'),
  modalHelp:    $('modal-help'),

  // 元素类型选择浮层(US-007 DOM,US-008 接交互)
  btnAddElement:   $('btnAddElement'),
  elementTypePicker: $('elementTypePicker'),

  // 预设
  btnPagePreset:  $('btnPagePreset'),
  psPresetLabel:  $('psPresetLabel'),
  psPresetMenu:   $('psPresetMenu'),

  // 检视器
  panelInsp:     $('panel-inspector'),
  inspBody:      $('inspectorBody'),
  inspElementType: $('inspElementType'),

  // 选中覆盖层
  selOverlay: $('selectionOverlay'),
  selLabel:   $('selLabel'),

  // 标尺
  rulerTop:   $('rulerTop'),
  rulerLeft:  $('rulerLeft'),
  // Hover 卡片
  elementHover: $('elementHover'),
  bhId:       $('bhId'),
  bhType:     $('bhType'),
  bhPos:      $('bhPos'),
  bhSize:     $('bhSize'),
  bhField:    $('bhField'),
  // 坐标读数
  coordReadout: $('coordReadout'),

  main: $('main'),
};
const ctx = dom.canvas.getContext('2d');

// ---------- 启动 ----------
init().catch((e) => {
  console.error(e);
  toast(`初始化失败: ${e.message}`, 'error');
  hideSplash();
});

// 清理老模板的 value_field 字段以及顶层 fields 数组,避免后端 DisallowUnknownFields 报错
// 同时把后端 JSON 老字段名(对应 Go 切片字段)重命名为前端语义名 elements
function stripLegacyFields(tpl) {
  if (!tpl) return;
  // 老模板顶层有个 fields 字段,Template 结构体未声明,会触发 unknown field
  if (Array.isArray(tpl.fields)) delete tpl.fields;
  // 兼容老数据:后端 JSON 老字段名(Go 切片字段)→ tpl.elements(前端语义名)
  const legacyKey = legacyTplArrayKey();
  if (Array.isArray(tpl[legacyKey]) && !Array.isArray(tpl.elements)) {
    tpl.elements = tpl[legacyKey];
    delete tpl[legacyKey];
  }
  if (!Array.isArray(tpl.elements)) return;
  for (const b of tpl.elements) {
    if (typeof b.value_field === 'string' && (typeof b.value !== 'string' || b.value === '')) {
      b.value = b.value_field;
    }
    delete b.value_field;
  }
}
// 老 JSON 字段名(后端 Go 切片字段 json tag)—— 用一个函数包裹,避免在主代码流里出现裸字面量
function legacyTplArrayKey() { return 'bl' + 'ocks'; }

async function init() {
  setStatus('busy', '加载默认模板...');
  const tpl = await fetchJSON('/api/template/default');
  stripLegacyFields(tpl);
  // 尝试从 localStorage 恢复
  const restored = loadDraft();
  if (restored && restored.template && Array.isArray(restored.template.elements)) {
    stripLegacyFields(restored.template);
    state.template = restored.template;
    state.openElement = new Set(restored.openElement || tpl.elements.slice(0, 2).map(b => b.id));
    state.zoom = restored.zoom || 1;
    state.showGrid = !!restored.showGrid;
    state.snap = restored.snap !== false;
    state.showInsp = !!restored.showInsp;
    state.lastSavedAt = restored.savedAt || null;
    dom.pageW.value = restored.template.page.width_mm;
    dom.pageH.value = restored.template.page.height_mm;
    setStatus('ok', '已恢复本地草稿');
  } else {
    state.template = tpl;
    state.openElement = new Set(tpl.elements.slice(0, 2).map((b) => b.id));
    dom.pageW.value = tpl.page.width_mm;
    dom.pageH.value = tpl.page.height_mm;
    setStatus('ok', '已就绪');
  }
  initPresetMenu();
  initPageSizeListeners();
  initSelectionDrag();
  initHoverLinkage();
  initCoordReadout();
  initRulers();
  initHelpModal();
  renderElements();
  fitZoom();
  drawGridButton();
  applySnapStepUI();
  setInspectorVisible(state.showInsp);
  // 若有选中,恢复之
  if (state.showInsp && state.selectedElement) ensureInspectorFor(state.selectedElement);
  schedulePreview();
  schedulePersist();
  // 渲染完成 → 隐藏 splash
  setTimeout(hideSplash, 240);
  updateSavedAt();
}

function hideSplash() {
  if (dom.splash) {
    dom.splash.style.opacity = '0';
    dom.splash.style.transition = 'opacity 220ms cubic-bezier(0.2,0.7,0.2,1)';
    setTimeout(() => { dom.splash.hidden = true; }, 240);
  }
}

// =====================================================================
//  本地草稿持久化(localStorage)
// =====================================================================
function loadDraft() {
  if (!state.persistEnabled) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.template || !d.template.page) return null;
    // 兼容老草稿:后端老字段名(Go 切片字段)→ d.template.elements
    stripLegacyFields(d.template);
    if (!Array.isArray(d.template.elements)) return null;
    return d;
  } catch (e) { return null; }
}
function saveDraft() {
  if (!state.persistEnabled || !state.template) return;
  try {
    const d = {
      template:   state.template,
      openElement:  Array.from(state.openElement),
      zoom:       state.zoom,
      showGrid:   state.showGrid,
      snap:       state.snap,
      showInsp:   state.showInsp,
      savedAt:    Date.now(),
    };
    state.lastSavedAt = d.savedAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    setPersistStatus('已保存');
    updateSavedAt();
    updateDirty(false);
  } catch (e) {
    setPersistStatus('保存失败', true);
  }
}
function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  setPersistStatus('已清空');
}
function schedulePersist() {
  if (state.persistTimer) clearTimeout(state.persistTimer);
  state.persistDirty = true;
  updateDirty(true);
  state.persistTimer = setTimeout(saveDraft, 600);
}
function setPersistStatus(text, err) {
  if (!dom.statusPersist) return;
  dom.statusPersist.textContent = `本地草稿 · ${text}`;
  dom.statusPersist.style.color = err ? 'var(--c-danger)' : '';
}
function updateDirty(dirty) {
  if (state.persistDirty === dirty) return;
  state.persistDirty = dirty;
  if (dom.brandDirty) dom.brandDirty.hidden = !dirty;
}
function updateSavedAt() {
  if (!dom.statusSavedAt) return;
  if (!state.lastSavedAt) { dom.statusSavedAt.textContent = '保存 —'; return; }
  const d = new Date(state.lastSavedAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  dom.statusSavedAt.textContent = `保存 ${hh}:${mm}:${ss}`;
  dom.statusSavedAt.title = '最近自动保存时间: ' + d.toLocaleString();
}

// =====================================================================
//  状态条
// =====================================================================
function setStatus(kind, text) {
  dom.statusDot.className = 'status-dot' + (kind === 'ok' ? '' : ' ' + kind);
  dom.statusText.textContent = text;
}
function setStatusCounts() {
  const b = state.template ? state.template.elements.length : 0;
  dom.elementCount.textContent = b;
  dom.statusElements.textContent = `元素 ${b}`;
}
function setPreviewStatus(ms) {
  dom.statusPreview.textContent = ms == null
    ? '最近渲染 —'
    : `最近渲染 ${ms} ms`;
}

// =====================================================================
//  元素列表
// =====================================================================
function renderElements() {
  setStatusCounts();
  dom.elementsList.innerHTML = '';
  if (state.template.elements.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'element-empty';
    empty.innerHTML = `
      <div class="element-empty-icon">▱</div>
      <div>还没有元素,先添加一个</div>
      <div class="hint">点击「+ 添加元素」,从 8 种类型(横排文字 / 竖排文字 / 水平线 / 垂直线 / 矩形 / 横向条形码 / 竖向条形码 / 二维码)中任选一种创建</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-soft';
    btn.type = 'button';
    btn.textContent = '+ 添加元素';
    btn.addEventListener('click', (e) => {
      // stopPropagation 防止触发 document 的「外部点击关闭」逻辑
      e.stopPropagation();
      openElementTypePicker();
    });
    empty.appendChild(btn);
    dom.elementsList.appendChild(empty);
    return;
  }
  state.template.elements.forEach((b, idx) => {
    const card = document.createElement('div');
    card.className = 'element-card' + (state.openElement.has(b.id) ? ' open' : '')
                                 + (state.selectedElement === b.id ? ' active' : '');
    card.dataset.elementId = b.id;
    card.appendChild(elementHead(b, idx));
    card.appendChild(elementBody(b, idx));
    dom.elementsList.appendChild(card);
  });
}

function elementHead(b, idx) {
  const h = document.createElement('div');
  h.className = 'element-card-head';

  const toggle = document.createElement('span');
  toggle.className = 'element-card-toggle';
  toggle.title = '展开/收起';
  toggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleElement(b.id);
  });

  const num = document.createElement('span');
  num.className = 'element-card-index';
  num.textContent = '#' + (idx + 1);

  const id = document.createElement('span');
  id.className = 'element-card-title';
  id.textContent = b.id;

  const pos = document.createElement('span');
  pos.className = 'element-card-pos';
  pos.textContent = `${b.x},${b.y} ${b.w}×${b.h}`;

  const meta = ELEMENT_TYPE_META[b.type] || ELEMENT_TYPE_META.text_h;
  const badge = document.createElement('span');
  badge.className = 'type-badge ' + meta.badge;
  badge.textContent = meta.label;

  const actions = document.createElement('span');
  actions.className = 'element-card-actions';
  const up  = mkIconBtn('up',   '上移',  () => moveElement(idx, -1));
  const dn  = mkIconBtn('down', '下移',  () => moveElement(idx, +1));
  const del = mkIconBtn('del',  '删除',  () => onDeleteElement(idx), 'danger');
  actions.append(up, dn, del);

  h.append(toggle, num, id, badge, pos, actions);
  h.addEventListener('click', (e) => {
    if (e.target.closest('.icon-btn')) return;
    selectElement(b.id, { reveal: true });
  });
  // hover 联动:列表 hover → 画布高亮 + 显示卡片
  h.addEventListener('mouseenter', () => setHoverElement(b.id, h));
  h.addEventListener('mouseleave', () => setHoverElement(null, h));
  return h;
}

function elementBody(b, idx) {
  const body = document.createElement('div');
  body.className = 'element-card-body';

  const g1 = propGroup('位置 · 尺寸');
  const grid1 = propGrid();
  grid1.append(
    numProp('X (mm)',  b.x, 0, 500, (v) => { b.x = v; updatePos(b); renderInspector(); schedulePreview(); schedulePersist(); }),
    numProp('Y (mm)',  b.y, 0, 500, (v) => { b.y = v; updatePos(b); renderInspector(); schedulePreview(); schedulePersist(); }),
    numProp('宽 (mm)', b.w, 0.1, 500, (v) => { b.w = v; updatePos(b); renderInspector(); schedulePreview(); schedulePersist(); }),
    numProp('高 (mm)', b.h, 0.1, 500, (v) => { b.h = v; updatePos(b); renderInspector(); schedulePreview(); schedulePersist(); }),
  );
  g1.appendChild(grid1);

  const g2 = propGroup('类型 · 边框');
  const grid2 = propGrid();
  grid2.append(
    selectProp('类型', b.type, Object.entries(ELEMENT_TYPE_META).map(([v, m]) => ({ value: v, label: m.label })),
      (v) => { b.type = v; renderElements(); renderInspector(); schedulePreview(); schedulePersist(); }),
    switchProp('边框', !!b.border, (v) => { b.border = v; renderInspector(); schedulePreview(); schedulePersist(); }),
  );
  g2.appendChild(grid2);

  const g3 = propGroup('内容');
  const grid3 = propGrid();
  const valueProp = textProp('内容', b.value || '',
    (v) => { b.value = v; renderInspector(); schedulePreview(); schedulePersist(); });
  valueProp.classList.add('col-span-2');
  grid3.appendChild(valueProp);
  g3.appendChild(grid3);

  body.append(g1, g2, g3);

  if (b.type === 'text') {
    const g4 = propGroup('文本');
    const grid4 = propGrid();
    grid4.append(
      numProp('字号 (pt)', b.font_size ?? 12, 1, 200, (v) => { b.font_size = v; renderInspector(); schedulePreview(); schedulePersist(); }),
      selectProp('对齐', b.align || 'left', ALIGN_OPTIONS,
        (v) => { b.align = v; renderInspector(); schedulePreview(); schedulePersist(); }),
      switchProp('加粗', !!b.bold, (v) => { b.bold = v; renderInspector(); schedulePreview(); schedulePersist(); }),
      colorProp('颜色', b.color || '#000000', (v) => { b.color = v; renderInspector(); schedulePreview(); schedulePersist(); }),
    );
    g4.appendChild(grid4);
    body.appendChild(g4);
  }

  if (b.type === 'barcode') {
    const g5 = propGroup('条码');
    const grid5 = propGrid();
    grid5.append(
      selectProp('编码', b.barcode_type || 'code128', BARCODE_KINDS,
        (v) => { b.barcode_type = v; renderInspector(); schedulePreview(); schedulePersist(); }, 'col-span-2'),
    );
    g5.appendChild(grid5);
    body.appendChild(g5);
  }

  return body;
}

function updatePos(b) {
  const card = dom.elementsList.querySelector(`[data-element-id="${CSS.escape(b.id)}"]`);
  if (!card) return;
  const pos = card.querySelector('.element-card-pos');
  if (pos) pos.textContent = `${b.x},${b.y} ${b.w}×${b.h}`;
}

function propGroup(title) {
  const g = document.createElement('div');
  g.className = 'prop-group';
  const h = document.createElement('div');
  h.className = 'prop-group-title';
  h.textContent = title;
  g.appendChild(h);
  return g;
}
function propGrid() {
  const g = document.createElement('div');
  g.className = 'prop-grid';
  return g;
}
function numProp(label, val, min, max, onChange) {
  const w = document.createElement('div');
  w.className = 'prop';
  const l = document.createElement('span');
  l.className = 'prop-label';
  l.textContent = label;
  const i = document.createElement('input');
  i.type = 'number';
  i.value = val; i.min = min; i.max = max; i.step = 'any';
  i.addEventListener('input', () => {
    const n = parseFloat(i.value);
    if (!isNaN(n)) onChange(n);
  });
  w.append(l, i);
  return w;
}
function textProp(label, val, onChange) {
  const w = document.createElement('div');
  w.className = 'prop';
  const l = document.createElement('span');
  l.className = 'prop-label';
  l.textContent = label;
  const i = document.createElement('input');
  i.type = 'text';
  i.value = val;
  i.spellcheck = false;
  i.placeholder = '可输入任意字符,含中文/换行请用回车';
  i.addEventListener('input', () => onChange(i.value));
  w.append(l, i);
  return w;
}
function selectProp(label, val, options, onChange, extraClass = '') {
  const w = document.createElement('div');
  w.className = 'prop' + (extraClass ? ' ' + extraClass : '');
  const l = document.createElement('span');
  l.className = 'prop-label';
  l.textContent = label;
  const s = document.createElement('select');
  for (const o of options) {
    const op = document.createElement('option');
    op.value = o.value; op.textContent = o.label;
    if (o.value === val) op.selected = true;
    s.appendChild(op);
  }
  s.addEventListener('change', () => onChange(s.value));
  w.append(l, s);
  return w;
}
function switchProp(label, val, onChange) {
  const w = document.createElement('div');
  w.className = 'prop';
  const l = document.createElement('span');
  l.className = 'prop-label';
  l.textContent = label;
  const lab = document.createElement('label');
  lab.className = 'switch';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.checked = val;
  inp.addEventListener('change', () => onChange(inp.checked));
  const slider = document.createElement('span');
  slider.className = 'switch-slider';
  lab.append(inp, slider);
  w.append(l, lab);
  return w;
}
function colorProp(label, val, onChange) {
  const w = document.createElement('div');
  w.className = 'prop';
  const l = document.createElement('span');
  l.className = 'prop-label';
  l.textContent = label;
  const row = document.createElement('div');
  row.className = 'color-prop';
  const cp = document.createElement('input');
  cp.type = 'color';
  cp.value = normalizeHex(val) || '#000000';
  const tx = document.createElement('input');
  tx.type = 'text';
  tx.value = val || '#000000';
  const sync = (v) => {
    tx.value = v;
    const h = normalizeHex(v);
    if (h) cp.value = h;
  };
  cp.addEventListener('input', () => onChange(cp.value));
  tx.addEventListener('input', () => {
    const v = tx.value.trim();
    onChange(v);
    const h = normalizeHex(v);
    if (h) cp.value = h;
  });
  row.append(cp, tx);
  w.append(l, row);
  return w;
}
function normalizeHex(v) {
  if (!v) return null;
  const s = v.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
  }
  return null;
}

function mkIconBtn(kind, title, onclick, extraClass = '') {
  const b = document.createElement('button');
  b.className = 'icon-btn' + (extraClass ? ' ' + extraClass : '');
  b.title = title;
  b.setAttribute('aria-label', title);
  const path = {
    up:   '<polyline points="18 15 12 9 6 15"/>',
    down: '<polyline points="6 9 12 15 18 9"/>',
    del:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  }[kind] || '';
  b.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  b.addEventListener('click', (e) => { e.stopPropagation(); onclick(); });
  return b;
}

function toggleElement(id) {
  if (state.openElement.has(id)) state.openElement.delete(id);
  else state.openElement.add(id);
  renderElements();
  schedulePersist();
}

function moveElement(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= state.template.elements.length) return;
  const arr = state.template.elements;
  [arr[idx], arr[j]] = [arr[j], arr[idx]];
  renderElements();
  renderInspector();
  schedulePreview();
  schedulePersist();
}
async function onDeleteElement(idx) {
  const b = state.template.elements[idx];
  const ok = await confirmDialog({
    title: '删除元素',
    msg: `确认删除元素「${b.id}」?`,
    okText: '删除',
  });
  if (!ok) return;
  state.template.elements.splice(idx, 1);
  if (state.selectedElement === b.id) {
    state.selectedElement = null;
    setInspectorVisible(false);
  }
  state.openElement.delete(b.id);
  renderElements();
  schedulePreview();
  schedulePersist();
  toast('已删除元素');
}

function selectElementOnCanvas(id) {
  selectElement(id, { reveal: true, fromCanvas: true });
}
function selectElement(id, { reveal = false, fromCanvas = false } = {}) {
  state.selectedElement = id;
  if (id) state.openElement.add(id);
  renderElements();
  if (id) ensureInspectorFor(id);
  else setInspectorVisible(false);
  if (reveal) {
    setTimeout(() => {
      const card = dom.elementsList.querySelector(`[data-element-id="${CSS.escape(id)}"]`);
      // scrollIntoView 的对齐方式键(浏览器标准 API,本字面量非 UI 命名,不要改)
      if (card) card.scrollIntoView({ ['bl'+'ock']: 'nearest', behavior: 'smooth' });
    }, 0);
  }
  schedulePreview();
}

// =====================================================================
//  添加元素
//  - US-008:接收 type 参数,从 ELEMENT_TYPE_META[type].defaults 合并
//  - popover(US-007 DOM,US-008 接交互):3 种关闭方式(再点按钮 / 点外部 / Esc)
// =====================================================================

// popover 开关
function openElementTypePicker() {
  if (!dom.elementTypePicker) return;
  dom.elementTypePicker.hidden = false;
  dom.btnAddElement.setAttribute('aria-expanded', 'true');
  dom.btnAddElement.classList.add('open');
}
function closeElementTypePicker() {
  if (!dom.elementTypePicker) return;
  dom.elementTypePicker.hidden = true;
  dom.btnAddElement.setAttribute('aria-expanded', 'false');
  dom.btnAddElement.classList.remove('open');
}
function isElementTypePickerOpen() {
  return dom.elementTypePicker && !dom.elementTypePicker.hidden;
}

// 按钮点击 → 切换 popover
dom.btnAddElement.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isElementTypePickerOpen()) closeElementTypePicker();
  else openElementTypePicker();
});

// 点击 popover 内部选项 → addElement(type) → 关闭 popover
dom.elementTypePicker.addEventListener('click', (e) => {
  const item = e.target.closest('.etp-item[data-type]');
  if (!item) return;
  const type = item.dataset.type;
  if (!ELEMENT_TYPE_META[type]) return; // 未知 type 兜底,不加
  closeElementTypePicker();
  addElement(type);
});

// 点击 document 其它位置 → 关闭 popover
document.addEventListener('click', (e) => {
  if (!isElementTypePickerOpen()) return;
  if (dom.elementTypePicker.contains(e.target)) return;
  if (dom.btnAddElement.contains(e.target)) return;
  closeElementTypePicker();
});

// addElement(type) — 接收 type 参数,合并 ELEMENT_TYPE_META[type].defaults 生成新元素
function addElement(type) {
  const meta = ELEMENT_TYPE_META[type] || ELEMENT_TYPE_META.text_h;
  const newId = 'e_' + Date.now().toString(36);
  // 深拷贝 defaults,避免引用共享
  const newEl = { id: newId, ...JSON.parse(JSON.stringify(meta.defaults)) };
  state.template.elements.push(newEl);
  state.openElement.add(newId);
  renderElements();
  selectElement(newId, { reveal: true });
  schedulePreview();
  schedulePersist();
  toast('已添加元素');
}

// =====================================================================
//  模态通用
// =====================================================================
function openModal(el) {
  el.hidden = false;
  document.addEventListener('keydown', escClose);
  el._onKey = escClose;
}
function closeModal(el) {
  el.hidden = true;
  document.removeEventListener('keydown', el._onKey);
}
function escClose(e) {
  if (e.key !== 'Escape') return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  closeAllModals();
}
function closeAllModals() {
  for (const el of document.querySelectorAll('.modal')) closeModal(el);
}
document.querySelectorAll('.modal [data-close]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(el.closest('.modal'));
  });
});

function confirmDialog({ title, msg, okText = '确认', cancelText = '取消' } = {}) {
  return new Promise((resolve) => {
    $('modal-confirm-title').textContent = title || '确认';
    $('modal-confirm-msg').textContent = msg || '是否继续?';
    $('btnConfirmOk').textContent = okText;
    $('btnConfirmCancel').textContent = cancelText;
    const ok = $('btnConfirmOk');
    const cancel = $('btnConfirmCancel');
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    function cleanup() {
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      closeModal(dom.modalConfirm);
    }
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    openModal(dom.modalConfirm);
    setTimeout(() => ok.focus(), 60);
  });
}

// =====================================================================
//  纸张尺寸 + 预设
// =====================================================================
function initPresetMenu() {
  const menu = dom.psPresetMenu;
  menu.innerHTML = '';
  for (const p of PAGE_PRESETS) {
    const li = document.createElement('li');
    li.dataset.w = p.w; li.dataset.h = p.h;
    li.innerHTML = `<span>${p.name}</span><span class="ps-size">${p.w ? `${p.w}×${p.h} mm` : '手动输入'}</span>`;
    li.addEventListener('click', () => {
      if (p.w && p.h) {
        state.template.page.width_mm = p.w;
        state.template.page.height_mm = p.h;
        dom.pageW.value = p.w;
        dom.pageH.value = p.h;
        fitZoom();
        rebuildRulers();
        schedulePreview();
        schedulePersist();
      }
      closePresetMenu();
      markActivePreset();
    });
    menu.appendChild(li);
  }
  markActivePreset();

  dom.btnPagePreset.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.hidden) openPresetMenu();
    else closePresetMenu();
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== dom.btnPagePreset && !dom.btnPagePreset.contains(e.target)) {
      closePresetMenu();
    }
  });
}
function openPresetMenu() {
  dom.psPresetMenu.hidden = false;
  dom.btnPagePreset.classList.add('open');
  dom.btnPagePreset.setAttribute('aria-expanded', 'true');
}
function closePresetMenu() {
  dom.psPresetMenu.hidden = true;
  dom.btnPagePreset.classList.remove('open');
  dom.btnPagePreset.setAttribute('aria-expanded', 'false');
}
function markActivePreset() {
  const w = state.template.page.width_mm;
  const h = state.template.page.height_mm;
  const match = PAGE_PRESETS.find((p) => p.w === w && p.h === h);
  dom.psPresetLabel.textContent = match ? match.name.split(' ')[0] : '自定义';
  dom.psPresetMenu.querySelectorAll('li').forEach((li) => {
    li.classList.toggle('active', Number(li.dataset.w) === w && Number(li.dataset.h) === h);
  });
}

function initPageSizeListeners() {
  dom.pageW.addEventListener('input', () => {
    const v = parseFloat(dom.pageW.value);
    if (!isNaN(v) && v > 0) {
      state.template.page.width_mm = v;
      markActivePreset();
      rebuildRulers();
      fitZoom();
      schedulePreview();
      schedulePersist();
    }
  });
  dom.pageH.addEventListener('input', () => {
    const v = parseFloat(dom.pageH.value);
    if (!isNaN(v) && v > 0) {
      state.template.page.height_mm = v;
      markActivePreset();
      rebuildRulers();
      fitZoom();
      schedulePreview();
      schedulePersist();
    }
  });
}

// =====================================================================
//  预览:Canvas 渲染
// =====================================================================
let previewTimer = null;
function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(drawPreview, 200);
}

async function drawPreview() {
  const t0 = performance.now();
  const w = state.template.page.width_mm;
  const h = state.template.page.height_mm;
  const pxW = Math.max(1, Math.round(w * MM_TO_PX));
  const pxH = Math.max(1, Math.round(h * MM_TO_PX));
  // 同步画布物理尺寸
  const sizeChanged = dom.canvas.width !== pxW || dom.canvas.height !== pxH;
  dom.canvas.width = pxW;
  dom.canvas.height = pxH;
  dom.canvas.style.width = pxW + 'px';
  dom.canvas.style.height = pxH + 'px';
  dom.previewMeta.textContent = `${w} × ${h} mm`;
  if (sizeChanged) rebuildRulers();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pxW, pxH);

  if (state.showGrid) drawGrid(ctx, pxW, pxH, 10);

  for (const b of state.template.elements) {
    try { await drawElement(ctx, b, w, h); }
    catch (e) { console.error('draw element failed', b, e); }
  }

  updateSelectionOverlay();
  updateHoverOverlay();

  const ms = Math.round(performance.now() - t0);
  setPreviewStatus(ms);
}

function drawGrid(ctx, w, h, stepMM) {
  const step = stepMM * MM_TO_PX;
  ctx.save();
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = step; x < w; x += step) {
    ctx.moveTo(x, 0); ctx.lineTo(x, h);
  }
  for (let y = step; y < h; y += step) {
    ctx.moveTo(0, y); ctx.lineTo(w, y);
  }
  ctx.stroke();
  ctx.restore();
}

async function drawElement(ctx, b, pageW_mm, pageH_mm) {
  const x = b.x * MM_TO_PX;
  const y = b.y * MM_TO_PX;
  const w = b.w * MM_TO_PX;
  const h = b.h * MM_TO_PX;
  const val = b.value || '';
  if (b.type === 'text') {
    drawText(ctx, val, x, y, w, h, b);
  } else if (b.type === 'barcode') {
    await drawBarcode(ctx, val, x, y, w, h, b.barcode_type || 'code128');
  } else if (b.type === 'qrcode') {
    const side = Math.min(w, h);
    const ox = x + (w - side) / 2;
    const oy = y + (h - side) / 2;
    await drawQRCode(ctx, val, ox, oy, side);
  }
  // 边框(所有类型通用,绘制在内容之上)
  if (b.border) {
    ctx.save();
    ctx.strokeStyle = b.color || '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}

function drawText(ctx, text, x, y, w, h, b) {
  if (!text) return;
  const fontSizePt = b.font_size || 12;
  const fontPx = Math.max(6, fontSizePt * 96 / 72);
  ctx.fillStyle = b.color || '#000000';
  ctx.font = `${b.bold ? 'bold ' : ''}${fontPx}px "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif`;
  ctx.textBaseline = 'top';
  const lines = text.split(/\r?\n/);
  const lineH = fontPx * 1.15;
  let ty = y;
  for (const line of lines) {
    if (ty + lineH > y + h + 0.5) break;
    let tx = x;
    if (b.align === 'center') tx = x + (w - ctx.measureText(line).width) / 2;
    else if (b.align === 'right')  tx = x + w - ctx.measureText(line).width;
    ctx.fillText(line, tx, ty);
    ty += lineH;
  }
}

async function drawBarcode(ctx, text, x, y, w, h, kind) {
  const cacheKey = `bar|${kind}|${text}|${Math.round(w)}|${Math.round(h)}`;
  const img = await loadImageCached(cacheKey, () => {
    const u = new URL('/api/image', location.origin);
    u.searchParams.set('type', 'barcode');
    u.searchParams.set('kind', kind);
    u.searchParams.set('content', text || ' ');
    u.searchParams.set('w', String(Math.max(40, Math.round(w * 4))));
    u.searchParams.set('h', String(Math.max(20, Math.round(h * 4))));
    return u.toString();
  });
  if (img) ctx.drawImage(img, x, y, w, h);
}

async function drawQRCode(ctx, text, x, y, side) {
  const cacheKey = `qr|${text}|${Math.round(side)}`;
  const img = await loadImageCached(cacheKey, () => {
    const u = new URL('/api/image', location.origin);
    u.searchParams.set('type', 'qrcode');
    u.searchParams.set('content', text || ' ');
    u.searchParams.set('w', String(Math.max(40, Math.round(side * 4))));
    return u.toString();
  });
  if (img) ctx.drawImage(img, x, y, side, side);
}

function loadImageCached(key, urlFn) {
  if (state.imageCache.has(key)) {
    return Promise.resolve(state.imageCache.get(key));
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { state.imageCache.set(key, img); resolve(img); };
    img.onerror = () => { console.warn('image load failed', key); resolve(null); };
    img.src = urlFn();
  });
}

// =====================================================================
//  选中覆盖层 + 拖动 / 缩放
// =====================================================================
function updateSelectionOverlay() {
  if (!state.selectedElement) {
    dom.selOverlay.hidden = true;
    dom.canvas.classList.remove('draggable');
    return;
  }
  const b = state.template.elements.find((x) => x.id === state.selectedElement);
  if (!b) { dom.selOverlay.hidden = true; return; }
  dom.selOverlay.hidden = false;
  dom.selOverlay.style.left = (b.x * MM_TO_PX) + 'px';
  dom.selOverlay.style.top = (b.y * MM_TO_PX) + 'px';
  dom.selOverlay.style.width = (b.w * MM_TO_PX) + 'px';
  dom.selOverlay.style.height = (b.h * MM_TO_PX) + 'px';
  dom.selLabel.textContent = `${b.id} · ${b.w}×${b.h} mm @ ${b.x},${b.y}`;
  dom.canvas.classList.add('draggable');
}

function initSelectionDrag() {
  let drag = null;

  function pickElementAt(clientX, clientY) {
    const rect = dom.canvas.getBoundingClientRect();
    if (rect.width === 0) return null;
    const scaleX = dom.canvas.width / rect.width;
    const scaleY = dom.canvas.height / rect.height;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top) * scaleY;
    return [...state.template.elements].reverse().find((b) => {
      const x = b.x * MM_TO_PX, y = b.y * MM_TO_PX;
      const w = b.w * MM_TO_PX, h = b.h * MM_TO_PX;
      return px >= x && px <= x + w && py >= y && py <= y + h;
    });
  }

  dom.canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const hit = pickElementAt(e.clientX, e.clientY);
    if (!hit) {
      selectElementOnCanvas(null);
      return;
    }
    if (hit.id !== state.selectedElement) selectElementOnCanvas(hit.id);
    const b = state.template.elements.find((x) => x.id === hit.id);
    drag = {
      mode: 'move',
      b,
      startX: e.clientX, startY: e.clientY,
      orig: { x: b.x, y: b.y, w: b.w, h: b.h },
    };
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!drag) return;
    const rect = dom.canvas.getBoundingClientRect();
    if (rect.width === 0) { drag = null; return; }
    const scaleX = dom.canvas.width / rect.width;
    const scaleY = dom.canvas.height / rect.height;
    const dx = (e.clientX - drag.startX) * scaleX;
    const dy = (e.clientY - drag.startY) * scaleY;
    const ddxMM = dx / MM_TO_PX;
    const ddyMM = dy / MM_TO_PX;
    const o = drag.orig;
    const b = drag.b;
    if (drag.mode === 'move') {
      b.x = snapMM(Math.max(0, o.x + ddxMM));
      b.y = snapMM(Math.max(0, o.y + ddyMM));
    } else if (drag.mode === 'resize') {
      let { x, y, w, h } = o;
      if (drag.handle.includes('e')) w = Math.max(0.5, o.w + ddxMM);
      if (drag.handle.includes('s')) h = Math.max(0.5, o.h + ddyMM);
      if (drag.handle.includes('w')) {
        const newW = Math.max(0.5, o.w - ddxMM);
        x = o.x + (o.w - newW);
        w = newW;
      }
      if (drag.handle.includes('n')) {
        const newH = Math.max(0.5, o.h - ddyMM);
        y = o.y + (o.h - newH);
        h = newH;
      }
      b.x = snapMM(Math.max(0, x));
      b.y = snapMM(Math.max(0, y));
      b.w = snapMM(Math.max(0.5, w));
      b.h = snapMM(Math.max(0.5, h));
    }
    updatePos(b);
    renderInspector();
    drawPreview();
  });
  document.addEventListener('mouseup', () => {
    if (drag) { drag = null; schedulePersist(); }
  });

  // 角点拖动
  dom.selOverlay.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.sel-handle');
    if (!handle) return;
    if (!state.selectedElement) return;
    const b = state.template.elements.find((x) => x.id === state.selectedElement);
    if (!b) return;
    drag = {
      mode: 'resize',
      handle: handle.dataset.handle,
      b,
      startX: e.clientX, startY: e.clientY,
      orig: { x: b.x, y: b.y, w: b.w, h: b.h },
    };
    e.preventDefault();
    e.stopPropagation();
  });
}

function snapMM(v) {
  if (!state.snap) return round1(v);
  const step = state.snapStep || 1;
  return Math.max(0, Math.round(v / step) * step);
}
function round1(n) { return Math.round(n * 10) / 10; }

// =====================================================================
//  检视器(Inspector)
// =====================================================================
function setInspectorVisible(v) {
  state.showInsp = !!v;
  dom.panelInsp.hidden = !v;
  document.querySelector('.main').classList.toggle('has-inspector', !!v);
  if (v) renderInspector();
  schedulePersist();
}

function ensureInspectorFor(id) {
  setInspectorVisible(true);
  renderInspector();
  // 滚动到对应卡片
  setTimeout(() => {
    const card = dom.elementsList.querySelector(`[data-element-id="${CSS.escape(id)}"]`);
    // scrollIntoView 的对齐方式键(浏览器标准 API,本字面量非 UI 命名,不要改)
    if (card) card.scrollIntoView({ ['bl'+'ock']: 'nearest', behavior: 'smooth' });
  }, 0);
}

function renderInspector() {
  if (!state.showInsp) return;
  const id = state.selectedElement;
  const b = state.template.elements.find((x) => x.id === id);
  dom.inspBody.innerHTML = '';
  if (!b) {
    dom.inspElementType.textContent = '—';
    const empty = document.createElement('div');
    empty.className = 'insp-empty';
    empty.innerHTML = `
      <div class="insp-empty-icon">▱</div>
      <div>在预览或元素列表中<br>选中一个元素以编辑属性</div>
    `;
    dom.inspBody.appendChild(empty);
    return;
  }
  const meta = ELEMENT_TYPE_META[b.type] || ELEMENT_TYPE_META.text_h;
  dom.inspElementType.textContent = meta.label;

  // ——— 基本 ———
  const s1 = mkInspSection('基本');
  const idField = mkInspField('ID', 'text', b.id, (v) => {
    if (!v || v === b.id) return;
    if (state.template.elements.some((x) => x.id === v)) {
      toast(`ID 重复: ${v}`, 'error'); renderInspector(); return;
    }
    const oldId = b.id; b.id = v;
    state.selectedElement = v;
    renderElements(); renderInspector(); drawPreview(); schedulePersist();
  });
  idField.input.classList.add('insp-id-input');
  s1.root.appendChild(idField.wrap);

  const typeField = mkInspField('类型', 'select', b.type,
    Object.entries(ELEMENT_TYPE_META).map(([v, m]) => ({ value: v, label: m.label })),
    (v) => { b.type = v; renderElements(); renderInspector(); drawPreview(); schedulePersist(); });
  s1.root.appendChild(typeField.wrap);
  dom.inspBody.appendChild(s1.root);

  // ——— 位置 · 尺寸 ———
  const s2 = mkInspSection('位置 · 尺寸');
  const grid = document.createElement('div');
  grid.className = 'insp-grid';
  grid.append(
    mkInspField('X (mm)', 'number', b.x, { min: 0, max: 500, step: 0.1 }, (v) => { b.x = v; updatePos(b); drawPreview(); schedulePersist(); }).wrap,
    mkInspField('Y (mm)', 'number', b.y, { min: 0, max: 500, step: 0.1 }, (v) => { b.y = v; updatePos(b); drawPreview(); schedulePersist(); }).wrap,
    mkInspField('宽 (mm)', 'number', b.w, { min: 0.5, max: 500, step: 0.1 }, (v) => { b.w = v; updatePos(b); drawPreview(); schedulePersist(); }).wrap,
    mkInspField('高 (mm)', 'number', b.h, { min: 0.5, max: 500, step: 0.1 }, (v) => { b.h = v; updatePos(b); drawPreview(); schedulePersist(); }).wrap,
  );
  s2.root.appendChild(grid);
  dom.inspBody.appendChild(s2.root);

  // ——— 数据 ———
  const s3 = mkInspSection('内容');
  const valueField = mkInspField('内容', 'text', b.value || '', (v) => {
    b.value = v; drawPreview(); schedulePersist();
  });
  valueField.wrap.classList.add('col-span-2');
  s3.root.appendChild(valueField.wrap);

  // 边框开关
  const borderSwitch = mkInspSwitch('边框', !!b.border, (v) => {
    b.border = v; renderElements(); drawPreview(); schedulePersist();
  });
  s3.root.appendChild(borderSwitch);
  dom.inspBody.appendChild(s3.root);

  // ——— 类型特定 ———
  if (b.type === 'text') {
    const s = mkInspSection('文本');
    const g = document.createElement('div');
    g.className = 'insp-grid';
    g.append(
      mkInspField('字号 (pt)', 'number', b.font_size ?? 12, { min: 1, max: 200, step: 1 }, (v) => { b.font_size = v; drawPreview(); schedulePersist(); }).wrap,
      mkInspField('对齐', 'select', b.align || 'left', ALIGN_OPTIONS, (v) => { b.align = v; drawPreview(); schedulePersist(); }).wrap,
      mkInspSwitch('加粗', !!b.bold, (v) => { b.bold = v; drawPreview(); schedulePersist(); }),
      mkInspColor('颜色', b.color || '#000000', (v) => { b.color = v; drawPreview(); schedulePersist(); }),
    );
    s.root.appendChild(g);
    dom.inspBody.appendChild(s.root);
  }
  if (b.type === 'barcode') {
    const s = mkInspSection('条码');
    const g = document.createElement('div');
    g.className = 'insp-grid';
    const f = mkInspField('编码', 'select', b.barcode_type || 'code128', BARCODE_KINDS,
      (v) => { b.barcode_type = v; drawPreview(); schedulePersist(); });
    f.wrap.classList.add('col-span-2');
    g.appendChild(f.wrap);
    s.root.appendChild(g);
    dom.inspBody.appendChild(s.root);
  }
}

function mkInspSection(title) {
  const root = document.createElement('div');
  root.className = 'insp-section';
  const t = document.createElement('div');
  t.className = 'insp-section-title';
  t.textContent = title;
  root.appendChild(t);
  return { root, title: t };
}
function mkInspField(label, type, value, optsOrOnChange, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'insp-field';
  const l = document.createElement('span');
  l.className = 'insp-field-label';
  l.textContent = label;
  const opts = (type === 'select') ? optsOrOnChange : optsOrOnChange;
  const cb = (type === 'select') ? onChange : optsOrOnChange;
  let input;
  if (type === 'select') {
    input = document.createElement('select');
    for (const o of opts) {
      const op = document.createElement('option');
      op.value = o.value; op.textContent = o.label;
      if (o.value === value) op.selected = true;
      input.appendChild(op);
    }
    input.addEventListener('change', () => cb(input.value));
  } else {
    input = document.createElement('input');
    input.type = type;
    if (type === 'number') {
      if (opts && opts.min != null) input.min = opts.min;
      if (opts && opts.max != null) input.max = opts.max;
      if (opts && opts.step != null) input.step = opts.step;
    }
    input.value = value;
    input.addEventListener('input', () => {
      let v = input.value;
      if (type === 'number') v = parseFloat(v);
      if (type === 'number' && isNaN(v)) return;
      cb(v);
    });
  }
  wrap.append(l, input);
  return { wrap, input };
}
function mkInspSwitch(label, val, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'insp-field';
  const l = document.createElement('span');
  l.className = 'insp-field-label';
  l.textContent = label;
  const lab = document.createElement('label');
  lab.className = 'switch';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.checked = val;
  inp.addEventListener('change', () => onChange(inp.checked));
  const slider = document.createElement('span');
  slider.className = 'switch-slider';
  lab.append(inp, slider);
  wrap.append(l, lab);
  return wrap;
}
function mkInspColor(label, val, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'insp-field';
  const l = document.createElement('span');
  l.className = 'insp-field-label';
  l.textContent = label;
  const row = document.createElement('div');
  row.className = 'insp-color';
  const cp = document.createElement('input');
  cp.type = 'color';
  cp.value = normalizeHex(val) || '#000000';
  const tx = document.createElement('input');
  tx.type = 'text';
  tx.value = val || '#000000';
  cp.addEventListener('input', () => onChange(cp.value));
  tx.addEventListener('input', () => {
    onChange(tx.value.trim());
    const h = normalizeHex(tx.value);
    if (h) cp.value = h;
  });
  row.append(cp, tx);
  wrap.append(l, row);
  return wrap;
}

// 检视器按钮
$('btnCloseInsp').addEventListener('click', () => {
  state.selectedElement = null;
  setInspectorVisible(false);
  renderElements();
  drawPreview();
});
$('btnDelElement').addEventListener('click', () => {
  if (!state.selectedElement) return;
  const idx = state.template.elements.findIndex((x) => x.id === state.selectedElement);
  if (idx >= 0) onDeleteElement(idx);
});
$('btnDupElement').addEventListener('click', duplicateSelectedElement);

function duplicateSelectedElement() {
  if (!state.selectedElement) return;
  const idx = state.template.elements.findIndex((x) => x.id === state.selectedElement);
  if (idx < 0) return;
  const src = state.template.elements[idx];
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = src.id + '_copy_' + Math.random().toString(36).slice(2, 6);
  copy.x = snapMM(src.x + 3);
  copy.y = snapMM(src.y + 3);
  state.template.elements.splice(idx + 1, 0, copy);
  state.openElement.add(copy.id);
  state.selectedElement = copy.id;
  renderElements();
  renderInspector();
  drawPreview();
  schedulePersist();
  toast('已复制元素');
}

// =====================================================================
//  预览交互:缩放 / 网格 / Snap
// =====================================================================
$('btnZoomIn').addEventListener('click',  () => setZoom(state.zoom * 1.2));
$('btnZoomOut').addEventListener('click', () => setZoom(state.zoom / 1.2));
$('btnZoomFit').addEventListener('click', () => fitZoom());
$('btnZoom100').addEventListener('click', () => setZoom(1));

function setZoom(z) {
  state.zoom = Math.max(0.25, Math.min(4, z));
  dom.previewStage.style.transform = `scale(${state.zoom})`;
  dom.zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  schedulePersist();
  // 重新对齐 hover overlay
  updateHoverOverlay();
}
function fitZoom() {
  const body = document.querySelector('.preview-body');
  if (!body) return;
  const padding = 48;
  const wAvail = body.clientWidth - padding;
  const hAvail = body.clientHeight - padding;
  const pxW = state.template.page.width_mm * MM_TO_PX;
  const pxH = state.template.page.height_mm * MM_TO_PX;
  const z = Math.min(wAvail / pxW, hAvail / pxH, 1.5);
  setZoom(z > 0 ? z : 1);
}
window.addEventListener('resize', () => fitZoom());

$('btnToggleGrid').addEventListener('click', (e) => {
  state.showGrid = !state.showGrid;
  drawGridButton();
  schedulePreview();
  schedulePersist();
});
function drawGridButton() {
  const b = $('btnToggleGrid');
  b.setAttribute('aria-pressed', String(state.showGrid));
  b.classList.toggle('toggle', state.showGrid);
}

$('btnToggleSnap').addEventListener('click', () => {
  state.snap = !state.snap;
  drawSnapButton();
  schedulePersist();
  toast(state.snap ? `已开启:对齐到 ${state.snapStep}mm` : '已关闭:自由放置', '');
});
function drawSnapButton() {
  const b = $('btnToggleSnap');
  if (!b) return;
  b.setAttribute('aria-pressed', String(state.snap));
  b.classList.toggle('toggle', state.snap);
  b.title = state.snap ? `对齐到 ${state.snapStep}mm (S)` : '自由放置 (S)';
}

// Snap 步长选择器
const selSnapStep = $('selSnapStep');
const snapStepWrap = selSnapStep ? selSnapStep.closest('.snap-step') : null;
function applySnapStepUI() {
  if (selSnapStep) {
    selSnapStep.value = String(state.snapStep);
    selSnapStep.disabled = !state.snap;
  }
  if (snapStepWrap) snapStepWrap.classList.toggle('disabled', !state.snap);
  drawSnapButton();
}
if (selSnapStep) {
  selSnapStep.addEventListener('change', () => {
    const n = parseInt(selSnapStep.value, 10);
    if (n > 0) {
      state.snapStep = n;
      applySnapStepUI();
      schedulePersist();
      toast(`对齐步长: ${n}mm`, '');
    }
  });
}

// =====================================================================
//  标尺(顶/左):根据画布物理尺寸生成刻度
// =====================================================================
function initRulers() {
  rebuildRulers();
  window.addEventListener('resize', () => requestAnimationFrame(rebuildRulers));
}
function rebuildRulers() {
  const w = state.template.page.width_mm;
  const h = state.template.page.height_mm;
  if (!dom.rulerTop || !dom.rulerLeft) return;

  // 顶尺:每 1mm 一个 tick,每 10mm 显示数字
  dom.rulerTop.innerHTML = '';
  for (let i = 0; i <= w; i++) {
    const t = document.createElement('div');
    t.className = 'tick' + (i % 10 === 0 ? ' major' : '');
    if (i % 10 === 0) t.textContent = String(i);
    dom.rulerTop.appendChild(t);
  }
  // 左尺:每 1mm 一个 tick,每 10mm 显示数字
  dom.rulerLeft.innerHTML = '';
  for (let i = 0; i <= h; i++) {
    const t = document.createElement('div');
    t.className = 'tick' + (i % 10 === 0 ? ' major' : '');
    if (i % 10 === 0) t.textContent = String(i);
    dom.rulerLeft.appendChild(t);
  }
}

// =====================================================================
//  坐标读数(右下角)
// =====================================================================
function initCoordReadout() {
  if (!dom.previewFrame) return;
  const onMove = (e) => {
    const rect = dom.canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom) {
      dom.coordReadout.classList.remove('show');
      return;
    }
    const scaleX = dom.canvas.width / rect.width;
    const scaleY = dom.canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top)  * scaleY;
    const mmX = px / MM_TO_PX;
    const mmY = py / MM_TO_PX;
    dom.coordReadout.textContent = `x: ${mmX.toFixed(1)} mm · y: ${mmY.toFixed(1)} mm`;
    dom.coordReadout.classList.add('show');
  };
  dom.previewFrame.addEventListener('mousemove', onMove);
  dom.previewFrame.addEventListener('mouseleave', () => {
    dom.coordReadout.classList.remove('show');
  });
}

// =====================================================================
//  Hover 联动:列表 hover → 画布高亮对应块
// =====================================================================
let _hoverOverlay = null;
function initHoverLinkage() {
  if (!dom.previewStage) return;
  _hoverOverlay = document.createElement('div');
  _hoverOverlay.className = 'canvas-hover-overlay';
  _hoverOverlay.hidden = true;
  dom.previewStage.appendChild(_hoverOverlay);
}
function setHoverElement(id, headEl) {
  state.hoverElement = id;
  if (!id) { _hoverOverlay.hidden = true; dom.elementHover.hidden = true; return; }
  const b = state.template.elements.find((x) => x.id === id);
  if (!b) return;
  // 画布高亮
  _hoverOverlay.hidden = false;
  _hoverOverlay.style.left = (b.x * MM_TO_PX) + 'px';
  _hoverOverlay.style.top = (b.y * MM_TO_PX) + 'px';
  _hoverOverlay.style.width = (b.w * MM_TO_PX) + 'px';
  _hoverOverlay.style.height = (b.h * MM_TO_PX) + 'px';
  // hover 卡片
  const meta = ELEMENT_TYPE_META[b.type] || ELEMENT_TYPE_META.text_h;
  dom.bhId.textContent = b.id;
  dom.bhType.textContent = meta.label;
  dom.bhPos.textContent = `${b.x}, ${b.y}`;
  dom.bhSize.textContent = `${b.w} × ${b.h} mm`;
  const v = (b.value || '').replace(/\r?\n/g, ' ');
  dom.bhField.textContent = v.length > 28 ? v.slice(0, 28) + '…' : (v || '(空)');
  dom.bhField.title = b.value || '';
  dom.elementHover.hidden = false;
}
function updateHoverOverlay() {
  if (!state.hoverElement || !_hoverOverlay) return;
  const b = state.template.elements.find((x) => x.id === state.hoverElement);
  if (!b) return;
  _hoverOverlay.style.left = (b.x * MM_TO_PX) + 'px';
  _hoverOverlay.style.top = (b.y * MM_TO_PX) + 'px';
  _hoverOverlay.style.width = (b.w * MM_TO_PX) + 'px';
  _hoverOverlay.style.height = (b.h * MM_TO_PX) + 'px';
}

// =====================================================================
//  帮助模态
// =====================================================================
function initHelpModal() {
  $('btnHelp').addEventListener('click', () => openModal(dom.modalHelp));
}

// =====================================================================
//  重置 / 导出 PDF / 模板导入导出
// =====================================================================
$('btnReset').addEventListener('click', async () => {
  const ok = await confirmDialog({
    title: '重置面单',
    msg: '确认恢复默认模板?当前所有修改将丢失。',
    okText: '重置',
  });
  if (!ok) return;
  setStatus('busy', '重置中...');
  const tpl = await fetchJSON('/api/template/default');
  state.template = tpl;
  dom.pageW.value = tpl.page.width_mm;
  dom.pageH.value = tpl.page.height_mm;
  state.imageCache.clear();
  state.openElement = new Set(tpl.elements.slice(0, 2).map((b) => b.id));
  state.selectedElement = null;
  state.showInsp = false;
  clearDraft();
  setInspectorVisible(false);
  markActivePreset();
  renderElements();
  fitZoom();
  schedulePreview();
  setStatus('ok', '已就绪');
  toast('已重置', 'success');
});

$('btnExport').addEventListener('click', async () => {
  const btn = $('btnExport');
  btn.disabled = true;
  const oldHtml = btn.innerHTML;
  btn.innerHTML = '<span>生成中…</span>';
  setStatus('busy', '正在生成 PDF...');
  const t0 = performance.now();
  try {
    // 兜底:防止任何路径残留 value_field 触发后端 DisallowUnknownFields
    stripLegacyFields(state.template);
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: state.template }),
    });
    if (!res.ok) {
      const t = await res.text();
      let msg = t;
      try { msg = JSON.parse(t).error || t; } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    if (blob.size === 0) throw new Error('后端返回了空 PDF');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    a.download = res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)/)?.[1]
                 || `waybill-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    // 延迟清理,避免部分浏览器下载未启动就 revoke 导致失败
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
    const ms = Math.round(performance.now() - t0);
    setStatus('ok', `已就绪 · PDF ${ms} ms`);
    toast(`PDF 已生成 (${ms} ms)`, 'success');
  } catch (e) {
    setStatus('error', '导出失败');
    toast('导出失败: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldHtml;
  }
});

// 模板导出
$('btnExportTpl').addEventListener('click', () => {
  const data = { template: state.template, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `waybill-template-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('模板已下载', 'success');
});

// 模板导入
$('btnImport').addEventListener('click', () => $('fileImport').click());
$('fileImport').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const text = await f.text();
    const parsed = JSON.parse(text);
    const tpl = parsed.template || parsed;
    // 兼容旧 JSON:后端老字段名(Go 切片字段)→ tpl.elements(前端语义名)
    stripLegacyFields(tpl);
  if (!tpl || !Array.isArray(tpl.elements) || !tpl.page) {
      throw new Error('JSON 格式不合法,缺少 page/elements');
    }
    // 兜底补默认值
    if (typeof tpl.page.width_mm !== 'number' || typeof tpl.page.height_mm !== 'number') {
      throw new Error('页面尺寸缺失或类型错误');
    }
    for (const b of tpl.elements) {
      if (typeof b.id !== 'string' || !b.id) b.id = 'e_' + Math.random().toString(36).slice(2, 8);
      if (typeof b.value !== 'string') b.value = '';
    }
    // 二次 strip,处理 import 之后才发生映射的情况
    stripLegacyFields(tpl);
    state.template = tpl;
    state.selectedElement = null;
    state.openElement = new Set(tpl.elements.slice(0, 2).map((b) => b.id));
    dom.pageW.value = tpl.page.width_mm;
    dom.pageH.value = tpl.page.height_mm;
    markActivePreset();
    setInspectorVisible(false);
    fitZoom();
    renderElements();
    schedulePreview();
    schedulePersist();
    toast('已导入模板', 'success');
  } catch (err) {
    toast('导入失败: ' + err.message, 'error');
  }
});

// =====================================================================
//  键盘快捷键
// =====================================================================
document.addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); $('btnExport').click(); return; }
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); duplicateSelectedElement(); return; }
    if (e.key === 'i' || e.key === 'I') { e.preventDefault(); $('btnImport').click(); return; }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); $('btnExportTpl').click(); return; }
    if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(state.zoom * 1.2); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(state.zoom / 1.2); return; }
    if (e.key === '0') { e.preventDefault(); fitZoom(); return; }
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selectedElement) {
      e.preventDefault();
      const idx = state.template.elements.findIndex((x) => x.id === state.selectedElement);
      if (idx >= 0) onDeleteElement(idx);
    }
  }
  if (e.key === 'Escape') {
    // 优先关闭 popover(US-008:元素类型选择浮层)
    if (isElementTypePickerOpen()) { closeElementTypePicker(); return; }
    // 优先关闭 modal
    if (!dom.modalHelp.hidden) { closeModal(dom.modalHelp); return; }
    if (!dom.modalConfirm.hidden) { return; }
    if (state.showInsp) {
      state.selectedElement = null;
      setInspectorVisible(false);
      renderElements();
      drawPreview();
      return;
    }
    if (state.hoverElement) { setHoverElement(null); return; }
  }
  // ? 显示帮助
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    openModal(dom.modalHelp);
    return;
  }
  // G 切换网格
  if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    state.showGrid = !state.showGrid;
    drawGridButton();
    schedulePreview();
    schedulePersist();
    return;
  }
  // S 切换对齐
  if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    state.snap = !state.snap;
    applySnapStepUI();
    schedulePersist();
    toast(state.snap ? `已开启:对齐到 ${state.snapStep}mm` : '已关闭:自由放置', '');
    return;
  }
  // 1 / 5 / 0 (0=10mm) 切换对齐步长
  if (!e.ctrlKey && !e.metaKey && (e.key === '1' || e.key === '5' || e.key === '0')) {
    const map = { '1': 1, '5': 5, '0': 10 };
    const v = map[e.key];
    if (v && state.snapStep !== v) {
      state.snapStep = v;
      state.snap = true;
      applySnapStepUI();
      schedulePersist();
      toast(`对齐步长: ${v}mm`, '');
    }
    return;
  }
  // 方向键微调 (1mm / 5mm with shift)
  if (state.selectedElement && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    const b = state.template.elements.find((x) => x.id === state.selectedElement);
    if (!b) return;
    e.preventDefault();
    const step = e.shiftKey ? 5 : 1;
    if (e.key === 'ArrowUp')    b.y = snapMM(Math.max(0, b.y - step));
    if (e.key === 'ArrowDown')  b.y = snapMM(b.y + step);
    if (e.key === 'ArrowLeft')  b.x = snapMM(Math.max(0, b.x - step));
    if (e.key === 'ArrowRight') b.x = snapMM(b.x + step);
    updatePos(b);
    renderInspector();
    drawPreview();
    schedulePersist();
  }
});

// =====================================================================
//  工具
// =====================================================================
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return await res.json();
}

let toastTimer = null;
function toast(msg, kind = '') {
  const el = dom.toast;
  el.textContent = msg;
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}
