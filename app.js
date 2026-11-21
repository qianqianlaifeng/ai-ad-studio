/* AI 创作台 · 界面与流程编排 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return new Date().toLocaleString('zh-CN', { hour12: false }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function merge(base, patch) {
    var out = {}, k;
    for (k in base) out[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], {}) : base[k];
    for (k in patch || {}) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && base[k] && typeof base[k] === 'object') out[k] = merge(base[k], patch[k]);
      else if (patch[k] !== undefined) out[k] = patch[k];
    }
    return out;
  }
  function toast(msg, type) {
    var box = $('#toastBox');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 4200);
  }
  function copy(text) {
    if (!text) { toast('没有可复制的内容', 'err'); return; }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast('已复制到剪贴板', 'ok'); }).catch(function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板', 'ok'); } catch (e) { toast('复制失败，请手动选择文本', 'err'); }
    ta.remove();
  }

  var IMAGE_STRATEGY =
    '【内置广告技能库已启用】剧情广告 / 品牌大片 / 达人带货 · 20 个有来源编号的正式小类\n' +
    '硬规则：一条广告只讲 1 个主卖点；前 1 秒出现商品/结果/冲突；台词按 4.5 字每秒配时长；A-roll 无背景音乐纯人声，B-roll 无背景音乐纯画面素材。\n' +
    '核心逻辑：叙事与重构 (Narrative & Texture)\n' +
    '广告技能遵循以下 9 个 step：\n' +
    '1.「开场钩子」Establishing Shot：必须包含大场景（海边日落 / 城市夜景等），先建立情绪。\n' +
    '2.「趋势递进」Rising Action：从大场景自然推到产品，不直接硬切特写。\n' +
    '3.「微观特写」Extreme Macro：必须交代产品材质纹理与工艺细节。\n' +
    '4.「英雄终镜」Hero Pack Shot：最后一镜定格完整产品，品牌标识清晰可辨。\n' +
    '5.「用光统一」：全场保持同一套柔光方向与色温，禁止跳光。\n' +
    '6.「色彩统一」：主色不超过三种，与品牌色一致。\n' +
    '7.「构图统一」：同一画幅比例，主体位置遵循三分法。\n' +
    '8.「无文字渲染」：画面中不生成任何文字或 Logo 字形，后期叠加。\n' +
    '9.「可剪辑性」：每个镜头独立成帧，便于后续图生视频。';

  var VIDEO_STRATEGY =
    '【内置带货视频技能：chuanzhang + 广告skill】\n' +
    '主播方案：按品类选人设，主播三视图（正面/侧面/背面同一人同一妆造）作为一致性锚点。\n' +
    '分镜五类：痛点画面 / 使用画面 / 推荐画面 / 效果画面 / 产品空镜（至少 1 条，首帧锚定商品图）。\n' +
    'A-roll：2-3 段口播，逐段换景别（中景→近景→手持推荐），开场即开口，末尾「无背景音乐，纯人声」。\n' +
    'B-roll：3-4 条，用分镜图做首帧，只写画面怎么动，末尾「无背景音乐，纯画面素材」。\n' +
    '口播时长：4.5 字/秒（5s≈22 字、4s≈18 字、3s≈13 字），时长不足就压缩台词。\n' +
    '质检：喷头外露再按压、开盖再挤出；产品相对大小真实；无多余手指/多手；无变形文字。';

  var S = {
    cfg: AIHub.loadConfig(),
    imageModel: '',
    ratio: '16:9',
    refImage: null,
    gridImage: null,
    gridCount: 9,
    gridCols: 3,
    gridRatio: '9:16',
    gridCells: [],
    busy: { prompt: false, image: false, videoPrompt: false, video: false, all: false, grid: false },
    images: [], videos: []
  };

  function readStore(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : []; } catch (e) { return []; } }
  function writeStore(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr.slice(0, 30))); }
    catch (e) {
      try { localStorage.setItem(key, JSON.stringify(arr.slice(0, 8))); toast('本地存储空间不足，仅保留最近 8 条记录', 'err'); }
      catch (e2) { toast('本地存储空间不足，历史未能保存', 'err'); }
    }
  }
  S.images = readStore('ai_studio_images');
  S.videos = readStore('ai_studio_videos');

  function product() {
    return {
      name: $('#pName').value.trim(), sell: $('#pSell').value.trim(), style: $('#pStyle').value.trim(),
      scene: $('#pScene').value.trim(), color: $('#pColor').value.trim(), duration: $('#pDuration').value || '15'
    };
  }
  function buildImagePromptLocal() {
    var p = product();
    var sk = window.AdSkills;
    var group = sk.inferGroup(p.style + p.scene, p.sell);
    var sub = sk.pickSubtype(group, p.name + p.sell, p.style + p.scene);
    var host = sk.detectHost(p.name + p.sell);
    return [
      '【产品档案】产品名：' + p.name + ' / 核心卖点：' + p.sell + ' / 主色：' + p.color,
      '【生产大类】' + group + '  【正式小类】' + sub.name + '（' + sub.id + '，来源仅内部使用）',
      '【主播方案】' + host.host.role + '，' + host.host.age + '岁，' + host.host.scene + '，' + host.host.look + '，' + host.host.mood,
      '【五类分镜】' + sk.FIVE_SHOTS.map(function (s, i) { return (i + 1) + '. ' + s.key + '：' + s.desc; }).join('\n'),
      '【小类分镜节奏】' + sub.beats.map(function (b, i) { return '  ' + i + '）' + b; }).join('\n'),
      '【画面风格】' + p.style + ' / 使用场景：' + p.scene,
      '【核心逻辑：叙事与重构 (Narrative & Texture)】',
      IMAGE_STRATEGY,
      '【输出要求】按小类分镜节奏逐镜描述画面、机位、光线、主体位置、产品真实相对大小与材质细节；商品外观全片一致；每镜独立成帧；竖屏 9:16；不生成任何画面文字。'
    ].join('\n');
  }
  function buildVideoPromptLocal() {
    var p = product();
    var sk = window.AdSkills;
    var ip = $('#imagePrompt').value.trim().slice(0, 700);
    var group = sk.inferGroup(p.style + p.scene, p.sell);
    var sub = sk.pickSubtype(group, p.name + p.sell, p.style + p.scene);
    var host = sk.detectHost(p.name + p.sell);
    return [
      'Role: 高端电商广告导演（内置技能：广告skill + chuanzhang）。生产大类：' + group + '，正式小类：' + sub.name + '（' + sub.id + '）。',
      'Task: 为「' + p.name + '」生成一段 ' + p.duration + ' 秒广告视频。卖点：' + p.sell + '。场景：' + p.scene + '。',
      '商品图｜所有分镜图中产品外观以此为准，必须保持颜色、形状、材质、包装、配件与真实相对大小一致。',
      '主播锚点：' + host.host.role + '，' + host.host.scene + '，' + host.host.look + '；三视图锁定人物形象，全片不变。',
      '分镜依据（摘要）：' + ip,
      'A-roll 口播（2-3 段，每段换景别，4.5 字/秒，末尾「无背景音乐，纯人声」）：',
      '  1. 中景·痛点开场：如果你也有' + p.sell.split(/[,，]/)[0] + '的困扰，先看这个。（开场即开口）',
      '  2. 近景·卖点证明：' + p.name + '，' + p.sell + '，这里直接展示给你。',
      '  3. 手持推荐：适合日常使用，喜欢可以看看这一款，' + p.name + '真的不错。',
      'B-roll 辅助镜头（3-4 条，用分镜图做首帧，末尾「无背景音乐，纯画面素材」）：',
      '  1. 首帧：痛点分镜图。画面：人物表情克制，镜头缓慢推近，画外音垫入 A-roll 第 1 段。',
      '  2. 首帧：使用分镜图。画面：手部真实使用动作，镜头缓慢推近细节；按压类须瓶盖已取下、喷头外露。',
      '  3. 首帧：产品空镜分镜图。画面：' + p.name + '静置' + p.scene + '，镜头缓慢环绕，光线流转，无主播出镜。',
      '  4. 首帧：效果分镜图。画面：材质/结果特写，焦点从背景过渡到产品表面。',
      'Constraints: 不新增画面文字；无镜头突变、无主体变形；' + sk.HARD_RULES.slice(3, 9).join('；') + '。'
    ].join('\n');
  }
  /* ---------- 分镜宫格图 ---------- */
  var GRID_SHOTS = {
    4: ['产品空镜', '痛点', '使用', '效果'],
    6: ['产品空镜', '痛点', '使用', '推荐', '效果', '产品英雄'],
    9: ['产品空镜', '痛点', '使用', '质感细节', '推荐', '效果', '场景全景', '手持产品', '产品英雄']
  };
  var SHOT_DESC = {
    '产品空镜': function (p) { return '产品为主体、人物不入画，' + p.name + '静置于' + p.scene + '，低角度特写，金色夕照扫过材质表面，氛围干净高级'; },
    '痛点': function (p) { return '人物轻微疲惫的中景，痛点道具入画，表情克制不夸张，冷调前景与暖调背景形成对比'; },
    '使用': function (p) { return '真实使用动作近景，手部与' + p.name + '的真实相对大小准确，动作符合产品物理结构，浅景深'; },
    '质感细节': function (p) { return p.name + '材质微距特写，' + (p.sell.split(/[,，]/).filter(Boolean)[0] || p.sell) + '的纹理清晰可见，侧逆光勾边，绒面/表面细节锐利'; },
    '推荐': function (p) { return '达人手持' + p.name + '对镜头温暖微笑，半身构图，像真实种草不像广告，产品约占画面三分之一'; },
    '效果': function (p) { var s = p.sell.split(/[,，]/).filter(Boolean); return '使用结果与细节特写，展示' + (s[1] || s[0] || p.sell) + '的可见证据，光线柔和，不夸张对比'; },
    '场景全景': function (p) { return '广角全景，' + p.scene + '完整呈现，' + p.name + '作为画面主视觉落在视觉中心，人物退为远景剪影'; },
    '手持产品': function (p) { return '人物双手捧起折叠好的' + p.name + '，半身平视，产品纹理与包边清晰，背景虚化'; },
    '产品英雄': function (p) { return p.name + '叠放于画面正中央的产品英雄镜头，正面平视，背景虚化日落，光线从右后方打入，轮廓光清晰'; }
  };
  function buildStoryboardCells(n) {
    var p = product();
    var names = GRID_SHOTS[n] || GRID_SHOTS[9];
    return names.map(function (name, i) {
      return { no: i + 1, name: name, desc: (SHOT_DESC[name] || SHOT_DESC['产品空镜'])(p) };
    });
  }
  function buildGridPrompt(cells, layout) {
    var p = product();
    var sk = window.AdSkills;
    var host = sk.detectHost(p.name + p.sell);
    var rows = Math.ceil(cells.length / layout.cols);
    var lines = [
      '专业电影分镜故事板（storyboard contact sheet），单张图片。',
      '【画布】' + layout.cols + ' 列 × ' + rows + ' 行，共 ' + cells.length + ' 个等大画格；画格之间用 6px 纯白细线分隔；整张图为 ' + layout.ratio + '，每个画格为竖构图。',
      '【产品基准】' + p.name + '；卖点：' + p.sell + '；主色：' + p.color + '。所有画格中的产品外观、颜色、格纹/纹理、材质、包装、配件与真实相对大小必须完全一致。',
      '【人物基准】' + host.host.role + '，' + host.host.age + '岁，' + host.host.scene + '，' + host.host.look + '；所有出现人物的画格必须是同一张脸、同一套服装。',
      '【场景与影调】' + p.scene + '；' + p.style + '；统一暖金色自然光，电影级浅景深。',
      '【逐格内容】'
    ];
    cells.forEach(function (c) { lines.push('第' + c.no + '格｜' + c.name + '：' + c.desc + '。'); });
    lines.push(
      '【硬性要求】每格独立成帧、构图不重复；产品相对大小真实；无多余手指、无多手多臂；无肢体变形；无穿模。',
      '【禁止文字】画面内不得出现任何文字、字母、数字、镜号、编号、字幕、水印、logo、箭头、边框装饰；镜号由后期界面叠加。'
    );
    return lines.join('\n');
  }
  function renderGridPreview() {
    if (!S.gridImage) { $('#gridPreview').hidden = true; $('#gridActions').hidden = true; return; }
    $('#gridImg').src = S.gridImage;
    $('#gridPreview').hidden = false;
    $('#gridActions').hidden = false;
    var m = String(S.gridRatio).match(/^(\d+):(\d+)$/);
    if (m) $('#gridPreview').style.setProperty('--ar', Number(m[1]) / Number(m[2]));
    var ov = $('#gridOverlay');
    ov.style.gridTemplateColumns = 'repeat(' + S.gridCols + ', 1fr)';
    ov.innerHTML = S.gridCells.map(function (c) {
      return '<span class="grid-cell"><b>' + c.no + '</b><i>' + esc(c.name) + '</i></span>';
    }).join('');
  }
  function generateStoryboard(silent) {
    if (S.busy.grid) return Promise.resolve(null);
    var missing = AIHub.validate('image');
    if (missing.length) { toast('图片接口未配置完整：' + missing.join('、') + '。请在设置中填写。', 'err'); if (!silent) openSettings('image'); return Promise.resolve(null); }
    var layout = { cols: S.gridCols, ratio: S.gridRatio };
    var cells = buildStoryboardCells(S.gridCount);
    var prompt = buildGridPrompt(cells, layout);
    var size = computeSize(layout.ratio, '1024');
    var model = S.imageModel || S.cfg.image.model;
    var channelName = channel('image');
    S.busy.grid = true;
    $('#btnGenGrid').disabled = true;
    setStatus('#statusGrid', '生成中…', 'busy');
    var t0 = Date.now();
    return AIHub.callImage({ prompt: prompt, n: 1, size: size, ratio: layout.ratio, model: S.imageModel || undefined })
      .then(function (res) {
        var url = res.urls[0];
        S.gridImage = url;
        S.gridCells = cells;
        renderGridPreview();
        addHistory('image', {
          id: uid() + '-grid', status: 'ok', time: now(), elapsed: ((Date.now() - t0) / 1000).toFixed(1) + 's',
          channel: channelName, model: '分镜宫格 · ' + model, ratio: layout.ratio,
          resolution: S.gridCount + '格 · ' + size, prompt: prompt, url: url
        });
        setStatus('#statusGrid', '已生成');
        if (!silent) toast(S.gridCount + ' 格分镜图已生成，可设为视频参考图', 'ok');
        S.busy.grid = false; $('#btnGenGrid').disabled = false;
        return { url: url, cells: cells };
      })
      .catch(function (e) {
        setStatus('#statusGrid', '失败', 'err');
        toast('分镜宫格图生成失败：' + e.message, 'err');
        S.busy.grid = false; $('#btnGenGrid').disabled = false;
        return null;
      });
  }
  function useGridAsRef() {
    if (!S.gridImage) { toast('请先生成分镜宫格图', 'err'); return; }
    S.refImage = S.gridImage;
    $('#refMode').value = 'reference';
    $('#refSource').value = 'grid';
    $('#refPreview').hidden = false;
    $('#refImg').src = S.gridImage;
    toast('已设为视频参考图，参考模式切到 reference', 'ok');
  }
  function syncPromptCounts() {
    $('#promptCount').textContent = $('#imagePrompt').value.length + ' 字';
    $('#videoPromptCount').textContent = $('#videoPrompt').value.length + ' 字';
  }
  function setStatus(id, text, cls) { var el = $(id); el.textContent = text; el.className = 'status' + (cls ? ' ' + cls : ''); }
  function setBusy(key, busy, label) {
    S.busy[key] = busy;
    var map = { prompt: '#btnGenPrompt', image: '#btnGenImage', videoPrompt: '#btnGenVideoPrompt', video: '#btnGenVideo', all: '#btnAll' };
    var btn = $(map[key]);
    if (btn) btn.disabled = busy;
    if (key === 'prompt') setStatus('#statusPrompt', busy ? '生成中…' : '就绪', busy ? 'busy' : '');
    if (key === 'videoPrompt') setStatus('#statusVideoPrompt', busy ? '生成中…' : '就绪', busy ? 'busy' : '');
    if (label && key === 'video') setStatus('#statusVideo', label, 'busy');
  }

  /* ---------- 界面配置 ---------- */
  var SCHEMA = {
    text: [
      { k: 'preset', label: '服务商预设', type: 'preset', wide: true, options: ['agnes', 'openai', 'openrouter', 'deepseek', 'siliconflow', 'gemini', 'custom'] },
      { k: 'baseUrl', label: '接口地址 Base URL', placeholder: 'https://api.openai.com/v1', wide: true },
      { k: 'apiKey', label: 'API Key', type: 'secret', placeholder: 'sk-...', wide: true },
      { k: 'model', label: '模型名称（与其他模型独立）', placeholder: 'gpt-4o-mini', suggestions: ['agnes-3.0-flash', 'agnes-2.5-flash', 'gpt-4o-mini'] },
      { k: 'path', label: '接口路径', placeholder: '/chat/completions' },
      { k: 'headers', label: '请求头模板（JSON，支持 {{key}}）', type: 'code', wide: true },
      { k: 'body', label: '请求体模板（JSON，支持 {{model}} {{messages}} {{prompt}}）', type: 'code', wide: true },
      { k: 'response', label: '响应文本提取路径（逗号分隔，按优先级）', type: 'code', wide: true },
      { k: 'timeout', label: '超时（毫秒）', type: 'number', wide: true }
    ],
    image: [
      { k: 'preset', label: '服务商预设', type: 'preset', wide: true, options: ['agnes', 'openai', 'siliconflow', 'gemini', 'custom'] },
      { k: 'baseUrl', label: '接口地址 Base URL', placeholder: 'https://api.openai.com/v1', wide: true },
      { k: 'apiKey', label: 'API Key', type: 'secret', placeholder: 'sk-...', wide: true },
      { k: 'model', label: '模型名称（与其他模型独立）', placeholder: 'gpt-image-1', suggestions: ['agnes-image-2.5-flash', 'agnes-image-2.1-flash', 'gpt-image-1'] },
      { k: 'path', label: '接口路径', placeholder: '/images/generations' },
      { k: 'headers', label: '请求头模板（JSON）', type: 'code', wide: true },
      { k: 'body', label: '请求体模板（{{prompt}} {{size}} {{n}} {{ratio}}）', type: 'code', wide: true },
      { k: 'resultPaths', label: '结果提取路径（逗号分隔）', type: 'code', wide: true },
      { k: 'timeout', label: '超时（毫秒）', type: 'number', wide: true }
    ],
    video: [
      { k: 'preset', label: '服务商预设', type: 'preset', wide: true, options: ['agnes', 'async', 'sync', 'custom'] },
      { k: 'baseUrl', label: '接口地址 Base URL', placeholder: 'https://your-video-api.com', wide: true },
      { k: 'apiKey', label: 'API Key', type: 'secret', placeholder: 'ak-...', wide: true },
      { k: 'model', label: '模型名称（与其他模型独立）', placeholder: '例如 agnes-video-2.5-flash', suggestions: ['agnes-video-2.5-flash', 'agnes-video-2.5', 'agnes-video-v2.5'] },
      { k: 'path', label: '创建任务路径', placeholder: '/videos/generations' },
      { k: 'queryPath', label: '查询任务路径（{{taskId}}）', placeholder: '/videos/{{taskId}}' },
      { k: 'queryMethod', label: '查询方式（GET / POST）', placeholder: 'GET' },
      { k: 'headers', label: '请求头模板（JSON）', type: 'code', wide: true },
      { k: 'body', label: '请求体模板（{{prompt}} {{imageUrl}} {{imagesJson}} {{ratio}} {{duration}} {{fps}} {{resolution}}）', type: 'code', wide: true },
      { k: 'bodyRef', label: '参考图模式请求体（可选，留空则用上面的模板；可用 {{imagesJson}}）', type: 'code', wide: true },
      { k: 'bodyKeyframe', label: '首帧模式请求体（可选，留空则用上面的模板；可用 {{imageUrl}} / {{firstFrame}}）', type: 'code', wide: true },
      { k: 'taskPaths', label: '任务 ID 提取路径', type: 'code', wide: true },
      { k: 'statusPaths', label: '任务状态提取路径', type: 'code', wide: true },
      { k: 'successValues', label: '成功状态值（逗号分隔）', wide: true },
      { k: 'failValues', label: '失败状态值（逗号分隔）', wide: true },
      { k: 'resultPaths', label: '视频地址提取路径（逗号分隔）', type: 'code', wide: true },
      { k: 'pollMs', label: '轮询间隔（毫秒）', type: 'number' },
      { k: 'timeout', label: '最大等待（毫秒）', type: 'number' }
    ],
    general: [
      { k: 'proxyEnabled', label: '启用本地代理转发（解决跨域 CORS）', type: 'bool', wide: true },
      { k: 'proxyUrl', label: '本地代理地址', placeholder: 'http://127.0.0.1:8787/api/proxy', wide: true }
    ]
  };

  var draft = null;
  var currentTab = 'text';
  function renderSettings() {
    var host = $('#settingsForms');
    var fields = SCHEMA[currentTab];
    var cfg = draft[currentTab];
    var html = '';
    if (SCHEMA[currentTab][0] && SCHEMA[currentTab][0].type === 'preset') {
      var ps = SCHEMA[currentTab][0].options;
      html += '<div class="cfg-head"><h3>' + ({ text: '文本模型', image: '图片模型', video: '视频模型' })[currentTab] + '</h3>' +
        '<span class="hint">预设仅填入默认模板，保存后生效</span></div>';
    }
    if (currentTab === 'general') html += '<div class="hint">浏览器直连第三方接口可能被 CORS 拦截。开启代理后，请先在本目录运行 <b>node server.js</b>，再通过本地地址访问页面。</div>';
    html += '<div class="cfg-grid">';
    fields.forEach(function (f, i) {
      var v = cfg[f.k];
      // 每个标签页独立 id，避免三个模型表单互相串值
      var id = 'cfg-' + currentTab + '-' + f.k;
      var cls = 'field' + (f.wide ? ' wide' : '');
      var label = '<label class="' + cls + '" for="' + id + '"><span>' + esc(f.label) + '</span>';
      if (f.type === 'bool') {
        html += '<label class="' + cls + '"><span>' + esc(f.label) + '</span><select id="' + id + '"><option value="1"' + (v ? ' selected' : '') + '>开启</option><option value="0"' + (!v ? ' selected' : '') + '>关闭</option></select></label>';
        return;
      }
      if (f.type === 'preset') {
        html += label + '<select id="' + id + '">' + ps.map(function (p) { return '<option value="' + p + '"' + (v === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select></label>';
        return;
      }
      var input;
      if (f.type === 'code' || f.type === 'secret') {
        var type = f.type === 'secret' ? 'password' : 'text';
        var extra = f.type === 'code' ? ' class="code-input"' : '';
        input = '<textarea id="' + id + '"' + extra + ' rows="' + (f.type === 'code' ? 3 : 1) + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(v == null ? '' : v) + '</textarea>';
      } else {
        var listAttr = f.suggestions ? ' list="dl-' + id + '"' : '';
        input = '<input id="' + id + '" type="' + (f.type === 'number' ? 'number' : 'text') + '"' + listAttr + ' value="' + esc(v == null ? '' : v) + '" placeholder="' + esc(f.placeholder || '') + '">';
        if (f.suggestions) input += '<datalist id="dl-' + id + '">' + f.suggestions.map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>';
      }
      html += label + input + '</label>';
    });
    html += '</div>';
    if (currentTab === 'text') html += '<div class="row-2"><button class="btn btn-outline" id="btnTestText">测试文本接口连通性</button><span class="hint">测试前会先保存当前配置，发送一条极短请求。</span></div>';
    host.innerHTML = html;
    $('#cfg-' + currentTab + '-preset') && $('#cfg-' + currentTab + '-preset').addEventListener('change', function (e) {
      var name = e.target.value;
      var p = AIHub.PRESETS[currentTab][name];
      if (!p) return;
      draft[currentTab] = merge(draft[currentTab], p);
      draft[currentTab].preset = name;
      renderSettings();
    });
    $('#btnTestText') && $('#btnTestText').addEventListener('click', function () {
      collectDraft(); AIHub.saveConfig(draft); refreshConfigUI();
      toast('正在测试文本接口…');
      AIHub.testText().then(function (t) { toast('接口正常，返回：' + String(t).slice(0, 60), 'ok'); })
        .catch(function (e) { toast('测试失败：' + e.message, 'err'); });
    });
  }
  function collectDraft() {
    // 只读取当前渲染的标签页；其他标签页的值本来就保存在 draft 中，
    // 绝不能拿当前 DOM 的同名输入框去覆盖它们。
    SCHEMA[currentTab].forEach(function (f) {
      var el = document.getElementById('cfg-' + currentTab + '-' + f.k);
      if (!el) return;
      var v = el.value;
      if (f.type === 'number') v = Number(v) || 0;
      if (f.type === 'bool') v = v === '1';
      draft[currentTab][f.k] = v;
    });
  }
  function openSettings(tab) {
    draft = merge(AIHub.DEFAULT_CONFIG, AIHub.loadConfig());
    currentTab = tab || 'text';
    $$('#settingsTabs .tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === currentTab); });
    renderSettings();
    $('#settingsOverlay').hidden = false;
  }
  function closeSettings() {
    collectDraft();
    AIHub.saveConfig(draft);
    S.cfg = AIHub.loadConfig();
    refreshConfigUI();
    $('#settingsOverlay').hidden = true;
  }
  function channel(kind) {
    var c = S.cfg[kind];
    if (!c.baseUrl) return '未配置';
    try { return new URL(c.baseUrl).hostname; } catch (e) { return c.preset || '自定义'; }
  }
  function refreshConfigUI() {
    var c = S.cfg;
    $('#modelPill').textContent = '文本 ' + (c.text.model || '-') + ' · 图片 ' + (c.image.model || '-') + ' · 视频 ' + (c.video.model || '-');
    $('#imageChannel').textContent = '通道：' + channel('image');
    $('#videoChannel').textContent = '通道：' + channel('video');
    var n = [c.text, c.image, c.video].filter(function (x) { return x.apiKey || x.baseUrl !== AIHub.DEFAULT_CONFIG[x === c.text ? 'text' : x === c.image ? 'image' : 'video'].baseUrl; }).length;
    $('#connDot').classList.toggle('on', n > 0);
    $('#connText').textContent = n ? '已配置 ' + n + ' 个接口' : '尚未配置接口';
    $('#heroHint').textContent = n ? '接口已就绪，可直接运行全流程' : '未配置接口时将使用内置提示词模板；图像/视频生成需要你自己的接口与密钥';
  }

  /* ---------- 历史记录 ---------- */
  function historyItem(kind, item) {
    var isImg = kind === 'image';
    var thumb = isImg
      ? (item.url ? '<img src="' + esc(item.url) + '" alt="生成图">' : '<span class="ph">▧</span>')
      : (item.url ? '<video src="' + esc(item.url) + '" muted playsinline></video>' : '<span class="ph">▶</span>');
    var actions = isImg
      ? '<button class="mini-btn" data-act="full">全屏</button><button class="mini-btn" data-act="copy">复制提示词</button><button class="mini-btn" data-act="ref">设为参考图</button>'
      : '<button class="mini-btn" data-act="full">全屏</button>' + (item.url ? '<a class="mini-btn" href="' + esc(item.url) + '" download="ai-video-' + esc(item.id) + '.mp4">下载</a>' : '') + '<button class="mini-btn" data-act="copy">复制提示词</button>';
    return '<div class="history-item" data-id="' + esc(item.id) + '" data-kind="' + kind + '">' +
      '<div class="history-thumb">' + thumb + '</div>' +
      '<div class="history-info">' +
      '<div class="history-row"><span class="' + (item.status === 'error' ? 'fail-dot' : 'ok-dot') + '">● ' + (item.status === 'error' ? '生成失败' : '生成已完成') + '</span><span class="history-title">' + esc((item.prompt || '').replace(/\s+/g, ' ').slice(0, 50)) + '</span></div>' +
      '<div class="history-meta">时间：' + esc(item.time) + ' · 耗时：' + esc(item.elapsed) + '<br>API通道：' + esc(item.channel) + ' · 生成模型：' + esc(item.model) + '<br>比例：' + esc(item.ratio) + ' · 分辨率：' + esc(item.resolution) + (item.error ? '<br>错误：' + esc(item.error) : '') + '</div>' +
      '<div class="history-actions">' + actions + '<button class="mini-btn" data-act="del">删除</button></div>' +
      '</div></div>';
  }
  function renderHistory() {
    $('#imageHistory').innerHTML = S.images.length ? S.images.map(function (i) { return historyItem('image', i); }).join('') : '<div class="empty">暂无生成记录，点击「开始生成」后图片会出现在这里</div>';
    $('#videoHistory').innerHTML = S.videos.length ? S.videos.map(function (i) { return historyItem('video', i); }).join('') : '<div class="empty">暂无视频记录</div>';
    $('#navImageCount').textContent = S.images.length;
    $('#navVideoCount').textContent = S.videos.length;
  }
  function addHistory(kind, item) {
    var arr = kind === 'image' ? S.images : S.videos;
    arr.unshift(item);
    writeStore(kind === 'image' ? 'ai_studio_images' : 'ai_studio_videos', arr);
    renderHistory();
  }
  function handleHistoryAction(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var itemEl = btn.closest('.history-item');
    var id = itemEl.dataset.id, kind = itemEl.dataset.kind;
    var arr = kind === 'image' ? S.images : S.videos;
    var item = arr.find(function (i) { return i.id === id; });
    if (!item) return;
    var act = btn.dataset.act;
    if (act === 'full') {
      if (kind === 'image') { $('#lightboxImg').src = item.url; $('#lightbox').hidden = false; }
      else { window.open(item.url, '_blank'); }
    } else if (act === 'copy') copy(item.prompt || '');
    else if (act === 'ref') { S.refImage = item.url; $('#refSource').value = 'latest'; $('#refPreview').hidden = false; $('#refImg').src = item.url; toast('已设为视频参考图', 'ok'); }
    else if (act === 'del') {
      var i = arr.indexOf(item); arr.splice(i, 1);
      writeStore(kind === 'image' ? 'ai_studio_images' : 'ai_studio_videos', arr); renderHistory();
    }
  }

  /* ---------- 生成流程 ---------- */
  function computeSize(ratio, level) {
    var m = String(ratio).match(/^(\d+):(\d+)$/);
    var w = 1536, h = 1024;
    if (m) {
      var a = Number(m[1]), b = Number(m[2]);
      if (a > b) { w = 1536; h = Math.round(1536 * b / a); }
      else { h = 1536; w = Math.round(1536 * a / b); }
    }
    var k = level === '4k' ? 4 : level === '2k' ? 2 : 1;
    if (level === '1024') { var s = Math.max(w, h); w = Math.round(1024 * w / s); h = Math.round(1024 * h / s); }
    return (Math.round(w * k / 8) * 8) + 'x' + (Math.round(h * k / 8) * 8);
  }
  function textConfigured() { return !!(S.cfg.text.apiKey || /^https?:\/\//i.test(S.cfg.text.path)); }

  function generateImagePrompt() {
    if (S.busy.prompt) return Promise.resolve(null);
    setBusy('prompt', true);
    var task = textConfigured()
      ? AIHub.callText({
        system: (window.AdSkills && window.AdSkills.SYSTEM_PROMPT) || '你是顶级电商广告创意总监。按内置广告技能库输出可直接用于图像生成的详细中文提示词。只输出提示词正文。',
        prompt: JSON.stringify(product(), null, 2)
      })
      : Promise.resolve(buildImagePromptLocal());
    return task.then(function (text) {
      $('#imagePrompt').value = text.trim(); syncPromptCounts();
      toast(textConfigured() ? '提示词已由文本模型生成' : '未配置文本接口，已使用内置叙事模板', 'ok');
      setBusy('prompt', false); setStatus('#statusPrompt', '已生成');
      return text;
    }).catch(function (e) {
      setBusy('prompt', false); setStatus('#statusPrompt', '生成失败', 'err');
      toast('提示词生成失败：' + e.message + '（可配置文本接口，或继续使用内置模板）', 'err');
      return null;
    });
  }

  function generateVideoPrompt() {
    if (S.busy.videoPrompt) return Promise.resolve(null);
    setBusy('videoPrompt', true);
    var task = textConfigured()
      ? AIHub.callText({
        system: (window.AdSkills && window.AdSkills.VIDEO_SYSTEM_PROMPT) || '你是高端电商广告导演。基于给定分镜提示词输出 A-roll / B-roll 视频生成提示词，语言中文。',
        prompt: '产品信息：' + JSON.stringify(product()) + '\n\n分镜提示词：\n' + $('#imagePrompt').value.slice(0, 4000)
      })
      : Promise.resolve(buildVideoPromptLocal());
    return task.then(function (text) {
      $('#videoPrompt').value = text.trim();
      $('#videoGenPrompt').value = text.trim();
      syncPromptCounts();
      setBusy('videoPrompt', false); setStatus('#statusVideoPrompt', '已生成');
      toast('视频提示词已生成', 'ok');
      return text;
    }).catch(function (e) {
      setBusy('videoPrompt', false); setStatus('#statusVideoPrompt', '生成失败', 'err');
      toast('视频提示词生成失败：' + e.message, 'err');
      return null;
    });
  }

  function generateImages(silent) {
    if (S.busy.image) return Promise.resolve([]);
    var prompt = $('#imagePrompt').value.trim();
    if (!prompt) { toast('请先生成或填写提示词', 'err'); return Promise.resolve([]); }
    var missing = AIHub.validate('image');
    if (missing.length) { toast('图片接口未配置完整：' + missing.join('、') + '。请在设置中填写。', 'err'); if (!silent) openSettings('image'); return Promise.resolve([]); }
    setBusy('image', true);
    var count = Number($('#imageCount').value) || 1;
    var level = $('#imageSize').value;
    var size = computeSize(S.ratio, level);
    var channelName = channel('image');
    var model = S.imageModel || S.cfg.image.model;
    var chain = Promise.resolve([]);
    for (var i = 0; i < count; i++) {
      (function (idx) {
        chain = chain.then(function (acc) {
          var t0 = Date.now();
          return AIHub.callImage({ prompt: prompt, n: 1, size: size, ratio: S.ratio, model: S.imageModel || undefined })
            .then(function (res) {
              res.urls.forEach(function (u) {
                addHistory('image', {
                  id: uid() + '-' + idx, status: 'ok', time: now(), elapsed: ((Date.now() - t0) / 1000).toFixed(1) + 's',
                  channel: channelName, model: model, ratio: S.ratio, resolution: level + ' · ' + size,
                  prompt: prompt, url: u
                });
              });
              if (!silent) toast('第 ' + (idx + 1) + ' 张图片生成完成', 'ok');
              return acc.concat(res.urls);
            }).catch(function (e) {
              addHistory('image', {
                id: uid() + '-' + idx, status: 'error', time: now(), elapsed: ((Date.now() - t0) / 1000).toFixed(1) + 's',
                channel: channelName, model: model, ratio: S.ratio, resolution: level, prompt: prompt, url: '', error: e.message
              });
              if (!silent) toast('图片生成失败：' + e.message, 'err');
              return acc;
            });
        });
      })(i);
    }
    return chain.then(function (urls) { setBusy('image', false); return urls; });
  }

  function generateVideo(silent, opts) {
    opts = opts || {};
    if (S.busy.video) return Promise.resolve(null);
    var prompt = opts.prompt || $('#videoGenPrompt').value.trim() || $('#videoPrompt').value.trim();
    if (!prompt) { toast('请先生成或填写视频提示词', 'err'); return Promise.resolve(null); }
    var missing = AIHub.validate('video');
    if (missing.length) { toast('视频接口未配置完整：' + missing.join('、') + '。请在设置中填写。', 'err'); if (!silent) openSettings('video'); return Promise.resolve(null); }
    setBusy('video', true);
    var t0 = Date.now();
    var refMode = opts.refMode || $('#refMode').value || 'text';
    var refUrl = opts.imageUrl || S.refImage;
    var refSrc = $('#refSource').value;
    if (!refUrl && refSrc === 'latest' && S.images.length) refUrl = S.images.find(function (i) { return i.url; });
    if (!refUrl && refSrc === 'grid' && S.gridImage) refUrl = S.gridImage;
    if (refUrl && typeof refUrl === 'object') refUrl = refUrl.url;
    if (refMode === 'text') refUrl = null;
    if (refMode !== 'text' && !refUrl) {
      setBusy('video', false);
      toast('「' + (refMode === 'reference' ? '参考图' : '首帧图') + '」模式需要一张参考图：请先生成分镜宫格图，或在追画区域选一张图', 'err');
      return Promise.resolve(null);
    }
    if (refMode === 'reference' && refUrl) {
      prompt += '\n\n【参考图约束】以参考图为分镜与视觉基准，输出单一连续画面；不要出现九宫格分屏、画格边框、拼贴或分镜线；产品外观、颜色、材质与人物形象严格沿用参考图。';
    }
    var channelName = channel('video');
    var model = S.cfg.video.model;
    var outRatio = (refMode !== 'text' && refSrc === 'grid') ? S.gridRatio : S.ratio;
    var payload = {
      prompt: prompt,
      duration: Number(opts.duration || $('#videoDuration').value) || 15,
      fps: Number($('#videoFps').value) || 30,
      resolution: $('#videoRes').value,
      ratio: outRatio,
      imageUrl: refUrl || null,
      refMode: refMode
    };
    return AIHub.callVideo(payload, function (msg) {
      if (opts.onProgress) opts.onProgress(msg);
      if (!silent) setStatus('#statusVideo', msg, 'busy');
    }).then(function (res) {
      addHistory('video', {
        id: uid(), status: 'ok', time: now(), elapsed: ((Date.now() - t0) / 1000).toFixed(1) + 's',
        channel: channelName, model: (opts.tag ? opts.tag + ' · ' : '') + model + (refMode !== 'text' ? ' · ' + (refMode === 'reference' ? '参考图' : '首帧') : ''), ratio: payload.ratio, resolution: payload.resolution + ' / ' + payload.fps + 'fps',
        prompt: prompt, url: res.url
      });
      setBusy('video', false); setStatus('#statusVideo', '已完成');
      if (!silent) toast('视频生成完成', 'ok');
      return res;
    }).catch(function (e) {
      addHistory('video', {
        id: uid(), status: 'error', time: now(), elapsed: ((Date.now() - t0) / 1000).toFixed(1) + 's',
        channel: channelName, model: (opts.tag ? opts.tag + ' · ' : '') + model + (refMode !== 'text' ? ' · ' + (refMode === 'reference' ? '参考图' : '首帧') : ''), ratio: payload.ratio, resolution: payload.resolution, prompt: prompt, url: '', error: e.message
      });
      setBusy('video', false); setStatus('#statusVideo', '失败', 'err');
      if (!silent) toast('视频生成失败：' + e.message, 'err');
      return null;
    });
  }

  function progress(pct, label) { $('#progressWrap').hidden = false; $('#progressFill').style.width = pct + '%'; $('#progressLabel').textContent = label; }

  function runAll() {
    if (S.busy.all) return;
    S.busy.all = true; $('#btnAll').disabled = true;
    try {
      progress(8, '1/5 生成叙事提示词…');
      generateImagePrompt().then(function () {
        progress(22, '2/5 生成分镜宫格图…');
        return generateStoryboard(true);
      }).then(function (grid) {
        progress(42, '3/5 生成主视觉图…');
        return generateImages(true).then(function (urls) { return { urls: urls, grid: grid }; });
      }).then(function (r) {
        if (!r.urls.length) throw new Error('图片生成未成功，流程已停止');
        progress(60, '4/5 生成视频提示词…');
        return generateVideoPrompt().then(function () { return r; });
      }).then(function (r) {
        progress(78, '5/5 生成视频' + (r.grid ? '（参考宫格图）' : '') + '…');
        return generateVideo(true, { refMode: r.grid ? 'reference' : 'text', imageUrl: r.grid ? r.grid.url : null });
      }).then(function (res) {
        progress(100, res ? '全部完成' : '流程结束（视频未成功）');
        toast(res ? '全流程完成：宫格图、图片与视频已生成' : '流程结束，请查看视频历史中的错误信息', res ? 'ok' : 'err');
        S.busy.all = false; $('#btnAll').disabled = false;
      }).catch(function (e) {
        progress(100, '流程中断');
        toast('一键生成中断：' + e.message, 'err');
        S.busy.all = false; $('#btnAll').disabled = false;
      });
    } catch (e) { S.busy.all = false; $('#btnAll').disabled = false; toast('流程异常：' + e.message, 'err'); }
  }

  /* ---------- 国内 Agnes 配置与 30S 广告流程 ---------- */
  // 安全：密钥绝不写入源码（公开仓库会泄露）。由使用者在设置页自行填写，
  // 仅保存在其本机浏览器的 localStorage 中。
  function isStaticHost() {
    return /github\.io$/i.test(location.hostname) || /pages\.dev$/i.test(location.hostname);
  }
  function applyAgnesConfig(silent) {
    var cfg = merge(AIHub.DEFAULT_CONFIG, AIHub.loadConfig());
    ['text', 'image', 'video'].forEach(function (kind) {
      var existingKey = cfg[kind].apiKey || ''; // 保留用户已填写的密钥
      cfg[kind] = merge(cfg[kind], AIHub.PRESETS[kind].agnes);
      cfg[kind].preset = 'agnes';
      cfg[kind].apiKey = existingKey;
    });
    // 静态部署（github.io）没有本地代理，必须直连；本地运行时开启代理更稳定
    cfg.general.proxyEnabled = !isStaticHost();
    AIHub.saveConfig(cfg);
    S.cfg = AIHub.loadConfig();
    draft = merge(AIHub.DEFAULT_CONFIG, S.cfg);
    refreshConfigUI();
    if (!$('#settingsOverlay').hidden) renderSettings();
    if (!silent) toast(isStaticHost()
      ? '已填入 Agnes 接口配置。请在设置中分别填写你的 API Key（仅存本机）。'
      : '已填入国内 Agnes 配置：文本 / 图片 / 视频', 'ok');
  }

  function run30() {
    if (S.busy.all) return;
    S.busy.all = true;
    $('#btnAll30').disabled = true; $('#btnAll').disabled = true;
    var segCount = 3, segSeconds = 10;
    var oldCount = $('#imageCount').value;
    $('#imageCount').value = '1';
    function finish(msg, ok) {
      $('#imageCount').value = oldCount;
      S.busy.all = false;
      $('#btnAll30').disabled = false; $('#btnAll').disabled = false;
      progress(100, ok ? '30S 广告已完成' : '流程结束');
      toast(msg, ok ? 'ok' : 'err');
    }
    progress(4, '1/6 生成 30 秒广告叙事提示词…');
    var gridRef = null;
    generateImagePrompt().then(function () {
      progress(12, '2/6 生成分镜宫格图…');
      return generateStoryboard(true);
    }).then(function (grid) {
      gridRef = grid && grid.url ? grid.url : null;
      progress(20, '3/6 生成主视觉参考图…');
      return generateImages(true);
    }).then(function () {
      progress(28, '4/6 生成视频提示词…');
      return generateVideoPrompt();
    }).then(function () {
      var basePrompt = $('#videoPrompt').value.trim();
      var phases = ['开场大场景建立，镜头缓慢推进', '产品出场与材质微距特写', '英雄定格，品牌氛围收尾'];
      var urls = [], chain = Promise.resolve();
      for (var i = 0; i < segCount; i++) {
        (function (idx) {
          chain = chain.then(function () {
            progress(34 + idx * 16, '5/6 生成第 ' + (idx + 1) + '/' + segCount + ' 段（10 秒）…');
            var segPrompt = basePrompt + '\n\n【30 秒广告分段 ' + (idx + 1) + '/' + segCount + '，本段 10 秒；画面任务：' + phases[idx] + '；镜头与产品保持一致】';
            return generateVideo(true, {
              prompt: segPrompt, duration: segSeconds, tag: '30S片段' + (idx + 1),
              refMode: gridRef ? 'reference' : 'text', imageUrl: gridRef,
              onProgress: function (msg) { progress(34 + idx * 16, '5/6 第' + (idx + 1) + '段：' + String(msg).slice(0, 38)); }
            });
          }).then(function (res) { if (res && res.url) urls.push({ i: idx, url: res.url }); });
        })(i);
      }
      return chain.then(function () { return urls; });
    }).then(function (urls) {
      if (urls.length < segCount) { finish('仅生成 ' + urls.length + '/' + segCount + ' 段视频，未执行合并，请查看视频历史', false); return; }
      progress(88, '6/6 本地合并 30 秒成片…');
      urls.sort(function (a, b) { return a.i - b.i; });
      return AIHub.mergeVideos(urls.map(function (u) { return u.url; }), '30s-ad').then(function (res) {
        addHistory('video', {
          id: uid(), status: 'ok', time: now(), elapsed: '本地合并', channel: 'ffmpeg 拼接',
          model: '30S 成片（' + segCount + '×10s）', ratio: S.ratio, resolution: '720P',
          prompt: $('#videoPrompt').value.trim().slice(0, 600), url: res.url
        });
        finish('30 秒广告已生成并合并完成', true);
      }).catch(function (e) { finish('三段视频已生成，但合并失败：' + e.message, false); });
    }).catch(function (e) { finish('30S 流程中断：' + e.message, false); });
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    $$('.nav-item[data-jump]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.jump;
        if (t === 'settings') { openSettings(); return; }
        var el = document.getElementById(t);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
          setTimeout(function () { el.classList.remove('flash'); }, 1200);
        }
      });
    });
    $('#btnSettings').addEventListener('click', function () { openSettings(); });
    $('#btnAgnesSetup').addEventListener('click', function () { applyAgnesConfig(); });
    $('#btnAll30').addEventListener('click', run30);
    $('#btnCloseSettings').addEventListener('click', closeSettings);
    $('#settingsOverlay').addEventListener('click', function (e) { if (e.target === this) closeSettings(); });
    $$('#settingsTabs .tab').forEach(function (t) {
      t.addEventListener('click', function () {
        if (draft) collectDraft();
        currentTab = t.dataset.tab;
        $$('#settingsTabs .tab').forEach(function (x) { x.classList.toggle('active', x === t); });
        renderSettings();
      });
    });
    $('#btnSaveConfig').addEventListener('click', function () { collectDraft(); AIHub.saveConfig(draft); S.cfg = AIHub.loadConfig(); refreshConfigUI(); $('#settingsOverlay').hidden = true; toast('设置已保存', 'ok'); });
    $('#btnResetConfig').addEventListener('click', function () { S.cfg = AIHub.resetConfig(); draft = merge(AIHub.DEFAULT_CONFIG, S.cfg); renderSettings(); refreshConfigUI(); toast('已恢复默认配置', 'ok'); });

    $('#imagePrompt').addEventListener('input', syncPromptCounts);
    $('#videoPrompt').addEventListener('input', syncPromptCounts);
    $('#btnCopyImagePrompt').addEventListener('click', function () { copy($('#imagePrompt').value); });
    $('#btnCopyVideoPrompt').addEventListener('click', function () { copy($('#videoPrompt').value); });
    $('#btnGenPrompt').addEventListener('click', generateImagePrompt);
    $('#btnGenVideoPrompt').addEventListener('click', generateVideoPrompt);
    $('#btnGenImage').addEventListener('click', function () { generateImages(false); });
    $('#btnGenGrid').addEventListener('click', function () { generateStoryboard(false); });
    $('#btnGridRef').addEventListener('click', useGridAsRef);
    $('#btnGridFull').addEventListener('click', function () { if (S.gridImage) { $('#lightboxImg').src = S.gridImage; $('#lightbox').hidden = false; } });
    $('#gridCountRow').addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      $$('#gridCountRow .chip').forEach(function (x) { x.classList.remove('active'); });
      c.classList.add('active');
      S.gridCount = Number(c.dataset.count);
      S.gridCols = Number(c.dataset.cols);
      S.gridRatio = c.dataset.ratio;
    });
    $('#btnGenVideo').addEventListener('click', function () { generateVideo(false); });
    $('#btnAll').addEventListener('click', runAll);

    $('#imageModels').addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      $$('#imageModels .chip').forEach(function (x) { x.classList.remove('active'); });
      c.classList.add('active'); S.imageModel = c.dataset.model;
    });
    $('#ratioRow').addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      $$('#ratioRow .chip').forEach(function (x) { x.classList.remove('active'); });
      c.classList.add('active'); S.ratio = c.dataset.ratio;
    });
    $('#videoDuration').addEventListener('input', function () { $('#durationVal').textContent = this.value + 's'; });
    $('#videoPrompt').addEventListener('input', function () { $('#videoGenPrompt').value = this.value; });
    $('#videoPrompt').addEventListener('change', function () { $('#videoGenPrompt').value = this.value; });

    $('#refSource').addEventListener('change', function () {
      if (this.value === 'none') { S.refImage = null; $('#refPreview').hidden = true; }
      else if (this.value === 'latest') {
        var latest = S.images.find(function (i) { return i.url; });
        if (latest) { S.refImage = latest.url; $('#refPreview').hidden = false; $('#refImg').src = latest.url; }
        else { toast('追画区域还没有可用图片', 'err'); this.value = 'none'; }
      } else if (this.value === 'grid') {
        if (S.gridImage) { S.refImage = S.gridImage; $('#refPreview').hidden = false; $('#refImg').src = S.gridImage; }
        else { toast('还没有分镜宫格图，请先在模块 6 生成', 'err'); this.value = 'none'; }
      }
    });
    $('#refMode').addEventListener('change', function () {
      if (this.value === 'text') { $('#refPreview').hidden = true; return; }
      if (S.gridImage && ($('#refSource').value === 'none' || $('#refSource').value === 'grid')) {
        $('#refSource').value = 'grid';
        S.refImage = S.gridImage;
        $('#refPreview').hidden = false;
        $('#refImg').src = S.gridImage;
      }
    });
    $('#btnClearRef').addEventListener('click', function () { S.refImage = null; $('#refSource').value = 'none'; $('#refPreview').hidden = true; });
    $('#imageHistory').addEventListener('click', handleHistoryAction);
    $('#videoHistory').addEventListener('click', handleHistoryAction);
    $('#btnClearImages').addEventListener('click', function () { if (!confirm('确定清空所有图片记录？')) return; S.images = []; localStorage.removeItem('ai_studio_images'); renderHistory(); });
    $('#btnClearVideos').addEventListener('click', function () { if (!confirm('确定清空所有视频记录？')) return; S.videos = []; localStorage.removeItem('ai_studio_videos'); renderHistory(); });

    $('#btnCloseLightbox').addEventListener('click', function () { $('#lightbox').hidden = true; });
    $('#lightbox').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('#lightbox').hidden) $('#lightbox').hidden = true;
        if (!$('#settingsOverlay').hidden) closeSettings();
      }
    });
  }

  /* ---------- 初始化 ---------- */
  $('#strategyPreview').textContent = IMAGE_STRATEGY;
  $('#videoStrategyPreview').textContent = VIDEO_STRATEGY;
  $('#imagePrompt').value = buildImagePromptLocal();
  $('#videoPrompt').value = buildVideoPromptLocal();
  $('#videoGenPrompt').value = $('#videoPrompt').value;
  syncPromptCounts();
  if (!AIHub.loadConfig().text.apiKey) applyAgnesConfig(true);
  refreshConfigUI();
  renderHistory();
  bind();
})();
