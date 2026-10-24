import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync,rmSync } from 'node:fs';
const dir=mkdtempSync(path.join(os.tmpdir(),'screenly-gallery-'));
process.env.SCREENLY_DATA_PATH=path.join(dir,'screenly.json');
process.env.ROOM_SIGNING_SECRET='gallery-secret-for-testing-with-sufficient-length';
const a=await import('../lib/actions.mjs');
const g=await import('../lib/projects.mjs');
const {readData}=await import('../lib/store.mjs');
const user=(n,age='18+')=>a.register({username:n,displayName:n,email:`${n}@example.test`,password:'testing-only-strong-12345',ageBand:age,agree:true}).user;
const author=user('creator555'),viewer=user('reviewer666'),minor=user('learner777','13-17'),blocker=user('blocked888');
const draft={title:'Мой сайт-портфолио',description:'Лендинг, который я сделал самостоятельно, использовав Next.js и иллюстрации.',category:'vibe-coding',url:'https://example.com/work',feedbackWanted:true};
const created=g.createProject(author.id,draft).project;
test('projects are persisted and filterable by category',()=>{
 assert.equal(readData().projects.length,1);
 assert.equal(g.listProjects(viewer.id,'vibe-coding').length,1);
 assert.equal(g.listProjects(viewer.id,'design').length,0);
 assert.equal(g.listProjects(viewer.id,'all','портфолио').length,1);
 assert.equal(g.listProjects(viewer.id,'all','несуществующее').length,0);
});
test('minors cannot browse adult project gallery or feedback',()=>{
 assert.equal(g.listProjects(minor.id).length,0);
 assert.throws(()=>g.listFeedback(minor.id,created.id),/недоступен/);
 assert.throws(()=>g.postFeedback(minor.id,created.id,{kind:'tip',text:'Полезный подробный совет'}),/недоступен/);
});
test('project data is validated: title, description, category, URL',()=>{
 assert.throws(()=>g.createProject(author.id,{...draft,title:'x'}),/название/i);
 assert.throws(()=>g.createProject(author.id,{...draft,description:'Коротко'}),/описание/i);
 assert.throws(()=>g.createProject(author.id,{...draft,category:'root'}),/категорию/i);
 for(const badUrl of ['javascript:alert(1)','http://example.com','https://localhost/test']){
  assert.throws(()=>g.createProject(author.id,{...draft,url:badUrl}),/Ссылка/);
 }
 assert.throws(()=>g.listProjects(author.id,'admin'),/категория/);
});
test('another person cannot edit or delete a project',()=>{
 assert.throws(()=>g.updateProject(viewer.id,created.id,{...draft,title:'Чужое'}),/только свои/);
 assert.throws(()=>g.deleteProject(viewer.id,created.id),/только свои/);
});
test('feedback supports types, persists, and forbids comments by owner',()=>{
 assert.throws(()=>g.postFeedback(author.id,created.id,{kind:'tip',text:'Вношу совет самому себе'}),/самому себе/);
 assert.throws(()=>g.postFeedback(viewer.id,created.id,{kind:'malware',text:'Отзыв с неправильным типом'}),/тип/);
 const result=g.postFeedback(viewer.id,created.id,{kind:'tip',text:'Стоит увеличить контраст кнопок и исправить отступы'});
 assert.equal(result.ok,true);
 const comments=g.listFeedback(author.id,created.id).comments;
 assert.equal(comments.length,1);
 assert.equal(comments[0].author.id,viewer.id);
 assert.throws(()=>g.deleteFeedback(minor.id,comments[0].id),/Нет прав/);
 // Owner of the published project may moderate comments.
 assert.equal(g.deleteFeedback(author.id,comments[0].id).ok,true);
 assert.equal(g.listFeedback(viewer.id,created.id).comments.length,0);
});
test('blocked accounts disappear from each other\'s galleries',()=>{
 assert.equal(g.listProjects(blocker.id).length,1);
 a.blockAccount(author.id,blocker.id);
 assert.equal(g.listProjects(blocker.id).length,0);
 assert.throws(()=>g.listFeedback(blocker.id,created.id),/недоступен/);
});
test('author can update project and disable feedback',()=>{
 const updated=g.updateProject(author.id,created.id,{...draft,description:'Более подробное описание проекта для портфолио.',feedbackWanted:false}).project;
 assert.equal(updated.feedbackWanted,false);
 assert.throws(()=>g.postFeedback(viewer.id,created.id,{kind:'tip',text:'Попробуй переделать верстку'}),/отключил/);
});
test('self-reported age group stays unchanged and unverified',()=>{
 assert.equal(author.adultVerified,false);
 assert.equal(minor.adultVerified,false);
 assert.equal(readData().users.find(u=>u.id===minor.id).ageBand,'13-17');
});
test('deleting account removes owned projects and their comments',()=>{
 const second=g.createProject(viewer.id,{...draft,title:'Второй проект'}).project;
 g.postFeedback(author.id,second.id,{kind:'question',text:'Какие библиотеки ты использовал для этого сайта?'});
 assert.equal(g.listFeedback(author.id,second.id).comments.length,1);
 a.deleteAccount(viewer.id);
 assert.equal(readData().projects.some(p=>p.id===second.id),false);
 assert.equal(readData().projectComments.some(c=>c.projectId===second.id),false);
});
test('project deletion cleans up feedback',()=>{
 const data=g.createProject(author.id,{...draft,title:'Удаляемая работа'}).project;
 // viewer account now deleted, so use a fresh account
 const user3=user('reviewer999');
 g.postFeedback(user3.id,data.id,{kind:'support',text:'Очень классная работа, продолжай создавать!'});
 assert.equal(g.listFeedback(author.id,data.id).comments.length,1);
 g.deleteProject(author.id,data.id);
 assert.equal(readData().projectComments.some(c=>c.projectId===data.id),false);
});
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));
