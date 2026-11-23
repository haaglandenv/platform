#!/usr/bin/python3 -I
"""Fixed, target-specific release adapter. Credentials enter only through stdin."""
import argparse, base64, contextlib, ctypes, datetime, fcntl, grp, hashlib, http.client, json, os, pathlib, pwd, re, shutil, signal, socket, stat, subprocess, sys, tarfile, tempfile, time, urllib.error, urllib.parse, urllib.request

SITE='haagv-platform-staging'
REPOSITORY='haaglandenv/platform'
BRANCH='main'
MACHINE_ID='05db94b99eca4c3d815f6585ef8ed517'
PORT=4190
NODE_VERSION='24.22.1'
NPM_VERSION='11.19.1'
USERS={'runner':'run-haagv-stg','build':'build-haagv-stg','app':'app-haagv-stg'}
CONFIG=pathlib.Path('/etc/dg-webservices')/SITE
ROOT=pathlib.Path('/srv/sites')/SITE
BUILD=pathlib.Path('/var/lib/dg-build')/SITE
INSTALL=pathlib.Path('/usr/local/libexec')/SITE
TOOLCHAIN=pathlib.Path('/opt/dg-toolchains')/SITE/f'node-v{NODE_VERSION}-linux-x64'
NODE=TOOLCHAIN/'bin/node'
NPM=TOOLCHAIN/'lib/node_modules/npm/bin/npm-cli.js'
PUBLIC_NAMES=('HAAGV_APP_ORIGIN','HAAGV_DATA_MODE','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
WORKFLOWS={op:f'.github/workflows/haagv-vps08-staging-{name}.yml' for op,name in [('build','candidate'),('activate','activate'),('rollback','rollback')]}
SHA_RE=re.compile(r'[a-f0-9]{40}')
ID_RE=re.compile(r'[a-z0-9][a-z0-9-]{0,62}')

class Refusal(Exception): pass

def require(condition,message):
    if not condition: raise Refusal(message)

def sha256(data): return hashlib.sha256(data).hexdigest()
def canonical(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def full_sha(value):
    require(isinstance(value,str) and SHA_RE.fullmatch(value),'Require a full lowercase 40-character commit SHA.');return value

def config_id(value):
    require(isinstance(value,str) and ID_RE.fullmatch(value),'Invalid configuration ID.');return value

def validate_public(value):
    require(isinstance(value,dict) and set(value)==set(PUBLIC_NAMES),'Exactly the four approved public variable names are required.')
    require(all(isinstance(v,str) and '\x00' not in v and '\n' not in v and '\r' not in v and len(v)<8192 for v in value.values()),'Invalid public configuration value.')
    origin=urllib.parse.urlsplit(value['HAAGV_APP_ORIGIN'])
    require(origin.scheme=='https' and bool(origin.hostname) and origin.username is None and origin.password is None and origin.port is None and origin.path in ('','/') and not origin.query and not origin.fragment,'HAAGV_APP_ORIGIN must be the verified HTTPS origin without a path or port.')
    require(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+',origin.hostname),'Invalid HTTPS hostname.')
    require(value['HAAGV_DATA_MODE']=='supabase','A staging candidate requires supabase mode; local mode is only for development.')
    url=urllib.parse.urlsplit(value['NEXT_PUBLIC_SUPABASE_URL'])
    require(url.scheme=='https' and bool(re.fullmatch(r'[a-z0-9]+\.supabase\.co',url.hostname or '')) and url.username is None and url.password is None and url.port is None and url.path in ('','/') and not url.query and not url.fragment,'Require the new, owner-confirmed Supabase HTTPS project URL.')
    require(re.fullmatch(r'sb_publishable_[A-Za-z0-9_-]{12,}',value['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) is not None,'Require a Supabase publishable key, never a secret/service-role key.')
    return dict(value)

def normalized_public_digest(public):
    parsed=urllib.parse.urlsplit(public['HAAGV_APP_ORIGIN'])
    value={'origin':'https://'+parsed.hostname,'dataMode':public['HAAGV_DATA_MODE'],'supabaseUrl':public['NEXT_PUBLIC_SUPABASE_URL'],'publishableKey':public['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']}
    return sha256(json.dumps(value,separators=(',',':'),ensure_ascii=False).encode())

def read_payload():
    raw=sys.stdin.buffer.read(65537);require(len(raw)<=65536,'Input exceeds limit.')
    try:data=json.loads(raw)
    except (ValueError,UnicodeError):raise Refusal('Expected a JSON request on stdin.')
    require(isinstance(data,dict) and set(data)<= {'githubToken','publicConfig'},'Unexpected request fields.')
    require(isinstance(data.get('githubToken'),str) and 20<len(data['githubToken'])<4096,'Missing GitHub job token.')
    return data

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

class GitHub:
    def __init__(self,token): self.token=token
    def request(self,path):
        require(path.startswith(f'/repos/{REPOSITORY}/') and '\n' not in path,'Invalid GitHub API scope.')
        req=urllib.request.Request('https://api.github.com'+path,headers={'Authorization':'Bearer '+self.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':SITE})
        try:
            with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
        except (urllib.error.URLError,ValueError):raise Refusal('GitHub evidence is unavailable; no release operation was authorized.')
    def archive(self,sha,destination):
        req=urllib.request.Request(f'https://api.github.com/repos/{REPOSITORY}/tarball/{full_sha(sha)}',headers={'Authorization':'Bearer '+self.token,'Accept':'application/vnd.github+json','User-Agent':SITE})
        opener=urllib.request.build_opener(NoRedirect)
        try:
            with opener.open(req,timeout=30) as response:location=response.headers.get('Location')
        except urllib.error.HTTPError as e:
            require(e.code in (301,302,303,307,308),'GitHub source download was refused.');location=e.headers.get('Location')
        except urllib.error.URLError:raise Refusal('GitHub source download is unavailable.')
        target=urllib.parse.urlsplit(location or '')
        require(target.scheme=='https' and target.hostname=='codeload.github.com' and target.path.startswith('/'+REPOSITORY+'/'),'Unexpected archive host or repository.')
        # Never forward Authorization across origins. The GitHub-generated download
        # URL is intentionally kept out of logs/manifests and may be short-lived.
        with urllib.request.urlopen(location,timeout=60) as response,open(destination,'xb') as out:shutil.copyfileobj(response,out)

def verify_ci(api,sha):
    full_sha(sha)
    comparison=api.request(f'/repos/{REPOSITORY}/compare/{sha}...{BRANCH}')
    require(comparison.get('status') in ('ahead','identical') and comparison.get('merge_base_commit',{}).get('sha')==sha,'SHA is not on the allowed integration branch.')
    query=urllib.parse.urlencode({'event':'push','branch':BRANCH,'head_sha':sha,'per_page':100})
    runs=api.request(f'/repos/{REPOSITORY}/actions/workflows/ci.yml/runs?{query}').get('workflow_runs',[])
    runs=[r for r in runs if r.get('head_sha')==sha and r.get('event')=='push' and r.get('head_branch')==BRANCH]
    require(bool(runs),'Required CI workflow is missing on this SHA.')
    run=max(runs,key=lambda r:(r.get('run_number',0),r.get('run_attempt',0)))
    require(run.get('status')=='completed' and run.get('conclusion')=='success','Latest required CI is not completed successfully.')
    jobs=api.request(f'/repos/{REPOSITORY}/actions/runs/{run["id"]}/attempts/{run.get("run_attempt",1)}/jobs?per_page=100').get('jobs',[])
    selected=[j for j in jobs if j.get('name')=='verify']
    require(len(selected)==1 and selected[0].get('status')=='completed' and selected[0].get('conclusion')=='success','Required verify job is missing, skipped, pending or unsuccessful.')
    # A successful job can hide a skipped/failing required operation behind
    # continue-on-error. Require every ordinary executed verify step to succeed.
    steps=[s for s in selected[0].get('steps',[]) if not s.get('name','').startswith(('Post ','Complete job','Set up job'))]
    require(bool(steps) and all(s.get('status')=='completed' and s.get('conclusion')=='success' for s in steps),'Required verify steps did not all succeed.')
    return {'workflow':'ci.yml','runId':run['id'],'runAttempt':run.get('run_attempt',1),'jobId':selected[0]['id'],'jobName':'verify','sha':sha}

def verify_caller(api,operation,run_id,attempt):
    run=api.request(f'/repos/{REPOSITORY}/actions/runs/{run_id}')
    require(run.get('repository',{}).get('full_name')==REPOSITORY and run.get('event')=='workflow_dispatch' and run.get('head_branch')==BRANCH and run.get('path','').split('@')[0]==WORKFLOWS[operation] and run.get('run_attempt')==attempt and run.get('status')=='in_progress','Caller is not the approved active manual workflow on main.')
    full_sha(run.get('head_sha'))
    jobs=api.request(f'/repos/{REPOSITORY}/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100').get('jobs',[])
    name={'build':'candidate','activate':'activate','rollback':'rollback'}[operation]
    job=[j for j in jobs if j.get('name')==name and j.get('status')=='in_progress' and j.get('runner_name')==SITE]
    require(len(job)==1,'Active job is not running on the exact repository runner.')
    return {'runId':run_id,'runAttempt':attempt,'jobId':job[0]['id'],'runner':SITE,'workflow':WORKFLOWS[operation]}

def trusted_path(path,mode_mask=0o022):
    p=pathlib.Path(path)
    for item in [*p.parents,p]:
        s=item.lstat();require(not stat.S_ISLNK(s.st_mode) and s.st_uid==0 and not s.st_mode&mode_mask,'Privileged path is not root-owned and protected.')
    return p

def protected_file(path,app_readable=False):
    p=trusted_path(path)
    s=p.stat();require(stat.S_ISREG(s.st_mode) and s.st_nlink==1,'Expected a private regular file.')
    require(stat.S_IMODE(s.st_mode) in ((0o640,) if app_readable else (0o600,0o640,0o644)),'Unsafe protected file permissions.')
    return p

def host_profile():
    require(os.getuid()==0,'Host release operations require their fixed sudo entrypoint.')
    require(socket.gethostname()=='dg-vps-08' and pathlib.Path('/etc/machine-id').read_text().strip()==MACHINE_ID,'Wrong target host.')
    d=json.loads(protected_file(CONFIG/'host.json').read_text())
    expected={'siteId':SITE,'repository':REPOSITORY,'branch':BRANCH,'port':PORT,'nodeVersion':NODE_VERSION,'npmVersion':NPM_VERSION}
    require(all(d.get(k)==v for k,v in expected.items()),'Host profile does not match fixed project identity.')
    for role,user in USERS.items():
        account=pwd.getpwnam(user);require(d['accounts'][role]=={'name':user,'uid':account.pw_uid,'gid':account.pw_gid},'Host account identity changed.')
    for path in (CONFIG,ROOT,INSTALL,TOOLCHAIN):trusted_path(path)
    proof_path=CONFIG/'runner-access-approved.json'
    require(proof_path.exists(),'Restricted runner access has not been proven; keep the runner unregistered and stopped.')
    proof=json.loads(protected_file(proof_path).read_text())
    expected_workflows=sorted(REPOSITORY+'/'+path+'@refs/heads/main' for path in WORKFLOWS.values())
    require(proof.get('repository')==REPOSITORY and proof.get('runner')==SITE and proof.get('policy')=='restricted-selected-workflows' and sorted(proof.get('workflows',[]))==expected_workflows,'Runner access proof does not match this target and approved main workflows.')
    return d

@contextlib.contextmanager
def lock(path,shared=False):
    p=pathlib.Path(path)
    if shared:
        require(str(p)=='/run/lock/dg-build.lock','Unexpected shared lock path.')
        parent=p.parent.stat();require(parent.st_uid==0 and (not parent.st_mode&0o022 or parent.st_mode&stat.S_ISVTX),'Unsafe shared lock directory.')
    else:trusted_path(p.parent)
    fd=os.open(p,os.O_RDWR|os.O_NOFOLLOW|os.O_CLOEXEC)
    try:
        s=os.fstat(fd)
        require(stat.S_ISREG(s.st_mode) and s.st_uid==0 and s.st_nlink==1 and stat.S_IMODE(s.st_mode)==(0o660 if shared else 0o600),'Unsafe release lock.')
        if shared:require(s.st_gid==grp.getgrnam('dg-build').gr_gid,'Shared lock group changed.')
        try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise Refusal('LOCK_CONFLICT: no operation performed; at most one bounded retry after release.')
        yield
    finally:os.close(fd)

def exclusive_write(path,data,group=0,mode=0o640):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
    with os.fdopen(fd,'wb') as out:out.write(data);out.flush();os.fsync(out.fileno());os.fchown(out.fileno(),0,group);os.fchmod(out.fileno(),mode)

def extract_source(archive,destination):
    with tarfile.open(archive) as tf:
        entries=tf.getmembers();require(entries,'Empty source archive.')
        root=entries[0].name.split('/')[0]
        for member in entries:
            parts=pathlib.PurePosixPath(member.name).parts
            require(parts and parts[0]==root and '..' not in parts and not member.name.startswith('/') and (member.isfile() or member.isdir()),'Unsafe source archive entry; links/special files are refused.')
            relative=pathlib.Path(*parts[1:])
            if not relative.parts:continue
            target=destination/relative
            if member.isdir():target.mkdir(parents=True,exist_ok=True)
            else:
                target.parent.mkdir(parents=True,exist_ok=True)
                with tf.extractfile(member) as src,open(target,'xb') as out:shutil.copyfileobj(src,out)
                target.chmod(0o755 if member.mode&0o111 else 0o644)

def tree_digest(root):
    entries=[];root=pathlib.Path(root)
    for p in sorted(root.rglob('*')):
        relative=p.relative_to(root).as_posix()
        if p.is_symlink():
            target=os.readlink(p);require(not pathlib.Path(target).is_absolute() and (p.parent/target).resolve().is_relative_to(root.resolve()),'Artifact contains an escaping symlink.');entries.append([relative,'symlink',target])
        elif p.is_file():
            require(p.stat().st_nlink==1,'Artifact contains a mutable hardlink alias.');entries.append([relative,'file',bool(p.stat().st_mode&0o111),sha256(p.read_bytes())])
        else:require(p.is_dir(),'Artifact contains a special file.');entries.append([relative,'directory'])
    return sha256(canonical(entries))

def seal_copy(source,destination,app_gid):
    require(not destination.exists(),'Artifact destination already exists.')
    # Never chown the build tree: open build FDs must not alter sealed releases.
    shutil.copytree(source,destination,symlinks=True)
    tree_digest(destination)
    for p in [destination,*destination.rglob('*')]:
        if p.is_symlink():os.lchown(p,0,app_gid)
        else:
            require(p.is_dir() or p.is_file(),'Special files are forbidden.');os.chown(p,0,app_gid);p.chmod(0o750 if p.is_dir() or p.stat().st_mode&0o111 else 0o640)
    return tree_digest(destination)

def group_members(group):
    result=[]
    for p in pathlib.Path('/proc').iterdir():
        if not p.name.isdigit():continue
        try:
            fields=(p/'stat').read_text().rpartition(')')[2].split()
            if int(fields[2])==group and fields[0] not in ('Z','X'):result.append(int(p.name))
        except (OSError,ValueError,IndexError):pass
    return result

def stop_group(child):
    for sig,budget in [(signal.SIGTERM,5),(signal.SIGKILL,5)]:
        try:os.killpg(child.pid,sig)
        except ProcessLookupError:pass
        deadline=time.monotonic()+budget
        while group_members(child.pid) and time.monotonic()<deadline:
            child.poll();time.sleep(.05)
    child.wait(timeout=5)
    require(not group_members(child.pid),'Build process group did not stop; inspect target before retrying.')

def run_worker(command,environment,cwd,seconds=1800):
    account=pwd.getpwnam(USERS['build'])
    def drop():os.setgroups([]);os.setgid(account.pw_gid);os.setuid(account.pw_uid);os.umask(0o077)
    with tempfile.TemporaryFile() as output:
        child=subprocess.Popen(command,cwd=cwd,env=environment,preexec_fn=drop,start_new_session=True,stdin=subprocess.DEVNULL,stdout=output,stderr=subprocess.STDOUT)
        try:
            try:child.wait(timeout=seconds)
            except subprocess.TimeoutExpired:raise Refusal('Build timed out; no candidate was sealed.')
            require(child.returncode==0,'Isolated project build/check failed; no candidate was sealed.')
            output.seek(0);digest=hashlib.sha256();size=0
            while True:
                chunk=output.read(1024*1024)
                if not chunk:break
                size+=len(chunk);digest.update(chunk)
            return {'command':pathlib.Path(command[0]).name,'exitCode':child.returncode,'outputSha256':digest.hexdigest(),'outputBytes':size}
        finally:
            previous={sig:signal.signal(sig,signal.SIG_IGN) for sig in (signal.SIGTERM,signal.SIGINT,signal.SIGHUP)}
            try:stop_group(child)
            finally:
                for sig,handler in previous.items():signal.signal(sig,handler)

def runtime_snapshot(public,sha,config,profile):
    app_gid=profile['accounts']['app']['gid']
    secret_path=CONFIG/'runtime-secrets'/f'{config}.json'
    require(secret_path.exists(),'Owner runtime configuration is missing; no candidate can be built.')
    secrets=json.loads(protected_file(secret_path).read_text())
    require(set(secrets)=={'SUPABASE_SECRET_KEY'} and isinstance(secrets['SUPABASE_SECRET_KEY'],str) and secrets['SUPABASE_SECRET_KEY'].startswith('sb_secret_'),'Require the new project server-only Supabase secret in the protected target file.')
    key=protected_file(CONFIG/'secrets/mail-encryption-key',True).read_text().strip()
    try:require(len(base64.b64decode(key,validate=True))==32,'Invalid mail-vault key.')
    except ValueError:raise Refusal('Invalid mail-vault key.')
    values={**public,**secrets,'HAAGV_MAIL_ENCRYPTION_KEY':key,'HAAGV_MAIL_SETTINGS_FILE':str(ROOT/'shared/mail-settings.enc'),'HAAGV_STATE_FILE':str(ROOT/'shared/state.json'),'HAAGV_RELEASE_SHA':sha,'HAAGV_ENVIRONMENT':'staging','HAAGV_HOST':'127.0.0.1','HAAGV_PORT':str(PORT),'NODE_ENV':'production'}
    require(all(isinstance(v,str) and '\n' not in v and '\r' not in v and '\x00' not in v for v in values.values()),'Invalid runtime configuration.')
    content=''.join(k+'='+json.dumps(v,ensure_ascii=True)+'\n' for k,v in values.items()).encode()
    directory=CONFIG/'runtime-configs'/config
    if not directory.exists():directory.mkdir(mode=0o750);os.chown(directory,0,app_gid)
    path=directory/f'{sha}.env'
    if path.exists():require(protected_file(path,True).read_bytes()==content,'Existing immutable runtime configuration differs.')
    else:exclusive_write(path,content,app_gid)
    return {'id':config,'path':str(path),'sha256':sha256(content)}

def source_read(source,relative,uid,limit=16*1024*1024):
    parts=pathlib.PurePosixPath(relative).parts
    require(parts and '..' not in parts and not pathlib.PurePosixPath(relative).is_absolute(),'Unsafe source-relative path.')
    directory=os.open(source,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC)
    try:
        require(os.fstat(directory).st_uid==uid,'Build source directory ownership changed.')
        for name in parts[:-1]:
            child=os.open(name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC,dir_fd=directory);os.close(directory);directory=child
            require(os.fstat(directory).st_uid==uid,'Build source directory ownership changed.')
        fd=os.open(parts[-1],os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC,dir_fd=directory)
        try:
            before=os.fstat(fd);require(stat.S_ISREG(before.st_mode) and before.st_uid==uid and before.st_nlink==1 and before.st_size<=limit,'Unsafe source regular file.')
            with os.fdopen(fd,'rb',closefd=False) as stream:data=stream.read(limit+1)
            after=os.fstat(fd);require(len(data)<=limit and (before.st_size,before.st_mtime_ns,before.st_ctime_ns)==(after.st_size,after.st_mtime_ns,after.st_ctime_ns),'Build source changed during read.')
            return data
        finally:os.close(fd)
    finally:os.close(directory)

def copy_build_entry(source_fd,name,target_fd,uid,gid):
    before=os.stat(name,dir_fd=source_fd,follow_symlinks=False)
    require(before.st_uid==uid,'Build entry has unexpected ownership.')
    if stat.S_ISDIR(before.st_mode):
        child=os.open(name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC,dir_fd=source_fd)
        os.mkdir(name,0o750,dir_fd=target_fd)
        target=os.open(name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC,dir_fd=target_fd)
        try:
            require(os.fstat(child).st_uid==uid,'Build directory ownership changed.');os.fchown(target,0,gid)
            for entry in sorted(os.listdir(child)):copy_build_entry(child,entry,target,uid,gid)
        finally:os.close(child);os.close(target)
    elif stat.S_ISLNK(before.st_mode):
        link=os.readlink(name,dir_fd=source_fd);require(not pathlib.Path(link).is_absolute(),'Absolute build symlink refused.')
        os.symlink(link,name,dir_fd=target_fd);os.chown(name,0,gid,dir_fd=target_fd,follow_symlinks=False)
    else:
        require(stat.S_ISREG(before.st_mode) and before.st_nlink==1,'Special files/hardlinks are refused.')
        file=os.open(name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC,dir_fd=source_fd)
        try:
            before=os.fstat(file);require(stat.S_ISREG(before.st_mode) and before.st_uid==uid and before.st_nlink==1,'Build file changed type/ownership.')
            mode=0o750 if before.st_mode&0o111 else 0o640
            output=os.open(name,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW|os.O_CLOEXEC,mode,dir_fd=target_fd)
            with os.fdopen(output,'wb') as out:
                os.fchown(out.fileno(),0,gid)
                while True:
                    chunk=os.read(file,1024*1024)
                    if not chunk:break
                    out.write(chunk)
                out.flush();os.fsync(out.fileno())
            after=os.fstat(file);require((before.st_size,before.st_mtime_ns,before.st_ctime_ns)==(after.st_size,after.st_mtime_ns,after.st_ctime_ns),'Build file changed while sealing.')
        finally:os.close(file)

def seal_build(source,destination,uid,gid):
    # Root never follows a build-owned pathname while copying. Directory FDs,
    # O_NOFOLLOW, ownership/type checks and a distinct root-owned output prevent
    # a build symlink/rename or open writer from altering a sealed artifact.
    destination.mkdir(mode=0o750);os.chown(destination,0,gid)
    source_fd=os.open(source,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC)
    target_fd=os.open(destination,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC)
    try:
        require(os.fstat(source_fd).st_uid==uid,'Build source ownership changed.')
        names=set(os.listdir(source_fd))
        for name in ['dist','server','node_modules','package.json','package-lock.json']:
            if name in names:
                require(not stat.S_ISLNK(os.stat(name,dir_fd=source_fd,follow_symlinks=False).st_mode),'Top-level artifact symlinks are refused.')
                copy_build_entry(source_fd,name,target_fd,uid,gid)
    finally:os.close(source_fd);os.close(target_fd)
    return tree_digest(destination)

def candidate(api,sha,config,caller,public,profile):
    deadline=time.monotonic()+2700
    public=validate_public(public);config_id(config);evidence=verify_ci(api,sha)
    free=shutil.disk_usage(ROOT).free;v=os.statvfs(ROOT)
    require(free>=6*1024**3 and v.f_favail>=100000,'Insufficient free disk or inodes.')
    build_gid=profile['accounts']['build']['gid'];build_uid=profile['accounts']['build']['uid'];app_gid=profile['accounts']['app']['gid']
    config_bytes=canonical(public);config_path=CONFIG/'build-configs'/f'{config}.json'
    if config_path.exists():require(protected_file(config_path).read_bytes()==config_bytes,'Configuration ID already has different immutable values.')
    else:exclusive_write(config_path,config_bytes,build_gid)
    runtime=runtime_snapshot(public,sha,config,profile)
    ident=f'{sha}-{caller["runId"]}-{caller["runAttempt"]}';destination=ROOT/'candidates'/ident
    require(not destination.exists(),'Candidate identity already exists; use a new workflow attempt.')
    work=BUILD/'work'/ident;work.mkdir(mode=0o700);os.chown(work,build_uid,build_gid)
    archive=work/'source.tar.gz';source=work/'source';source.mkdir(mode=0o700)
    try:
        api.archive(sha,archive);extract_source(archive,source)
        for p in [source,*source.rglob('*')]:os.chown(p,build_uid,build_gid)
        require(source.is_dir() and not source.is_symlink(),'Build source root is not a real directory.')
        require((source/'package-lock.json').is_file() and (source/'server/index.mjs').is_file(),'Source does not contain the approved Node runtime/lockfile.')
        source_lock=sha256(source_read(source,'package-lock.json',build_uid))
        environment={'PATH':str(TOOLCHAIN/'bin')+':/usr/bin:/bin','HOME':str(BUILD/'home'),'NPM_CONFIG_CACHE':str(BUILD/'cache'),'CI':'true',**public}
        checks=[]
        for arguments in (['ci','--ignore-scripts','--include=dev'],['run','verify'],['prune','--omit=dev','--ignore-scripts']):checks.append(run_worker([str(NODE),str(NPM),*arguments],environment,source,seconds=max(1,int(deadline-time.monotonic()))))
        require(source.is_dir() and not source.is_symlink() and source.resolve()==(work/'source').absolute(),'Build source root escaped its own workspace.')
        require(sha256(source_read(source,'package-lock.json',build_uid))==source_lock,'Build changed the committed lockfile.')
        built=source/'dist/build-manifest.json'
        require(built.is_file() and not built.is_symlink(),'Build manifest is missing or unsafe.')
        built_manifest=json.loads(source_read(source,'dist/build-manifest.json',build_uid))
        require(built_manifest.get('application')=='haagv-platform' and built_manifest.get('publicConfigSha256')==normalized_public_digest(public),'Built public configuration does not match the approved four-value snapshot.')
        destination.mkdir(mode=0o750);os.chown(destination,0,app_gid)
        digest=seal_build(source,destination/'app',build_uid,app_gid)
        require((destination/'app/dist/index.html').is_file(),'Static build output is missing.')
        manifest={'version':1,'siteId':SITE,'repository':REPOSITORY,'environment':'staging','id':ident,'sha':sha,'configId':config,'publicConfigSha256':sha256(config_bytes),'builtPublicConfigSha256':normalized_public_digest(public),'runtimeConfig':runtime,'artifactSha256':digest,'lockfileSha256':source_lock,'nodeVersion':NODE_VERSION,'npmVersion':NPM_VERSION,'ci':evidence,'workflow':caller,'checks':checks,'createdAt':now()}
        exclusive_write(destination/'manifest.json',canonical(manifest),app_gid)
        print(json.dumps({'status':'candidate-built-inactive','candidateId':ident,'sha':sha,'configId':config,'artifactSha256':digest}))
    finally:shutil.rmtree(work)

def manifest_at(directory):
    p=protected_file(directory/'manifest.json');m=json.loads(p.read_text())
    require(m.get('siteId')==SITE and m.get('repository')==REPOSITORY and m.get('environment')=='staging','Candidate/release identity mismatch.')
    full_sha(m.get('sha'));config_id(m.get('configId'))
    require(m.get('id')==directory.name,'Release identity does not match its path.')
    require(tree_digest(directory/'app')==m.get('artifactSha256'),'Artifact digest changed.')
    runtime=m.get('runtimeConfig',{});expected=CONFIG/'runtime-configs'/m['configId']/f'{m["sha"]}.env'
    require(runtime.get('path')==str(expected) and sha256(protected_file(expected,True).read_bytes())==runtime.get('sha256'),'Runtime configuration binding changed.')
    return m

def current_release(name='current'):
    link=ROOT/name
    if not link.exists() and not link.is_symlink():return None
    require(link.is_symlink(),'Release pointer is not a symlink.')
    target=link.resolve();require(target.parent==ROOT/'releases','Release pointer escapes own release directory.')
    manifest_at(target);return target

def pointer(name,target):
    require(name in ('current','previous'),'Unknown release pointer.')
    temporary=ROOT/('.'+name+'-'+str(os.getpid()))
    os.symlink('releases/'+target.name,temporary)
    os.replace(temporary,ROOT/name)

def service(action):
    require(action in ('restart','stop'),'Invalid service operation.')
    p=subprocess.run(['/usr/bin/systemctl',action,SITE+'.service'],capture_output=True,timeout=45)
    require(p.returncode==0,'Own app service operation failed.')

def check_health(sha,ready=True,attempts=10):
    for attempt in range(attempts):
        try:
            for endpoint in (['/api/health','/api/ready'] if ready else ['/api/health']):
                with urllib.request.urlopen(f'http://127.0.0.1:{PORT}'+endpoint,timeout=5) as response:d=json.load(response)
                require(d.get('ok') is True,'Health/readiness did not succeed.')
                if endpoint=='/api/health':require(d.get('service')=='haagv' and d.get('environment')=='staging' and (d.get('sha') or d.get('releaseSha'))==sha,'Health identity/SHA mismatch.')
            return
        except (Refusal,urllib.error.URLError,ValueError,TimeoutError):
            if attempt+1==attempts:raise Refusal('Own release health/readiness did not pass; recovery required.')
            time.sleep(2)

def activate(api,sha,ident,caller,profile):
    require(re.fullmatch(r'[a-f0-9]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}',ident) is not None and ident.startswith(sha+'-'),'Invalid candidate identity.')
    source=ROOT/'candidates'/ident;m=manifest_at(source);require(m['sha']==sha,'Candidate SHA mismatch.');verify_ci(api,sha)
    previous=current_release();release=ROOT/'releases'/ident;require(not release.exists(),'Release already exists.')
    release.mkdir(mode=0o750);os.chown(release,0,profile['accounts']['app']['gid'])
    seal_copy(source/'app',release/'app',profile['accounts']['app']['gid'])
    exclusive_write(release/'manifest.json',canonical(m),profile['accounts']['app']['gid'])
    os.symlink(m['runtimeConfig']['path'],release/'runtime.env')
    try:
        pointer('current',release);service('restart');check_health(sha)
        exclusive_write(release/'healthy.json',canonical({'sha':sha,'runtimeConfigSha256':m['runtimeConfig']['sha256'],'verifiedAt':now(),'workflow':caller}),profile['accounts']['app']['gid'])
        if previous:pointer('previous',previous)
    except BaseException:
        if previous:pointer('current',previous);service('restart');check_health(manifest_at(previous)['sha'],ready=False)
        else:
            service('stop')
            if (ROOT/'current').is_symlink() and (ROOT/'current').resolve()==release:(ROOT/'current').unlink()
        raise
    print(json.dumps({'status':'activated','sha':sha,'releaseId':ident,'environment':'staging'}))

def rollback(api,sha,caller,profile):
    old=current_release();previous=current_release('previous');require(old is not None and previous is not None,'No previous healthy app/configuration pair exists.')
    m=manifest_at(previous);require(m['sha']==sha,'Rollback SHA is not the actual previous release.');verify_ci(api,sha)
    healthy=json.loads(protected_file(previous/'healthy.json').read_text());require(healthy.get('sha')==sha and healthy.get('runtimeConfigSha256')==m['runtimeConfig']['sha256'],'Previous release has no matching healthy proof.')
    try:pointer('current',previous);service('restart');check_health(sha)
    except BaseException:pointer('current',old);service('restart');check_health(manifest_at(old)['sha'],ready=False);raise
    pointer('previous',old);print(json.dumps({'status':'rolled-back','sha':sha,'releaseId':previous.name,'environment':'staging'}))

def main(supervisor_parent=None):
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='operation',required=True)
    for op in ['preflight','build','activate','rollback']:
        p=sub.add_parser(op);p.add_argument('--sha',required=True)
        if op=='preflight':p.add_argument('--config-id',required=True)
        if op!='preflight':p.add_argument('--run-id',required=True,type=int);p.add_argument('--run-attempt',required=True,type=int)
        if op=='build':p.add_argument('--config-id',required=True)
        if op=='activate':p.add_argument('--candidate',required=True)
    a=parser.parse_args();full_sha(a.sha);payload=read_payload();api=GitHub(payload['githubToken'])
    if a.operation=='preflight':
        validate_public(payload.get('publicConfig'));config_id(a.config_id);ci=verify_ci(api,a.sha);print(json.dumps({'status':'preflight-passed','sha':a.sha,'ci':ci}));return
    require(a.run_id>0 and a.run_attempt>0,'Invalid workflow run identity.')
    def cancelled(_signal,_frame):raise InterruptedError('Release operation cancelled.')
    for sig in (signal.SIGTERM,signal.SIGINT,signal.SIGHUP):signal.signal(sig,cancelled)
    require(supervisor_parent is not None and os.getppid()==supervisor_parent,'Private release supervisor parent changed.')
    require(ctypes.CDLL(None,use_errno=True).prctl(1,signal.SIGTERM,0,0,0)==0 and os.getppid()==supervisor_parent,'Cannot protect release supervisor parent death.')
    profile=host_profile();caller=verify_caller(api,a.operation,a.run_id,a.run_attempt)
    with lock('/run/lock/dg-build.lock' if a.operation=='build' else CONFIG/'activation.lock',shared=a.operation=='build'):
        if a.operation=='build':candidate(api,a.sha,a.config_id,caller,payload.get('publicConfig'),profile)
        elif a.operation=='activate':activate(api,a.sha,a.candidate,caller,profile)
        else:rollback(api,a.sha,caller,profile)

def supervised_entry():
    # The independent root supervisor owns the lock. If sudo/Actions kills the
    # public entrypoint, PR_SET_PDEATHSIG interrupts this supervisor, which keeps
    # its lock until the isolated build group has stopped completely.
    parent=None
    if len(sys.argv)>1 and sys.argv[1].startswith('--supervised-parent='):
        parent=int(sys.argv.pop(1).split('=',1)[1]);require(os.getuid()==0 and os.getppid()==parent,'Invalid private supervisor.')
    if parent is not None or len(sys.argv)>1 and sys.argv[1]=='preflight':return main(parent)
    require(os.getuid()==0,'Use the fixed privileged release entrypoint.')
    payload=sys.stdin.buffer.read(65537);require(len(payload)<=65536,'Input exceeds limit.')
    child=subprocess.Popen([sys.executable,'-I',str(pathlib.Path(__file__).resolve()),'--supervised-parent='+str(os.getpid()),*sys.argv[1:]],stdin=subprocess.PIPE,env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'},start_new_session=True)
    def cancel(_signal,_frame):
        try:child.send_signal(signal.SIGTERM)
        except ProcessLookupError:pass
    for sig in (signal.SIGTERM,signal.SIGINT,signal.SIGHUP):signal.signal(sig,cancel)
    try:
        child.communicate(payload);return child.returncode
    finally:
        if child.poll() is None:
            child.send_signal(signal.SIGTERM);child.wait(timeout=20)

if __name__=='__main__':
    try:sys.exit(supervised_entry() or 0)
    except Refusal as e:
        print(str(e),file=sys.stderr);sys.exit(75 if str(e).startswith('LOCK_CONFLICT:') else 1)
    except Exception:
        # Do not dump exceptions containing provider URLs or secret payloads.
        print('Release operation failed; inspect nonsecret target state before retrying.',file=sys.stderr);sys.exit(1)
