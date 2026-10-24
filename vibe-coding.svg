// Gallery of user projects for the single-process CLOSED TEST edition.
// All reads are scoped to the requester's declared age band. This is NOT identity verification.
import { randomUUID } from 'node:crypto';
import { readData, transact, publicUser, isBlocked } from './store.mjs';
import { validCategory, normalizeProjectLink } from './creator-categories.mjs';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const clean=(s,limit)=>typeof s==='string'?s.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,limit):'';
const getUser=(db,id)=>db.users.find(u=>u.id===id&&!u.disabled);
const allowedAge=user=>user&&['13-17','18+'].includes(user.ageBand);
function visible(db,viewer,project){
 const owner=getUser(db,project.ownerId);
 return !!owner && !!viewer && allowedAge(viewer) && owner.ageBand===viewer.ageBand && !isBlocked(db,viewer.id,owner.id);
}
function serialize(db,project,viewer){
 const owner=getUser(db,project.ownerId);
 return {id:project.id,title:project.title,description:project.description,category:project.category,
  url:project.url,feedbackWanted:!!project.feedbackWanted,createdAt:project.createdAt,updatedAt:project.updatedAt,
  owner:publicUser(owner),mine:viewer.id===project.ownerId,
  commentCount:db.projectComments.filter(c=>c.projectId===project.id && getUser(db,c.authorId)).length};
}
export function listProjects(userId,category='all',query=''){
 const db=readData(),viewer=getUser(db,userId);
 if(!allowedAge(viewer))fail('Нужен зарегистрированный аккаунт',401);
 if(category!=='all'&&!validCategory(category))fail('Неизвестная категория');
 const term=clean(query,80).toLocaleLowerCase('ru');
 return db.projects.filter(p=>visible(db,viewer,p)&&
   (category==='all'||p.category===category)&&
   (!term||[p.title,p.description,p.ownerId===userId?'мои работы':''].some(s=>String(s).toLocaleLowerCase('ru').includes(term))))
  .sort((a,b)=>b.createdAt-a.createdAt).slice(0,150).map(p=>serialize(db,p,viewer));
}
export function createProject(userId,data={}){
 const title=clean(data.title,90), description=clean(data.description,1000), category=data.category;
 if(title.length<3)fail('Название проекта: минимум 3 символа');
 if(description.length<15)fail('Добавь описание: минимум 15 символов');
 if(!validCategory(category))fail('Выбери категорию из списка');
 const url=normalizeProjectLink(data.url||'');
 return transact(db=>{
  const owner=getUser(db,userId);
  if(!allowedAge(owner))fail('Нужен аккаунт',401);
  if(db.projects.filter(p=>p.ownerId===userId).length>=15)fail('Не более 15 проектов на аккаунт',429);
  const now=Date.now(),id=randomUUID();
  db.projects.push({id,ownerId:userId,title,description,category,url,feedbackWanted:data.feedbackWanted===true,createdAt:now,updatedAt:now});
  return {project:serialize(db,db.projects.at(-1),owner)};
 });
}
export function updateProject(userId,projectId,data={}){
 const title=clean(data.title,90),description=clean(data.description,1000);
 if(title.length<3||description.length<15)fail('Укажи название (3+) и описание (15+)');
 if(!validCategory(data.category))fail('Неизвестная категория');
 const url=normalizeProjectLink(data.url||'');
 return transact(db=>{
  const project=db.projects.find(p=>p.id===projectId);
  if(!project)fail('Проект не найден',404);
  if(project.ownerId!==userId)fail('Редактировать можно только свои проекты',403);
  const owner=getUser(db,userId);if(!owner)fail('Нет доступа',401);
  Object.assign(project,{title,description,category:data.category,url,feedbackWanted:data.feedbackWanted===true,updatedAt:Date.now()});
  return {project:serialize(db,project,owner)};
 });
}
export function deleteProject(userId,projectId){
 return transact(db=>{
  const p=db.projects.find(x=>x.id===projectId);
  if(!p)fail('Проект не найден',404);
  if(p.ownerId!==userId)fail('Удалять можно только свои проекты',403);
  db.projects=db.projects.filter(x=>x.id!==projectId);
  db.projectComments=db.projectComments.filter(x=>x.projectId!==projectId);
  return {ok:true};
 });
}
export function listFeedback(userId,projectId){
 const db=readData(),viewer=getUser(db,userId),project=db.projects.find(p=>p.id===projectId);
 if(!project||!visible(db,viewer,project))fail('Проект недоступен',404);
 return {project:serialize(db,project,viewer),comments:db.projectComments.filter(c=>c.projectId===projectId)
  .filter(c=>getUser(db,c.authorId)).slice(-100).map(c=>({id:c.id,text:c.text,kind:c.kind,at:c.at,author:publicUser(getUser(db,c.authorId)),mine:c.authorId===userId}))};
}
export function postFeedback(userId,projectId,body={}){
 const text=clean(body.text,700),kind=body.kind;
 if(text.length<8)fail('Напиши комментарий от 8 символов');
 if(!['tip','question','support'].includes(kind))fail('Выбери тип отзыва');
 return transact(db=>{
  const viewer=getUser(db,userId),project=db.projects.find(p=>p.id===projectId);
  if(!project||!visible(db,viewer,project))fail('Проект недоступен',404);
  if(!project.feedbackWanted)fail('Автор отключил обратную связь',403);
  if(project.ownerId===userId)fail('Нельзя оставлять отзыв самому себе',400);
  if(db.projectComments.filter(c=>c.projectId===projectId).length>=300)fail('Лимит отзывов для этого проекта',429);
  const today=db.projectComments.filter(c=>c.authorId===userId && c.at>Date.now()-86400000);
  if(today.length>=50)fail('Дневной лимит отзывов',429);
  db.projectComments.push({id:randomUUID(),projectId,authorId:userId,text,kind,at:Date.now()});
  return {ok:true};
 });
}
export function deleteFeedback(userId,commentId){
 return transact(db=>{
  const comment=db.projectComments.find(c=>c.id===commentId);
  if(!comment)fail('Отзыв не найден',404);
  const project=db.projects.find(p=>p.id===comment.projectId);
  if(comment.authorId!==userId&&project?.ownerId!==userId)fail('Нет прав для удаления',403);
  db.projectComments=db.projectComments.filter(c=>c.id!==commentId);
  return {ok:true};
 });
}
