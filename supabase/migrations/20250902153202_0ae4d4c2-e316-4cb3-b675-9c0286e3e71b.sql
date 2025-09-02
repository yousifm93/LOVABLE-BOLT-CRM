-- Create audit logging system for dashboard enhancements
do $$ begin
  create type change_action as enum ('insert','update','delete');
exception when duplicate_object then null; end $$;

create table if not exists audit_log (
  id bigserial primary key,
  category text not null,         -- 'pipeline' | 'contacts' | 'tasks'
  table_name text not null,
  item_id uuid,
  action change_action not null,
  changed_at timestamptz not null default now(),
  changed_by uuid,
  before_data jsonb,
  after_data jsonb
);

-- Enable RLS on audit_log
alter table audit_log enable row level security;

-- Allow authenticated users to read audit logs
create policy "Authenticated users can view audit logs" 
on audit_log for select 
using (auth.uid() is not null);

create or replace function fn_audit_log() returns trigger as $$
declare
  v_category text := tg_argv[0];
  v_table    text := tg_argv[1];
  v_user     uuid;
begin
  begin
    v_user := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
  exception when others then v_user := null; end;
  if (tg_op = 'INSERT') then
    insert into audit_log(category, table_name, item_id, action, changed_by, after_data)
    values (v_category, v_table, new.id, 'insert', v_user, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into audit_log(category, table_name, item_id, action, changed_by, before_data, after_data)
    values (v_category, v_table, new.id, 'update', v_user, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into audit_log(category, table_name, item_id, action, changed_by, before_data)
    values (v_category, v_table, old.id, 'delete', v_user, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Attach triggers to existing tables
drop trigger if exists trg_leads_audit on leads;
create trigger trg_leads_audit
after insert or update or delete on leads
for each row execute function fn_audit_log('pipeline','leads');

drop trigger if exists trg_contacts_audit on contacts;
create trigger trg_contacts_audit
after insert or update or delete on contacts
for each row execute function fn_audit_log('contacts','contacts');

drop trigger if exists trg_tasks_audit on tasks;
create trigger trg_tasks_audit
after insert or update or delete on tasks
for each row execute function fn_audit_log('tasks','tasks');

-- Create RPC functions for dashboard queries
create or replace function dashboard_activity(_from timestamptz, _to timestamptz)
returns table(category text, action text, cnt bigint) language sql stable as $$
  select category, action::text, count(*)::bigint
  from audit_log
  where changed_at >= _from and changed_at < _to
  group by 1,2 order by 1,2;
$$;

create or replace function dashboard_activity_latest(_from timestamptz, _to timestamptz, _category text)
returns table(item_id uuid, action text, table_name text, changed_at timestamptz)
language sql stable as $$
  select item_id, action::text, table_name, changed_at
  from audit_log
  where changed_at >= _from and changed_at < _to
    and category = _category
  order by changed_at desc
  limit 15;
$$;

create or replace function dashboard_conversions(_from timestamptz, _to timestamptz)
returns table(
  stage text,
  total int,
  converted int,
  nurtured int,
  dead int,
  conversion_pct numeric
)
language sql stable as $$
  with base as (
    select 
      case 
        when status = 'Working on it' then 'lead'
        when status = 'Application' then 'pending_app'
        when status = 'Underwriting' then 'screening'  
        when status = 'Pre-approval' then 'pre_qualified'
        when status = 'Approved' then 'pre_approved'
        when status = 'Closed' then 'active'
        else 'lead'
      end as stage,
      case 
        when status = 'Closed' then 'converted'
        when status in ('Working on it', 'Application', 'Underwriting', 'Pre-approval', 'Approved') then 'nurture'
        when status = 'Dead' then 'dead'
        else 'nurture'
      end as status
    from leads
    where created_at >= _from and created_at < _to
  )
  select
    stage,
    count(*)::int as total,
    sum(case when status='converted' then 1 else 0 end)::int as converted,
    sum(case when status='nurture' then 1 else 0 end)::int as nurtured,
    sum(case when status='dead' then 1 else 0 end)::int as dead,
    round(100.0 * nullif(sum(case when status='converted' then 1 else 0 end),0) / nullif(count(*),0), 1) as conversion_pct
  from base
  group by stage
  order by array_position(array['lead','pending_app','screening','pre_qualified','pre_approved','active'], stage);
$$;