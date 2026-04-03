/** ตรงกับ web/public — โหลดจากโดเมนหลัก (iframe อยู่ใต้ /tailadmin-template) */
export const DEFAULT_CENTRAL_GAME_COVER_PATH = '/game-cover-default-pink.svg'
export const DEFAULT_TILE_BACK_COVER_PATH = '/game-tile-back-default.svg'

export const CENTRAL_GAME_UNITS = ['บาท', 'ชิ้น', 'อัน', 'คัน', 'ใบ', 'หลัง'] as const

export const PUBLISH_CONFIRM_MESSAGE =
  'โปรดตรวจสอบรูปแบบเกมและรางวัลให้ถูกต้องตรงตามความต้องการ\n\nหากกดเผยแพร่แล้วจะไม่สามารถแก้ไขได้\n\nยืนยันเผยแพร่หรือไม่?'

export const DELETE_BLOCKED_HINT =
  'เกมนี้มีประวัติการเล่นหรือรับรางวัลแล้ว — ไม่สามารถลบจากที่นี่ได้ กรุณาติดต่อผู้ดูแลระบบให้ลบแทน'
