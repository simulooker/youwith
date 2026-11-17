// 모집 데이터는 계정별 브라우저 저장소를 사용합니다. 부원 간 공유 시 서버 API로 이전해야 합니다.
const LOCAL_MEMBER_ID = globalThis.currentMember?.id || "local-member";
const RECRUITMENT_KEY = "youwith.recruitment.v1" + (globalThis.currentMember?.id ? `:${LOCAL_MEMBER_ID}` : "");
const recruitmentText = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const recruitmentId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const applicationLabels = { pending: "검토 중", approved: "승인", declined: "거절" };
projects.forEach((project, index) => Object.assign(project, { id: `sample-project-${index}`, ownerId: `sample-owner-${index}` }));

function loadRecruitment(storage) {
  try {
    const data = JSON.parse(storage.getItem(RECRUITMENT_KEY));
    const own = Array.isArray(data?.projects) ? data.projects.slice(0, 50).filter(p => p && typeof p.id === "string" && p.id.startsWith("local-") && p.ownerId === LOCAL_MEMBER_ID && typeof p.title === "string" && p.title.trim() && typeof p.desc === "string").map(p => ({ id: p.id.slice(0, 100), ownerId: LOCAL_MEMBER_ID, title: recruitmentText(p.title,60), desc: recruitmentText(p.desc,80), detail: recruitmentText(p.detail,1000), type:"팀원 모집", icon:"code", skills:Array.isArray(p.skills) ? p.skills.filter(x => typeof x === "string").slice(0,8).map(x => x.slice(0,40)) : [] })) : [];
    const validIds = new Set([...projects, ...own].map(p => p.id));
    const applications = Array.isArray(data?.applications) ? data.applications.slice(0,200).filter(a => a && typeof a.id === "string" && typeof a.memberId === "string" && validIds.has(a.projectId) && typeof a.name === "string" && a.name.trim() && Object.hasOwn(applicationLabels,a.status)).map(a => ({ id:a.id.slice(0,100), projectId:a.projectId, memberId:a.memberId.slice(0,100), name:recruitmentText(a.name,40), major:recruitmentText(a.major,60), skills:recruitmentText(a.skills,200), message:recruitmentText(a.message,600), status:a.status })) : [];
    return { projects:own, applications };
  } catch { return { projects:[], applications:[] }; }
}
const recruitmentState = loadRecruitment({getItem:key => localStorage.getItem(key)});
projects.unshift(...recruitmentState.projects);
function saveRecruitment() {
  try {
    localStorage.setItem(RECRUITMENT_KEY,JSON.stringify({projects:projects.filter(p => p.ownerId === LOCAL_MEMBER_ID),applications:recruitmentState.applications}));
    return true;
  } catch { return false; }
}
const ownedProjects = () => projects.filter(p => p.ownerId === LOCAL_MEMBER_ID);
const myApplication = project => recruitmentState.applications.find(a => a.projectId === project.id && a.memberId === LOCAL_MEMBER_ID);
function syncAppliedProjects() {
  applied = new Set(projects.flatMap((p,i) => myApplication(p) ? [i] : []));
}
function createRecruitment(fields) {
  const title = recruitmentText(fields.title,60), desc = recruitmentText(fields.roles,80);
  if (!title || !desc) throw Error("프로젝트 이름과 찾는 역할을 입력해주세요.");
  if (ownedProjects().length >= 50) throw Error("이 브라우저에는 모집글을 최대 50개 저장할 수 있어요.");
  const p = {id:`local-${recruitmentId()}`,ownerId:LOCAL_MEMBER_ID,title,desc,detail:recruitmentText(fields.detail,1000),skills:recruitmentText(fields.skills,200).split(",").map(x=>x.trim()).filter(Boolean).slice(0,8),icon:"code",type:"팀원 모집"};
  projects.unshift(p);
  return { project:p, saved:saveRecruitment() };
}
function updateRecruitment(projectId, fields) {
  const project=projects.find(p=>p.id===projectId);
  if (!project || project.ownerId!==LOCAL_MEMBER_ID) throw Error("내가 작성한 모집글만 수정할 수 있어요.");
  const title=recruitmentText(fields.title,60), desc=recruitmentText(fields.roles,80);
  if (!title || !desc) throw Error("프로젝트 이름과 찾는 역할을 입력해주세요.");
  Object.assign(project,{title,desc,detail:recruitmentText(fields.detail,1000),skills:recruitmentText(fields.skills,200).split(",").map(x=>x.trim()).filter(Boolean).slice(0,8)});
  return {project,saved:saveRecruitment()};
}
function deleteRecruitment(projectId) {
  const index=projects.findIndex(p=>p.id===projectId);
  if (index<0 || projects[index].ownerId!==LOCAL_MEMBER_ID) throw Error("내가 작성한 모집글만 삭제할 수 있어요.");
  projects.splice(index,1);
  recruitmentState.applications=recruitmentState.applications.filter(a=>a.projectId!==projectId);
  return saveRecruitment();
}
function showProjectForm(projectId) {
  const p=projectId ? projects.find(p=>p.id===projectId) : null;
  if (projectId && (!p || p.ownerId!==LOCAL_MEMBER_ID)) return;
  showDialog(`<h2 class="dialog-title">${p ? "모집글 수정" : "어떤 프로젝트를 함께할까요?"}</h2><form id="project-form" ${p ? `data-project-id="${escapeHTML(p.id)}"` : ""} class="form-grid"><label>프로젝트 이름<input name="title" value="${escapeHTML(p?.title || "")}" required maxlength="60" placeholder="함께 만들고 싶은 프로젝트"></label><label>찾는 역할<input name="roles" value="${escapeHTML(p?.desc || "")}" required maxlength="80" placeholder="예: 프론트엔드 1명"></label><label>프로젝트 소개<textarea name="detail" maxlength="1000" rows="3">${escapeHTML(p?.detail || "")}</textarea></label><label>사용 기술<input name="skills" value="${escapeHTML(p?.skills.join(", ") || "")}" maxlength="200" placeholder="예: Python, Figma"></label><button class="primary">${p ? "수정 내용 저장" : "모집글 등록"}</button><p class="form-error" role="alert"></p></form>`);
}
function confirmProjectDeletion(projectId) {
  const p=projects.find(p=>p.id===projectId);
  if (!p || p.ownerId!==LOCAL_MEMBER_ID) return;
  const count=recruitmentState.applications.filter(a=>a.projectId===projectId).length;
  showDialog(`<h2 class="dialog-title">모집글을 삭제할까요?</h2><p>${escapeHTML(p.title)}</p><p>이 모집글과 연결된 지원 정보 ${count}건도 함께 삭제됩니다.</p><div class="project-management"><button class="danger-button" data-confirm-project-delete="${escapeHTML(p.id)}">삭제하기</button><button class="secondary" data-return-project="${escapeHTML(p.id)}">취소</button></div>`);
}

function submitRecruitmentApplication(projectId, fields) {
  const p = projects.find(p => p.id === projectId);
  if (!p || p.ownerId === LOCAL_MEMBER_ID) throw Error("다른 부원의 프로젝트에만 지원할 수 있어요.");
  if (myApplication(p)) throw Error("이미 지원한 프로젝트예요.");
  const name = recruitmentText(fields.name,40), major = recruitmentText(fields.major,60), skills = recruitmentText(fields.skills,200), message = recruitmentText(fields.message,600);
  if (!name || !major || !skills || !message) throw Error("지원 정보를 모두 입력해주세요.");
  if (recruitmentState.applications.length >= 200) throw Error("이 브라우저의 지원 정보 저장 한도에 도달했어요.");
  recruitmentState.applications.push({id:recruitmentId(),projectId,memberId:LOCAL_MEMBER_ID,name,major,skills,message,status:"pending"});
  return saveRecruitment();
}
function setRecruitmentStatus(applicationId,status) {
  const a = recruitmentState.applications.find(a => a.id === applicationId);
  const p = projects.find(p => p.id === a?.projectId);
  if (!p || p.ownerId !== LOCAL_MEMBER_ID || !["approved","declined"].includes(status)) throw Error("내 모집글의 지원자만 처리할 수 있어요.");
  a.status=status;
  return saveRecruitment();
}
function showRecruitmentProject(idx) {
  const p=projects[idx];
  if (!p) return;
  const own=p.ownerId===LOCAL_MEMBER_ID, a=myApplication(p), count=recruitmentState.applications.filter(a=>a.projectId===p.id).length;
  showDialog(`<span class="tag">${own ? "내 모집글" : "팀원 모집"}</span><h2 class="dialog-title">${escapeHTML(p.title)}</h2><p class="project-description">${escapeHTML(p.detail || p.desc)}</p><p>${p.skills.map(s=>`<span class="pill">${escapeHTML(s)}</span>`).join("")}</p>${own ? `<div class="project-management"><button class="primary" data-applicants="${idx}">지원자 보기 · ${count}명</button><button class="secondary" data-edit-project="${escapeHTML(p.id)}">수정</button><button class="text-button danger-text" data-delete-project="${escapeHTML(p.id)}">삭제</button></div>` : a ? `<p class="application-status">지원 상태 · ${applicationLabels[a.status]}</p>` : `<button class="primary" data-apply="${idx}">이 프로젝트에 지원하기</button>`}<p class="small-muted local-data-note">모집글과 지원 정보는 이 브라우저에 저장돼요. 다른 부원과의 공유는 아직 지원하지 않아요.</p>`);
}
function showProjectApplicants(idx) {
  const p=projects[idx];
  if (!p || p.ownerId!==LOCAL_MEMBER_ID) return;
  const entries=recruitmentState.applications.filter(a=>a.projectId===p.id);
  showDialog(`<h2 class="dialog-title">지원자 정보</h2><p>${escapeHTML(p.title)}</p>${entries.length ? entries.map(a=>`<article class="applicant-entry"><div class="section-heading"><h3>${escapeHTML(a.name)}</h3><span class="tag">${applicationLabels[a.status]}</span></div><dl class="applicant-details"><dt>전공·학년</dt><dd>${escapeHTML(a.major)}</dd><dt>할 수 있는 기술</dt><dd>${escapeHTML(a.skills)}</dd><dt>지원 소개</dt><dd>${escapeHTML(a.message)}</dd></dl>${a.status==="pending" ? `<div class="applicant-actions"><button class="primary" data-application-action="approved" data-application-id="${escapeHTML(a.id)}" data-owner-project="${idx}">승인</button><button class="secondary" data-application-action="declined" data-application-id="${escapeHTML(a.id)}" data-owner-project="${idx}">거절</button></div>` : ""}</article>`).join("") : '<p class="empty-applicants">아직 지원자가 없어요.</p>'}<p class="small-muted local-data-note">이 브라우저에 저장된 정보입니다. 실제 부원 간 지원과 작성자 권한 확인은 서버 연결이 필요해요.</p>`);
}
function showRecruitmentNotifications() {
  const incoming=recruitmentState.applications.filter(a=>projects.some(p=>p.id===a.projectId && p.ownerId===LOCAL_MEMBER_ID));
  const mine=recruitmentState.applications.filter(a=>a.memberId===LOCAL_MEMBER_ID);
  showDialog(`<h2>알림</h2>${incoming.length ? incoming.map(a=>{ const idx=projects.findIndex(p=>p.id===a.projectId);return `<button class="notification-row" data-applicants="${idx}"><strong>${escapeHTML(a.name)} 님의 지원</strong><span>${escapeHTML(projects[idx].title)} · ${applicationLabels[a.status]}</span></button>`;}).join("") : ""}${mine.map(a=>{const p=projects.find(p=>p.id===a.projectId);return `<div class="notification-row"><strong>${escapeHTML(p?.title || "프로젝트")}</strong><span>나의 지원 · ${applicationLabels[a.status]}</span></div>`;}).join("")}${!incoming.length&&!mine.length ? '<p>아직 도착한 알림이 없어요.</p>' : ''}<p class="small-muted">현재 브라우저의 신청 기록입니다. 실제 푸시는 아직 연결되지 않았어요.</p>`);
}
function bindRecruitment(root) {
  root.querySelectorAll("[data-applicants]").forEach(el=>el.onclick=()=>showProjectApplicants(Number(el.dataset.applicants)));
  root.querySelectorAll("[data-apply]").forEach(el=>el.onclick=()=>{
    const idx=Number(el.dataset.apply);
    if (!projects[idx] || projects[idx].ownerId===LOCAL_MEMBER_ID) return;
    showDialog(`<h2 class="dialog-title">프로젝트 지원</h2><p>${escapeHTML(projects[idx].title)}</p><form id="application-form" data-project-id="${escapeHTML(projects[idx].id)}" class="form-grid"><label>이름<input name="name" required maxlength="40" autocomplete="name"></label><label>전공·학년<input name="major" required maxlength="60" placeholder="예: 전자공학전공 3학년"></label><label>할 수 있는 기술<input name="skills" required maxlength="200" placeholder="예: Python, 회로 설계"></label><label>지원 소개<textarea name="message" required maxlength="600" rows="3"></textarea></label><p class="small-muted">지원 정보는 이 계정의 브라우저에만 저장돼요.</p><button class="primary">지원 정보 저장</button><p class="form-error" role="alert"></p></form>`);
  });
  root.querySelector("#create-project")?.addEventListener("click",()=>showProjectForm());
  root.querySelectorAll("[data-edit-project]").forEach(el=>el.onclick=()=>showProjectForm(el.dataset.editProject));
  root.querySelectorAll("[data-delete-project]").forEach(el=>el.onclick=()=>confirmProjectDeletion(el.dataset.deleteProject));
  root.querySelectorAll("[data-return-project]").forEach(el=>el.onclick=()=>showRecruitmentProject(projects.findIndex(p=>p.id===el.dataset.returnProject)));
  root.querySelectorAll("[data-confirm-project-delete]").forEach(el=>el.onclick=()=>{
    try {
      const saved=deleteRecruitment(el.dataset.confirmProjectDelete);
      syncAppliedProjects();dialog.close();render();
      toast(saved ? "모집글을 삭제했어요." : "현재 화면에서는 삭제됐지만 저장할 수 없어 새로고침하면 다시 나타날 수 있어요.");
    } catch(error) {toast(error.message);}
  });
  root.querySelector("#project-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    try {
      const editing=Boolean(e.target.dataset.projectId);
      const fields=Object.fromEntries(new FormData(e.target));
      const {saved}=editing ? updateRecruitment(e.target.dataset.projectId,fields) : createRecruitment(fields);
      syncAppliedProjects();dialog.close();render();
      toast(saved ? (editing ? "모집글을 수정했어요." : "내 프로젝트에 등록했어요.") : "변경했지만 브라우저에 저장할 수 없어요. 새로고침하면 변경이 사라질 수 있어요.");
    } catch (error) {e.target.querySelector(".form-error").textContent=error.message;}
  });
  root.querySelector("#application-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    try {
      const saved=submitRecruitmentApplication(e.target.dataset.projectId,Object.fromEntries(new FormData(e.target)));
      syncAppliedProjects();dialog.close();render();
      toast(saved ? "지원 정보를 저장했어요. 알림에서 확인할 수 있어요." : "지원했지만 이 브라우저에는 저장할 수 없어요.");
    } catch(error) {e.target.querySelector(".form-error").textContent=error.message;}
  });
  root.querySelectorAll("[data-application-action]").forEach(el=>el.onclick=()=>{
    try {
      const saved=setRecruitmentStatus(el.dataset.applicationId,el.dataset.applicationAction);
      showProjectApplicants(Number(el.dataset.ownerProject));
      toast(saved ? "지원 상태를 변경했어요." : "상태를 변경했지만 브라우저에 저장할 수 없어요.");
    } catch(error) {toast(error.message);}
  });
}
