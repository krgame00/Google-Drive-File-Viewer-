import pathlib

p = pathlib.Path('C:/Users/PC/ZCodeProject/index.html')
s = p.read_text(encoding='utf-8')
orig_len = len(s)

def rep(old, new, count=1):
    global s
    assert s.count(old) >= 1, 'NOT FOUND: ' + old[:90]
    s = s.replace(old, new, count)

# 1. filter label -> น้ำพุ่ง + sync controls
rep('> \U0001f4a6 \u0e40\u0e09\u0e1e\u0e32\u0e30 Solo / Special Flow</label>',
    '> \U0001f4a6 \u0e40\u0e09\u0e1e\u0e32\u0e30\u0e19\u0e49\u0e33\u0e1e\u0e38\u0e48\u0e07</label>'
    '<button type="button" class="btn-ghost btn-sm" id="collTagSync" title="\u0e0b\u0e34\u0e07\u0e01\u0e4c\u0e41\u0e17\u0e47\u0e01\u0e19\u0e49\u0e33\u0e1e\u0e38\u0e48\u0e07\u0e01\u0e31\u0e1a Drive">\u2601\ufe0f \u0e0b\u0e34\u0e07\u0e01\u0e4c</button>'
    '<span id="collTagSyncStatus" style="font-size:.75rem;color:var(--muted)"></span>')

# 2. tag module after showSoloSquirt init
anchor = 'let showSoloSquirt = localStorage.getItem("gdv_coll_solo_squirt")==="1";'
module = anchor + '''
        // ===== Tag: น้ำพุ่ง (squirting) — local + Drive appData sync, last-write-wins =====
        var TAG_LS = "gdv_tags_v1", TAG_FILE_LS = "gdv_tags_fileid", TAG_NAME = "gdv-tags.json";
        function tagLoad(){ try { return JSON.parse(localStorage.getItem(TAG_LS)||"{}")||{}; } catch(_){ return {}; } }
        function tagSave(){ try { localStorage.setItem(TAG_LS, JSON.stringify(tagOverrides)); } catch(_){} }
        var tagOverrides = tagLoad();
        function effSq(c){ var o=tagOverrides[c.id]; if(o) return !!o.s; return !!c.solo_squirt; }
        var tagPushTimer=null, tagFileId=localStorage.getItem(TAG_FILE_LS)||null, tagLastToken=null, tagBusy=false;
        function tagStatus(t){ var el=document.getElementById("collTagSyncStatus"); if(el) el.textContent=t; }
        function tagMerge(remote){
          var changed=false;
          Object.keys(remote||{}).forEach(function(id){
            var r=remote[id], l=tagOverrides[id];
            if(!l || (r.t||0)>(l.t||0)){ tagOverrides[id]=r; changed=true; }
          });
          if(changed){ tagSave(); render(); }
          return changed;
        }
        async function tagApiList(token){
          var r=await fetch("https://www.googleapis.com/drive/v3/files?q="+encodeURIComponent("'appDataFolder' in parents and name='"+TAG_NAME+"' and trashed=false")+"&spaces=appDataFolder&fields=files(id,modifiedTime)",{headers:{Authorization:"Bearer "+token}});
          if(!r.ok) throw new Error("list "+r.status);
          return r.json();
        }
        async function tagPull(){
          if(tagBusy) return;
          try{
            if(typeof accessToken==="undefined"||!accessToken) return;
            tagBusy=true; tagStatus("กำลังซิงก์…");
            var token=accessToken, j=await tagApiList(token);
            if(j.files&&j.files.length){
              tagFileId=j.files[0].id; localStorage.setItem(TAG_FILE_LS,tagFileId);
              var d=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(tagFileId)+"?alt=media",{headers:{Authorization:"Bearer "+token}});
              if(d.ok){ var body=await d.json(); var ch=tagMerge(body.tags); tagStatus("ซิงก์แล้ว"+(ch?" (มีอัปเดต)":"")); tagPushMerged(token); }
              else tagStatus("ดึงไม่สำเร็จ");
            } else tagStatus("ยังไม่มีแท็กบน Drive");
          }catch(_){ tagStatus("ซิงก์ไม่สำเร็จ"); } finally { tagBusy=false; }
        }
        async function tagPushMerged(token){
          try{
            var payload=JSON.stringify({version:1,tags:tagOverrides});
            if(!tagFileId){
              var c=await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({name:TAG_NAME,parents:["appDataFolder"],mimeType:"application/json"})});
              if(!c.ok) return; tagFileId=(await c.json()).id; localStorage.setItem(TAG_FILE_LS,tagFileId);
            }
            await fetch("https://www.googleapis.com/upload/drive/v3/files/"+encodeURIComponent(tagFileId)+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:payload});
          }catch(_){}
        }
        function tagSchedulePush(){
          if(typeof accessToken==="undefined"||!accessToken){ tagStatus("เก็บในเครื่อง (ยังไม่ sign-in)"); return; }
          clearTimeout(tagPushTimer);
          tagPushTimer=setTimeout(function(){ tagStatus("กำลังบันทึก…"); tagPushMerged(accessToken); tagStatus("บันทึกแล้ว ✓"); },1500);
        }
        function toggleTag(id){
          var item=XBEP_COLLECTION.find(function(x){return x.id===id});
          if(!item) return;
          var nv=!effSq(item);
          tagOverrides[id]={s:nv?1:0,t:Date.now()};
          tagSave(); render(); tagSchedulePush();
          showToast(nv?"ติดแท็ก 💦 น้ำพุ่งแล้ว":"ถอดแท็ก 💦 แล้ว");
        }
        function attachTagButtons(){
          grid.querySelectorAll("[data-tag]").forEach(function(btn){
            btn.addEventListener("click",function(ev){ ev.stopPropagation(); toggleTag(btn.getAttribute("data-tag")); });
          });
          var syncBtn=document.getElementById("collTagSync");
          if(syncBtn&&!syncBtn.dataset.wired){
            syncBtn.dataset.wired="1";
            syncBtn.addEventListener("click",function(){
              ensureToken().then(function(t){ if(t){ tagPull(); } else showToast("ลงชื่อเข้าใช้ไม่สำเร็จ"); });
            });
          }
        }
        setInterval(function(){
          try{
            if(typeof accessToken!=="undefined"&&accessToken){
              if(accessToken!==tagLastToken){ tagLastToken=accessToken; tagPull(); }
            } else tagLastToken=null;
          }catch(_){}
        },3000);'''
rep(anchor, module)

# 3. filter uses effSq
rep('if((typeof showSoloSquirt !== "undefined" && showSoloSquirt) && !c.solo_squirt) return false;',
    'if((typeof showSoloSquirt !== "undefined" && showSoloSquirt) && !effSq(c)) return false;')

# 4. badge -> น้ำพุ่ง via effSq
rep('var soloBadge = c.solo_squirt ?',
    'var soloBadge = effSq(c) ?')
rep('\U0001f4a6 Solo Special</span>',
    '\U0001f4a6 \u0e19\u0e49\u0e33\u0e1e\u0e38\u0e48\u0e07</span>')

# 5. tag button var after mfBtn
rep('var mfBtn = hasMF ?',
    'var tagOn = effSq(c);\n            var tagBtn = \'<button type="button" class="btn-ghost btn-sm" data-tag="\'+c.id+\'" title="\u0e15\u0e34\u0e14/\u0e16\u0e2d\u0e14\u0e41\u0e17\u0e47\u0e01\u0e19\u0e49\u0e33\u0e1e\u0e38\u0e48\u0e07" style="\'+(tagOn?"border-color:#38bdf8;color:#38bdf8;":"opacity:.55;")+\'">\U0001f4a6</button>\';\n            var mfBtn = hasMF ?')
rep('>เปิด</button>\'+\n                driveBtn+',
    '>เปิด</button>\'+\n                tagBtn+\n                driveBtn+')

# 6. wire buttons after render loop
rep('observeFolderCovers(grid);',
    'attachTagButtons();\n          observeFolderCovers(grid);')

p.write_text(s, encoding='utf-8')
print('patched OK', orig_len, '->', len(s))
for k in ['effSq', 'attachTagButtons', 'data-tag', 'collTagSync', 'drive.appdata', 'toggleTag']:
    print(k, s.count(k))
