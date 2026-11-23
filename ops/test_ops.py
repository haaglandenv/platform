"""Synthetic guardrail tests: no host mutation, provider writes or credentials."""
import copy, fcntl, importlib.util, io, json, os, pathlib, signal, subprocess, sys, tarfile, tempfile, time, unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('ops_release',pathlib.Path(__file__).with_name('release.py'));r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
SHA='a'*40
PUBLIC={'HAAGV_APP_ORIGIN':'https://staging.example.invalid','HAAGV_DATA_MODE':'supabase','NEXT_PUBLIC_SUPABASE_URL':'https://syntheticexample.supabase.co','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':'sb_publishable_'+'a'*24}
class API:
 def __init__(self):
  self.compare={'status':'ahead','merge_base_commit':{'sha':SHA}}
  self.runs=[{'id':10,'head_sha':SHA,'event':'push','head_branch':'main','status':'completed','conclusion':'success','run_number':1,'run_attempt':1}]
  self.jobs=[{'id':20,'name':'verify','status':'completed','conclusion':'success','steps':[{'name':'Build and tests','status':'completed','conclusion':'success'}]}]
  self.caller={'repository':{'full_name':r.REPOSITORY},'event':'workflow_dispatch','head_branch':'main','head_sha':SHA,'path':r.WORKFLOWS['build'],'run_attempt':1,'status':'in_progress'}
  self.active=[{'id':30,'name':'candidate','status':'in_progress','runner_name':r.SITE}]
 def request(self,path):
  if '/compare/' in path:return copy.deepcopy(self.compare)
  if '/workflows/ci.yml/runs?' in path:return {'workflow_runs':copy.deepcopy(self.runs)}
  if '/runs/10/attempts/1/jobs?' in path:return {'jobs':copy.deepcopy(self.jobs)}
  if '/runs/99/attempts/1/jobs?' in path:return {'jobs':copy.deepcopy(self.active)}
  if path.endswith('/runs/99'):return copy.deepcopy(self.caller)
  raise AssertionError(path)
class ConfigTests(unittest.TestCase):
 def test_exact_four_public_values(self):self.assertEqual(r.validate_public(PUBLIC),PUBLIC)
 def test_secret_cannot_enter_public_config(self):
  for key,value in [('SUPABASE_SECRET_KEY','synthetic'),('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_secret_synthetic')]:
   data=PUBLIC|{key:value}
   with self.subTest(key=key),self.assertRaises(r.Refusal):r.validate_public(data)
 def test_missing_placeholder_and_local_target_refused(self):
  for data in [{},PUBLIC|{'HAAGV_APP_ORIGIN':''},PUBLIC|{'HAAGV_DATA_MODE':'local'},PUBLIC|{'NEXT_PUBLIC_SUPABASE_URL':'http://127.0.0.1:54321'}]:
   with self.subTest(dataMode=data.get('HAAGV_DATA_MODE')),self.assertRaises(r.Refusal):r.validate_public(data)
 def test_origin_injection_and_credentials_refused(self):
  for origin in ['https://user:pass@example.invalid','https://example.invalid/path','https://example.invalid:443','https://example.invalid/?x=1','https://example.invalid\nINJECT=1']:
   with self.subTest(origin=origin),self.assertRaises(r.Refusal):r.validate_public(PUBLIC|{'HAAGV_APP_ORIGIN':origin})
 def test_full_sha_and_configuration_id_boundaries(self):
  self.assertEqual(r.full_sha(SHA),SHA)
  for sha in ['a'*7,'A'*40,'a'*40+';id','main']:
   with self.assertRaises(r.Refusal):r.full_sha(sha)
  for ident in ['../outside','a'*64,'BAD','x y']:
   with self.assertRaises(r.Refusal):r.config_id(ident)
 def test_built_config_digest_matches_javascript_normalization(self):
  import hashlib
  normalized={'origin':'https://staging.example.invalid','dataMode':'supabase','supabaseUrl':PUBLIC['NEXT_PUBLIC_SUPABASE_URL'],'publishableKey':PUBLIC['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']}
  expected=hashlib.sha256(json.dumps(normalized,separators=(',',':')).encode()).hexdigest()
  self.assertEqual(r.normalized_public_digest(PUBLIC|{'HAAGV_APP_ORIGIN':'https://staging.example.invalid/'}),expected)
class GateTests(unittest.TestCase):
 def test_exact_success_evidence(self):self.assertEqual(r.verify_ci(API(),SHA)['jobId'],20)
 def test_nonancestor_refused(self):
  api=API();api.compare['status']='diverged'
  with self.assertRaises(r.Refusal):r.verify_ci(api,SHA)
 def test_missing_ci_refused(self):
  api=API();api.runs=[]
  with self.assertRaises(r.Refusal):r.verify_ci(api,SHA)
 def test_all_unsuccessful_required_states_refused(self):
  for state in ['queued','in_progress','failure','cancelled','skipped','neutral','timed_out']:
   api=API();api.runs[0]['status']='in_progress' if state=='in_progress' else 'completed';api.runs[0]['conclusion']=state
   with self.subTest(state=state),self.assertRaises(r.Refusal):r.verify_ci(api,SHA)
 def test_latest_bad_attempt_not_hidden_by_older_success(self):
  api=API();api.runs.append(api.runs[0]|{'run_attempt':2,'conclusion':'failure'})
  with self.assertRaises(r.Refusal):r.verify_ci(api,SHA)
 def test_missing_skipped_or_failed_verify_job_refused(self):
  for jobs in [[],[{'name':'another','conclusion':'success','status':'completed'}],[{'name':'verify','conclusion':'skipped','status':'completed'}],[{'name':'verify','conclusion':'failure','status':'completed'}]]:
   api=API();api.jobs=jobs
   with self.subTest(jobs=jobs),self.assertRaises(r.Refusal):r.verify_ci(api,SHA)
 def test_continue_on_error_and_skipped_required_steps_refused(self):
  for conclusion in ['skipped','failure','cancelled']:
   api=API();api.jobs[0]['steps'][0]['conclusion']=conclusion
   with self.subTest(conclusion=conclusion),self.assertRaises(r.Refusal):r.verify_ci(api,SHA)
 def test_exact_active_manual_runner_accepted(self):self.assertEqual(r.verify_caller(API(),'build',99,1)['runner'],r.SITE)
 def test_pr_wrong_repo_branch_workflow_attempt_and_runner_refused(self):
  for key,value in [('event','pull_request'),('head_branch','review'),('path','.github/workflows/ci.yml'),('run_attempt',2),('repository',{'full_name':'other/platform'})]:
   api=API();api.caller[key]=value
   with self.subTest(key=key),self.assertRaises(r.Refusal):r.verify_caller(api,'build',99,1)
  api=API();api.active[0]['runner_name']='existing-production'
  with self.assertRaises(r.Refusal):r.verify_caller(api,'build',99,1)
class FilesystemTests(unittest.TestCase):
 def test_source_archive_traversal_and_links_refused(self):
  with tempfile.TemporaryDirectory() as temp:
   base=pathlib.Path(temp)
   for index,(name,type_) in enumerate([('root/../../escape',tarfile.REGTYPE),('/escape',tarfile.REGTYPE),('root/link',tarfile.SYMTYPE),('root/hardlink',tarfile.LNKTYPE),('root/fifo',tarfile.FIFOTYPE)]):
    archive=base/f'{index}.tar';target=base/f'out{index}';target.mkdir()
    with tarfile.open(archive,'w') as tf:
     root=tarfile.TarInfo('root');root.type=tarfile.DIRTYPE;tf.addfile(root)
     item=tarfile.TarInfo(name);item.type=type_;item.linkname='/etc/passwd';tf.addfile(item)
    with self.subTest(name=name),self.assertRaises(r.Refusal):r.extract_source(archive,target)
   self.assertFalse((base/'escape').exists())
 def test_safe_source_archive_extracts_bytes(self):
  with tempfile.TemporaryDirectory() as temp:
   p=pathlib.Path(temp);target=p/'out';target.mkdir()
   with tarfile.open(p/'source.tar','w') as tf:
    root=tarfile.TarInfo('root');root.type=tarfile.DIRTYPE;tf.addfile(root)
    entry=tarfile.TarInfo('root/package.json');entry.size=2;tf.addfile(entry,io.BytesIO(b'{}'))
   r.extract_source(p/'source.tar',target);self.assertEqual((target/'package.json').read_bytes(),b'{}')
 def test_digest_detects_mutation_and_rejects_escaping_symlink(self):
  with tempfile.TemporaryDirectory() as temp:
   p=pathlib.Path(temp);(p/'data').write_text('before');digest=r.tree_digest(p);(p/'data').write_text('after');self.assertNotEqual(digest,r.tree_digest(p))
   (p/'safe').symlink_to('data');r.tree_digest(p)
   (p/'escape').symlink_to('/etc/passwd')
   with self.assertRaises(r.Refusal):r.tree_digest(p)
 def test_sealed_copy_does_not_alias_mutable_build_file(self):
  with tempfile.TemporaryDirectory() as temp:
   p=pathlib.Path(temp);source=p/'source';source.mkdir();(source/'data').write_text('approved')
   with patch.object(r.os,'chown'),patch.object(r.os,'lchown'):digest=r.seal_copy(source,p/'sealed',os.getgid())
   (source/'data').write_text('changed-after-build');self.assertEqual((p/'sealed/data').read_text(),'approved');self.assertEqual(r.tree_digest(p/'sealed'),digest)
 def test_missing_runtime_secret_stops_before_build(self):
  with tempfile.TemporaryDirectory() as temp,patch.object(r,'CONFIG',pathlib.Path(temp)):
   with self.assertRaisesRegex(r.Refusal,'Owner runtime configuration is missing'):r.runtime_snapshot(PUBLIC,SHA,'config',{'accounts':{'app':{'gid':os.getgid()}}})
 def test_source_read_refuses_symlink_and_hardlink_alias(self):
  with tempfile.TemporaryDirectory() as temp:
   p=pathlib.Path(temp);(p/'outside').write_text('private');source=p/'source';source.mkdir();(source/'link').symlink_to('../outside');os.link(p/'outside',source/'hardlink')
   for name in ['link','hardlink']:
    with self.subTest(name=name),self.assertRaises((r.Refusal,OSError)):r.source_read(source,name,os.getuid())
 def test_fd_sealing_refuses_escaping_top_level_and_preserves_source(self):
  with tempfile.TemporaryDirectory() as temp:
   p=pathlib.Path(temp);source=p/'source';source.mkdir();outside=p/'private';outside.mkdir();(outside/'secret').write_text('synthetic');(source/'server').symlink_to(outside,target_is_directory=True)
   with patch.object(r.os,'chown'),self.assertRaises(r.Refusal):r.seal_build(source,p/'sealed',os.getuid(),os.getgid())
   self.assertFalse((p/'sealed/server').exists());self.assertEqual((outside/'secret').read_text(),'synthetic')
 def test_fd_sealing_copies_without_mutable_build_alias(self):
  with tempfile.TemporaryDirectory() as temp:
   p=pathlib.Path(temp);source=p/'source';source.mkdir();(source/'server').mkdir();(source/'server/index.mjs').write_text('approved')
   with patch.object(r.os,'chown'),patch.object(r.os,'fchown'):digest=r.seal_build(source,p/'sealed',os.getuid(),os.getgid())
   (source/'server/index.mjs').write_text('changed');self.assertEqual((p/'sealed/server/index.mjs').read_text(),'approved');self.assertEqual(r.tree_digest(p/'sealed'),digest)
class RecoveryTests(unittest.TestCase):
 def test_first_activation_failure_removes_only_own_new_current(self):
  with tempfile.TemporaryDirectory() as temp:
   root=pathlib.Path(temp);(root/'releases').mkdir();(root/'candidates').mkdir();ident=SHA+'-99-1';source=root/'candidates'/ident;source.mkdir();other=root/'other-environment';other.write_text('preserve')
   m={'id':ident,'sha':SHA,'runtimeConfig':{'path':str(root/'private.env'),'sha256':'b'*64}}
   calls=[]
   def fail_start(action):
    calls.append(action)
    if action=='restart':raise r.Refusal('synthetic start failure')
   def seal(_source,destination,_gid):destination.mkdir()
   def write(path,data,*args,**kwargs):path.write_bytes(data)
   with patch.object(r,'ROOT',root),patch.object(r,'manifest_at',return_value=m),patch.object(r,'current_release',return_value=None),patch.object(r,'verify_ci'),patch.object(r,'service',side_effect=fail_start),patch.object(r,'seal_copy',side_effect=seal),patch.object(r,'exclusive_write',side_effect=write),patch.object(r.os,'chown'):
    with self.assertRaisesRegex(r.Refusal,'synthetic start failure'):r.activate(API(),SHA,ident,{}, {'accounts':{'app':{'gid':os.getgid()}}})
   self.assertEqual(calls,['restart','stop']);self.assertFalse((root/'current').is_symlink());self.assertEqual(other.read_text(),'preserve')
 def test_rollback_without_previous_cannot_restart_any_service(self):
  with patch.object(r,'current_release',return_value=None),patch.object(r,'service') as service:
   with self.assertRaises(r.Refusal):r.rollback(API(),SHA,{}, {})
   service.assert_not_called()
 def test_cleanup_kills_forked_descendant_while_lock_stays_held(self):
  with tempfile.TemporaryDirectory() as temp:
   root=pathlib.Path(temp);lock=root/'lock';lock.touch();fd=os.open(lock,os.O_RDWR);fcntl.flock(fd,fcntl.LOCK_EX)
   result=root/'attempt';ready=root/'ready'
   child_code="import fcntl,os,signal,time; f=open("+repr(str(lock))+",'r+');\ndef term(*_):\n try: fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB); result='acquired'\n except BlockingIOError: result='held'\n open("+repr(str(result))+",'w').write(result)\nsignal.signal(signal.SIGTERM,term);open("+repr(str(ready))+",'w').write('ready');time.sleep(30)"
   program="import subprocess,signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);subprocess.Popen(["+repr(sys.executable)+",'-c',"+repr(child_code)+"]);time.sleep(30)"
   child=subprocess.Popen([sys.executable,'-c',program],start_new_session=True)
   try:
    deadline=time.monotonic()+5
    while not ready.exists() and time.monotonic()<deadline:time.sleep(.02)
    self.assertTrue(ready.exists());r.stop_group(child);self.assertEqual(result.read_text(),'held');self.assertEqual(r.group_members(child.pid),[])
   finally:
    try:os.killpg(child.pid,signal.SIGKILL)
    except ProcessLookupError:pass
    child.wait();os.close(fd)
class WorkflowTests(unittest.TestCase):
 def test_manual_only_target_pins_and_release_concurrency(self):
  root=pathlib.Path(__file__).parents[1]/'.github/workflows'
  for operation in ['candidate','activate','rollback']:
   text=(root/f'haagv-vps08-staging-{operation}.yml').read_text();self.assertIn('workflow_dispatch:',text);self.assertNotIn('\n  push:',text);self.assertNotIn('\n  pull_request:',text);self.assertIn("github.ref == 'refs/heads/main'",text);self.assertIn('haagv-platform-staging',text);self.assertIn('actions: read',text)
  for operation in ['activate','rollback']:self.assertIn('group: haagv-platform-staging-release',(root/f'haagv-vps08-staging-{operation}.yml').read_text())
 def test_installation_prepares_no_active_proxy_or_service(self):
  text=pathlib.Path(__file__).with_name('install-host.py').read_text()
  self.assertNotIn("'enable'",text);self.assertNotIn("'start'",text);self.assertNotIn('/etc/caddy/sites/',text);self.assertIn('.caddy.disabled',text)
if __name__=='__main__':unittest.main(verbosity=2)
