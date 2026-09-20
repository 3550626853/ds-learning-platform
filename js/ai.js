// ===== AI 学习助手（本地知识库引擎）=====
// 基于知识库检索 + 意图识别生成回答，回答自动携带当前知识点上下文。
window.AIEngine = (function () {

  // 泛义停用词：参与意图判断但显著稀释检索打分的词
  const STOP = new Set(['算法', '排序', '结构', '什么', '是什', '介绍', '讲讲', '怎么',
    '如何', '意思', '定义', '概念', '这个', '那个', '数据结构', '一下', '问题', '方法', '相关',
    '说说', '详细', '简单', '到底', '究竟', '学习', '复习', '知识点', '实现', '分析', '应用']);

  function normalize(s) {
    return (s || '').toLowerCase().replace(/\s+/g, '');
  }

  // 分词：中文按 2-gram + 英文/数字词
  function tokenize(s, keepStop) {
    const tokens = new Set();
    const clean = normalize(s);
    const eng = clean.match(/[a-z0-9]+/g) || [];
    eng.forEach(w => { if (w.length >= 2) tokens.add(w); });
    const zh = clean.replace(/[a-z0-9]/g, '');
    for (let i = 0; i < zh.length - 1; i++) {
      const g = zh.substr(i, 2);
      if (!keepStop && STOP.has(g)) continue;
      tokens.add(g);
    }
    if (zh.length === 1 && (keepStop || !STOP.has(zh))) tokens.add(zh);
    return tokens;
  }

  function jaccard(a, b) {
    let inter = 0;
    a.forEach(t => { if (b.has(t)) inter++; });
    return a.size && b.size ? inter / (a.size + b.size - inter) : 0;
  }

  // ---------- 知识点检索 ----------
  function searchKPs(query, kps, topN) {
    const qTokens = tokenize(query, false);
    if (!qTokens.size) return [];
    const scored = [];
    for (const id in kps) {
      const kp = kps[id];
      const nameTokens = tokenize(kp.n, true);      // 名称侧保留全部词
      let score = jaccard(qTokens, nameTokens) * 3; // 名称权重最高
      // 名称子串直接命中
      const nq = normalize(query), nk = normalize(kp.n);
      if (nk.includes(nq) || nq.includes(nk)) score += 2;
      // 英文/数字专名精确命中（如 kmp、avl、b树、dijkstra）
      let hasProper = false;
      qTokens.forEach(t => {
        if (/^[a-z0-9]+$/.test(t) && nk.includes(t)) { score += 2.5; hasProper = true; }
      });
      score += jaccard(qTokens, tokenize(kp.b, true)) * 0.7;         // 简介
      score += jaccard(qTokens, tokenize(kp.p.join(' '), true)) * 0.4; // 要点
      if (kp.e) score += jaccard(qTokens, tokenize(kp.e.q, true)) * 0.3;
      if (score > 0.12) scored.push({ id, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN || 3).map(x => x.id);
  }

  // ---------- 意图识别 ----------
  function detectIntent(q) {
    if (/区别|对比|异同|比较|差异|vs|VS/.test(q)) return 'compare';
    if (/前置|先学|基础|依赖|顺序|准备/.test(q)) return 'prereq';
    if (/例题|题目|怎么做|怎么算|解题|步骤|练习|考法|怎么考/.test(q)) return 'example';
    if (/复杂度|时间|空间|效率|性能|多快|O\(/.test(q)) return 'complexity';
    if (/是什么|定义|概念|含义|介绍|讲讲|理解|什么意思/.test(q)) return 'definition';
    if (/重点|重要|核心|考点|必考/.test(q)) return 'importance';
    if (/延伸|拓展|进阶|接下来|学完/.test(q)) return 'related';
    return 'general';
  }

  // ---------- 回答生成（kpId 为知识点 id）----------
  function fmtPoints(kp) {
    return kp.p.map(p => '· ' + p).join('\n');
  }

  function answerFrom(kpId, intent, KB) {
    const kp = KB.kps[kpId];
    const name = `《${kp.n}》`;
    const parts = [];
    switch (intent) {
      case 'definition':
        parts.push(`${name}：${kp.b}`);
        parts.push(`<sec>核心要点\n${fmtPoints(kp)}`);
        break;
      case 'example':
        if (kp.e) {
          parts.push(`${name} 有一道配套例题，帮你彻底吃透考法：`);
          parts.push(`<sec>题目\n${kp.e.q}`);
          parts.push(`<sec>思路分析\n${kp.e.idea}`);
          parts.push(`<sec>解题步骤\n${kp.e.s.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
          parts.push(`<sec>答案\n${kp.e.a}`);
        } else {
          parts.push(`${name}暂无配套例题，它的核心内容是：${kp.b}`);
          parts.push(`<sec>掌握这些就够了\n${fmtPoints(kp)}`);
          const withEx = relatedOf(kpId, KB).map(r => r.id).find(id => KB.kps[id].e);
          if (withEx) parts.push(`建议同步看关联的《${KB.kps[withEx].n}》的例题，可以巩固这个考法。`);
        }
        break;
      case 'complexity': {
        const cxLines = [];
        if (kp.c) cxLines.push(kp.c);
        kp.p.forEach(p => { if (/O\(|log|时间|空间|复杂度/.test(p)) cxLines.push(p); });
        if (cxLines.length) {
          parts.push(`${name} 的复杂度分析：\n` + cxLines.map(l => '· ' + l).join('\n'));
        } else {
          parts.push(`${name}：${kp.b}\n（本知识点不侧重复杂度分析。想问算法效率可以点名具体算法，如快速排序、堆、Dijkstra 等。）`);
        }
        break;
      }
      case 'prereq': {
        const pres = KB.edges.filter(e => e.b === kpId && e.r === 'pre').map(e => e.a);
        if (pres.length) {
          parts.push(`学${name}之前，建议先掌握：`);
          pres.forEach(id => {
            const pk = KB.kps[id];
            parts.push(`<sec>${pk.n}\n${pk.b}`);
          });
        } else {
          parts.push(`${name}是比较独立的基础知识点，直接学即可，它属于本章起始内容。`);
        }
        break;
      }
      case 'compare': {
        const rels = KB.edges.filter(e => e.r === 'cmp' && (e.a === kpId || e.b === kpId));
        if (rels.length) {
          parts.push(`与${name}常作对比的知识点：`);
          rels.forEach(e => {
            const other = KB.kps[e.a === kpId ? e.b : e.a];
            parts.push(`<sec>${kp.n} vs ${other.n}\n· ${kp.n}：${kp.b}\n· ${other.n}：${other.b}`);
          });
        } else {
          const same = KB.edges.filter(e => e.r !== 'cmp' && (e.a === kpId || e.b === kpId)).slice(0, 3);
          if (same.length) {
            parts.push(`${name}没有专门的"对比关联"，可以对照这些相关知识点理解：`);
            same.forEach(e => {
              const other = KB.kps[e.a === kpId ? e.b : e.a];
              parts.push(`· 《${other.n}》——${other.b.slice(0, 60)}…`);
            });
          } else {
            parts.push(`${name}目前没有建立对比关联。${kp.b}`);
          }
        }
        break;
      }
      case 'related': {
        const rels = relatedOf(kpId, KB);
        if (rels.length) {
          parts.push(`学完${name}后，推荐继续：`);
          rels.forEach(r => {
            const ok = KB.kps[r.id];
            const relName = { pre: '前置基础', ext: '延伸拓展', cmp: '对比关联' }[r.r];
            parts.push(`<sec>《${ok.n}》（${relName}）\n${ok.b}`);
          });
        } else parts.push(`${name}是本章收尾内容，可返回知识树查看下一模块。`);
        break;
      }
      case 'importance':
        parts.push(`${name}${kp.i === 'core' ? '是本章核心考点，必须熟练掌握' : kp.i === 'imp' ? '是重要知识点，高频考察' : '属于拓展内容，学有余力再深入'}（难度${'★'.repeat(kp.d)}）。`);
        parts.push(`<sec>内容概要\n${kp.b}`);
        parts.push(`<sec>复习清单\n${fmtPoints(kp)}`);
        break;
      default:
        parts.push(`关于${name}：${kp.b}`);
        parts.push(`<sec>要点\n${fmtPoints(kp)}`);
        if (kp.e) parts.push(`这个知识点配有例题精讲，可以问我"讲讲例题"或"这个知识点怎么考"。`);
    }
    return parts;
  }

  function relatedOf(id, KB) {
    const out = [];
    KB.edges.forEach(e => {
      if (e.a === id) out.push({ id: e.b, r: e.r });
      else if (e.b === id) out.push({ id: e.a, r: e.r });
    });
    const order = { pre: 0, cmp: 1, ext: 2 };
    out.sort((x, y) => order[x.r] - order[y.r]);
    return out.slice(0, 4);
  }

  // ---------- 入口：回答 ----------
  function ask(question, currentId, KB) {
    const intent = detectIntent(question);
    const hits = searchKPs(question, KB.kps, 3);
    const mentionsOther = hits.length && hits[0] !== currentId;

    // 1) 命中知识库（且非仅重复当前上下文）
    if (mentionsOther || (hits.length && !currentId)) {
      const id = hits[0];
      const parts = answerFrom(id, intent, KB);
      if (hits.length > 1 && intent === 'general') {
        const others = hits.slice(1).map(x => `《${KB.kps[x].n}》`).join('、');
        parts.push(`你可能还想看：${others}（点击树或图谱中对应节点即可查看）。`);
      }
      return { text: parts.join('\n\n'), kpId: id, related: relatedOf(id, KB).map(r => ({ id: r.id, name: KB.kps[r.id].n, r: r.r })) };
    }

    // 2) 无命中但存在当前知识点上下文 → 围绕当前知识点回答
    if (currentId && KB.kps[currentId]) {
      const parts = answerFrom(currentId, intent === 'general' ? 'general' : intent, KB);
      parts.push(`（以上回答基于你正在学习的《${KB.kps[currentId].n}》。想问其他知识点，直接点名即可，比如"讲讲 KMP"。）`);
      return { text: parts.join('\n\n'), kpId: currentId, related: relatedOf(currentId, KB).map(r => ({ id: r.id, name: KB.kps[r.id].n, r: r.r })) };
    }

    // 3) 完全无上下文 → 引导
    const withEx = [];
    for (const id in KB.kps) if (KB.kps[id].e) withEx.push(id);
    const picks = withEx.slice(0, 3).map(id => `《${KB.kps[id].n}》`).join('、');
    return {
      text: `这个问题没有直接匹配到具体知识点。\n\n你可以：\n1. 先在「知识树」或「关联图谱」中选择一个知识点，我会紧扣它来回答；\n2. 直接点名知识点提问，例如"讲讲 KMP""快速排序和堆排序的区别""堆的前置知识"。\n\n平台内含 ${Object.keys(KB.kps).length} 个知识点、${withEx.length} 道精讲例题（如 ${picks}），试试问我任何一个！`,
      kpId: currentId || null, related: []
    };
  }

  // ---------- 快捷问题生成 ----------
  function quickChips(currentId, KB) {
    if (!currentId) return ['这门课怎么学？', '有哪些核心考点？', '帮我规划复习顺序'];
    const kp = KB.kps[currentId];
    const chips = ['这个知识点是什么？', kp.e ? '讲讲例题' : '它重要在哪？', '有什么前置知识？', '相关知识点有哪些？'];
    const cmp = KB.edges.find(e => e.r === 'cmp' && (e.a === currentId || e.b === currentId));
    if (cmp) {
      const other = KB.kps[cmp.a === currentId ? cmp.b : cmp.a];
      chips[2] = `它和《${other.n}》的区别？`;
    }
    return chips;
  }

  // ---------- 复习规划 ----------
  function studyPlan(KB) {
    const chCount = KB.chapters.length;
    const kpCount = Object.keys(KB.kps).length;
    const exCount = Object.values(KB.kps).filter(k => k.e).length;
    return `本平台共 ${chCount} 章、${kpCount} 个知识点、${exCount} 道精讲例题。建议这样推进：\n\n1. 【框架】先通读「知识树」，按 章节→模块 层级过一遍知识点名称，标记陌生概念；\n2. 【主线】按章节顺序学习，每学完一个模块就在图谱里看它的前置与延伸，把新知识挂到已有框架上；\n3. 【例题】核心知识点（红标）务必亲手做一遍配套例题，对照"思路分析"复盘；\n4. 【复习】用「分类学习」按 难度/重要性/类型 组合筛选，集中攻克 ★★★★ 以上的重要知识点；\n5. 【检验】对每个知识点点"标记已掌握"，进度条会记录你的掌握比例。`;
  }

  return { ask, quickChips, studyPlan, searchKPs };
})();
