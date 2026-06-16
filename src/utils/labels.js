export const ALERT_LEVEL_LABELS = {
  blue: '蓝色预警',
  yellow: '黄色预警',
  orange: '橙色预警',
  red: '红色预警'
}

export const STATUS_LABELS = {
  planned: '预报中',
  active: '进行中',
  ended: '已结束'
}

export const ALERT_LEVEL_TAG_TYPES = {
  blue: 'info',
  yellow: 'warning',
  orange: '',
  red: 'danger'
}

export const STATUS_TAG_TYPES = {
  planned: 'info',
  active: 'danger',
  ended: 'success'
}

export function getAlertLevelLabel(level) {
  return ALERT_LEVEL_LABELS[level] || level
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status
}
