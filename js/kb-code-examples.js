// 代码型例题：整段 C++ 代码 + 逐段解析 + 串联多个知识点
// 加载后把 code 例题附加到对应知识点的 e 字段上
window.KB = window.KB || { chapters: [], kps: {}, edges: [] };
(function () {
  const KB = window.KB;
  // 挂载点：kp5-5 二叉树遍历（作为代码例题首页展示）
  // 这里把多道代码例题挂到代表性知识点，每道含 code + codeNotes + relKPs

  // ---- 例题1：单链表就地逆置（挂 kp2-5）----
  KB.kps['kp2-5'].e.code = {
    title: '单链表就地逆置（头插法）',
    desc: '将带头结点的单链表逆置，要求就地完成（不另建结点），时间 O(n)、空间 O(1)。',
    code: [
      ['void Reverse(LinkNode* head) {', '函数入口，head 为附加头结点'],
      ['    LinkNode *p = head->next;  // p 指向首元结点', '准备从头开始逐个摘结点'],
      ['    head->next = NULL;         // 断开，头结点单独成空表', '关键：先把原链表"断开"'],
      ['    while (p != NULL) {', '遍历原链表每个结点'],
      ['        LinkNode* q = p->next; // 暂存后继，防止断链', '先保存下一个结点，否则丢链'],
      ['        p->next = head->next;  // 头插第一步', '新结点指向当前新表的首元'],
      ['        head->next = p;        // 头插第二步', '头结点指向新首元'],
      ['        p = q;                 // 前进到下一个原结点', '用暂存的 q 继续'],
      ['    }', '循环结束，逆置完成'],
      ['}', '']
    ],
    notes: [
      '核心思想是"头插法"：每从原链表摘下一个结点，就插入到新链表（头结点之后）的最前面，遍历一遍后顺序自然反转。',
      '两句指针赋值 p->next=head->next 与 head->next=p 顺序不可颠倒，否则 p->next 先丢失了原后续结点，造成断链。',
      'q 变量用于在改指针前暂存 p 的下一个结点，是"先保存、再改链"的通用安全写法。'
    ],
    relKPs: ['kp2-4', 'kp2-6']
  };

  // ---- 例题2：中缀转后缀并求值（挂 kp3-5）----
  KB.kps['kp3-5'].e.code = {
    title: '中缀表达式转后缀并求值',
    desc: '给定中缀表达式，用栈完成转后缀（逆波兰）并求值，串联运算符优先级判断与后缀求值两个环节。',
    code: [
      ['// 中缀转后缀', '阶段一：中缀 → 后缀'],
      ['string InfixToPostfix(string infix) {', ''],
      ['    stack<char> s; string out;', 's 存运算符，out 存结果'],
      ['    map<char,int> pri = {{\'+\',1},{\'-\',1},{\'*\',2},{\'/\',2}};', '定义优先级：乘除高于加减'],
      ['    for (char c : infix) {', '逐字符扫描'],
      ['        if (isdigit(c)) out += c;', '操作数直接输出'],
      ['        else if (c == \'(\') s.push(c);', '左括号一律入栈'],
      ['        else if (c == \')\') {', '右括号：弹栈到左括号'],
      ['            while (s.top() != \'(\') { out += s.top(); s.pop(); }', '弹出括号内所有运算符'],
      ['            s.pop();', '弹出左括号（不输出）'],
      ['        } else {', '普通运算符'],
      ['            while (!s.empty() && s.top() != \'(\' && pri[s.top()] >= pri[c])', '栈顶优先级 ≥ 当前则先出栈（左结合）'],
      ['                { out += s.top(); s.pop(); }', '弹出并输出'],
      ['            s.push(c);', '当前运算符入栈'],
      ['        }', ''],
      ['    }', ''],
      ['    while (!s.empty()) { out += s.top(); s.pop(); }', '剩余运算符全部弹出'],
      ['    return out;', '得到后缀表达式'],
      ['}', ''],
      ['// 后缀求值', '阶段二：后缀 → 数值'],
      ['int EvalPostfix(string post) {', ''],
      ['    stack<int> st;', '操作数栈'],
      ['    for (char c : post) {', ''],
      ['        if (isdigit(c)) st.push(c - \'0\');', '数字入栈'],
      ['        else {', '遇到运算符'],
      ['            int b = st.top(); st.pop();', '先弹的是右操作数 b'],
      ['            int a = st.top(); st.pop();', '后弹的是左操作数 a'],
      ['            st.push(c==\'+\'?a+b : c==\'-\'?a-b : c==\'*\'?a*b : a/b);', '运算后压回栈'],
      ['        }', ''],
      ['    }', ''],
      ['    return st.top();', '栈顶即最终结果'],
      ['}', '']
    ],
    notes: [
      '转后缀的关键是"左结合"：当前运算符与栈顶同级时，先弹出栈顶（pri[栈顶] >= pri[当前] 才弹），保证 a-b-c 正确变成 a b - c - 而非 a b c - -。',
      '后缀求值时，先弹出的操作数是"右操作数"、后弹出的是"左操作数"，减法和除法尤其要注意这个顺序，否则 a-b 会算成 b-a。',
      '两个阶段都只依赖一个栈，分别存运算符和操作数，体现了栈 LIFO 特性在表达式处理中的两种用法。'
    ],
    relKPs: ['kp3-1', 'kp3-2']
  };

  // ---- 例题3：由先序中序重建二叉树（挂 kp5-8）----
  KB.kps['kp5-8'].e.code = {
    title: '由先序 + 中序序列重建二叉树',
    desc: '已知先序与中序序列，递归重建二叉树，串联"先序定根、中序分左右"与递归思想。',
    code: [
      ['TreeNode* build(vector<int>& pre, vector<int>& in,', ''],
      ['                int pL, int pR, int iL, int iR) {', '先序区间 [pL,pR]、中序区间 [iL,iR]'],
      ['    if (pL > pR) return NULL;', '空区间返回空树（递归基准）'],
      ['    int rootVal = pre[pL];', '先序第一个元素是根'],
      ['    TreeNode* root = new TreeNode(rootVal);', '建根结点'],
      ['    int idx = iL;', '在中序中定位根'],
      ['    while (in[idx] != rootVal) idx++;', '找到根在中序里的位置'],
      ['    int leftLen = idx - iL;', '左子树结点个数'],
      ['    root->left = build(pre, in,', '递归重建左子树'],
      ['        pL+1, pL+leftLen, iL, idx-1);', '左子树对应的两段区间'],
      ['    root->right = build(pre, in,', '递归重建右子树'],
      ['        pL+leftLen+1, pR, idx+1, iR);', '右子树对应的两段区间'],
      ['    return root;', '返回根'],
      ['}', '']
    ],
    notes: [
      '核心不变量：先序区间首元 = 当前根；中序里根左边 leftLen 个元素是左子树、右边是右子树，两个序列的左子树区间长度一致，据此精确切分。',
      '用 idx 定位根、leftLen 计算左子树大小是关键量，切分时先序与中序要"同步"使用同一个 leftLen，避免错位。',
      '递归基准是 pL > pR（空区间），时间复杂度 O(n)、空间 O(n)（递归栈深为树高）。'
    ],
    relKPs: ['kp5-5', 'kp3-6']
  };

  // ---- 例题4：堆排序完整实现（挂 kp9-10）----
  KB.kps['kp9-10'].e.code = {
    title: '堆排序完整实现（建堆 + 下沉 + 排序）',
    desc: '用最大堆完成升序排序，串联建堆的 O(n) 技巧、向下筛选与"堆顶沉底"的排序过程。',
    code: [
      ['void siftDown(vector<int>& a, int i, int n) {', '向下筛选，n 为当前堆大小'],
      ['    while (2*i+1 < n) {', '有左孩子才继续'],
      ['        int j = 2*i+1;', 'j 先指向左孩子'],
      ['        if (j+1 < n && a[j+1] > a[j]) j++;', '右孩子更大则 j 指向右孩子'],
      ['        if (a[i] >= a[j]) break;', '父已 ≥ 较大孩子，堆序满足'],
      ['        swap(a[i], a[j]);', '下沉：与较大孩子交换'],
      ['        i = j;', '继续向下检查'],
      ['    }', ''],
      ['}', ''],
      ['void heapSort(vector<int>& a) {', ''],
      ['    int n = a.size();', ''],
      ['    for (int i = n/2-1; i >= 0; i--)', '建堆：从最后分支结点倒序下沉'],
      ['        siftDown(a, i, n);', '整体建堆代价 O(n)'],
      ['    for (int i = n-1; i > 0; i--) {', '排序：反复取堆顶最大者'],
      ['        swap(a[0], a[i]);', '堆顶（当前最大）沉到末尾'],
      ['        siftDown(a, 0, i);', '对前 i 个重新下沉维持堆'],
      ['    }', ''],
      ['}', '']
    ],
    notes: [
      '升序用最大堆：堆顶是最大值，交换到末尾后缩小堆再下沉，最终得到升序数组；降序则用最小堆。',
      '建堆从 n/2-1 倒序到 0 逐一下沉，总代价是 O(n) 而非 O(n log n)，这是堆排序优于"逐个插入建堆"的关键。',
      '整体时间 O(n log n)、空间 O(1)、不稳定，且最好最坏同阶——这是它相对快排（最坏 O(n^2)）的核心优势。'
    ],
    relKPs: ['kp5-16', 'kp5-17']
  };

  // ---- 例题5：Dijkstra 最短路径（挂 kp8-11）----
  KB.kps['kp8-11'].e.code = {
    title: 'Dijkstra 单源最短路径（邻接矩阵）',
    desc: '求非负权有向网中源点到各顶点的最短路径，串联邻接矩阵存储、贪心选点与松弛操作。',
    code: [
      ['void dijkstra(vector<vector<int>>& G, int s, vector<int>& dist) {', 'G 邻接矩阵（无边记大数），s 为源点'],
      ['    int n = G.size();', ''],
      ['    vector<bool> vis(n, false);', 'vis 标记已确定最短路径的顶点'],
      ['    dist.assign(n, INT_MAX); dist[s] = 0;', '源点距离 0，其余初始为无穷'],
      ['    for (int k = 0; k < n; k++) {', '每轮确定一个顶点'],
      ['        int u = -1;', ''],
      ['        for (int i = 0; i < n; i++)', '在未确定顶点中找 dist 最小者'],
      ['            if (!vis[i] && (u == -1 || dist[i] < dist[u])) u = i;', '贪心选择'],
      ['        if (u == -1 || dist[u] == INT_MAX) break;', '剩余顶点不可达，提前结束'],
      ['        vis[u] = true;', 'u 的距离已最终确定'],
      ['        for (int v = 0; v < n; v++)', '用 u 松弛所有邻接点'],
      ['            if (!vis[v] && G[u][v] != INT_MAX)', '存在边 u->v 且 v 未确定'],
      ['                dist[v] = min(dist[v], dist[u] + G[u][v]);', '松弛操作'],
      ['    }', ''],
      ['}', '']
    ],
    notes: [
      '贪心正确性依赖"边权非负"：已确定顶点的 dist 不会再被后续松弛减小，所以每轮选出的最小 dist 顶点必然已是最优。',
      '松弛是 Dijkstra 的核心：dist[v] = min(dist[v], dist[u]+G[u][v])，即尝试"借道 u 到 v 是否更近"。',
      '邻接矩阵实现 O(n^2)，适合稠密图；稀疏图改用邻接表 + 小根堆可优化到 O(e log n)。'
    ],
    relKPs: ['kp8-2', 'kp3-12']
  };
})();
