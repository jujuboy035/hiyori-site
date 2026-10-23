export type TodoId = number | string;
export type TodoItem = { id: TodoId; title: string };
export const defaultTodoTitles=`寄り道しながら散歩する|一緒に写真を撮る|カフェでのんびりする|映画館に行く|おうちで映画を見る|一緒に料理する|餃子を作る|お弁当を作る|朝ごはんを食べに行く|夜景を見に行く|海を見に行く|水族館に行く|動物園に行く|遊園地に行く|観覧車に乗る|ドライブする|夕日を見る|星を眺める|ピクニックする|お花見する|紅葉を見に行く|イルミネーションを見る|花火を見る|浴衣を着る|夏祭りに行く|温泉に行く|旅行を計画する|一泊旅行する|電車で遠出する|知らない街を歩く|山に登る|湖を散歩する|自転車に乗る|バドミントンをする|ボウリングをする|ビリヤードをする|カラオケに行く|ゲームをする|ボードゲームをする|パズルを完成させる|小さなおみやげを選ぶ|お互いに服を選ぶ|ちょっとした差し入れをする|ひとことメモを渡す|誕生日をお祝いする|ちょっとした達成をお祝いする|クリスマスを過ごす|初詣に行く|おみくじを引く|願い事を書く|ケーキを作る|クッキーを焼く|たこ焼きを作る|鍋を囲む|新しい料理に挑戦する|ラーメンを食べに行く|お寿司を食べに行く|焼肉を食べに行く|食べ歩きをする|いちご狩りに行く|アイスを半分こする|お互いの好きな曲を聴く|プレイリストを作る|一緒に歌う|ライブに行く|美術館に行く|博物館に行く|本屋さんに行く|おすすめの本を交換する|絵を描き合う|陶芸を体験する|アクセサリーを作る|写真をプリントする|アルバムを作る|プリクラを撮る|同じポーズで写真を撮る|思い出の場所を訪れる|初めて遊んだ日を振り返る|子どもの頃の話をする|お互いの夢を話す|相手のいいところをひとつ伝える|ありがとうを伝える|スマホをしまってゆっくり話す|雨の日を楽しむ|朝日を見る|お散歩コースを見つける|秘密の場所を見つける|小さな植物を育てる|お部屋を飾る|一緒に掃除する|スーパーで買い物する|お気に入りのマグカップを使う|おうちカフェを開く|何もしない日を過ごす|サプライズをする|タイムカプセルを作る|次の季節のおでかけを考える|行きたい場所リストを作る|ふたりの思い出を振り返る|また一緒に笑う`.split('|');
export function isCustomTodoId(value: unknown): value is string {
  return typeof value === 'string' && /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}
export function getTodoItems(data: Record<string, any>): TodoItem[] {
  const defaults = defaultTodoTitles.map((title, id) => ({ id, title }));
  const custom = Object.entries(data).filter(([key, value]) => key.startsWith('todo-item:') && isCustomTodoId(value?.id) && key === 'todo-item:' + value.id && typeof value.title === 'string' && value.title.trim()).map(([, value]) => ({ id: value.id as string, title: value.title as string, createdAt: value.createdAt as string })).sort((a,b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id));
  return [...defaults, ...custom.map(({id,title}) => ({id,title}))].filter(item => !data['todo-hidden:' + item.id]);
}
