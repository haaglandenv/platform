#!/usr/bin/env python3
"""Manual reviewed-main release via the existing host administrator SSH identity.

Tokens and public configuration travel through SSH stdin. This client never
registers a runner, edits DNS/proxy, migrates data or combines build/activation.
"""
import argparse, importlib.util, json, pathlib, re, shlex, subprocess, sys, time

HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('haagv_release',HERE/'release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
SSH=['ssh','-i','/home/codex/.ssh/dg_vps_08_ed25519','-o','IdentitiesOnly=yes','-o','HostKeyAlias=100.65.51.108','-o','StrictHostKeyChecking=yes','-o','BatchMode=yes','-o','ConnectTimeout=12','codex@dg-vps-08.tail4ca740.ts.net']

def gh(*arguments):
    result=subprocess.run(['gh',*arguments],capture_output=True,text=True,timeout=30)
    release.require(result.returncode==0,'GitHub credential/configuration lookup failed; no host operation performed.')
    return result.stdout

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation',choices=['candidate','activate','rollback'])
    parser.add_argument('--environment',choices=release.TARGETS,required=True)
    parser.add_argument('--sha',required=True)
    parser.add_argument('--config-id')
    parser.add_argument('--candidate-id')
    parser.add_argument('--check-only',action='store_true',help='Validate exact main SHA/CI and public values without contacting the host.')
    arguments=parser.parse_args();release.select_target(arguments.environment);release.full_sha(arguments.sha)
    token=gh('auth','token').strip();release.require(20<len(token)<4096,'Missing GitHub credential.')
    api=release.GitHub(token);ci=release.verify_ci(api,arguments.sha)
    payload={'githubToken':token};operation={'candidate':'build','activate':'activate','rollback':'rollback'}[arguments.operation]
    command=['sudo','-n',str(release.INSTALL/'release.py'),'operator-'+operation,'--sha',arguments.sha,'--request-id',str(time.time_ns())]
    if operation=='build':
        release.config_id(arguments.config_id)
        rows=json.loads(gh('api',f'repos/{release.REPOSITORY}/environments/{arguments.environment}/variables'))['variables']
        public=release.validate_public({row['name']:row['value'] for row in rows})
        target=release.TARGETS[arguments.environment]
        release.require(public['HVCUP_APP_ORIGIN'].rstrip('/')==target['origin'] and public['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')==target['supabaseUrl'],'GitHub public values do not match the fixed target.')
        payload['publicConfig']=public;command+=['--config-id',arguments.config_id]
    if operation=='activate':
        release.require(isinstance(arguments.candidate_id,str) and re.fullmatch(re.escape(arguments.sha)+r'-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}',arguments.candidate_id),'Require the exact candidate ID for this SHA.')
        command+=['--candidate',arguments.candidate_id]
    if arguments.check_only:
        print(json.dumps({'status':'operator-preflight-passed-no-host-operation','environment':arguments.environment,'sha':arguments.sha,'ci':ci}));return
    result=subprocess.run([*SSH,shlex.join(command)],input=release.canonical(payload))
    raise SystemExit(result.returncode)

if __name__=='__main__':
    try:main()
    except release.Refusal as error:print(str(error),file=sys.stderr);sys.exit(1)
    except Exception:print('Manual release client failed; inspect nonsecret host state before retrying.',file=sys.stderr);sys.exit(1)
