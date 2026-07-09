// Treemap 可视化:squarified 布局(尽量接近正方形,专业工具观感)。
// 色块用种子色 #378ADD 派生的色调阶:按大小排名分配明暗,不做彩虹。
// 点击目录块下钻,点击"其他"聚合块不响应。

import { SpaceNode, formatBytes } from "../lib/api";

interface Props {
  nodes: SpaceNode[];
  width: number;
  height: number;
  onDrill: (node: SpaceNode) => void;
  otherLabel: string;
}

interface Rect {
  node: SpaceNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

// 行带布局(按目标行高贪心分行):先定一个目标行数,算出每行的理想高度,
// 再贪心地往当前行塞节点,直到累积高度接近理想行高才换行。
// 这样各行高度均衡,不会出现尾块落单被拉成长条的情况。
function layout(nodes: SpaceNode[], width: number, height: number): Rect[] {
  const total = nodes.reduce((s, n) => s + n.bytes, 0);
  if (total <= 0 || nodes.length === 0) return [];

  // 目标行数:随节点数增长,块越多行越多,单块面积不至于太扁
  const targetRows = Math.max(1, Math.round(Math.sqrt(nodes.length / 1.6)));
  const idealRowSum = total / targetRows; // 每行理想的"总量"

  // 贪心分行:累积到接近 idealRowSum 就换行
  const rows: SpaceNode[][] = [];
  let cur: SpaceNode[] = [];
  let curSum = 0;
  for (const n of nodes) {
    cur.push(n);
    curSum += n.bytes;
    // 达到或超过理想行量,且不是最后强行留空,则封行
    if (curSum >= idealRowSum && rows.length < targetRows - 1) {
      rows.push(cur);
      cur = [];
      curSum = 0;
    }
  }
  if (cur.length > 0) rows.push(cur);

  const rects: Rect[] = [];
  let y = 0;
  for (const row of rows) {
    const rowSum = row.reduce((s, n) => s + n.bytes, 0);
    const rowH = (rowSum / total) * height;
    let x = 0;
    for (const n of row) {
      const w = rowSum > 0 ? (n.bytes / rowSum) * width : 0;
      rects.push({ node: n, x, y, w, h: rowH });
      x += w;
    }
    y += rowH;
  }
  return rects;
}

// 种子色 #378ADD 派生的一组明暗色阶(深→浅),按排名循环使用。
// 越大的块颜色越深,视觉权重与体积一致。
const RAMP = [
  "#0c447c",
  "#155a9e",
  "#1f6fbf",
  "#3288d6",
  "#5aa0e0",
  "#85b8ea",
  "#aecdf1",
];

// squarified treemap 布局
export function Treemap({ nodes, width, height, onDrill, otherLabel }: Props) {
  const rects = layout(nodes, width, height);
  const total = nodes.reduce((s, n) => s + n.bytes, 0);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", borderRadius: "var(--shape-md)" }}
      role="img"
      aria-label="磁盘空间分布图"
    >
      {rects.map((r, idx) => {
        const isOther = r.node.name === "__other__";
        const color = isOther ? "var(--surface-container-highest)" : RAMP[Math.min(idx, RAMP.length - 1)];
        const pct = total > 0 ? Math.round((r.node.bytes / total) * 100) : 0;
        const label = isOther ? otherLabel : r.node.name;
        const showText = r.w > 54 && r.h > 26;
        const clickable = r.node.is_dir && !isOther;

        return (
          <g
            key={idx}
            style={{ cursor: clickable ? "pointer" : "default" }}
            onClick={() => clickable && onDrill(r.node)}
          >
            <rect
              x={r.x + 1.5}
              y={r.y + 1.5}
              width={Math.max(0, r.w - 3)}
              height={Math.max(0, r.h - 3)}
              rx={6}
              fill={color}
              style={{ transition: "all var(--spring)" }}
            />
            {showText && (
              <>
                <text
                  x={r.x + 10}
                  y={r.y + 20}
                  fill={isOther ? "var(--on-surface-variant)" : "#ffffff"}
                  fontSize={12.5}
                  fontWeight={500}
                  style={{ pointerEvents: "none" }}
                >
                  {truncate(label, r.w)}
                </text>
                {r.h > 42 && (
                  <text
                    x={r.x + 10}
                    y={r.y + 37}
                    fill={isOther ? "var(--on-surface-variant)" : "rgba(255,255,255,0.82)"}
                    fontSize={11}
                    style={{ pointerEvents: "none" }}
                  >
                    {formatBytes(r.node.bytes)} · {pct}%
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function truncate(s: string, boxWidth: number): string {
  const max = Math.floor((boxWidth - 16) / 7.5);
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "…";
}
