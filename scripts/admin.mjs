import { transact, withDatabase } from '../lib/store.mjs';
const [action,name]=process.argv.slice(2);
if(!['set-admin','set-moderator','verify-adult','unverify-adult','disable','enable'].includes(action)||!name){
 console.log('Usage: node scripts/admin.mjs <set-admin|set-moderator|verify-adult|unverify-adult|disable|enable> <username>');process.exit(1);
}
try {
 await withDatabase(() => transact(db=>{
  const user=db.users.find(u=>u.username===name.toLowerCase());if(!user)throw Error('User not found');
  if(action==='set-admin')user.role='admin';
  if(action==='set-moderator')user.role='moderator';
  if(action==='verify-adult'){if(user.ageBand!=='18+')throw Error('Account ageBand is not 18+');user.adultVerified=true;}
  if(action==='unverify-adult')user.adultVerified=false;
  if(action==='disable')user.disabled=true;
  if(action==='enable')user.disabled=false;
 }), {write:true});
 console.log('OK:',action,name);
} catch(e){console.error(e.message);process.exitCode=1;}
