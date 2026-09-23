// 第十三轮玩法（3/3）：共建路线解锁的小镇风貌收藏
export const townStyles = [
  { id: 'plaza', name: '花庭风貌', icon: '🌼', description: '花满广场完工后解锁。', projectId: 'plaza', colors: { accent: '#4b8f6f', panel: '#f2f8ed', highlight: '#f6df91' } },
  { id: 'station', name: '归钟风貌', icon: '🕰️', description: '车站新钟完工后解锁。', projectId: 'station', colors: { accent: '#4b80a8', panel: '#edf5f8', highlight: '#e5bd67' } },
  { id: 'shore', name: '湖岸风貌', icon: '🌊', description: '湖岸长椅完工后解锁。', projectId: 'shore', colors: { accent: '#438c91', panel: '#edf7f5', highlight: '#e7c277' } },
];

export function getTownStyle(id) {
  return townStyles.find((style) => style.id === id) || null;
}
