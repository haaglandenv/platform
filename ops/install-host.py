#!/usr/bin/env python3
"""Add only Haagv staging resources. Default is a read-only preflight."""
import argparse, base64, contextlib, fcntl, grp, hashlib, importlib.util, json, os, pathlib, pwd, shutil, socket, stat, subprocess, sys, tarfile, tempfile, urllib.request

HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('haagv_release',HERE/'release.py');release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
SITE=release.SITE
PATHS=[release.CONFIG,release.ROOT,release.BUILD,release.INSTALL,release.TOOLCHAIN.parent,pathlib.Path('/opt/actions-runner')/SITE]
UNIT_ROOT=pathlib.Path('/etc/systemd/system')
SUDO=pathlib.Path('/etc/sudoers.d')/SITE
RUNNER=pathlib.Path('/opt/actions-runner')/SITE


def run(argv):
 p=subprocess.run(argv,check=False,capture_output=True,text=True,timeout=60)
 release.require(p.returncode==0,'Preparation command failed: '+pathlib.Path(argv[0]).name)
 return p.stdout.strip()


def absent(path):return not pathlib.Path(path).exists() and not pathlib.Path(path).is_symlink()


def source_check():
 release.require(os.getuid()==0,'Use the verified host administration account with sudo.')
 release.require(socket.gethostname()=='dg-vps-08' and pathlib.Path('/etc/machine-id').read_text().strip()==release.MACHINE_ID,'Wrong target host.')
 for file in ['install-host.py','release.py','pins.json']:
  p=release.trusted_path(HERE/file);release.require(p.is_file(),'Reviewed source file missing.')
 pins=json.loads((HERE/'pins.json').read_text())
 release.require(pins['node']['version']==release.NODE_VERSION and pins['node']['npmVersion']==release.NPM_VERSION and pins['runner']['version']=='2.338.2','Unexpected toolchain pins.')
 for role,user in release.USERS.items():
  try:pwd.getpwnam(user)
  except KeyError:pass
  else:raise release.Refusal('Target account exists; inspect own partial/existing setup before continuing: '+user)
  try:grp.getgrnam(user)
  except KeyError:pass
  else:raise release.Refusal('Target group exists; no existing identity will be reused.')
 for path in [*PATHS,SUDO,UNIT_ROOT/(SITE+'.service'),UNIT_ROOT/(SITE+'-runner.service')]:release.require(absent(path),'Target path already exists: '+str(path))
 for p in pathlib.Path('/etc/dg-webservices').glob('*/host.json'):
  data=json.loads(p.read_text(encoding='utf-8-sig'));release.require(data.get('port')!=release.PORT,'Target port is reserved by another host profile.')
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
Description=Haaglanden Voetbal staging
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
Description=Haaglanden Voetbal staging repository runner
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
 with tempfile.TemporaryDirectory(prefix='haagv-staging-packages-',dir='/root') as temp:
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
   profile={'version':1,'siteId':SITE,'repository':release.REPOSITORY,'branch':release.BRANCH,'hostname':'dg-vps-08','machineId':release.MACHINE_ID,'environment':'staging','port':release.PORT,'accounts':accounts,'nodeVersion':release.NODE_VERSION,'npmVersion':release.NPM_VERSION,'runnerName':SITE,'runnerLabels':['self-hosted','Linux','X64','dg-vps-08',SITE],'requiredCiWorkflow':'ci.yml','requiredCiJobs':['verify'],'sharedBuildLock':'/run/lock/dg-build.lock','activationLock':str(release.CONFIG/'activation.lock')}
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


def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--apply',action='store_true');a=p.parse_args();pins=source_check()
 if not a.apply:print(json.dumps({'status':'preflight-passed-no-changes','siteId':SITE,'port':release.PORT,'accounts':release.USERS}));return
 prepare(pins)

if __name__=='__main__':
 try:main()
 except release.Refusal as e:print(str(e),file=sys.stderr);sys.exit(1)
 except Exception:print('Preparation failed. Inspect only the new Haagv target before another attempt; no existing target was intentionally modified.',file=sys.stderr);sys.exit(1)
