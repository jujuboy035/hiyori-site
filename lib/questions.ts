import {checkinNames, type CheckinName} from './checkins';

const legacyQuestions = [
 {id:'small-happiness',text:'最近、ちょっとうれしかったことは？'},
 {id:'next-trip',text:'今度、一緒に行ってみたい場所は？'},
 {id:'first-impression',text:'初めて会ったとき、どんな印象だった？'},
 {id:'good-memory',text:'一緒に過ごした中で、ふと思い出す場面は？'},
 {id:'day-off',text:'何も予定のない休日、どう過ごしたい？'},
 {id:'food',text:'今、一緒に食べたいものは？'},
 {id:'music',text:'最近よく聴いている曲と、その理由は？'},
 {id:'try-something',text:'今年、ちょっと挑戦してみたいことは？'},
 {id:'kindness',text:'どんなことをしてもらうと、うれしい？'},
 {id:'ask-you',text:'相手に、聞いてみたかったことは？'},
 {id:'your-side',text:'相手の、いいなと思うところは？'},
 {id:'next-time',text:'次に会ったら、話したいことは？'},
] as const;
export type QuestionItem={id:string;text:string};
export const questions:QuestionItem[]=[
 {id:'v2-values',text:'人と仲良くなるうえで、大切にしていることは？'},
 {id:'v2-recharge',text:'疲れた日は、そっとしてほしい？話を聞いてほしい？'},
 {id:'v2-friendship',text:'居心地がいいと感じるのは、どんな人といるとき？'},
 {id:'v2-pace',text:'連絡はこまめBさんうが好き？自分のペースが好き？'},
 {id:'v2-misunderstood',text:'第一印象と、本当の自分で違うと思うところは？'},
 {id:'v2-proud',text:'これまでで、自分なりに頑張ったと思うことは？'},
 {id:'v2-childhood',text:'子どものころは、どんなことに夢中だった？'},
 {id:'v2-comfort',text:'落ち込んだとき、どんな言葉や行動に救われる？'},
 {id:'v2-little-joy',text:'何気ない毎日の中で、幸せだなと感じる瞬間は？'},
 {id:'v2-boundaries',text:'仲が良くても、大事にしたい自分の時間や習慣は？'},
 {id:'v2-future',text:'これからの暮らしで、大切にしていきたいことは？'},
 {id:'v2-courage',text:'いつかやってみたいけれど、まだ踏み出せていないことは？'},
 {id:'v2-understand',text:'自分のことを、もう少しわかってもらえたらうれしいことは？'},
 {id:'v2-weekend',text:'理想の休日を、朝から夜まで自由に過ごすなら？'},
 {id:'v2-care',text:'さりげなくされると、うれしい気遣いは？'},
 {id:'v2-difference',text:'意見が違ったとき、どんなふうに話し合いたい？'},
 {id:'v2-memory',text:'今の自分に影響を与えた、忘れられない出来事は？'},
 {id:'v2-curiosity',text:'相手について、これから知ってみたい一面は？'},
];
export type QuestionAnswer={name:CheckinName;answer:string;createdAt:string};
export function answerKey(id:string,name:CheckinName){return 'question-answer:'+id+':'+checkinNames.indexOf(name)}
export function getQuestionItems(records:Record<string,any>):QuestionItem[]{
 const custom=Object.entries(records).filter(([key,v])=>key==='question-item:'+v?.id&&/^custom-[a-f0-9-]{36}$/.test(v?.id)&&typeof v?.text==='string').map(([,v])=>v).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).map(v=>({id:v.id,text:v.text}));
 // Keep the exact original prompt for any older question that has an answer.
 const previous=legacyQuestions.filter(q=>checkinNames.some(name=>records[answerKey(q.id,name)]));
 return [...custom,...questions,...previous];
}
export function questionViews(records:Record<string,any>,viewer:CheckinName){
 return getQuestionItems(records).map(q=>{
  const answers=checkinNames.map(name=>records[answerKey(q.id,name)] as QuestionAnswer|undefined);
  const unlocked=answers.every(a=>typeof a?.answer==='string'&&a.answer.trim().length>0);
  return {...q,unlocked,answeredCount:answers.filter(Boolean).length,ownAnswer:answers.find(a=>a?.name===viewer)?.answer??null,
   answers:unlocked?answers.map(a=>({name:a!.name,answer:a!.answer})):[]};
 });
}
export type QuestionView=ReturnType<typeof questionViews>[number];
