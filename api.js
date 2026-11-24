/* AI 创作台 · 自定义接口适配层（无依赖，浏览器直连 / 可选本地代理） */
(function (global) {
  'use strict';

  // v2：不再读取旧版自动填入的厂商模板，所有人打开都是空白配置
  var STORAGE_KEY = 'ai_studio_config_v2';

  var DEFAULT_CONFIG = {
    text: {
      preset: 'custom',
      baseUrl: '',
      apiKey: '',
      model: '',
      path: '/chat/completions',
      headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
      body: '{"model":{{model}},"messages":{{messages}},"temperature":0.8}',
      response: 'choices.0.message.content,candidates.0.content.parts.0.text,output.text,response,content',
      timeout: 120000
    },
    image: {
      preset: 'custom',
      baseUrl: '',
      apiKey: '',
      model: '',
      path: '/images/generations',
      headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
      body: '{"model":{{model}},"prompt":{{prompt}},"n":{{n}},"size":{{size}}}',
      taskPaths: '',
      resultPaths: 'data.0.url,data.0.b64_json,images.0.url,output.0.url,image.url,candidates.0.content.parts.0.inlineData.data,url',
      timeout: 180000
    },
    video: {
      preset: 'custom',
      baseUrl: '',
      apiKey: '',
      model: '',
      path: '/videos/generations',
      queryPath: '/videos/{{taskId}}',
      queryMethod: 'GET',
      headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
      body: '{"model":{{model}},"prompt":{{prompt}},"ratio":{{ratio}},"duration":{{duration}},"resolution":{{resolution}},"fps":{{fps}},"image":{{imageUrl}}}',
      bodyRef: '',
      bodyKeyframe: '',
      taskPaths: 'id,task_id,data.id,data.task_id,output.task_id,task.id',
      statusPaths: 'status,data.status,task.status,output.task_status,state',
      successValues: 'succeeded,success,completed,done,finished',
      failValues: 'failed,fail,cancelled,canceled,error',
      resultPaths: 'video.url,video_url,videoUrl,metadata.url,data.video_url,data.url,output.video_url,output.url,videos.0.url,url,result.video_url',
      pollMs: 4000,
      timeout: 600000
    },
    general: {}
  };

  var PRESETS = {
    text: {
      openai: {
        baseUrl: 'https://api.openai.com/v1', path: '/chat/completions', model: 'gpt-4o-mini',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"messages":{{messages}},"temperature":0.8}',
        response: 'choices.0.message.content,candidates.0.content.parts.0.text,output.text,response,content'
      },
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1', path: '/chat/completions', model: 'openai/gpt-4o-mini',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json","HTTP-Referer":"{{origin}}","X-Title":"AI Ad Studio"}',
        body: '{"model":{{model}},"messages":{{messages}},"temperature":0.8}',
        response: 'choices.0.message.content,output.text,response'
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1', path: '/chat/completions', model: 'deepseek-chat',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"messages":{{messages}},"temperature":0.8}',
        response: 'choices.0.message.content,response'
      },
      siliconflow: {
        baseUrl: 'https://api.siliconflow.cn/v1', path: '/chat/completions', model: 'Qwen/Qwen2.5-7B-Instruct',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"messages":{{messages}},"temperature":0.8}',
        response: 'choices.0.message.content,response'
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        path: '/models/{{model}}:generateContent?key={{key}}', model: 'gemini-2.5-flash',
        headers: '{"Content-Type":"application/json"}',
        body: '{"contents":[{"parts":[{"text":{{prompt}}}]}],"generationConfig":{"temperature":0.8}}',
        response: 'candidates.0.content.parts.0.text,candidates.0.content.parts.1.text'
      },
      custom: { baseUrl: '', path: '/chat/completions', model: '', headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}' }
    },
    image: {
      openai: {
        baseUrl: 'https://api.openai.com/v1', path: '/images/generations', model: 'gpt-image-1',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"prompt":{{prompt}},"n":{{n}},"size":{{size}}}',
        resultPaths: 'data.0.url,data.0.b64_json,images.0.url,output.0.url,url'
      },
      siliconflow: {
        baseUrl: 'https://api.siliconflow.cn/v1', path: '/images/generations', model: 'Kwai-Kolors/Kolors',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"prompt":{{prompt}},"image_size":{{size}},"num_images":{{n}}}',
        resultPaths: 'images.0.url,data.0.url,url'
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        path: '/models/{{model}}:generateContent?key={{key}}', model: 'gemini-2.5-flash-image',
        headers: '{"Content-Type":"application/json"}',
        body: '{"contents":[{"parts":[{"text":{{prompt}}}]}]}',
        resultPaths: 'candidates.0.content.parts.0.inlineData.data,candidates.0.content.parts.1.inlineData.data,data.0.url,url'
      },
      custom: { baseUrl: '', path: '/images/generations', model: '', headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}' }
    },
    video: {
      async: {
        baseUrl: '', path: '/videos/generations', queryPath: '/videos/{{taskId}}', model: '',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"prompt":{{prompt}},"ratio":{{ratio}},"duration":{{duration}},"resolution":{{resolution}},"fps":{{fps}},"image":{{imageUrl}}}',
        taskPaths: 'id,task_id,data.id,data.task_id,output.task_id,task.id',
        statusPaths: 'status,data.status,task.status,output.task_status,state',
        resultPaths: 'video.url,video_url,data.video_url,data.url,output.video_url,output.url,videos.0.url,url'
      },
      sync: {
        baseUrl: '', path: '/videos/generations', queryPath: '', model: '',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"prompt":{{prompt}},"duration":{{duration}}}',
        taskPaths: '', statusPaths: '',
        resultPaths: 'video.url,video_url,data.video_url,data.url,output.url,url'
      },
      custom: {
        baseUrl: '', path: '/videos/generations', queryPath: '/videos/{{taskId}}', queryMethod: 'GET', model: '',
        headers: '{"Authorization":"Bearer {{key}}","Content-Type":"application/json"}',
        body: '{"model":{{model}},"prompt":{{prompt}},"ratio":{{ratio}},"duration":{{duration}},"resolution":{{resolution}},"fps":{{fps}},"image":{{imageUrl}}}',
        taskPaths: 'id,task_id,data.id,data.task_id,output.task_id,task.id',
        statusPaths: 'status,data.status,task.status,output.task_status,state',
        successValues: 'succeeded,success,completed,done,finished',
        failValues: 'failed,fail,cancelled,canceled,error',
        resultPaths: 'video.url,video_url,videoUrl,metadata.url,data.video_url,data.url,output.video_url,output.url,videos.0.url,url',
        pollMs: 4000,
        timeout: 600000
      }
    }
  };

  function deepMerge(base, patch) {
    var out = {}, k;
    for (k in base) out[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? deepMerge(base[k], {}) : base[k];
    for (k in patch || {}) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && base[k] && typeof base[k] === 'object') out[k] = deepMerge(base[k], patch[k]);
      else if (patch[k] !== undefined) out[k] = patch[k];
    }
    return out;
  }

  function loadConfig() {
    try {
      // 清掉旧版残留配置（含旧密钥），只读 v2
      localStorage.removeItem('ai_studio_config_v1');
      var raw = localStorage.getItem(STORAGE_KEY);
      var cfg = raw ? deepMerge(DEFAULT_CONFIG, JSON.parse(raw)) : deepMerge(DEFAULT_CONFIG, {});
      // 兼容旧配置：预设新增的参考图模板自动补全，避免旧 localStorage 里 bodyRef 为空导致参考模式失效
      var pv = PRESETS.video[cfg.video.preset];
      if (pv) {
        if (!cfg.video.bodyRef) cfg.video.bodyRef = pv.bodyRef || '';
        if (!cfg.video.bodyKeyframe) cfg.video.bodyKeyframe = pv.bodyKeyframe || '';
      }
      return cfg;
    } catch (e) { return deepMerge(DEFAULT_CONFIG, {}); }
  }
  function saveConfig(cfg) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }
  function resetConfig() { localStorage.removeItem(STORAGE_KEY); return loadConfig(); }
  function applyPreset(kind, name) {
    var cfg = loadConfig();
    var p = PRESETS[kind] && PRESETS[kind][name];
    if (!p) return cfg;
    cfg[kind] = deepMerge(cfg[kind], p);
    cfg[kind].preset = name;
    saveConfig(cfg);
    return cfg;
  }

  function tpl(str, vars, encode) {
    return String(str == null ? '' : str).replace(/\{\{\s*([\w]+)\s*\}\}/g, function (m, key) {
      var v = vars[key];
      if (v === undefined || v === null) return '';
      return encode ? encodeURIComponent(String(v)) : String(v);
    });
  }
  function jsonTpl(str, vars) {
    return String(str == null ? '{}' : str).replace(/\{\{\s*([\w]+)\s*\}\}/g, function (m, key) {
      var v = vars[key];
      if (v === undefined) return 'null';
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    });
  }
  function parseHeaders(headerStr, vars) {
    var text = tpl(headerStr || '{}', vars);
    try {
      var obj = JSON.parse(text);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('不是对象');
      return obj;
    } catch (e) { throw new Error('请求头模板不是合法 JSON：' + text.slice(0, 160)); }
  }
  function parseBody(bodyStr, vars) {
    var text = jsonTpl(bodyStr || '{}', vars);
    try { return JSON.parse(text); }
    catch (e) { throw new Error('请求体模板不是合法 JSON：' + text.slice(0, 220)); }
  }
  function fullUrl(baseUrl, path, vars) {
    var p = tpl(path || '', vars, true);
    if (/^https?:\/\//i.test(p)) return p;
    var b = String(baseUrl || '').replace(/\/+$/, '');
    return b + (p.startsWith('/') ? '' : '/') + p;
  }
  function resolvePath(obj, path) {
    return String(path || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).reduce(function (acc, p) {
      if (acc !== undefined) return acc;
      return p.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
    }, undefined);
  }
  function normText(v) {
    if (v == null) return undefined;
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
      var parts = v.map(normText).filter(Boolean);
      return parts.length ? parts.join('\n') : undefined;
    }
    if (typeof v === 'object') {
      var keys = ['text', 'content', 'value', 'message', 'output', 'result'];
      for (var i = 0; i < keys.length; i++) if (v[keys[i]] !== undefined) { var r = normText(v[keys[i]]); if (r) return r; }
    }
    return undefined;
  }
  function toMediaUrl(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim();
    if (/^(https?:\/\/|data:|blob:)/i.test(s)) return s;
    var compact = s.replace(/\s/g, '');
    if (compact.length > 40 && /^[A-Za-z0-9+/=]+$/.test(compact)) return 'data:application/octet-stream;base64,' + compact;
    return null;
  }
  function deepFindMedia(obj, kind, depth) {
    depth = depth || 0;
    if (!obj || depth > 7) return null;
    if (typeof obj === 'string') { return toMediaUrl(obj); }
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) { var r = deepFindMedia(obj[i], kind, depth + 1); if (r) return r; }
      return null;
    }
    if (typeof obj !== 'object') return null;
    var pref = kind === 'video'
      ? ['video_url', 'videoUrl', 'video', 'url', 'play_url', 'file', 'output', 'result', 'data']
      : ['url', 'image_url', 'imageUrl', 'b64_json', 'base64', 'inline_data', 'inlineData', 'image', 'data', 'output'];
    for (var j = 0; j < pref.length; j++) {
      if (obj[pref[j]] !== undefined) { var m = deepFindMedia(obj[pref[j]], kind, depth + 1); if (m) return m; }
    }
    for (var k in obj) { var m2 = deepFindMedia(obj[k], kind, depth + 1); if (m2) return m2; }
    return null;
  }
  function findMedia(data, paths, kind, mime) {
    function fix(u) {
      if (u && mime && u.indexOf('data:application/octet-stream;base64,') === 0) return u.replace('data:application/octet-stream;base64,', mime);
      return u;
    }
    var raw = resolvePath(data, paths);
    var direct = toMediaUrl(normText(raw));
    if (direct) return fix(direct);
    return fix(deepFindMedia(data, kind));
  }

  function request(url, method, headers, body, timeout) {
    // 全在线直连：不依赖任何本地服务或代理。
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeout || 120000) : null;
    var opts = {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    };
    return fetch(url, opts).then(function (resp) {
      if (timer) clearTimeout(timer);
      return resp.text().then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { data = text; }
        if (!resp.ok) {
          var msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
          var prefix = resp.status === 429 ? '免费用户 API 速率限制，请稍后几分钟再试或升级套餐：' : ('接口返回 HTTP ' + resp.status + '：');
          var err = new Error(prefix + msg.slice(0, 400));
          err.status = resp.status;
          throw err;
        }
        return data;
      });
    }).catch(function (e) {
      if (timer) clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('请求超时（' + ((timeout || 120000) / 1000) + ' 秒），请检查接口响应速度或调大超时时间。');
      if (e.message && /Failed to fetch|NetworkError|Load failed/i.test(e.message)) {
        throw new Error('网络请求失败：请检查接口地址是否支持浏览器直连（CORS）、密钥是否正确。本站全在线运行，不需要本地服务。原始信息：' + e.message);
      }
      throw e;
    });
  }

  function activeModel(kind, override) { return override || loadConfig()[kind].model || ''; }

  function callText(opts) {
    var cfg = loadConfig().text;
    var system = opts.system || '';
    var prompt = opts.prompt || '';
    var vars = {
      key: cfg.apiKey, model: activeModel('text', opts.model),
      prompt: (system ? system + '\n\n' : '') + prompt,
      system: system,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      origin: global.location ? global.location.origin : ''
    };
    return request(fullUrl(cfg.baseUrl, cfg.path, vars), 'POST', parseHeaders(cfg.headers, vars), parseBody(cfg.body, vars), cfg.timeout)
      .then(function (data) {
        var text = normText(resolvePath(data, cfg.response));
        if (!text) text = normText(data);
        if (!text) throw new Error('未能从响应中提取文本，请检查「文本模型 → 响应提取路径」。原始响应：' + JSON.stringify(data).slice(0, 300));
        return text;
      });
  }

  function callImage(opts) {
    var cfg = loadConfig().image;
    var model = activeModel('image', opts.model);
    var vars = {
      key: cfg.apiKey, model: model, prompt: opts.prompt || '', n: Number(opts.n) || 1,
      size: opts.size || '1024x1024', ratio: opts.ratio || '1:1', imageUrl: opts.imageUrl || null
    };
    return request(fullUrl(cfg.baseUrl, cfg.path, vars), 'POST', parseHeaders(cfg.headers, vars), parseBody(cfg.body, vars), cfg.timeout)
      .then(function (data) {
        var urls = [];
        var primary = findMedia(data, cfg.resultPaths, 'image', 'data:image/png;base64,');
        if (primary) urls.push(primary);
        if (!primary && Array.isArray(data)) data.forEach(function (it) { var u = findMedia(it, cfg.resultPaths, 'image', 'data:image/png;base64,'); if (u && urls.indexOf(u) < 0) urls.push(u); });
        if (!urls.length) throw new Error('未能从响应中提取图片地址，请检查「图片模型 → 结果提取路径」。原始响应：' + JSON.stringify(data).slice(0, 300));
        return { urls: urls, raw: data };
      });
  }

  function callVideo(opts, onProgress) {
    var cfg = loadConfig().video;
    var refMode = opts.refMode || 'text';
    var vars = {
      key: cfg.apiKey, model: activeModel('video', opts.model), prompt: opts.prompt || '',
      ratio: opts.ratio || '16:9', duration: Number(opts.duration) || 15,
      fps: Number(opts.fps) || 30, resolution: opts.resolution || '720p',
      videoSize: opts.videoSize || '720P', seed: Number(opts.seed) || 0,
      imageUrl: opts.imageUrl || null, firstFrame: opts.imageUrl || null,
      imagesJson: opts.imageUrl ? [opts.imageUrl] : [], refMode: refMode
    };
    var bodyTpl = cfg.body;
    if (refMode === 'reference' && cfg.bodyRef) bodyTpl = cfg.bodyRef;
    else if (refMode === 'keyframe' && cfg.bodyKeyframe) bodyTpl = cfg.bodyKeyframe;
    var createUrl = fullUrl(cfg.baseUrl, cfg.path, vars);
    var createBody = parseBody(bodyTpl, vars);
    var createHeaders = parseHeaders(cfg.headers, vars);
    function create(attempt) {
      return request(createUrl, 'POST', createHeaders, createBody, cfg.timeout).catch(function (e) {
        var limited = /queue_full|队列已满|rate_limit_exceeded|速率限制|invalid_json|无法读取请求体|429/i.test(e.message);
        if (limited && attempt < 6) {
          var wait = /rate_limit|速率限制/i.test(e.message) ? 10000 + attempt * 10000 : 3000 + attempt * 2000;
          if (onProgress) onProgress('接口限流/队列忙，' + (wait / 1000) + ' 秒后重试（' + (attempt + 1) + '/6）…');
          return new Promise(function (r) { setTimeout(r, wait); }).then(function () { return create(attempt + 1); });
        }
        throw e;
      });
    }
    return create(0).then(function (created) {
      if (onProgress) onProgress('任务已创建，等待生成…');
      var taskId = resolvePath(created, cfg.taskPaths);
      if (taskId === undefined) taskId = created && (created.id || created.task_id);
      var syncUrl = findMedia(created, cfg.resultPaths, 'video');
      if (!taskId) {
        if (syncUrl) return { url: syncUrl, raw: created };
        throw new Error('创建接口响应中没有任务 ID，也没有视频地址。请检查「视频模型 → 任务 ID 提取路径 / 结果提取路径」。原始响应：' + JSON.stringify(created).slice(0, 300));
      }
      var sv = String(taskId);
      var queryVars = Object.assign({}, vars, { taskId: encodeURIComponent(sv), id: encodeURIComponent(sv) });
      var queryUrl = fullUrl(cfg.baseUrl, cfg.queryPath || '', queryVars);
      var started = Date.now();
      var okStates = String(cfg.successValues || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      var badStates = String(cfg.failValues || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      function poll() {
        if (Date.now() - started > Number(cfg.timeout || 600000)) throw new Error('视频生成超时（超过 ' + Math.round((cfg.timeout || 600000) / 60000) + ' 分钟）。');
        return request(queryUrl, String(cfg.queryMethod || 'GET').toUpperCase(), parseHeaders(cfg.headers, queryVars), String(cfg.queryMethod || 'GET').toUpperCase() === 'POST' ? { task_id: sv } : undefined, 60000).then(function (data) {
          var state = resolvePath(data, cfg.statusPaths);
          var s = state === undefined ? '' : String(state).toLowerCase();
          var url = findMedia(data, cfg.resultPaths, 'video');
          if (url) return { url: url, raw: data };
          if (s && okStates.indexOf(s) >= 0) {
            if (url) return { url: url, raw: data };
            throw new Error('任务状态为成功，但未找到视频地址。原始响应：' + JSON.stringify(data).slice(0, 300));
          }
          if (s && badStates.indexOf(s) >= 0) throw new Error('视频生成失败，任务状态：' + s + '。原始响应：' + JSON.stringify(data).slice(0, 300));
          if (onProgress) onProgress('生成中… 状态：' + (s || '处理中') + ' · 任务 ' + sv);
          return new Promise(function (resolve) { setTimeout(resolve, Number(cfg.pollMs) || 4000); }).then(poll);
        });
      }
      return poll();
    });
  }

  function validate(kind) {
    var c = loadConfig()[kind];
    var missing = [];
    if (!c.baseUrl && kind !== 'general') missing.push('接口地址 Base URL');
    if (!c.apiKey && !/^https?:\/\//i.test(c.path || '')) missing.push('API Key');
    if (!c.path && kind !== 'text') missing.push('接口路径');
    return missing;
  }
  function testText() {
    return callText({ system: '你是一个接口连通性测试助手。', prompt: '只回复两个字：正常' });
  }

  global.AIHub = {
    DEFAULT_CONFIG: DEFAULT_CONFIG, PRESETS: PRESETS,
    loadConfig: loadConfig, saveConfig: saveConfig, resetConfig: resetConfig, applyPreset: applyPreset,
    callText: callText, callImage: callImage, callVideo: callVideo,
    validate: validate, testText: testText
  };
})(window);
