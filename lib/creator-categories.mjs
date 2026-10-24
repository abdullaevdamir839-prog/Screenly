// Shared catalogue used by the browser and the server. The server validates every submitted ID.
export const CATEGORIES = Object.freeze([
  { id: 'vibe-coding', label: 'Вайб-кодинг', desc: 'Создавайте сайты и приложения с помощью ИИ.', accent: '#171717' },
  { id: 'design', label: 'Дизайн', desc: 'Figma, интерфейсы, брендинг и разбор работ.', accent: '#171717' },
  { id: 'drawing', label: 'Рисование', desc: 'Скетчи, цифровая иллюстрация и практика.', accent: '#171717' },
  { id: 'programming', label: 'Программирование', desc: 'Код, отладка, обучение и совместные проекты.', accent: '#171717' },
  { id: 'game-dev', label: 'Разработка игр', desc: 'Roblox Studio, Unity, Godot и прототипы.', accent: '#171717' },
  { id: '3d', label: '3D и анимация', desc: 'Blender, моделирование и анимация.', accent: '#171717' },
  { id: 'video', label: 'Монтаж и видео', desc: 'Монтаж, эффекты, анимационная графика.', accent: '#171717' },
  { id: 'music', label: 'Музыка', desc: 'Создание треков и работа со звуком.', accent: '#171717' },
  { id: 'study', label: 'Учёба', desc: 'Вместе разбираемся в сложных темах.', accent: '#171717' },
  { id: 'gaming', label: 'Игры', desc: 'Показывайте геймплей и учитесь друг у друга.', accent: '#171717' },
  { id: 'talk', label: 'Общение', desc: 'Знакомства, разговоры и обмен идеями.', accent: '#171717' },
  { id: 'projects', label: 'Свои проекты', desc: 'Идеи, стартапы и демонстрация собственных работ.', accent: '#171717' },
]);
export const GOALS = Object.freeze([
  { id: 'showcase', label: 'Показываю проект', desc: 'Показать, что получилось, и ответить на вопросы' },
  { id: 'feedback', label: 'Нужен разбор', desc: 'Получить советы и обратную связь' },
  { id: 'teach', label: 'Обучаю', desc: 'Объяснить навык и провести мини-урок' },
  { id: 'learn', label: 'Хочу научиться', desc: 'Попросить помощи у сообщества' },
  { id: 'collab', label: 'Делаем вместе', desc: 'Совместно работать над проектом' },
  { id: 'hangout', label: 'Просто общаемся', desc: 'Общение на выбранную тему' },
]);
export const getCategory = id => CATEGORIES.find(c => c.id === id) || null;
export const getGoal = id => GOALS.find(g => g.id === id) || null;
export const validCategory = id => typeof id === 'string' && !!getCategory(id);
export const validGoal = id => typeof id === 'string' && !!getGoal(id);
export function normalizeProjectLink(value) {
  if(value === undefined || value === null || value === '') return '';
  if(typeof value !== 'string' || value.length > 350) throw Object.assign(new Error('Слишком длинная ссылка на проект'),{status:400});
  const candidate = value.trim();
  if(!candidate) return '';
  try {
    const url = new URL(candidate);
    if(url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password || url.port || url.hostname === 'localhost') throw new Error('bad URL');
    return url.toString().slice(0,350);
  } catch {
    throw Object.assign(new Error('Ссылка на проект должна начинаться с https:// и вести на обычный сайт'),{status:400});
  }
}
export function filterRooms(rooms,{category='all',goal='all',query=''}={}) {
  const term=String(query||'').trim().toLocaleLowerCase('ru').slice(0,80);
  return rooms.filter(r =>
    (category==='all' || r.category===category) &&
    (goal==='all' || r.goal===goal) &&
    (!term || [r.title,r.description,r.projectTitle,r.topic,r.owner?.displayName].some(x=>String(x||'').toLocaleLowerCase('ru').includes(term)))
  );
}
