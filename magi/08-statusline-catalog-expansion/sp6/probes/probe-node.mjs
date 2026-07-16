// S6-T2.5 spike probe：Node 後端「自算」idiom（鏡像 resolve.ts formatResetsAt
// 的 new Date(epoch*1000).getHours()/getMinutes()，本探針延伸補 getMonth()/
// getDate() 求 MM/dd HH:mm）。另印 toLocaleString 對照組（非production路徑，
// 僅供交叉檢查 Node 內建 locale 格式化是否與自算一致）。
// 用法：node probe-node.mjs <epochSeconds>
const epoch = Number(process.argv[2])
if (!Number.isFinite(epoch)) {
  console.error('usage: node probe-node.mjs <epochSeconds>')
  process.exit(1)
}
const d = new Date(epoch * 1000)
const pad2 = (n) => String(n).padStart(2, '0')
const selfCalc = `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
// toLocaleString 對照（en-US-like numeric，僅供交叉檢查，非 production idiom）
const locale = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(d)
console.log(`selfCalc=${selfCalc}`)
console.log(`toLocaleString=${locale}`)
