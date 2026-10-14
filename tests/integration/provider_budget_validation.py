"""Real PostgreSQL multi-session budget checks, called only inside disposable CI harness.
No URLs, credentials, dependency downloads, standalone database connection or enable path.
"""
import json
import subprocess


def validate_provider_budget(root, sql, scalar, session, release, blocked, pool, check):
    sql((root / 'backend/supabase/drafts/provider-budget.DRAFT.sql').read_text())
    ident = lambda n: f'00000000-0000-0000-0000-{n:012d}'
    reserve = lambda n: f"select public.provider_budget_reserve('{ident(n)}',1,1)"
    dispatch = lambda n: f"select public.provider_budget_dispatch('{ident(n)}')"
    settle = lambda n: f"select public.provider_budget_settle('{ident(n)}',1,1)"
    unknown = lambda n: f"select public.provider_budget_unknown('{ident(n)}')"
    reset = "truncate provider_budget_private.attempts,provider_budget_private.months; update provider_budget_private.control set enabled=true,active_attempt=null,cap_nano=1750;"

    def race(statements, label):
        holder = session('select singleton from provider_budget_private.control for update')
        futures = [pool.submit(sql, statement, f'budget-{label}-{i}') for i, statement in enumerate(statements)]
        try:
            for i in range(len(futures)):
                blocked(f'budget-{label}-{i}')  # prove independently blocked real connections
        finally:
            release(holder)
        outcomes = []
        for future in futures:
            try:
                outcomes.append(('ok', future.result(timeout=30).splitlines()[-1:]))
            except subprocess.CalledProcessError as exc:
                outcomes.append(('error', exc.stderr))
        return outcomes

    check('budget draft starts disabled', json.loads(scalar(reserve(1)))['reason'] == 'disabled')
    signatures = ['provider_budget_reserve(uuid,bigint,bigint)', 'provider_budget_dispatch(uuid)',
                  'provider_budget_unknown(uuid)', 'provider_budget_release(uuid)',
                  'provider_budget_settle(uuid,bigint,bigint)']
    for role in ['anon', 'authenticated', 'service_role']:
        for signature in signatures:
            check(f'budget draft denies {role} execution of {signature}', scalar(
                f"select not has_function_privilege('{role}','public.{signature}','EXECUTE')") == 't')
        try:
            sql(f'set role {role}; ' + reserve(1))
            raise AssertionError(f'budget forbidden role {role} could reserve')
        except subprocess.CalledProcessError as exc:
            check(f'budget actual {role} call rejected', 'permission denied' in exc.stderr)

    sql(reset)
    outcomes = race([reserve(1), reserve(2)], 'last-slot')
    check('budget both concurrent reserve transactions complete', all(status == 'ok' for status, _ in outcomes))
    rows = [json.loads(value[0]) for _, value in outcomes]
    check('budget final slot race admits exactly one', sum(row['allowed'] for row in rows) == 1
          and sorted(row['reason'] for row in rows) == ['global_busy', 'reserved'])
    winner = 1 if rows[0]['allowed'] else 2
    check('budget race reserves only one full bound', scalar(
        'select count(*)=1 and sum(reserved_nano)=1750 from provider_budget_private.attempts') == 't')
    outcomes = race([dispatch(winner), dispatch(winner)], 'duplicate-dispatch')
    check('budget duplicate dispatch has exactly one one-shot permit',
          sorted(outcomes) == [('ok', ['f']), ('ok', ['t'])])
    outcomes = race([settle(winner), settle(winner)], 'duplicate-settle')
    check('budget concurrent identical settlement is idempotent',
          all(status == 'ok' and json.loads(value[0])['settled'] for status, value in outcomes))
    check('budget charged once and reservation cleared', scalar(
        'select charged_nano=1750 and reserved_nano=0 from provider_budget_private.months') == 't')
    check('budget completed final slot cannot be reallocated', json.loads(scalar(reserve(3)))['reason'] == 'budget_exhausted')

    sql(reset); sql(reserve(4)); sql(dispatch(4))
    outcomes = race([settle(4), unknown(4)], 'settle-unknown')
    check('budget settle succeeds when racing unknown', outcomes[0][0] == 'ok')
    check('budget unknown either precedes settle or rejects terminal state',
          outcomes[1][0] == 'ok' or 'terminal_attempt' in outcomes[1][1])
    check('budget settle versus unknown does not double debit or relock terminal attempt', scalar(
        "select (select state='settled' from provider_budget_private.attempts) and "
        "(select charged_nano=1750 and reserved_nano=0 from provider_budget_private.months) and "
        "(select active_attempt is null from provider_budget_private.control)") == 't')

    sql(reset); sql(reserve(10))
    outcomes = race([dispatch(10), f"select public.provider_budget_release('{ident(10)}')"], 'dispatch-release')
    if outcomes[0] == ('ok', ['t']):
        check('budget dispatch win fences concurrent release', outcomes[1][0] == 'error'
              and 'cannot_release_after_dispatch' in outcomes[1][1])
        check('budget dispatch win retains full reservation', scalar(
            "select state='dispatched' and reserved_nano=1750 from provider_budget_private.attempts") == 't')
    else:
        check('budget release win denies dispatch permit', outcomes[0] == ('ok', ['f']) and outcomes[1][0] == 'ok')
        check('budget release win clears aggregate reservation', scalar(
            'select reserved_nano=0 and charged_nano=0 from provider_budget_private.months') == 't')

    sql(reset); sql(reserve(5)); sql(dispatch(5)); sql(unknown(5))
    outcomes = race([reserve(6), reserve(7)], 'uncertain')
    check('budget all new calls blocked while outcome uncertain',
          all(status == 'ok' and json.loads(value[0])['reason'] == 'global_busy' for status, value in outcomes))
    check('budget unknown keeps full exposure', scalar(
        "select (select state='unknown' and reserved_nano=1750 from provider_budget_private.attempts) "
        "and (select reserved_nano=1750 and charged_nano=0 from provider_budget_private.months)") == 't')
    try:
        sql(f"select public.provider_budget_release('{ident(5)}')")
        raise AssertionError('unknown was released')
    except subprocess.CalledProcessError as exc:
        check('budget unknown cannot be automatically released', 'cannot_release_after_dispatch' in exc.stderr)

    # Synthetic pre-rollover persisted state, not production-clock injection or
    # mutation of immutable rows. Current period is read from the actual PG clock.
    sql(reset + f"""
      insert into provider_budget_private.months(month,reserved_nano)
        values ((date_trunc('month',clock_timestamp() at time zone 'Asia/Seoul')-interval '1 month')::date,1750);
      insert into provider_budget_private.attempts(id,month,input_bound,output_bound,reserved_nano,state)
        select '{ident(8)}',month,1,1,1750,'unknown' from provider_budget_private.months;
      update provider_budget_private.control set active_attempt='{ident(8)}';
    """)
    check('budget new KST month cannot bypass old unknown fence', json.loads(scalar(reserve(9)))['reason'] == 'global_busy')
    sql(settle(8)); sql(reserve(9))
    check('budget late settlement charges original KST month; new reserve uses current month', scalar("""
      select (select count(*)=2 from provider_budget_private.months) and
        (select charged_nano=1750 and reserved_nano=0 from provider_budget_private.months
          where month=(date_trunc('month',clock_timestamp() at time zone 'Asia/Seoul')-interval '1 month')::date) and
        (select charged_nano=0 and reserved_nano=1750 from provider_budget_private.months
          where month=date_trunc('month',clock_timestamp() at time zone 'Asia/Seoul')::date)
    """) == 't')
    # Leave even this isolated fixture disabled after validation.
    sql('update provider_budget_private.control set enabled=false')
