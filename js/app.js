// ===== 主应用逻辑 =====
(function () {
  const KB = window.KB;
  const AI = window.AIEngine;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ---------- 索引 ----------
  const kpMeta = {}; // id -> {ch, mod}
  KB.chapters.forEach(ch => ch.m.forEach(mod => mod.kps.forEach(id => {
    if (KB.kps[id]) kpMeta[id] = { ch: ch.id, mod: mod.id };
  })));
  const IMP_LABEL = { core: '核心', imp: '重要', ext: '拓展' };
  const TYPE_LABEL = { '概念': '概念基础', '结构': '存储结构', '算法': '算法', '应用': '综合应用' };
  const FAMILY_LABEL = { base: '基础·算法分析', linear: '线性结构', stackqueue: '栈与队列', array: '数组·串·广义表', tree: '树', search: '查找结构', graph: '图', sort: '排序', file: '文件·外存' };
  const REL_LABEL = { pre: '前置依赖', ext: '延伸拓展', cmp: '对比关联' };
  const REL_ICON = { pre: '① 必学', ext: '② 进阶', cmp: '③ 对比' };

  // 掌握状态
  let mastered = new Set(JSON.parse(localStorage.getItem('ds-mastered') || '[]'));
  let currentKP = localStorage.getItem('ds-last-kp') || null;
  const state = { view: 'tree', relVisible: { pre: true, ext: true, cmp: true }, chVisible: {}, filters: { diff: new Set(), imp: new Set(), type: new Set(), family: new Set(), ch: new Set(), ex: new Set() } };
  KB.chapters.forEach(c => state.chVisible[c.id] = true);

  // ---------- 树渲染 ----------
  function renderTree() {
    const root = $('#treeRoot');
    root.innerHTML = '';
    KB.chapters.forEach(ch => {
      const chEl = document.createElement('div');
      chEl.className = 'tree-chapter';
      const head = document.createElement('div');
      head.className = 'tree-ch-head' + (ch.id === 'ch1' ? ' open' : '');
      head.innerHTML = `<span class="ch-dot" style="background:${ch.color}"></span><span>${ch.n}</span><span class="arrow">▶</span>`;
      const body = document.createElement('div');
      body.className = 'tree-ch-body' + (ch.id === 'ch1' ? ' open' : '');
      ch.m.forEach(mod => {
        const mEl = document.createElement('div');
        mEl.className = 'tree-mod';
        mEl.textContent = mod.n;
        body.appendChild(mEl);
        mod.kps.forEach(id => {
          const kp = KB.kps[id];
          if (!kp) return;
          const row = document.createElement('div');
          row.className = 'tree-kp';
          row.dataset.id = id;
          const dotColor = kp.i === 'core' ? '#e5484d' : kp.i === 'imp' ? '#e8912d' : '#8fa3bf';
          row.innerHTML = `<span class="kp-dot" style="background:${dotColor}"></span>
            <span class="kp-name">${kp.n}</span>
            ${mastered.has(id) ? '<span class="kp-done-mark">✓</span>' : ''}
            ${kp.e ? '<span class="kp-star">★例</span>' : ''}`;
          row.addEventListener('click', () => selectKP(id));
          body.appendChild(row);
        });
      });
      head.addEventListener('click', () => { head.classList.toggle('open'); body.classList.toggle('open'); });
      chEl.appendChild(head); chEl.appendChild(body); root.appendChild(chEl);
    });
    updateProgress();
  }

  function updateProgress() {
    const total = Object.keys(KB.kps).length;
    const n = mastered.size;
    $('#progressFill').style.width = (total ? n / total * 100 : 0) + '%';
    $('#progressText').textContent = `${n}/${total}`;
  }

  // ---------- 概览 ----------
  function renderWelcome() {
    const kpCount = Object.keys(KB.kps).length;
    const exCount = Object.values(KB.kps).filter(k => k.e).length;
    $('#statRow').innerHTML = `
      <div class="stat-box"><b>${KB.chapters.length}</b><span>章节</span></div>
      <div class="stat-box"><b>${KB.chapters.reduce((s, c) => s + c.m.length, 0)}</b><span>知识模块</span></div>
      <div class="stat-box"><b>${kpCount}</b><span>知识点</span></div>
      <div class="stat-box"><b>${exCount}</b><span>精讲例题</span></div>
      <div class="stat-box"><b>${KB.edges.length}</b><span>知识关联</span></div>`;
    const descMap = {
      ch1: '数据结构与ADT基本概念、C++类机制、算法性能分析——全课程的地基。',
      ch2: '顺序表与链表两大实现体系：随机存取 vs 指针链接，插入删除的性能权衡。',
      ch3: 'LIFO 与 FIFO：栈的递归、表达式求值，队列的循环实现与缓冲应用。',
      ch4: '多维数组的压缩存储、串的模式匹配（KMP）、广义表的递归世界。',
      ch5: '二叉树性质、遍历、线索化、堆与Huffman——数据结构的重头戏。',
      ch6: '集合运算、并查集、跳表与散列——追求"接近 O(1)"的查找艺术。',
      ch7: '从折半搜索到 AVL、红黑树：动态搜索结构的平衡之道。',
      ch8: '图的存储与遍历、最小生成树、最短路径、拓扑与关键路径。',
      ch9: '五大类排序算法的设计思想、性能对比与下界分析。',
      ch10: '外存世界的结构：外排序、B/B+树索引与字典树。'
    };
    $('#chapterCards').innerHTML = KB.chapters.map(ch => {
      const kpN = ch.m.reduce((s, m) => s + m.kps.filter(id => KB.kps[id]).length, 0);
      const exN = ch.m.reduce((s, m) => s + m.kps.filter(id => KB.kps[id] && KB.kps[id].e).length, 0);
      return `<div class="chapter-card" data-ch="${ch.id}" style="border-top-color:${ch.color}">
        <h3>${ch.n}</h3><p>${descMap[ch.id] || ''}</p>
        <div class="cc-meta"><span>${ch.m.length} 个模块</span><span>${kpN} 个知识点</span><span>${exN} 道例题</span></div>
      </div>`;
    }).join('');
    $$('.chapter-card').forEach(el => el.addEventListener('click', () => {
      switchView('tree');
      const idx = KB.chapters.findIndex(c => c.id === el.dataset.ch);
      const heads = $$('.tree-ch-head');
      if (heads[idx]) { heads[idx].classList.add('open'); heads[idx].nextElementSibling.classList.add('open'); }
      $('.sidebar').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  // ---------- 详情 ----------
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function detailHTML(id, compact) {
    const kp = KB.kps[id];
    const meta = kpMeta[id] || {};
    const ch = KB.chapters.find(c => c.id === meta.ch) || {};
    const mod = (ch.m || []).find(m => m.id === meta.mod) || {};
    const rels = [];
    KB.edges.forEach(e => {
      if (e.a === id) rels.push({ id: e.b, r: e.r, dir: 'out' });
      else if (e.b === id) rels.push({ id: e.a, r: e.r, dir: 'in' });
    });
    const relOrder = { pre: 0, cmp: 1, ext: 2 };
    rels.sort((a, b) => relOrder[a.r] - relOrder[b.r]);
    const stars = '★'.repeat(kp.d) + '☆'.repeat(5 - kp.d);
    const relItems = rels.slice(0, 8).map(r => {
      const other = KB.kps[r.id];
      const dirText = r.r === 'pre' ? (r.dir === 'in' ? '它是前置，先学它' : '学完本点再学它') :
        r.r === 'ext' ? (r.dir === 'in' ? '由它延伸而来' : '本点的延伸方向') : '对比着记';
      return `<div class="rel-item" data-id="${r.id}">
        <span class="rel-badge ${r.r}">${REL_LABEL[r.r]}</span><span>${other.n}</span>
        <span class="rel-dir">${dirText}</span></div>`;
    }).join('');

    const html = `
      <div class="crumb"><b>${esc(ch.n || '')}</b> › ${esc(mod.n || '')}</div>
      <h2>${esc(kp.n)}</h2>
      <div class="tag-row">
        <span class="tag ${kp.i}">${IMP_LABEL[kp.i]}</span>
        <span class="tag type">${TYPE_LABEL[kp.t] || kp.t}</span>
        <span class="diff-stars">${stars} <span style="color:#8b949e;letter-spacing:0">难度${kp.d}/5</span></span>
        ${mastered.has(id) ? '<span class="tag" style="background:#eef6f1;color:#18a058">已掌握 ✓</span>' : ''}
      </div>
      <div class="detail-sec"><h4>知识讲解</h4><p class="brief-text">${esc(kp.b)}</p></div>
      <div class="detail-sec"><h4>要点提炼</h4><ul class="point-list">${kp.p.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
      ${kp.detail ? `
      <div class="detail-sec"><h4>深入理解</h4>
        <div class="detail-grid">
          ${kp.detail.compare ? `<div class="dg-item"><h5><span class="dg-icon">🔍</span>概念辨析</h5><p>${esc(kp.detail.compare)}</p></div>` : ''}
          ${kp.detail.scene ? `<div class="dg-item"><h5><span class="dg-icon">🌐</span>应用场景</h5><p>${esc(kp.detail.scene)}</p></div>` : ''}
          ${kp.detail.pitfall ? `<div class="dg-item"><h5><span class="dg-icon">⚠️</span>易错点</h5><p>${esc(kp.detail.pitfall)}</p></div>` : ''}
          ${kp.detail.more ? `<div class="dg-item"><h5><span class="dg-icon">📖</span>延伸阅读</h5><p>${esc(kp.detail.more)}</p></div>` : ''}
        </div>
      </div>` : ''}
      ${kp.tips ? `<div class="detail-sec"><h4>易错点 · 记忆技巧</h4><div class="tips-box">💡 ${esc(kp.tips)}</div></div>` : ''}
      ${kp.c ? `<div class="detail-sec"><h4>复杂度</h4><span class="cx-badge">${esc(kp.c)}</span></div>` : ''}
      ${renderExamples(kp)}
      ${kp.e && kp.e.code ? `
      <div class="detail-sec"><h4>💻 代码实现 · 完整解析</h4>
        <div class="code-card">
          <div class="code-head"><b>${esc(kp.e.code.title)}</b></div>
          <div class="code-desc">${esc(kp.e.code.desc)}</div>
          <div class="code-block"><table class="code-table">${kp.e.code.code.map(row => `
            <tr class="code-row">
              <td class="code-line-num"></td>
              <td class="code-src">${esc(row[0])}</td>
              <td class="code-note">${row[1] ? '// ' + esc(row[1]) : ''}</td>
            </tr>`).join('')}</table></div>
          <div class="code-notes"><h5>核心解析</h5>${kp.e.code.notes.map((n, i) => `<p><b>${i + 1}.</b> ${esc(n)}</p>`).join('')}</div>
          ${kp.e.code.relKPs && kp.e.code.relKPs.length ? `
          <div class="code-rels"><h5>串联知识点</h5>
            <div class="rel-list">${kp.e.code.relKPs.map(rid => {
              const rk = KB.kps[rid];
              return rk ? `<div class="rel-item" data-id="${rid}"><span class="rel-badge pre">串联</span><span>${esc(rk.n)}</span><span class="rel-dir">点击查看</span></div>` : '';
            }).join('')}</div>
          </div>` : ''}
        </div>
      </div>` : ''}
      ${rels.length ? `<div class="detail-sec"><h4>知识关联</h4><div class="rel-list">${relItems}</div></div>` : ''}
      <div class="detail-actions">
        <button class="btn btn-primary" id="askAiBtn">🤖 问 AI 助手</button>
        <button class="btn btn-ghost" id="masterBtn">${mastered.has(id) ? '取消掌握标记' : '标记已掌握 ✓'}</button>
      </div>`;
    return html;
  }

  // 渲染例题：支持多道（examples 数组）与单道（e 对象），含难度标签
  function renderExamples(kp) {
    const LEVEL = { 1: '基础', 2: '进阶', 3: '挑战' };
    const levelCls = { 1: 'lvl-1', 2: 'lvl-2', 3: 'lvl-3' };
    // 收集例题列表
    let exs = [];
    if (Array.isArray(kp.examples) && kp.examples.length) {
      exs = kp.examples.map(ex => ({ ...ex, isArr: true }));
    } else if (kp.e && kp.e.q) {
      exs = [{ q: kp.e.q, idea: kp.e.idea, s: kp.e.s, a: kp.e.a, level: kp.e.level || 1, isArr: false }];
    }
    if (!exs.length) return '';
    const cards = exs.map((ex, idx) => `
      <div class="example-card ${idx === 0 ? 'open' : ''}">
        <div class="example-head">
          <b>${exs.length > 1 ? `例题 ${idx + 1}` : '经典例题'}${ex.level ? ` <span class="ex-level ${levelCls[ex.level] || ''}">${LEVEL[ex.level] || ''}</span>` : ''}</b>
          <span class="example-toggle"><span class="t-open">展开</span><span class="t-close">收起</span></span>
        </div>
        <div class="example-body">
          <div class="ex-sec"><h5>题目</h5><div class="ex-q">${esc(ex.q)}</div></div>
          <div class="ex-sec"><h5>思路分析</h5><div class="ex-idea">${esc(ex.idea)}</div></div>
          <div class="ex-sec"><h5>解题步骤</h5><ol class="ex-steps">${(ex.s || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
          <div class="ex-sec"><h5>答案</h5><div class="ex-ans">${esc(ex.a)}</div></div>
        </div>
      </div>`).join('');
    return `<div class="detail-sec"><h4>例题精讲${exs.length > 1 ? ` · 共 ${exs.length} 道` : ''}</h4>${cards}</div>`;
  }

  function bindDetail(container, id) {
    // 支持多道例题的展开/收起
    container.querySelectorAll('.example-card .example-head').forEach(head => {
      head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
    });
    const askBtn = container.querySelector('#askAiBtn');
    if (askBtn) askBtn.addEventListener('click', () => { openAI(id); });
    const mb = container.querySelector('#masterBtn');
    if (mb) mb.addEventListener('click', () => {
      if (mastered.has(id)) mastered.delete(id); else mastered.add(id);
      localStorage.setItem('ds-mastered', JSON.stringify([...mastered]));
      renderTree(); selectKP(id);
    });
    container.querySelectorAll('.rel-item').forEach(el => el.addEventListener('click', () => selectKP(el.dataset.id)));
  }

  function selectKP(id) {
    currentKP = id;
    localStorage.setItem('ds-last-kp', id);
    // 无论在哪个视图，选中知识点都切换到知识树视图并展示完整详情
    switchView('tree');
    showDetail(id);
    markTreeActive(id);
    updateAIContext();
  }

  function showDetail(id) {
    $('#welcomeCard').classList.add('hidden');
    const dc = $('#detailCard');
    dc.classList.remove('hidden');
    dc.innerHTML = detailHTML(id, false);
    bindDetail(dc, id);
    dc.parentElement.scrollTop = 0;
  }

  function markTreeActive(id) {
    $$('.tree-kp').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
      if (el.dataset.id === id) {
        el.scrollIntoView({ block: 'nearest' });
        const body = el.closest('.tree-ch-body');
        const head = body && body.previousElementSibling;
        if (body) body.classList.add('open');
        if (head) head.classList.add('open');
      }
    });
  }

  // ---------- 图谱 ----------
  let chart = null;
  function initGraph() {
    // 构建"目录位置前缀"：知识点 -> "1.1"（所属模块编号）
    const posMap = {};
    KB.chapters.forEach(ch => ch.m.forEach(mod => {
      const m = (mod.n || '').match(/^\s*(\d+\.\d+)/);
      const prefix = m ? m[1] : '';
      mod.kps.forEach(id => { posMap[id] = prefix; });
    }));

    const nodes = [], catMap = {};
    KB.chapters.forEach((ch, i) => {
      catMap[ch.id] = i;
      state.chVisible[ch.id] = true;
    });
    // 按章节给节点初始坐标（环形扇区），使同章节点初始聚集，收敛后减少跨章连线交叉
    const totalCh = KB.chapters.length;
    const chapterCenter = {}; // 每章一个中心点（圆形分布）
    KB.chapters.forEach((ch, i) => {
      const angle = (i / totalCh) * Math.PI * 2;
      chapterCenter[ch.id] = { x: Math.cos(angle) * 400, y: Math.sin(angle) * 400 + 40 };
    });
    for (const id in KB.kps) {
      const kp = KB.kps[id];
      const meta = kpMeta[id];
      const ch = KB.chapters.find(c => c.id === meta.ch);
      const pos = posMap[id] || '';
      const cc = chapterCenter[meta.ch] || { x: 0, y: 0 };
      const jitter = 90;
      nodes.push({
        id, name: kp.n, pos, category: catMap[meta.ch],
        symbolSize: kp.i === 'core' ? 36 : kp.i === 'imp' ? 29 : 24,
        value: kp.i,
        x: cc.x + (Math.random() - 0.5) * jitter,
        y: cc.y + (Math.random() - 0.5) * jitter,
        itemStyle: { color: ch.color, borderColor: '#fff', borderWidth: 1.5, shadowBlur: 6, shadowColor: 'rgba(0,0,0,.15)' },
        label: {
          show: true, fontSize: 9.5, color: '#333', position: 'bottom', distance: 4,
          formatter: p => p.data.pos ? `${p.data.pos} ${p.data.name}` : p.data.name
        },
        cursor: 'pointer'
      });
    }
    // 边样式：前置依赖用短实线（同链内聚）、延伸用虚线、对比关联用弯曲点线绕开
    const edgeStyle = {
      pre: { color: '#3b6ef5', width: 1.5, type: 'solid', curveness: 0 },
      ext: { color: '#18a058', width: 1.3, type: 'dashed', curveness: 0.1 },
      cmp: { color: '#e8833a', width: 1.5, type: 'dotted', curveness: 0.35 }
    };
    KB.edges.forEach(e => {
      const st = edgeStyle[e.r];
      window.__rawEdges = window.__rawEdges || [];
      window.__rawEdges.push({ source: e.a, target: e.b, r: e.r, lineStyle: { ...st }, symbol: ['none', e.r === 'pre' ? 'arrow' : 'none'], symbolSize: 5 });
    });
    const option = {
      backgroundColor: '#fbfcfe',
      legend: [{ show: false }],
      tooltip: {
        formatter: p => {
          if (p.dataType === 'edge') return REL_LABEL[p.data.r] || '';
          const id = (p.data && p.data.id) || p.name;
          const kp = KB.kps[id] || {};
          const meta = kpMeta[id] || {};
          const ch = KB.chapters.find(c => c.id === meta.ch);
          return `<b>${kp.n || p.name}</b><br/>${ch ? ch.n : ''}<br/>${IMP_LABEL[kp.i] || ''} · ${TYPE_LABEL[kp.t] || ''} · 难度${kp.d || ''}`;
        }
      },
      series: [{
        type: 'graph', layout: 'force', roam: true, draggable: true,
        categories: KB.chapters.map(c => ({ name: c.id })),
        // 分层布局思想：前置依赖边更短（内聚成链），延伸/对比边更长（跨链拉开），减少交叉
        force: {
          repulsion: 500, edgeLength: [60, 240], gravity: 0.14, friction: 0.2,
          layoutAnimation: true
        },
        data: nodes, links: window.__rawEdges,
        label: { fontSize: 9.5, color: '#333' },
        labelLayout: { hideOverlap: true },
        emphasis: { focus: 'none', label: { show: true, fontWeight: 'bold' }, itemStyle: { borderWidth: 2.5, borderColor: '#fff', shadowBlur: 12 }, lineStyle: { width: 3 } },
        blur: { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 }, label: { opacity: 1 } },
        // 扩大缩放范围，支持自由缩放
        scaleLimit: { min: 0.1, max: 8 }
      }]
    };
    chart = echarts.init($('#graphContainer'));
    chart.setOption(option);
    chart.on('click', p => {
      if (p.dataType === 'node') {
        // 点击节点：直接进入对应知识内容（切到知识树视图并展示完整详情）
        const id = (p.data && p.data.id) || p.name;
        if (!KB.kps[id]) return;
        switchView('tree');
        showDetail(id);
        markTreeActive(id);
        currentKP = id;
        localStorage.setItem('ds-last-kp', id);
        updateAIContext();
      }
    });
    window.addEventListener('resize', () => chart && chart.resize());
    renderGraphLegend();
    applyGraphFilters();
  }

  function renderGraphLegend() {
    const rels = [
      { r: 'pre', label: '前置依赖', cls: '' },
      { r: 'ext', label: '延伸拓展', cls: 'dashed' },
      { r: 'cmp', label: '对比关联', cls: 'dotted' }
    ];
    const colors = { pre: '#3b6ef5', ext: '#18a058', cmp: '#e8833a' };
    $('#relLegend').innerHTML = rels.map(x => `
      <div class="legend-item ${state.relVisible[x.r] ? '' : 'off'}" data-rel="${x.r}">
        <span class="legend-line ${x.cls}" style="border-color:${colors[x.r]}"></span>${x.label}
        <span style="margin-left:auto;color:#8b949e;font-size:11px">${KB.edges.filter(e => e.r === x.r).length} 条</span>
      </div>`).join('');
    $$('#relLegend .legend-item').forEach(el => el.addEventListener('click', () => {
      const r = el.dataset.rel;
      state.relVisible[r] = !state.relVisible[r];
      el.classList.toggle('off', !state.relVisible[r]);
      applyGraphFilters();
    }));
    $('#chLegend').innerHTML = KB.chapters.map(ch => `
      <span class="ch-filter ${state.chVisible[ch.id] ? '' : 'off'}" data-ch="${ch.id}">
        <span class="legend-chip" style="background:${ch.color}"></span>${ch.n.split(' ')[0].replace('第', '').replace('章', '')}</span>`).join('');
    $$('#chLegend .ch-filter').forEach(el => el.addEventListener('click', () => {
      const id = el.dataset.ch;
      state.chVisible[id] = !state.chVisible[id];
      el.classList.toggle('off', !state.chVisible[id]);
      applyGraphFilters();
    }));
    $('#chSelectAll').onclick = () => {
      KB.chapters.forEach(c => state.chVisible[c.id] = true);
      renderGraphLegend(); applyGraphFilters();
    };
  }

  function applyGraphFilters() {
    if (!chart) return;
    const links = window.__rawEdges.filter(e => state.relVisible[e.r]);
    const visibleIdx = new Set(KB.chapters.map((c, i) => state.chVisible[c.id] ? i : -1).filter(i => i >= 0));
    const data = chart.getOption().series[0].data.map(n => ({
      ...n, itemStyle: { ...n.itemStyle, opacity: visibleIdx.has(n.category) ? 1 : 0.06 },
      label: { ...n.label, opacity: visibleIdx.has(n.category) ? 1 : 0 }
    }));
    chart.setOption({ series: [{ links, data }] });
  }

  function highlightNode(id) {
    if (!chart) return;
    chart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: id });
    chart.dispatchAction({ type: 'showTip', seriesIndex: 0, name: id });
  }
  // ---------- 分类 ----------
  const DIFFS = [1, 2, 3, 4, 5];
  function renderFilters() {
    $('#filterDiff').innerHTML = DIFFS.map(d => `<span class="chip" data-g="diff" data-v="${d}">${'★'.repeat(d)}</span>`).join('');
    $('#filterImp').innerHTML = ['core', 'imp', 'ext'].map(v => `<span class="chip" data-g="imp" data-v="${v}">${IMP_LABEL[v]}</span>`).join('');
    $('#filterType').innerHTML = ['概念', '结构', '算法', '应用'].map(v => `<span class="chip" data-g="type" data-v="${v}">${TYPE_LABEL[v]}</span>`).join('');
    $('#filterFamily').innerHTML = Object.keys(FAMILY_LABEL).map(v => `<span class="chip" data-g="family" data-v="${v}">${FAMILY_LABEL[v]}</span>`).join('');
    $('#filterCh').innerHTML = KB.chapters.map(c => `<span class="chip" data-g="ch" data-v="${c.id}">${c.n.replace(/^第(\d+)章.*/, '第$1章')}</span>`).join('');
    $('#filterEx').innerHTML = ['有', '无'].map(v => `<span class="chip" data-g="ex" data-v="${v}">${v}例题</span>`).join('');
    $$('.chip-group .chip').forEach(el => el.addEventListener('click', () => {
      const g = el.dataset.g, v = el.dataset.v;
      const set = state.filters[g];
      if (set.has(v)) set.delete(v); else set.add(v);
      el.classList.toggle('on', set.has(v));
      renderCards();
    }));
    $('#catReset').onclick = () => {
      Object.keys(state.filters).forEach(k => state.filters[k].clear());
      $$('.chip-group .chip').forEach(el => el.classList.remove('on'));
      renderCards();
    };
  }

  function renderCards() {
    const f = state.filters;
    const list = [];
    for (const id in KB.kps) {
      const kp = KB.kps[id];
      if (f.diff.size && !f.diff.has(String(kp.d))) continue;
      if (f.imp.size && !f.imp.has(kp.i)) continue;
      if (f.type.size && !f.type.has(kp.t)) continue;
      if (f.family.size && !f.family.has(kp.family)) continue;
      if (f.ch.size && !f.ch.has(kpMeta[id].ch)) continue;
      if (f.ex.size) {
        const hasEx = kp.e ? '有' : '无';
        if (!f.ex.has(hasEx)) continue;
      }
      list.push(id);
    }
    $('#catCount').textContent = `共 ${list.length} 个知识点`;
    const meta = kpMeta;
    $('#cardGrid').innerHTML = list.map(id => {
      const kp = KB.kps[id];
      const ch = KB.chapters.find(c => c.id === meta[id].ch);
      const famLabel = FAMILY_LABEL[kp.family] || '';
      return `<div class="kp-card" data-id="${id}">
        <span class="kc-ch" style="background:${ch.color}"></span>
        <h4>${kp.n}</h4>
        <div class="kc-brief">${kp.b}</div>
        <div class="kc-tags">
          <span class="tag ${kp.i}">${IMP_LABEL[kp.i]}</span>
          <span class="diff-stars">${'★'.repeat(kp.d)}</span>
          ${famLabel ? `<span class="tag type">${famLabel}</span>` : ''}
          ${kp.e ? '<span class="tag" style="background:#fdf6ec;color:#b06a12">含例题</span>' : ''}
          ${mastered.has(id) ? '<span class="kc-done">✓ 已掌握</span>' : ''}
        </div>
      </div>`;
    }).join('');
    $$('.kp-card').forEach(el => el.addEventListener('click', () => selectKP(el.dataset.id)));
  }

  // ---------- 搜索 ----------
  function initSearch() {
    const input = $('#searchInput'), box = $('#searchResults');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { box.classList.remove('open'); return; }
      const hits = [];
      for (const id in KB.kps) {
        const kp = KB.kps[id];
        const nameHit = kp.n.toLowerCase().includes(q);
        const briefHit = kp.b.toLowerCase().includes(q);
        const tokenHit = AI.searchKPs(q, KB.kps, 40).includes(id);
        if (nameHit || briefHit || tokenHit) hits.push({ id, w: nameHit ? 2 : briefHit ? 1 : 0 });
      }
      hits.sort((a, b) => b.w - a.w);
      const meta = kpMeta;
      box.innerHTML = hits.length
        ? hits.slice(0, 9).map(h => {
          const kp = KB.kps[h.id];
          const ch = KB.chapters.find(c => c.id === meta[h.id].ch);
          return `<div class="search-item" data-id="${h.id}"><span class="kp-dot" style="width:6px;height:6px;border-radius:50%;background:${ch.color}"></span><span class="s-name">${kp.n}</span><span class="s-path">${ch.n.split(' ')[0]}</span></div>`;
        }).join('')
        : '<div class="search-empty">未找到相关知识点</div>';
      box.classList.add('open');
      box.querySelectorAll('.search-item').forEach(el => el.addEventListener('mousedown', e => {
        e.preventDefault();
        selectKP(el.dataset.id);
        box.classList.remove('open'); input.value = '';
      }));
    });
    document.addEventListener('click', e => { if (!e.target.closest('.search-box')) box.classList.remove('open'); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = box.querySelector('.search-item');
        if (first) { selectKP(first.dataset.id); box.classList.remove('open'); input.value = ''; }
      }
    });
  }

  // ---------- 视图切换 ----------
  function switchView(v) {
    state.view = v;
    $$('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
    $('#panel-tree').classList.toggle('hidden', v !== 'tree');
    $('#panel-graph').classList.toggle('hidden', v !== 'graph');
    $('#panel-category').classList.toggle('hidden', v !== 'category');
    $('#pane-detail').classList.toggle('hidden', v === 'graph' || v === 'category');
    $('#pane-graph').classList.toggle('hidden', v !== 'graph');
    $('#pane-category').classList.toggle('hidden', v !== 'category');
    if (v === 'category') renderCards();
    if (v === 'graph') { if (!chart) initGraph(); else setTimeout(() => chart.resize(), 50); }
  }
  $$('.view-tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));

  // ---------- AI 助手 ----------
  let aiBusy = false;
  function openAI(kpId) {
    $('#aiDrawer').classList.add('open');
    if (kpId) currentKP = kpId;
    updateAIContext();
    if (!$('#aiMessages').children.length) {
      botSay(`你好！我是你的数据结构学习助手 🤖\n\n我会紧扣你正在学习的知识点来回答问题。你可以直接提问，也可以点击下方快捷问题。试试问我"这门课怎么学？"`);
      renderChips();
    }
    $('#aiInput').focus();
  }
  function updateAIContext() {
    const el = $('#aiContext');
    if (currentKP && KB.kps[currentKP]) {
      el.innerHTML = `<span class="ctx-label">当前上下文</span><span class="ctx-name">${KB.kps[currentKP].n}</span>`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }
  function renderChips() {
    const chips = AI.quickChips(currentKP, KB);
    $('#aiChips').innerHTML = chips.map(c => `<button class="ai-chip">${c}</button>`).join('');
    $$('.ai-chip').forEach(el => el.addEventListener('click', () => {
      if (el.textContent.includes('怎么学') || el.textContent.includes('复习顺序')) { userAsk(el.textContent, true); return; }
      userAsk(el.textContent);
    }));
  }
  function escapeUser(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function renderBotHTML(text) {
    // <sec>标题\正文 → 分节加粗
    return text.split('\n\n').map(part => {
      const m = part.match(/^<sec>([^\n]+)\n([\s\S]*)$/);
      if (m) return `<div class="bot-sec"><b>${escapeUser(m[1])}</b><br>${escapeUser(m[2])}</div>`;
      return escapeUser(part);
    }).join('');
  }

  function addUserMsg(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = text;
    $('#aiMessages').appendChild(div);
    scrollAI();
  }
  function botSay(text, instant) {
    const div = document.createElement('div');
    div.className = 'msg bot';
    $('#aiMessages').appendChild(div);
    if (instant) { div.innerHTML = renderBotHTML(text); scrollAI(); return; }
    // 模拟流式输出
    const plain = text;
    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(plain.length, i + 6);
      div.innerHTML = renderBotHTML(plain.slice(0, i));
      scrollAI();
      if (i >= plain.length) { clearInterval(timer); aiBusy = false; $('#aiSend').disabled = false; renderChips(); }
    }, 24);
  }
  function scrollAI() { const m = $('#aiMessages'); m.scrollTop = m.scrollHeight; }

  function userAsk(q, isPlan) {
    if (aiBusy) return;
    aiBusy = true;
    $('#aiSend').disabled = true;
    addUserMsg(q);
    const typing = document.createElement('div');
    typing.className = 'msg bot';
    typing.innerHTML = '<span class="typing-dots"><i></i><i></i><i></i></span>';
    $('#aiMessages').appendChild(typing);
    scrollAI();
    setTimeout(() => {
      typing.remove();
      if (isPlan) { botSay(AI.studyPlan(KB)); return; }
      const res = AI.ask(q, currentKP, KB);
      botSay(res.text);
    }, 420);
  }

  $('#aiFab').addEventListener('click', () => openAI());
  $('#aiClose').addEventListener('click', () => $('#aiDrawer').classList.remove('open'));
  $('#aiSend').addEventListener('click', () => {
    const v = $('#aiInput').value.trim();
    if (!v) return;
    $('#aiInput').value = '';
    userAsk(v);
  });
  $('#aiInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#aiSend').click(); });

  // ---------- 启动 ----------
  renderTree();
  renderWelcome();
  renderFilters();
  initSearch();
  if (currentKP && KB.kps[currentKP]) { showDetail(currentKP); markTreeActive(currentKP); updateAIContext(); }
  else updateAIContext();
})();
