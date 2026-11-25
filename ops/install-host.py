#!/usr/bin/env python3
"""Prepare one fixed Haagv environment. Default is a read-only preflight."""
import argparse, base64, contextlib, fcntl, grp, hashlib, importlib.util, json, os, pathlib, pwd, shutil, socket, stat, subprocess, sys, tarfile, tempfile, urllib.request

HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('haagv_release',HERE/'release.py');release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
UNIT_ROOT=pathlib.Path('/etc/systemd/system')

def select_target(environment):
 global SITE,PATHS,SUDO,RUNNER
 release.select_target(environment);SITE=release.SITE
 PATHS=[release.CONFIG,release.ROOT,release.BUILD,release.INSTALL,release.TOOLCHAIN.parent,pathlib.Path('/opt/actions-runner')/SITE]
 SUDO=pathlib.Path('/etc/sudoers.d')/SITE;RUNNER=pathlib.Path('/opt/actions-runner')/SITE

select_target('staging')


def run(argv):
 p=subprocess.run(argv,check=False,capture_output=True,text=True,timeout=60)
 release.require(p.returncode==0,'Preparation command failed: '+pathlib.Path(argv[0]).name)
 return p.stdout.strip()


def absent(path):return not pathlib.Path(path).exists() and not pathlib.Path(path).is_symlink()


def source_check(refresh=False):
 release.require(os.getuid()==0,'Use the verified host administration account with sudo.')
 release.require(socket.gethostname()=='dg-vps-08' and pathlib.Path('/etc/machine-id').read_text().strip()==release.MACHINE_ID,'Wrong target host.')
 for file in ['install-host.py','release.py','pins.json']:
  p=release.trusted_path(HERE/file);release.require(p.is_file(),'Reviewed source file missing.')
 pins=json.loads((HERE/'pins.json').read_text())
 release.require(pins['node']['version']==release.NODE_VERSION and pins['node']['npmVersion']==release.NPM_VERSION and pins['runner']['version']=='2.338.2','Unexpected toolchain pins.')
 if refresh:refresh_check()
 else:
  for role,user in release.USERS.items():
   try:pwd.getpwnam(user)
   except KeyError:pass
   else:raise release.Refusal('Target account exists; inspect own partial/existing setup before continuing: '+user)
   try:grp.getgrnam(user)
   except KeyError:pass
   else:raise release.Refusal('Target group exists; no existing identity will be reused.')
  for path in [*PATHS,SUDO,UNIT_ROOT/(SITE+'.service'),UNIT_ROOT/(SITE+'-runner.service')]:release.require(absent(path),'Target path already exists: '+str(path))
 for p in pathlib.Path('/etc/dg-webservices').glob('*/host.json'):
  data=json.loads(p.read_text(encoding='utf-8-sig'));release.require(data.get('port')!=release.PORT or refresh and p==release.CONFIG/'host.json','Target port is reserved by another host profile.')
 with socket.socket() as probe:
  probe.bind(('127.0.0.1',release.PORT))
 lock=pathlib.Path('/run/lock/dg-build.lock');s=lock.lstat()
 release.require(stat.S_ISREG(s.st_mode) and s.st_uid==0 and s.st_gid==grp.getgrnam('dg-build').gr_gid and stat.S_IMODE(s.st_mode)==0o660 and s.st_nlink==1,'Existing shared build lock does not match the contract.')
 rule=pathlib.Path('/etc/tmpfiles.d/castiq-staging-build-lock.conf').read_text().strip()
 release.require(rule in ['f /run/lock/dg-build.lock 0660 root dg-build -','f /run/lock/dg-build.lock 0660 root dg-build - -'],'Existing shared-lock persistence does not match; leave it unchanged.')
 release.require(shutil.disk_usage('/srv').free>=8*1024**3 and os.statvfs('/srv').f_favail>=100000,'Insufficient preparation capacity.')
 for cmd in ['/usr/sbin/useradd','/usr/sbin/visudo','/usr/bin/systemctl','/usr/bin/systemd-analyze','/usr/bin/python3']:
  release.require(pathlib.Path(cmd).is_file(),'Required existing host utility missing; shared packages will not be modified.')
 return pins


def download(pin,path):
 release.require(pin['url'].startswith(('https://nodejs.org/dist/','https://github.com/actions/runner/releases/download/')),'Unapproved package origin.')
 with urllib.request.urlopen(pin['url'],timeout=120) as response,open(path,'xb') as out:shutil.copyfileobj(response,out)
 release.require(hashlib.sha256(path.read_bytes()).hexdigest()==pin['sha256'],'Official package checksum mismatch.')


def unpack(archive,directory):
 with tarfile.open(archive) as source:source.extractall(directory,filter='data')


def directory(path,uid=0,gid=0,mode=0o755):
 path.mkdir(mode=mode);os.chown(path,uid,gid);path.chmod(mode)


def write(path,text,gid=0,mode=0o644):release.exclusive_write(path,text.encode(),gid,mode)


def unit_text():
 return f'''[Unit]
Description=Haaglanden Voetbal {release.ENVIRONMENT}
After=network-online.target
Wants=network-online.target
ConditionPathExists={release.ROOT}/current/runtime.env
ConditionPathExists={release.ROOT}/current/app/server/index.mjs

[Service]
Type=simple
User={release.USERS['app']}
Group={release.USERS['app']}
WorkingDirectory={release.ROOT}/current/app
EnvironmentFile={release.ROOT}/current/runtime.env
ExecStart={release.NODE} server/index.mjs
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
KillMode=control-group
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths={release.ROOT}/shared
RestrictSUIDSGID=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
UMask=0077

[Install]
WantedBy=multi-user.target
'''


def runner_unit():
 return f'''[Unit]
Description=Haaglanden Voetbal {release.ENVIRONMENT} repository runner
After=network-online.target
Wants=network-online.target
ConditionPathExists={RUNNER}/.runner
ConditionPathExists={release.CONFIG}/runner-access-approved.json

[Service]
User={release.USERS['runner']}
Group={release.USERS['runner']}
WorkingDirectory={RUNNER}
ExecStart={RUNNER}/bin/runsvc.sh
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=90
Restart=on-failure
RestartSec=5
Environment=PATH=/usr/bin:/bin
UMask=0077

[Install]
WantedBy=multi-user.target
'''


def sudo_text(digest):
 base=f"{release.USERS['runner']} ALL=(root) NOSETENV: NOPASSWD: sha256:{digest} {release.INSTALL}/release.py "
 patterns=[r'^build --sha [a-f0-9]{40} --config-id [a-z0-9][a-z0-9-]* --run-id [1-9][0-9]* --run-attempt [1-9][0-9]*$',r'^activate --sha [a-f0-9]{40} --candidate [a-f0-9]{40}-[1-9][0-9]*-[1-9][0-9]* --run-id [1-9][0-9]* --run-attempt [1-9][0-9]*$',r'^rollback --sha [a-f0-9]{40} --run-id [1-9][0-9]* --run-attempt [1-9][0-9]*$']
 return '\n'.join(base+pattern for pattern in patterns)+'\n'


def prepare(pins):
 with tempfile.TemporaryDirectory(prefix=SITE+'-packages-',dir='/root') as temp:
  temp=pathlib.Path(temp)
  download(pins['node'],temp/'node.tar.xz');download(pins['runner'],temp/'runner.tar.gz')
  unpack(temp/'node.tar.xz',temp/'node');unpack(temp/'runner.tar.gz',temp/'runner')
  node=temp/'node'/f'node-v{release.NODE_VERSION}-linux-x64'
  release.require(run([str(node/'bin/node'),'--version'])=='v'+release.NODE_VERSION,'Node package version mismatch.')
  release.require(run([str(node/'bin/node'),str(node/'lib/node_modules/npm/bin/npm-cli.js'),'--version'])==release.NPM_VERSION,'npm package version mismatch.')
  # Network downloads finish before taking the existing global build lock.
  with release.lock('/run/lock/dg-build.lock',shared=True):
   source_check()
   for role,user in release.USERS.items():
    home={'runner':str(RUNNER),'build':str(release.BUILD/'home'),'app':str(release.ROOT/'shared')}[role]
    run(['/usr/sbin/useradd','--system','--user-group','--no-create-home','--home-dir',home,'--shell','/usr/sbin/nologin',user])
   accounts={role:{'name':user,'uid':pwd.getpwnam(user).pw_uid,'gid':pwd.getpwnam(user).pw_gid} for role,user in release.USERS.items()}
   app=accounts['app'];build=accounts['build'];runner=accounts['runner']
   directory(release.CONFIG)
   for child,gid,mode in [('build-configs',build['gid'],0o750),('runtime-configs',app['gid'],0o750),('runtime-secrets',0,0o700),('secrets',app['gid'],0o750),('prepared',0,0o755)]:directory(release.CONFIG/child,gid=gid,mode=mode)
   directory(release.ROOT,gid=app['gid'],mode=0o750)
   for child in ['candidates','releases']:directory(release.ROOT/child,gid=app['gid'],mode=0o750)
   directory(release.ROOT/'shared',app['uid'],app['gid'],0o700)
   directory(release.BUILD,mode=0o755)
   directory(release.BUILD/'work',gid=build['gid'],mode=0o750)
   for child in ['home','cache']:directory(release.BUILD/child,build['uid'],build['gid'],0o700)
   directory(release.INSTALL)
   for name in ['release.py','pins.json']:
    release.exclusive_write(release.INSTALL/name,(HERE/name).read_bytes(),mode=0o755 if name.endswith('.py') else 0o644)
   directory(release.TOOLCHAIN.parent)
   shutil.move(str(node),release.TOOLCHAIN)
   # The runner package belongs to its isolated unprivileged account; its unit
   # and all privileged release code remain root-owned outside this tree.
   shutil.move(str(temp/'runner'),RUNNER)
   for p in [RUNNER,*RUNNER.rglob('*')]:
    if p.is_symlink():os.lchown(p,runner['uid'],runner['gid'])
    else:os.chown(p,runner['uid'],runner['gid'])
   profile={'version':2,'siteId':SITE,'repository':release.REPOSITORY,'branch':release.BRANCH,'hostname':'dg-vps-08','machineId':release.MACHINE_ID,'environment':release.ENVIRONMENT,'port':release.PORT,'accounts':accounts,'nodeVersion':release.NODE_VERSION,'npmVersion':release.NPM_VERSION,'runnerName':SITE,'runnerLabels':['self-hosted','Linux','X64','dg-vps-08',SITE],'requiredCiWorkflow':'ci.yml','requiredCiJobs':['verify'],'sharedBuildLock':'/run/lock/dg-build.lock','activationLock':str(release.CONFIG/'activation.lock'),**{k:release.TARGETS[release.ENVIRONMENT][k] for k in ('origin','supabaseUrl')}}
   write(release.CONFIG/'host.json',json.dumps(profile,indent=2)+'\n')
   release.exclusive_write(release.CONFIG/'activation.lock',b'',mode=0o600)
   release.exclusive_write(release.CONFIG/'secrets/mail-encryption-key',base64.b64encode(os.urandom(32))+b'\n',app['gid'],0o640)
   write(UNIT_ROOT/(SITE+'.service'),unit_text())
   write(UNIT_ROOT/(SITE+'-runner.service'),runner_unit())
   write(release.CONFIG/'prepared'/(SITE+'.caddy.disabled'),f'''# Prepared only. Replace placeholder after a separate verified HTTPS release instruction.
__VERIFIED_HAAGV_DOMAIN__ {{
    encode zstd gzip
    header X-Robots-Tag "noindex, nofollow, noarchive"
    header >Referrer-Policy "no-referrer"
    reverse_proxy 127.0.0.1:{release.PORT}
}}
''')
   policy=sudo_text(hashlib.sha256((release.INSTALL/'release.py').read_bytes()).hexdigest())
   temporary=temp/'sudoers';temporary.write_text(policy);temporary.chmod(0o440)
   run(['/usr/sbin/visudo','-cf',str(temporary)])
   write(SUDO,policy,mode=0o440)
   run(['/usr/bin/systemd-analyze','verify',str(UNIT_ROOT/(SITE+'.service')),str(UNIT_ROOT/(SITE+'-runner.service'))])
   run(['/usr/bin/systemctl','daemon-reload'])
   status={}
   for name in [SITE+'.service',SITE+'-runner.service']:
    p=subprocess.run(['/usr/bin/systemctl','show',name,'--property=ActiveState,SubState,UnitFileState,MainPID'],capture_output=True,text=True,timeout=15)
    fields=dict(line.split('=',1) for line in p.stdout.splitlines() if '=' in line)
    release.require(fields.get('ActiveState')=='inactive' and fields.get('SubState')=='dead' and fields.get('UnitFileState')=='disabled' and fields.get('MainPID')=='0','Prepared target unexpectedly active/enabled.')
    status[name]=fields
   release.require(absent(release.ROOT/'current') and absent(RUNNER/'.runner'),'Preparation must not activate or register a runner.')
   proof={'version':1,'status':'prepared-inactive','siteId':SITE,'createdAt':release.now(),'accounts':accounts,'moduleSha256':hashlib.sha256((release.INSTALL/'release.py').read_bytes()).hexdigest(),'toolchainPins':pins,'services':status,'runnerRegistered':False,'candidateExists':False,'currentExists':False,'proxyImported':False,'dnsModified':False,'sharedBuildLockModified':False,'vaultKeyCreated':True}
   write(release.CONFIG/'installation.json',json.dumps(proof,indent=2)+'\n')
   print(json.dumps(proof))


def refresh_check():
 for path in [release.CONFIG,release.ROOT,release.INSTALL,release.TOOLCHAIN]:release.trusted_path(path)
 profile=json.loads(release.protected_file(release.CONFIG/'host.json').read_text())
 release.require(profile.get('siteId')==SITE and profile.get('repository')==release.REPOSITORY and profile.get('port')==release.PORT and profile.get('environment')==release.ENVIRONMENT,'Existing own profile has a different identity.')
 for role,user in release.USERS.items():
  account=pwd.getpwnam(user);release.require(profile['accounts'][role]=={'name':user,'uid':account.pw_uid,'gid':account.pw_gid},'Own account identity changed.')
 for name in [SITE+'.service',SITE+'-runner.service']:
  fields=dict(line.split('=',1) for line in run(['/usr/bin/systemctl','show',name,'--property=ActiveState,SubState,UnitFileState,MainPID']).splitlines() if '=' in line)
  release.require(fields=={'MainPID':'0','ActiveState':'inactive','SubState':'dead','UnitFileState':'disabled'},'Refresh is limited to the still inactive own preparation.')
 release.require(absent(release.ROOT/'current') and absent(release.ROOT/'previous') and absent(RUNNER/'.runner'),'Do not refresh an activated or registered target.')
 release.require(not any((release.ROOT/'candidates').iterdir()) and not any((release.ROOT/'releases').iterdir()),'Existing artifacts need a separate reviewed adapter upgrade.')
 installation=json.loads(release.protected_file(release.CONFIG/'installation.json').read_text())
 adapter=release.trusted_path(release.INSTALL/'release.py');release.require(adapter.is_file() and adapter.stat().st_nlink==1 and hashlib.sha256(adapter.read_bytes()).hexdigest()==installation['moduleSha256'],'Existing adapter does not match its preparation proof.')
 release.require(run([str(release.NODE),'--version'])=='v'+release.NODE_VERSION,'Existing own Node version changed.')
 release.require(run([str(release.NODE),str(release.NPM),'--version'])==release.NPM_VERSION,'Existing own npm version changed.')
 return profile,installation

def replace_file(path,data,mode=0o644):
 release.trusted_path(path);release.require(path.is_file() and path.stat().st_nlink==1,'Only an existing protected regular file can be refreshed.')
 temporary=path.with_name('.'+path.name+'-'+str(os.getpid()))
 release.exclusive_write(temporary,data,mode=mode);os.replace(temporary,path)

def refresh(pins):
 with release.lock('/run/lock/dg-build.lock',shared=True),release.lock(release.CONFIG/'activation.lock'):
  source_check(refresh=True);profile,installation=refresh_check()
  profile.update(version=2,**{k:release.TARGETS[release.ENVIRONMENT][k] for k in ('origin','supabaseUrl')})
  adapter=(HERE/'release.py').read_bytes();policy=sudo_text(hashlib.sha256(adapter).hexdigest())
  with tempfile.TemporaryDirectory(prefix=SITE+'-refresh-',dir='/root') as temporary:
   temporary=pathlib.Path(temporary);(temporary/'sudoers').write_text(policy);(temporary/'sudoers').chmod(0o440)
   (temporary/(SITE+'.service')).write_text(unit_text());(temporary/(SITE+'-runner.service')).write_text(runner_unit())
   run(['/usr/sbin/visudo','-cf',str(temporary/'sudoers')])
   run(['/usr/bin/systemd-analyze','verify',str(temporary/(SITE+'.service')),str(temporary/(SITE+'-runner.service'))])
   changes=[(release.INSTALL/'release.py',adapter,0o755),(SUDO,policy.encode(),0o440),(release.CONFIG/'host.json',(json.dumps(profile,indent=2)+'\n').encode(),0o644),(UNIT_ROOT/(SITE+'.service'),unit_text().encode(),0o644),(UNIT_ROOT/(SITE+'-runner.service'),runner_unit().encode(),0o644)]
   backups=[(path,path.read_bytes(),stat.S_IMODE(path.stat().st_mode)) for path,_,_ in changes]
   history=release.CONFIG/'history';history.mkdir(mode=0o700,exist_ok=True);release.trusted_path(history)
   stamp=str(__import__('time').time_ns())
   for index,(path,data,mode) in enumerate(backups):release.exclusive_write(history/f'{stamp}-{index}-{path.name}',data,mode=0o600)
   try:
    for path,data,mode in changes:replace_file(path,data,mode)
    run(['/usr/bin/systemctl','daemon-reload'])
    installation.update(updatedAt=release.now(),moduleSha256=hashlib.sha256(adapter).hexdigest(),operatorRoute='root-only-ssh-approved-main',toolchainPins=pins)
    replace_file(release.CONFIG/'installation.json',(json.dumps(installation,indent=2)+'\n').encode())
   except BaseException:
    for path,data,mode in backups:replace_file(path,data,mode)
    run(['/usr/bin/systemctl','daemon-reload']);raise
   refresh_check();print(json.dumps(installation))

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--environment',required=True,choices=release.TARGETS);p.add_argument('--apply',action='store_true');p.add_argument('--refresh',action='store_true');a=p.parse_args();select_target(a.environment);pins=source_check(refresh=a.refresh)
 if not a.apply:print(json.dumps({'status':'preflight-passed-no-changes','siteId':SITE,'port':release.PORT,'accounts':release.USERS}));return
 if a.refresh:refresh(pins)
 else:prepare(pins)

if __name__=='__main__':
 try:main()
 except release.Refusal as e:print(str(e),file=sys.stderr);sys.exit(1)
 except Exception:print('Preparation failed. Inspect only the new Haagv target before another attempt; no existing target was intentionally modified.',file=sys.stderr);sys.exit(1)
