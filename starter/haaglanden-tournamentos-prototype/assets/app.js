const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
function toast(msg){let t=$('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)} t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2600)}
function openModal(id){$('#'+id)?.classList.add('open')}function closeModal(id){$('#'+id)?.classList.remove('open')}
function init(){
  $('.mobile-menu')?.addEventListener('click',()=>$('.sidebar')?.classList.toggle('open'));
  $$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('.modal-backdrop')?.classList.remove('open')));
  $$('[data-toast]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast||'Actie opgeslagen')));
  $$('[data-modal]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.modal)));
  $$('[data-status-toggle]').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('active');toast('Filter bijgewerkt')}));
  $$('[data-approve]').forEach(b=>b.addEventListener('click',()=>{const r=b.closest('tr'); const s=r?.querySelector('.status'); if(s){s.className='status';s.innerHTML='<span class="dot"></span>Goedgekeurd'} toast('Speler goedgekeurd')}));
  $$('[data-reject]').forEach(b=>b.addEventListener('click',()=>{const r=b.closest('tr'); const s=r?.querySelector('.status'); if(s){s.className='status bad';s.innerHTML='<span class="dot"></span>Afgewezen'} toast('Speler afgewezen')}));
}
document.addEventListener('DOMContentLoaded',init);
